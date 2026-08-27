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
import { NIVEAU_MIN, NIVEAU_MAX, NIVEAU_DEFAUT } from './manches/ttmc.js';
import {
  THEMES, FILS_ROUGES, tirerQuestions, tailleDuPool, typesDisponibles, nomDuTheme,
  ajouterQuestions, toutesLesQuestions,
} from './questions.js';
import * as packs from './packs.js';
import {
  PERSONAS, voix, sons, paroleDe, annonceDeManche, clipsDAnnonce, chargerLesClips,
  dureeDuClip, dureeDeLaReplique,
} from './emcee.js';

const MOI_KEY = 'quizroom.moi';
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
  dureeMs: 15000,
  persona: 'classique',
  jokers: JOKERS.map((j) => j.id),
  avecFil: FILS_ROUGES.length > 0,
};

let monChoix = null;           // { manche, choix, joker } — écho local, avant l'aller-retour
let jokerArme = null;
let masque = null;             // { manche, caches } — les réponses retirées par le 50/50
let cleRendue = '';            // phase + manche : sert à ne reconstruire que le nécessaire
let derniereVoix = '';
let vueManche = null;          // la vue construite pour la manche en cours
let filEnvoye = false;         // une tentative de fil rouge part sans écho immédiat
let filRendu = '';             // ce que la boîte du fil rouge affiche déjà, pour ne pas la reconstruire sous les doigts
let monNiveau = null;          // { manche, niveau } — le pari du TTMC, écho local

const estRegie = () => Boolean(salon?.hostToken);

/* --- Navigation ---------------------------------------------------------- */

function montrer(nom) {
  for (const section of $$('[data-screen]')) section.hidden = section.dataset.screen !== nom;
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

async function garderEcranAllume(actif) {
  try {
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
    if (etat.phase === 'intro') voix.precharger(clipsDAnnonce(etat.persona));

    // Nouvelle manche : l'écho local d'une réponse précédente n'a plus cours.
    if (etat.phase === 'manche') {
      monChoix = null;
      jokerArme = null;
      masque = null;
      filEnvoye = false;
      monNiveau = null;
      // L'énoncé sera lu au top : on le met en cache pendant la fenêtre de
      // jokers, pour qu'il parte pile à l'heure et non après un aller-retour.
      if (etat.question?.id) {
        voix.precharger([`question/${etat.question.id}`, `reponse/${etat.question.id}`]);
      }
    }
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
  const clips = [];
  const repli = [];
  const qid = etat.question?.id;

  if (etat.phase === 'revelation' && etat.resultat) {
    const mot = paroleDe(etat.persona, etat.resultat.commentaireCle);
    if (mot) clips.push(mot.id);
    repli.push(etat.resultat.commentaire);

    const marquant = etat.resultat.evenements?.[0];
    if (marquant?.cle) {
      const dit = paroleDe(etat.persona, marquant.cle);
      if (dit) clips.push(dit.id);
      repli.push(marquant.texte);
    }
    if (qid) clips.push(`reponse/${qid}`, `note/${qid}`);
  } else if (etat.annonceCle) {
    // L'annonce de manche dit son numéro puis une formule : deux clips, et
    // c'est `annonceDeManche` qui sait lesquels. Les autres annonces (ouverture,
    // podium) n'en ont qu'un.
    clips.push(...annonceDeManche(etat.persona, etat.annonceCle, etat.manche));
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

function rendreJeu() {
  const cle = `${etat.phase}:${etat.manche}`;
  const question = etat.question;

  $('#jeu-manche').textContent = etat.finale
    ? 'Dernière manche — points doublés'
    : `Manche ${etat.manche} / ${etat.total}`;
  $('#jeu-theme').textContent = question ? nomDuTheme(question.theme) : '';
  $('#jeu-theme').hidden = !question;

  $('#jeu-consigne').textContent = question?.consigne ?? '';
  $('#jeu-consigne').hidden = !question || etat.phase === 'revelation';

  if (cle !== cleRendue) {
    cleRendue = cle;
    $('#jeu-annonce').textContent = etat.phase === 'revelation'
      ? (etat.resultat?.commentaire ?? '')
      : (etat.annonce ?? '');
    // Sur un TTMC, `texte` est l'annonce de la carte ; l'énoncé joué dépend du
    // niveau et vit dans la vue, qui est seule à savoir lequel a été choisi.
    $('#jeu-question').textContent = question?.type === 'ttmc' ? '' : (question?.texte ?? '');
    construireSaisie(question);
  }

  rendrePari();
  peindreReponses();
  rendreJokers();
  rendreEtatManche();
  rendreFilRouge();
  rafraichirChrono();
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
    await net.sendAnswer(salon.code, { playerId: moi.id, round: etat.manche, niveau });
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
    ouvert: etat.phase === 'manche' && net.serverNow() >= etat.startAt && !monChoix,
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
    for (const evenement of etat.resultat?.evenements ?? []) {
      hote.append(el('p', { class: 'evenement', text: evenement.texte }));
    }
    if (etat.resultat?.rapide) {
      hote.append(el('p', {
        class: 'muted small',
        text: `Réponse la plus rapide : ${etat.resultat.rapide.nom}, en ${etat.resultat.rapide.secondes} s.`,
      }));
    }
    hote.append(rendreClassement());
    return;
  }

  if (etat.phase === 'manche') {
    if (monChoix) {
      hote.append(el('p', { class: 'atteinte', text: 'Réponse enregistrée. On attend les autres…' }));
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
  const signature = [
    fil.trouve ? `trouve:${fil.trouve.playerId}` : '',
    bloque ? `bloque:${bloqueJusqu - etat.manche}` : '',
    filEnvoye ? 'envoye' : '',
  ].join('|');
  if (signature === filRendu) return;
  filRendu = signature;

  clear(zone);

  if (fil.trouve) {
    zone.append(el('p', { class: 'fil-trouve' }, [
      el('strong', { text: `🧵 ${fil.trouve.nom} a trouvé le fil rouge` }),
      el('span', { text: ` — ${fil.solution ?? ''} (+${fil.trouve.prime} pts, manche ${fil.trouve.manche})` }),
    ]));
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
        + 'Le premier à le nommer rafle une grosse prime — et plus tôt il trouve, plus elle est grosse.',
    }),
    el('p', { class: 'fil-indice', text: `Indice : ${fil.indice}` }),
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
    await net.sendAnswer(salon.code, { playerId: moi.id, round: 0, reponse: null, fil: propose });
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
  $('#jeu-question').hidden = avantDepart;
  $('#jeu-reponses').hidden = avantDepart;
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

  delete cadre.dataset.compte;
  const restant = Math.max(0, etat.deadline - maintenant);
  jauge.style.width = `${(restant / etat.dureeMs) * 100}%`;
  jauge.classList.toggle('est-urgent', restant < etat.dureeMs * 0.25);
}

function rendreFin() {
  $('#fin-annonce').textContent = etat.annonce ?? '';
  const hote = clear($('#fin-podium'));
  (etat.podium ?? etat.classement ?? []).forEach((joueur, rang) => {
    hote.append(el('div', { class: `podium-ligne${joueur.id === moi.id ? ' est-moi' : ''}` }, [
      el('span', { class: 'podium-medaille', text: ['🥇', '🥈', '🥉'][rang] ?? `${rang + 1}` }),
      el('span', { class: 'podium-nom', text: joueur.name }),
      el('span', { class: 'podium-score', text: `${joueur.score} pts` }),
    ]));
  });
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
    hote.append(el('p', {
      class: 'voix-etat',
      text: `Voix enregistrée${voix.nomDeLaVoix ? ` — ${voix.nomDeLaVoix}` : ''}. Identique sur tous les appareils.`,
    }));
    return;
  }

  hote.append(el('p', {
    class: 'muted small',
    text: 'Aucun enregistrement installé : l’animateur passe par la voix de synthèse de cet appareil.',
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
  if (!etat || etat.phase !== 'manche' || monChoix) return;
  const maintenant = net.serverNow();
  if (maintenant < etat.startAt || maintenant > etat.deadline) return;

  // Écho local immédiat : le tap doit se voir tout de suite, sans attendre que
  // le relais confirme. La régie reste seule juge du score.
  monChoix = { manche: etat.manche, valeur, joker: jokerArme };
  sons.bip();
  peindreReponses();
  rendreJokers();
  rendreEtatManche();

  try {
    await net.sendAnswer(salon.code, {
      playerId: moi.id,
      round: etat.manche,
      reponse: valeur,
      joker: jokerArme,
      elapsedMs: Math.max(0, maintenant - etat.startAt),
    });
  } catch {
    toast('Réponse non transmise — le relais n’a pas répondu.', 'warn');
    monChoix = null;
    peindreReponses();
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
    themes.append(el('button', {
      class: `chip${actif ? ' est-actif' : ''}`,
      type: 'button',
      onclick: () => {
        reglages.themes = actif
          ? reglages.themes.filter((t) => t !== theme.id)
          : [...reglages.themes, theme.id];
        rendreReglages();
      },
    }, `${theme.emoji} ${theme.nom}`));
  }

  // Décocher un thème peut faire passer le pool sous le nombre demandé : on
  // rabote avant d'afficher les pastilles, sinon celle qui paraît active ne
  // correspond plus à ce qui sera joué.
  const dispo = tailleDuPool(reglages.themes, reglages.types);
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
 * Elle ne prend pas de paiement : encaisser demande un prestataire, un compte
 * et des mentions légales, et rien de tout cela n'a sa place dans le dépôt. Ce
 * qui est branché ici, c'est ce qui vient après — vérifier qu'une licence
 * ouvre un pack, le télécharger, le garder hors-ligne.
 */
async function rendrePacks() {
  const hote = $('#liste-packs');
  if (!hote) return;

  const disponibles = await packs.catalogue().catch(() => []);
  clear(hote);

  if (!disponibles.length) {
    $('#note-packs').textContent = 'Aucun pack disponible. Le jeu de base suffit largement pour commencer.';
    return;
  }

  for (const pack of disponibles) {
    const etat = pack.installe ? 'Installé'
      : pack.possede ? 'À télécharger'
        : (pack.prix ?? 'Verrouillé');

    hote.append(el('div', { class: `carte-pack${pack.installe ? ' est-installe' : ''}` }, [
      el('div', { class: 'pack-tete' }, [
        el('span', { class: 'pack-nom', text: `${pack.emoji ?? '🎁'} ${pack.nom}` }),
        el('span', { class: `pack-etat${pack.possede ? ' est-acquis' : ''}`, text: etat }),
      ]),
      el('p', { class: 'pack-resume muted small', text: pack.resume ?? '' }),
      el('p', { class: 'muted small', text: `${pack.nombre} questions` }),
      pack.possede && !pack.installe
        ? el('button', {
            class: 'btn btn-primary btn-block',
            type: 'button',
            onclick: async (event) => {
              event.target.disabled = true;
              try {
                const installe = await packs.installer(pack.id);
                ajouterQuestions(installe.questions);
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
}

async function ouvrirSalon() {
  // Le tirage au sort tient ici, et nulle part ailleurs : il doit tomber à
  // chaque nouvelle partie, y compris derrière « Une autre ! ».
  const fil = reglages.avecFil
    ? FILS_ROUGES[Math.floor(Math.random() * FILS_ROUGES.length)] ?? null
    : null;
  const questions = tirerQuestions({
    themes: reglages.themes,
    types: reglages.types,
    nombre: reglages.nombre,
    fil: fil?.id ?? null,
  });
  if (!questions.length) {
    toast('Aucune question sur ces thèmes.', 'warn');
    return;
  }

  const bouton = $('#btn-ouvrir-salon');
  bouton.disabled = true;
  try {
    const { code, hostToken } = await net.createRoom();
    salon = { code, hostToken };
    regie = creerRegie({
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
      dureeRevelation: (question, resultat) => {
        const lu = dureeDuClip(`reponse/${question.id}`) + dureeDuClip(`note/${question.id}`);
        if (!lu) return 0;                       // pas de clips : le plancher suffit
        const commente = dureeDeLaReplique(reglages.persona, resultat?.commentaireCle);
        const marquant = dureeDeLaReplique(reglages.persona, resultat?.evenements?.[0]?.cle);
        // + le temps de lire son score et de souffler avant la manche suivante.
        return (lu + commente + marquant + RESPIRATION_S) * 1000;
      },
    });
    const arrivee = await net.joinRoom(code, moi);
    moi.id = arrivee.playerId;
    enregistrerMoi();
    voix.appliquerDefaut(true);           // la régie est la voix de la pièce
    majBoutonSon();
    joueurs = arrivee.players ?? [{ id: moi.id, name: moi.name }];
    aPublier = regie.etatPublic(joueurs);
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
}

async function quitter() {
  if (etat && etat.phase !== 'lobby' && etat.phase !== 'podium') {
    const sur = await confirmDialog(
      estRegie()
        ? 'Tu tiens la régie : si tu quittes, la partie s’arrête pour tout le monde. Continuer ?'
        : 'Quitter la partie en cours ?',
      { okLabel: 'Quitter', danger: true },
    );
    if (!sur) return;
  }
  arreterBoucle();
  voix.taire();
  salon = null;
  regie = null;
  etat = null;
  joueurs = [];
  version = -1;
  cleRendue = '';
  filRendu = '';
  derniereVoix = '';
  location.hash = '';
  montrer('accueil');
}

/* --- Démarrage ----------------------------------------------------------- */

function brancher() {
  $('#mon-prenom').value = moi.name;

  $('#btn-creer').addEventListener('click', () => {
    sons.debloquer();
    if (!lireMonPrenom()) return;
    rendreReglages();
    montrer('reglages');
  });

  $('#btn-ouvrir-salon').addEventListener('click', ouvrirSalon);
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

  $('#btn-rejouer').addEventListener('click', () => {
    arreterBoucle();
    salon = null;
    regie = null;
    etat = null;
    version = -1;
    cleRendue = '';
  filRendu = '';
    derniereVoix = '';
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
  chargerLesClips().then(rendreChoixVoix);

  // Les packs déjà téléchargés sont disponibles immédiatement, avant même que
  // le réseau réponde : c'est tout l'intérêt de les garder en local.
  ajouterQuestions(packs.questionsInstallees());
  packs.synchroniser().then((nouveaux) => {
    if (nouveaux) {
      ajouterQuestions(packs.questionsInstallees());
      toast(`${nouveaux} pack${nouveaux > 1 ? 's' : ''} téléchargé${nouveaux > 1 ? 's' : ''}.`);
    }
  });

  const champRelais = $('#relay-url');
  champRelais.value = net.relayBase();
  champRelais.addEventListener('change', () => {
    net.setRelayBase(champRelais.value.trim());
    toast('Relais enregistré.');
  });

  // Le chrono ne doit pas dépendre du rythme des sondages : il s'anime tout seul.
  let jokersOuverts = null;
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
      if (etaitOuvert === true && !ouverts) lireEnonce();
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

try {
  brancher();
  montrer('accueil');
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
