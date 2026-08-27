// Les packs de questions, et qui a le droit de les lire.
//
// Le modèle économique tient en une phrase : dans une partie, un seul joueur
// paie. Les invités tapent un code, ne créent aucun compte et n'installent
// rien — chaque partie est donc une démonstration gratuite à toute la table, et
// c'est le seul canal de distribution réel. On ne vend donc jamais un
// mécanisme du jeu, seulement du contenu : ce qui s'épuise, c'est la banque.
//
// D'où ce module. Les packs vivent dans `packs/`, **hors de `web/`** : un
// fichier posé sous `web/` serait servi en statique à qui le demande, et un
// pack que tout le monde peut télécharger n'est pas un pack payant. Le
// catalogue est public — il faut bien montrer ce qu'on vend — mais le contenu
// ne sort d'ici qu'avec une licence valide.

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOSSIER = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs');

/* --- Les licences --------------------------------------------------------- */

// Un stockage à part de celui des salons, et volontairement : un salon expire
// au bout de trois heures, une licence achetée ne doit jamais expirer.

function stockageMemoire() {
  const licences = new Map();
  return {
    kind: 'memory',
    async lire(licence) {
      return licences.get(licence) ?? [];
    },
    async ajouter(licence, packId) {
      const actuels = licences.get(licence) ?? [];
      if (!actuels.includes(packId)) licences.set(licence, [...actuels, packId]);
    },
  };
}

function stockageRedis(url, token) {
  const appel = async (commande) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commande),
    });
    if (!res.ok) throw new Error(`Redis ${res.status}`);
    return (await res.json()).result;
  };
  const cle = (licence) => `quizroom:licence:${licence}`;

  return {
    kind: 'redis',
    async lire(licence) {
      return (await appel(['SMEMBERS', cle(licence)])) ?? [];
    },
    async ajouter(licence, packId) {
      // Pas d'expiration : c'est un achat.
      await appel(['SADD', cle(licence), packId]);
    },
  };
}

let stockage = null;
function coffre() {
  if (stockage) return stockage;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  stockage = url && token ? stockageRedis(url, token) : stockageMemoire();
  return stockage;
}

/**
 * Les packs offerts à tout le monde, sans licence.
 *
 * Sert à trois choses : jouer avec la mécanique complète en développement,
 * offrir un pack en promotion, et vérifier la chaîne de bout en bout sans
 * brancher de paiement.
 */
function packsOfferts() {
  return (process.env.QUIZROOM_PACKS_OFFERTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Enregistre un achat. C'est le seul point d'entrée qu'un encaissement doit
 * appeler — un webhook de paiement, une fois la transaction confirmée par le
 * prestataire. Rien dans ce dépôt ne valide un paiement : cette vérification
 * appartient au prestataire, et ce module lui fait confiance en aval.
 */
export async function accorder(licence, packId) {
  const propre = String(licence ?? '').slice(0, 80);
  if (!propre) throw Object.assign(new Error('Licence manquante.'), { status: 400 });
  if (!(await lirePack(packId))) throw Object.assign(new Error('Pack inconnu.'), { status: 404 });
  await coffre().ajouter(propre, packId);
  return { ok: true };
}

export async function packsDeLaLicence(licence) {
  const propre = String(licence ?? '').slice(0, 80);
  const achetes = propre ? await coffre().lire(propre) : [];
  return [...new Set([...achetes, ...packsOfferts()])];
}

/* --- Les packs ------------------------------------------------------------ */

let cache = null;

async function tousLesPacks() {
  if (cache) return cache;
  let fichiers = [];
  try {
    fichiers = (await readdir(DOSSIER)).filter((f) => f.endsWith('.json'));
  } catch {
    return (cache = []);          // aucun pack installé : le jeu de base suffit
  }

  const packs = [];
  for (const fichier of fichiers) {
    try {
      packs.push(JSON.parse(await readFile(join(DOSSIER, fichier), 'utf8')));
    } catch (erreur) {
      console.error(`[packs] ${fichier} illisible :`, erreur.message);
    }
  }
  cache = packs.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return cache;
}

const lirePack = async (id) => (await tousLesPacks()).find((p) => p.id === id) ?? null;

/**
 * Le catalogue : tout sauf les questions. C'est la vitrine, elle est publique.
 * `possede` dit ce que cette licence a déjà, pour que l'appli sache quoi
 * proposer et quoi débloquer.
 */
export async function catalogue(licence) {
  const acquis = await packsDeLaLicence(licence);
  return (await tousLesPacks()).map(({ questions, ...vitrine }) => ({
    ...vitrine,
    nombre: questions.length,
    possede: acquis.includes(vitrine.id),
  }));
}

/** Le contenu d'un pack. Ne sort qu'avec la licence qui va avec. */
export async function contenu(id, licence) {
  const pack = await lirePack(id);
  if (!pack) throw Object.assign(new Error('Pack inconnu.'), { status: 404 });

  const acquis = await packsDeLaLicence(licence);
  if (!acquis.includes(pack.id)) {
    throw Object.assign(new Error('Ce pack n’est pas débloqué sur cette licence.'), { status: 402 });
  }
  // On renvoie aussi de quoi afficher la carte : hors-ligne, le catalogue est
  // injoignable et c'est cette copie locale qui sert de vitrine.
  return {
    id: pack.id,
    nom: pack.nom,
    emoji: pack.emoji,
    resume: pack.resume,
    questions: pack.questions,
  };
}

/* --- Routage -------------------------------------------------------------- */

/**
 * Aiguillage commun au serveur Node et à la fonction serverless.
 *
 *   GET  /api/packs?licence=..            → le catalogue
 *   GET  /api/packs?id=..&licence=..      → le contenu, si la licence l'ouvre
 *   POST /api/packs?id=..                 → enregistre un achat (voir plus bas)
 *
 * L'écriture n'est pas ouverte au public : elle attend le secret partagé avec
 * le prestataire de paiement. Sans `QUIZROOM_SECRET_ACHAT` configuré, elle est
 * refusée — mieux vaut une boutique fermée qu'une boutique où l'on se sert.
 */
export async function handlePackRequest({ method, query, body }) {
  const id = String(query?.id ?? '').slice(0, 40);
  const licence = String(query?.licence ?? body?.licence ?? '').slice(0, 80);

  try {
    if (method === 'GET') {
      if (!id) return { status: 200, body: { packs: await catalogue(licence) } };
      return { status: 200, body: await contenu(id, licence) };
    }

    if (method === 'POST') {
      const secret = process.env.QUIZROOM_SECRET_ACHAT;
      if (!secret || body?.secret !== secret) {
        return { status: 403, body: { error: 'Enregistrement d’achat refusé.' } };
      }
      return { status: 200, body: await accorder(licence, id) };
    }

    return { status: 405, body: { error: 'Méthode non permise.' } };
  } catch (erreur) {
    const status = erreur?.status ?? 500;
    if (status >= 500) console.error('[packs]', erreur);
    return {
      status,
      body: { error: status >= 500 ? 'La boutique a rencontré un problème.' : erreur.message },
    };
  }
}
