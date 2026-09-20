// Les comptes de Quiz entre amis.
//
// Un compte ne sert JAMAIS à jouer. On rejoint un salon avec un code à quatre
// lettres, sans rien créer, et c'est la règle qui fait vivre le jeu : chaque
// partie est une démonstration à toute la table, et un mur à l'entrée tuerait
// le seul canal de distribution qui existe. Apple refuse d'ailleurs les
// applications qui exigent une inscription pour des fonctions qui n'en ont pas
// besoin.
//
// Le compte sert à garder ce qui, sans lui, vit dans un navigateur et meurt
// avec : les questions déjà jouées, les statistiques, les packs achetés. Ce
// dernier point est le plus important — aujourd'hui un pack acheté est attaché
// au stockage local, et vider les données du site le perd.
//
// Ce qu'on ne fait pas, et volontairement :
//
//   - aucun mot de passe. Un lien par courriel, « se connecter avec Apple » ou
//     « avec Google » : trois chemins, zéro empreinte de mot de passe à voler ;
//   - aucune donnée qu'on ne sait pas justifier. Une adresse, un prénom
//     d'affichage, des compteurs de parties. Pas de date de naissance, pas de
//     carnet d'adresses, pas de pistage ;
//   - aucun compte qu'on ne puisse effacer depuis l'application. C'est une
//     obligation d'Apple depuis 2022, et c'est de toute façon la moindre des
//     choses.
//
// Le stockage est le même qu'ailleurs : Upstash Redis en REST, appelé en
// `fetch`, avec un repli en mémoire pour `npm start` et pour les tests.

import { createHash, createPublicKey, createVerify, randomBytes, timingSafeEqual } from 'node:crypto';

/* --- Constantes ----------------------------------------------------------- */

const DUREE_SESSION_S = 400 * 24 * 3600;   // le maximum qu'un navigateur garde
const DUREE_CODE_S = 15 * 60;
const ESSAIS_MAX = 3;                      // au-delà, le code est brûlé
const CODES_PAR_HEURE = 5;                 // par adresse, pour ne pas servir de mégaphone
const VUES_MAX = 5000;                     // l'historique d'une vie de parties
const PARTIES_GARDEES = 50;                // ce que l'écran « mes parties » affiche

const erreur = (status, message) => Object.assign(new Error(message), { status });

/* --- Stockage ------------------------------------------------------------- */

// L'interface tient en six verbes. Tout le reste du module ne parle que celle-ci,
// ce qui permet de tester la logique sans Redis et de faire tourner `npm start`
// sans compte Upstash.

function stockageMemoire() {
  const cles = new Map();                  // clé → { valeur, expire }
  const vivant = (e) => e && (!e.expire || e.expire > Date.now());
  const lire = (cle) => {
    const e = cles.get(cle);
    if (!vivant(e)) { cles.delete(cle); return null; }
    return e.valeur;
  };

  return {
    kind: 'memory',
    async get(cle) {
      return lire(cle);
    },
    async set(cle, valeur, ttl = 0) {
      cles.set(cle, { valeur, expire: ttl ? Date.now() + ttl * 1000 : 0 });
    },
    async del(...aSupprimer) {
      for (const cle of aSupprimer) cles.delete(cle);
    },
    async champs(cle) {
      return { ...(lire(cle) ?? {}) };
    },
    async fusionner(cle, valeurs) {
      const actuel = lire(cle) ?? {};
      cles.set(cle, { valeur: { ...actuel, ...valeurs }, expire: 0 });
    },
    async membres(cle) {
      return [...(lire(cle) ?? [])];
    },
    async ajouter(cle, membre) {
      const actuel = new Set(lire(cle) ?? []);
      actuel.add(membre);
      cles.set(cle, { valeur: actuel, expire: 0 });
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
    if (!res.ok) throw erreur(502, 'Le service de comptes est indisponible.');
    return (await res.json()).result;
  };

  return {
    kind: 'redis',
    async get(cle) {
      const brut = await appel(['GET', cle]);
      return brut ? JSON.parse(brut) : null;
    },
    async set(cle, valeur, ttl = 0) {
      const commande = ['SET', cle, JSON.stringify(valeur)];
      if (ttl) commande.push('EX', String(ttl));
      await appel(commande);
    },
    async del(...aSupprimer) {
      if (aSupprimer.length) await appel(['DEL', ...aSupprimer]);
    },
    async champs(cle) {
      const plat = await appel(['HGETALL', cle]);
      if (!plat) return {};
      // Upstash rend soit un objet, soit la liste plate de Redis.
      const brut = Array.isArray(plat)
        ? Object.fromEntries(plat.reduce((p, v, i) => (i % 2 ? p : [...p, [v, plat[i + 1]]]), []))
        : plat;
      return Object.fromEntries(Object.entries(brut).map(([k, v]) => [k, JSON.parse(v)]));
    },
    async fusionner(cle, valeurs) {
      const entrees = Object.entries(valeurs).flatMap(([k, v]) => [k, JSON.stringify(v)]);
      if (entrees.length) await appel(['HSET', cle, ...entrees]);
    },
    async membres(cle) {
      return (await appel(['SMEMBERS', cle])) ?? [];
    },
    async ajouter(cle, membre) {
      await appel(['SADD', cle, membre]);
    },
  };
}

let stockage = null;

export function coffre() {
  if (stockage) return stockage;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  stockage = url && token ? stockageRedis(url, token) : stockageMemoire();
  return stockage;
}

/** Repart à zéro. Les tests en ont besoin ; la production, jamais. */
export function oublierLeCoffre() {
  stockage = null;
}

/* --- Clés ----------------------------------------------------------------- */

const cleCompte = (id) => `quizroom:compte:${id}`;
const cleVues = (id) => `quizroom:compte:${id}:vues`;
const cleStats = (id) => `quizroom:compte:${id}:stats`;
const cleParties = (id) => `quizroom:compte:${id}:parties`;
const cleAmis = (id) => `quizroom:compte:${id}:amis`;
const cleJetons = (id) => `quizroom:compte:${id}:jetons`;
const cleSession = (empreinte) => `quizroom:session:${empreinte}`;
const cleIndex = (fournisseur, valeur) => `quizroom:identite:${fournisseur}:${valeur}`;
const cleCode = (email) => `quizroom:code:${email}`;
const cleQuota = (email) => `quizroom:quota:${email}`;
const cleTable = (code, jour) => `quizroom:table:${code}:${jour}`;

/* --- Identité ------------------------------------------------------------- */

const identifiant = () => randomBytes(12).toString('hex');
const empreinte = (valeur) => createHash('sha256').update(String(valeur)).digest('hex');

/**
 * L'adresse, sous sa forme comparable.
 *
 * Minuscules et rien d'autre. On ne touche ni aux points ni au `+` : ce sont
 * des adresses différentes pour certains fournisseurs, et décider à leur place
 * reviendrait à envoyer le courrier de quelqu'un chez quelqu'un d'autre.
 */
export function normaliserEmail(brut) {
  const propre = String(brut ?? '').trim().toLowerCase();
  if (propre.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(propre)) {
    throw erreur(400, 'Cette adresse ne ressemble pas à une adresse.');
  }
  return propre;
}

/**
 * Le compte derrière une identité, créé au besoin.
 *
 * Trois chemins de connexion mènent ici, et un seul compte peut en porter
 * plusieurs : se connecter avec Apple puis, plus tard, par courriel avec la
 * même adresse doit retrouver le même compte — sinon on se retrouve avec deux
 * historiques et des packs d'un côté seulement.
 */
async function compteDeLIdentite({ fournisseur, sujet, email, nom }) {
  const boite = coffre();
  const pistes = [
    [fournisseur, sujet],
    ...(email ? [['email', email]] : []),
  ];

  for (const [type, valeur] of pistes) {
    const trouve = await boite.get(cleIndex(type, valeur));
    if (trouve) {
      const compte = await boite.get(cleCompte(trouve));
      if (compte) {
        // On rattache la piste manquante : la prochaine connexion, par l'un ou
        // l'autre chemin, tombera directement sur le compte.
        for (const [t, v] of pistes) await boite.set(cleIndex(t, v), compte.id);
        const complete = {
          ...compte,
          email: compte.email ?? email ?? null,
          nom: compte.nom || nom || compte.nom,
          fournisseurs: [...new Set([...(compte.fournisseurs ?? []), fournisseur])],
          // Les sujets servent à effacer les index le jour où le compte part :
          // sans eux, une adresse supprimée rouvrirait les données d'un compte
          // qu'on croyait effacé.
          sujets: { ...(compte.sujets ?? {}), [fournisseur]: sujet },
        };
        await boite.set(cleCompte(compte.id), complete);
        return complete;
      }
    }
  }

  const compte = {
    id: identifiant(),
    nom: String(nom ?? '').trim().slice(0, 40) || (email ? email.split('@')[0].slice(0, 40) : 'Joueur'),
    email: email ?? null,
    fournisseurs: [fournisseur],
    sujets: { [fournisseur]: sujet },
    creeLe: Date.now(),
  };
  await boite.set(cleCompte(compte.id), compte);
  for (const [type, valeur] of pistes) await boite.set(cleIndex(type, valeur), compte.id);
  return compte;
}

/* --- Sessions ------------------------------------------------------------- */

/**
 * Un jeton de session, rendu une seule fois et stocké HACHÉ.
 *
 * Une base de données qui fuite ne doit pas distribuer les sessions de tout le
 * monde avec. Le serveur ne garde donc que l'empreinte : il peut vérifier un
 * jeton qu'on lui présente, il ne peut pas en fabriquer un.
 */
async function ouvrirUneSession(compteId) {
  const jeton = randomBytes(32).toString('hex');
  const boite = coffre();
  await boite.set(cleSession(empreinte(jeton)), compteId, DUREE_SESSION_S);
  await boite.ajouter(cleJetons(compteId), empreinte(jeton));
  return jeton;
}

export async function compteDuJeton(jeton) {
  if (!jeton) return null;
  const boite = coffre();
  const id = await boite.get(cleSession(empreinte(jeton)));
  if (!id) return null;
  return boite.get(cleCompte(id));
}

const lireLeJeton = (headers, body) => {
  const brut = headers?.authorization ?? headers?.Authorization ?? '';
  const porteur = /^Bearer\s+(.+)$/i.exec(String(brut))?.[1];
  return String(porteur ?? body?.jeton ?? '').trim().slice(0, 128);
};

async function exigerUnCompte(headers, body) {
  const compte = await compteDuJeton(lireLeJeton(headers, body));
  if (!compte) throw erreur(401, 'Session expirée. Reconnecte-toi.');
  return compte;
}

/* --- Connexion par courriel ------------------------------------------------ */

/**
 * Six chiffres plutôt qu'un lien cliquable.
 *
 * Un lien est plus élégant, mais il ouvre le navigateur par défaut, qui n'est
 * pas l'application : on se connecte alors dans le mauvais endroit. Un code se
 * recopie dans l'écran où l'on est déjà, et fonctionne pareil sur les deux
 * plateformes.
 */
function codeATiroir() {
  // Pas `Math.random` : c'est le seul secret de ce chemin de connexion.
  return String(randomBytes(4).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

/**
 * L'envoi du courriel.
 *
 * Aucune dépendance : l'API de Resend est un POST en JSON. Sans configuration,
 * on refuse en production et on écrit le code dans la console en développement
 * — un code renvoyé dans la réponse HTTP serait une porte ouverte, puisqu'il
 * suffirait de demander un code pour l'obtenir.
 */
async function envoyerLeCode(email, code, envoi = null) {
  if (envoi) return envoi(email, code);

  const cle = process.env.QUIZROOM_MAIL_CLE;
  const expediteur = process.env.QUIZROOM_MAIL_DE;
  if (!cle || !expediteur) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw erreur(503, 'L’envoi de courriel n’est pas configuré.');
    }
    console.log(`[comptes] code pour ${email} : ${code}`);
    return { envoye: false, console: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: expediteur,
      to: [email],
      subject: `${code} — ton code Quiz entre amis`,
      text: `Ton code de connexion : ${code}\n\n`
        + 'Il est valable un quart d’heure et ne sert qu’une fois.\n'
        + 'Si tu n’as rien demandé, ignore ce message : personne ne peut entrer sans ce code.',
    }),
  });
  if (!res.ok) throw erreur(502, 'Le courriel n’a pas pu être envoyé.');
  return { envoye: true };
}

export async function demanderUnCode(brut, envoi = null) {
  const email = normaliserEmail(brut);
  const boite = coffre();

  // Un quota par adresse : sans lui, ce point d'entrée devient un service
  // d'envoi de courriels gratuit pour qui veut inonder une boîte.
  const quota = (await boite.get(cleQuota(email))) ?? 0;
  if (quota >= CODES_PAR_HEURE) {
    throw erreur(429, 'Trop de demandes. Réessaie dans une heure.');
  }
  await boite.set(cleQuota(email), quota + 1, 3600);

  const code = codeATiroir();
  await boite.set(cleCode(email), { empreinte: empreinte(code), essais: 0 }, DUREE_CODE_S);
  const envoye = await envoyerLeCode(email, code, envoi);
  return { ok: true, ...envoye };
}

export async function ouvrirParCode(brutEmail, brutCode) {
  const email = normaliserEmail(brutEmail);
  const propose = String(brutCode ?? '').replace(/\D/g, '');
  const boite = coffre();
  const attendu = await boite.get(cleCode(email));
  if (!attendu) throw erreur(410, 'Ce code a expiré. Demandes-en un autre.');

  const a = Buffer.from(empreinte(propose));
  const b = Buffer.from(attendu.empreinte);
  if (propose.length !== 6 || !timingSafeEqual(a, b)) {
    const essais = (attendu.essais ?? 0) + 1;
    // Trois tentatives : un code à six chiffres se devine en un million de
    // coups, et il ne faut pas laisser les compter.
    if (essais >= ESSAIS_MAX) await boite.del(cleCode(email));
    else await boite.set(cleCode(email), { ...attendu, essais }, DUREE_CODE_S);
    throw erreur(403, 'Code incorrect.');
  }

  await boite.del(cleCode(email));
  const compte = await compteDeLIdentite({ fournisseur: 'email', sujet: email, email });
  return { jeton: await ouvrirUneSession(compte.id), compte: publique(compte) };
}

/* --- Connexion Apple et Google --------------------------------------------- */

// Les deux marchent pareil : le téléphone obtient un jeton signé par le
// fournisseur, et le serveur vérifie la signature avec les clés publiques de
// celui-ci. Rien de ce que dit l'appareil n'est cru sur parole — c'est le même
// principe que pour les achats.

const b64url = (texte) => Buffer.from(String(texte).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const cachesDeCles = new Map();            // url → { clés, expire }

async function clesDe(url) {
  const cache = cachesDeCles.get(url);
  if (cache && cache.expire > Date.now()) return cache.cles;
  const res = await fetch(url);
  if (!res.ok) throw erreur(502, 'Impossible de vérifier la connexion.');
  const { keys } = await res.json();
  cachesDeCles.set(url, { cles: keys ?? [], expire: Date.now() + 3600_000 });
  return keys ?? [];
}

/**
 * Vérifie un jeton d'identité, et ne laisse rien passer d'important.
 *
 * L'audience est vérifiée et n'a PAS de valeur par défaut : sans elle,
 * n'importe quel jeton Google valide — délivré à n'importe quelle application
 * du monde — ouvrirait un compte ici.
 */
export async function verifierJetonTiers(jeton, { jwksUrl, emetteurs, audiences }) {
  if (!audiences?.length) throw erreur(503, 'Ce mode de connexion n’est pas configuré.');
  const [entete, charge, signature] = String(jeton ?? '').split('.');
  if (!entete || !charge || !signature) throw erreur(400, 'Jeton illisible.');

  const tete = JSON.parse(b64url(entete).toString('utf8'));
  const corps = JSON.parse(b64url(charge).toString('utf8'));
  if (tete.alg !== 'RS256') throw erreur(400, 'Signature inattendue.');

  const jwk = (await clesDe(jwksUrl)).find((k) => k.kid === tete.kid);
  if (!jwk) throw erreur(403, 'Clé de signature inconnue.');

  const valide = createVerify('RSA-SHA256')
    .update(`${entete}.${charge}`)
    .verify(createPublicKey({ key: jwk, format: 'jwk' }), b64url(signature));
  if (!valide) throw erreur(403, 'Signature invalide.');

  if (!emetteurs.includes(corps.iss)) throw erreur(403, 'Émetteur inattendu.');
  const aud = Array.isArray(corps.aud) ? corps.aud : [corps.aud];
  if (!aud.some((a) => audiences.includes(a))) throw erreur(403, 'Ce jeton ne nous est pas destiné.');
  // Trente secondes de tolérance : deux horloges ne sont jamais d'accord.
  if (!corps.exp || corps.exp * 1000 < Date.now() - 30_000) throw erreur(403, 'Jeton expiré.');

  return corps;
}

const listeEnv = (nom) => String(process.env[nom] ?? '').split(',').map((s) => s.trim()).filter(Boolean);

export async function ouvrirParApple(jeton, nom) {
  const corps = await verifierJetonTiers(jeton, {
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    emetteurs: ['https://appleid.apple.com'],
    audiences: listeEnv('QUIZROOM_APPLE_AUD'),
  });
  // Apple ne donne le nom qu'à la toute première connexion, et jamais ensuite :
  // c'est l'appareil qui nous le transmet, une seule fois.
  const compte = await compteDeLIdentite({
    fournisseur: 'apple',
    sujet: corps.sub,
    // Une adresse relayée par Apple reste une adresse : elle sert à retrouver
    // son compte, et Apple s'occupe de la faire suivre.
    email: corps.email_verified === false ? null : (corps.email ?? null),
    nom,
  });
  return { jeton: await ouvrirUneSession(compte.id), compte: publique(compte) };
}

export async function ouvrirParGoogle(jeton) {
  const corps = await verifierJetonTiers(jeton, {
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    emetteurs: ['https://accounts.google.com', 'accounts.google.com'],
    audiences: listeEnv('QUIZROOM_GOOGLE_AUD'),
  });
  const compte = await compteDeLIdentite({
    fournisseur: 'google',
    sujet: corps.sub,
    email: corps.email_verified ? corps.email : null,
    nom: corps.given_name ?? corps.name,
  });
  return { jeton: await ouvrirUneSession(compte.id), compte: publique(compte) };
}

/* --- Ce qu'un compte porte -------------------------------------------------- */

/** Ce qui sort d'ici. L'identifiant interne et les sujets tiers restent ici. */
const publique = (compte) => ({
  id: compte.id,
  nom: compte.nom,
  email: compte.email ?? null,
  fournisseurs: compte.fournisseurs ?? [],
  creeLe: compte.creeLe,
});

const statsVides = () => ({
  parties: 0, manches: 0, bonnes: 0, points: 0, victoires: 0, podiums: 0, themes: {},
});

export async function statsDe(compteId) {
  const brut = await coffre().get(cleStats(compteId));
  return { ...statsVides(), ...(brut ?? {}) };
}

/**
 * L'historique des questions vues, fusionné.
 *
 * On garde le NUMÉRO DE PARTIE le plus grand des deux côtés : le téléphone et
 * le serveur ne comptent pas les parties au même rythme, mais l'ordre relatif
 * suffit au tirage, qui ne cherche qu'à servir les plus anciennes en dernier.
 */
export async function fusionnerLesVues(compteId, vues) {
  const boite = coffre();
  const connues = (await boite.get(cleVues(compteId))) ?? {};
  const fusion = { ...connues };
  for (const [id, quand] of Object.entries(vues ?? {})) {
    const propre = String(id).slice(0, 40);
    const numero = Number(quand);
    if (!propre || !Number.isFinite(numero)) continue;
    fusion[propre] = Math.max(fusion[propre] ?? 0, Math.round(numero));
  }

  // Au-delà du plafond, on oublie les plus anciennes : ce sont précisément
  // celles que le tirage resservirait en premier.
  const ids = Object.keys(fusion);
  const garde = ids.length > VUES_MAX
    ? Object.fromEntries(ids.sort((a, b) => fusion[b] - fusion[a]).slice(0, VUES_MAX).map((i) => [i, fusion[i]]))
    : fusion;

  await boite.set(cleVues(compteId), garde);
  return garde;
}

/**
 * Une partie terminée.
 *
 * Chaque pupitre connecté envoie SA partie — la régie n'a pas les jetons des
 * autres, et n'a rien à faire avec. Deux comptes qui déclarent le même code de
 * salon le même jour ont donc joué ensemble : c'est là, et nulle part ailleurs,
 * que naît le classement entre amis. Aucune invitation, aucune demande d'ami,
 * aucun carnet d'adresses.
 */
export async function enregistrerUnePartie(compteId, partie) {
  const boite = coffre();
  const nombre = (v, max) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));

  const propre = {
    code: String(partie?.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4),
    quand: Date.now(),
    points: nombre(partie?.points, 1_000_000),
    place: nombre(partie?.place, 64),
    joueurs: nombre(partie?.joueurs, 64),
    manches: nombre(partie?.manches, 64),
    bonnes: nombre(partie?.bonnes, 64),
    themes: {},
  };

  for (const [theme, compte] of Object.entries(partie?.themes ?? {})) {
    const id = String(theme).slice(0, 40);
    if (!id) continue;
    propre.themes[id] = {
      manches: nombre(compte?.manches, 64),
      bonnes: nombre(compte?.bonnes, 64),
      points: nombre(compte?.points, 1_000_000),
    };
  }

  // Les compteurs.
  const stats = await statsDe(compteId);
  stats.parties += 1;
  stats.manches += propre.manches;
  stats.bonnes += propre.bonnes;
  stats.points += propre.points;
  if (propre.place === 1 && propre.joueurs > 1) stats.victoires += 1;
  if (propre.place > 0 && propre.place <= 3 && propre.joueurs > 3) stats.podiums += 1;
  for (const [theme, c] of Object.entries(propre.themes)) {
    const actuel = stats.themes[theme] ?? { manches: 0, bonnes: 0, points: 0 };
    stats.themes[theme] = {
      manches: actuel.manches + c.manches,
      bonnes: actuel.bonnes + c.bonnes,
      points: actuel.points + c.points,
    };
  }
  await boite.set(cleStats(compteId), stats);

  // Le journal, borné : c'est ce que l'écran « mes parties » affiche.
  const journal = (await boite.get(cleParties(compteId))) ?? [];
  await boite.set(cleParties(compteId), [propre, ...journal].slice(0, PARTIES_GARDEES));

  if (propre.code) await relierLaTable(compteId, propre);
  return { stats, partie: propre };
}

/**
 * Les comptes qui ont déclaré le même salon le même jour : on les relie.
 *
 * La table garde la PLACE de chacun, et pas seulement sa présence. Sans elle,
 * le classement dépendait de l'ordre d'arrivée des déclarations : le premier à
 * envoyer sa partie ne voyait encore personne, et sa victoire n'était comptée
 * chez personne. Les deux sens se mettent donc à jour d'un coup, au moment où
 * le second se déclare.
 *
 * `victoires` se lit « combien de fois CELUI-LÀ a gagné quand on jouait
 * ensemble » : c'est la seule lecture qui fasse un classement lisible à
 * plusieurs.
 */
async function relierLaTable(compteId, partie) {
  const boite = coffre();
  const jour = new Date(partie.quand).toISOString().slice(0, 10);
  const table = cleTable(partie.code, jour);

  const moi = await boite.get(cleCompte(compteId));
  const presents = await boite.champs(table);
  await boite.fusionner(table, { [compteId]: { nom: moi?.nom, place: partie.place } });

  for (const [autre, sonTour] of Object.entries(presents)) {
    if (autre === compteId) continue;
    const compteAutre = await boite.get(cleCompte(autre));
    if (!compteAutre) continue;

    const vuDIci = (await boite.champs(cleAmis(compteId)))[autre] ?? { parties: 0, victoires: 0 };
    await boite.fusionner(cleAmis(compteId), {
      [autre]: {
        nom: compteAutre.nom,
        parties: vuDIci.parties + 1,
        victoires: vuDIci.victoires + (sonTour.place === 1 ? 1 : 0),
      },
    });

    const vuDeLa = (await boite.champs(cleAmis(autre)))[compteId] ?? { parties: 0, victoires: 0 };
    await boite.fusionner(cleAmis(autre), {
      [compteId]: {
        nom: moi?.nom,
        parties: vuDeLa.parties + 1,
        victoires: vuDeLa.victoires + (partie.place === 1 ? 1 : 0),
      },
    });
  }
}

/** Le classement des gens avec qui l'on a joué. */
export async function amisDe(compteId) {
  const amis = await coffre().champs(cleAmis(compteId));
  return Object.entries(amis)
    .map(([id, a]) => ({ id, nom: a.nom ?? 'Joueur', parties: a.parties ?? 0, victoires: a.victoires ?? 0 }))
    .sort((a, b) => b.parties - a.parties || b.victoires - a.victoires);
}

/**
 * La suppression du compte, pour de bon.
 *
 * Obligatoire depuis l'application — Apple l'exige, et c'est de toute façon la
 * seule réponse honnête à « je veux partir ». On efface les index d'identité
 * en premier : si quelque chose casse au milieu, il vaut mieux un compte
 * orphelin qu'une adresse qui rouvre des données qu'on croyait parties.
 */
export async function supprimerLeCompte(compte) {
  const boite = coffre();
  const index = [
    ...(compte.email ? [cleIndex('email', compte.email)] : []),
    ...Object.entries(compte.sujets ?? {}).map(([f, sujet]) => cleIndex(f, sujet)),
  ];
  await boite.del(...index);

  for (const jeton of await boite.membres(cleJetons(compte.id))) {
    await boite.del(cleSession(jeton));
  }
  await boite.del(
    cleJetons(compte.id), cleVues(compte.id), cleStats(compte.id),
    cleParties(compte.id), cleAmis(compte.id), cleCompte(compte.id),
  );
  return { supprime: true };
}

/* --- La route ------------------------------------------------------------- */

export async function handleCompteRequest({ method, query, body, headers }) {
  const action = String(query?.action ?? body?.action ?? '').slice(0, 40);

  try {
    if (method === 'GET') {
      const compte = await exigerUnCompte(headers, body);
      if (action === 'amis') return { status: 200, body: { amis: await amisDe(compte.id) } };
      return {
        status: 200,
        body: {
          compte: publique(compte),
          stats: await statsDe(compte.id),
          vues: (await coffre().get(cleVues(compte.id))) ?? {},
          parties: (await coffre().get(cleParties(compte.id))) ?? [],
        },
      };
    }

    if (method === 'POST') {
      if (action === 'code') return { status: 200, body: await demanderUnCode(body?.email) };
      if (action === 'email') return { status: 200, body: await ouvrirParCode(body?.email, body?.code) };
      if (action === 'apple') return { status: 200, body: await ouvrirParApple(body?.jetonApple, body?.nom) };
      if (action === 'google') return { status: 200, body: await ouvrirParGoogle(body?.jetonGoogle) };

      const compte = await exigerUnCompte(headers, body);

      if (action === 'deconnexion') {
        await coffre().del(cleSession(empreinte(lireLeJeton(headers, body))));
        return { status: 200, body: { ok: true } };
      }
      if (action === 'nom') {
        const nom = String(body?.nom ?? '').trim().slice(0, 40);
        if (!nom) return { status: 400, body: { error: 'Un prénom, même court.' } };
        await coffre().set(cleCompte(compte.id), { ...compte, nom });
        return { status: 200, body: { compte: publique({ ...compte, nom }) } };
      }
      if (action === 'vues') {
        return { status: 200, body: { vues: await fusionnerLesVues(compte.id, body?.vues) } };
      }
      if (action === 'partie') {
        return { status: 200, body: await enregistrerUnePartie(compte.id, body?.partie) };
      }
      if (action === 'supprimer') {
        return { status: 200, body: await supprimerLeCompte(compte) };
      }
      return { status: 400, body: { error: 'Action inconnue.' } };
    }

    return { status: 405, body: { error: 'Méthode non permise.' } };
  } catch (e) {
    const status = e?.status ?? 500;
    if (status >= 500) console.error('[comptes]', e);
    return {
      status,
      body: { error: status >= 500 ? 'Les comptes ont rencontré un problème.' : e.message },
    };
  }
}
