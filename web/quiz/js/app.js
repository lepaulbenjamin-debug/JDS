// Quiz Room — l'appli de pupitre.
//
// Le même code tourne sur tous les téléphones. La seule différence, c'est que
// l'appareil qui a créé le salon fait tourner la régie en plus (`engine.js`) :
// il publie l'état, les autres le lisent. Personne n'a de rôle d'animateur à
// tenir, tout le monde joue.

import { $, $$, el, clear, toast, confirmDialog } from '../../js/ui.js';
import * as net from './net.js';
import { creerRegie, JOKERS } from './engine.js';
import { THEMES, QUESTIONS, tirerQuestions, tailleDuPool, nomDuTheme } from './questions.js';
import { PERSONAS, voix, sons, paroleDe, chargerLesClips, dureeDuClip } from './emcee.js';

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

let reglages = { themes: [], nombre: 12, dureeMs: 15000, persona: 'classique' };

let monChoix = null;           // { manche, choix, joker } — écho local, avant l'aller-retour
let jokerArme = null;
let masque = null;             // { manche, caches } — les réponses retirées par le 50/50
let cleRendue = '';            // phase + manche : sert à ne reconstruire que le nécessaire
let derniereVoix = '';
let boutonsReponse = [];

const estRegie = () => Boolean(salon?.hostToken);

/* --- Navigation ---------------------------------------------------------- */

function montrer(nom) {
  for (const section of $$('[data-screen]')) section.hidden = section.dataset.screen !== nom;
  // Le retour reste disponible en pleine partie : un invité doit pouvoir sortir
  // d'un salon qui a mal tourné. La confirmation évite le départ par accident.
  $('#btn-back').hidden = nom === 'accueil';
}

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
    // Nouvelle manche : l'écho local d'une réponse précédente n'a plus cours.
    if (etat.phase === 'manche') {
      monChoix = null;
      jokerArme = null;
      masque = null;
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
    const mot = paroleDe(etat.persona, etat.annonceCle);
    if (mot) clips.push(mot.id);
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

  if (cle !== cleRendue) {
    cleRendue = cle;
    $('#jeu-annonce').textContent = etat.phase === 'revelation'
      ? (etat.resultat?.commentaire ?? '')
      : (etat.annonce ?? '');
    $('#jeu-question').textContent = question?.texte ?? '';
    construireReponses(question);
  }

  peindreReponses();
  rendreJokers();
  rendreEtatManche();
  rafraichirChrono();
}

function construireReponses(question) {
  const hote = clear($('#jeu-reponses'));
  boutonsReponse = [];
  if (!question) return;

  question.reponses.forEach((texte, index) => {
    const bouton = el('button', {
      class: 'reponse',
      type: 'button',
      dataset: { index: String(index) },
      onclick: () => repondre(index),
    }, [
      el('span', { class: 'reponse-lettre', text: 'ABCD'[index] }),
      el('span', { class: 'reponse-texte', text: texte }),
      el('span', { class: 'reponse-marque' }),
    ]);
    boutonsReponse.push(bouton);
    hote.append(bouton);
  });
}

function peindreReponses() {
  const question = etat.question;
  if (!question) return;
  const ouvert = etat.phase === 'manche'
    && net.serverNow() >= etat.startAt
    && !monChoix;
  const caches = etat.phase === 'manche' && masque?.manche === etat.manche
    ? masque.caches
    : [];

  boutonsReponse.forEach((bouton, index) => {
    const retiree = caches.includes(index);
    bouton.disabled = !ouvert || retiree;
    bouton.classList.toggle('est-retiree', retiree);
    bouton.classList.toggle('est-choisi', monChoix?.choix === index);
    const revele = etat.phase === 'revelation' && question.bonne != null;
    bouton.classList.toggle('est-juste', revele && index === question.bonne);
    bouton.classList.toggle('est-faux', revele && monChoix?.choix === index && index !== question.bonne);
    $('.reponse-marque', bouton).textContent = revele
      ? (index === question.bonne ? '✔' : (monChoix?.choix === index ? '✘' : ''))
      : '';
  });
}

function rendreJokers() {
  const hote = clear($('#jeu-jokers'));
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

  for (const joker of JOKERS) {
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

  const arme = JOKERS.find((j) => j.id === jokerArme);
  $('#joker-note').textContent = arme
    ? `${arme.nom} : ${arme.desc}`
    : (jouable
      ? (sansCible
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
    if (mien?.jokerRendu) {
      hote.append(el('p', {
        class: 'evenement',
        text: 'Ton joker t’est rendu : il n’a rien pu faire cette manche.',
      }));
    }
    if (etat.question?.note) {
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
  const source = QUESTIONS.find((q) => q.id === publiee?.id);
  if (!source) return null;

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

async function repondre(index) {
  if (!etat || etat.phase !== 'manche' || monChoix) return;
  const maintenant = net.serverNow();
  if (maintenant < etat.startAt || maintenant > etat.deadline) return;

  // Écho local immédiat : le tap doit se voir tout de suite, sans attendre que
  // le relais confirme. La régie reste seule juge du score.
  monChoix = { manche: etat.manche, choix: index, joker: jokerArme };
  sons.bip();
  peindreReponses();
  rendreJokers();
  rendreEtatManche();

  try {
    await net.sendAnswer(salon.code, {
      playerId: moi.id,
      round: etat.manche,
      choice: index,
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
  const dispo = tailleDuPool(reglages.themes);
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

async function ouvrirSalon() {
  const questions = tirerQuestions({ themes: reglages.themes, nombre: reglages.nombre });
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
      // Le moteur ne connaît pas les fichiers audio : c'est ici qu'on lui dit
      // combien de temps il faut pour lire la réponse et son explication, sans
      // quoi la phase se termine au milieu de la phrase.
      dureeRevelation: (question) => {
        const lu = dureeDuClip(`reponse/${question.id}`) + dureeDuClip(`note/${question.id}`);
        // + la réplique de l'animateur, + le temps de regarder son score.
        return lu ? (lu + 6) * 1000 : 0;
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
          await navigator.share({ title: 'Quiz Room', text: 'On joue ?', url: lien });
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
