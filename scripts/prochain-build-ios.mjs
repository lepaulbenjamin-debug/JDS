// Le prochain numéro de build, demandé à App Store Connect.
//
//   node scripts/prochain-build-ios.mjs [plancher]
//
// Le problème qu'il règle : App Store Connect refuse un numéro de build déjà
// vu pour la même version, et le refus arrive APRÈS le téléversement — après
// l'archive, la signature et vingt minutes de traitement. Le compteur
// d'exécutions de GitHub, lui, repart de 1 sur un workflow neuf. Une
// application qui a déjà des builds en TestFlight fait donc échouer son premier
// dépôt automatisé, sans que rien ne l'ait annoncé.
//
// On demande donc à Apple ce qu'il a déjà, et on prend le suivant.
//
// Si l'appel échoue — clé absente, réseau, panne d'Apple — on retombe sur un
// horodatage `AAAAMMJJhhmm`, qui est strictement croissant et pratiquement
// certain d'être supérieur à tout ce qui existe. Un numéro illisible vaut mieux
// qu'un dépôt refusé : personne ne lit un numéro de build, c'est la version
// affichée qui compte.

import { readFile } from 'node:fs/promises';
import { sign as signer } from 'node:crypto';

const API = 'https://api.appstoreconnect.apple.com/v1';
const BUNDLE = process.env.APPLE_BUNDLE_ID ?? 'fr.quizentreamis.app';

const base64url = (donnees) => Buffer.from(donnees).toString('base64url');

/**
 * Le jeton d'accès : un JWT ES256 signé avec la clé `.p8`, valable dix minutes.
 *
 * `dsaEncoding: 'ieee-p1363'` n'est pas un détail : par défaut, Node signe en
 * DER, que JWT n'accepte pas. La signature serait parfaitement valide et Apple
 * répondrait 401 — l'erreur la plus difficile à lire de toute cette chaîne.
 */
export function jetonAsc({ cle, cleId, emetteur }) {
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = base64url(JSON.stringify({ alg: 'ES256', kid: cleId, typ: 'JWT' }));
  const corps = base64url(JSON.stringify({
    iss: emetteur, iat: maintenant, exp: maintenant + 600, aud: 'appstoreconnect-v1',
  }));
  const signature = signer('sha256', Buffer.from(`${entete}.${corps}`),
    { key: cle, dsaEncoding: 'ieee-p1363' });
  return `${entete}.${corps}.${base64url(signature)}`;
}

async function demander(chemin, jeton) {
  const res = await fetch(`${API}${chemin}`, { headers: { authorization: `Bearer ${jeton}` } });
  if (!res.ok) throw new Error(`App Store Connect ${res.status} sur ${chemin.split('?')[0]}`);
  return res.json();
}

/** Le plus grand numéro de build déjà déposé, toutes versions confondues. */
export async function dernierBuild({ cle, cleId, emetteur, bundle = BUNDLE }) {
  const jeton = jetonAsc({ cle, cleId, emetteur });

  const apps = await demander(`/apps?filter[bundleId]=${encodeURIComponent(bundle)}`, jeton);
  const app = apps.data?.[0];
  if (!app) throw new Error(`aucune application pour ${bundle}`);

  // Toutes versions confondues, et non la seule version en cours : un numéro
  // repris d'une version précédente est refusé tout autant.
  const builds = await demander(`/builds?filter[app]=${app.id}&limit=200&fields[builds]=version`, jeton);
  const numeros = (builds.data ?? [])
    .map((b) => Number.parseInt(b.attributes?.version ?? '', 10))
    .filter(Number.isFinite);

  return { app: app.id, dernier: numeros.length ? Math.max(...numeros) : 0, vus: numeros.length };
}

const horodatage = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return Number(`${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`
    + `${p(d.getUTCHours())}${p(d.getUTCMinutes())}`);
};

async function principal() {
  const plancher = Number.parseInt(process.argv[2] ?? '0', 10) || 0;
  const cleId = process.env.APPLE_ASC_CLE_ID;
  const emetteur = process.env.APPLE_ASC_EMETTEUR;
  const chemin = process.env.CLE_CHEMIN;

  try {
    if (!cleId || !emetteur || !chemin) throw new Error('clé App Store Connect non fournie');
    const cle = await readFile(chemin, 'utf8');
    const { dernier, vus } = await dernierBuild({ cle, cleId, emetteur });
    const suivant = Math.max(dernier + 1, plancher);
    console.error(`App Store Connect : ${vus} build(s) déjà déposé(s), le plus haut est ${dernier}.`);
    console.log(suivant);
  } catch (erreur) {
    const repli = horodatage();
    console.error(`Numéro demandé à Apple : échec (${erreur.message}).`);
    console.error(`Repli sur un horodatage : ${repli}. Strictement croissant, donc sûr.`);
    console.log(repli);
  }
}

if (process.argv[1]?.endsWith('prochain-build-ios.mjs')) principal();
