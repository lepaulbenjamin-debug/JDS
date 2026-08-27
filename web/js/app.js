import { GAMES, getGame } from './games/index.js';
import {
  store, makePlayer, makePerson, playerFromPerson, makeMatch, makeDraft, makeRoundId,
  totals, standings, winners, isOver, replay, PLAYER_COLORS,
  archives, carnet, supprimer, exporter, importer,
  quotaPhoto, consommerLecture, LECTURES_OFFERTES,
} from './store.js';
import { $, $$, el, clear, toast, initials, confirmDialog, formatDate } from './ui.js';
import { prepareImage, scan, matchPlayer } from './ai.js';
import { speech } from './speech.js';

// --- Navigation ------------------------------------------------------------

const TITLES = {
  home: 'Marque-points',
  setup: 'Nouvelle partie',
  match: 'Partie en cours',
  scan: 'Compter en photo',
  rules: 'Règles',
  settings: 'Réglages',
  people: 'Les joueurs',
  history: 'Toutes les parties',
  'match-detail': 'Partie archivée',
};

let current = 'home';
const backStack = [];

function show(name, { push = true } = {}) {
  if (current === 'rules' && name !== 'rules') stopSpeech();
  if (push && name !== current) backStack.push(current);
  current = name;
  for (const section of $$('.screen')) section.hidden = section.dataset.screen !== name;
  $('#topbar-title').textContent = TITLES[name] ?? 'Marque-points';
  $('#btn-back').hidden = backStack.length === 0;
  window.scrollTo(0, 0);
  render();
}

function back() {
  const previous = backStack.pop() ?? 'home';
  show(previous, { push: false });
}

// --- État local d'écran ----------------------------------------------------

let setupDraft = null;      // { gameId, names: string[], target }
let scanState = { mode: 'scoresheet', image: null, playerId: null, busy: false, result: null };
let rulesState = { gameId: GAMES[0].id, playerCount: 4, step: -1, speaking: false, paused: false };
let detailId = null;      // partie archivée consultée

function activeGame() {
  const match = store.state.match;
  return match ? getGame(match.gameId) : GAMES[0];
}

// --- Rendu global ----------------------------------------------------------

function render() {
  if (current === 'home') renderHome();
  if (current === 'setup') renderSetup();
  if (current === 'match') renderMatch();
  if (current === 'scan') renderScan();
  if (current === 'rules') renderRules();
  if (current === 'settings') renderSettings();
  if (current === 'people') renderPeople();
  if (current === 'history') renderHistory();
  if (current === 'match-detail') renderMatchDetail();
}

// --- Palmarès --------------------------------------------------------------

/**
 * Agrège les parties archivées par joueur du carnet.
 * @returns {Map<string, {games:number, wins:number, byGame:Map<string,{games:number,wins:number}>}>}
 */
function recordsByPerson(history) {
  const records = new Map();
  const touch = (personId) => {
    if (!records.has(personId)) records.set(personId, { games: 0, wins: 0, byGame: new Map() });
    return records.get(personId);
  };

  for (const past of history) {
    const game = getGame(past.gameId);
    const classement = standings(past, game);
    for (const { player, rank } of classement) {
      // Les parties d'avant le carnet n'ont pas de joueur identifiable.
      if (!player.personId) continue;
      const rec = touch(player.personId);
      rec.games += 1;
      if (!rec.byGame.has(past.gameId)) rec.byGame.set(past.gameId, { games: 0, wins: 0 });
      const parJeu = rec.byGame.get(past.gameId);
      parJeu.games += 1;
      // Une égalité que le livret ne départage pas compte comme une victoire
      // pour chacun des ex æquo.
      if (rank === 1) { rec.wins += 1; parJeu.wins += 1; }
    }
  }
  return records;
}

/**
 * Vignette d'un jeu : un dessin original évoquant son matériel, posé sur une
 * pastille de sa teinte. Repérer un jeu par sa couleur et sa forme va plus
 * vite que le lire.
 */
function gameArt(game) {
  const tuile = el('span', { class: 'game-art', style: { '--teinte': game.art?.teinte ?? 'var(--muted)' } });
  tuile.innerHTML = `<svg viewBox="0 0 32 32" width="26" height="26" fill="currentColor" aria-hidden="true">${game.art?.svg ?? ''}</svg>`;
  return tuile;
}

// --- Accueil ---------------------------------------------------------------

function renderHome() {
  const { match } = store.state;
  const history = archives(store.state);

  const resume = clear($('#home-resume'));
  if (match) {
    const game = getGame(match.gameId);
    const board = standings(match, game);
    resume.append(
      el('button', { class: 'resume-card', type: 'button', onclick: () => show('match') }, [
        el('div', { class: 'resume-top' }, [
          el('span', { class: 'badge', text: 'Reprendre' }),
          el('span', { class: 'muted small', text: roundsLabel(game, match.rounds.length) }),
        ]),
        el('strong', { text: `${game.name} — ${match.players.length} joueurs` }),
        el('span', { class: 'muted small', text: board.map((r) => `${r.player.name} ${r.total}`).join(' · ') }),
      ]),
    );
  }

  const list = clear($('#game-list'));
  for (const game of GAMES) {
    list.append(
      el('div', { class: 'game-card' }, [
        gameArt(game),
        el('strong', { text: game.name }),
        el('span', { class: 'muted small', text: game.tagline }),
        el('span', { class: 'muted small', text: `${game.minPlayers} à ${game.maxPlayers} joueurs` }),
        el('div', { class: 'game-card-actions' }, [
          el('button', { class: 'btn btn-primary', type: 'button', onclick: () => startSetup(game) }, 'Jouer'),
          el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => openRules(game) }, '📖 Règles'),
        ]),
      ]),
    );
  }

  const hist = clear($('#history-list'));
  if (history.length === 0) {
    hist.append(el('p', { class: 'muted small', text: 'Aucune partie archivée pour le moment.' }));
  }
  for (const past of [...history].reverse().slice(0, 5)) hist.append(matchRow(past));
  if (history.length > 5) {
    hist.append(el('p', { class: 'muted small', text: `${history.length - 5} autre(s) partie(s) dans « Toutes les parties ».` }));
  }
}

// --- Configuration ---------------------------------------------------------

function startSetup(game) {
  // Les jeux en équipes se saisissent à la main ; les autres piochent dans le
  // carnet, où l'on retrouve les habitués d'une partie à l'autre.
  const parEquipes = Boolean(game.defaultNames);
  const derniers = store.state.lastPlayers;
  const connus = carnet(store.state);
  const preselection = connus
    .filter((p) => derniers.includes(p.name))
    .slice(0, game.maxPlayers)
    .map((p) => p.id);

  setupDraft = {
    gameId: game.id,
    parEquipes,
    names: parEquipes ? [...game.defaultNames] : [],
    selected: parEquipes ? [] : preselection,
    endMode: endModesOf(game)[0].id,
    target: endModesOf(game)[0].defaut,
    options: Object.fromEntries((game.options ?? []).map((o) => [o.key, o.options[0].value])),
  };
  show('setup');
}

/** Ajoute quelqu'un au carnet et le sélectionne pour la partie en préparation. */
function addPerson(name, { select = false } = {}) {
  const propre = name.trim();
  if (!propre) return null;
  const existe = carnet(store.state).find((p) => p.name.toLowerCase() === propre.toLowerCase());
  if (existe) {
    toast(`${existe.name} est déjà dans le carnet.`, 'warn');
    return existe;
  }
  const person = makePerson(propre, carnet(store.state).length);
  store.update((s) => { s.people.push(person); });
  if (select && setupDraft) setupDraft.selected.push(person.id);
  return person;
}

function renderSetup() {
  if (!setupDraft) return show('home', { push: false });
  const game = getGame(setupDraft.gameId);

  $('#setup-game').textContent = game.name;
  const unite = game.participantLabel ?? 'Joueur';
  $('#setup-players-title').textContent = `${unite}s`;
  $('#btn-add-player').textContent = `+ Ajouter ${unite === 'Équipe' ? 'une équipe' : 'un joueur'}`;
  const effectif = setupDraft.parEquipes ? setupDraft.names.length : setupDraft.selected.length;
  const { perPlayer, removed, chien } = game.deal(Math.max(effectif, game.minPlayers));
  $('#setup-hint').textContent =
    `${effectif} ${(game.participantLabel ?? 'Joueur').toLowerCase()}s · ${perPlayer} cartes chacun`
    + (removed ? ` · ${removed} cartes retirées` : '')
    + (chien ? ` · chien de ${chien}` : '');

  const list = clear($('#player-list'));

  if (!setupDraft.parEquipes) {
    renderRoster(game, list);
    $('#btn-add-player').hidden = true;
    renderSetupTail(game);
    return;
  }

  setupDraft.names.forEach((name, index) => {
    const input = el('input', {
      type: 'text',
      value: name,
      placeholder: `${unite} ${index + 1}`,
      autocomplete: 'off',
      maxlength: '18',
      oninput: (e) => { setupDraft.names[index] = e.target.value; },
    });
    list.append(
      el('div', { class: 'player-row' }, [
        el('span', { class: 'dot', style: { background: PLAYER_COLORS[index % PLAYER_COLORS.length] } }),
        input,
        setupDraft.names.length > game.minPlayers &&
          el('button', {
            class: 'icon-btn',
            type: 'button',
            'aria-label': `Retirer : ${unite} ${index + 1}`,
            onclick: () => { setupDraft.names.splice(index, 1); renderSetup(); },
          }, '×'),
      ]),
    );
  });

  $('#btn-add-player').hidden = setupDraft.names.length >= game.maxPlayers;
  renderSetupTail(game);
}

/** Sélection des joueurs dans le carnet, dans l'ordre où on les touche. */
function renderRoster(game, host) {
  const { people } = store.state;
  const selected = setupDraft.selected;

  if (people.length === 0) {
    host.append(el('p', { class: 'muted small', text: 'Votre carnet est vide : ajoutez les joueurs ci-dessous.' }));
  }

  const roster = el('div', { class: 'roster' });
  for (const person of people) {
    const rang = selected.indexOf(person.id);
    roster.append(
      el('button', {
        class: `chip${rang >= 0 ? ' is-active' : ''}`,
        type: 'button',
        style: { '--chip-color': person.color },
        onclick: () => {
          if (rang >= 0) selected.splice(rang, 1);
          else if (selected.length >= game.maxPlayers) {
            toast(`${game.maxPlayers} joueurs au maximum à ce jeu.`, 'warn');
          } else selected.push(person.id);
          renderSetup();
        },
      }, [
        rang >= 0
          ? el('span', { class: 'roster-order', style: { '--chip-color': person.color }, text: String(rang + 1) })
          : el('span', { class: 'dot', style: { background: person.color } }),
        el('span', { text: person.name }),
      ]),
    );
  }
  host.append(roster);

  const champ = el('input', {
    type: 'text',
    placeholder: 'Ajouter quelqu\u2019un',
    autocomplete: 'off',
    maxlength: '18',
    onkeydown: (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (addPerson(e.target.value, { select: true })) e.target.value = '';
      renderSetup();
    },
  });
  host.append(
    el('div', { class: 'add-row' }, [
      champ,
      el('button', {
        class: 'btn btn-ghost',
        type: 'button',
        onclick: () => {
          if (addPerson(champ.value, { select: true })) champ.value = '';
          renderSetup();
        },
      }, 'Ajouter'),
    ]),
  );

  const manque = game.minPlayers - selected.length;
  host.append(el('p', {
    class: 'muted small',
    text: manque > 0
      ? `Sélectionnez encore ${manque} joueur${manque > 1 ? 's' : ''} (${game.minPlayers} à ${game.maxPlayers}).`
      : `${selected.length} joueurs, dans cet ordre autour de la table.`,
  }));
}

/**
 * Les façons dont une partie peut s'arrêter, pour un jeu donné.
 * Un jeu peut en proposer plusieurs (`endModes`) : au Papayoo, on joue au
 * score ou en un nombre de manches convenu. Les autres n'en ont qu'une, et
 * elle se déduit de leurs champs existants.
 */
function endModesOf(game) {
  if (game.endModes?.length) return game.endModes;
  return [{
    id: game.endMode === 'rounds' ? 'rounds' : 'score',
    label: game.endMode === 'rounds' ? 'En manches' : 'Au score',
    choices: game.targetChoices,
    defaut: game.defaultTarget,
  }];
}

/**
 * La fin de partie retenue pour une partie donnée.
 *
 * Les parties d'avant ce réglage n'ont pas de `endMode` : elles s'arrêtaient au
 * score, comme `isOver` le suppose déjà. Il faut retomber là-dessus et non sur
 * le premier mode du jeu, sans quoi une vieille partie de Papayoo en 250 points
 * se relirait « partie en 250 manches » le jour où le jeu propose les manches
 * en premier.
 */
function endModeOf(match, game) {
  const modes = endModesOf(game);
  const id = match.endMode ?? game.endMode ?? 'score';
  return modes.find((m) => m.id === id) ?? modes[0];
}

/** Options de partie et condition de fin, communes aux deux modes de saisie. */
function renderSetupTail(game) {
  const optionsHost = clear($('#setup-options'));
  for (const option of game.options ?? []) {
    const chips = el('div', { class: 'chip-row' });
    for (const choix of option.options) {
      chips.append(el('button', {
        class: `chip${setupDraft.options[option.key] === choix.value ? ' is-active' : ''}`,
        type: 'button',
        onclick: () => { setupDraft.options[option.key] = choix.value; renderSetup(); },
      }, choix.label));
    }
    optionsHost.append(
      el('div', {}, [
        el('h3', { class: 'section-title', text: option.label }),
        option.hint && el('p', { class: 'muted small', text: option.hint }),
        chips,
      ]),
    );
  }

  // Certains jeux s'arrêtent à un score, d'autres après un nombre de donnes,
  // d'autres encore laissent la table décider.
  const modes = endModesOf(game);
  const mode = modes.find((m) => m.id === setupDraft.endMode) ?? modes[0];

  const bascule = clear($('#end-mode'));
  bascule.hidden = modes.length < 2;
  for (const m of modes) {
    bascule.append(el('button', {
      class: `chip${m.id === mode.id ? ' is-active' : ''}`,
      type: 'button',
      onclick: () => {
        setupDraft.endMode = m.id;
        // Chaque façon de finir a ses propres valeurs : 250 points n'a aucun
        // sens comme nombre de manches.
        setupDraft.target = m.defaut;
        renderSetup();
      },
    }, m.label));
  }

  const parDonnes = mode.id === 'rounds';
  $('#setup-end-label').textContent = mode.hint ?? (parDonnes
    ? 'La partie dure :'
    : "La partie s'arrête dès qu'un joueur atteint :");

  const choices = clear($('#target-choices'));
  for (const value of mode.choices) {
    choices.append(
      el('button', {
        class: `chip${setupDraft.target === value ? ' is-active' : ''}`,
        type: 'button',
        onclick: () => { setupDraft.target = value; renderSetup(); },
      }, parDonnes ? roundsLabel(game, value) : `${value} pts`),
    );
  }

  // D'où vient cette façon de finir. Certaines sont dans le livret, d'autres
  // sont des usages de table : l'appli propose les deux, mais ne les présente
  // pas comme équivalentes.
  const note = $('#end-mode-note');
  note.textContent = mode.note ?? '';
  note.hidden = !mode.note;
}


function startMatch() {
  const game = getGame(setupDraft.gameId);
  const unite = game.participantLabel ?? 'Joueur';
  let players;

  if (setupDraft.parEquipes) {
    const names = setupDraft.names.map((n, i) => (n.trim() || `${unite} ${i + 1}`));
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      toast(`Deux ${unite.toLowerCase()}s portent le même nom.`, 'warn');
      return;
    }
    players = names.map((n, i) => makePlayer(n, i));
  } else {
    const choisis = setupDraft.selected
      .map((id) => carnet(store.state).find((p) => p.id === id))
      .filter(Boolean);
    if (choisis.length < game.minPlayers) {
      toast(`Il faut au moins ${game.minPlayers} joueurs à ce jeu.`, 'warn');
      return;
    }
    players = choisis.map(playerFromPerson);
  }

  store.update((s) => {
    s.match = makeMatch(game, players, setupDraft.target, setupDraft.options, setupDraft.endMode);
    if (!setupDraft.parEquipes) s.lastPlayers = players.map((p) => p.name);
  });
  backStack.length = 0;
  backStack.push('home');
  show('match', { push: false });
}

// --- Partie ----------------------------------------------------------------

/**
 * Ce que le jeu reçoit pour valider et calculer : les scores saisis, ou la
 * description de la donne pour les jeux à formulaire (Tarot).
 */
function roundInput(match, game) {
  return game.entry === 'form' ? match.draft.form : draftScores(match, game);
}

/** Scores effectifs du brouillon, selon le mode de saisie. */
function draftScores(match, game) {
  const { draft } = match;
  if (draft.mode === 'tokens') {
    const out = Object.fromEntries(match.players.map((p) => [p.id, 0]));
    for (const token of game.tokens) {
      const owner = draft.assign[token.id];
      if (owner && out[owner] != null) out[owner] += token.value;
    }
    return out;
  }
  return Object.fromEntries(
    match.players.map((p) => [p.id, draft.scores[p.id] === '' ? '' : Number(draft.scores[p.id] ?? 0)]),
  );
}

function renderMatch() {
  const match = store.state.match;
  if (!match) return show('home', { push: false });
  const game = getGame(match.gameId);

  renderBanner(match, game);
  renderScoreboard(match, game);
  renderRoundPanel(match, game);
  renderRoundHistory(match, game);
}

/** Intitulé de manche accordé en nombre : « 1 partie », « 3 parties ». */
function roundsLabel(game, count) {
  const { label } = roundWords(game);
  return `${count} ${label}${count > 1 ? 's' : ''}`;
}

/**
 * Accords du mot qu'un jeu emploie pour une manche. Ils sont féminins par
 * défaut — manche, donne, partie — mais le Mölkky compte des lancers.
 */
function roundWords(game) {
  const label = (game.roundLabel ?? 'Manche').toLowerCase();
  const masculin = game.roundLabelGender === 'm';
  return {
    label,
    la: masculin ? 'le' : 'la',
    ce: masculin ? 'ce' : 'cette',
    jouee: masculin ? 'joué' : 'jouée',
    enregistree: masculin ? 'enregistré' : 'enregistrée',
    modifiee: masculin ? 'modifié' : 'modifiée',
  };
}

/** Range la partie en cours dans l'historique. Depuis le bandeau ou depuis le
 *  bas de l'écran : c'est le même geste. */
async function archiverPartie() {
  const match = store.state.match;
  if (!match) return;
  if (match.rounds.length === 0) return toast('Aucune manche à archiver.', 'warn');
  const game = getGame(match.gameId);
  const tetes = winners(match, game);
  const issue = tetes.length > 1
    ? `${nomsEt(tetes)} sont à égalité avec ${tetes[0].total} points.`
    : `${tetes[0].player.name} gagne avec ${tetes[0].total} points.`;
  if (!(await confirmDialog(`Archiver la partie ? ${issue}`, { okLabel: 'Archiver' }))) return;
  store.update((s) => {
    s.history.push({ ...s.match, finished: true, draft: null });
    s.match = null;
  });
  backStack.length = 0;
  show('home', { push: false });
}

/** « Ana », « Ana et Cy », « Ana, Bo et Cy ». */
function nomsEt(entrees) {
  const noms = entrees.map((e) => e.player.name);
  if (noms.length <= 1) return noms[0] ?? '';
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

/**
 * Ce que le livret prescrit quand l'égalité subsiste. Sans consigne écrite, on
 * ne l'invente pas : on dit qu'il n'y en a pas, et l'égalité reste.
 */
function noteEgalite(match, game) {
  const note = typeof game.tieNote === 'function' ? game.tieNote(match) : game.tieNote;
  return note ?? 'Le livret ne prévoit pas de départage : l’égalité reste.';
}

/** Les joueurs à égalité qui n'ont pas encore répondu à la question du livret. */
function departageAFaire(match, game, tetes) {
  const ask = game.tieBreakAsk?.(match);
  if (!ask || tetes.length < 2) return null;
  const manquants = tetes.filter((e) => !Number.isFinite(Number(match.tieData?.[e.player.id])));
  return manquants.length > 0 ? ask : null;
}

/**
 * Le formulaire qui applique le départage du livret : une valeur par joueur à
 * égalité, demandée seulement le jour où l'égalité survient.
 */
function formDepartage(match, game, tetes, ask) {
  const saisie = {};
  const champs = tetes.map((e) => el('label', { class: 'tie-field' }, [
    el('span', { text: e.player.name }),
    el('input', {
      type: 'number',
      inputmode: 'numeric',
      min: ask.min ?? 0,
      max: ask.max ?? 99,
      placeholder: '0',
      oninput: (ev) => { saisie[e.player.id] = ev.target.value; },
    }),
  ]));

  return el('div', { class: 'tie-ask' }, [
    el('strong', { text: `${nomsEt(tetes)} sont à égalité avec ${tetes[0].total} points` }),
    el('span', { class: 'small', text: ask.hint }),
    el('span', { class: 'small tie-label', text: `${ask.label} :` }),
    el('div', { class: 'tie-grid' }, champs),
    el('button', {
      class: 'btn btn-primary btn-block',
      type: 'button',
      onclick: () => {
        const brut = tetes.map((e) => saisie[e.player.id]);
        if (brut.some((v) => v == null || v === '' || !Number.isFinite(Number(v)))) {
          return toast('Indiquez la valeur de chaque joueur à égalité.', 'warn');
        }
        store.update((s) => {
          s.match.tieData = { ...(s.match.tieData ?? {}) };
          tetes.forEach((e) => { s.match.tieData[e.player.id] = Number(saisie[e.player.id]); });
        });
      },
    }, 'Départager'),
  ]);
}

/**
 * Le seuil de fin est-il une convention de table, qu'on peut repousser ?
 *
 * Il l'est dès que le jeu propose plusieurs valeurs : 250 points au Papayoo,
 * 1000 à la belote, on les choisit avant de commencer et rien n'empêche de
 * jouer au-delà. Quand le jeu n'en propose qu'une, c'est une règle et non un
 * accord : les 50 points du Mölkky se font pile, les dépasser renvoie à 25.
 */
function prolongeable(match, game) {
  if (game.finished?.(match)) return false;
  return (endModeOf(match, game).choices ?? []).length > 1;
}

/**
 * Une correction ou une suppression peut ramener la partie en deçà de ce qui
 * était convenu. Elle redevient alors une partie ordinaire : le jour où la
 * barre sera franchie à nouveau, la question sera reposée.
 */
function oublierProlongation(match, game) {
  if (match.prolonge && !isOver(match, game)) match.prolonge = false;
}

function renderBanner(match, game) {
  const host = clear($('#match-banner'));
  if (!isOver(match, game)) return;
  const board = standings(match, game);
  const raison = endModeOf(match, game).id === 'rounds'
    ? `${roundsLabel(game, match.target)} ${roundWords(game).jouee}${match.target > 1 ? 's' : ''}.`
    : `Objectif ${match.target} atteint.`;

  // Plusieurs joueurs en tête : le livret ne les départage pas, ou pas encore.
  const tetes = board.filter((e) => e.rank === 1);
  const egalite = tetes.length > 1;

  // La partie continue au-delà de ce qui était convenu : on ne proclame pas un
  // vainqueur à chaque manche, on rappelle qui mène et pourquoi ça dure.
  if (match.prolonge) {
    host.append(
      el('div', { class: 'banner banner-soft' }, [
        el('strong', {
          text: egalite
            ? `${nomsEt(tetes)} sont à égalité avec ${tetes[0].total} points`
            : `${board[0].player.name} mène avec ${board[0].total} points`,
        }),
        el('span', {
          class: 'small',
          text: `${raison} Vous avez choisi de continuer : la partie s'arrêtera quand vous l'archiverez.`,
        }),
      ]),
    );
    return;
  }

  // Le livret prévoit un départage, mais il repose sur une information que le
  // décompte ne contient pas : on la demande, plutôt que de trancher au hasard.
  const ask = departageAFaire(match, game, tetes);
  if (ask) {
    host.append(el('div', { class: 'banner' }, [formDepartage(match, game, tetes, ask)]));
    return;
  }

  const peutContinuer = prolongeable(match, game);
  host.append(
    el('div', { class: 'banner' }, [
      el('strong', {
        text: egalite
          ? `🤝 ${nomsEt(tetes)} sont à égalité avec ${tetes[0].total} points`
          : `🏆 ${board[0].player.name} gagne avec ${board[0].total} points`,
      }),
      egalite && el('span', { class: 'small', text: noteEgalite(match, game) }),
      el('span', {
        class: 'small',
        text: peutContinuer
          ? `${raison} À vous de voir si la partie s'arrête là.`
          : `${raison} Vous pouvez archiver la partie en bas de l'écran.`,
      }),
      // Revenir sur une valeur mal tapée : sans ça, une faute de frappe
      // désignerait un vainqueur sans appel.
      Object.keys(match.tieData ?? {}).length > 0 && el('button', {
        class: 'btn btn-ghost btn-block',
        type: 'button',
        onclick: () => store.update((s) => { s.match.tieData = {}; }),
      }, 'Refaire le départage'),
      peutContinuer && el('div', { class: 'banner-actions' }, [
        el('button', {
          class: 'btn btn-primary',
          type: 'button',
          onclick: archiverPartie,
        }, 'Terminer la partie'),
        el('button', {
          class: 'btn btn-ghost',
          type: 'button',
          onclick: () => store.update((s) => { s.match.prolonge = true; }),
        }, 'Continuer à jouer'),
      ]),
    ].filter(Boolean)),
  );
}

function renderScoreboard(match, game) {
  renderBoard($('#scoreboard'), match, game, game.roundLabel ?? 'Manche');
}

/** Tableau des scores : partie en cours ou partie archivée, même rendu. */
function renderBoard(table, match, game, label) {
  clear(table);
  const board = standings(match, game);
  const t = totals(match);
  const initiale = label[0].toUpperCase();
  // Un lancer par manche au Mölkky : une colonne par manche ferait quarante
  // colonnes. Ces jeux-là n'affichent que les totaux.
  const parManche = game.compactBoard !== true;

  const head = el('thead');
  head.append(el('tr', {}, [
    el('th', { text: '#' }),
    el('th', { text: game.participantLabel ?? 'Joueur' }),
    ...(parManche ? match.rounds.map((_, i) => el('th', { class: 'num', text: `${initiale}${i + 1}` })) : []),
    el('th', { class: 'num total-col', text: 'Total' }),
  ]));
  table.append(head);

  const body = el('tbody');
  board.forEach((entry) => {
    const p = entry.player;
    // Le jeu peut qualifier un joueur d'un mot : au Mölkky, ses ratés en
    // cours et son élimination, qui ne se lisent pas dans le total.
    const statut = game.playerStatus?.(p, match);
    body.append(el('tr', { class: statut?.tone === 'danger' ? 'is-out' : '' }, [
      el('td', { class: 'rank', text: String(entry.rank) }),
      el('td', {}, [
        el('span', { class: 'dot', style: { background: p.color } }),
        el('span', { text: p.name }),
        statut && el('span', { class: `pill pill-${statut.tone ?? 'muted'}`, text: statut.text }),
      ].filter(Boolean)),
      ...(parManche ? match.rounds.map((r) => el('td', { class: 'num muted', text: String(r.scores[p.id] ?? 0) })) : []),
      el('td', { class: 'num total-col', text: String(t[p.id]) }),
    ]));
  });
  table.append(body);
}

function renderRoundPanel(match, game) {
  const { draft } = match;
  const editing = draft.editingRoundId != null;
  const index = editing
    ? match.rounds.findIndex((r) => r.id === draft.editingRoundId) + 1
    : match.rounds.length + 1;

  const label = game.roundLabel ?? 'Manche';
  const mots = roundWords(game);
  $('#round-title').textContent = editing ? `Modifier ${mots.la} ${mots.label} ${index}` : `${label} ${index}`;
  $('#btn-validate').textContent = editing
    ? 'Enregistrer les modifications'
    : `Valider ${mots.la} ${mots.label}`;
  $('#round-history-title').textContent = `Les ${mots.label}s`;

  // La bascule Cartes/Points n'a de sens que si le jeu propose des jetons.
  $('#mode-switch').hidden = !game.supportsTokens;
  // La lecture photo suppose des scores à recopier : sans objet sur un formulaire.
  $('#btn-scan').hidden = game.entry === 'form';
  for (const btn of $$('#mode-switch button')) {
    btn.classList.toggle('is-active', btn.dataset.mode === draft.mode);
  }
  const form = game.entry === 'form';
  $('#entry-form').hidden = !form;
  $('#entry-tokens').hidden = form || draft.mode !== 'tokens';
  $('#entry-manual').hidden = form || draft.mode !== 'manual';

  renderExtras(match, game);
  refreshStatus(match, game);

  if (form) renderForm(match, game);
  else if (draft.mode === 'tokens') renderTokens(match, game, draftScores(match, game));
  else renderManual(match, game);
}

/**
 * Saisie d'une donne décrite par le jeu (Tarot) : le score n'est pas tapé,
 * il est calculé à partir de ces champs.
 */
function renderForm(match, game) {
  const host = clear($('#entry-form'));
  const { form } = match.draft;

  const setField = (key, value) => store.update((s) => { s.match.draft.form[key] = value; });

  // La saisie en cours est passée au jeu : au Barbu, les champs demandés
  // dépendent du contrat qu'on vient de choisir.
  for (const field of game.form(match.players.length, match.players, match.rounds, form, match.options ?? {})) {
    const block = el('div', { class: 'extra' }, [
      el('strong', { class: 'extra-label', text: field.label }),
      field.hint && el('span', { class: 'muted small', text: field.hint }),
    ]);

    if (field.type === 'note') {
      // Champ purement informatif : le bloc porte déjà le titre et le texte.
      host.append(block);
      continue;
    }

    if (field.type === 'players') {
      // Une ligne par joueur, avec les mêmes colonnes numériques pour tous
      // (au Skull King : mise, plis réalisés, bonus).
      // Une colonne unique tient sur une ligne par joueur : la grille reste
      // lisible sans faire défiler un écran entier par contrat. Au-delà de
      // quatre colonnes, on resserre les cases pour limiter les retours.
      const densite = field.columns.length === 1 ? ' is-single'
        : field.columns.length > 4 ? ' is-dense' : '';
      const grille = el('div', { class: `player-grid${densite}` });
      for (const p of match.players) {
        const cellules = field.columns.map((col) => el('label', { class: 'grid-cell' }, [
          el('span', { class: 'grid-cap', text: col.label }),
          el('input', {
            type: 'number',
            inputmode: 'numeric',
            min: col.min,
            max: typeof col.max === 'function' ? col.max(match, form) : col.max,
            step: '1',
            value: form[field.key]?.[p.id]?.[col.key] ?? '',
            placeholder: col.placeholder ?? '0',
            oninput: (e) => {
              const cible = store.state.match.draft.form;
              cible[field.key] ??= {};
              cible[field.key][p.id] ??= {};
              cible[field.key][p.id][col.key] = e.target.value;
              refreshStatus(store.state.match, game);
            },
            onchange: () => store.touch(),
          }),
        ]));
        grille.append(
          el('div', { class: 'player-grid-row' }, [
            el('div', { class: 'grid-name' }, [
              el('span', { class: 'dot', style: { background: p.color } }),
              el('span', { text: p.name }),
            ]),
            el('div', { class: 'grid-cells' }, cellules),
          ]),
        );
      }
      block.append(grille);
    } else if (field.type === 'number') {
      block.append(el('input', {
        type: 'number',
        inputmode: 'decimal',
        min: field.min,
        max: field.max,
        step: field.step ?? 1,
        value: form[field.key] ?? '',
        placeholder: '0',
        // Comme la saisie manuelle : on écrit dans l'état sans re-rendre le
        // champ, sinon le clavier se referme à chaque touche.
        oninput: (e) => {
          store.state.match.draft.form[field.key] = e.target.value;
          refreshStatus(store.state.match, game);
        },
        onchange: () => store.touch(),
      }));
    } else {
      const options = field.type === 'player'
        ? match.players.map((p) => ({ value: p.id, label: p.name, color: p.color }))
        : field.options;

      // Un bonus peut se partager : aux Aventuriers du Rail, le plus long
      // chemin revient à tous les ex æquo. Ces champs-là acceptent plusieurs
      // réponses, et chaque appui ajoute ou retire.
      const multiple = field.multiple === true;
      const choisis = multiple ? (Array.isArray(form[field.key]) ? form[field.key] : []) : null;
      const actif = (value) => (multiple ? choisis.includes(value) : form[field.key] === value);

      const chips = el('div', { class: 'chip-row' });
      for (const option of options) {
        chips.append(
          el('button', {
            class: `chip${actif(option.value) ? ' is-active' : ''}${option.color ? ' player-chip' : ''}`,
            type: 'button',
            style: option.color ? { '--chip-color': option.color } : {},
            onclick: () => (multiple
              ? setField(field.key, choisis.includes(option.value)
                ? choisis.filter((v) => v !== option.value)
                : [...choisis, option.value])
              : setField(field.key, option.value)),
          }, [
            option.color && el('span', { class: 'dot', style: { background: option.color } }),
            el('span', { text: option.label }),
          ].filter(Boolean)),
        );
      }
      block.append(chips);
    }
    host.append(block);
  }
}

/** Informations propres au jeu, demandées avant de valider (ex. qui a fermé). */
function renderExtras(match, game) {
  const host = clear($('#round-extras'));
  for (const extra of game.extras ?? []) {
    if (extra.type !== 'player') continue;
    const chips = el('div', { class: 'chip-row player-chips' });
    for (const p of match.players) {
      chips.append(
        el('button', {
          class: `chip player-chip${match.draft.extras?.[extra.key] === p.id ? ' is-active' : ''}`,
          type: 'button',
          style: { '--chip-color': p.color },
          onclick: () => store.update((s) => {
            const current = s.match.draft.extras ?? (s.match.draft.extras = {});
            // Deuxieme appui sur le meme joueur : on annule le choix.
            current[extra.key] = current[extra.key] === p.id ? null : p.id;
          }),
        }, [
          el('span', { class: 'dot', style: { background: p.color } }),
          el('span', { text: p.name }),
        ]),
      );
    }
    host.append(
      el('div', { class: 'extra' }, [
        el('strong', { class: 'extra-label', text: extra.label }),
        el('span', { class: 'muted small', text: extra.hint }),
        chips,
      ]),
    );
  }
}

/** Bandeau de controle : validation du jeu + effets calcules (doublement...). */
/** Contexte transmis aux règles du jeu : saisies annexes, variantes, historique. */
function roundContext(match) {
  return { extras: match.draft.extras, options: match.options ?? {}, rounds: match.rounds };
}

function refreshStatus(match, game) {
  const input = roundInput(match, game);
  const ctx = roundContext(match);
  const check = game.validateRound(input, match.players, ctx);
  const notes = check.ok && game.finalize ? game.finalize(input, ctx, match.players).notes : [];

  const texte = [check.message, ...notes].filter(Boolean).join(' ');
  const surFormulaire = game.entry === 'form';

  // Sur un formulaire long, le bandeau du haut sort de l'écran pendant la
  // saisie : on n'affiche alors que celui de la barre collante, toujours visible.
  const status = $('#round-status');
  status.hidden = surFormulaire;
  status.textContent = texte;
  status.dataset.level = check.ok ? 'ok' : 'warn';

  const resume = $('#round-result');
  resume.hidden = !surFormulaire || !texte;
  resume.textContent = texte;
  resume.dataset.level = check.ok ? 'ok' : 'warn';
  return check;
}

function renderTokens(match, game, scores) {
  const { draft } = match;
  const host = clear($('#entry-tokens'));

  const chips = el('div', { class: 'chip-row player-chips' });
  for (const p of match.players) {
    chips.append(
      el('button', {
        class: `chip player-chip${draft.activePlayerId === p.id ? ' is-active' : ''}`,
        type: 'button',
        style: { '--chip-color': p.color },
        onclick: () => store.update((s) => { s.match.draft.activePlayerId = p.id; }),
      }, [
        el('span', { class: 'dot', style: { background: p.color } }),
        el('span', { text: p.name }),
        el('strong', { class: 'chip-score', text: String(scores[p.id] ?? 0) }),
      ]),
    );
  }
  host.append(chips);

  const assigned = Object.keys(draft.assign).length;
  host.append(el('p', {
    class: 'muted small',
    text: assigned === game.tokens.length
      ? 'Toutes les cartes sont attribuées.'
      : `Touchez le joueur, puis ses cartes ramassées. ${game.tokens.length - assigned} carte(s) restante(s).`,
  }));

  const grid = el('div', { class: 'token-grid' });
  for (const token of game.tokens) {
    const ownerId = draft.assign[token.id];
    const owner = match.players.find((p) => p.id === ownerId);
    grid.append(
      el('button', {
        class: `token${token.kind === 'papayoo' ? ' token-special' : ''}${owner ? ' is-taken' : ''}`,
        type: 'button',
        style: owner ? { '--token-color': owner.color } : {},
        'aria-label': token.kind === 'papayoo' ? 'Papayoo, 40 points' : `Payoo ${token.value}`,
        onclick: () => toggleToken(token, ownerId),
      }, [
        el('span', { class: 'token-value', text: token.kind === 'papayoo' ? 'Papayoo' : token.label }),
        el('span', { class: 'token-owner', text: owner ? initials(owner.name) : '' }),
      ]),
    );
  }
  host.append(grid);
}

function toggleToken(token, ownerId) {
  store.update((s) => {
    const draft = s.match.draft;
    const active = draft.activePlayerId ?? s.match.players[0].id;
    if (ownerId === active) delete draft.assign[token.id];
    else draft.assign[token.id] = active;
  });
}

function renderManual(match, game) {
  const { draft } = match;
  const host = clear($('#entry-manual'));

  for (const p of match.players) {
    const input = el('input', {
      type: 'number',
      inputmode: 'numeric',
      min: game.allowsNegative ? null : '0',
      step: '1',
      value: draft.scores[p.id] ?? '',
      placeholder: '0',
      // On écrit directement dans l'état pendant la frappe : re-rendre le
      // champ à chaque touche ferait perdre le focus et le clavier mobile.
      // La sauvegarde disque a lieu au blur, sans notification.
      oninput: (e) => {
        store.state.match.draft.scores[p.id] = e.target.value;
        refreshManualStatus();
      },
      onchange: () => store.touch(),
    });

    const shortcuts = (game.quickAdd ?? []).map((shortcut) =>
      el('button', {
        class: 'mini-btn',
        type: 'button',
        title: shortcut.title,
        onclick: () => store.update((s) => {
          const cur = Number(s.match.draft.scores[p.id] || 0);
          s.match.draft.scores[p.id] = String(cur + shortcut.value);
        }),
      }, shortcut.label));

    // Compter en tapotant suppose de pouvoir se corriger : remise a zero.
    if (shortcuts.length > 0) {
      shortcuts.push(el('button', {
        class: 'mini-btn mini-btn-quiet',
        type: 'button',
        title: 'Remettre ce score a zero',
        onclick: () => store.update((s) => { s.match.draft.scores[p.id] = '0'; }),
      }, '\u21ba'));
    }

    // Le pave numerique des telephones n'a pas de signe moins : on inverse
    // d'un bouton plutot que d'esperer que le clavier coopere.
    if (game.allowsNegative) {
      shortcuts.push(el('button', {
        class: 'mini-btn',
        type: 'button',
        title: 'Inverser le signe',
        onclick: () => store.update((s) => {
          const cur = Number(s.match.draft.scores[p.id] || 0);
          s.match.draft.scores[p.id] = String(-cur);
        }),
      }, '\u00b1'));
    }

    host.append(
      el('div', { class: 'score-row' }, [
        el('span', { class: 'dot', style: { background: p.color } }),
        el('span', { class: 'score-name', text: p.name }),
        shortcuts.length > 0 &&
          el('div', { class: `score-shortcuts${shortcuts.length > 2 ? ' is-wide' : ''}` }, shortcuts),
        input,
      ]),
    );
  }

  // Raccourci "il ne reste qu'un joueur à remplir" : le bouton reste dans le
  // DOM et son état est rafraîchi à chaque frappe, sans re-rendre les champs.
  remainderBtn = el('button', {
    class: 'btn btn-ghost btn-block',
    type: 'button',
    hidden: true,
    onclick: () => {
      if (!remainderTarget) return;
      store.update((s) => { s.match.draft.scores[remainderTarget.id] = String(remainderTarget.points); });
    },
  });
  host.append(remainderBtn);
  refreshRemainder();
}

let remainderBtn = null;
let remainderTarget = null;

function refreshRemainder() {
  const match = store.state.match;
  if (!remainderBtn || !match || match.draft.mode !== 'manual') return;
  const game = getGame(match.gameId);
  const { draft } = match;

  // Sans total de manche fixe (Skyjo), il n'y a pas de « reste » a attribuer.
  if (!game.roundTotal) {
    remainderTarget = null;
    remainderBtn.hidden = true;
    return;
  }

  const filled = match.players.reduce((sum, p) => sum + (Number(draft.scores[p.id]) || 0), 0);
  const remaining = game.roundTotal - filled;
  const empty = match.players.filter((p) => draft.scores[p.id] === '' || draft.scores[p.id] == null);

  if (empty.length === 1 && remaining > 0) {
    remainderTarget = { id: empty[0].id, points: remaining };
    remainderBtn.textContent = `Attribuer les ${remaining} points restants à ${empty[0].name}`;
    remainderBtn.hidden = false;
  } else {
    remainderTarget = null;
    remainderBtn.hidden = true;
  }
}

/** Met à jour le bandeau de contrôle sans re-rendre les inputs (garde le focus). */
function refreshManualStatus() {
  const match = store.state.match;
  refreshStatus(match, getGame(match.gameId));
  refreshRemainder();
}

/**
 * Comment une manche se présente dans les listes. Un jeu peut la nommer par ce
 * qui s'y est joué plutôt que par son rang (au Barbu, le contrat annoncé) et
 * remplacer la ligne de scores par un résumé qui lui convient mieux (au
 * Mölkky, où tous les autres joueurs sont à zéro).
 */
function roundLine(game, round, index, match) {
  const label = game.roundLabel ?? 'Manche';
  const propre = game.roundLine?.(round, index, match) ?? {};
  return {
    title: propre.title ?? `${label} ${index + 1}`,
    detail: propre.detail
      ?? match.players.map((p) => `${p.name} ${round.scores[p.id] ?? 0}`).join(' · '),
  };
}

function renderRoundHistory(match, game) {
  const host = clear($('#round-history'));
  const label = game.roundLabel ?? 'Manche';
  if (match.rounds.length === 0) {
    const mots = roundWords(game);
    host.append(el('p', {
      class: 'muted small',
      text: `Aucun${mots.la === 'la' ? 'e' : ''} ${mots.label} pour le moment.`,
    }));
    return;
  }
  match.rounds.forEach((round, i) => {
    const ligne = roundLine(game, round, i, match);
    host.append(
      el('div', { class: 'row' }, [
        el('button', {
          class: 'row-main row-button',
          type: 'button',
          onclick: () => editRound(round.id),
        }, [
          el('strong', { text: ligne.title }),
          el('span', { class: 'muted small', text: ligne.detail }),
        ]),
        el('button', {
          class: 'icon-btn',
          type: 'button',
          'aria-label': `Supprimer : ${label} ${i + 1}`,
          onclick: async () => {
            const mots = roundWords(game);
            if (await confirmDialog(`Supprimer ${mots.ce} ${mots.label} (${i + 1}) ?`, { okLabel: 'Supprimer', danger: true })) {
              store.update((s) => {
                s.match.rounds = s.match.rounds.filter((r) => r.id !== round.id);
                replay(s.match, game);
                oublierProlongation(s.match, game);
                if (s.match.draft.editingRoundId === round.id) {
                  s.match.draft = makeDraft(game, s.match.players, s.match.rounds, s.match.draft.mode);
                }
              });
              toast(`${label} supprimé${roundWords(game).la === 'la' ? 'e' : ''}.`);
            }
          },
        }, '×'),
      ]),
    );
  });
}

function editRound(roundId) {
  const match = store.state.match;
  const game = getGame(match.gameId);
  const round = match.rounds.find((r) => r.id === roundId);
  if (!round) return;
  store.update((s) => {
    s.match.draft = {
      ...makeDraft(game, s.match.players, s.match.rounds),
      mode: round.mode,
      // On recharge la saisie d'origine, pas le résultat après application des
      // règles : sinon une correction ré-appliquerait le doublement.
      ...(game.entry === 'form'
        ? { form: { ...(round.raw ?? {}) } }
        : {
          scores: Object.fromEntries(s.match.players.map(
            (p) => [p.id, String((round.raw ?? round.scores)[p.id] ?? 0)],
          )),
        }),
      assign: { ...(round.assign ?? {}) },
      extras: { ...(round.extras ?? {}) },
      editingRoundId: roundId,
    };
  });
  $('.round-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function validateRound() {
  const match = store.state.match;
  const game = getGame(match.gameId);
  const { draft } = match;
  const label = game.roundLabel ?? 'Manche';
  const input = roundInput(match, game);
  const ctx = roundContext(match);
  const check = game.validateRound(input, match.players, ctx);

  if (!check.ok) {
    const ok = await confirmDialog(
      `${check.message}\n\nEnregistrer quand même cette manche ?`,
      { okLabel: 'Enregistrer' },
    );
    if (!ok) return;
  }

  // `raw` garde la saisie telle quelle — points tapés, ou description de la
  // donne au Tarot ; `scores` porte le résultat après application des règles
  // du jeu. Sans cette distinction, rouvrir une manche pour la corriger
  // rejouerait l'effet (le doublement du Skyjo, par exemple).
  const raw = game.entry === 'form'
    ? { ...input }
    : Object.fromEntries(match.players.map((p) => [p.id, Number(input[p.id]) || 0]));
  const final = game.finalize ? game.finalize(raw, ctx, match.players) : { scores: raw, notes: [] };

  store.update((s) => {
    const payload = {
      mode: draft.mode,
      scores: final.scores,
      raw,
      // Ce que le jeu veut retenir de cette manche pour la suivante
      // (à la belote : les points laissés en litige).
      meta: final.meta ?? null,
      assign: { ...draft.assign },
      extras: { ...draft.extras },
    };
    if (draft.editingRoundId) {
      Object.assign(s.match.rounds.find((r) => r.id === draft.editingRoundId), payload);
    } else {
      s.match.rounds.push({ id: makeRoundId(), ...payload });
    }
    // Au Mölkky, corriger un lancer change tous les suivants : on rejoue.
    replay(s.match, game);
    oublierProlongation(s.match, game);
    s.match.draft = makeDraft(game, s.match.players, s.match.rounds, draft.mode);
  });

  // Une notification doit se lire d'un coup d'œil : les explications longues
  // restent dans le panneau et dans l'historique.
  const note = final.notes?.[0];
  const mots = roundWords(game);
  const defaut = `${label} ${draft.editingRoundId ? mots.modifiee : mots.enregistree}.`;
  toast(note && note.length <= 90 ? note : defaut, 'ok');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Lecture IA ------------------------------------------------------------

function openScan() {
  scanState = { mode: 'scoresheet', image: null, playerId: store.state.match?.players[0]?.id ?? null, busy: false, result: null };
  show('scan');
}

function renderScan() {
  const match = store.state.match;
  if (!match) return show('home', { push: false });
  const game = getGame(match.gameId);
  const cardsMode = game.vision?.cards;

  // Le mode « cartes » dépend du jeu : au Papayoo on photographie les cartes
  // ramassées, au Skyjo la grille de fin de manche.
  if (!cardsMode && scanState.mode === 'cards') scanState.mode = 'scoresheet';
  for (const btn of $$('#scan-mode button')) {
    if (btn.dataset.scan === 'cards') {
      btn.hidden = !cardsMode;
      btn.textContent = cardsMode?.label ?? 'Cartes';
    }
    btn.classList.toggle('is-active', btn.dataset.scan === scanState.mode);
  }
  // L'indice doit dire ce qui va se passer, et pour qui.
  const cible = match.players.find((p) => p.id === scanState.playerId);
  $('#scan-hint').textContent = scanState.mode === 'cards'
    ? (cardsMode?.hint ?? '').replace('{joueur}', cible?.name ?? 'ce joueur')
    : 'Photographiez la feuille de scores manuscrite : chaque ligne lue vous sera proposée avant report.';

  $('#scan-cards-target').hidden = scanState.mode !== 'cards';
  const select = clear($('#scan-player'));
  for (const p of match.players) {
    select.append(el('option', { value: p.id, selected: p.id === scanState.playerId }, p.name));
  }

  const preview = $('#scan-preview');
  preview.hidden = !scanState.image;
  if (scanState.image) preview.src = scanState.image.dataUrl;
  $('#scan-label').textContent = scanState.image ? 'Changer de photo' : 'Prendre la photo';

  // Ce qu'il reste de lectures, dit avant la photo plutôt qu'après : personne
  // ne doit cadrer une grille pour apprendre ensuite qu'il ne peut pas la lire.
  const quota = quotaPhoto(store.state);
  const note = $('#scan-quota');
  note.hidden = quota.premium;
  if (!quota.premium) {
    note.textContent = quota.restantes > 0
      ? `Il vous reste ${quota.restantes} lecture${quota.restantes > 1 ? 's' : ''} sur ${quota.offertes} ce mois-ci.`
      : `Vos ${quota.offertes} lectures du mois sont utilisées. Le compteur repart le mois prochain — la version complète les débloque tout de suite.`;
    note.classList.toggle('quota-vide', quota.restantes === 0);
  }

  const run = $('#btn-run-scan');
  run.disabled = !scanState.image || scanState.busy || quota.restantes === 0;
  run.textContent = scanState.busy ? 'Lecture en cours…' : 'Lire les cartes et calculer';

  renderScanResult(match);
}

function renderScanResult(match) {
  const host = clear($('#scan-result'));
  const result = scanState.result;
  if (!result) return;

  host.append(el('p', {
    class: 'status',
    dataset: { level: result.confidence === 'low' ? 'warn' : 'ok' },
    text: `${result.notes || 'Lecture terminée.'} (fiabilité : ${{ high: 'bonne', medium: 'moyenne', low: 'faible' }[result.confidence] ?? result.confidence})`,
  }));

  if (result.detected === 'cards') {
    const cardsMode = getGame(match.gameId).vision?.cards ?? {};
    const values = result.cards?.values ?? [];
    // Le modèle lit ce qui est écrit sur la carte ; c'est le jeu qui sait le
    // convertir en points (au 6 qui prend, un numéro vaut 1 à 7 têtes de bœuf).
    const toPoints = cardsMode.mapValue ?? ((v) => v);
    const label = cardsMode.mapLabel ?? ((v) => String(v));
    // On additionne nous-mêmes plutôt que de faire confiance à un total calculé
    // par le modèle : les valeurs lues sont vérifiables à l'œil, pas la somme.
    const total = values.reduce((sum, v) => sum + toPoints(v), 0);
    const player = match.players.find((p) => p.id === scanState.playerId);
    host.append(
      el('div', { class: 'result-card' }, [
        el('strong', { text: `${player?.name ?? 'Joueur'} : ${total} point${Math.abs(total) > 1 ? 's' : ''}` }),
        el('span', { class: 'muted small', text: `${values.length} carte${values.length > 1 ? 's' : ''} lue${values.length > 1 ? 's' : ''} : ${values.map(label).join(', ') || 'aucune'}` }),
        result.cards?.detail && el('span', { class: 'muted small', text: result.cards.detail }),
      ]),
    );
    host.append(el('button', {
      class: 'btn btn-primary btn-block',
      type: 'button',
      disabled: values.length === 0,
      onclick: () => applyCards(total),
    }, `Reporter ${total} pour ${player?.name ?? 'ce joueur'}`));
    return;
  }

  if (result.detected !== 'scoresheet' || result.rounds.length === 0) {
    host.append(el('p', { class: 'muted small', text: "Aucune carte reconnue sur cette photo. Réessayez avec un cadrage plus net, ou saisissez le score à la main." }));
    return;
  }

  for (const [i, round] of result.rounds.entries()) {
    const mapped = round.scores.map((entry) => ({
      player: matchPlayer(entry.player, match.players),
      raw: entry.player,
      points: entry.points,
    }));
    const unknown = mapped.filter((m) => !m.player);
    const sum = mapped.reduce((a, m) => a + m.points, 0);

    host.append(
      el('div', { class: 'result-card' }, [
        el('strong', { text: round.label || `Manche ${i + 1}` }),
        el('span', { class: 'muted small', text: mapped.map((m) => `${m.player?.name ?? m.raw} ${m.points}`).join(' · ') }),
        el('span', { class: 'muted small', text: `Total lu : ${sum}${round.cumulative ? ' (scores cumulés)' : ''}` }),
        unknown.length > 0 &&
          el('span', { class: 'status', dataset: { level: 'warn' }, text: `Nom non reconnu : ${unknown.map((m) => m.raw).join(', ')}` }),
        round.cumulative &&
          el('span', { class: 'status', dataset: { level: 'warn' }, text: 'Ces nombres semblent être des totaux cumulés, pas des points de manche.' }),
        el('button', {
          class: 'btn btn-ghost',
          type: 'button',
          disabled: unknown.length > 0,
          onclick: () => applySheetRound(mapped),
        }, 'Charger dans la manche en cours'),
      ]),
    );
  }
}

function applyCards(total) {
  store.update((s) => {
    s.match.draft.mode = 'manual';
    s.match.draft.scores[scanState.playerId] = String(total);
  });
  toast('Score reporté. Vérifiez avant de valider.', 'ok');
  back();
}

function applySheetRound(mapped) {
  store.update((s) => {
    s.match.draft.mode = 'manual';
    for (const m of mapped) {
      if (m.player) s.match.draft.scores[m.player.id] = String(m.points);
    }
  });
  toast('Manche chargée. Vérifiez avant de valider.', 'ok');
  back();
}

async function runScan() {
  const match = store.state.match;
  const game = getGame(match.gameId);
  if (!scanState.image) return;
  if (quotaPhoto(store.state).restantes === 0) {
    return toast(`Vos ${LECTURES_OFFERTES} lectures du mois sont utilisées.`, 'warn');
  }

  scanState.busy = true;
  scanState.result = null;
  renderScan();

  try {
    const result = await scan({
      image: scanState.image,
      mode: scanState.mode,
      game,
      players: match.players.map((p) => p.name),
      settings: store.state.settings.ai,
    });
    scanState.result = result;
    // Une lecture n'est décomptée qu'une fois obtenue : une panne de réseau ou
    // un refus du serveur ne doit rien coûter à quelqu'un qui n'a rien reçu.
    store.update((st) => consommerLecture(st));
  } catch (error) {
    toast(error.message, 'warn');
  } finally {
    scanState.busy = false;
    renderScan();
  }
}

// --- Règles ----------------------------------------------------------------

/** Ouvre l'écran règles pour un jeu, en reprenant l'effectif du contexte. */
function openRules(game = activeGame()) {
  const match = store.state.match;
  const count = match && match.gameId === game.id ? match.players.length : rulesState.playerCount;
  rulesState = {
    gameId: game.id,
    playerCount: Math.min(Math.max(count, game.minPlayers), game.maxPlayers),
    step: -1,
    speaking: false,
    paused: false,
  };
  show('rules');
}

function renderRules() {
  const game = getGame(rulesState.gameId);
  // Les variantes ne changent pas que le calcul : aux Aventuriers du Rail,
  // c'est toute la mise en place qui diffère d'une boîte à l'autre.
  rulesState.options ??= {};
  for (const option of game.options ?? []) {
    rulesState.options[option.key] ??= option.options[0].value;
  }
  const steps = game.setup(rulesState.playerCount, rulesState.options);

  $('#rules-title').textContent = game.name;
  $('#rules-pitch').textContent = game.pitch;

  const variantes = clear($('#rules-options'));
  for (const option of game.options ?? []) {
    const chips = el('div', { class: 'chip-row' });
    for (const choix of option.options) {
      chips.append(el('button', {
        class: `chip${rulesState.options[option.key] === choix.value ? ' is-active' : ''}`,
        type: 'button',
        onclick: () => { stopSpeech(); rulesState.options[option.key] = choix.value; renderRules(); },
      }, choix.label));
    }
    variantes.append(el('div', { class: 'field' }, [
      el('label', { text: option.label }),
      chips,
    ]));
  }

  // Effectif : change le nombre de cartes distribuées et la taille de l'écart.
  const counts = clear($('#setup-count'));
  for (let n = game.minPlayers; n <= game.maxPlayers; n += 1) {
    counts.append(
      el('button', {
        class: `chip${rulesState.playerCount === n ? ' is-active' : ''}`,
        type: 'button',
        onclick: () => {
          stopSpeech();
          rulesState.playerCount = n;
          renderRules();
        },
      }, String(n)),
    );
  }

  // Commandes de lecture : masquées si le navigateur ne sait pas parler.
  const available = speech.supported;
  $('#btn-say-pitch').hidden = !available;
  $('#btn-say-setup').hidden = !available;
  $('#btn-say-stop').hidden = !available || !rulesState.speaking;
  $('#btn-say-setup').textContent = !rulesState.speaking
    ? '▶️ Écouter la mise en place'
    : rulesState.paused
      ? '▶️ Reprendre'
      : '⏸️ Pause';

  const note = $('#speech-note');
  note.hidden = available;
  if (!available) note.textContent = "La lecture à voix haute n'est pas disponible sur ce navigateur. Les étapes restent lisibles ci-dessous.";

  const list = clear($('#setup-steps'));
  steps.forEach((step, i) => {
    list.append(
      el('li', { class: `step${rulesState.step === i ? ' is-speaking' : ''}` }, [
        el('div', { class: 'step-head' }, [
          el('strong', { text: step.title }),
          available && el('button', {
            class: 'mini-btn',
            type: 'button',
            'aria-label': `Écouter l'étape : ${step.title}`,
            onclick: () => saySteps([step.say], i),
          }, '🔊'),
        ]),
        el('span', { class: 'step-body', text: step.say }),
      ]),
    );
  });

  const host = clear($('#rules-body'));
  for (const section of game.rules) {
    host.append(el('div', { class: 'result-card' }, [
      el('strong', { text: section.title }),
      el('span', { class: 'muted small', text: section.body }),
    ]));
  }
}

// Jeton de lecture : démarrer ou arrêter une lecture invalide les callbacks
// de la précédente, qui arrivent en différé.
let sayRun = 0;

/**
 * Lit une liste de textes à voix haute.
 * @param {string[]} texts
 * @param {number} offset index de la première étape mise en surbrillance (-1 = aucune)
 */
function saySteps(texts, offset = 0) {
  const run = (sayRun += 1);
  const finish = (message) => {
    if (run !== sayRun) return;
    rulesState.speaking = false;
    rulesState.paused = false;
    rulesState.step = -1;
    if (message) toast(message, 'warn');
    if (current === 'rules') renderRules();
  };

  speech.speak(texts, {
    onStep: (i) => {
      if (run !== sayRun) return;
      rulesState.speaking = true;
      rulesState.paused = false;
      rulesState.step = offset < 0 ? -1 : offset + i;
      renderRules();
      // On ne fait défiler que si l'étape lue est sortie de l'écran : sinon la
      // page bougerait sous les doigts à chaque phrase.
      const node = rulesState.step >= 0 ? $('#setup-steps')?.children[rulesState.step] : null;
      if (node) {
        const box = node.getBoundingClientRect();
        const hidden = box.top < 70 || box.bottom > window.innerHeight - 20;
        if (hidden) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },
    onEnd: () => finish(),
    onError: () => finish("La lecture à voix haute a échoué sur ce navigateur."),
  });
}

function stopSpeech() {
  if (!speech.supported) return;
  sayRun += 1;
  speech.stop();
  rulesState.speaking = false;
  rulesState.paused = false;
  rulesState.step = -1;
}

// --- Carnet de joueurs -----------------------------------------------------

function renderPeople() {
  const people = carnet(store.state);
  const records = recordsByPerson(archives(store.state));
  const host = clear($('#people-list'));

  if (people.length === 0) {
    host.append(el('p', { class: 'muted small', text: 'Personne pour le moment.' }));
    return;
  }

  // Les plus assidus d'abord ; à égalité, par ordre alphabétique.
  const classes = [...people].sort((a, b) => {
    const ja = records.get(a.id)?.games ?? 0;
    const jb = records.get(b.id)?.games ?? 0;
    return jb - ja || a.name.localeCompare(b.name, 'fr');
  });

  for (const person of classes) {
    const rec = records.get(person.id);
    const parJeu = rec
      ? [...rec.byGame.entries()].sort((a, b) => b[1].games - a[1].games)
      : [];

    host.append(
      el('div', { class: 'row person-row' }, [
        el('span', { class: 'dot', style: { background: person.color } }),
        el('div', { class: 'person-main' }, [
          el('strong', { text: person.name }),
          rec
            ? el('div', { class: 'person-record' }, [
              el('span', {
                class: `tag${rec.wins > 0 ? ' tag-win' : ''}`,
                text: `${rec.wins} victoire${rec.wins > 1 ? 's' : ''} sur ${rec.games} partie${rec.games > 1 ? 's' : ''}`,
              }),
              ...parJeu.map(([gameId, stat]) => el('span', {
                class: 'tag',
                text: `${getGame(gameId).name} ${stat.wins}/${stat.games}`,
              })),
            ])
            : el('span', { class: 'muted small', text: 'Aucune partie archivée pour le moment.' }),
        ]),
        el('button', {
          class: 'icon-btn',
          type: 'button',
          'aria-label': `Retirer ${person.name} du carnet`,
          onclick: async () => {
            const ok = await confirmDialog(
              `Retirer ${person.name} du carnet ? Les parties déjà archivées gardent son nom et son palmarès.`,
              { okLabel: 'Retirer', danger: true },
            );
            if (!ok) return;
            store.update((s) => { supprimer(s.people, person.id); });
          },
        }, '×'),
      ]),
    );
  }
}

// --- Parties archivées -----------------------------------------------------

/** Une ligne de la liste des parties, cliquable vers le détail. */
function matchRow(past) {
  const game = getGame(past.gameId);
  const board = standings(past, game);
  const tetes = board.filter((e) => e.rank === 1);
  return el('button', {
    class: 'row row-button',
    type: 'button',
    onclick: () => { detailId = past.id; show('match-detail'); },
  }, [
    el('div', { class: 'row-main' }, [
      el('strong', {
        text: `${game.name} · ${nomsEt(tetes)}${tetes.length > 1 ? ' à égalité' : ' gagne'}`,
      }),
      el('span', {
        class: 'muted small',
        text: `${formatDate(past.updatedAt)} · ${board.map((r) => `${r.player.name} ${r.total}`).join(' · ')}`,
      }),
    ]),
  ]);
}

function renderHistory() {
  const host = clear($('#history-full'));
  const history = archives(store.state);
  if (history.length === 0) {
    host.append(el('p', { class: 'muted small', text: 'Aucune partie archivée pour le moment.' }));
    return;
  }
  for (const past of [...history].reverse()) host.append(matchRow(past));
}

function renderMatchDetail() {
  const past = archives(store.state).find((h) => h.id === detailId);
  if (!past) return show('history', { push: false });
  const game = getGame(past.gameId);
  const board = standings(past, game);
  const label = game.roundLabel ?? 'Manche';

  const tetes = board.filter((e) => e.rank === 1);
  $('#detail-title').textContent =
    `${game.name} — ${nomsEt(tetes)}${tetes.length > 1 ? ' à égalité' : ' gagne'}`;
  $('#detail-sub').textContent =
    `${formatDate(past.updatedAt)} · ${roundsLabel(game, past.rounds.length)} · `
    + (endModeOf(past, game).id === 'rounds' ? `partie en ${roundsLabel(game, past.target)}` : `objectif ${past.target} points`)
    // La table a joué au-delà : le sous-titre le dit, sinon le nombre de
    // manches semblerait contredire l'objectif annoncé.
    + (past.prolonge ? ', prolongée' : '');

  renderBoard($('#detail-board'), past, game, label);

  const rounds = clear($('#detail-rounds'));
  past.rounds.forEach((round, i) => {
    const ligne = roundLine(game, round, i, past);
    rounds.append(el('div', { class: 'row' }, [
      el('div', { class: 'row-main' }, [
        el('strong', { text: ligne.title }),
        el('span', { class: 'muted small', text: ligne.detail }),
      ]),
    ]));
  });
}

// --- Réglages --------------------------------------------------------------

function renderSettings() {
  const ai = store.state.settings.ai;
  for (const btn of $$('#ai-mode button')) btn.classList.toggle('is-active', btn.dataset.ai === ai.mode);
  $('#ai-server-fields').hidden = ai.mode !== 'server';
  $('#ai-direct-fields').hidden = ai.mode !== 'direct';
  $('#ai-server-url').value = ai.serverUrl ?? '';
  $('#ai-key').value = ai.apiKey ?? '';
  renderPremium();
}

/**
 * L'état de la version complète, et ce qu'il reste du mois.
 *
 * L'interrupteur est provisoire : il tient la place du reçu du store, qui ne
 * peut exister qu'une fois l'appli empaquetée. Tout le reste de l'appli lit
 * `settings.premium` sans savoir d'où il vient — le jour venu, il n'y aura que
 * cette source à remplacer.
 */
function renderPremium() {
  const host = clear($('#premium-state'));
  const quota = quotaPhoto(store.state);

  host.append(
    el('p', {
      class: 'muted small',
      text: quota.premium
        ? 'Version complète active : lecture photo sans limite.'
        : `Version gratuite : ${quota.offertes} lectures photo par mois, dont ${quota.utilisees} utilisée${quota.utilisees > 1 ? 's' : ''} ce mois-ci. Tout le reste de l’appli est sans limite.`,
    }),
    el('button', {
      class: 'btn btn-ghost btn-block',
      type: 'button',
      onclick: () => {
        store.update((st) => { st.settings.premium = !st.settings.premium; });
        toast(store.state.settings.premium ? 'Version complète activée.' : 'Version gratuite rétablie.', 'ok');
      },
    }, quota.premium ? 'Revenir à la version gratuite' : 'Activer la version complète'),
    el('p', {
      class: 'muted small',
      text: 'Cet interrupteur est provisoire : il tiendra lieu d’achat tant que l’appli n’est pas publiée sur les stores.',
    }),
  );
}

// --- Câblage ---------------------------------------------------------------

function wire() {
  $('#btn-back').addEventListener('click', back);
  $('#btn-settings').addEventListener('click', () => show('settings'));

  $('#btn-add-player').addEventListener('click', () => {
    setupDraft.names.push('');
    renderSetup();
  });
  $('#btn-start').addEventListener('click', startMatch);

  $('#mode-switch').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    const match = store.state.match;
    const game = getGame(match.gameId);
    const nextMode = btn.dataset.mode;
    store.update((s) => {
      if (nextMode === 'manual' && s.match.draft.mode === 'tokens') {
        const derived = draftScores(match, game);
        s.match.draft.scores = Object.fromEntries(
          match.players.map((p) => [p.id, derived[p.id] ? String(derived[p.id]) : '']),
        );
      }
      s.match.draft.mode = nextMode;
    });
  });

  $('#btn-validate').addEventListener('click', validateRound);
  $('#btn-scan').addEventListener('click', openScan);

  $('#btn-clear-round').addEventListener('click', async () => {
    if (!(await confirmDialog('Effacer la saisie en cours ?', { okLabel: 'Effacer' }))) return;
    const match = store.state.match;
    store.update((s) => { s.match.draft = makeDraft(getGame(match.gameId), s.match.players, s.match.rounds); });
  });

  $('#btn-finish').addEventListener('click', archiverPartie);

  $('#btn-abandon').addEventListener('click', async () => {
    if (!(await confirmDialog('Abandonner la partie en cours ? Les scores seront perdus.', { okLabel: 'Abandonner', danger: true }))) return;
    store.update((s) => { s.match = null; });
    backStack.length = 0;
    show('home', { push: false });
  });

  $('#scan-mode').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-scan]');
    if (!btn) return;
    scanState.mode = btn.dataset.scan;
    scanState.result = null;
    renderScan();
  });

  $('#scan-player').addEventListener('change', (e) => {
    scanState.playerId = e.target.value;
    renderScan();   // l'indice nomme le joueur : il doit suivre
  });

  $('#scan-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      scanState.image = await prepareImage(file);
      scanState.result = null;
    } catch {
      toast("Impossible de lire cette image.", 'warn');
    }
    renderScan();
  });

  $('#btn-run-scan').addEventListener('click', runScan);

  $('#ai-mode').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-ai]');
    if (!btn) return;
    store.update((s) => { s.settings.ai.mode = btn.dataset.ai; });
  });
  $('#ai-server-url').addEventListener('change', (e) => {
    store.update((s) => { s.settings.ai.serverUrl = e.target.value.trim(); });
    toast('Serveur enregistré.', 'ok');
  });
  $('#ai-key').addEventListener('change', (e) => {
    store.update((s) => { s.settings.ai.apiKey = e.target.value.trim(); });
    toast('Clé enregistrée sur cet appareil.', 'ok');
  });

  /** Copie de travail, pour simuler un import sans rien changer. */
  const clonerDonnees = (state) => ({
    history: JSON.parse(JSON.stringify(state.history)),
    people: JSON.parse(JSON.stringify(state.people)),
  });

  /** « 2 parties ajoutées », « 1 joueur ajouté » : le genre du mot compte. */
  const bilanPhrase = (bilan, singulier, pluriel, feminin = false) => {
    const bouts = [];
    const s_ = bilan.ajoutes > 1 ? 's' : '';
    const e_ = feminin ? 'e' : '';
    if (bilan.ajoutes) bouts.push(`${bilan.ajoutes} ${bilan.ajoutes > 1 ? pluriel : singulier} ajouté${e_}${s_}`);
    if (bilan.remplaces) bouts.push(`${bilan.remplaces} mis à jour`);
    if (bilan.ignores) bouts.push(`${bilan.ignores} déjà à jour`);
    return bouts.length ? `${bouts.join(', ')}.` : '';
  };

  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exporter(store.state), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: 'scores-jeux-de-societe.json' });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  $('#import-input').addEventListener('change', async (e) => {
    const fichier = e.target.files?.[0];
    // Le champ garde le fichier choisi : sans ça, réimporter le même deux fois
    // de suite ne déclencherait rien la seconde.
    e.target.value = '';
    if (!fichier) return;

    let contenu;
    try {
      contenu = JSON.parse(await fichier.text());
    } catch {
      return toast('Fichier illisible : ce n’est pas du JSON.', 'warn');
    }

    // On calcule d'abord ce que ça changerait, on le montre, et on n'applique
    // qu'après accord : un import silencieux sur des données qu'on ne peut pas
    // annuler serait une mauvaise surprise.
    const essai = importer(contenu, clonerDonnees(store.state));
    if (!essai.ok) return toast(essai.message, 'warn');

    const total = essai.parties.ajoutes + essai.parties.remplaces
      + essai.joueurs.ajoutes + essai.joueurs.remplaces;
    if (total === 0) return toast('Rien de nouveau dans ce fichier.', 'ok');

    const resume = [
      bilanPhrase(essai.parties, 'partie', 'parties', true),
      bilanPhrase(essai.joueurs, 'joueur', 'joueurs'),
    ].filter(Boolean).join('\n');

    if (!(await confirmDialog(`Importer ce fichier ?\n\n${resume}`, { okLabel: 'Importer' }))) return;

    let bilan;
    store.update((s) => { bilan = importer(contenu, s); });
    toast(`Import terminé : ${bilan.parties.ajoutes + bilan.parties.remplaces} partie(s), `
      + `${bilan.joueurs.ajoutes + bilan.joueurs.remplaces} joueur(s).`, 'ok');
    show('home', { push: false });
  });

  $('#btn-wipe').addEventListener('click', async () => {
    if (!(await confirmDialog('Effacer toutes les parties et les réglages ?', { okLabel: 'Tout effacer', danger: true }))) return;
    store.reset();
    backStack.length = 0;
    show('home', { push: false });
  });

  $('#btn-rules').addEventListener('click', () => openRules());

  $('#btn-people').addEventListener('click', () => show('people'));
  $('#btn-history').addEventListener('click', () => show('history'));

  const champPerson = $('#new-person');
  const ajouter = () => {
    if (addPerson(champPerson.value)) champPerson.value = '';
    renderPeople();
  };
  $('#btn-add-person').addEventListener('click', ajouter);
  champPerson.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); ajouter(); }
  });

  $('#btn-delete-match').addEventListener('click', async () => {
    const ok = await confirmDialog("Supprimer cette partie de l'historique ?", { okLabel: 'Supprimer', danger: true });
    if (!ok) return;
    store.update((s) => { supprimer(s.history, detailId); });
    back();
  });

  $('#btn-say-pitch').addEventListener('click', () => saySteps([getGame(rulesState.gameId).pitch], -1));
  $('#btn-say-setup').addEventListener('click', () => {
    if (rulesState.speaking) {
      // On met en pause le temps de mélanger, puis on reprend où on en était.
      if (rulesState.paused) speech.resume();
      else speech.pause();
      rulesState.paused = !rulesState.paused;
      renderRules();
      return;
    }
    const game = getGame(rulesState.gameId);
    saySteps(game.setup(rulesState.playerCount).map((step) => `${step.title}. ${step.say}`), 0);
  });
  $('#btn-say-stop').addEventListener('click', () => { stopSpeech(); renderRules(); });

  store.subscribe(() => render());
}

// --- Démarrage -------------------------------------------------------------

wire();
show(store.state.match ? 'match' : 'home', { push: false });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Certains contextes (page servie en bac à sable, fichier unique) refusent
    // l'enregistrement de façon synchrone : l'appli doit continuer sans.
    try {
      navigator.serviceWorker.register('sw.js').catch(() => { /* hors-ligne indisponible */ });
    } catch { /* hors-ligne indisponible */ }
  });
}
