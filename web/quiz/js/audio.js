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

// Une banque par voix, et un index qui les liste :
//
//   audio/voix.json          { defaut, voix: [{ id, nom }] }
//   audio/<id>/manifeste.json
//   audio/<id>/emcee/…       les fichiers
//
// Tout vivait à plat sous `audio/`, ce qui allait tant qu'il n'y avait qu'une
// voix. Générer la suivante écrasait la précédente — or une banque déjà payée
// et déjà écoutée est précisément ce qui permet d'offrir le choix.
const BANQUES = 'audio';
const INDEX = `${BANQUES}/voix.json`;
const CHOIX = 'quizroom.banque';

let manifeste = null;
let chargement = null;
let banques = [];        // l'index : [{ id, nom }]
let defaut = null;
let courante = null;     // la banque effectivement ouverte
let encours = null;      // l'élément <audio> qui joue, pour pouvoir le couper
// Un clip annoncé par le manifeste s'est révélé illisible : la banque est
// incomplète, on rend la parole à la synthèse. Voir `jouer`.
let cassee = false;
// Ce que le manifeste a répondu, pour l'afficher dans les réglages.
let panne = null;

/**
 * Charge l'index, puis le manifeste de la banque retenue. Une seule fois.
 *
 * Deux requêtes au lieu d'une, et c'est le prix du choix : l'index dit quelles
 * voix sont installées et laquelle sert par défaut, le manifeste dit ce que
 * contient celle qu'on ouvre. Leur absence n'est pas une erreur — c'est
 * simplement une installation où les clips n'ont pas été générés.
 *
 * Rien d'autre n'est vérifié, et c'est le fruit d'une erreur qu'il vaut la
 * peine d'écrire. Le manifeste est versionné alors que les clips d'essai ne le
 * sont pas : déployé seul, il ferait croire à une voix qui n'existe pas. On
 * avait donc ajouté une sonde au démarrage — télécharger un clip pour voir s'il
 * répond. Mauvais juge : dans l'application native la page est servie par un
 * gestionnaire d'URL maison, `capacitor://localhost` n'est pas un serveur HTTP,
 * et une requête qui n'aboutit pas là ne dit rien de la capacité à LIRE le
 * fichier. La sonde concluait « aucun clip » avec 741 fichiers dans le paquet,
 * et l'animateur repassait à la voix de synthèse du téléphone.
 *
 * Le bon juge, c'est la lecture elle-même : elle mesure exactement ce dont on a
 * besoin, elle ne coûte aucune requête de plus, et elle ne peut pas se tromper
 * sur un détail de transport. Le manifeste est donc cru sur parole, et c'est le
 * premier clip qui échoue vraiment qui fait basculer sur la synthèse.
 */
export function charger() {
  if (chargement) return chargement;
  chargement = (async () => {
    try {
      const res = await fetch(INDEX);
      if (!res.ok) { panne = `index ${res.status}`; return null; }
      const json = await res.json();
      banques = Array.isArray(json?.voix) ? json.voix : [];
      defaut = json?.defaut ?? banques[0]?.id ?? null;
      // Le choix mémorisé ne vaut que s'il existe encore : une banque retirée
      // d'une version à l'autre laisserait l'appareil muet, sans rien dire.
      const voulue = banques.some((v) => v.id === lire()) ? lire() : defaut;
      return await ouvrir(voulue);
    } catch (erreur) {
      panne = `index illisible (${erreur?.message ?? 'erreur'})`;
      manifeste = null;
      return null;
    }
  })();
  return chargement;
}

/** Lit le manifeste d'une banque et en fait la banque courante. */
async function ouvrir(id) {
  courante = id;
  cassee = false;
  if (!id) { panne = 'aucune banque installée'; manifeste = null; return null; }
  try {
    const res = await fetch(`${BANQUES}/${id}/manifeste.json`);
    if (!res.ok) { panne = `manifeste ${res.status}`; manifeste = null; return null; }
    const json = await res.json();
    if (!json?.clips) { panne = 'manifeste sans clips'; manifeste = null; return null; }
    panne = null;
    manifeste = json;
    return manifeste;
  } catch (erreur) {
    panne = `manifeste illisible (${erreur?.message ?? 'erreur'})`;
    manifeste = null;
    return null;
  }
}

/** Les voix installées, pour le sélecteur des réglages. */
export function banquesDisponibles() {
  return banques.map((v) => ({ ...v, courante: v.id === courante }));
}

/**
 * Changer de voix. Rend la promesse du chargement, parce que l'appelant doit
 * pouvoir redessiner ses réglages une fois la nouvelle banque lue.
 *
 * Le choix est mémorisé sur l'appareil, comme le timbre de synthèse : c'est un
 * réglage de préférence, pas un état de partie. Deux personnes autour de la
 * table peuvent donc l'avoir réglé différemment — sans conséquence, puisque
 * seule la régie parle.
 */
export function choisirBanque(id) {
  if (!banques.some((v) => v.id === id)) return Promise.resolve(manifeste);
  ecrire(id);
  taire();
  chargement = ouvrir(id);
  return chargement;
}

const lire = () => {
  try { return localStorage.getItem(CHOIX); } catch { return null; }
};
const ecrire = (id) => {
  try { localStorage.setItem(CHOIX, id); } catch { /* navigation privée */ }
};

/**
 * L'état de la banque, en clair, pour l'écran des réglages.
 *
 * Quand la voix enregistrée ne sort pas, il n'y a rien à voir : l'appli parle,
 * simplement avec le mauvais timbre. Sur un téléphone, sans console, la seule
 * façon de savoir POURQUOI est que l'appli le dise elle-même.
 */
export function etat() {
  if (cassee) return 'Enregistrements introuvables à la lecture — repli sur la synthèse.';
  if (manifeste) return null;
  if (!chargement) return 'Enregistrements pas encore cherchés.';
  return panne ? `Enregistrements indisponibles : ${panne}.` : 'Enregistrements en cours de chargement…';
}

/* --- Les clips des packs -------------------------------------------------- */

// Les packs ne sont pas servis en statique — leur contenu est payant — donc
// leurs clips ne vivent pas à côté des autres : ils arrivent avec le pack et
// sont rangés dans le cache du navigateur. Ce module ne sait pas les
// télécharger et n'a pas à le savoir ; on les lui déclare.
let extras = { durees: {}, adresses: {} };
// Une URL d'objet par clip, fabriquée à la première lecture et gardée : en
// refaire une à chaque fois fuirait de la mémoire à chaque manche.
const objets = new Map();

/**
 * Déclare les clips venus des packs installés.
 *
 * Appelé après le chargement et après chaque installation : un pack acheté en
 * cours de soirée doit être lu par l'animateur, pas à la partie suivante.
 */
export function ajouterDesClips({ durees = {}, adresses = {} } = {}) {
  extras = { durees, adresses };
  for (const url of objets.values()) URL.revokeObjectURL(url);
  objets.clear();
}

/**
 * L'adresse réellement lisible d'un clip.
 *
 * Pour la banque de base, un chemin de fichier. Pour un pack, une réponse
 * rangée dans le cache du navigateur : sans service worker, `fetch` ne la
 * trouverait pas toute seule, il faut aller la chercher et en faire une URL
 * d'objet. D'où une résolution asynchrone, là où un chemin suffisait.
 */
async function source(id) {
  if (manifeste?.clips?.[id] != null) return url(id);
  const adresse = extras.adresses[id];
  if (!adresse || !globalThis.caches) return null;
  if (objets.has(id)) return objets.get(id);
  try {
    const reponse = await caches.match(adresse);
    if (!reponse) return null;
    const objet = URL.createObjectURL(await reponse.blob());
    objets.set(id, objet);
    return objet;
  } catch {
    return null;
  }
}

/** Ce clip existe-t-il ? */
export function existe(id) {
  if (cassee || !id) return false;
  return manifeste?.clips?.[id] != null || extras.durees[id] != null;
}

/**
 * Durée d'un clip en secondes, ou 0 si on ne l'a pas.
 *
 * Le zéro compte : c'est lui qui fait retomber le minutage des révélations sur
 * l'estimation par longueur de texte. Une banque déclarée mais cassée rendrait
 * sinon des durées pour des clips qu'on n'entend pas, et laisserait l'écran
 * figé le temps d'un silence.
 */
export function duree(id) {
  if (!existe(id)) return 0;
  return manifeste?.clips?.[id] ?? extras.durees[id] ?? 0;
}

const url = (id) => `${BANQUES}/${courante}/${id}.${manifeste?.format ?? 'mp3'}`;

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
    // Un clip de pack est déjà sur l'appareil : rien à télécharger, mais son
    // URL d'objet est à fabriquer, et ça vaut mieux avant le top que pendant.
    if (manifeste?.clips?.[id] == null) { source(id).catch(() => {}); continue; }
    // Un GET nu : c'est la lecture elle-même qui remplit le cache, et les modes
    // de cache exotiques ne sont pas garantis derrière `capacitor://localhost`.
    fetch(url(id)).catch(() => {});
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
    // Résolue avant d'armer les écouteurs : un clip de pack va se chercher dans
    // le cache, et cette attente-là n'a rien à faire au milieu d'une promesse
    // de lecture.
    const adresse = await source(id);
    if (!adresse) {
      // Un clip de pack annoncé mais absent du cache : on le retire de
      // l'inventaire, et la manche suivante retombera proprement sur la
      // synthèse. Surtout PAS `cassee` — la banque de base, elle, va bien, et
      // la condamner pour un pack rendrait toute la soirée muette.
      delete extras.durees[id];
      delete extras.adresses[id];
      encours = null;
      return false;
    }
    encours = element;
    try {
      await new Promise((resolve, reject) => {
        const finir = () => { nettoyer(); resolve(); };
        // Deux échecs qui n'ont rien à voir, d'où les deux causes.
        //
        //   'fichier'  l'élément n'a pas su lire la source : elle est absente
        //              du paquet, ou illisible. Le manifeste ment, et il ment
        //              probablement sur tout le reste : on rend la parole à la
        //              synthèse pour le reste de la soirée.
        //   'refus'    le système a refusé de jouer, faute de geste utilisateur.
        //              Les fichiers, eux, sont parfaits — la prochaine phrase
        //              passera. Surtout ne rien conclure sur la banque.
        //
        // Les deux arrivent par deux chemins qui se doublent : une source
        // illisible fait échouer `play()` ET déclenche `error`, dans un ordre
        // qui dépend du navigateur. Classer selon le chemin emprunté rendrait
        // donc un verdict tiré au sort. On classe sur le seul signal qui dit
        // vraiment de quoi il s'agit : `NotAllowedError`, le nom réservé au
        // refus de lecture automatique. Tout le reste met la source en cause.
        const rater = (erreur) => {
          nettoyer();
          reject(new Error(erreur?.name === 'NotAllowedError' ? 'refus' : 'fichier'));
        };
        // L'événement `error` ne porte pas de nom d'exception : c'est par
        // définition une source qu'on n'a pas su lire, donc 'fichier'.
        const raterSource = () => rater(null);
        function nettoyer() {
          element.removeEventListener('ended', finir);
          element.removeEventListener('error', raterSource);
          clearInterval(garde);
        }
        // Une pause ne déclenche pas `ended` : sans ce garde, la boucle d'un
        // passage coupé resterait suspendue pour toujours.
        const garde = setInterval(() => {
          if (passage !== lemien) finir();
        }, 120);
        element.addEventListener('ended', finir, { once: true });
        element.addEventListener('error', raterSource, { once: true });
        element.src = adresse;
        element.play().catch(rater);
      });
    } catch (erreur) {
      if (erreur.message === 'fichier') cassee = true;
      // On s'arrête là plutôt que d'enchaîner dans le vide.
      if (passage === lemien) encours = null;
      return false;
    }
  }
  if (passage === lemien) encours = null;
  return true;
}

/** Vrai si cette installation dispose de clips pré-générés ET lisibles. */
export function disponible() {
  return !cassee && Boolean(manifeste?.clips && Object.keys(manifeste.clips).length);
}

/** Le nom de la voix utilisée pour la génération, à afficher dans les réglages. */
export function nomDeLaVoix() {
  return manifeste?.voix ?? null;
}
