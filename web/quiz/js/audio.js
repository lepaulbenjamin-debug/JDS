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
 *
 * Le manifeste ne suffit pas : on vérifie qu'un clip répond vraiment. Il est
 * versionné alors que les fichiers, eux, peuvent ne pas l'être — c'est le cas
 * des essais à blanc, ignorés par git. Déployé tel quel, le manifeste faisait
 * croire à l'appli qu'elle avait une voix : elle tentait un fichier absent
 * avant chaque phrase, se rabattait sur la synthèse après un aller-retour
 * perdu, et masquait le choix de voix système au motif qu'il ne servait plus.
 * Une requête au démarrage évite tout ça, et couvre aussi le cas d'un envoi
 * incomplet.
 */
export function charger() {
  if (chargement) return chargement;
  chargement = fetch(MANIFESTE, { cache: 'force-cache' })
    .then((res) => (res.ok ? res.json() : null))
    .then(async (json) => {
      if (!json?.clips) return null;
      const premier = Object.keys(json.clips)[0];
      if (!premier) return null;
      const sonde = await fetch(`${RACINE}/${premier}.${json.format ?? 'mp3'}`, { method: 'HEAD' })
        .catch(() => null);
      return sonde?.ok ? json : null;
    })
    .then((valide) => {
      manifeste = valide;
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
 *
 * On passe par `fetch` et non par un élément `<audio>` : iOS plafonne le nombre
 * d'éléments audio d'une page, et en fabriquer deux par manche sans jamais les
 * libérer finissait par faire échouer les lectures en fin de soirée. Le cache
 * HTTP rend le même service et ne coûte aucun élément.
 */
export function precharger(ids) {
  for (const id of [].concat(ids)) {
    if (!existe(id)) continue;
    fetch(url(id), { cache: 'force-cache' }).catch(() => {});
  }
}

/**
 * Un seul lecteur pour toute la partie, réutilisé d'un clip à l'autre.
 *
 * C'est la condition d'une lecture fiable sur mobile : le droit de jouer du son
 * s'acquiert au premier geste de l'utilisateur et reste attaché à CET élément.
 * Un `new Audio()` par clip repart sans ce droit, et se fait refuser au milieu
 * de la partie — ce qui faisait basculer l'annonce de manche sur la voix de
 * synthèse alors que le reste passait encore.
 */
let lecteur = null;
// Chaque passage reçoit un numéro. Couper, c'est incrémenter : la boucle qui
// tournait le voit au réveil et rend la main sans se battre pour le lecteur.
let passage = 0;

function obtenirLecteur() {
  if (!lecteur) lecteur = new Audio();
  return lecteur;
}

export function taire() {
  passage += 1;
  if (!lecteur) return;
  lecteur.pause();
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
  const lemien = passage;
  const element = obtenirLecteur();

  for (const id of liste) {
    if (passage !== lemien) return true;        // coupé entre-temps : c'est voulu
    encours = element;
    try {
      await new Promise((resolve, reject) => {
        const finir = () => { nettoyer(); resolve(); };
        const rater = () => { nettoyer(); reject(new Error(id)); };
        function nettoyer() {
          element.removeEventListener('ended', finir);
          element.removeEventListener('error', rater);
          clearInterval(garde);
        }
        // Une pause ne déclenche pas `ended` : sans ce garde, la boucle d'un
        // passage coupé resterait suspendue pour toujours.
        const garde = setInterval(() => {
          if (passage !== lemien) finir();
        }, 120);
        element.addEventListener('ended', finir, { once: true });
        element.addEventListener('error', rater, { once: true });
        element.src = url(id);
        element.play().catch(rater);
      });
    } catch {
      // Lecture refusée (aucun geste utilisateur encore) ou fichier illisible :
      // on s'arrête là plutôt que d'enchaîner dans le vide.
      if (passage === lemien) encours = null;
      return false;
    }
  }
  if (passage === lemien) encours = null;
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
