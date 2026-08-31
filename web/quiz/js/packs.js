// Les packs de questions, côté pupitre.
//
// Le jeu de base est embarqué dans l'appli et le restera : c'est ce qui permet
// de jouer quand le Wi-Fi tombe. Les packs, eux, ne peuvent pas être livrés
// avec — un fichier posé sous `web/` est servi à qui le demande, et un pack que
// tout le monde télécharge n'est pas un pack payant. Ils arrivent donc par
// l'API, après vérification de la licence.
//
// Une fois arrivés, ils sont rangés en local. La promesse hors-ligne vaut aussi
// pour ce qu'on a acheté : un pack payé une fois doit se jouer même sans
// réseau, et surtout ne pas disparaître au milieu d'une soirée dans un endroit
// mal couvert.

const LICENCE_KEY = 'quizroom.licence';
const CACHE_KEY = 'quizroom.packs';

/* --- La licence ----------------------------------------------------------- */

/**
 * L'identifiant d'achat de cet appareil. Il est créé à la première visite et ne
 * change plus : c'est lui qui relie un paiement aux packs débloqués.
 *
 * Il vit dans le navigateur, donc il se perd si l'on efface les données du
 * site. Une vraie boutique doit permettre de le retrouver — par courriel, par
 * exemple — mais c'est le travail du prestataire de paiement, pas d'ici.
 */
export function licence() {
  try {
    const existante = localStorage.getItem(LICENCE_KEY);
    if (existante) return existante;
    const octets = new Uint8Array(16);
    crypto.getRandomValues(octets);
    const neuve = Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(LICENCE_KEY, neuve);
    return neuve;
  } catch {
    return '';                 // navigation privée : pas d'achat possible
  }
}

/* --- Le cache local ------------------------------------------------------- */

function lireCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function ecrireCache(packs) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(packs));
  } catch {
    // Quota dépassé : on jouera avec ce qu'on a. Perdre un pack en cache est
    // désagréable, planter en pleine partie le serait bien davantage.
  }
}

/** Les questions de tous les packs déjà téléchargés sur cet appareil. */
export function questionsInstallees() {
  return Object.values(lireCache()).flatMap((pack) => pack.questions ?? []);
}

export function packsInstalles() {
  return Object.values(lireCache()).map(({ id, nom, emoji, resume, questions }) => ({
    id,
    nom,
    emoji,
    resume,
    nombre: questions?.length ?? 0,
  }));
}

/* --- L'API ---------------------------------------------------------------- */

async function appel(params) {
  const url = new URL('/api/packs', location.href);
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur != null) url.searchParams.set(cle, String(valeur));
  }
  const res = await fetch(url, { cache: 'no-store' });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error(payload?.error ?? 'La boutique ne répond pas.'), {
      status: res.status,
    });
  }
  return payload;
}

/**
 * Le catalogue, complété par ce qui est déjà installé. Hors-ligne, on n'a pas
 * la vitrine mais on a nos packs : la partie doit rester jouable.
 */
export async function catalogue() {
  const installes = new Set(packsInstalles().map((p) => p.id));
  try {
    const { packs } = await appel({ licence: licence() });
    return packs.map((pack) => ({ ...pack, installe: installes.has(pack.id) }));
  } catch {
    return packsInstalles().map((pack) => ({
      ...pack,
      possede: true,
      installe: true,
      horsLigne: true,
    }));
  }
}

/**
 * Télécharge un pack débloqué et le range en local. Renvoie ce qui a été
 * installé, ou lève avec un statut 402 si la licence ne l'ouvre pas.
 *
 * Les clips arrivent dans la même réponse, et repartent aussitôt vers le cache
 * du navigateur : deux mégaoctets et demi de base64 n'ont rien à faire dans
 * `localStorage`, dont le quota se compte en unités de mégaoctets et qui ferait
 * perdre le pack entier en dépassant. Seules les durées restent ici — quelques
 * centaines d'octets, et c'est ce dont le minutage a besoin.
 */
export async function installer(id, voix) {
  const pack = await appel({ id, licence: licence(), voix });
  const { audio, ...contenu } = pack;

  if (audio?.donnees) await rangerLesClips(id, voix, audio);

  const cache = lireCache();
  cache[pack.id] = {
    ...contenu,
    // La voix des clips installés : sans elle, changer de voix laisserait les
    // packs dans l'ancienne sans que rien ne le signale.
    audio: audio ? { voix, format: audio.format, clips: audio.clips } : null,
  };
  ecrireCache(cache);
  return contenu;
}

/** Retire un pack de cet appareil. L'achat, lui, reste acquis à la licence. */
export function desinstaller(id) {
  const cache = lireCache();
  const range = cache[id];
  delete cache[id];
  ecrireCache(cache);
  if (range?.audio) oublierLesClips(id, range.audio).catch(() => {});
}

/* --- Les clips des packs -------------------------------------------------- */

// Le cache du navigateur, et non `localStorage` : il est prévu pour des corps
// de réponse, son quota se compte en centaines de mégaoctets, et il survit
// hors-ligne. C'est la seule façon de tenir la promesse « un pack payé se joue
// sans réseau » sans faire exploser le stockage de clés-valeurs.
const CACHE_CLIPS = 'quizroom.clips-packs';

/** L'adresse sous laquelle un clip de pack est rangé. Interne, jamais servie. */
export const adresseDuClip = (packId, voix, clipId, format) => new URL(
  `/clips-packs/${voix}/${packId}/${clipId}.${format}`,
  location.href,
).href;

async function rangerLesClips(packId, voix, audio) {
  if (!globalThis.caches) return;             // contexte non sécurisé : tant pis
  try {
    const boite = await caches.open(CACHE_CLIPS);
    for (const [clipId, base64] of Object.entries(audio.donnees)) {
      const octets = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      await boite.put(
        adresseDuClip(packId, voix, clipId, audio.format),
        new Response(octets, { headers: { 'content-type': 'audio/mpeg' } }),
      );
    }
  } catch {
    // Quota, mode privé, stockage refusé : le pack reste jouable, l'animateur
    // lira simplement ces questions-là avec la voix de synthèse.
  }
}

async function oublierLesClips(packId, audio) {
  if (!globalThis.caches) return;
  const boite = await caches.open(CACHE_CLIPS);
  for (const clipId of Object.keys(audio.clips ?? {})) {
    await boite.delete(adresseDuClip(packId, audio.voix, clipId, audio.format));
  }
}

/**
 * Ce que les packs installés ajoutent à la banque de clips, pour la voix
 * donnée. Rend `{ durees, adresses }` : le premier sert au minutage, le second
 * à la lecture.
 *
 * Un pack téléchargé dans une autre voix est ignoré plutôt que joué : mélanger
 * deux voix dans une soirée est précisément ce que tout ce travail évite.
 */
export function clipsInstalles(voix) {
  const durees = {};
  const adresses = {};
  for (const pack of Object.values(lireCache())) {
    if (!pack.audio || pack.audio.voix !== voix) continue;
    for (const [clipId, secondes] of Object.entries(pack.audio.clips ?? {})) {
      durees[clipId] = secondes;
      adresses[clipId] = adresseDuClip(pack.id, voix, clipId, pack.audio.format);
    }
  }
  return { durees, adresses };
}

/**
 * Récupère tout ce qui est débloqué mais pas encore présent. Appelé au
 * démarrage : un pack acheté sur cet appareil doit être là avant la soirée, pas
 * au moment où le Wi-Fi du salon décide de faiblir.
 */
export async function synchroniser(voix) {
  let installes = 0;
  try {
    const packs = await catalogue();
    const enCache = lireCache();
    for (const pack of packs) {
      if (!pack.possede) continue;
      // Déjà installé, mais dans une autre voix que celle du jour : on le
      // reprend. Sans ça, changer de voix laisserait les questions achetées
      // dans l'ancienne — la couture au milieu de la soirée, exactement.
      const bonneVoix = !voix || enCache[pack.id]?.audio?.voix === voix;
      if (pack.installe && bonneVoix) continue;
      await installer(pack.id, voix);
      installes += 1;
    }
  } catch {
    // Hors-ligne au lancement : on garde ce qu'on a.
  }
  return installes;
}
