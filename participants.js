import { fighterCopy, openingCopy } from './presentation-copy.js';
import { createEpisode } from './episode.js';
import { createGame } from './game.js';

const card = document.getElementById('card');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
let scenes = [], fighters = [], tournament = null, tournamentFailed = false, index = 0;
let rules, metadata, episode = null, gamePlayer = null;
const params = new URLSearchParams(location.search);
const kindNames = { llm: 'Language model', system_one: 'System One', human: 'Human', engine: 'The judge' };
const money = (n) => n == null ? 'Not disclosed' : '$' + (Number.isInteger(n) ? n : n.toFixed(2));
const contextSize = (n) => !n ? 'Not disclosed' : n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : Math.round(n / 1000) + 'K';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  // Children may nest lists (a move in figurines is a list of pieces and text).
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}

function logo(player) {
  if (player.kind === 'human') {
    const span = el('span', { class: 'logo human-logo', 'aria-hidden': 'true' });
    span.innerHTML = '<svg viewBox="0 0 80 80" fill="currentColor" aria-hidden="true"><circle cx="40" cy="25" r="13"/><path d="M13 70v-7c0-15 12-25 27-25s27 10 27 25v7z"/></svg>';
    return span;
  }
  // A white disc with the mark inset, so square logos are not clipped by the circle.
  const key = player.id.startsWith('llm:') ? player.id.slice(4).split('/')[0] : player.id;
  return el('span', { class: 'logo', 'aria-hidden': 'true' }, el('img', { src: 'logos/' + key + '.png', alt: '', width: 160, height: 160,
    onerror: (e) => e.target.replaceWith(el('span', { class: 'logo-fallback' }, player.name[0])) }));
}

// A link to the game player that keeps the page's tournament and recording mode.
function gameHref(round, board) {
  const query = new URLSearchParams(location.search);
  query.delete('round');
  query.set('game', round + '-' + board);
  return './?' + query;
}

// Pairing cards for one round; once the round is published, each board opens its replay in a new tab.
function pairingList(pairs, round, published, player) {
  return el('ol', { class: 'pairings' }, pairs.map((pair, i) => {
    const board = pair.board || i + 1;
    const white = player(pair.white), black = player(pair.black);
    const content = [el('span', { class: 'board-number' }, 'BOARD ' + String(board).padStart(2, '0')),
      el('div', { class: 'pair-side' }, logo(white), el('strong', {}, white.name)),
      el('span', { class: 'versus' }, 'vs'),
      el('div', { class: 'pair-side' }, logo(black), el('strong', {}, black.name))];
    return el('li', {}, published ? el('a', { class: 'pairing', href: gameHref(round, board), target: '_blank', rel: 'noopener' }, content) : el('div', { class: 'pairing' }, content));
  }));
}

function heading(kicker, title, description) {
  return el('header', { class: 'scene-heading' }, el('p', { class: 'eyebrow' }, kicker),
    el('h1', { tabindex: '-1' }, title), description && el('p', { class: 'lede' }, description));
}

function fighterScene(player) {
  const number = fighters.indexOf(player) + 1;
  const [alias, line, stamp, roast, wink] = fighterCopy[player.id] || ['The challenger', 'A new face. The same unforgiving board.', 'Game on'];
  const type = player.kind;
  const mainValue = type === 'human' ? String(player.rating?.value || 'Unrated') :
    type === 'system_one' ? money(player.price_input_per_mtok) : money(player.price_output_per_mtok);
  const metricLabel = type === 'human' ? (player.rating?.site || 'Chess') + ' rating' :
    type === 'system_one' ? 'Input price / 1M tokens' : 'Output price / 1M tokens';
  const maxPrice = Math.max(...fighters.map((p) => p.price_output_per_mtok || 0), 1);
  return el('div', { class: 'fighter-layout ' + type + (number % 2 ? ' odd' : ' even') },
    el('div', { class: 'fighter-identity' },
      el('p', { class: 'eyebrow' }, 'In this corner / ' + String(number).padStart(2, '0')),
      el('p', { class: 'fighter-alias' }, alias),
      el('h1', { tabindex: '-1' }, player.name),
      el('p', { class: 'maker' }, [player.company, player.country].filter(Boolean).join(' / ') || 'Team human'),
      el('p', { class: 'fighter-line' }, line),
      roast && el('p', { class: 'fighter-roast' }, roast),
      wink && el('p', { class: 'fighter-wink' }, wink),
      el('ul', { class: 'tags' }, el('li', {}, kindNames[type]),
        type === 'llm' && el('li', {}, player.reasoning ? 'Thinking on' : 'Thinking off'),
        player.open_weights === true && el('li', {}, 'Open weights'))),
    el('div', { class: 'fighter-poster' },
      el('div', { class: 'logo-medallion' }, logo(player)),
      el('span', { class: 'stamp' }, stamp),
      el('div', { class: 'fighter-ticket' },
        el('p', { class: 'eyebrow' }, metricLabel), el('p', { class: 'big-metric' }, mainValue),
        type === 'llm' && el('div', { class: 'price-track', 'aria-hidden': 'true' },
          el('span', { style: '--amount:' + ((player.price_output_per_mtok || 0) / maxPrice) })),
        type === 'llm' && el('p', { class: 'ticket-note' }, 'Input: ' + money(player.price_input_per_mtok) + ' / 1M tokens · Context: ' + contextSize(player.context_tokens)),
        // A System One model answers with a choice, not text, so there is no output to pay for.
        type === 'system_one' && el('p', { class: 'ticket-note' }, 'Output: $0. Typed choices, no text generation.'))));
}

function renderScene(scene) {
  if (scene.episode) return episode.render(scene);
  if (scene.game) return gamePlayer.render(scene);
  if (scene.type === 'fighter') return fighterScene(scene.player);
  if (scene.id === 'cover') {
    const cover = metadata.participants.find((p) => p.kind === 'cover');
    return el('div', { class: 'cover-layout' },
      el('div', { class: 'cover-copy' }, heading('An extremely serious chess showdown', 'Big brains.\nSmall squares.', 'The hype stops here. The pawns have questions.')),
      el('div', { class: 'cover-art' },
        el('img', { src: cover?.image || 'cover.webp', srcset: 'cover-600.webp 600w, cover.webp 1200w, cover-1536.webp 1536w', sizes: '(max-width: 760px) 100vw, 55vw', alt: cover?.image_alt || 'Two rival pawns face off on a chessboard.', width: 1536, height: 1024, fetchpriority: 'high' })));
  }
  if (scene.id === 'intro') {
    return el('div', { class: 'intro-layout' },
      heading('Trying to make sense of AI', 'Everyone is #1.'),
      el('ul', { class: 'hype-wall', 'aria-label': 'The hype, contradictions and questions' },
        openingCopy.phrases.map((phrase, i) => el('li', { class: 'hype-label', style: '--entry:' + i }, phrase))),
      el('p', { class: 'scene-caption' }, 'Rankings, promises, doubts. And another model tomorrow.'));
  }
  if (scene.id === 'confusion') {
    return el('div', { class: 'confusion-layout' },
      heading('My very technical conclusion', openingCopy.punchline),
      el('p', { class: 'lede' }, 'So let’s stop asking them questions.'));
  }
  if (scene.id === 'arena') {
    const { kicker, title, lede, versus } = openingCopy.arena;
    return el('div', { class: 'arena-layout' },
      heading(kicker, title, lede),
      el('div', { class: 'arena-versus' }, versus.map(([name, points], i) => el('section', { class: i ? 'arena-board' : 'arena-bench' },
        el('h2', {}, name), el('ul', {}, points.map((p) => el('li', {}, p)))))));
  }
  if (scene.id === 'rules') {
    return el('div', { class: 'rules-layout' }, heading('The rules / short version', 'Less talk.\nMore chess.', 'Every model gets the position, the move history and the legal moves. Then it has to choose.'),
      el('ol', { class: 'rule-steps' },
        el('li', {}, el('span', { class: 'step-number', 'aria-hidden': 'true' }, '01'), el('div', { class: 'mini-board', 'aria-hidden': 'true' }, Array.from({ length: 64 }, (_, i) => el('span', { class: (Math.floor(i / 8) + i) % 2 ? 'dark-square' : '' }))), el('h2', {}, 'Read the room.'), el('p', {}, 'Here’s the board. And every legal move.')),
        el('li', {}, el('span', { class: 'step-number', 'aria-hidden': 'true' }, '02'), el('div', { class: 'move-options', 'aria-hidden': 'true' }, el('span', {}, 'e4'), el('span', {}, 'd4'), el('strong', {}, 'Nf3')), el('h2', {}, 'Pick your fight.'), el('p', {}, 'Choose one move. Two illegal answers lose the game.')),
        el('li', {}, el('span', { class: 'step-number', 'aria-hidden': 'true' }, '03'), el('div', { class: 'judge-mark', 'aria-hidden': 'true' }, '?!'), el('h2', {}, 'Own the consequences.'), el('p', {}, 'Stockfish evaluates the moves afterwards.'))),
      // Next slams the stamp onto the rules before moving on.
      rules.stamp && el('p', { class: 'rubber-stamp who-cares', 'data-step': '' }, rules.stamp));
  }
  if (scene.id === 'disclaimer') {
    const { kicker, title, lede, fine } = openingCopy.disclaimer;
    return el('div', { class: 'confusion-layout disclaimer-layout' }, heading(kicker, title, lede), el('p', { class: 'fine-print' }, fine));
  }
  if (scene.id === 'neutral') {
    const { kicker, title, lede, bribes, offers, verdict } = openingCopy.neutral;
    return el('div', { class: 'confusion-layout neutral-layout' }, heading(kicker, title, lede),
      el('div', { class: 'neutral-slot' },
        el('p', { class: 'rubber-stamp bribes', 'data-step': '' }, bribes),
        el('p', { class: 'offers', 'data-step': '' }, offers[0], el('strong', {}, offers[1]))),
      el('p', { class: 'verdict', 'data-step': '' }, verdict));
  }
  if (scene.type === 'judge') {
    const { kicker, title, lede, punch, stamp, marks } = openingCopy.judge;
    return el('div', { class: 'judge-layout' },
      el('div', {}, heading(kicker, title, lede), el('p', { class: 'judge-punch' }, punch)),
      el('div', { class: 'judge-poster' },
        el('div', { class: 'judge-id' }, logo(scene.player), el('h2', {}, scene.player.name)),
        el('p', { class: 'rubber-stamp judge-stamp' }, stamp),
        el('dl', { class: 'marks' }, marks.map(([mark, name, gloss]) => el('div', {}, el('dt', {}, mark), el('dd', {}, el('strong', {}, name), ' ', gloss))))));
  }
  if (scene.id === 'lineup') {
    return el('div', { class: 'lineup-layout' }, heading('The whole questionable bunch', 'Pick your favourite.'),
      el('ul', { class: 'roster' }, fighters.map((p, i) => el('li', {}, el('a', { href: '#' + encodeURIComponent(p.id) },
        el('span', { class: 'roster-number' }, String(i + 1).padStart(2, '0')), logo(p),
        el('span', {}, el('strong', {}, p.name), el('small', {}, fighterCopy[p.id]?.[0] || kindNames[p.kind])))))));
  }
  // Opening pairings remain the closing scene even after later rounds are published.
  const firstRound = tournament?.rounds?.find((r) => r.number === 1);
  const opening = firstRound ? { number: 1, pairings: firstRound.games, bye: firstRound.bye } :
    tournament?.next?.number === 1 ? tournament.next : null;
  const players = new Map(fighters.map((p) => [p.id, p]));
  return el('div', { class: 'matchups-layout' }, heading('The opening bell', 'Enough talk.\nChoose a side.'),
    opening?.pairings?.length ? pairingList(opening.pairings, 1, !!firstRound,
      (id) => players.get(id) || { id, name: tournament.players[id]?.name || id }) : el('div', { class: 'pairings-state' }, el('h2', {}, tournamentFailed ? 'The matchups missed their cue.' : 'The draw is still backstage.'),
      el('p', {}, tournamentFailed ? 'The tournament could not be loaded. The introductions are still available.' : 'Pairings will appear here when they are published.'),
      tournamentFailed && el('button', { class: 'text-button', type: 'button', onclick: () => location.reload() }, 'Try again')),
    opening?.bye && el('p', {}, 'Bye: ' + (players.get(opening.bye)?.name || opening.bye)));
}

function go(target, updateHash = true) {
  const old = index;
  index = Math.max(0, Math.min(scenes.length - 1, target));
  if (updateHash && index === old) return;
  const scene = scenes[index];
  const focusInScene = card.contains(document.activeElement);
  if (updateHash) history.pushState(null, '', '#' + encodeURIComponent(scene.id));
  card.className = 'scene scene-' + scene.type;
  card.style.setProperty('--direction', index >= old ? '20px' : '-20px');
  card.replaceChildren(renderScene(scene));
  if (index < old) card.querySelectorAll('[data-step]').forEach((s) => s.classList.add('shown'));
  episode?.mountBoards(card);
  scene.mount?.(card, index < old);
  card.scrollTop = 0;
  card.setAttribute('aria-busy', 'false');
  if (focusInScene) card.querySelector('h1')?.focus({ preventScroll: true });
  next.setAttribute('aria-label', index === 0 ? 'Start presentation' : index === scenes.length - 1 ? 'Done: end of presentation' : 'Next scene');
  syncTransport();
  document.getElementById('next-label').textContent = index === 0 ? 'Start' : index === scenes.length - 1 ? 'Done' : 'Next';
  document.title = scene.label + ' · AI chess battle presentation';
}

// Scenes can hold [data-step] parts that Next reveals one at a time before moving on.
function step(delta) {
  // A scene with its own stepper (the game player) consumes Next/Previous until it runs out.
  if (scenes[index].step?.(delta)) return syncTransport();
  const parts = [...card.querySelectorAll('[data-step]')];
  const shown = parts.filter((p) => p.classList.contains('shown'));
  if (delta > 0 && shown.length < parts.length) parts[shown.length].classList.add('shown');
  else if (delta < 0 && shown.length) shown.at(-1).classList.remove('shown');
  else return go(index + delta);
  syncTransport();
}

function syncTransport() {
  const pending = card.querySelector('[data-step]:not(.shown)');
  prev.disabled = index === 0 && !card.querySelector('[data-step].shown');
  next.disabled = index === scenes.length - 1 && !pending;
}

function followHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = 'intro'; }
  // Keep the existing numeric participant links working.
  if (/^[1-9]\d*$/.test(id)) id = fighters[Number(id) - 1]?.id || 'intro';
  const target = scenes.findIndex((s) => s.id === id);
  go(target < 0 ? 0 : target, false);
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Data unavailable');
  return response.json();
}

async function main() {
  try {
    metadata = await loadJSON('data/participants.json');
    if (!Array.isArray(metadata.participants) || !metadata.participants.length) throw new Error('No participants');
    // Short names on stage: "Qwen3.8 Max (0902)" becomes "Qwen3.8 Max", "Gemini 3.1 Pro Preview" becomes "Gemini 3.1 Pro".
    for (const p of metadata.participants) p.name = p.name.replace(/\s*\([^)]*\)$/, '').replace(/ Preview$/, '');
    fighters = metadata.participants.filter((p) => ['llm', 'system_one', 'human'].includes(p.kind));
    if (!fighters.length) throw new Error('No participants');
    rules = metadata.participants.find((p) => p.kind === 'rules') || { kind: 'rules', rules: [], description: 'Rules have not been published.' };
  } catch {
    card.setAttribute('aria-busy', 'false');
    card.replaceChildren(el('div', { class: 'state' }, heading('A small technical knockout', 'The cast is missing.', 'The participant data is empty or could not be loaded.'),
      el('button', { class: 'primary-button', type: 'button', onclick: () => location.reload() }, 'Try again'), el('a', { class: 'text-button', href: 'tournament.html' }, 'Back to the tournament')));
    return;
  }
  try {
    const list = await loadJSON('data/tournaments.json');
    const wanted = params.get('t');
    const selected = wanted ? list.find((t) => t.id === wanted) : list[0];
    if (wanted && !selected) throw new Error('Tournament unavailable');
    if (selected) {
      tournament = await loadJSON('data/' + encodeURIComponent(selected.id) + '/tournament.json');
      if (!Array.isArray(tournament.rounds) || !tournament.players) throw new Error('Tournament unavailable');
      document.getElementById('tournament-link').href = 'tournament.html#/t/' + tournament.id;
    }
  } catch { tournament = null; tournamentFailed = true; }
  const byId = new Map([...fighters, ...metadata.participants].map((p) => [p.id, p]));
  const player = (id) => byId.get(id) || { id, kind: tournament?.players[id]?.kind, name: tournament?.players[id]?.name || id };
  if (params.has('game') && tournament) {
    gamePlayer = createGame({ el, logo, heading, player });
    try { scenes = await gamePlayer.load(tournament, params.get('game'), loadJSON); }
    catch { scenes = [{ id: 'unavailable', type: 'game-missing', chapter: 'game', label: 'Not available', game: true }]; }
    return followHash();
  }
  // The rounds are always chained: ?round=N starts at round N and carries on to the last published one.
  const published = (tournament?.rounds || []).map((r) => r.number).sort((a, b) => a - b);
  const chainRounds = async (from) => {
    episode = createEpisode({ el, logo, heading, player, pairingList, gameHref });
    const list = [];
    for (const round of published.filter((r) => r >= from)) list.push(...await episode.scenes(tournament, round, loadJSON, { last: round === published.at(-1) }));
    return list;
  };
  const round = Number(params.get('round'));
  if (published.includes(round)) {
    scenes = await chainRounds(round);
    return followHash();
  }
  scenes = [
    { id: 'intro', type: 'intro', chapter: 'opening', label: 'The noise' },
    { id: 'confusion', type: 'confusion', chapter: 'opening', label: 'The confusion' },
    { id: 'arena', type: 'arena', chapter: 'opening', label: 'The idea' },
    { id: 'cover', type: 'cover', chapter: 'opening', label: 'The chessboard' },
    { id: 'rules', type: 'rules', chapter: 'rules', label: 'The rules' },
    { id: 'disclaimer', type: 'disclaimer', chapter: 'rules', label: 'Not science' },
    { id: 'neutral', type: 'neutral', chapter: 'rules', label: 'Neutral' },
    ...metadata.participants.filter((p) => p.kind === 'engine').map((player) => ({ id: player.id, type: 'judge', chapter: 'rules', label: 'The judge', player })),
    ...fighters.map((player) => ({ id: player.id, type: 'fighter', chapter: 'players', label: player.name, player })),
    { id: 'lineup', type: 'lineup', chapter: 'lineup', label: 'The line-up' },
  ];
  // Every published round follows the line-up, one after another; the last one closes with the next pairings, or
  // the bill and the podium once the tournament is over. Before round 1 is out, its matchups close the presentation.
  if (published.length) scenes.push(...await chainRounds(published[0]));
  else scenes.push({ id: 'matchups-r1', type: 'matchups', chapter: 'matchups', label: 'The matchups' });
  followHash();
}

prev.addEventListener('click', () => step(-1));
next.addEventListener('click', () => step(1));
// Recording mode: no navigation chrome and no cursor, for screen captures.
document.body.classList.toggle('recording', params.has('rec'));
addEventListener('hashchange', () => { if (scenes.length) followHash(); });
addEventListener('keydown', (event) => {
  if (!scenes.length || event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest('input, select, textarea, [contenteditable]')) return;
  if (event.key === ' ' && event.target.closest('button, a, summary')) return;
  const steps = { ArrowRight: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, PageUp: -1 };
  if (event.key in steps) { event.preventDefault(); step(steps[event.key]); }
  else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    // Inside the game, Home and End jump to the first and last move; elsewhere, to the first and last scene.
    if (scenes[index].jump) { scenes[index].jump(event.key === 'End'); syncTransport(); }
    else go(event.key === 'Home' ? 0 : scenes.length - 1);
  }
});
const fullscreen = document.getElementById('fullscreen');
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    const notice = document.getElementById('notice');
    notice.textContent = 'Fullscreen is unavailable. You can keep presenting in this window.';
    notice.hidden = false;
  }
});
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen';
  fullscreen.setAttribute('aria-label', label);
  fullscreen.title = label;
});
main();
