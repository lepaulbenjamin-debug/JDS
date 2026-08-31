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
import { el, clear } from '../../js/ui.js';
import { typeDeManche } from './manches/index.js';

const $ = (sel) => document.querySelector(sel);

// Plus lent que le pupitre : personne ne répond sur cet écran, donc rien n'y est
// urgent au dixième de seconde. Autant ménager le relais, qui sert déjà toute la
// table.
const BATTEMENT_MS = 900;

let code = null;
let version = -1;
let etat = null;
let joueurs = [];
let erreurs = 0;
let boucle = null;

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
  montrer('lobby');
  $('#tv-code-affiche').textContent = code;
  $('#tv-lobby-note').textContent = 'En attente du lancement…';
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
      : (etat.annonceDite || etat.annonce || '');

  $('#tv-question').textContent = question?.type === 'ttmc' ? '' : (question?.texte ?? '');
  $('#tv-question').hidden = !question || etat.phase === 'intro';

  rendreReponses(question, revele);

  // L'explication est le meilleur moment de la manche, et c'est celui qu'on
  // rate quand on lit sur un téléphone posé sur la table.
  $('#tv-note').textContent = revele ? (question?.note ?? '') : '';
  $('#tv-note').hidden = !revele || !question?.note;

  rendreChrono();
  rendreScores();
}

/**
 * Les réponses, telles que la manche les publie.
 *
 * Toutes les formes n'en ont pas : une estimation se tape, un mix aussi. On
 * n'affiche donc que ce qui existe, plutôt que de fabriquer un cadre vide.
 */
function rendreReponses(question, revele) {
  const zone = clear($('#tv-reponses'));
  zone.hidden = true;
  if (!question || etat.phase === 'intro') return;

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

  if (revele && question.solution) {
    zone.hidden = false;
    // Une rafale et un classement rendent plusieurs éléments dans une seule
    // chaîne, séparés par des points-virgules. En un seul pavé sur une télé,
    // c'est illisible : on retrouve les lignes.
    for (const morceau of String(question.solution).split(/\s*;\s*|,\s*puis\s*/)) {
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
