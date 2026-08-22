import { GAMES, getGame } from './games/index.js';
import {
  store, makePlayer, makeMatch, makeDraft, makeRoundId,
  totals, standings, isOver, PLAYER_COLORS,
} from './store.js';
import { $, $$, el, clear, toast, initials, confirmDialog, formatDate } from './ui.js';
import { prepareImage, scan, matchPlayer } from './ai.js';

// --- Navigation ------------------------------------------------------------

const TITLES = {
  home: 'Scores',
  setup: 'Nouvelle partie',
  match: 'Partie en cours',
  scan: 'Lecture IA',
  rules: 'Règles',
  settings: 'Réglages',
};

let current = 'home';
const backStack = [];

function show(name, { push = true } = {}) {
  if (push && name !== current) backStack.push(current);
  current = name;
  for (const section of $$('.screen')) section.hidden = section.dataset.screen !== name;
  $('#topbar-title').textContent = TITLES[name] ?? 'Scores';
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
}

// --- Accueil ---------------------------------------------------------------

function renderHome() {
  const { match, history } = store.state;

  const resume = clear($('#home-resume'));
  if (match) {
    const game = getGame(match.gameId);
    const board = standings(match, game);
    resume.append(
      el('button', { class: 'resume-card', type: 'button', onclick: () => show('match') }, [
        el('div', { class: 'resume-top' }, [
          el('span', { class: 'badge', text: 'Reprendre' }),
          el('span', { class: 'muted small', text: `${match.rounds.length} manche${match.rounds.length > 1 ? 's' : ''}` }),
        ]),
        el('strong', { text: `${game.name} — ${match.players.length} joueurs` }),
        el('span', { class: 'muted small', text: board.map((r) => `${r.player.name} ${r.total}`).join(' · ') }),
      ]),
    );
  }

  const list = clear($('#game-list'));
  for (const game of GAMES) {
    list.append(
      el('button', { class: 'game-card', type: 'button', onclick: () => startSetup(game) }, [
        el('span', { class: 'game-emoji', text: '🃏' }),
        el('strong', { text: game.name }),
        el('span', { class: 'muted small', text: game.tagline }),
        el('span', { class: 'muted small', text: `${game.minPlayers} à ${game.maxPlayers} joueurs` }),
      ]),
    );
  }

  const hist = clear($('#history-list'));
  if (history.length === 0) {
    hist.append(el('p', { class: 'muted small', text: 'Aucune partie archivée pour le moment.' }));
  }
  for (const past of [...history].reverse().slice(0, 12)) {
    const game = getGame(past.gameId);
    const board = standings(past, game);
    const winner = board[0];
    hist.append(
      el('div', { class: 'row' }, [
        el('div', { class: 'row-main' }, [
          el('strong', { text: `${game.name} · ${winner.player.name} gagne` }),
          el('span', { class: 'muted small', text: `${formatDate(past.updatedAt)} · ${board.map((r) => `${r.player.name} ${r.total}`).join(' · ')}` }),
        ]),
        el('button', {
          class: 'icon-btn',
          type: 'button',
          'aria-label': 'Supprimer cette partie',
          onclick: async () => {
            if (await confirmDialog('Supprimer cette partie de l\'historique ?', { okLabel: 'Supprimer', danger: true })) {
              store.update((s) => { s.history = s.history.filter((h) => h.id !== past.id); });
            }
          },
        }, '×'),
      ]),
    );
  }
}

// --- Configuration ---------------------------------------------------------

function startSetup(game) {
  const remembered = store.state.lastPlayers;
  const names = remembered.length >= game.minPlayers
    ? remembered.slice(0, game.maxPlayers)
    : ['', '', ''].slice(0, game.minPlayers);
  setupDraft = { gameId: game.id, names, target: game.defaultTarget };
  show('setup');
}

function renderSetup() {
  if (!setupDraft) return show('home', { push: false });
  const game = getGame(setupDraft.gameId);

  $('#setup-game').textContent = game.name;
  const { perPlayer, removed } = game.deal(Math.max(setupDraft.names.length, game.minPlayers));
  $('#setup-hint').textContent =
    `${setupDraft.names.length} joueurs · ${perPlayer} cartes chacun` +
    (removed ? ` · ${removed} cartes retirées` : '');

  const list = clear($('#player-list'));
  setupDraft.names.forEach((name, index) => {
    const input = el('input', {
      type: 'text',
      value: name,
      placeholder: `Joueur ${index + 1}`,
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
            'aria-label': `Retirer le joueur ${index + 1}`,
            onclick: () => { setupDraft.names.splice(index, 1); renderSetup(); },
          }, '×'),
      ]),
    );
  });

  $('#btn-add-player').hidden = setupDraft.names.length >= game.maxPlayers;

  const choices = clear($('#target-choices'));
  for (const value of game.targetChoices) {
    choices.append(
      el('button', {
        class: `chip${setupDraft.target === value ? ' is-active' : ''}`,
        type: 'button',
        onclick: () => { setupDraft.target = value; renderSetup(); },
      }, `${value} pts`),
    );
  }
}

function startMatch() {
  const game = getGame(setupDraft.gameId);
  const names = setupDraft.names.map((n, i) => (n.trim() || `Joueur ${i + 1}`));
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
    toast('Deux joueurs portent le même nom.', 'warn');
    return;
  }
  const players = names.map(makePlayer);
  store.update((s) => {
    s.match = makeMatch(game, players, setupDraft.target);
    s.lastPlayers = names;
  });
  backStack.length = 0;
  backStack.push('home');
  show('match', { push: false });
}

// --- Partie ----------------------------------------------------------------

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

function renderBanner(match, game) {
  const host = clear($('#match-banner'));
  if (!isOver(match, game)) return;
  const board = standings(match, game);
  host.append(
    el('div', { class: 'banner' }, [
      el('strong', { text: `🏆 ${board[0].player.name} gagne avec ${board[0].total} points` }),
      el('span', { class: 'small', text: `Objectif ${match.target} atteint. Vous pouvez archiver la partie en bas de l'écran.` }),
    ]),
  );
}

function renderScoreboard(match, game) {
  const table = clear($('#scoreboard'));
  const board = standings(match, game);
  const t = totals(match);

  const head = el('thead');
  head.append(el('tr', {}, [
    el('th', { text: '#' }),
    el('th', { text: 'Joueur' }),
    ...match.rounds.map((_, i) => el('th', { class: 'num', text: `M${i + 1}` })),
    el('th', { class: 'num total-col', text: 'Total' }),
  ]));
  table.append(head);

  const body = el('tbody');
  board.forEach((entry, rank) => {
    const p = entry.player;
    body.append(el('tr', {}, [
      el('td', { class: 'rank', text: String(rank + 1) }),
      el('td', {}, [
        el('span', { class: 'dot', style: { background: p.color } }),
        el('span', { text: p.name }),
      ]),
      ...match.rounds.map((r) => el('td', { class: 'num muted', text: String(r.scores[p.id] ?? 0) })),
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

  $('#round-title').textContent = editing ? `Modifier la manche ${index}` : `Manche ${index}`;
  $('#btn-validate').textContent = editing ? 'Enregistrer les modifications' : 'Valider la manche';

  for (const btn of $$('#mode-switch button')) {
    btn.classList.toggle('is-active', btn.dataset.mode === draft.mode);
  }
  $('#entry-tokens').hidden = draft.mode !== 'tokens';
  $('#entry-manual').hidden = draft.mode !== 'manual';

  const scores = draftScores(match, game);
  const check = game.validateRound(scores, match.players);
  const status = $('#round-status');
  status.textContent = check.message;
  status.dataset.level = check.ok ? 'ok' : 'warn';

  if (draft.mode === 'tokens') renderTokens(match, game, scores);
  else renderManual(match);
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

function renderManual(match) {
  const { draft } = match;
  const host = clear($('#entry-manual'));

  for (const p of match.players) {
    const input = el('input', {
      type: 'number',
      inputmode: 'numeric',
      min: '0',
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

    host.append(
      el('div', { class: 'score-row' }, [
        el('span', { class: 'dot', style: { background: p.color } }),
        el('span', { class: 'score-name', text: p.name }),
        el('button', {
          class: 'mini-btn',
          type: 'button',
          title: 'Ajouter le Papayoo (40 points)',
          onclick: () => {
            store.update((s) => {
              const cur = Number(s.match.draft.scores[p.id] || 0);
              s.match.draft.scores[p.id] = String(cur + 40);
            });
          },
        }, '+40'),
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

/** Met à jour le bandeau de controle sans re-rendre les inputs (garde le focus). */
function refreshManualStatus() {
  const match = store.state.match;
  const game = getGame(match.gameId);
  const check = game.validateRound(draftScores(match, game), match.players);
  refreshRemainder();
  const status = $('#round-status');
  status.textContent = check.message;
  status.dataset.level = check.ok ? 'ok' : 'warn';
}

function renderRoundHistory(match, game) {
  const host = clear($('#round-history'));
  if (match.rounds.length === 0) {
    host.append(el('p', { class: 'muted small', text: 'Aucune manche enregistrée.' }));
    return;
  }
  match.rounds.forEach((round, i) => {
    const detail = match.players.map((p) => `${p.name} ${round.scores[p.id] ?? 0}`).join(' · ');
    host.append(
      el('div', { class: 'row' }, [
        el('button', {
          class: 'row-main row-button',
          type: 'button',
          onclick: () => editRound(round.id),
        }, [
          el('strong', { text: `Manche ${i + 1}` }),
          el('span', { class: 'muted small', text: detail }),
        ]),
        el('button', {
          class: 'icon-btn',
          type: 'button',
          'aria-label': `Supprimer la manche ${i + 1}`,
          onclick: async () => {
            if (await confirmDialog(`Supprimer la manche ${i + 1} ?`, { okLabel: 'Supprimer', danger: true })) {
              store.update((s) => {
                s.match.rounds = s.match.rounds.filter((r) => r.id !== round.id);
                if (s.match.draft.editingRoundId === round.id) s.match.draft = makeDraft(game, s.match.players);
              });
              toast('Manche supprimée.');
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
      ...makeDraft(game, s.match.players),
      mode: round.mode,
      scores: Object.fromEntries(s.match.players.map((p) => [p.id, String(round.scores[p.id] ?? 0)])),
      assign: { ...(round.assign ?? {}) },
      editingRoundId: roundId,
    };
  });
  $('.round-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function validateRound() {
  const match = store.state.match;
  const game = getGame(match.gameId);
  const scores = draftScores(match, game);
  const check = game.validateRound(scores, match.players);

  if (!check.ok) {
    const ok = await confirmDialog(
      `${check.message}\n\nEnregistrer quand même cette manche ?`,
      { okLabel: 'Enregistrer' },
    );
    if (!ok) return;
  }

  const clean = Object.fromEntries(match.players.map((p) => [p.id, Number(scores[p.id]) || 0]));
  const { draft } = match;

  store.update((s) => {
    if (draft.editingRoundId) {
      const round = s.match.rounds.find((r) => r.id === draft.editingRoundId);
      round.scores = clean;
      round.mode = draft.mode;
      round.assign = { ...draft.assign };
    } else {
      s.match.rounds.push({
        id: makeRoundId(),
        mode: draft.mode,
        scores: clean,
        assign: { ...draft.assign },
      });
    }
    s.match.draft = makeDraft(game, s.match.players);
  });

  toast(draft.editingRoundId ? 'Manche modifiée.' : 'Manche enregistrée.', 'ok');
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

  for (const btn of $$('#scan-mode button')) {
    btn.classList.toggle('is-active', btn.dataset.scan === scanState.mode);
  }

  $('#scan-cards-target').hidden = scanState.mode !== 'cards';
  const select = clear($('#scan-player'));
  for (const p of match.players) {
    select.append(el('option', { value: p.id, selected: p.id === scanState.playerId }, p.name));
  }

  const preview = $('#scan-preview');
  preview.hidden = !scanState.image;
  if (scanState.image) preview.src = scanState.image.dataUrl;
  $('#scan-label').textContent = scanState.image ? 'Changer de photo' : 'Prendre ou choisir une photo';

  const run = $('#btn-run-scan');
  run.disabled = !scanState.image || scanState.busy;
  run.textContent = scanState.busy ? 'Analyse en cours…' : 'Analyser';

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
    const cards = result.cards ?? { payoos: [], papayoo: false, total: 0 };
    const total = cards.payoos.reduce((a, b) => a + b, 0) + (cards.papayoo ? 40 : 0);
    const player = match.players.find((p) => p.id === scanState.playerId);
    host.append(
      el('div', { class: 'result-card' }, [
        el('strong', { text: `${player?.name ?? 'Joueur'} : ${total} points` }),
        el('span', { class: 'muted small', text: `Payoos lus : ${cards.payoos.join(', ') || 'aucun'}${cards.papayoo ? ' + Papayoo (40)' : ''}` }),
        total !== cards.total &&
          el('span', { class: 'muted small', text: `Note : l'IA annonçait ${cards.total}, le total recalculé fait foi.` }),
      ]),
    );
    host.append(el('button', {
      class: 'btn btn-primary btn-block',
      type: 'button',
      onclick: () => applyCards(cards),
    }, 'Reporter ce score dans la manche'));
    return;
  }

  if (result.detected !== 'scoresheet' || result.rounds.length === 0) {
    host.append(el('p', { class: 'muted small', text: "Rien d'exploitable sur cette photo. Réessayez avec un cadrage plus net." }));
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

function applyCards(cards) {
  const total = cards.payoos.reduce((a, b) => a + b, 0) + (cards.papayoo ? 40 : 0);
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

  scanState.busy = true;
  scanState.result = null;
  renderScan();

  try {
    const result = await scan({
      image: scanState.image,
      mode: scanState.mode,
      players: match.players.map((p) => p.name),
      roundTotal: game.roundTotal,
      settings: store.state.settings.ai,
    });
    scanState.result = result;
  } catch (error) {
    toast(error.message, 'warn');
  } finally {
    scanState.busy = false;
    renderScan();
  }
}

// --- Règles ----------------------------------------------------------------

function renderRules() {
  const game = activeGame();
  $('#rules-title').textContent = `${game.name} — règles essentielles`;
  const host = clear($('#rules-body'));
  for (const section of game.rules) {
    host.append(el('div', { class: 'result-card' }, [
      el('strong', { text: section.title }),
      el('span', { class: 'muted small', text: section.body }),
    ]));
  }
}

// --- Réglages --------------------------------------------------------------

function renderSettings() {
  const ai = store.state.settings.ai;
  for (const btn of $$('#ai-mode button')) btn.classList.toggle('is-active', btn.dataset.ai === ai.mode);
  $('#ai-server-fields').hidden = ai.mode !== 'server';
  $('#ai-direct-fields').hidden = ai.mode !== 'direct';
  $('#ai-server-url').value = ai.serverUrl ?? '';
  $('#ai-key').value = ai.apiKey ?? '';
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
    store.update((s) => { s.match.draft = makeDraft(getGame(match.gameId), s.match.players); });
  });

  $('#btn-finish').addEventListener('click', async () => {
    const match = store.state.match;
    if (match.rounds.length === 0) return toast('Aucune manche à archiver.', 'warn');
    const game = getGame(match.gameId);
    const winner = standings(match, game)[0];
    if (!(await confirmDialog(`Archiver la partie ? ${winner.player.name} gagne avec ${winner.total} points.`, { okLabel: 'Archiver' }))) return;
    store.update((s) => {
      s.history.push({ ...s.match, finished: true, draft: null });
      s.match = null;
    });
    backStack.length = 0;
    show('home', { push: false });
  });

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

  $('#scan-player').addEventListener('change', (e) => { scanState.playerId = e.target.value; });

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

  $('#btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: 'scores-jeux-de-societe.json' });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  $('#btn-wipe').addEventListener('click', async () => {
    if (!(await confirmDialog('Effacer toutes les parties et les réglages ?', { okLabel: 'Tout effacer', danger: true }))) return;
    store.reset();
    backStack.length = 0;
    show('home', { push: false });
  });

  $('#btn-rules').addEventListener('click', () => show('rules'));

  store.subscribe(() => render());
}

// --- Démarrage -------------------------------------------------------------

wire();
show(store.state.match ? 'match' : 'home', { push: false });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* hors-ligne indisponible */ });
  });
}
