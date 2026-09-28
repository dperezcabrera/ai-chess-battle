// Game player: ?game=R-B plays board B of round R move by move, from published data only.
import { Chessground } from './vendor/chessground/chessground.min.js';
import { gameComments } from './game-comments.js';
import { figurine } from './figurine.js';

const marks = { inaccuracy: '?!', mistake: '?', blunder: '??' };
const labels = { inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder', best: 'Engine’s choice' };
const endings = { checkmate: 'By checkmate', stalemate: 'By stalemate', 'insufficient material': 'By insufficient material',
  'threefold repetition': 'By repetition', 'repetition (claimable)': 'By repetition', 'fifty-move rule': 'By the fifty-move rule' };
const dollars = (n) => '$' + (n >= 1 ? n.toFixed(2) : n >= 0.01 ? n.toFixed(3) : n.toFixed(4));
// Lichess win chance: how full the advantage bar is for White, from the engine's centipawns.
const whiteShare = (cp) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
// Thinking time as a clock reads it: 45 s, 12:03, 1:02:40.
const clock = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : m ? `${m}:${r}` : `${s} s`; };
const evalText = (e) => !e ? '' : e.mate ? '#' + Math.abs(e.mate) : (e.cp > 0 ? '+' : '') + (e.cp / 100).toFixed(1);

export function createGame({ el, logo, heading, player }) {
  let t, summary, game, ply = 0, ground, view;
  const name = (id) => player(id).name;

  // Resolves "3-1" to the published summary and game file, or explains why it cannot be shown.
  async function load(tournament, param, loadJSON) {
    t = tournament;
    const [round, board] = (param.match(/^(\d+)[-.](\d+)$/) || []).slice(1).map(Number);
    summary = t.rounds.find((r) => r.number === round)?.games.find((g) => g.board === board);
    if (!summary) return [{ id: 'unavailable', type: 'game-missing', chapter: 'game', label: 'Not available', round, board, game: true }];
    game = await loadJSON('data/' + encodeURIComponent(t.id) + '/' + summary.file);
    ply = 0;
    return [
      { id: 'matchup', type: 'game-matchup', chapter: 'matchup', label: 'The matchup' },
      { id: 'game', type: 'game-board', chapter: 'game', label: 'The game', step, jump, mount },
      { id: 'result', type: 'game-result', chapter: 'result', label: 'The result' },
    ].map((scene) => ({ ...scene, game: true }));
  }

  const kicker = () => `Round ${game.round} / Board ${String(game.board).padStart(2, '0')}`;

  function missing(scene) {
    return el('div', { class: 'confusion-layout' }, heading('Not on the board yet', 'Nothing to replay.',
      scene.round ? `Round ${scene.round}, board ${scene.board} has not been published.` : 'Use ?game=ROUND-BOARD, for example ?game=3-1.'));
  }

  function matchup() {
    return el('div', { class: 'confusion-layout game-matchup' }, heading(kicker(), 'Tonight’s duel.'),
      el('div', { class: 'duel' }, el('div', {}, logo(player(game.white)), el('strong', {}, name(game.white)), el('span', { class: 'colour-label' }, 'White')),
        el('span', { class: 'versus' }, 'vs'),
        el('div', {}, logo(player(game.black)), el('strong', {}, name(game.black)), el('span', { class: 'colour-label' }, 'Black'))));
  }

  function side(id, colour) {
    return el('div', { class: 'game-player ' + colour }, logo(player(id)),
      el('div', {}, el('strong', {}, name(id)), el('span', { class: 'colour-label' }, colour === 'white' ? 'White' : 'Black')),
      view.clocks[colour]);
  }

  function boardScene() {
    view = {
      fill: el('span', { class: 'eval-fill' }), evalLabel: el('span', { class: 'eval-label' }), board: el('div', { class: 'game-board', role: 'img', 'aria-label': 'Chessboard' }),
      move: el('div', { class: 'move-card', 'aria-live': 'polite' }),
      clocks: { white: el('span', { class: 'clock', title: 'Thinking time so far' }), black: el('span', { class: 'clock', title: 'Thinking time so far' }) },
    };
    return el('div', { class: 'game-layout' },
      el('div', { class: 'eval-bar', 'aria-hidden': 'true' }, view.fill, view.evalLabel),
      view.board,
      el('div', { class: 'game-side' }, el('p', { class: 'eyebrow' }, kicker()), side(game.black, 'black'), view.move, side(game.white, 'white')));
  }

  // What the position is worth after the move, for viewers: a forced mate, or +3 and more as a decisive advantage.
  function standing() {
    const e = game.evals[ply];
    if (!e || ply === game.plies.length) return null;
    const colour = e.mate ? (e.mate > 0 ? 'white' : 'black') : e.cp >= 300 ? 'white' : e.cp <= -300 ? 'black' : null;
    if (!colour) return null;
    return el('p', { class: 'move-standing ' + colour },
      e.mate ? `Forced mate in ${Math.abs(e.mate)} for ${name(game[colour])}` : `Decisive advantage: ${name(game[colour])}`);
  }

  // The plain-language verdict on one move: Stockfish first, then what the move cost the model.
  function moveCard() {
    const remark = gameComments[`${game.round}-${game.board}`]?.[ply];
    const quip = remark && el('p', { class: 'move-quip' }, logo(player('stockfish')), el('span', {}, remark));
    if (!ply) return [el('p', { class: 'move-meta' }, 'Starting position'), el('p', { class: 'move-san' }, 'White to move.'), quip];
    const p = game.plies[ply - 1];
    const who = name(p.player);
    const verdict = p.san.endsWith('#') ? 'Checkmate.' : p.forced ? 'The only legal move.' :
      marks[p.judgement] ? [`${labels[p.judgement]}. Stockfish wanted `, figurine(p.best, p.colour), '. ' + (p.loss >= 1000 ? 'This one loses the game.' : `It gave away ${(p.loss / 100).toFixed(1)} pawns.`)] :
      p.judgement === 'best' || p.san === p.best ? 'Exactly what Stockfish would play.' : p.best ? ['Solid. Stockfish slightly preferred ', figurine(p.best, p.colour), '.'] : 'The game is over.';
    const cost = p.player !== 'human' && p.seconds != null && [
      `Thought ${p.seconds < 10 ? p.seconds.toFixed(1) : Math.round(p.seconds)} s`,
      p.call?.reasoning_chars && p.call.reasoning_chars.toLocaleString('en-US') + ' characters of reasoning',
      p.cost_usd && dollars(p.cost_usd),
    ].filter(Boolean).join(' · ');
    return [
      el('p', { class: 'move-meta' }, `Move ${Math.ceil(ply / 2)} · ${who}`),
      el('p', { class: 'move-san' }, figurine(p.san, p.colour), marks[p.judgement] && el('span', { class: 'move-mark ' + p.judgement }, marks[p.judgement])),
      el('p', { class: 'move-verdict' + (p.judgement === 'best' ? ' best' : '') }, verdict),
      standing(),
      quip,
      p.illegal_answers?.length && el('p', { class: 'move-note' }, 'Tried an illegal move first: ' + p.illegal_answers.join(', ') + '.'),
      p.top?.length && el('ol', { class: 'move-top' }, p.top.map(([san, prob]) => el('li', {}, el('span', {}, figurine(san, p.colour)), el('span', { class: 'num' }, Math.round(prob * 100) + '%')))),
      cost && el('p', { class: 'move-cost' }, cost),
    ];
  }

  function show() {
    const p = game.plies[ply - 1];
    const e = game.evals[ply];
    ground.set({ fen: p ? p.fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lastMove: p ? [p.uci.slice(0, 2), p.uci.slice(2, 4)] : undefined,
    // The check highlight goes on the king of the side to move, which the board only knows through turnColor.
    turnColor: p?.fen.split(' ')[1] === 'b' ? 'black' : 'white', check: !!p?.check });
    // A bad move gets an arrow showing what Stockfish wanted instead.
    ground.setAutoShapes(p && marks[p.judgement] && p.best_uci ? [{ orig: p.best_uci.slice(0, 2), dest: p.best_uci.slice(2, 4), brush: 'green' }] : []);
    const share = e ? (e.mate === 0 && ply === game.plies.length ? (game.result === '1-0' ? 100 : game.result === '0-1' ? 0 : 50) : whiteShare(e.cp)) : 50;
    view.fill.style.transform = `scaleY(${share / 100})`;
    view.evalLabel.textContent = e && !(e.mate === 0) ? evalText(e) : game.result.replace('1/2-1/2', '½–½');
    view.evalLabel.classList.toggle('black-ahead', share < 50);
    view.move.replaceChildren(...moveCard().filter(Boolean));
    // Thinking time used so far by each side; the human's time is never published.
    for (const colour of ['white', 'black']) {
      const played = game.plies.slice(0, ply).filter((q) => q.colour === colour && q.seconds != null);
      view.clocks[colour].textContent = game[colour] === 'human' ? '' : clock(played.reduce((sum, q) => sum + q.seconds, 0));
    }
  }

  function mount(root, fromLater) {
    ground = Chessground(view.board, { fen: 'start', viewOnly: true, coordinates: true, animation: { enabled: true, duration: 220 }, drawable: { enabled: false, visible: true } });
    if (fromLater) ply = game.plies.length;
    show();
  }

  function step(delta) {
    const target = ply + delta;
    if (target < 0 || target > game.plies.length) return false;
    ply = target;
    show();
    return true;
  }

  function jump(toEnd) { ply = toEnd ? game.plies.length : 0; show(); }

  // Back to the results of this game's round, keeping the tournament and recording mode.
  function roundHref() {
    const query = new URLSearchParams(location.search);
    query.delete('game');
    query.set('round', game.round);
    return './?' + query + '#results-r' + game.round;
  }

  function result() {
    const winner = game.result === '1-0' ? game.white : game.result === '0-1' ? game.black : null;
    const line = (id, colour) => {
      const s = summary.sides?.[colour] || {};
      return el('li', {}, logo(player(id)), el('strong', {}, name(id)),
        el('span', { class: 'num' }, s.accuracy != null ? s.accuracy + '% accuracy' : ''),
        el('span', { class: 'num' }, id !== 'human' && s.seconds != null ? clock(s.seconds) : ''),
        el('span', { class: 'num' }, id !== 'human' && s.cost_usd != null ? dollars(s.cost_usd) : ''));
    };
    return el('div', { class: 'confusion-layout game-result' },
      heading(kicker(), winner ? `${name(winner)} wins.` : 'Draw.', `${endings[game.termination] || game.termination}, after ${Math.ceil(game.plies.length / 2)} moves.`),
      el('ul', { class: 'result-lines' }, line(game.white, 'white'), line(game.black, 'black')),
      el('a', { class: 'text-button back-link', href: roundHref() }, `Back to round ${game.round} results`));
  }

  const renderers = { 'game-missing': missing, 'game-matchup': matchup, 'game-board': boardScene, 'game-result': result };
  return { load, render: (scene) => renderers[scene.type](scene) };
}
