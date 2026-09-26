// Quiz entre amis — l'appli de pupitre.
//
// Le même code tourne sur tous les téléphones. La seule différence, c'est que
// l'appareil qui a créé le salon fait tourner la régie en plus (`engine.js`) :
// il publie l'état, les autres le lisent. Personne n'a de rôle d'animateur à
// tenir, tout le monde joue.

import { $, $$, el, clear, toast, confirmDialog } from '../../js/ui.js';
import * as net from './net.js';
import { creerRegie, JOKERS, jokersPossibles } from './engine.js';
import { vueDe } from './vues.js';
import { typeDeManche } from './manches/index.js';
import { NIVEAU_MIN, NIVEAU_MAX, NIVEAU_DEFAUT } from './manches/ttmc.js';
import { historique } from './historique.js';
import * as comptes from './compte.js';
import {
  THEMES, NIVEAUX, FILS_ROUGES, tirerQuestions, tailleDuPool, typesDisponibles, nomDuTheme,
  ajouterQuestions, toutesLesQuestions,
} from './questions.js';
import * as packs from './packs.js';
import * as achats from './achats.js';
import {
  PERSONAS, voix, sons, clipsDAnnonce, chargerLesClips, declarerLesClipsDesPacks,
  dureeDuClip, dureeDeLaReplique,
} from './emcee.js';

const MOI_KEY = 'quizroom.moi';
const SALON_KEY = 'quizroom.salon';
const BATTEMENT_REGIE_MS = 450;
const BATTEMENT_PUPITRE_MS = 700;
const ERREURS_AVANT_ALERTE = 5;

/* --- Identité ------------------------------------------------------------ */

/**
 * Un identifiant aléatoire, sans `crypto.randomUUID`.
 *
 * On joue depuis `http://192.168.x.x` : le navigateur ne considère pas cette
 * adresse comme un contexte sécurisé et n'expose donc PAS `randomUUID` —
 * contrairement à `getRandomValues`, disponible partout. Un appel direct à
 * `randomUUID` lèverait une exception au chargement, et la page resterait
 * affichée mais entièrement morte : aucun bouton branché.
 */
function identifiant() {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return Array.from(octets, (o) => o.toString(16).padStart(2, '0')).join('');
}

// L'identifiant survit au rechargement de la page : c'est lui qui permet de
// retrouver sa place et son score quand un téléphone se verrouille ou que le
// Wi-Fi saute en pleine manche.
function chargerMoi() {
  try {
    const brut = JSON.parse(localStorage.getItem(MOI_KEY) ?? 'null');
    if (brut?.id) return { id: brut.id, name: brut.name ?? '' };
  } catch { /* stockage indisponible */ }
  return { id: identifiant(), name: '' };
}

function enregistrerMoi() {
  try {
    localStorage.setItem(MOI_KEY, JSON.stringify(moi));
  } catch { /* navigation privée : on rejouera sous un nouvel identifiant */ }
}

// Le salon où l'on jouait, pour y revenir seul après un rechargement. On note
// aussi si l'on tenait la régie : ce cas-là ne se rattrape pas, et le dire vaut
// mieux que de rendre un lobby qui n'avancera plus.
function retenirLeSalon(code, tenaitLaRegie) {
  try {
    localStorage.setItem(SALON_KEY, JSON.stringify({ code, regie: tenaitLaRegie }));
  } catch { /* stockage indisponible : on retapera le code */ }
}

function salonRetenu() {
  try {
    const brut = JSON.parse(localStorage.getItem(SALON_KEY) ?? 'null');
    return /^[A-Z0-9]{4}$/.test(brut?.code ?? '') ? brut : null;
  } catch { return null; }
}

function oublierLeSalon() {
  try { localStorage.removeItem(SALON_KEY); } catch { /* rien à oublier */ }
}

/* --- État de l'appli ----------------------------------------------------- */

const moi = chargerMoi();

let salon = null;              // { code, hostToken | null }
let regie = null;              // seulement sur l'appareil qui a créé le salon
let etat = null;               // dernier état reçu ou calculé
let joueurs = [];
let version = -1;
let aPublier;                  // état que la régie doit pousser au prochain battement
let boucle = null;
let erreurs = 0;

let reglages = {
  themes: [],
  types: [],                   // vide = tous les types de manche
  nombre: 12,
  niveau: 'tout',              // difficulté des questions : voir NIVEAUX
  dureeMs: 15000,
  persona: 'classique',
  jokers: JOKERS.map((j) => j.id),
  avecFil: FILS_ROUGES.length > 0,
};

let monChoix = null;           // { manche, choix, joker } — écho local, avant l'aller-retour
let jokerArme = null;
let cibleVisee = null;         // qui le vol ou le sabotage vise, si l'on a désigné
let masque = null;             // { manche, caches } — les réponses retirées par le 50/50
let cleRendue = '';
let saisieRendue = '';         // la manche dont la zone de saisie est à l'écran
let derniereVoix = '';
let vueManche = null;          // la vue construite pour la manche en cours
let filEnvoye = false;         // une tentative de fil rouge part sans écho immédiat
let filRendu = '';             // ce que la boîte du fil rouge affiche déjà, pour ne pas la reconstruire sous les doigts
let monNiveau = null;          // { manche, niveau } — le pari du TTMC, écho local
let mesVotes = {};             // candidat → oui/non, écho local le temps d'un battement

// En solo, le relais est remplacé par cette file : les réponses y sont déposées
// et relues au battement suivant, exactement là où le relais les aurait rendues.
let fileSolo = [];

// Ce que CET appareil a vécu de la partie en cours : une ligne par manche
// révélée. Sert à déclarer la partie au compte, à la toute fin. Chaque pupitre
// déclare la sienne — la régie n'a pas les jetons des autres, et n'a rien à en
// faire.
let monJournal = [];
let partieDeclaree = '';

const estSolo = () => Boolean(salon?.solo);
// Solo ou hôte, c'est le même rôle : cet appareil fait tourner la régie.
const estRegie = () => Boolean(salon?.hostToken) || estSolo();

/* --- Navigation ---------------------------------------------------------- */

function montrer(nom) {
  for (const section of $$('[data-screen]')) section.hidden = section.dataset.screen !== nom;
  // L'état de la voix change en cours de route — l'index arrive après le
  // premier affichage, et une banque peut se révéler illisible à la première
  // lecture. Le redessiner en revenant évite d'y lire une réponse périmée.
  //
  // Sur l'accueil, parce que c'est là que vit le bloc « La voix de l'animateur ».
  // Il avait d'abord été branché sur l'écran des réglages, qui porte le contenu
  // de la partie et non les préférences de l'appareil : le redessin arrivait
  // alors sur une section masquée.
  if (nom === 'accueil') rendreChoixVoix();
  // Le retour reste disponible en pleine partie : un invité doit pouvoir sortir
  // d'un salon qui a mal tourné. La confirmation évite le départ par accident.
  $('#btn-back').hidden = nom === 'accueil';
}

// Le blanc laissé après la dernière phrase de l'animateur : le temps de lire
// son score et de souffler avant l'énoncé suivant.
const RESPIRATION_S = 4;

const ECRAN_DE_PHASE = {
  lobby: 'lobby',
  intro: 'jeu',
  manche: 'jeu',
  vote: 'jeu',
  revelation: 'jeu',
  podium: 'fin',
};

/* --- Veille de l'écran --------------------------------------------------- */

// L'appareil qui tient la régie fait avancer la partie : si son écran s'éteint,
// le navigateur gèle les minuteurs et le jeu s'arrête pour tout le monde. Le
// verrou de veille demande donc à l'appareil de rester allumé pendant la partie.
// Il n'existe qu'en contexte sécurisé — donc pas sur une adresse `http://192…`,
// d'où le conseil de tenir la régie depuis la machine qui sert l'appli.
let veille = null;

/**
 * Le plugin natif de veille, s'il est là.
 *
 * Dans l'application iOS, `navigator.wakeLock` dépend de la version du système
 * et n'a jamais été fiable en WebView — or si l'écran de la régie s'éteint, la
 * partie s'arrête pour toute la table. Le plugin fait le travail sans condition.
 *
 * Il reste facultatif : sur le web il n'existe pas, et l'appli doit tourner
 * exactement comme avant. On le cherche sans jamais l'exiger.
 */
const veilleNative = () => globalThis.Capacitor?.Plugins?.KeepAwake ?? null;

async function garderEcranAllume(actif) {
  try {
    const natif = veilleNative();
    if (natif) {
      await (actif ? natif.keepAwake() : natif.allowSleep());
      return;
    }
    if (!actif) {
      await veille?.release();
      veille = null;
      return;
    }
    if (veille || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    veille = await navigator.wakeLock.request('screen');
    // Le verrou saute dès que l'onglet passe en arrière-plan : on le reprend au
    // retour plutôt que de le croire encore acquis.
    veille.addEventListener('release', () => { veille = null; });
  } catch { /* refusé, indisponible, ou onglet caché : la partie continue */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && boucle !== null) garderEcranAllume(true);
});

/* --- Boucle réseau ------------------------------------------------------- */

function demarrerBoucle() {
  arreterBoucle();
  garderEcranAllume(true);
  const pas = estRegie() ? BATTEMENT_REGIE_MS : BATTEMENT_PUPITRE_MS;
  const battre = async () => {
    try {
      await (estRegie() ? battementRegie() : battementPupitre());
      erreurs = 0;
    } catch (erreur) {
      erreurs += 1;
      if (erreurs === ERREURS_AVANT_ALERTE) {
        toast(erreur?.status === 404
          ? 'Le salon n’existe plus.'
          : 'Connexion au relais perdue — on continue d’essayer.', 'warn');
      }
    }
    if (boucle !== null) boucle = setTimeout(battre, pas);
  };
  boucle = setTimeout(battre, 0);
}

function arreterBoucle() {
  clearTimeout(boucle);
  boucle = null;
  garderEcranAllume(false);
}

async function battementRegie() {
  if (estSolo()) {
    // Ni publication ni sondage : la table ne change pas, et les réponses sont
    // déjà sur l'appareil. Le reste du battement est identique.
    regie.encaisser(fileSolo.splice(0));
    regie.avancer(net.serverNow(), joueurs);
    appliquer(regie.etatPublic(joueurs));
    return;
  }

  const reponse = await net.publishState(salon.code, salon.hostToken, aPublier);
  aPublier = undefined;

  const avant = joueurs.map((j) => j.id).join(',');
  joueurs = reponse.players ?? [];
  const tableChangee = avant !== joueurs.map((j) => j.id).join(',');

  const nouvelles = regie.encaisser(reponse.answers);
  const avance = regie.avancer(net.serverNow(), joueurs);

  // On ne republie que si quelque chose a bougé : pendant qu'une question est
  // affichée, la régie n'a rien de neuf à dire et les pupitres n'ont rien à
  // retélécharger.
  if (avance || tableChangee || nouvelles) aPublier = regie.etatPublic(joueurs);
  appliquer(aPublier ?? regie.etatPublic(joueurs));
}

async function battementPupitre() {
  const reponse = await net.pollRoom(salon.code, version);
  if (!reponse.changed) return;
  version = reponse.version;
  if (reponse.players) joueurs = reponse.players;
  appliquer(reponse.state);
}

/* --- Application d'un état ----------------------------------------------- */

function appliquer(nouvel) {
  if (!nouvel) return;
  const phaseAvant = etat?.phase;
  const mancheAvant = etat?.manche;
  etat = nouvel;

  if (phaseAvant !== etat.phase || mancheAvant !== etat.manche) {
    // L'ouverture est le seul moment calme de la partie : on en profite pour
    // charger toutes les annonces d'un coup. Elles sont courtes, et les avoir
    // sous la main évite que la seconde moitié de l'annonce n'arrive après le
    // top — la fenêtre de jokers ne laisse pas de marge pour un aller-retour.
    if (etat.phase === 'intro') {
      voix.precharger(clipsDAnnonce(etat.persona));
      // Nouvelle partie : le journal de la précédente n'a plus cours.
      monJournal = [];
      partieDeclaree = '';
    }

    // Nouvelle manche : l'écho local d'une réponse précédente n'a plus cours.
    if (etat.phase === 'manche') {
      monChoix = null;
      jokerArme = null;
      cibleVisee = null;
      masque = null;
      filEnvoye = false;
      monNiveau = null;
      mesVotes = {};
      // L'énoncé sera lu au top : on le met en cache pendant la fenêtre de
      // jokers, pour qu'il parte pile à l'heure et non après un aller-retour.
      if (etat.question?.id) {
        voix.precharger([`question/${etat.question.id}`, `reponse/${etat.question.id}`]);
      }
    }

    // Une question posée, et vue : on la note pour ne pas la resservir demain.
    // Sur la régie seulement — c'est elle qui tire, et l'historique d'un pupitre
    // invité n'aurait aucune prise sur les parties qu'il ne crée pas.
    //
    // À la révélation, et non au tirage : une partie lancée pour montrer
    // l'appli et abandonnée à la deuxième manche ne doit pas brûler douze
    // questions que personne n'a entendues.
    if (etat.phase === 'revelation' && estRegie() && etat.question?.id) {
      historique.marquer(etat.question.id);
    }

    // Le journal de ma partie, une ligne par manche révélée. Tenu même sans
    // compte : on peut se connecter à la fin, et il serait bête d'avoir perdu
    // la partie qu'on vient de jouer.
    if (etat.phase === 'revelation' && etat.question?.id) {
      const mien = etat.resultat?.detail?.[moi.id];
      if (mien && !monJournal.some((m) => m.id === etat.question.id)) {
        monJournal.push({
          id: etat.question.id,
          theme: etat.question.theme,
          correct: Boolean(mien.correct),
          points: mien.points ?? 0,
        });
      }
    }
    if (etat.phase === 'podium') declarerMaPartie();

    parler();
  }

  montrer(ECRAN_DE_PHASE[etat.phase] ?? 'lobby');
  rendre();
}

/**
 * Ce que l'animateur dit au moment où l'on change de phase.
 *
 * Deux listes : les clips pré-générés, et le texte de repli pour la synthèse du
 * navigateur. Elles ne disent pas tout à fait la même chose, et c'est voulu.
 * Avec une vraie voix, on enchaîne la bonne réponse et son explication — le
 * meilleur moment de la manche. Avec une voix de synthèse, ce même passage est
 * celui qui lasse le plus, donc le repli s'arrête au commentaire.
 */
function parler() {
  if (!etat) return;
  // Le vote n'a rien à annoncer, et `annonceCle` porte encore celle de la
  // manche : sans ce garde, l'animateur redirait « troisième question » au
  // moment où la table s'apprête à juger une réponse.
  if (etat.phase === 'vote') return;
  const clips = [];
  const repli = [];
  const qid = etat.question?.id;

  if (etat.phase === 'revelation' && etat.resultat) {
    // Les clips viennent de la régie, comme l'annonce : un seul tirage pour
    // toute la table, et c'est la même liste qui décide de l'affichage.
    clips.push(...(etat.resultat.clips ?? []));
    // Le repli s'arrête au commentaire, et c'est délibéré. Avec une vraie voix
    // on prend le temps de lire l'explication — c'est le meilleur moment de la
    // manche. Avec une voix de synthèse, c'est ce même passage qui lasse.
    repli.push(etat.resultat.commentaire, etat.resultat.evenements?.[0]?.texte);
  } else if (etat.annonceCle) {
    // Les clips viennent de la régie, tirés une fois pour toute la table. Les
    // tirer ici donnait une phrase par appareil, et une autre encore à l'écran.
    clips.push(...(etat.annonceClips ?? []));
    // Le repli reste la version écrite : il ne sert que si la banque est
    // absente, et là c'est le même texte qui est dit et affiché. Pas de
    // contradiction possible, et on garde la phrase qui compte les joueurs.
    repli.push(etat.annonce);
  }

  const signature = [...clips, ...repli].filter(Boolean).join('|');
  if (!signature || signature === derniereVoix) return;
  derniereVoix = signature;
  voix.enoncer({ clips, repli: repli.filter(Boolean) });

  if (etat.phase === 'revelation') {
    const bon = monChoix?.choix === etat.question?.bonne;
    (bon ? sons.juste : sons.faux)();
  }
  if (etat.phase === 'podium') sons.fanfare();
}

/**
 * L'énoncé, lu au top et pas avant.
 *
 * Il est déjà sur l'appareil pendant la fenêtre de jokers — il le faut, pour
 * démarrer sans attendre le réseau — mais le lire là reviendrait à dévoiler la
 * question à ceux qui sont en train de miser dessus à l'aveugle.
 */
function lireEnonce() {
  const qid = etat?.question?.id;
  if (!qid) return;
  voix.enoncer({ clips: [`question/${qid}`], repli: [] });
}

/**
 * Déposer une réponse. En solo, la file locale tient lieu de relais — même
 * forme, même trajet, sans réseau.
 */
async function envoyerReponse(answer) {
  if (estSolo()) {
    fileSolo.push(answer);
    return;
  }
  await net.sendAnswer(salon.code, answer);
}

/**
 * Un bulletin sur une proposition que l'appli n'a pas su reconnaître.
 *
 * L'écho local est immédiat : la régie ne republiera qu'au battement suivant,
 * et un bouton qui met un demi-tour de boucle à réagir donne l'impression de
 * n'avoir pas été pressé — on retape, et on vote deux fois.
 */
async function envoyerVote(candidat, oui) {
  mesVotes = { ...mesVotes, [candidat]: oui };
  rendre();
  await envoyerReponse({ playerId: moi.id, vote: { candidat, oui } });
}

/* --- Rendu --------------------------------------------------------------- */

function rendre() {
  if (!etat) return;
  if (etat.phase === 'lobby') return rendreLobby();
  if (etat.phase === 'podium') return rendreFin();
  return rendreJeu();
}

function rendreLobby() {
  $('#code-affiche').textContent = salon?.code ?? '';
  const liste = clear($('#liste-joueurs'));
  for (const joueur of joueurs) {
    liste.append(el('div', { class: 'ligne-joueur' }, [
      el('span', { class: 'pastille-nom', text: joueur.name }),
      joueur.id === moi.id ? el('span', { class: 'muted small', text: 'toi' }) : null,
    ]));
  }
  if (!joueurs.length) {
    liste.append(el('p', { class: 'muted small', text: 'Personne pour l’instant.' }));
  }

  const lancable = estRegie() && joueurs.length >= 1;
  $('#btn-lancer').hidden = !estRegie();
  $('#btn-lancer').disabled = !lancable;
  $('#lobby-note').textContent = estRegie()
    ? 'Tu peux lancer dès que tout le monde est là. Les retardataires pourront quand même entrer.'
    : 'En attente du lancement…';
}

/**
 * La phrase de l'animateur, telle qu'elle doit s'afficher.
 *
 * Avec les enregistrements, c'est leur mot pour mot : on lisait « Manche 3 sur
 * 12 » pendant qu'on entendait « troisième question, prêts ? c'est parti ».
 * Sans eux, c'est la version écrite — celle qui compte les joueurs et nomme le
 * gagnant, que la synthèse dira mot pour mot elle aussi.
 *
 * Le podium garde toujours sa version écrite : là, le clip renvoie à l'écran au
 * lieu de le répéter, et c'est l'écran qui nomme le vainqueur. La régie le dit
 * en laissant `annonceDite` vide.
 */
function annonceAffichee() {
  if (voix.clipsDisponibles && etat?.annonceDite) return etat.annonceDite;
  return etat?.annonce ?? '';
}

/**
 * Le même arbitrage pour la révélation.
 *
 * Ce qui se perd en affichant l'enregistré : le prénom du plus proche, le
 * nombre de bonnes réponses. Ce qui se gagne : la voix et l'écran cessent de se
 * contredire. Et rien d'essentiel ne disparaît — la réponse exacte est montrée
 * par la vue de la manche, pas par cette phrase, le classement suit juste en
 * dessous, et l'animateur ne prononçait de toute façon ni le prénom ni le
 * compte : la table ne les entendait pas.
 */
const ditOuEcrit = (dit, ecrit) => (voix.clipsDisponibles && dit ? dit : (ecrit ?? ''));

function rendreJeu() {
  const cle = `${etat.phase}:${etat.manche}`;
  const question = etat.question;

  // Pendant l'ouverture, aucune manche n'a commencé : `etat.manche` vaut zéro,
  // et « Manche 0 / 12 » s'affichait le temps de l'annonce.
  $('#jeu-manche').textContent = etat.phase === 'intro'
    ? `${etat.total} manches`
    : etat.finale
      ? 'Dernière manche — points doublés'
      : `Manche ${etat.manche} / ${etat.total}`;
  $('#jeu-theme').textContent = question ? nomDuTheme(question.theme) : '';
  $('#jeu-theme').hidden = !question;

  $('#jeu-consigne').textContent = question?.consigne ?? '';
  $('#jeu-consigne').hidden = !question || etat.phase === 'revelation';

  // Hors du garde ci-dessous, et volontairement : la banque de clips arrive de
  // façon asynchrone, donc la phrase à afficher peut changer après le premier
  // rendu. Une affectation de texte par battement ne coûte rien.
  if (etat.phase !== 'revelation') $('#jeu-annonce').textContent = annonceAffichee();

  if (cle !== cleRendue) {
    cleRendue = cle;
    if (etat.phase === 'revelation') {
      $('#jeu-annonce').textContent = ditOuEcrit(
        etat.resultat?.commentaireDit, etat.resultat?.commentaire,
      );
    }
    // Sur un TTMC, `texte` est l'annonce de la carte ; l'énoncé joué dépend du
    // niveau et vit dans la vue, qui est seule à savoir lequel a été choisi.
    $('#jeu-question').textContent = question?.type === 'ttmc' ? '' : (question?.texte ?? '');
  }

  // La zone de saisie se reconstruit au changement de MANCHE, pas de phase.
  //
  // Sur une rafale ou un classement, elle est seule à savoir ce que le joueur a
  // coché : la refabriquer à la révélation repartait de cases vides, et l'on
  // voyait les bonnes réponses en vert sans jamais savoir lesquelles on avait
  // ratées. Rien n'obligeait à la reconstruire — la solution arrive dans la
  // manche passée à `peindre`, pas dans celle passée à `construire`.
  const saisie = `${etat.manche}:${question?.id ?? ''}`;
  if (saisie !== saisieRendue) {
    saisieRendue = saisie;
    construireSaisie(question);
  }

  rendrePari();
  peindreReponses();
  rendreVote();
  rendreJokers();
  rendreEtatManche();
  rendreFilRouge();
  rafraichirChrono();

  // Le bouton n'apparaît que sur la régie : c'est elle qui tient l'horloge, et
  // c'est elle qui parle. Sur un pupitre, il ne pourrait qu'avancer un écran
  // sans avancer la partie — et couper l'explication des autres depuis sa
  // poche n'est de toute façon pas un pouvoir à donner à tout le monde.
  $('#zone-passer').hidden = !(estRegie() && etat.phase === 'revelation');
}

/**
 * Le niveau auquel je me suis mis sur cette manche.
 *
 * L'écho local prime tant que la régie ne l'a pas repris, sinon le bouton
 * choisi clignote le temps d'un aller-retour. Sans rien d'annoncé, c'est le
 * plancher : personne ne doit rester spectateur pour une hésitation.
 */
function niveauCourant() {
  if (monNiveau?.manche === etat.manche) return monNiveau.niveau;
  return etat.niveaux?.[moi.id] ?? NIVEAU_DEFAUT;
}

/**
 * Le pari du TTMC : on annonce sa difficulté avant de voir sa question.
 *
 * Le verrou est ici, et nulle part ailleurs : la régie accepte encore une
 * annonce après l'ouverture, mais l'énoncé est déjà à l'écran — c'est la même
 * limite que le 50/50, la banque étant de toute façon embarquée sur chaque
 * appareil.
 */
function rendrePari() {
  const zone = $('#jeu-pari');
  const estTtmc = etat.question?.type === 'ttmc';
  const ouvert = etat.phase === 'manche' && net.serverNow() < etat.startAt;
  zone.hidden = !estTtmc || etat.phase === 'revelation';
  if (zone.hidden) return;

  const choisi = niveauCourant();
  clear(zone);
  // Le thème d'abord, et en grand. Il figure déjà dans la pastille du haut,
  // mais personne ne l'y lisait : on choisit son niveau en regardant la grille,
  // et miser sans savoir sur quoi, c'est jouer à pile ou face. C'est la seule
  // information dont on dispose pour décider, elle doit donc être là où la
  // décision se prend.
  zone.append(el('p', { class: 'pari-theme', text: nomDuTheme(etat.question.theme) }));
  zone.append(el('p', { class: 'pari-titre', text: ouvert ? 'Tu te mets combien ?' : `Tu t’es mis à ${choisi}.` }));

  const grille = el('div', { class: 'pari-grille' });
  for (let n = NIVEAU_MIN; n <= NIVEAU_MAX; n += 1) {
    grille.append(el('button', {
      class: `pari-cran${n === choisi ? ' est-actif' : ''}`,
      type: 'button',
      disabled: !ouvert,
      'aria-label': `Niveau ${n}`,
      onclick: () => annoncerLeNiveau(n),
    }, String(n)));
  }
  zone.append(grille);
  zone.append(el('p', {
    class: 'muted small',
    text: ouvert
      ? '1 : facile, peu de points. 10 : coriace, gros points. Tu ne verras ta question qu’après.'
      : 'Verrouillé pour cette manche.',
  }));
}

async function annoncerLeNiveau(niveau) {
  if (etat.phase !== 'manche' || net.serverNow() >= etat.startAt) return;
  monNiveau = { manche: etat.manche, niveau };
  sons.bip();
  rendrePari();
  try {
    await envoyerReponse({ playerId: moi.id, round: etat.manche, niveau });
  } catch {
    toast('Niveau non transmis — le relais n’a pas répondu.', 'warn');
  }
}

/** La zone de saisie, reconstruite une seule fois par manche. */
function construireSaisie(manche) {
  const hote = clear($('#jeu-reponses'));
  vueManche = null;
  if (!manche) return;
  const vue = vueDe(manche.type);
  vueManche = { type: manche.type, ...vue.construire(manche, { repondre }) };
  hote.append(vueManche.racine);
}

function peindreReponses() {
  const manche = etat.question;
  if (!manche || !vueManche) return;

  vueDe(vueManche.type).peindre(vueManche, {
    manche,
    monChoix: monChoix?.valeur ?? null,
    ouvert: etat.phase === 'manche' && net.serverNow() >= etat.reponsesAt,
    revele: etat.phase === 'revelation',
    masque: etat.phase === 'manche' && masque?.manche === etat.manche ? masque.caches : [],
    niveau: niveauCourant(),
  });
}

function rendreJokers() {
  const hote = clear($('#jeu-jokers'));
  // Une partie peut se jouer sans jokers, ou avec seulement quelques-uns : la
  // section disparaît alors au lieu d'afficher une rangée de boutons morts.
  const actifs = etat.jokersActifs ?? JOKERS.map((j) => j.id);
  $('#titre-jokers').hidden = !actifs.length;
  $('#joker-note').hidden = !actifs.length;
  hote.hidden = !actifs.length;
  if (!actifs.length) return;

  const restants = etat.jokers?.[moi.id] ?? [];
  // Uniquement pendant la fenêtre d'avant-question, puis verrouillé : on parie
  // sans avoir vu l'énoncé, sinon le joker n'est plus un pari.
  const jouable = etat.phase === 'manche' && net.serverNow() < etat.startAt;

  // Vol et sabotage visent le premier au classement : sans leader, ils n'ont
  // aucune cible et on le dit plutôt que de laisser gâcher un joker.
  const leader = etat.classement?.[0];
  const sansCible = !leader || leader.score <= 0;
  const jeSuisLeader = leader?.id === moi.id;

  // Le 50/50 verrouille la barre : une fois les réponses retirées, on ne
  // repart pas sur un autre joker en gardant l'information.
  const verrouille = jokerArme === 'cinquante';

  // Le moteur retire déjà les jokers qui n'ont aucun sens sur ce type de manche
  // — le 50/50 n'a rien à masquer sur une estimation.
  const possibles = jokersPossibles(etat.question?.type ?? 'qcm');

  for (const joker of JOKERS.filter((j) => actifs.includes(j.id) && possibles.includes(j.id))) {
    const utilise = !restants.includes(joker.id);
    const cible = joker.id === 'vol' || joker.id === 'sabotage';
    const inutile = cible && (sansCible || jeSuisLeader);

    hote.append(el('button', {
      class: `joker${jokerArme === joker.id ? ' est-arme' : ''}${utilise ? ' est-use' : ''}`,
      type: 'button',
      disabled: utilise || inutile || !jouable || (verrouille && joker.id !== 'cinquante'),
      title: joker.desc,
      onclick: () => armerJoker(joker.id),
    }, [
      el('span', { class: 'joker-emoji', text: joker.emoji }),
      el('span', { class: 'joker-nom', text: joker.nom }),
    ]));
  }

  // Qui l'on vise, quand le joker armé vise quelqu'un.
  //
  // Par défaut le premier au classement : c'est ce que fait la moitié de la
  // table, et personne ne doit être forcé de désigner en dix secondes. Mais
  // viser le deuxième quand on est troisième, ou se venger de la manche
  // précédente, valait la peine d'être possible.
  const zoneCible = clear($('#joker-cible'));
  const aCible = jokerArme === 'vol' || jokerArme === 'sabotage';
  zoneCible.hidden = !aCible || !jouable || joueurs.length < 2;
  if (!zoneCible.hidden) {
    const parDefaut = leader && leader.id !== moi.id ? leader.id : null;
    zoneCible.append(el('p', { class: 'muted small', text: 'Sur qui ?' }));
    const rangee = el('div', { class: 'cible-rangee' });
    for (const joueur of joueurs.filter((j) => j.id !== moi.id)) {
      const vise = (cibleVisee ?? parDefaut) === joueur.id;
      rangee.append(el('button', {
        class: `chip${vise ? ' est-actif' : ''}`,
        type: 'button',
        onclick: () => { cibleVisee = cibleVisee === joueur.id ? null : joueur.id; rendreJokers(); },
      }, joueur.id === parDefaut ? `${joueur.name} 👑` : joueur.name));
    }
    zoneCible.append(rangee);
  }

  // Ce que fait chaque joker, sous la rangée et pendant la fenêtre seulement.
  //
  // Un nom seul ne dit rien la première fois — « Sang-froid » ne se devine pas
  // — et la phrase complète n'apparaissait qu'une fois le joker armé, c'est-à-
  // dire après avoir choisi. La légende disparaît dès que la fenêtre se ferme :
  // à ce moment-là elle ne sert plus qu'à pousser la question vers le bas.
  const legende = clear($('#joker-legende'));
  const montrable = JOKERS.filter((j) => actifs.includes(j.id) && possibles.includes(j.id) && j.court);
  legende.hidden = !jouable || !montrable.length;
  if (!legende.hidden) {
    for (const joker of montrable) {
      legende.append(el('li', {}, [
        el('span', { class: 'joker-legende-emoji', text: joker.emoji }),
        el('span', {}, [
          el('b', { text: joker.nom }),
          el('span', { class: 'muted', text: ` — ${joker.court}` }),
        ]),
      ]));
    }
  }

  // L'avertissement sur l'absence de cible n'a de sens que si un joker à cible
  // est effectivement de la partie.
  const aUneCible = actifs.includes('vol') || actifs.includes('sabotage');
  const arme = JOKERS.find((j) => j.id === jokerArme);
  $('#joker-note').textContent = arme
    ? `${arme.nom} : ${arme.desc}`
    : (jouable
      ? (sansCible && aUneCible
        ? 'Vol et sabotage visent le joueur en tête : ils s’activeront dès que quelqu’un aura marqué.'
        : 'C’est maintenant ou jamais : un joker se joue avant de voir la question, et ne sert qu’une fois.')
      : 'Jokers verrouillés pour cette manche.');
}

/**
 * Le vote de la table sur ce que l'appli n'a pas reconnu.
 *
 * Le mix juge sur une liste, et cette liste ne connaît pas toute la musique du
 * monde : quelqu'un qui répond juste se faisait refuser. La salle, elle, sait.
 *
 * On ne montre à personne sa propre proposition — on ne se juge pas soi-même —
 * et l'auteur voit à la place où en est le verdict. Les bulletins des autres
 * sont visibles : autour d'une table, on voit très bien qui lève la main, et le
 * cacher n'ajouterait qu'un suspense que personne n'a demandé.
 */
function rendreVote() {
  const zone = $('#jeu-vote');
  zone.hidden = etat.phase !== 'vote';
  if (zone.hidden) return;

  clear(zone);
  zone.append(el('p', { class: 'vote-titre', text: 'À la table de trancher' }));
  zone.append(el('p', {
    class: 'muted small',
    text: 'Ces réponses ne sont pas dans ma liste. Elles comptent si la majorité les accepte.',
  }));

  for (const candidat of etat.candidats ?? []) {
    const bulletins = etat.votes?.[candidat.playerId] ?? {};
    const oui = Object.values(bulletins).filter(Boolean).length;
    const non = Object.values(bulletins).length - oui;
    const mien = mesVotes[candidat.playerId] ?? bulletins[moi.id];
    const cest = candidat.playerId === moi.id;

    zone.append(el('div', { class: 'vote-ligne' }, [
      el('div', { class: 'vote-quoi' }, [
        el('strong', { text: candidat.titre }),
        el('span', { class: 'muted small', text: ` — ${cest ? 'ta réponse' : candidat.nom}` }),
      ]),
      cest
        ? el('span', { class: 'muted small', text: `${oui} pour, ${non} contre` })
        : el('div', { class: 'vote-boutons' }, [
            el('button', {
              class: `btn vote-oui${mien === true ? ' est-actif' : ''}`,
              type: 'button',
              'aria-label': `Accepter ${candidat.titre}`,
              onclick: () => envoyerVote(candidat.playerId, true),
            }, `✅ ${oui}`),
            el('button', {
              class: `btn vote-non${mien === false ? ' est-actif' : ''}`,
              type: 'button',
              'aria-label': `Refuser ${candidat.titre}`,
              onclick: () => envoyerVote(candidat.playerId, false),
            }, `❌ ${non}`),
          ]),
    ]));
  }
}

function rendreEtatManche() {
  const hote = clear($('#jeu-etat'));

  if (etat.phase === 'revelation') {
    const mien = etat.resultat?.detail?.[moi.id];
    const gain = mien?.points ?? 0;
    hote.append(el('p', {
      class: `gain ${gain > 0 ? 'gain-plus' : gain < 0 ? 'gain-moins' : 'gain-zero'}`,
      text: mien?.absent
        ? 'Trop tard : rien pour toi cette manche.'
        : `${gain > 0 ? '+' : ''}${gain} point${Math.abs(gain) > 1 ? 's' : ''}`,
    }));
    const precision = detailDeLaManche(mien);
    if (precision) hote.append(el('p', { class: 'muted small', text: precision }));

    if (mien?.jokerRendu) {
      hote.append(el('p', {
        class: 'evenement',
        text: 'Ton joker t’est rendu : il n’a rien pu faire cette manche.',
      }));
    }
    // Sur un TTMC, l'explication appartient au niveau joué et s'affiche déjà
    // dans la vue, juste sous la question : la note de la carte ferait double.
    if (etat.question?.note && etat.question.type !== 'ttmc') {
      hote.append(el('p', { class: 'note', text: etat.question.note }));
    }
    // Ce que la table a validé pendant le vote : sans cette ligne, une réponse
    // acceptée par la salle marquerait des points sans que personne ne sache
    // pourquoi.
    if (etat.valides?.length) {
      hote.append(el('p', {
        class: 'evenement',
        text: etat.valides.length === 1
          ? `La table a accepté « ${etat.valides[0]} ».`
          : `La table a accepté : ${etat.valides.map((t) => `« ${t} »`).join(', ')}.`,
      }));
    }
    // Seul le premier événement est dit à voix haute — c'est celui que la régie
    // a mis en clip. Les suivants n'existent qu'à l'écran, et gardent donc leur
    // texte écrit. Rien ne se perd sur le fil rouge : le bandeau 🧵 affiche à
    // côté le prénom, le mot trouvé et la prime, en permanence.
    (etat.resultat?.evenements ?? []).forEach((evenement, rang) => {
      const texte = rang === 0
        ? ditOuEcrit(etat.resultat.evenementDit, evenement.texte)
        : evenement.texte;
      hote.append(el('p', { class: 'evenement', text: texte }));
    });
    if (etat.resultat?.rapide) {
      hote.append(el('p', {
        class: 'muted small',
        text: `Réponse la plus rapide : ${etat.resultat.rapide.nom}, en ${etat.resultat.rapide.secondes} s.`,
      }));
    }
    const dits = rendreLesDits();
    if (dits) hote.append(dits);
    hote.append(rendreClassement());
    return;
  }

  if (etat.phase === 'manche') {
    // Le temps que l'énoncé se lise, l'écran n'a ni réponses ni chrono qui
    // bouge : sans un mot, quelques secondes de rien ressemblent à une panne.
    const maintenant = net.serverNow();
    if (maintenant >= etat.startAt && maintenant < etat.reponsesAt) {
      hote.append(el('p', { class: 'atteinte', text: '🔊 Écoutez la question…' }));
      return;
    }
    if (monChoix) {
      hote.append(el('p', {
        class: 'atteinte',
        text: 'Réponse enregistrée — tu peux encore en changer tant que le chrono tourne.',
      }));
    }
    const total = joueurs.length;
    const repondu = etat.ontRepondu?.length ?? 0;
    if (total > 1) {
      hote.append(el('p', { class: 'muted small', text: `${repondu} sur ${total} ont répondu.` }));
    }
  }
}

/**
 * La ligne qui explique le score sur les manches à points partiels. Sur un QCM
 * on a bon ou faux et le bouton vert suffit ; sur un classement ou une rafale,
 * « +430 points » sans explication laisse le joueur perplexe.
 */
function detailDeLaManche(mien) {
  if (!mien || mien.absent) return '';
  const type = etat.question?.type;
  if (type === 'ordre') return `${mien.justes ?? 0} position${(mien.justes ?? 0) > 1 ? 's' : ''} sur 4 dans le bon ordre.`;
  if (type === 'rafale') return `${mien.justes ?? 0} bonne${(mien.justes ?? 0) > 1 ? 's' : ''} réponse${(mien.justes ?? 0) > 1 ? 's' : ''} sur 5.`;
  if (type === 'estimation' && mien.correct) return 'Estimation la plus proche de la table.';
  if (type === 'ttmc') {
    return mien.correct
      ? `Niveau ${mien.niveau} annoncé, et trouvé.`
      : `Niveau ${mien.niveau} annoncé, et raté.`;
  }
  if (type === 'mix') {
    // Trois issues, et la troisième est la plus frustrante des trois : c'est
    // celle qu'il faut nommer, sinon « 0 point » ressemble à une erreur.
    if (mien.dejaCite) return `« ${mien.titre} » : bien vu, mais quelqu’un t’a devancé.`;
    if (mien.correct) return `« ${mien.titre} » : accepté.`;
    return 'Pas dans la liste de l’appli — ce qui ne veut pas dire que tu avais tort.';
  }
  return '';
}

/**
 * Ce que toute la table a répondu.
 *
 * Jusqu'ici chacun ne voyait que sa propre réponse : on savait qui avait marqué,
 * jamais ce qu'il avait osé écrire. Or c'est là qu'est la soirée — l'estimation
 * à trois zéros près, le titre inventé de toutes pièces, les cinq « vrai »
 * d'affilée. Les réponses étaient déjà publiées à la révélation (le moteur en a
 * besoin pour compter) ; il ne manquait qu'un écran pour les lire.
 *
 * L'ordre est celui de la manche, du plus rapide au plus lent, et non celui du
 * classement : c'est l'ordre dans lequel ça s'est joué.
 */
function rendreLesDits() {
  const detail = etat.resultat?.detail;
  if (!detail || !etat.question) return null;

  const type = typeDeManche(etat.question.type);
  const nomDe = (id) => (etat.classement ?? joueurs).find((j) => j.id === id)?.name ?? '—';

  const lignes = Object.entries(detail)
    .sort((a, b) => (a[1].elapsedMs ?? Infinity) - (b[1].elapsedMs ?? Infinity))
    .map(([id, r]) => ({
      id,
      nom: nomDe(id),
      absent: Boolean(r.absent),
      correct: Boolean(r.correct),
      // Une manche à points partiels n'est ni juste ni fausse : la rafale à
      // trois sur cinq n'est pas celle à zéro, et une pastille rouge dirait le
      // contraire du score affiché juste à côté. D'où la marque « 3/5 » là où
      // elle existe, et rien du tout sur une estimation — le nombre est déjà là,
      // et « faux » n'a aucun sens quand on joue au plus proche.
      partiel: !r.correct && (r.fraction ?? 0) > 0,
      marque: marqueDuDit(r, type),
      texte: r.absent ? '' : (type.resume?.(etat.question, r) ?? ''),
    }));

  // Seul autour de la table, il n'y a personne dont on puisse rire.
  if (lignes.length < 2) return null;

  return el('div', { class: 'dits' }, [
    el('p', { class: 'muted small', text: 'Ce que la table a répondu' }),
    ...lignes.map((ligne) => el('div', {
      class: `dit${ligne.id === moi.id ? ' est-moi' : ''}`
        + (ligne.correct ? ' est-juste' : ligne.partiel ? ' est-partiel' : ''),
    }, [
      el('span', { class: 'dit-nom', text: ligne.nom }),
      el('span', {
        class: 'dit-texte',
        text: ligne.absent ? 'n’a rien répondu' : (ligne.texte || '—'),
      }),
      el('span', { class: 'dit-marque', text: ligne.marque }),
    ])),
  ]);
}

/** La pastille au bout d'une ligne : juste, faux, ou le compte des positions. */
function marqueDuDit(r, type) {
  if (r.absent) return '';
  const sur = type.id === 'rafale' ? etat.question.affirmations?.length
    : type.id === 'ordre' ? etat.question.elements?.length
      : null;
  if (sur && r.justes != null) return `${r.justes}/${sur}`;
  if (type.id === 'estimation') return r.correct ? '✔' : '';
  return r.correct ? '✔' : '✘';
}

/* --- Le compte ------------------------------------------------------------ */

/**
 * La partie qui vient de finir, envoyée au compte.
 *
 * Chacun déclare la sienne, avec sa place et ses points. Deux comptes qui
 * déclarent le même code de salon le même jour ont joué ensemble : c'est de là,
 * et de nulle part ailleurs, que sort le classement entre amis.
 *
 * Silencieux par construction : sans compte il n'y a rien à envoyer, et si le
 * réseau tombe au moment du podium, on ne va pas gâcher la fin d'une soirée
 * avec un message d'erreur pour une statistique.
 */
async function declarerMaPartie() {
  const cle = `${salon?.code ?? 'solo'}#${etat.total}`;
  if (!comptes.connecte() || partieDeclaree === cle || !monJournal.length) return;
  partieDeclaree = cle;

  const classement = etat.classement ?? [];
  const themes = {};
  for (const manche of monJournal) {
    const t = themes[manche.theme] ?? (themes[manche.theme] = { manches: 0, bonnes: 0, points: 0 });
    t.manches += 1;
    t.bonnes += manche.correct ? 1 : 0;
    t.points += Math.max(0, manche.points);
  }

  try {
    await comptes.declarerLaPartie({
      code: estSolo() ? '' : (salon?.code ?? ''),
      points: classement.find((j) => j.id === moi.id)?.score ?? 0,
      place: classement.findIndex((j) => j.id === moi.id) + 1,
      joueurs: classement.length,
      manches: monJournal.length,
      bonnes: monJournal.filter((m) => m.correct).length,
      themes,
    });
    // L'historique aussi : les questions vues ici ne doivent pas ressortir sur
    // l'autre appareil demain.
    const fusion = await comptes.synchroniserLesVues(historique.vues());
    historique.adopter(fusion);
  } catch { /* une statistique ne vaut pas un message d'erreur en pleine fête */ }
}

/** L'écran du compte : connexion d'un côté, tout ce qu'il porte de l'autre. */
async function rendreCompte() {
  const connecte = comptes.connecte();
  $('#compte-connexion').hidden = connecte;
  $('#compte-profil').hidden = !connecte;

  // Apple et Google ne s'affichent que là où ils existent vraiment : un bouton
  // qui ne fait rien vaut moins que pas de bouton du tout.
  const tiers = clear($('#compte-tiers'));
  for (const [pont, nom, ouvrir] of [
    [comptes.pontApple(), ' Se connecter avec Apple', comptes.ouvrirParApple],
    [comptes.pontGoogle(), 'Se connecter avec Google', comptes.ouvrirParGoogle],
  ]) {
    if (!pont) continue;
    tiers.append(el('button', {
      class: 'btn btn-block',
      type: 'button',
      onclick: async () => {
        try {
          await ouvrir();
          await apresConnexion();
        } catch (e) {
          if (!/annul/i.test(e?.message ?? '')) toast(e.message ?? 'Connexion refusée.', 'warn');
        }
      },
    }, nom));
  }

  if (!connecte) return;

  const vue = await comptes.rafraichir().catch(() => null);
  if (!vue) return;

  const identite = clear($('#compte-identite'));
  identite.append(el('p', {}, [
    el('strong', { text: vue.compte.nom }),
    el('span', { class: 'muted', text: vue.compte.email ? ` — ${vue.compte.email}` : '' }),
  ]));

  const stats = vue.stats ?? {};
  const grille = clear($('#compte-stats'));
  const taux = stats.manches ? Math.round((stats.bonnes / stats.manches) * 100) : 0;
  for (const [valeur, libelle] of [
    [stats.parties ?? 0, 'parties'],
    [stats.victoires ?? 0, 'victoires'],
    [`${taux} %`, 'de bonnes réponses'],
    [stats.points ?? 0, 'points cumulés'],
  ]) {
    grille.append(el('div', { class: 'stat' }, [
      el('span', { class: 'stat-valeur', text: String(valeur) }),
      el('span', { class: 'stat-libelle', text: libelle }),
    ]));
  }

  // Les thèmes, du plus joué au moins joué : c'est le portrait du joueur.
  const parTheme = clear($('#compte-themes'));
  const themes = Object.entries(stats.themes ?? {})
    .sort((a, b) => b[1].manches - a[1].manches)
    .slice(0, 8);
  for (const [id, t] of themes) {
    const part = t.manches ? Math.round((t.bonnes / t.manches) * 100) : 0;
    parTheme.append(el('div', { class: 'rang' }, [
      el('span', { class: 'rang-place', text: THEMES.find((x) => x.id === id)?.emoji ?? '•' }),
      el('span', { class: 'rang-nom', text: nomDuTheme(id) }),
      el('span', { class: 'rang-score', text: `${part} %` }),
    ]));
  }
  if (!themes.length) {
    parTheme.append(el('p', { class: 'muted small', text: 'Joue une partie, et ce portrait se remplira.' }));
  }

  const amis = clear($('#compte-amis'));
  const listeAmis = await comptes.amis().catch(() => []);
  for (const [rang, ami] of listeAmis.entries()) {
    amis.append(el('div', { class: 'rang' }, [
      el('span', { class: 'rang-place', text: String(rang + 1) }),
      el('span', { class: 'rang-nom', text: ami.nom }),
      el('span', {
        class: 'rang-score',
        text: `${ami.victoires} / ${ami.parties}`,
      }),
    ]));
  }
  if (!listeAmis.length) {
    amis.append(el('p', {
      class: 'muted small',
      text: 'Personne pour l’instant : il faut qu’au moins un autre joueur de la table ait un compte.',
    }));
  }

  const parties = clear($('#compte-parties'));
  for (const partie of (vue.parties ?? []).slice(0, 10)) {
    const quand = new Date(partie.quand).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    parties.append(el('div', { class: 'rang' }, [
      el('span', { class: 'rang-place', text: partie.place === 1 ? '🥇' : String(partie.place || '—') }),
      el('span', { class: 'rang-nom', text: `${quand} — ${partie.bonnes}/${partie.manches} bonnes` }),
      el('span', { class: 'rang-score', text: `${partie.points} pts` }),
    ]));
  }
  if (!(vue.parties ?? []).length) {
    parties.append(el('p', { class: 'muted small', text: 'Aucune partie déclarée depuis cet appareil.' }));
  }
}

/**
 * Ce qui suit une connexion réussie.
 *
 * L'historique local rejoint celui du compte, dans les deux sens : ce téléphone
 * apporte ce qu'il a vu, et repart avec ce que les autres appareils ont vu.
 */
async function apresConnexion() {
  // Le prénom du pupitre devient celui du compte, tant que personne n'en a
  // choisi un autre : sans ça, le classement entre amis affiche des moitiés
  // d'adresses électroniques, et « ana » n'est pas un prénom, c'est un début
  // de courriel.
  const profil = comptes.monProfil();
  const auto = profil?.email ? profil.email.split('@')[0] : '';
  if (moi.name && profil?.nom === auto && moi.name !== profil.nom) {
    await comptes.renommer(moi.name).catch(() => { /* le nom restera celui-là */ });
  }

  try {
    const fusion = await comptes.synchroniserLesVues(historique.vues());
    historique.adopter(fusion);
  } catch { /* la synchro retentera à la fin de la prochaine partie */ }

  // Les packs du compte, y compris ceux achetés depuis un autre appareil :
  // c'est la promesse même du compte, elle doit tenir tout de suite.
  try {
    await packs.synchroniser(voix.banqueCourante);
    ajouterQuestions(packs.questionsInstallees());
    declarerLesClipsDesPacks(packs.clipsInstalles(voix.banqueCourante));
  } catch { /* les packs se retéléchargeront depuis les réglages */ }

  $('#compte-verif').hidden = true;
  $('#compte-code').value = '';
  await rendreCompte();
  majAccueilCompte();
  toast('Te voilà connecté.');
}

/** La ligne de l'accueil, qui dit d'un coup d'œil si un compte est ouvert. */
function majAccueilCompte() {
  const profil = comptes.monProfil();
  $('#btn-compte').textContent = comptes.connecte()
    ? `Mon compte${profil?.nom ? ` — ${profil.nom}` : ''}`
    : 'Créer un compte ou se connecter';
}

/* --- Le fil rouge --------------------------------------------------------- */

/**
 * La course parallèle : un mot que les bonnes réponses de plusieurs manches ont
 * en commun. On peut tenter sa chance à tout moment, y compris pendant une
 * révélation — c'est justement là qu'on a le temps de réfléchir.
 */
function rendreFilRouge() {
  const zone = $('#fil-rouge');
  const fil = etat.fil;
  zone.hidden = !fil || etat.manche < 2;
  if (zone.hidden) return;

  // Ne reconstruire que sur une vraie nouvelle.
  //
  // La zone se redessinait à chaque battement du relais, soit plusieurs fois par
  // manche : le `<details>` repartait fermé et le champ vidé, et il devenait
  // impossible de taper un mot avant qu'il ne disparaisse.
  //
  // Le changement de manche ne fait délibérément pas partie de la signature. Le
  // fil rouge se cherche en travers de la partie, sur plusieurs manches — la
  // boîte doit survivre au rythme du jeu, pas se refermer à chaque tour.
  const bloqueJusqu = fil.bloques?.[moi.id] ?? 0;
  const bloque = bloqueJusqu > etat.manche;
  const trouves = fil.trouves ?? [];
  const monTrouve = trouves.find((t) => t.id === moi.id);
  const signature = [
    `trouves:${trouves.length}`,
    monTrouve ? 'moi' : '',
    bloque ? `bloque:${bloqueJusqu - etat.manche}` : '',
    filEnvoye ? 'envoye' : '',
  ].join('|');
  if (signature === filRendu) return;
  filRendu = signature;

  clear(zone);

  // Celui qui a trouvé n'a plus rien à chercher — et connaît déjà le mot, donc
  // rien à lui cacher. On ne l'écrit pas pour autant : son écran se lit à trois
  // par-dessus l'épaule.
  if (monTrouve) {
    zone.append(el('p', { class: 'fil-trouve' }, [
      el('strong', { text: '🧵 Tu as trouvé le fil rouge' }),
      el('span', { text: ` — +${monTrouve.prime} pts, manche ${monTrouve.manche}.` }),
    ]));
    if (trouves.length > 1) {
      zone.append(el('p', {
        class: 'muted small',
        text: `${trouves.length - 1} autre${trouves.length > 2 ? 's' : ''} l’${trouves.length > 2 ? 'ont' : 'a'} trouvé aussi.`,
      }));
    }
    return;
  }

  if (bloque) {
    const reste = bloqueJusqu - etat.manche;
    zone.append(el('p', {
      class: 'muted small',
      text: `🧵 Raté. Encore ${reste} manche${reste > 1 ? 's' : ''} avant de retenter le fil rouge.`,
    }));
    return;
  }

  if (filEnvoye) {
    zone.append(el('p', { class: 'muted small', text: '🧵 Proposition envoyée…' }));
    return;
  }

  const champ = el('input', {
    class: 'fil-champ',
    type: 'text',
    autocomplete: 'off',
    placeholder: 'Le fil rouge, c’est…',
    enterkeyhint: 'send',
    'aria-label': 'Ta proposition pour le fil rouge',
  });
  const envoyer = () => {
    const propose = champ.value.trim();
    if (propose) tenterLeFil(propose);
  };
  champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') envoyer(); });

  // La règle du jeu, et pas seulement l'indice.
  //
  // Seul celui qui crée la partie lit les réglages : les autres voyaient
  // apparaître cette boîte à la manche 2 sans savoir ce qu'était un fil rouge,
  // ni qu'ils avaient le droit de tenter à tout moment. On l'explique donc là où
  // la question se pose, sur l'écran de chacun.
  const ouvrir = el('details', { class: 'fil-boite' }, [
    el('summary', { text: '🧵 Je crois avoir le fil rouge' }),
    el('p', {
      class: 'muted small',
      text: 'Un même mot se cache dans les bonnes réponses de plusieurs manches. '
        + 'Chacun peut le trouver et toucher la prime — mais elle fond de manche en manche, '
        + 'alors mieux vaut être tôt que sûr.',
    }),
    el('p', { class: 'fil-indice', text: `Indice : ${fil.indice}` }),
    ...(trouves.length ? [el('p', {
      class: 'muted small',
      text: `${trouves.map((t) => t.nom).join(', ')} `
        + `${trouves.length > 1 ? 'l’ont' : 'l’a'} déjà trouvé — la prime est plus petite, mais elle est là.`,
    })] : []),
    el('div', { class: 'fil-ligne' }, [
      champ,
      el('button', { class: 'btn btn-primary', type: 'button', onclick: envoyer }, 'Proposer'),
    ]),
    el('p', {
      class: 'muted small',
      text: 'Tu peux tenter quand tu veux, même pendant une question — prends ton temps, '
        + 'ce que tu écris ici ne s’efface pas. Mais une erreur coûte deux manches de silence.',
    }),
  ]);
  zone.append(ouvrir);
}

async function tenterLeFil(propose) {
  filEnvoye = true;
  rendreFilRouge();
  try {
    await envoyerReponse({ playerId: moi.id, round: 0, reponse: null, fil: propose });
  } catch {
    toast('Proposition non transmise.', 'warn');
    filEnvoye = false;
    rendreFilRouge();
  }
}

function rendreClassement() {
  const bloc = el('div', { class: 'classement' });
  (etat.classement ?? []).forEach((joueur, rang) => {
    bloc.append(el('div', { class: `rang${joueur.id === moi.id ? ' est-moi' : ''}` }, [
      el('span', { class: 'rang-place', text: `${rang + 1}` }),
      el('span', { class: 'rang-nom', text: joueur.name }),
      el('span', { class: 'rang-score', text: String(joueur.score) }),
    ]));
  });
  return bloc;
}

/**
 * Le compte à rebours avant la question, puis la jauge de temps restant.
 *
 * L'énoncé est déjà sur l'appareil pendant le décompte — il le faut, sinon un
 * pupitre dont le sondage tombe mal découvrirait la question une demi-seconde
 * après les autres — mais il reste masqué jusqu'au top. Sans ça, la manche ne
 * récompenserait plus la compréhension mais le doigt le plus nerveux.
 */
function rafraichirChrono() {
  const jauge = $('#chrono-jauge');
  const cadre = $('#jeu-chrono');
  const enManche = etat?.phase === 'manche';

  // Le vote est chronométré lui aussi : sans jauge, on ne sait pas qu'il faut
  // se décider, et la phase se ferme sur des gens qui lisaient encore.
  if (etat?.phase === 'vote') {
    cadre.hidden = false;
    const reste = Math.max(0, etat.finPhase - net.serverNow());
    delete cadre.dataset.compte;
    jauge.style.width = `${(reste / 12000) * 100}%`;
    jauge.classList.toggle('est-urgent', reste < 4000);
    return;
  }
  cadre.hidden = !enManche;

  if (!enManche) {
    $('#jeu-question').hidden = false;
    $('#jeu-reponses').hidden = false;
    $('#jeu-annonce').hidden = false;
    $('#jeu-etat').hidden = false;
    return;
  }

  const maintenant = net.serverNow();
  const avantDepart = maintenant < etat.startAt;
  // Trois temps, et non deux : la fenêtre des jokers, puis l'énoncé seul le
  // temps qu'il soit lu, puis les réponses. Les faire apparaître avec la
  // question revenait à lire la première case avant d'avoir entendu la fin de
  // la phrase — et la voix de l'animateur ne servait plus à rien.
  const enLecture = !avantDepart && maintenant < etat.reponsesAt;
  $('#jeu-question').hidden = avantDepart;
  $('#jeu-reponses').hidden = avantDepart || enLecture;
  // Pendant qu'on répond, la phrase de l'animateur ne fait que repousser la
  // question vers le bas de l'écran : elle a déjà été dite, et lue, au décompte.
  $('#jeu-annonce').hidden = !avantDepart;
  // « 0 sur 4 ont répondu » n'a aucun sens avant que la question existe.
  $('#jeu-etat').hidden = avantDepart;
  $('#titre-jokers').textContent = avantDepart ? 'Un joker, avant de voir la question ?' : 'Jokers';

  if (avantDepart) {
    cadre.dataset.compte = String(Math.max(1, Math.ceil((etat.startAt - maintenant) / 1000)));
    jauge.style.width = '100%';
    jauge.classList.remove('est-urgent');
    return;
  }

  // Pendant la lecture, la jauge reste pleine : le chrono n'a pas commencé, et
  // la voir descendre pendant qu'on écoute donnerait l'impression de perdre du
  // temps qu'on n'a pas encore.
  if (enLecture) {
    delete cadre.dataset.compte;
    jauge.style.width = '100%';
    jauge.classList.remove('est-urgent');
    return;
  }

  delete cadre.dataset.compte;
  const restant = Math.max(0, etat.deadline - maintenant);
  jauge.style.width = `${(restant / etat.dureeMs) * 100}%`;
  jauge.classList.toggle('est-urgent', restant < etat.dureeMs * 0.25);
}

function rendreFin() {
  // `annonceDite` est vide au podium, donc c'est bien la phrase qui nomme le
  // gagnant qui s'affiche — celle à laquelle le clip renvoie.
  $('#fin-annonce').textContent = annonceAffichee();
  const hote = clear($('#fin-podium'));
  (etat.podium ?? etat.classement ?? []).forEach((joueur, rang) => {
    hote.append(el('div', { class: `podium-ligne${joueur.id === moi.id ? ' est-moi' : ''}` }, [
      el('span', { class: 'podium-medaille', text: ['🥇', '🥈', '🥉'][rang] ?? `${rang + 1}` }),
      el('span', { class: 'podium-nom', text: joueur.name }),
      el('span', { class: 'podium-score', text: `${joueur.score} pts` }),
    ]));
  });
  // Le fil rouge se dévoile ici, et nulle part ailleurs : c'est la fin de la
  // course. Sans cette ligne, une table qui n'a pas trouvé ne saurait jamais ce
  // qu'elle cherchait — et c'est justement le moment que tout le monde attend.
  const fil = etat.fil;
  if (fil?.revelation || fil?.solution) {
    const bloc = el('div', { class: 'fin-fil' }, [
      el('p', { class: 'fil-mot', text: `🧵 Le fil rouge : ${fil.solution ?? ''}` }),
      ...(fil.revelation ? [el('p', { class: 'muted', text: fil.revelation })] : []),
      el('p', {
        class: 'muted small',
        text: fil.trouves?.length
          ? `Trouvé par ${fil.trouves.map((t) => `${t.nom} (+${t.prime})`).join(', ')}.`
          : 'Personne ne l’a démasqué.',
      }),
    ]);
    hote.append(bloc);
  }

  $('#btn-rejouer').hidden = !estRegie();
}

/* --- Voix ---------------------------------------------------------------- */

function majBoutonSon() {
  const bouton = $('#btn-son');
  if (!bouton) return;
  bouton.textContent = voix.active ? '🔊' : '🔇';
  bouton.setAttribute(
    'aria-label',
    voix.active ? 'Couper la voix de l’animateur' : 'Rétablir la voix de l’animateur',
  );
}

/**
 * Le choix du timbre. Le navigateur ne propose que les voix installées sur le
 * système, et la française retenue par défaut est rarement la meilleure qu'il
 * ait : sur macOS, les voix « améliorées » se téléchargent dans les réglages
 * d'accessibilité et apparaissent ensuite ici. D'où ce sélecteur plutôt qu'un
 * réglage caché — c'est la différence entre un animateur et un GPS de 2008.
 */
function rendreChoixVoix() {
  const hote = $('#choix-voix');
  if (!hote) return;
  const timbres = voix.timbresDisponibles;

  clear(hote);

  // Quand les clips sont là, la voix système ne sert plus à rien : tout le
  // monde entend la même, et le sélecteur ne ferait que semer le doute.
  if (voix.clipsDisponibles) {
    const banques = voix.banques;

    // Une seule voix installée : un sélecteur à une entrée ne propose rien, il
    // fait seulement croire qu'il manque quelque chose.
    if (banques.length < 2) {
      hote.append(el('p', {
        class: 'voix-etat',
        text: `Voix enregistrée${voix.nomDeLaVoix ? ` — ${voix.nomDeLaVoix}` : ''}. Identique sur tous les appareils.`,
      }));
      return;
    }

    hote.append(el('p', {
      class: 'voix-etat',
      text: 'Voix enregistrée. Le choix reste sur cet appareil.',
    }));
    hote.append(el('select', {
      id: 'banque-voix',
      'aria-label': 'La voix de l’animateur',
      onchange: async (event) => {
        // On attend la nouvelle banque avant de parler : sinon la phrase d'essai
        // partirait avec l'ancienne, et donnerait exactement le contraire de ce
        // que le sélecteur vient de promettre.
        await voix.choisirBanque(event.target.value);
        rendreChoixVoix();
        voix.essayer();
      },
    }, banques.map((b) => el('option', {
      value: b.id, selected: b.courante, text: b.nom,
    }))));
    return;
  }

  hote.append(el('p', {
    class: 'muted small',
    // La raison, et pas seulement le constat. Sur un téléphone il n'y a pas de
    // console : si la voix enregistrée ne sort pas, cette ligne est le seul
    // endroit où l'on peut lire pourquoi.
    text: voix.etatDesClips
      ?? 'Aucun enregistrement installé : l’animateur passe par la voix de synthèse de cet appareil.',
  }));

  if (!voix.disponible || !timbres.length) {
    hote.append(el('p', { class: 'muted small', text: 'Aucune voix française installée sur cet appareil.' }));
    return;
  }

  const selecteur = el('select', {
    id: 'timbre',
    onchange: (event) => {
      voix.timbre = event.target.value;
      voix.dire('Bonsoir. C’est moi qui animerai cette soirée.', { force: true });
    },
  }, [
    el('option', { value: '', text: 'Voix par défaut du système' }),
    ...timbres.map((v) => el('option', {
      value: v.voiceURI,
      selected: v.voiceURI === voix.timbre,
      text: `${v.name}${v.localService ? '' : ' (en ligne)'}`,
    })),
  ]);

  hote.append(selecteur);
  hote.append(el('button', {
    class: 'btn btn-ghost',
    type: 'button',
    onclick: () => voix.dire('Bonsoir. C’est moi qui animerai cette soirée.', { force: true }),
  }, '🔊 Écouter'));
}

/* --- Actions du joueur --------------------------------------------------- */

/**
 * Les deux mauvaises réponses que le 50/50 retire.
 *
 * Calculé sur le pupitre : la banque est embarquée dans l'appli, donc l'énoncé
 * publié suffit à retrouver la bonne réponse par son identifiant. Le tirage
 * publié a mélangé l'ordre, d'où le passage par le *texte* plutôt que l'index.
 */
function calculerMasque() {
  const publiee = etat?.question;
  // Il n'y a de mauvaises réponses à retirer que sur un QCM.
  if (publiee?.type !== 'qcm') return null;
  const source = toutesLesQuestions().find((q) => q.id === publiee.id);
  if (!source?.reponses) return null;

  const bonne = publiee.reponses.indexOf(source.reponses[source.bonne]);
  if (bonne < 0) return null;

  const fausses = publiee.reponses.map((_, i) => i).filter((i) => i !== bonne);
  for (let i = fausses.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [fausses[i], fausses[j]] = [fausses[j], fausses[i]];
  }
  return { manche: etat.manche, caches: fausses.slice(0, 2) };
}

function armerJoker(id) {
  sons.debloquer();

  // Une fois la moitié des réponses dévoilée, le choix est irréversible : sans
  // ça, on regarde le 50/50, on le désarme, et on répond au plein tarif.
  if (jokerArme === 'cinquante') return;

  if (id === 'cinquante') {
    const calcule = calculerMasque();
    if (!calcule) {
      toast('50/50 indisponible sur cette question.', 'warn');
      return;
    }
    masque = calcule;
    jokerArme = 'cinquante';
  } else {
    jokerArme = jokerArme === id ? null : id;
    // Changer de joker remet la cible à zéro : garder celle d'avant ferait
    // saboter quelqu'un qu'on avait désigné pour un vol, sans le redire.
    cibleVisee = null;
  }

  if (jokerArme) sons.joker();
  rendreJokers();
  peindreReponses();
}

/**
 * Envoie une réponse, quelle que soit sa forme : un index pour un QCM, un
 * nombre pour une estimation, une liste pour un classement ou une rafale. La
 * régie validera — ici on se contente de l'écho local.
 */
async function repondre(valeur) {
  if (!etat || etat.phase !== 'manche') return;
  const maintenant = net.serverNow();
  if (maintenant < etat.reponsesAt || maintenant > etat.deadline) return;

  // Tant que le chrono tourne, on a le droit de changer d'avis : la nouvelle
  // réponse remplace l'ancienne, des deux côtés. Ce qu'on perd en changeant,
  // c'est le temps — la régie retient le dernier geste, pas le premier.
  const precedent = monChoix;

  // Écho local immédiat : le tap doit se voir tout de suite, sans attendre que
  // le relais confirme. La régie reste seule juge du score.
  monChoix = { manche: etat.manche, valeur, joker: jokerArme, cible: cibleVisee };
  sons.bip();
  peindreReponses();
  rendreJokers();
  rendreEtatManche();

  try {
    await envoyerReponse({
      playerId: moi.id,
      round: etat.manche,
      reponse: valeur,
      joker: jokerArme,
      cible: cibleVisee,
      elapsedMs: Math.max(0, maintenant - etat.reponsesAt),
    });
  } catch {
    toast('Réponse non transmise — le relais n’a pas répondu.', 'warn');
    // On revient à ce qui était affiché avant le tap, pas à rien : effacer une
    // réponse déjà transmise ferait croire qu'on n'a rien joué.
    monChoix = precedent;
    peindreReponses();
    rendreEtatManche();
  }
}

/* --- Création et arrivée dans un salon ----------------------------------- */

function lireMonPrenom() {
  const prenom = $('#mon-prenom').value.trim();
  if (!prenom) {
    toast('Il faut un prénom pour prendre un pupitre.', 'warn');
    $('#mon-prenom').focus();
    return null;
  }
  moi.name = prenom;
  enregistrerMoi();
  return prenom;
}

function rendreReglages() {
  const themes = clear($('#choix-themes'));
  for (const theme of THEMES) {
    const actif = reglages.themes.includes(theme.id);
    // Le pourcentage déjà vu, sur la pastille du thème.
    //
    // C'est l'information qui manquait pour choisir : « Bouffe » à 90 % annonce
    // une partie de retrouvailles, « Histoire » à 5 % annonce du neuf. On
    // n'empêche ni l'un ni l'autre — on le dit, et la table tranche.
    const part = historique.bilan(theme.id);
    themes.append(el('button', {
      class: `chip${actif ? ' est-actif' : ''}`,
      type: 'button',
      title: `${part.vues} question${part.vues > 1 ? 's' : ''} sur ${part.total} déjà jouée${part.vues > 1 ? 's' : ''}`,
      onclick: () => {
        reglages.themes = actif
          ? reglages.themes.filter((t) => t !== theme.id)
          : [...reglages.themes, theme.id];
        rendreReglages();
      },
    }, [
      el('span', { text: `${theme.emoji} ${theme.nom}` }),
      part.pourcent > 0
        ? el('span', { class: 'chip-part', text: `${part.pourcent} %` })
        : null,
    ]));
  }

  const bilan = historique.bilan();
  $('#note-themes').textContent = bilan.vues
    ? `Déjà jouées : ${bilan.vues} questions sur ${bilan.total} (${bilan.pourcent} %). `
      + 'Le tirage sert d’abord celles que vous n’avez jamais eues.'
    : 'Le pourcentage sur chaque thème dira ce que vous avez déjà joué, au fil des parties.';
  $('#btn-oublier-vues').hidden = !bilan.vues;

  // Décocher un thème peut faire passer le pool sous le nombre demandé : on
  // rabote avant d'afficher les pastilles, sinon celle qui paraît active ne
  // correspond plus à ce qui sera joué.
  const dispo = tailleDuPool(reglages.themes, reglages.types, reglages.niveau);
  reglages.nombre = Math.min(reglages.nombre, dispo);

  const nombres = clear($('#choix-nombre'));
  for (const n of [8, 12, 16, 20]) {
    if (n > dispo && n !== 8) continue;
    nombres.append(el('button', {
      class: `chip${reglages.nombre === n ? ' est-actif' : ''}`,
      type: 'button',
      onclick: () => { reglages.nombre = n; rendreReglages(); },
    }, `${n} questions`));
  }
  $('#note-nombre').textContent = `${dispo} questions disponibles sur ces thèmes. `
    + 'Comptez une trentaine de secondes par manche.';

  const durees = clear($('#choix-duree'));
  for (const [ms, libelle] of [[10000, 'Nerveux — 10 s'], [15000, 'Normal — 15 s'], [22000, 'Tranquille — 22 s']]) {
    durees.append(el('button', {
      class: `chip${reglages.dureeMs === ms ? ' est-actif' : ''}`,
      type: 'button',
      onclick: () => { reglages.dureeMs = ms; rendreReglages(); },
    }, libelle));
  }

  rendrePacks();

  const types = clear($('#choix-types'));
  // Le choix de la difficulté, juste après celui des thèmes : c'est le réglage
  // qui décide si la soirée sera un plaisir ou une humiliation.
  const niveaux = clear($('#choix-niveau'));
  for (const option of NIVEAUX) {
    niveaux.append(el('button', {
      class: `chip${reglages.niveau === option.id ? ' est-actif' : ''}`,
      type: 'button',
      title: option.note,
      onclick: () => { reglages.niveau = option.id; rendreReglages(); },
    }, option.nom));
  }
  $('#note-niveau').textContent = NIVEAUX.find((n) => n.id === reglages.niveau)?.note ?? '';

  for (const type of typesDisponibles(reglages.themes)) {
    const actif = !reglages.types.length || reglages.types.includes(type.id);
    types.append(el('button', {
      class: `chip${actif ? ' est-actif' : ''}`,
      type: 'button',
      title: type.consigne,
      onclick: () => {
        const courant = reglages.types.length
          ? reglages.types
          : typesDisponibles(reglages.themes).map((t) => t.id);
        const suivant = actif ? courant.filter((t) => t !== type.id) : [...courant, type.id];
        // Tout décocher n'aurait aucun sens : on remet tout.
        reglages.types = suivant.length ? suivant : [];
        rendreReglages();
      },
    }, `${type.emoji} ${type.nom}`));
  }

  // Un bouton par fil trahirait le fil : celui qui crée la partie joue aussi.
  // On ne propose donc que l'énigme ou pas d'énigme — le fil lui-même est tiré
  // au sort à l'ouverture du salon, et personne ne sait lequel est tombé.
  const fils = clear($('#choix-fil'));
  for (const option of [{ actif: true, nom: 'Avec un fil rouge' }, { actif: false, nom: 'Sans fil rouge' }]) {
    fils.append(el('button', {
      class: `chip${reglages.avecFil === option.actif ? ' est-actif' : ''}`,
      type: 'button',
      onclick: () => { reglages.avecFil = option.actif; rendreReglages(); },
    }, option.nom));
  }
  $('#note-fil').textContent = reglages.avecFil
    ? `Un même mot relie les bonnes réponses de plusieurs manches. Le premier à le nommer rafle une grosse prime — et plus il trouve tôt, plus elle est grosse. Le fil apporte ses propres questions, en plus des thèmes et des types choisis. ${FILS_ROUGES.length} énigmes existent : celle de la partie est tirée au sort, y compris pour toi.`
    : 'Aucune énigme de fond : on enchaîne les manches, c’est tout.';

  const jokers = clear($('#choix-jokers'));
  for (const joker of JOKERS) {
    const actif = reglages.jokers.includes(joker.id);
    jokers.append(el('button', {
      class: `chip${actif ? ' est-actif' : ''}`,
      type: 'button',
      title: joker.desc,
      onclick: () => {
        reglages.jokers = actif
          ? reglages.jokers.filter((j) => j !== joker.id)
          : JOKERS.map((j) => j.id).filter((j) => j === joker.id || reglages.jokers.includes(j));
        rendreReglages();
      },
    }, `${joker.emoji} ${joker.nom}`));
  }
  $('#note-jokers').textContent = reglages.jokers.length
    ? 'Un usage chacun, à jouer avant de voir la question.'
    : 'Aucun joker : pas de filet, c’est le plus rapide qui gagne.';

  const personas = clear($('#choix-persona'));
  for (const persona of PERSONAS) {
    personas.append(el('button', {
      class: `carte-persona${reglages.persona === persona.id ? ' est-actif' : ''}`,
      type: 'button',
      onclick: () => { reglages.persona = persona.id; rendreReglages(); },
    }, [
      el('span', { class: 'persona-nom', text: persona.nom }),
      el('span', { class: 'persona-desc', text: persona.desc }),
    ]));
  }
}

/**
 * La boutique de packs, dans les réglages de la partie.
 *
 * Dans l'application native, elle encaisse par l'App Store — c'est la seule
 * voie qu'Apple autorise pour du contenu numérique. Sur le web, elle reste une
 * vitrine : l'achat s'y fait ailleurs, et ce qui est branché ici est ce qui
 * vient après — vérifier qu'une licence ouvre un pack, le télécharger, le
 * garder hors-ligne.
 */
async function rendrePacks() {
  const hote = $('#liste-packs');
  if (!hote) return;

  const disponibles = await packs.catalogue().catch(() => []);
  const offres = await packs.offresGroupees().catch(() => []);
  clear(hote);

  if (!disponibles.length) {
    $('#note-packs').textContent = 'Aucun pack disponible. Le jeu de base suffit largement pour commencer.';
    return;
  }

  // Les prix viennent de l'App Store quand il est là : ils arrivent dans la
  // devise du compte, et une étiquette « 3,99 € » montrée à un compte canadien
  // serait fausse.
  const produits = [...disponibles, ...offres].map((p) => p.produitApple).filter(Boolean);
  const prix = achats.disponible() ? await achats.prixDuStore(produits) : new Map();

  // L'offre groupée en premier : c'est l'offre d'entrée, et la voir après sept
  // cartes à 3,99 € revient à ne pas la proposer. Une offre déjà soldée
  // disparaît — elle n'a plus rien à vendre.
  for (const offre of offres.filter((o) => !o.possede && o.packs?.length)) {
    if (!achats.disponible() || !offre.produitApple) continue;

    hote.append(el('div', { class: 'carte-pack carte-offre' }, [
      el('div', { class: 'pack-tete' }, [
        el('span', { class: 'pack-nom', text: `${offre.emoji ?? '🎁'} ${offre.nom}` }),
        el('span', { class: 'pack-etat', text: prix.get(offre.produitApple) ?? offre.prix ?? '' }),
      ]),
      el('p', { class: 'pack-resume muted small', text: offre.resume ?? '' }),
      el('p', { class: 'muted small', text: `${offre.packs.length} packs, ${offre.nombre} questions` }),
      // Le seul point désagréable de l'offre, dit avant l'achat et non après :
      // Apple ne sait pas déduire un non-consommable déjà payé.
      offre.dejaPossedes
        ? el('p', {
            class: 'muted small',
            text: `Tu possèdes déjà ${offre.dejaPossedes} de ces packs. L’App Store ne sait pas les déduire :`
              + ' ils seraient repayés. Il peut être plus avantageux de prendre les autres à l’unité.',
          })
        : null,
      el('button', {
        class: 'btn btn-primary btn-block',
        type: 'button',
        onclick: async (event) => {
          event.target.disabled = true;
          try {
            await achats.acheter(offre.produitApple, packs.licence(), net.relayBase());
            toast(`${offre.nom} débloqué.`);
            await packs.synchroniser(voix.banqueCourante);
            ajouterQuestions(packs.questionsInstallees());
            declarerLesClipsDesPacks(packs.clipsInstalles(voix.banqueCourante));
            rendreReglages();
          } catch (erreur) {
            if (erreur?.name === 'AchatAbandonne') {
              if (erreur.enAttente) toast(erreur.message);
            } else {
              toast(erreur.message ?? 'Achat non abouti.', 'warn');
            }
            event.target.disabled = false;
          }
        },
      }, `Tout débloquer — ${prix.get(offre.produitApple) ?? offre.prix ?? ''}`),
    ]));
  }

  for (const pack of disponibles) {
    const etat = pack.installe ? 'Installé'
      : pack.possede ? 'À télécharger'
        : (prix.get(pack.produitApple) ?? pack.prix ?? 'Verrouillé');

    hote.append(el('div', { class: `carte-pack${pack.installe ? ' est-installe' : ''}` }, [
      el('div', { class: 'pack-tete' }, [
        el('span', { class: 'pack-nom', text: `${pack.emoji ?? '🎁'} ${pack.nom}` }),
        el('span', { class: `pack-etat${pack.possede ? ' est-acquis' : ''}`, text: etat }),
      ]),
      el('p', { class: 'pack-resume muted small', text: pack.resume ?? '' }),
      el('p', { class: 'muted small', text: `${pack.nombre} questions` }),
      // Acheter, quand la caisse est là et que le pack n'est pas déjà acquis.
      !pack.possede && achats.disponible() && pack.produitApple
        ? el('button', {
            class: 'btn btn-primary btn-block',
            type: 'button',
            onclick: async (event) => {
              event.target.disabled = true;
              try {
                await achats.acheter(pack.produitApple, packs.licence(), net.relayBase());
                toast(`${pack.nom} débloqué.`);
                await packs.synchroniser(voix.banqueCourante);
                ajouterQuestions(packs.questionsInstallees());
                declarerLesClipsDesPacks(packs.clipsInstalles(voix.banqueCourante));
                rendreReglages();
              } catch (erreur) {
                // Renoncer n'est pas échouer : quelqu'un qui referme la feuille
                // de paiement n'a pas besoin d'un message d'erreur. L'attente
                // d'autorisation parentale, elle, mérite un mot.
                if (erreur?.name === 'AchatAbandonne') {
                  if (erreur.enAttente) toast(erreur.message);
                } else {
                  toast(erreur.message ?? 'Achat non abouti.', 'warn');
                }
                event.target.disabled = false;
              }
            },
          }, `Débloquer — ${prix.get(pack.produitApple) ?? pack.prix ?? ''}`)
        : null,
      pack.possede && !pack.installe
        ? el('button', {
            class: 'btn btn-primary btn-block',
            type: 'button',
            onclick: async (event) => {
              event.target.disabled = true;
              try {
                const installe = await packs.installer(pack.id, voix.banqueCourante);
                ajouterQuestions(installe.questions);
                declarerLesClipsDesPacks(packs.clipsInstalles(voix.banqueCourante));
                toast(`${installe.nom} installé.`);
                rendreReglages();
              } catch (erreur) {
                toast(erreur.message ?? 'Téléchargement impossible.', 'warn');
                event.target.disabled = false;
              }
            },
          }, '⬇ Télécharger')
        : null,
    ]));
  }

  const verrouilles = disponibles.filter((p) => !p.possede).length;
  $('#note-packs').textContent = verrouilles
    ? 'Les packs verrouillés s’achètent une fois et restent acquis. Le jeu de base, lui, ne s’épuise pas.'
    : 'Tous les packs sont débloqués sur cet appareil.';

  // « Restaurer mes achats » est obligatoire chez Apple, et ce n'est pas une
  // formalité : les packs sont attachés à une licence d'appareil, donc changer
  // de téléphone les perdrait. StoreKit, lui, sait ce que ce compte a acheté.
  if (achats.disponible()) {
    hote.append(el('button', {
      class: 'btn btn-ghost btn-block',
      type: 'button',
      onclick: async (event) => {
        event.target.disabled = true;
        try {
          const { accordes } = await achats.restaurer(packs.licence(), net.relayBase());
          await packs.synchroniser(voix.banqueCourante);
          ajouterQuestions(packs.questionsInstallees());
          declarerLesClipsDesPacks(packs.clipsInstalles(voix.banqueCourante));
          toast(accordes.length
            ? `${accordes.length} pack${accordes.length > 1 ? 's' : ''} restauré${accordes.length > 1 ? 's' : ''}.`
            : 'Aucun achat à restaurer sur ce compte.');
          rendreReglages();
        } catch (erreur) {
          toast(erreur.message ?? 'Restauration impossible.', 'warn');
          event.target.disabled = false;
        }
      },
    }, 'Restaurer mes achats'));
  }
}

/**
 * La régie de la partie qui commence.
 *
 * Identique en solo et à plusieurs : le moteur ne sait pas combien de pupitres
 * l'écoutent, et c'est ce qui rend le mode solo possible sans le dupliquer.
 */
function construireRegie(questions, fil) {
  return creerRegie({
      questions,
      dureeMs: reglages.dureeMs,
      persona: reglages.persona,
      themes: reglages.themes,
      jokers: reglages.jokers,
      fil,
      // Le moteur ne connaît pas les fichiers audio : c'est ici qu'on lui dit
      // combien de temps il faut pour lire la réponse et son explication, sans
      // quoi la phase se termine au milieu de la phrase.
      // Exactement ce que `parler()` va enchaîner, dans le même ordre : le
      // commentaire, la réplique de l'action marquante s'il y en a une, puis la
      // réponse et son explication. Un « + 6 secondes » forfaitaire ne suffisait
      // pas — il ignorait la réplique de joker, et coupait donc l'explication à
      // chaque manche où il se passait quelque chose.
      // Combien de temps l'énoncé prend à être lu : c'est ce qui retarde
      // l'ouverture des réponses. Zéro quand la banque manque — le moteur
      // retombe alors sur une estimation par la longueur du texte, parce que la
      // synthèse du navigateur parle elle aussi.
      dureeLecture: (question) => dureeDuClip(`question/${question.id}`),
      dureeRevelation: (question, resultat) => {
        const lu = dureeDuClip(`reponse/${question.id}`) + dureeDuClip(`note/${question.id}`);
        if (!lu) return 0;                       // pas de clips : le plancher suffit
        const commente = dureeDeLaReplique(reglages.persona, resultat?.commentaireCle);
        const marquant = dureeDeLaReplique(reglages.persona, resultat?.evenements?.[0]?.cle);
        // + le temps de lire son score et de souffler avant la manche suivante.
        return (lu + commente + marquant + RESPIRATION_S) * 1000;
      },
  });
}

/** Le tirage tombe à chaque nouvelle partie, y compris derrière « Une autre ! ». */
function tirerLaPartie() {
  const fil = reglages.avecFil
    ? FILS_ROUGES[Math.floor(Math.random() * FILS_ROUGES.length)] ?? null
    : null;
  const questions = tirerQuestions({
    themes: reglages.themes,
    types: reglages.types,
    nombre: reglages.nombre,
    niveau: reglages.niveau,
    fil: fil?.id ?? null,
    // Ce que cet appareil a déjà servi : les questions neuves passent devant.
    vues: historique.vues(),
  });
  // Le compteur avance ici, avant la première manche : c'est lui qui datera les
  // questions marquées au fil de la partie.
  historique.nouvellePartie();
  return { fil, questions };
}

async function ouvrirSalon() {
  const { fil, questions } = tirerLaPartie();
  if (!questions.length) {
    toast('Aucune question sur ces thèmes.', 'warn');
    return;
  }

  const bouton = $('#btn-ouvrir-salon');
  bouton.disabled = true;
  try {
    const { code, hostToken } = await net.createRoom();
    salon = { code, hostToken };
    regie = construireRegie(questions, fil);
    const arrivee = await net.joinRoom(code, moi);
    moi.id = arrivee.playerId;
    enregistrerMoi();
    voix.appliquerDefaut(true);           // la régie est la voix de la pièce
    majBoutonSon();
    joueurs = arrivee.players ?? [{ id: moi.id, name: moi.name }];
    aPublier = regie.etatPublic(joueurs);
    retenirLeSalon(code, true);
    location.hash = code;
    montrer('lobby');
    rendreLienPartage();
    rendreLobby();
    demarrerBoucle();
  } catch (erreur) {
    toast(erreur.message ?? 'Impossible d’ouvrir le salon.', 'warn');
  } finally {
    bouton.disabled = false;
  }
}

/**
 * Une partie pour soi seul, sans salon, sans code, sans réseau.
 *
 * Le moteur tourne déjà sur l'appareil qui reçoit la partie : jouer seul, c'est
 * le même moteur avec un seul pupitre et le relais remplacé par une file en
 * mémoire. Rien n'est simulé, rien n'est allégé — mêmes questions, mêmes
 * jokers, même animateur.
 *
 * Ce mode existe pour trois raisons qui pointent dans la même direction : on
 * n'a pas toujours quatre amis sous la main, une application qui exige un
 * second téléphone pour faire quoi que ce soit est invalidable, et un
 * examinateur d'App Store est seul avec un appareil.
 */
function jouerSeul() {
  const { fil, questions } = tirerLaPartie();
  if (!questions.length) {
    toast('Aucune question sur ces thèmes.', 'warn');
    return;
  }

  const bouton = $('#btn-solo');
  bouton.disabled = true;
  try {
    salon = { code: null, hostToken: null, solo: true };
    fileSolo = [];
    // Le prénom n'est pas demandé ici : seul, on sait qui on est, et une partie
    // qui démarre en un tap est le seul moyen de prouver que l'appli fait
    // quelque chose sans second téléphone.
    joueurs = [{ id: moi.id, name: moi.name || 'Toi' }];
    regie = construireRegie(questions, fil);
    voix.appliquerDefaut(true);           // seul, on est aussi la voix de la pièce
    majBoutonSon();
    // Personne à attendre : pas de lobby, la partie commence.
    regie.lancer(net.serverNow(), joueurs);
    appliquer(regie.etatPublic(joueurs));
    demarrerBoucle();
  } catch (erreur) {
    toast(erreur.message ?? 'Impossible de lancer la partie.', 'warn');
  } finally {
    bouton.disabled = false;
  }
}

async function rejoindreSalon() {
  if (!lireMonPrenom()) return;
  const code = $('#code-salon').value.trim().toUpperCase();
  if (code.length !== 4) {
    toast('Le code fait quatre caractères.', 'warn');
    return;
  }

  const bouton = $('#btn-rejoindre');
  bouton.disabled = true;
  try {
    const reponse = await net.joinRoom(code, moi);
    moi.id = reponse.playerId;
    enregistrerMoi();
    voix.appliquerDefaut(false);          // un pupitre se tait : la régie parle
    majBoutonSon();
    salon = { code, hostToken: null };
    joueurs = reponse.players ?? [];
    version = -1;
    retenirLeSalon(code, false);
    location.hash = code;
    montrer('lobby');
    rendreLienPartage();
    rendreLobby();
    demarrerBoucle();
  } catch (erreur) {
    toast(erreur.status === 404 ? 'Aucun salon avec ce code.' : (erreur.message ?? 'Impossible de rejoindre.'), 'warn');
  } finally {
    bouton.disabled = false;
  }
}

function rendreLienPartage() {
  const hote = clear($('#qr-lien'));
  const lien = `${location.origin}${location.pathname}#${salon.code}`;
  hote.append(el('p', { class: 'lien-texte', text: lien }));
  hote.append(el('button', {
    class: 'btn btn-ghost',
    type: 'button',
    onclick: async () => {
      // Trois niveaux, parce qu'en Wi-Fi domestique on est sur une adresse non
      // sécurisée : le partage natif et le presse-papiers y sont indisponibles.
      // Le dernier repli sélectionne le lien pour qu'il reste copiable à la main.
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Quiz entre amis', text: 'On joue ?', url: lien });
          return;
        }
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(lien);
          toast('Lien copié.');
          return;
        }
      } catch {
        return;                                   // partage refusé ou annulé
      }
      getSelection()?.selectAllChildren($('.lien-texte', hote));
      toast('Lien sélectionné : copie-le, ou dicte le code.');
    },
  }, '📤 Envoyer le lien'));

  // L'écran commun. Il existe, encore faut-il le savoir : personne ne devine
  // qu'une page `tv.html` attend quelque part. Le lien est donc ici, au moment
  // exact où l'on cherche comment installer la soirée — et il porte déjà le
  // code, pour qu'il n'y ait rien à taper sur une télé.
  const tv = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}tv.html#${salon.code}`;
  hote.append(el('p', { class: 'muted small centre' }, [
    el('span', { text: 'Une télé dans la pièce ? ' }),
    el('a', { class: 'lien-tv', href: tv, target: '_blank', rel: 'noopener', text: 'Ouvrir l’écran commun' }),
  ]));
}

async function quitter() {
  if (etat && etat.phase !== 'lobby' && etat.phase !== 'podium') {
    // Seul, on n'arrête la partie de personne : l'avertissement de la régie
    // n'aurait aucun sens.
    const sur = await confirmDialog(
      estRegie() && !estSolo()
        ? 'Tu tiens la régie : si tu quittes, la partie s’arrête pour tout le monde. Continuer ?'
        : 'Quitter la partie en cours ?',
      { okLabel: 'Quitter', danger: true },
    );
    if (!sur) return;
  }
  arreterBoucle();
  voix.taire();
  salon = null;
  fileSolo = [];
  regie = null;
  etat = null;
  joueurs = [];
  version = -1;
  cleRendue = '';
  saisieRendue = '';
  filRendu = '';
  derniereVoix = '';
  oublierLeSalon();
  location.hash = '';
  montrer('accueil');
}

/* --- Démarrage ----------------------------------------------------------- */

function brancher() {
  $('#mon-prenom').value = moi.name;

  $('#btn-code-cadeau')?.addEventListener('click', async (event) => {
    const champ = $('#code-cadeau');
    const code = champ.value.trim();
    if (!code) return;
    event.target.disabled = true;
    try {
      const { packs: ouverts } = await packs.utiliserUnCode(code);
      champ.value = '';
      toast(ouverts.length > 1 ? `${ouverts.length} packs débloqués.` : 'Pack débloqué.');
      // Débloquer ne télécharge pas : on enchaîne, sinon il faut redescendre
      // taper sur chaque bouton « Télécharger » un par un.
      await packs.synchroniser(voix.banqueCourante);
      ajouterQuestions(packs.questionsInstallees());
      declarerLesClipsDesPacks(packs.clipsInstalles(voix.banqueCourante));
      rendreReglages();
    } catch (erreur) {
      toast(erreur.message ?? 'Code refusé.', 'warn');
    } finally {
      event.target.disabled = false;
    }
  });

  $('#code-cadeau')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-code-cadeau').click();
  });

  // Repartir de zéro. On demande confirmation : l'historique est ce qui garde
  // les parties différentes les unes des autres, et il ne se reconstitue pas.
  $('#btn-oublier-vues')?.addEventListener('click', async () => {
    const sur = await confirmDialog(
      'Oublier toutes les questions déjà jouées ? Le tirage repartira comme au premier jour.',
      { okLabel: 'Oublier', danger: true },
    );
    if (!sur) return;
    historique.oublier();
    rendreReglages();
    toast('Historique effacé.');
  });

  // --- Le compte ---------------------------------------------------------
  $('#btn-compte').addEventListener('click', async () => {
    montrer('compte');
    await rendreCompte();
  });

  $('#btn-compte-code').addEventListener('click', async (event) => {
    const email = $('#compte-email').value.trim();
    if (!email) return toast('Il faut une adresse.', 'warn');
    event.target.disabled = true;
    try {
      await comptes.demanderUnCode(email);
      $('#compte-verif').hidden = false;
      $('#compte-code').focus();
      toast('Code envoyé. Regarde tes courriels.');
    } catch (e) {
      toast(e.message ?? 'Envoi impossible.', 'warn');
    } finally {
      event.target.disabled = false;
    }
  });

  $('#btn-compte-valider').addEventListener('click', async (event) => {
    const email = $('#compte-email').value.trim();
    const code = $('#compte-code').value.trim();
    if (code.length !== 6) return toast('Le code fait six chiffres.', 'warn');
    event.target.disabled = true;
    try {
      await comptes.ouvrirParCode(email, code);
      await apresConnexion();
    } catch (e) {
      toast(e.message ?? 'Connexion refusée.', 'warn');
    } finally {
      event.target.disabled = false;
    }
  });

  $('#compte-email').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-compte-code').click();
  });
  $('#compte-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-compte-valider').click();
  });

  $('#btn-compte-sortir').addEventListener('click', async () => {
    await comptes.seDeconnecter();
    // L'historique local reste : il a été joué sur CET appareil, et se
    // déconnecter n'est pas demander à oublier ses soirées.
    await rendreCompte();
    majAccueilCompte();
    toast('Déconnecté.');
  });

  $('#btn-compte-supprimer').addEventListener('click', async () => {
    const sur = await confirmDialog(
      'Supprimer ton compte efface ton historique, tes statistiques et le lien vers tes achats, définitivement. Les packs achetés restent restaurables depuis l’App Store. Continuer ?',
      { okLabel: 'Supprimer', danger: true },
    );
    if (!sur) return;
    try {
      await comptes.supprimerLeCompte();
      await rendreCompte();
      majAccueilCompte();
      toast('Compte supprimé.');
    } catch (e) {
      toast(e.message ?? 'Suppression impossible.', 'warn');
    }
  });

  $('#btn-creer').addEventListener('click', () => {
    sons.debloquer();
    if (!lireMonPrenom()) return;
    rendreReglages();
    montrer('reglages');
  });

  $('#btn-ouvrir-salon').addEventListener('click', ouvrirSalon);
  // Le premier tap de la partie : c'est lui qui débloque le son sur mobile.
  $('#btn-solo').addEventListener('click', () => { sons.debloquer(); jouerSeul(); });
  $('#btn-rejoindre').addEventListener('click', () => { sons.debloquer(); rejoindreSalon(); });
  $('#btn-back').addEventListener('click', quitter);

  $('#code-salon').addEventListener('input', (event) => {
    event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  });
  $('#code-salon').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') rejoindreSalon();
  });

  $('#btn-lancer').addEventListener('click', () => {
    if (!regie) return;
    sons.debloquer();
    if (regie.lancer(net.serverNow(), joueurs)) {
      aPublier = regie.etatPublic(joueurs);
      appliquer(aPublier);
    }
  });

  $('#btn-passer').addEventListener('click', () => {
    if (!regie) return;
    // Taire d'abord : sans ça, l'explication qu'on vient de couper à l'écran
    // continue de se dire par-dessus l'annonce de la manche suivante.
    voix.taire();
    regie.passer(net.serverNow());
    // Rien de plus : le battement suivant — 450 ms au pire — voit la phase
    // terminée et enchaîne par le chemin ordinaire. Forcer la main ici
    // dédoublerait la publication en cours.
  });

  $('#btn-rejouer').addEventListener('click', () => {
    const encoreSeul = estSolo();
    arreterBoucle();
    salon = null;
    regie = null;
    etat = null;
    version = -1;
    cleRendue = '';
    saisieRendue = '';
    filRendu = '';
    derniereVoix = '';
    // Une partie solo se rejoue d'un tap : repasser par les réglages et le
    // salon n'aurait aucun sens quand on est seul.
    if (encoreSeul) {
      jouerSeul();
      return;
    }
    rendreReglages();
    montrer('reglages');
  });

  const boutonSon = $('#btn-son');
  boutonSon.addEventListener('click', () => {
    voix.active = !voix.active;
    majBoutonSon();
    if (voix.active) voix.dire('Voix de l’animateur activée.');
  });
  boutonSon.hidden = !voix.disponible;
  majBoutonSon();
  rendreChoixVoix();
  // Les voix système arrivent souvent après le chargement de la page : sans ce
  // rappel, la liste resterait vide sur la plupart des navigateurs.
  window.speechSynthesis?.addEventListener?.('voiceschanged', rendreChoixVoix);
  // Les packs déjà téléchargés sont disponibles immédiatement, avant même que
  // le réseau réponde : c'est tout l'intérêt de les garder en local.
  ajouterQuestions(packs.questionsInstallees());

  // Le chargement de la banque D'ABORD, la synchronisation des packs ensuite.
  // L'ordre n'est pas cosmétique : c'est le chargement qui fixe la voix
  // courante, et un pack téléchargé avant elle arrivait sans clips — ses
  // questions étaient alors les seules de la soirée à passer à la synthèse.
  chargerLesClips().then(async () => {
    const banque = voix.banqueCourante;
    declarerLesClipsDesPacks(packs.clipsInstalles(banque));
    rendreChoixVoix();

    const nouveaux = await packs.synchroniser(banque).catch(() => 0);
    if (!nouveaux) return;
    ajouterQuestions(packs.questionsInstallees());
    declarerLesClipsDesPacks(packs.clipsInstalles(banque));
    toast(`${nouveaux} pack${nouveaux > 1 ? 's' : ''} téléchargé${nouveaux > 1 ? 's' : ''}.`);
  });

  // Absent du paquet natif, où le relais est nommé au build : dans une appli
  // publiée, ce champ n'est qu'un bouton pour tout casser. Le code doit donc
  // survivre à son absence, sinon le démarrage s'arrête ici — et c'est tout
  // l'écran qui reste mort, boutons compris.
  const champRelais = $('#relay-url');
  if (champRelais) {
    champRelais.value = net.relayBase();
    champRelais.addEventListener('change', () => {
      net.setRelayBase(champRelais.value.trim());
      toast('Relais enregistré.');
    });
  }

  // Le chrono ne doit pas dépendre du rythme des sondages : il s'anime tout seul.
  let jokersOuverts = null;
  let reponsesOuvertes = null;
  setInterval(() => {
    if (etat?.phase !== 'manche') return;
    rafraichirChrono();
    peindreReponses();
    // Le verrouillage des jokers tombe sur une heure, pas sur un état publié :
    // c'est ici qu'on le voit passer. Et c'est le même instant que le top, donc
    // celui où l'énoncé peut enfin être lu.
    // Une rafale à moitié cochée vaut mieux que rien : on l'envoie juste avant
    // que le chrono ne la rende caduque.
    if (!monChoix && vueManche?.envoyerPartiel && net.serverNow() > etat.deadline - 400) {
      vueManche.envoyerPartiel();
    }

    const ouverts = net.serverNow() < etat.startAt;
    if (ouverts !== jokersOuverts) {
      const etaitOuvert = jokersOuverts;
      jokersOuverts = ouverts;
      rendreJokers();
      if (etaitOuvert === true && !ouverts) {
        lireEnonce();
        // La ligne « écoutez » doit sortir avec l'énoncé, pas au battement
        // suivant : une demi-seconde d'écran vide se voit.
        rendreEtatManche();
      }
    }

    // L'ouverture des réponses tombe elle aussi sur une heure, pas sur un état
    // publié : c'est ici qu'on la voit passer, et la ligne « écoutez » doit
    // disparaître au même instant.
    const repondables = net.serverNow() >= etat.reponsesAt;
    if (repondables !== reponsesOuvertes) {
      reponsesOuvertes = repondables;
      rendreEtatManche();
    }
  }, 100);

  // Recharger la page de la régie tuerait la partie de tout le monde : la
  // question n'est pas de l'empêcher, mais de ne pas le faire par accident.
  window.addEventListener('beforeunload', (event) => {
    if (!estRegie() || !etat || etat.phase === 'lobby' || etat.phase === 'podium') return;
    event.preventDefault();
    event.returnValue = '';
  });

  // Un lien partagé porte le code dans son ancre : autant le pré-remplir.
  const code = location.hash.replace('#', '').toUpperCase();
  if (code.length === 4) $('#code-salon').value = code;
}

/**
 * Retrouver sa place après un rechargement.
 *
 * C'est l'incident le plus banal d'une soirée : un téléphone se verrouille, le
 * navigateur recharge la page pour récupérer de la mémoire, et le joueur se
 * retrouve à l'accueil pendant que la table continue sans lui. Son identifiant
 * a survécu, donc le relais lui rendra sa place et son score — encore
 * faut-il rejoindre, ce que personne ne pense à faire au milieu d'une manche.
 *
 * La régie fait exception. Son moteur vivait dans la page : rechargée, elle ne
 * peut plus faire avancer la partie, et la ramener dans un salon qu'elle ne
 * pilote plus donnerait un écran figé sans explication.
 */
async function reprendreLaPartie() {
  const memoire = salonRetenu();
  const dansLAdresse = location.hash.replace('#', '').toUpperCase();
  const code = /^[A-Z0-9]{4}$/.test(dansLAdresse) ? dansLAdresse : memoire?.code;
  if (!code) return;

  if (memoire?.code === code && memoire.regie) {
    oublierLeSalon();
    toast('Cette partie était pilotée depuis ce téléphone : elle ne peut pas reprendre.', 'warn');
    return;
  }
  if (!moi.name) return;              // sans prénom, on n'a jamais rejoint

  try {
    const reponse = await net.joinRoom(code, moi);
    moi.id = reponse.playerId;
    enregistrerMoi();
    voix.appliquerDefaut(false);
    majBoutonSon();
    salon = { code, hostToken: null };
    joueurs = reponse.players ?? [];
    version = -1;
    retenirLeSalon(code, false);
    montrer('lobby');
    rendreLienPartage();
    rendreLobby();
    demarrerBoucle();               // l'état reçu remettra le bon écran
  } catch (erreur) {
    // Salon fini ou expiré : on reste à l'accueil, le code déjà tapé dans la
    // case. Rien à dire — c'est le cas normal au lancement suivant.
    if (erreur?.status === 404) oublierLeSalon();
  }
}

try {
  brancher();
  montrer('accueil');
  majAccueilCompte();
  // Un compte déjà ouvert : on rapatrie ce que les autres appareils ont vu,
  // sans rien bloquer. Si le réseau manque, l'appli démarre pareil et la
  // synchro retentera à la fin de la prochaine partie.
  if (comptes.connecte()) {
    comptes.rafraichir()
      .then(() => { majAccueilCompte(); return comptes.synchroniserLesVues(historique.vues()); })
      .then((fusion) => historique.adopter(fusion))
      .catch(() => { /* on jouera avec l'historique local */ });
  }
  reprendreLaPartie();
} catch (erreur) {
  // Sans ce filet, une API manquante laisse une page qui s'affiche normalement
  // mais dont aucun bouton ne répond : on découvre la panne au premier tap,
  // devant tout le monde, sans la moindre indication de ce qui cloche.
  document.body.prepend(el('p', {
    class: 'panne',
    text: `L’appli n’a pas pu démarrer sur ce navigateur : ${erreur.message}`,
  }));
  throw erreur;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* hors-ligne non critique */ });
  });
}
