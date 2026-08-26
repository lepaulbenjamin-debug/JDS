// Les clips pré-générés de l'animateur.
//
// La synthèse du navigateur ne lit que les voix installées sur l'appareil :
// un Mac, un iPhone et un Android n'ont pas le même catalogue, et iOS n'en
// laisse pas installer d'autres. Impossible, donc, de garantir la même voix
// pour tout le monde — c'est structurel, aucun réglage ne le contourne.
//
// La banque de questions étant connue à l'avance, on n'a pas besoin de lire en
// direct : `scripts/generate-audio.mjs` fabrique les fichiers une fois pour
// toutes, et ce module se contente de les jouer. Même voix partout, aucune
// latence, hors-ligne, et rien à payer à chaque partie.
//
// Le repli sur la synthèse du navigateur reste branché : tant que les clips ne
// sont pas générés, ou si l'un manque, l'animateur parle quand même.

const RACINE = 'audio';
const MANIFESTE = `${RACINE}/manifeste.json`;

let manifeste = null;
let chargement = null;
let encours = null;      // l'élément <audio> qui joue, pour pouvoir le couper

/**
 * Charge le manifeste, une seule fois. Son absence n'est pas une erreur :
 * c'est simplement une installation où les clips n'ont pas été générés.
 */
export function charger() {
  if (chargement) return chargement;
  chargement = fetch(MANIFESTE, { cache: 'force-cache' })
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      manifeste = json?.clips ? json : null;
      return manifeste;
    })
    .catch(() => {
      manifeste = null;
      return null;
    });
  return chargement;
}

/** Ce clip existe-t-il ? */
export function existe(id) {
  return Boolean(id && manifeste?.clips?.[id] != null);
}

/** Durée d'un clip en secondes, ou 0 si on ne l'a pas. */
export function duree(id) {
  return manifeste?.clips?.[id] ?? 0;
}

const url = (id) => `${RACINE}/${id}.${manifeste?.format ?? 'mp3'}`;

/**
 * Met des clips en cache avant d'en avoir besoin. Appelé pendant la fenêtre de
 * jokers pour que l'énoncé démarre à l'instant précis du top, sans attendre le
 * réseau — même local, un aller-retour se voit sur un départ de manche.
 */
export function precharger(ids) {
  for (const id of [].concat(ids)) {
    if (!existe(id)) continue;
    const element = new Audio();
    element.preload = 'auto';
    element.src = url(id);
  }
}

export function taire() {
  if (!encours) return;
  encours.pause();
  encours = null;
}

/**
 * Enchaîne des clips. Rend `false` sans rien jouer si l'un d'eux manque :
 * mélanger un clip et la voix de synthèse au milieu d'une même phrase s'entend
 * immédiatement, mieux vaut alors laisser tout le passage au repli.
 */
export async function jouer(ids) {
  const liste = [].concat(ids).filter(Boolean);
  if (!liste.length || !liste.every(existe)) return false;

  taire();
  for (const id of liste) {
    const element = new Audio(url(id));
    encours = element;
    try {
      await new Promise((resolve, reject) => {
        element.addEventListener('ended', resolve, { once: true });
        element.addEventListener('error', () => reject(new Error(id)), { once: true });
        element.play().catch(reject);
      });
    } catch {
      // Lecture refusée (aucun geste utilisateur encore) ou fichier illisible :
      // on s'arrête là plutôt que d'enchaîner dans le vide.
      return false;
    }
    if (encours !== element) return true;      // coupé entre-temps : c'est voulu
  }
  encours = null;
  return true;
}

/** Vrai si cette installation dispose de clips pré-générés. */
export function disponible() {
  return Boolean(manifeste?.clips && Object.keys(manifeste.clips).length);
}

/** Le nom de la voix utilisée pour la génération, à afficher dans les réglages. */
export function nomDeLaVoix() {
  return manifeste?.voix ?? null;
}
