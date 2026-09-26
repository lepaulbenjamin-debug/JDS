// L'écran commun : la partie en grand, sur une télé ou un vidéoprojecteur.
//
// Ce n'est pas un pupitre. Il ne rejoint pas le salon, n'apparaît pas dans la
// table, ne répond à rien — il lit l'état publié et l'affiche. C'est la seule
// façon d'ajouter un écran sans ajouter un joueur : un onglet ouvert « pour
// voir » qui s'inscrirait à la partie fausserait les scores et bloquerait la
// manche, la régie attendant une réponse qui ne viendra jamais.
//
// D'où un fichier à part plutôt qu'un mode de l'application. Les besoins ne se
// recouvrent presque pas : ici tout est en très grand, rien n'est cliquable, et
// on lit à trois mètres. Mélanger les deux aurait donné une page pleine de
// conditions « si écran commun » — et le pupitre, lui, doit rester simple.
//
// Une chose ne se devine pas et se dit donc à l'écran : la voix. Par défaut
// seule la régie parle. Une télé branchée sur les enceintes du salon est
// pourtant le bon endroit pour l'animateur — mais deux appareils qui parlent en
// même temps donnent un canon. Le choix reste donc à faire à la main, et l'écran
// explique lequel.

import * as net from './net.js';
import { el, clear } from './ui.js';
import { typeDeManche } from './manches/index.js';
import { THEMES } from './questions.js';
import { coupDeJoker } from './jokers.js';

const $ = (sel) => document.querySelector(sel);

// Plus lent que le pupitre : personne ne répond sur cet écran, donc rien n'y est
// urgent au dixième de seconde. Autant ménager le relais, qui sert déjà toute la
// table.
const BATTEMENT_MS = 900;

/**
 * Ce que cet écran montre pendant la manche.
 *
 * Le défaut qui a mené à ce réglage : la télé affichait l'énoncé et les quatre
 * réponses dès le début de la manche, alors que les pupitres attendent la fin
 * de la lecture pour ouvrir les leurs. Toute la table lisait donc la question
 * sur la télé pendant que l'animateur la lisait encore — plus personne
 * n'écoutait, et les plus rapides à lever les yeux avaient une avance qui
 * n'appartenait pas au jeu.
 *
 * Deux corrections, et elles ne se remplacent pas : l'énoncé n'apparaît plus
 * avant l'ouverture des réponses, ET on peut choisir de ne rien montrer du
 * tout. Certaines tables veulent la question en grand, d'autres veulent que
 * chacun reste sur son téléphone.
 */
const MODES = [
  {
    id: 'revelation',
    nom: 'Classement et révélation',
    note: 'Rien pendant qu’on cherche : chacun lit sur son téléphone. À la '
      + 'révélation, la bonne réponse, l’explication et ce que toute la table a '
      + 'répondu — le moment où l’on rit.',
  },
  {
    id: 'classement',
    nom: 'Classement seul',
    note: 'Le numéro de manche, le chrono et les scores. Jamais la question, '
      + 'jamais les réponses. L’écran ne devance rien et ne révèle rien.',
  },
  {
    id: 'tout',
    nom: 'Tout, question comprise',
    note: 'L’énoncé et les réponses en grand, mais seulement une fois que les '
      + 'téléphones les affichent — jamais pendant que l’animateur lit.',
  },
];

const CLE_MODE = 'quizroom.tv.mode';

const lireLeMode = () => {
  try {
    const garde = localStorage.getItem(CLE_MODE);
    if (MODES.some((m) => m.id === garde)) return garde;
  } catch { /* navigation privée : on garde le défaut */ }
  return MODES[0].id;
};

let mode = lireLeMode();

function choisirLeMode(id) {
  mode = id;
  try { localStorage.setItem(CLE_MODE, id); } catch { /* sans conséquence */ }
  rendreLesModes();
  rendre();
}

function rendreLesModes() {
  const hote = $('#tv-choix-mode');
  if (hote) {
    clear(hote);
    for (const m of MODES) {
      hote.append(el('button', {
        class: `tv-mode${m.id === mode ? ' est-actif' : ''}`,
        type: 'button',
        onclick: () => choisirLeMode(m.id),
      }, m.nom));
    }
    $('#tv-mode-note').textContent = MODES.find((m) => m.id === mode)?.note ?? '';
  }
  // La bascule de l'écran de jeu : le bon réglage ne se trouve qu'une fois la
  // première manche passée, et personne ne va rouvrir la page pour ça.
  const bascule = $('#tv-mode');
  if (bascule) bascule.textContent = MODES.find((m) => m.id === mode)?.nom ?? '';
}

let code = null;
let version = -1;
let etat = null;
let joueurs = [];
let erreurs = 0;
let boucle = null;
let image = null;
// Le dernier état d'ouverture affiché, pour ne repeindre qu'au franchissement.
let reponsesOuvertes = false;

function montrer(nom) {
  for (const section of document.querySelectorAll('[data-tv]')) {
    section.hidden = section.dataset.tv !== nom;
  }
}

function alerter(message) {
  const zone = $('#tv-alerte');
  zone.textContent = message ?? '';
  zone.hidden = !message;
}

/* --- La boucle ------------------------------------------------------------ */

async function battre() {
  try {
    const reponse = await net.pollRoom(code, version);
    erreurs = 0;
    alerter(null);
    if (!reponse.changed) return;
    version = reponse.version;
    if (reponse.players) joueurs = reponse.players;
    if (reponse.state) etat = reponse.state;
    rendre();
  } catch (erreur) {
    erreurs += 1;
    // Un salon qui n'existe plus ne reviendra pas : on le dit et on s'arrête.
    // Insister ferait clignoter un écran de trois mètres toute la soirée.
    if (erreur?.status === 404) {
      clearTimeout(boucle);
      boucle = null;
      cesserLHorloge();
      montrer('code');
      alerter('Ce salon n’existe plus.');
      return;
    }
    // Le reste, on l'endure en silence quelques tours : une coupure de deux
    // secondes est plus fréquente qu'un vrai problème, et l'écran affiche
    // encore l'état d'avant, qui reste juste.
    if (erreurs === 5) alerter('Connexion au relais perdue — on continue d’essayer.');
  }
}

function demarrer(nouveau) {
  code = nouveau;
  version = -1;
  etat = null;
  location.hash = code;
  clearTimeout(boucle);
  const tour = async () => {
    await battre();
    boucle = setTimeout(tour, BATTEMENT_MS);
  };
  tour();
  horloger();
  montrer('lobby');
  $('#tv-code-affiche').textContent = code;
  $('#tv-lobby-note').textContent = 'En attente du lancement…';
}

/**
 * L'horloge locale de cet écran.
 *
 * Elle manquait, et c'est ce qui rendait l'affichage à l'heure impossible : la
 * régie ne republie que lorsque quelque chose a bougé, donc pendant qu'une
 * question est ouverte le relais ne renvoie rien de neuf et `rendre()` n'est
 * jamais appelé. La jauge du chrono restait figée là où le dernier changement
 * l'avait laissée — et un énoncé qui doit apparaître en cours de manche ne
 * serait jamais apparu.
 *
 * Le temps qui passe est donc une affaire locale. L'état vient du relais,
 * l'instant vient d'ici — recalé sur l'horloge du serveur, sans quoi deux
 * écrans ne s'ouvriraient pas ensemble.
 */
function horloger() {
  cesserLHorloge();
  const battement = () => {
    image = requestAnimationFrame(battement);
    if (!etat) return;
    rendreChrono();
    // Le reste de l'écran ne se refait qu'au franchissement : repeindre tout à
    // soixante images par seconde reconstruirait les scores et les réponses
    // dites pour rien, et ferait clignoter la sélection du texte.
    const ouvert = lesReponsesSontOuvertes();
    if (ouvert !== reponsesOuvertes) {
      reponsesOuvertes = ouvert;
      rendre();
    }
  };
  battement();
}

function cesserLHorloge() {
  if (image !== null) cancelAnimationFrame(image);
  image = null;
}

/** Les réponses sont-elles ouvertes sur les téléphones, à cet instant ? */
function lesReponsesSontOuvertes() {
  if (!etat || etat.phase !== 'manche') return false;
  return !etat.reponsesAt || net.serverNow() >= etat.reponsesAt;
}

/* --- Le rendu ------------------------------------------------------------- */

function rendre() {
  if (!etat) return;
  if (etat.phase === 'lobby') return rendreLobby();
  if (etat.phase === 'podium') return rendreFin();
  return rendreJeu();
}

function rendreLobby() {
  montrer('lobby');
  $('#tv-code-affiche').textContent = code;
  const hote = clear($('#tv-joueurs'));
  for (const joueur of joueurs) {
    hote.append(el('span', { class: 'tv-joueur', text: joueur.name }));
  }
  $('#tv-lobby-note').textContent = joueurs.length
    ? 'En attente du lancement…'
    : 'Ouvrez la page du quiz sur vos téléphones et tapez ce code.';
}

function rendreJeu() {
  montrer('jeu');
  const question = etat.question;
  const revele = etat.phase === 'revelation';

  // Le mode passe en attribut : quand le classement est seul à l'écran, il doit
  // prendre la place laissée libre. Une pastille de deux centimètres perdue au
  // milieu d'une télé ne se lit pas du fond de la pièce — or c'est justement
  // tout ce que ce mode-là donne à lire.
  $('#tv').dataset.mode = mode;

  // Le décalage qui rendait cet écran injouable : les pupitres n'ouvrent leurs
  // réponses qu'à `reponsesAt`, après la lecture de l'énoncé. La télé, elle,
  // affichait tout dès la publication de l'état — donc pendant que l'animateur
  // lisait encore, et pendant la fenêtre des jokers, qui se joue justement
  // AVANT d'avoir vu la question. On s'aligne sur les téléphones.
  const ouvert = lesReponsesSontOuvertes();
  // La lecture : la manche a commencé, mais les réponses ne sont pas encore
  // ouvertes. C'est le seul moment où l'écran doit se taire — l'intro et le
  // vote ont chacun leur texte, et n'attendent personne.
  const enLecture = etat.phase === 'manche' && !ouvert;
  const montrerLaQuestion = mode === 'tout' && (ouvert || revele);
  const montrerLaRevelation = mode !== 'classement' && revele;

  $('#tv-manche').textContent = etat.phase === 'intro'
    ? `${etat.total} manches`
    : etat.finale ? 'Dernière manche — points doublés'
      : `Manche ${etat.manche} / ${etat.total}`;
  $('#tv-theme').textContent = question ? (typeDeManche(question.type).nom ?? '') : '';
  $('#tv-theme').hidden = !question;

  // Pendant le vote, l'écran commun est le seul endroit où toute la table voit
  // la même chose : c'est là que la question se règle, à voix haute.
  $('#tv-annonce').textContent = etat.phase === 'vote'
    ? 'À la table de trancher — regardez vos téléphones.'
    : revele ? (etat.resultat?.commentaireDit || etat.resultat?.commentaire || '')
      // Pendant la lecture et la fenêtre des jokers, l'écran dit ce qui se
      // passe plutôt que de rester vide : sinon on croit qu'il a planté.
      : enLecture ? 'L’animateur lit la question…'
        : (etat.annonceDite || etat.annonce || '');

  // Sur un TTMC, chacun a sa propre question : il n'y en a pas à montrer en
  // grand. Le thème, lui, est ce dont la table parle pendant que chacun mise —
  // et c'est l'écran commun qui doit le porter.
  // À la révélation, l'énoncé revient quel que soit le mode « révélation » :
  // sans lui, la bonne réponse et l'explication flottent sans rien à quoi se
  // rattacher, et personne ne se souvient de la question dix secondes après.
  const enonce = montrerLaQuestion || montrerLaRevelation;
  $('#tv-question').textContent = !enonce ? ''
    : question?.type === 'ttmc'
      ? (THEMES.find((t) => t.id === question.theme)?.nom ?? '')
      : (question?.texte ?? '');
  $('#tv-question').hidden = !enonce || !question || etat.phase === 'intro';

  rendreReponses(question, revele, montrerLaQuestion || montrerLaRevelation);

  // L'explication est le meilleur moment de la manche, et c'est celui qu'on
  // rate quand on lit sur un téléphone posé sur la table.
  $('#tv-note').textContent = montrerLaRevelation ? (question?.note ?? '') : '';
  $('#tv-note').hidden = !montrerLaRevelation || !question?.note;

  rendreLesDits(question, montrerLaRevelation);
  rendreChrono();
  rendreScores();
}

/**
 * Ce que chacun a répondu, en grand.
 *
 * C'est l'endroit où cet écran sert le plus : sur un téléphone, on ne voit que
 * sa propre réponse, et l'estimation délirante du voisin passe inaperçue. Ici
 * tout le monde lit la même ligne au même moment, et c'est de là que vient le
 * bruit autour de la table.
 */
function rendreLesDits(question, revele) {
  const zone = clear($('#tv-dits'));
  const detail = etat.resultat?.detail;
  zone.hidden = !revele || !detail || !question;
  if (zone.hidden) return;

  const type = typeDeManche(question.type);
  const nomDe = (id) => (etat.classement ?? joueurs).find((j) => j.id === id)?.name ?? '—';

  // Du plus rapide au plus lent : l'ordre dans lequel ça s'est joué.
  const lignes = Object.entries(detail)
    .sort((a, b) => (a[1].elapsedMs ?? Infinity) - (b[1].elapsedMs ?? Infinity));

  for (const [id, r] of lignes) {
    const texte = r.absent ? 'rien' : (type.resume?.(question, r) || '—');
    const partiel = !r.correct && (r.fraction ?? 0) > 0;
    // Qui a dégainé quoi, et sur qui. C'est ici que ça doit se lire : la voix
    // enregistrée dit « le leader » et ne nomme jamais personne.
    const coup = coupDeJoker(r, nomDe);
    zone.append(el('div', {
      class: `tv-dit${r.correct ? ' est-juste' : partiel ? ' est-partiel' : ''}`,
    }, [
      el('span', { class: 'tv-dit-nom', text: nomDe(id) }),
      el('span', { class: 'tv-dit-texte', text: texte }),
      coup && el('span', {
        class: `tv-dit-joker${coup.abouti ? '' : ' est-rate'}`,
        text: `${coup.emoji} ${coup.texte}`,
      }),
    ]));
  }
}

/**
 * Les réponses, telles que la manche les publie.
 *
 * Toutes les formes n'en ont pas : une estimation se tape, un mix aussi. On
 * n'affiche donc que ce qui existe, plutôt que de fabriquer un cadre vide.
 */
function rendreReponses(question, revele, autorise) {
  const zone = clear($('#tv-reponses'));
  zone.hidden = true;
  if (!autorise || !question || etat.phase === 'intro') return;

  if (Array.isArray(question.reponses) && question.reponses.length) {
    zone.hidden = false;
    question.reponses.forEach((texte, i) => {
      const juste = revele && question.bonne === i;
      zone.append(el('div', {
        class: `tv-reponse${juste ? ' est-juste' : ''}`,
        text: texte,
      }));
    });
    return;
  }

  // Le mix : la liste de tout ce qui était accepté, qui est le morceau de
  // bravoure de la révélation.
  if (revele && Array.isArray(question.acceptees)) {
    zone.hidden = false;
    for (const titre of question.acceptees.slice(0, 12)) {
      zone.append(el('div', { class: 'tv-titre-accepte', text: titre.titre }));
    }
    return;
  }

  if (revele && question.solutionTexte) {
    zone.hidden = false;
    // Une rafale et un classement rendent plusieurs éléments dans une seule
    // chaîne, séparés par des points-virgules. En un seul pavé sur une télé,
    // c'est illisible : on retrouve les lignes.
    for (const morceau of String(question.solutionTexte).split(/\s*;\s*|,\s*puis\s*/)) {
      if (morceau.trim()) {
        zone.append(el('div', { class: 'tv-reponse est-juste', text: morceau.trim() }));
      }
    }
  }
}

function rendreChrono() {
  const cadre = $('#tv-chrono');
  const jauge = $('#tv-jauge');
  const maintenant = net.serverNow();

  if (etat.phase === 'manche') {
    cadre.hidden = false;
    const avantDepart = maintenant < etat.startAt;
    // Le décompte avant le top, puis la jauge pleine le temps que l'énoncé se
    // lise : le chrono ne part qu'avec les réponses.
    if (avantDepart || maintenant < etat.reponsesAt) {
      if (avantDepart) {
        cadre.dataset.compte = String(Math.max(1, Math.ceil((etat.startAt - maintenant) / 1000)));
      } else {
        delete cadre.dataset.compte;
      }
      jauge.style.width = '100%';
      jauge.classList.remove('est-urgent');
      return;
    }
    delete cadre.dataset.compte;
    const restant = Math.max(0, etat.deadline - maintenant);
    jauge.style.width = `${(restant / etat.dureeMs) * 100}%`;
    jauge.classList.toggle('est-urgent', restant < etat.dureeMs * 0.25);
    return;
  }
  cadre.hidden = true;
}

/**
 * Le classement, en permanence.
 *
 * C'est ce qu'un écran commun apporte de plus utile : sur un téléphone, il faut
 * défiler pour le voir, et personne ne défile pendant une manche. Ici il ne
 * bouge pas de l'écran, et c'est ce qui fait qu'on sait où l'on en est.
 */
function rendreScores() {
  const hote = clear($('#tv-scores'));
  const classement = etat.classement ?? [];
  if (!classement.length) return;

  const meilleur = classement[0]?.score ?? 0;
  for (const [rang, joueur] of classement.entries()) {
    const gain = etat.phase === 'revelation' ? etat.resultat?.detail?.[joueur.id]?.points : null;
    hote.append(el('div', { class: `tv-score${rang === 0 && meilleur > 0 ? ' est-tete' : ''}` }, [
      el('span', { class: 'tv-score-nom', text: joueur.name }),
      gain ? el('span', { class: `tv-score-gain ${gain > 0 ? 'est-plus' : 'est-moins'}`,
        text: `${gain > 0 ? '+' : ''}${gain}` }) : null,
      el('span', { class: 'tv-score-total', text: String(joueur.score) }),
    ]));
  }
}

function rendreFin() {
  montrer('fin');
  $('#tv-fin-annonce').textContent = etat.annonce ?? '';
  const hote = clear($('#tv-podium'));
  (etat.podium ?? etat.classement ?? []).forEach((joueur, rang) => {
    hote.append(el('div', { class: 'tv-podium-ligne' }, [
      el('span', { class: 'tv-medaille', text: ['🥇', '🥈', '🥉'][rang] ?? `${rang + 1}` }),
      el('span', { class: 'tv-podium-nom', text: joueur.name }),
      el('span', { class: 'tv-podium-score', text: `${joueur.score} pts` }),
    ]));
  });
}

/* --- Démarrage ------------------------------------------------------------ */

$('#tv-code').addEventListener('input', (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
});

// La bascule de l'écran de jeu : elle fait défiler les modes dans l'ordre. Un
// seul bouton plutôt que trois, parce qu'à trois mètres on n'en visera qu'un.
$('#tv-mode').addEventListener('click', () => {
  const rang = MODES.findIndex((m) => m.id === mode);
  choisirLeMode(MODES[(rang + 1) % MODES.length].id);
});

rendreLesModes();

$('#tv-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const saisi = $('#tv-code').value.trim().toUpperCase();
  if (saisi.length === 4) demarrer(saisi);
});

// Le code dans l'adresse : c'est ce qui permet d'enregistrer la page en favori
// sur la télé, ou de l'ouvrir d'un lien envoyé depuis le téléphone de la régie.
const depuisLAdresse = location.hash.replace('#', '').toUpperCase();
if (/^[A-Z0-9]{4}$/.test(depuisLAdresse)) {
  $('#tv-code').value = depuisLAdresse;
  demarrer(depuisLAdresse);
} else {
  montrer('code');
}
