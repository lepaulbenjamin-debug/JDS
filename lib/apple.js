// Vérifier une transaction de l'App Store, sans jamais croire le téléphone.
//
// StoreKit rend une transaction signée : un JWS dont l'en-tête porte la chaîne
// de certificats qui l'authentifie (feuille, intermédiaire, racine d'Apple).
// Tout est vérifiable hors ligne, sans appeler Apple — et c'est heureux, parce
// que le seul autre point de contrôle serait la parole de l'appareil.
//
// Le principe est simple à énoncer et facile à rater : sans vérification, un
// achat se falsifie en écrivant une ligne dans le stockage local. Trois pièges
// se tendent d'eux-mêmes, et ce module les prend un par un :
//
//  1. Vérifier la signature sans vérifier la chaîne. N'importe qui peut signer
//     un jeton avec sa propre clé et joindre son propre certificat.
//  2. Vérifier la chaîne sans épingler la racine. Une chaîne auto-signée est
//     une chaîne valide : elle ne prouve que l'existence de son auteur.
//  3. Lire la signature ES256 comme du DER. JOSE la transporte en R‖S brut
//     (IEEE P1363) — une vérification en DER échoue toujours, et la tentation
//     est alors de la retirer.
//
// Faute de racine à épingler, ce module REFUSE de valider. Une boutique fermée
// vaut mieux qu'une boutique où l'on se sert.

import { X509Certificate, createVerify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE_DEPOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FICHIER_RACINE = join(RACINE_DEPOT, 'certs', 'AppleRootCA-G3.cer');

const refus = (message, status = 400) =>
  Object.assign(new Error(message), { status });

const depuisBase64Url = (texte) =>
  Buffer.from(String(texte).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** Les trois morceaux d'un JWS, plus ce sur quoi porte la signature. */
export function decouperJws(jws) {
  const parts = String(jws ?? '').split('.');
  if (parts.length !== 3) throw refus('Transaction illisible.');
  const [entete, charge, signature] = parts;
  let enTeteLu;
  let chargeLue;
  try {
    enTeteLu = JSON.parse(depuisBase64Url(entete).toString('utf8'));
    chargeLue = JSON.parse(depuisBase64Url(charge).toString('utf8'));
  } catch {
    throw refus('Transaction illisible.');
  }
  return {
    entete: enTeteLu,
    charge: chargeLue,
    signature: depuisBase64Url(signature),
    signe: `${entete}.${charge}`,
  };
}

/**
 * La racine d'Apple, épinglée.
 *
 * À télécharger sur https://www.apple.com/certificateauthority/ et à déposer
 * dans `certs/AppleRootCA-G3.cer`. Elle peut aussi être passée en base64 par
 * la variable APPLE_ROOT_CA, ce qui convient mieux à un hébergement sans
 * disque persistant.
 *
 * Volontairement pas de valeur en dur ici : un certificat recopié à la main
 * dans un fichier source est un certificat que personne ne revérifie.
 */
let racineEnCache;
export async function racineApple() {
  if (racineEnCache !== undefined) return racineEnCache;
  const enVariable = process.env.APPLE_ROOT_CA;
  try {
    const brut = enVariable
      ? Buffer.from(enVariable, 'base64')
      : await readFile(FICHIER_RACINE);
    racineEnCache = new X509Certificate(brut);
  } catch {
    racineEnCache = null;
  }
  return racineEnCache;
}

/** Pour les tests : rebrancher une autre racine, ou vider le cache. */
export function definirRacine(certificat) {
  racineEnCache = certificat === undefined ? undefined : certificat;
}

/**
 * La chaîne de l'en-tête, du certificat signataire jusqu'à la racine.
 *
 * Chaque maillon doit être émis par le suivant ET porter sa signature : la
 * première vérification compare des noms, la seconde de la cryptographie. Sans
 * les deux, on croit sur parole un champ de texte.
 */
function verifierLaChaine(x5c, racine, maintenant) {
  if (!Array.isArray(x5c) || x5c.length < 2) throw refus('Chaîne de certificats absente.');

  const chaine = x5c.map((brut) => {
    try {
      return new X509Certificate(Buffer.from(brut, 'base64'));
    } catch {
      throw refus('Certificat illisible.');
    }
  });

  for (const certificat of chaine) {
    if (maintenant < new Date(certificat.validFrom) || maintenant > new Date(certificat.validTo)) {
      throw refus('Certificat expiré ou pas encore valide.');
    }
  }

  for (let i = 0; i < chaine.length - 1; i += 1) {
    const enfant = chaine[i];
    const parent = chaine[i + 1];
    if (!enfant.checkIssued(parent)) throw refus('Chaîne de certificats incohérente.');
    if (!enfant.verify(parent.publicKey)) throw refus('Signature de certificat invalide.');
  }

  // Le maillon le plus haut doit être exactement la racine épinglée. Sans cette
  // comparaison, une chaîne fabriquée de toutes pièces passerait les contrôles
  // précédents sans difficulté : elle serait cohérente avec elle-même.
  const sommet = chaine[chaine.length - 1];
  if (sommet.raw.length !== racine.raw.length || !sommet.raw.equals(racine.raw)) {
    throw refus('La chaîne ne remonte pas à la racine d’Apple.');
  }

  return chaine[0];
}

/**
 * Vérifie une transaction signée et rend son contenu.
 *
 * `bundleId` est obligatoire : sans lui, une transaction authentique émise pour
 * une AUTRE application passerait — et il en existe des millions.
 */
export async function verifierTransaction(jws, { bundleId, maintenant = new Date() } = {}) {
  if (!bundleId) throw refus('Identifiant d’application non configuré.', 500);

  const racine = await racineApple();
  if (!racine) {
    throw refus(
      'Vérification des achats indisponible : la racine d’Apple n’est pas installée.',
      503,
    );
  }

  const { entete, charge, signature, signe } = decouperJws(jws);
  if (entete.alg !== 'ES256') throw refus('Algorithme de signature inattendu.');

  const signataire = verifierLaChaine(entete.x5c, racine, maintenant);

  // JOSE transporte la signature ES256 en R‖S brut. Sans `ieee-p1363`, Node la
  // lit comme du DER et rejette une signature pourtant valide.
  const valide = createVerify('SHA256')
    .update(signe)
    .verify({ key: signataire.publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  if (!valide) throw refus('Signature de la transaction invalide.');

  if (charge.bundleId !== bundleId) throw refus('Transaction émise pour une autre application.');
  // Un achat remboursé ou annulé porte sa date d'annulation : il ne donne plus
  // droit à rien, et c'est le cas que l'on oublie le plus volontiers.
  if (charge.revocationDate) throw refus('Achat annulé ou remboursé.', 403);

  return {
    productId: charge.productId,
    transactionId: charge.transactionId,
    originalTransactionId: charge.originalTransactionId,
    environment: charge.environment ?? null,
    achatLe: charge.purchaseDate ? new Date(charge.purchaseDate) : null,
  };
}
