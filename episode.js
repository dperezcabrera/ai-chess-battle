// Round episodes: ?round=N tells round N as a sequence of scenes, from published rounds only.
import { Chessground } from './vendor/chessground/chessground.min.js';
import { figurine, piece } from './figurine.js';
import { momentExtras, momentPicks } from './game-moments.js';
import { tally, lostPerMove, blunderEvery } from './quality.js';

// A round shows its three best moments; the score ranks them, the rarest stories first.
const momentScore = { mate_swap: 120, queen_gift: 110, lone_king: 100, missed_mate: 50, upset: 40, blunder: 35, longest_think: 30, dearest_move: 25, close_game: 20, quickest_win: 15 };
const momentLabels = { mate_swap: 'Mate ping-pong', queen_gift: 'The queen gift', lone_king: 'Lone king vs all', missed_mate: 'The missed mate', upset: 'The upset', blunder: 'The blunder', longest_think: 'The long think',
  dearest_move: 'The dearest move', close_game: 'The closest fight', quickest_win: 'The quickest win', pick: 'The moment' };
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const pieceOrder = 'QRBNP';
// Pieces other than the king for each side, strongest first, from a FEN.
function material(fen) {
  const board = fen.split(' ')[0];
  const sort = (list) => list.sort((a, b) => pieceOrder.indexOf(a) - pieceOrder.indexOf(b));
  return { white: sort([...board].filter((c) => pieceOrder.includes(c))), black: sort([...board].filter((c) => pieceOrder.toLowerCase().includes(c)).map((c) => c.toUpperCase())) };
}
const where = (game, k) => ({ fen: k ? game.plies[k - 1].fen : START, last: k ? [game.plies[k - 1].uci.slice(0, 2), game.plies[k - 1].uci.slice(2, 4)] : null });

// A draw where one side kept pieces against a bare king and still could not mate.
function loneKing(game) {
  if (game.result !== '1/2-1/2') return null;
  const m = material(game.plies.at(-1).fen);
  const bare = !m.white.length ? 'white' : !m.black.length ? 'black' : null;
  const strong = bare === 'white' ? 'black' : 'white';
  if (!bare || !m[strong].length) return null;
  return { key: 'lone_king', score: momentScore.lone_king + m[strong].length, h: { ...where(game, game.plies.length), board: game.board, white: game.white, black: game.black,
    result: game.result, termination: game.termination, strong: game[strong], colour: strong, pieces: m[strong] } };
}

// Mates short enough to follow on a recording (five moves or fewer), as the side that has one.
const mateOwner = (e) => (e?.mate && Math.abs(e.mate) <= 5 ? (e.mate > 0 ? 'white' : 'black') : null);

// A mate that changes hands: in a few consecutive moves, one side hands the other a mate, it is missed, and handed
// back. Returned as frames to step through: the position before the first slip, then one frame per move, ending on
// the mate when somebody finally takes it.
function mateSwap(game) {
  const ev = game.evals, plies = game.plies;
  const slips = [];
  for (let k = 0; k < plies.length; k++) {
    const mover = k % 2 === 0 ? 'white' : 'black', other = mover === 'white' ? 'black' : 'white';
    const before = mateOwner(ev[k]), after = mateOwner(ev[k + 1]);
    const missed = before === mover && !plies[k].san.endsWith('#') && after !== mover;
    const gave = after === other && before !== other;
    if (missed || gave) slips.push(k + 1);
  }
  // The longest run of slips at most two plies apart; three at least, so the mate really goes there and back.
  let best = [], run = [];
  for (const ply of slips) {
    run = run.length && ply - run.at(-1) > 2 ? [ply] : [...run, ply];
    if (run.length > best.length) best = run;
  }
  if (best.length < 3) return null;
  const first = best[0], lastPly = best.at(-1) + (plies[best.at(-1)]?.san.endsWith('#') ? 1 : 0);
  const frames = [];
  for (let p = first - 1; p <= lastPly; p++) {
    const q = plies[p - 1], e = ev[p];
    frames.push({ ...where(game, p), arrow: mateOwner(e) === (p % 2 === 0 ? 'white' : 'black') ? e.best_uci : null,
      move: p >= first && q ? { san: q.san, colour: q.colour, player: q.player, best: ev[p - 1]?.best,
        missed: mateOwner(ev[p - 1]) === q.colour && !q.san.endsWith('#') && mateOwner(e) !== q.colour,
        gave: mateOwner(e) && mateOwner(e) !== q.colour ? Math.abs(e.mate) : 0, mate: q.san.endsWith('#') } : null,
      toMove: p % 2 === 0 ? game.white : game.black, mateIn: mateOwner(e) ? Math.abs(e.mate) : 0 });
  }
  return { key: 'mate_swap', score: momentScore.mate_swap + best.length, h: { board: game.board, white: game.white, black: game.black,
    result: game.result, ...where(game, first - 1), frames, slips: best.length } };
}

// A move as written in game-moments.js: '19.' is White's 19th move, '19...' Black's; a bare number is a ply.
const plyOf = (at) => {
  const m = String(at).match(/^(\d+)(\.{1,3})$/);
  return m ? 2 * Number(m[1]) - (m[2] === '.' ? 1 : 0) : Number(at);
};

// The piece on a square, from a FEN: 'Q' a white queen, 'q' a black one, null an empty square.
function pieceAt(fen, square) {
  const row = fen.split(' ')[0].split('/')[8 - Number(square[1])];
  let file = 0;
  for (const c of row) {
    if (/\d/.test(c)) file += Number(c);
    else if (file++ === square.charCodeAt(0) - 97) return c;
  }
  return null;
}

// A blunder that leaves the queen hanging, taken on the very next move: the costliest one in the game.
function queenGift(game) {
  let best = null;
  game.plies.forEach((p, k) => {
    const next = game.plies[k + 1];
    if (!next || p.judgement !== 'blunder' || pieceAt(p.fen, next.uci.slice(2, 4)) !== (p.colour === 'white' ? 'Q' : 'q')) return;
    if (!best || p.loss > best.loss) best = { k, loss: p.loss };
  });
  if (!best) return null;
  const p = game.plies[best.k], next = game.plies[best.k + 1];
  return { key: 'queen_gift', score: momentScore.queen_gift, h: { ...where(game, best.k + 1), board: game.board, white: game.white, black: game.black,
    result: game.result, player: p.player, colour: p.colour, san: p.san, loss: best.loss, taker: next.san, arrow: next.uci, brush: 'red' } };
}

// Stockfish's evaluation from one side's point of view, as a reader expects it: +2.9, −0.9, or mate in N.
const evalFor = (e, colour) => {
  const sign = colour === 'white' ? 1 : -1;
  if (e.mate) return sign * e.mate > 0 ? `mate in ${Math.abs(e.mate)}` : `mated in ${Math.abs(e.mate)}`;
  const v = (sign * e.cp) / 100;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
};

// Stockfish's evaluation in centipawns for White, a mate counted as ten pawns.
const pawns = (e) => (e.mate ? Math.sign(e.mate) * 1000 : Math.max(-1000, Math.min(1000, e.cp)));

// How long a game stayed level: the positions Stockfish saw within one pawn, and the last of them.
function level(game) {
  const within = game.evals.slice(0, -1).map((e, k) => (Math.abs(pawns(e)) <= 100 ? k : -1)).filter((k) => k >= 0);
  return { count: within.length, last: within.at(-1) ?? 0 };
}

// A side that had a forced mate in five or fewer, with the move to make, and did not win: the first such position.
// Longer mates are left out: nobody watching can follow them.
function missedMate(game) {
  for (const [colour, sign, win] of [['white', 1, '1-0'], ['black', -1, '0-1']]) {
    if (game.result === win) continue;
    const mates = game.evals.map((e, k) => (e.mate && sign * e.mate > 0 && Math.abs(e.mate) <= 5 && (k % 2 === 0) === (colour === 'white') && k < game.plies.length ? k : -1)).filter((k) => k >= 0);
    if (!mates.length) continue;
    const k = mates[0], e = game.evals[k];
    return { key: 'missed_mate', score: momentScore.missed_mate + mates.length, h: { ...where(game, k), board: game.board, white: game.white, black: game.black, result: game.result,
      player: game[colour], colour, san: game.plies[k].san, best: e.best, best_uci: e.best_uci, mate: Math.abs(e.mate), positions: mates.length } };
  }
  return null;
}
const resultText = { '1-0': '1–0', '0-1': '0–1', '1/2-1/2': '½–½' };
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');
const dollars = (n) => '$' + (n >= 10 ? n.toFixed(1) : n >= 0.1 ? n.toFixed(2) : n.toFixed(3));
const points = (n) => String(n).replace('.5', '½').replace(/^0½/, '½');
// Thinking time at a fixed width, so a column of them lines up: 00:31:50.
const hms = (s) => { s = Math.round(s); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':'); };
const duration = (s) => s < 60 ? Math.round(s) + ' s' : Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s';

export function createEpisode({ el, logo, heading, player, pairingList, gameHref }) {
  let t, n;
  const name = (id) => player(id).name;
  const arrow = () => { const s = el('span', { 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 5 7 9H5z"/></svg>'; return s; };
  const side = (id) => el('span', { class: 'who' }, logo(player(id)), el('strong', {}, name(id)));

  // Points, spend and table position after round k, from the games of rounds 1..k.
  function after(k) {
    const ids = Object.keys(t.players);
    const pts = Object.fromEntries(ids.map((id) => [id, 0]));
    const cost = { ...pts }, seconds = { ...pts };
    const record = Object.fromEntries(ids.map((id) => [id, { w: 0, d: 0, l: 0 }]));
    for (const round of t.rounds.filter((r) => r.number <= k)) {
      if (round.bye) pts[round.bye] += 1;
      for (const g of round.games) {
        const white = g.result === '1-0' ? 1 : g.result === '0-1' ? 0 : 0.5;
        pts[g.white] += white; pts[g.black] += 1 - white;
        for (const [colour, score] of [['white', white], ['black', 1 - white]]) {
          const id = g[colour], s = g.sides?.[colour] || {};
          cost[id] += s.cost_usd || 0; seconds[id] += s.seconds || 0;
          record[id][score === 1 ? 'w' : score === 0 ? 'l' : 'd'] += 1;
        }
      }
    }
    // Ranks come from the build, which applies the tie-breaks; round 0 keeps the seeding order.
    // Older builds have no rank history: order by points then.
    const order = [...ids].sort((a, b) => !k ? 0 : (t.ranks ? t.ranks[a][k - 1] - t.ranks[b][k - 1] : pts[b] - pts[a]) || name(a).localeCompare(name(b)));
    return { pts, cost, seconds, record, order, place: Object.fromEntries(order.map((id, i) => [id, i])) };
  }

  // The round's three best moments: hand-picked ones from game-moments.js, else the top scores found in the games.
  // Every published game, loaded once for the whole tournament.
  let allGames = null, loadedGames = [];
  const tournamentGames = (loadJSON) => allGames ||= Promise.all(t.rounds.map(async (round) => ({ number: round.number,
    games: await Promise.all(round.games.map((g) => loadJSON('data/' + encodeURIComponent(t.id) + '/' + g.file).catch(() => null))) })));

  // Each special moment appears once in the whole tournament: its best example, in the round where it happened.
  // `rank` orders the candidates of one kind, the higher the better; a tie goes to the earliest round.
  const specials = [
    { find: mateSwap, rank: (m) => m.h.slips * 10 + (m.h.frames.at(-1).move?.mate ? 5 : 0) },
    { find: queenGift, rank: (m) => m.h.loss },
    { find: loneKing, rank: (m) => m.h.pieces.length },
    { find: missedMate, rank: (m) => m.h.positions },
  ];
  let chosen = null;
  async function specialMoments(loadJSON) {
    if (chosen) return chosen;
    const rounds = await tournamentGames(loadJSON);
    chosen = {};
    // A game gives one special at most, so each kind picks its best among the games still free.
    const used = new Set();
    for (const { find, rank } of specials) {
      let best = null;
      for (const { number, games } of rounds) {
        for (const game of games.filter(Boolean)) {
          const m = !used.has(number + '-' + game.board) && game.white !== 'human' && game.black !== 'human' && find(game);
          if (m && (!best || rank(m) > rank(best.m))) best = { m, number };
        }
      }
      if (best) { (chosen[best.number] ||= []).push(best.m); used.add(best.number + '-' + best.m.h.board); }
    }
    return chosen;
  }

  // A round's three great hits: hand-picked ones from game-moments.js, else the specials that fell in this round and
  // the round's own highlights, one per game, best first.
  async function pickMoments(number, loadJSON) {
    const round = t.rounds[number - 1];
    const games = Object.fromEntries(round.games.map((g, i) => [g.board, null]));
    const loaded = (await tournamentGames(loadJSON)).find((r) => r.number === number)?.games || [];
    round.games.forEach((g, i) => { games[g.board] = loaded[i]; });
    const written = (list) => (list || []).map(({ board, title, metric, caption, side: chosen, notes = {}, ...at }) => {
      const game = games[board];
      if (!game) return null;
      const ply = plyOf(at.ply ?? at.to), from = at.from ? plyOf(at.from) : at.steps ? ply - 1 : null;
      // The board faces the side the story is about: the one that plays the last move, unless `side` says otherwise.
      const colour = chosen || (ply % 2 ? 'white' : 'black');
      const h = { ...where(game, ply), board, white: game.white, black: game.black, result: game.result, metric, caption, player: game[colour], orientation: colour };
      // With a range, Next walks it move by move from the position before `from`, each move with Stockfish's verdict
      // for that side; the move that ends the range is announced with an arrow one frame early.
      if (from && from <= ply) {
        const note = Object.fromEntries(Object.entries(notes).map(([k, text]) => [plyOf(k), text]));
        h.frames = [{ ...where(game, from - 1), start: { toMove: game[from % 2 ? 'white' : 'black'], side: game[colour], colour, eval: game.evals[from - 1] } }];
        for (let k = from; k <= ply; k++) {
          h.frames.push({ ...where(game, k), arrow: k === ply - 1 ? game.plies[ply - 1].uci : null,
            move: { ply: game.plies[k - 1], side: game[colour], colour, eval: game.evals[k], note: note[k], last: k === ply } });
        }
      }
      return { key: 'pick', score: 200, title, h };
    }).filter(Boolean);
    if (momentPicks[number]?.length) return written(momentPicks[number]);
    // Games with the human stay out of the automatic great hits: they are about the machines.
    const machines = (m) => m.h.white !== 'human' && m.h.black !== 'human';
    const found = [...written(momentExtras[number]), ...((await specialMoments(loadJSON))[number] || [])];
    const boardOf = (m) => m.h.board ?? Number(m.h.file?.match(/-b(\d+)\.json$/)?.[1]);
    const built = Object.entries(round.highlights || {}).filter(([key]) => momentScore[key]).map(([key, h]) => ({ key, score: momentScore[key], h })).filter(machines);
    // The closest fight is the machines' game that Stockfish saw level for longest, not the most accurate one.
    const fights = Object.values(games).filter((g) => g && g.white !== 'human' && g.black !== 'human').map((game) => ({ game, ...level(game) }));
    const closest = fights.sort((a, b) => b.count - a.count)[0];
    if (closest) built.push({ key: 'close_game', score: momentScore.close_game, h: { ...where(closest.game, closest.last), board: closest.game.board,
      white: closest.game.white, black: closest.game.black, result: closest.game.result, moves: Math.round(closest.count / 2) } });
    const seen = new Set();
    return [...found, ...built].sort((a, b) => b.score - a.score)
      .filter((m) => { const board = boardOf(m); if (seen.has(board)) return false; seen.add(board); return true; }).slice(0, 3);
  }

  // One round told as scenes: its pairings with results (each board opens its replay), the table, the great hits
  // and the bill. Rounds are chained, so ids carry the round and only the last round closes.
  async function scenes(tournament, round, loadJSON, { last = true } = {}) {
    t = tournament;
    loadedGames = await tournamentGames(loadJSON);
    const moments = await pickMoments(round, loadJSON);
    n = round;
    const list = [
      { id: 'cover', type: 'cover', chapter: 'results', label: 'Round ' + round },
      { id: 'results', type: 'results', chapter: 'results', label: 'The pairings' },
      { id: 'standings', type: 'standings', chapter: 'standings', label: 'The table' },
      ...(moments.length ? [{ id: 'hits', type: 'hits', chapter: 'moments', label: 'Great hits', moments }] : []),
      ...moments.map((m, i) => ({ id: m.key + '-' + (i + 1), type: 'moment', chapter: 'moments', label: m.title || momentLabels[m.key], moment: m, ...(m.h.frames && swapControls(m.h)) })),
      // The chances and the bill come once, at the end of the tournament: round after round they only grow.
      ...(round === t.rounds_total ? [{ id: 'blunders', type: 'blunders', chapter: 'standings', label: 'The blunders' },
        { id: 'chances', type: 'chances', chapter: 'standings', label: 'The chances', rows: await chances(loadJSON) },
        { id: 'bill', type: 'bill', chapter: 'standings', label: 'The bill' }] : []),
      ...(!last ? [] : round < t.rounds_total ? [{ id: 'next', type: 'next', chapter: 'next', label: 'Next round' }]
        : [{ id: 'podium', type: 'podium', chapter: 'next', label: 'The AI podium', machines: true }]),
    ];
    return list.map((scene) => ({ ...scene, round, episode: true, id: scene.id + '-r' + round, label: `Round ${round} · ${scene.label}` }));
  }

  function resultsScene() {
    const round = t.rounds[n - 1];
    // The pairing cards again, each result revealed in place of the "vs"; every card still opens its replay.
    return el('div', { class: 'matchups-layout' },
      heading(`Round ${n} / ${plural(round.games.length, 'board')}`, 'The pairings.'),
      el('ol', { class: 'pairings' }, round.games.map((g) => el('li', { 'data-step': '', class: 'result result-' + ({ '1-0': 'white', '0-1': 'black' }[g.result] || 'draw') },
        el('a', { class: 'pairing', href: gameHref(n, g.board), target: '_blank', rel: 'noopener' },
          el('span', { class: 'board-number' }, 'BOARD ' + String(g.board).padStart(2, '0')),
          el('div', { class: 'pair-side white-side' }, logo(player(g.white)), el('strong', {}, name(g.white))),
          el('span', { class: 'score' }, el('span', { class: 'score-hidden', 'aria-hidden': 'true' }, 'vs'), el('span', { class: 'score-final' }, resultText[g.result] || g.result)),
          el('div', { class: 'pair-side black-side' }, logo(player(g.black)), el('strong', {}, name(g.black))))))),
      round.bye && el('p', { class: 'muted' }, 'Bye: ' + name(round.bye)));
  }

  // One step of a mate ping-pong, in words: who hands over a mate, who misses it, who finally takes it.
  function frameText(h, f) {
    // Stockfish's verdict for one side, signed from its point of view: +2.9 is that side ahead.
    const verdict = (side, colour, e) => `${name(side)} ${evalFor(e, colour)}`;
    if (f.start) return `${name(f.start.toMove)} to move. Stockfish: ${verdict(f.start.side, f.start.colour, f.start.eval)}.`;
    if (f.move?.ply) {
      const { ply: p, side, colour, eval: e, note, last } = f.move;
      const bad = (p.judgement === 'blunder' || p.judgement === 'mistake') && p.best;
      return [`${name(p.player)} plays `, figurine(p.san, p.colour), bad ? [' instead of ', figurine(p.best, p.colour)] : '',
        `. Stockfish: ${verdict(side, colour, e)}.`, note ? ' ' + note : '', last && h.caption ? ' ' + h.caption : ''];
    }
    const m = f.move;
    if (!m) return f.mateIn ? `${name(f.toMove)} has a mate in ${f.mateIn} on the board.` : `${name(f.toMove)} to move.`;
    const who = name(m.player), opponent = name(m.colour === 'white' ? h.black : h.white);
    if (m.mate) return [`${who} finally takes it: `, figurine(m.san, m.colour), '. Checkmate.'];
    const played = m.missed ? [`${who} misses it: `, figurine(m.san, m.colour), ' instead of ', figurine(m.best, m.colour)] : [`${who} plays `, figurine(m.san, m.colour)];
    return [...played, m.gave ? ` and hands ${opponent} a mate in ${m.gave}.` : '.'];
  }

  // Next and Previous step a mate ping-pong move by move before leaving the scene; the arrow shows the mate on offer.
  function swapControls(h) {
    const state = { frame: 0 };
    const show = () => {
      const f = h.frames[state.frame];
      state.ground.set({ fen: f.fen, lastMove: f.last || undefined });
      state.ground.setAutoShapes(f.arrow ? [{ orig: f.arrow.slice(0, 2), dest: f.arrow.slice(2, 4), brush: 'green' }] : []);
      state.caption.replaceChildren(...[frameText(h, f)].flat(Infinity));
    };
    return {
      mount(root, fromLater) {
        state.ground = Chessground(root.querySelector('[data-steps]').appendChild(el('div')), { viewOnly: true, coordinates: false, orientation: h.orientation || 'white',
          animation: { enabled: true, duration: 250 }, drawable: { enabled: false, visible: true } });
        state.caption = root.querySelector('.moment-caption');
        state.frame = fromLater ? h.frames.length - 1 : 0;
        show();
      },
      step(delta) {
        const target = state.frame + delta;
        if (target < 0 || target >= h.frames.length) return false;
        state.frame = target;
        show();
        return true;
      },
      jump(toEnd) { state.frame = toEnd ? h.frames.length - 1 : 0; show(); },
    };
  }

  function momentCopy(key, h) {
    const who = h.player && name(h.player);
    const winner = h.result === '1-0' ? h.white : h.black;
    const loser = winner === h.white ? h.black : h.white;
    const side = h.player === h.black ? 'black' : 'white';
    const before = after(n - 1);
    const drawn = h.result === '1/2-1/2' ? 'The game was drawn.' : `${name(h.player)} went on to lose.`;
    return {
      lone_king: () => [[...h.pieces.map((p) => piece(p, h.colour)), ' vs ', piece('K', h.colour === 'white' ? 'black' : 'white')],
        `${name(h.strong)} kept ${plural(h.pieces.length, 'piece')} against a lone king and still found no mate. Draw by ${h.termination.includes('fifty') ? 'the fifty-move rule' : 'repetition'}.`],
      missed_mate: () => [`Mate in ${h.mate}`, [`${name(h.player)} had a forced mate on the board. It played `, figurine(h.san, h.colour), ' instead of ', figurine(h.best, h.colour), '. ' + drawn]],
      pick: () => [h.metric || '', h.frames ? frameText(h, h.frames[0]) : h.caption || ''],
      queen_gift: () => [[piece('Q', h.colour), ' for free'], [`${who} played `, figurine(h.san, h.colour), ' and left the queen hanging. ',
        `${name(h.player === h.white ? h.black : h.white)} took it: `, figurine(h.taker, h.colour === 'white' ? 'black' : 'white'), '.']],
      mate_swap: () => [plural(h.frames.filter((f) => f.move?.missed).length, 'missed mate'), frameText(h, h.frames[0])],
      upset: () => [`#${before.place[h.winner] + 1} beat #${before.place[h.loser] + 1}`, `${name(h.winner)} beat ${name(h.loser)}, who started the round ${plural(h.gap, 'place')} higher.`],
      blunder: () => [[figurine(h.san, side), '??'], [`${who} played `, figurine(h.san, side), '. Stockfish wanted ', figurine(h.best, side), '. ' + (h.loss < 1000 ? `It gave away ${(h.loss / 100).toFixed(1)} pawns.` : h.result === (h.player === h.white ? '0-1' : '1-0') ? 'The engine called it lost on the spot.' : 'A losing move. Nobody noticed.')]],
      longest_think: () => [duration(h.seconds), [`${who} thought this long before playing `, figurine(h.san, side), '.']],
      dearest_move: () => [dollars(h.cost_usd), [`${who} wrote ${h.output_tokens.toLocaleString('en-US')} tokens to play `, figurine(h.san, side), '. One move.']],
      close_game: () => [plural(h.moves, 'move') + ' level', `For ${plural(h.moves, 'move')}, Stockfish saw less than a pawn between ${name(h.white)} and ${name(h.black)}.`],
      quickest_win: () => [plural(h.moves, 'move'), `${name(winner)} beat ${name(loser)} in ${plural(h.moves, 'move')}.`],
    }[key]();
  }

  function momentScene({ key, title, h }) {
    const [metric, caption] = momentCopy(key, h);
    const label = title || momentLabels[key];
    const focus = h.strong || h.player || h.winner || (h.result === '0-1' ? h.black : h.white);
    return el('div', { class: 'moment-layout moment-' + key },
      el('div', { class: 'moment-copy' },
        heading(`Round ${n} / ${label.replace(/^The /, '')}`, label.replace(/\.?$/, '.')),
        el('p', { class: 'big-metric' }, metric),
        el('p', { class: 'moment-caption' }, caption),
        el('p', { class: 'moment-game' }, side(h.white), el('span', { class: 'versus' }, resultText[h.result] || 'vs'), side(h.black))),
      // A stepped moment gets its board from its own controls; the others show one position.
      h.frames ? el('div', { class: 'moment-board', 'data-steps': '', role: 'img', 'aria-label': 'Position' })
        : el('div', { class: 'moment-board', 'data-fen': h.fen, 'data-last': h.last?.join(',') || '', 'data-arrow': h.arrow || h.best_uci || '', 'data-brush': h.brush || 'green', 'data-orientation': focus === h.black ? 'black' : 'white',
          role: 'img', 'aria-label': 'Position after ' + (h.san || 'the last move') }));
  }

  // The round's cover: its number alone, and for the final round, a word that it is the last.
  function coverScene() {
    return el('div', { class: 'confusion-layout round-cover' }, el('header', { class: 'scene-heading' },
      el('h1', { tabindex: '-1' }, `Round ${n}`), n === t.rounds_total && el('p', { class: 'lede' }, 'The last one.')));
  }

  // The cover of the round's best moments, naming what is coming.
  function hitsScene({ moments }) {
    return el('div', { class: 'confusion-layout hits-layout' }, heading(`Round ${n}`, `Great hits of round ${n}!`),
      el('ol', { class: 'hits' }, moments.map((m) => el('li', {}, el('strong', {}, m.title || momentLabels[m.key]),
        el('span', { class: 'hit-game' }, side(m.h.white), el('span', { class: 'versus' }, 'vs'), side(m.h.black))))));
  }

  function standingsScene() {
    const before = after(n - 1), now = after(n);
    const human = (id) => t.players[id]?.kind === 'human';
    // The tie-break is Buchholz Cut 1: the opponents' points without the weakest one, shown as a plain number.
    const opponents = Object.fromEntries(now.order.map((id) => [id, []]));
    for (const round of t.rounds.filter((r) => r.number <= n)) {
      for (const g of round.games) { opponents[g.white].push(g.black); opponents[g.black].push(g.white); }
    }
    const tiebreak = (id) => opponents[id].map((o) => now.pts[o]).sort((a, b) => a - b).slice(1).reduce((a, b) => a + b, 0);
    const quality = playQuality(n);
    const rows = now.order.map((id) => {
      const moved = before.place[id] - now.place[id];
      const r = now.record[id];
      // Before the name, how the round moved the player: up in green, down in red, the same in amber.
      const trend = n > 1 && el('span', { class: 'trend ' + (moved > 0 ? 'up' : moved < 0 ? 'down' : 'same'), 'aria-label': moved > 0 ? `up ${moved}` : moved < 0 ? `down ${-moved}` : 'same place' },
        moved ? [arrow(), Math.abs(moved)] : '=');
      return el('li', { style: `--from:${now.place[id]};--to:${now.place[id]}` },
        el('span', { class: 'rank' }, now.place[id] + 1),
        el('span', { class: 'player-cell' }, trend, side(id)),
        el('span', { class: 'stat num' }, r.w), el('span', { class: 'stat num' }, r.d), el('span', { class: 'stat num' }, r.l),
        el('span', { class: 'stat num' }, quality[id].blunders),
        el('span', { class: 'stat num' }, lostPerMove(quality[id])),
        el('span', { class: 'stat num time' }, human(id) ? '' : hms(now.seconds[id])),
        el('span', { class: 'stat num' }, human(id) ? '' : dollars(now.cost[id])),
        el('span', { class: 'stat num' }, points(tiebreak(id))),
        el('span', { class: 'pts' }, points(now.pts[id])));
    });
    const columns = ['#', 'Player', 'W', 'D', 'L', 'Blunders', 'Lost / move', 'Thinking', 'Spent', 'Tie-break', 'Pts'];
    return el('div', { class: 'standings-layout' },
      el('header', { class: 'scene-heading' }, el('p', { class: 'eyebrow' }, `After round ${n}`)),
      el('div', { class: 'table-head', 'aria-hidden': 'true' }, columns.map((c) => el('span', {}, c))),
      el('ol', { class: 'table-rows shown', style: '--rows:' + rows.length, 'aria-label': 'Standings after round ' + n }, rows));
  }

  // For every model, the games it won against the games it could have won (it reached +3 or better, a forced mate
  // counts), and the games it lost against the games it could have lost (it fell to -3 or worse). The human stays out.
  async function chances(loadJSON) {
    const rows = Object.fromEntries(Object.keys(t.players).filter((id) => t.players[id].kind !== 'human').map((id) => [id, { id, won: 0, could: 0, lost: 0, risked: 0 }]));
    for (const { games } of await tournamentGames(loadJSON)) {
      for (const game of games.filter(Boolean)) {
        const values = game.evals.slice(0, -1).map(pawns);
        for (const [colour, sign, win, loss] of [['white', 1, '1-0', '0-1'], ['black', -1, '0-1', '1-0']]) {
          const row = rows[game[colour]];
          if (!row) continue;
          row.won += game.result === win; row.lost += game.result === loss;
          row.could += Math.max(...values.map((v) => sign * v)) >= 300;
          row.risked += Math.min(...values.map((v) => sign * v)) <= -300;
        }
      }
    }
    return Object.values(rows).sort((a, b) => b.could - b.won - (a.could - a.won) || b.could - a.could);
  }

  function chancesScene({ rows }) {
    return el('div', { class: 'bill-layout' },
      heading('The whole tournament', 'Chances taken.', 'Games won against games with a decisive advantage, games lost against games with a decisive disadvantage.'),
      el('table', { class: 'bill chances' },
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Player'), el('th', { scope: 'col' }, 'Won'), el('th', { scope: 'col' }, 'Decisive advantage'),
          el('th', { scope: 'col' }, 'Lost'), el('th', { scope: 'col' }, 'Decisive disadvantage'))),
        el('tbody', {}, rows.map((r) => el('tr', {},
          el('td', {}, side(r.id)),
          el('td', { class: 'num' }, r.won), el('td', { class: 'num' }, r.could),
          el('td', { class: 'num' }, r.lost), el('td', { class: 'num' }, r.risked))))));
  }

  // Blunders and pawns lost per move for every player, over the games of rounds 1..k.
  function playQuality(k) {
    const q = Object.fromEntries(Object.keys(t.players).map((id) => [id, { moves: 0, blunders: 0, loss: 0 }]));
    for (const { number, games } of loadedGames) {
      if (number > k) continue;
      for (const game of games.filter(Boolean)) {
        for (const colour of ['white', 'black']) tally(game.plies.filter((p) => p.colour === colour), q[game[colour]]);
      }
    }
    return q;
  }

  // The whole tournament's blunder rate, machines only, the steadiest first.
  function blundersScene() {
    const q = playQuality(t.rounds_total);
    const rows = Object.keys(t.players).filter((id) => t.players[id].kind !== 'human')
      .sort((a, b) => (blunderEvery(q[b]) ?? Infinity) - (blunderEvery(q[a]) ?? Infinity));
    return el('div', { class: 'bill-layout' },
      heading('The whole tournament', 'One blunder every…'),
      el('table', { class: 'bill chances' },
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Player'), el('th', { scope: 'col' }, 'Moves'), el('th', { scope: 'col' }, 'Blunders'),
          el('th', { scope: 'col' }, 'One every'), el('th', { scope: 'col' }, 'Pawns lost / move'))),
        el('tbody', {}, rows.map((id) => el('tr', {},
          el('td', {}, side(id)), el('td', { class: 'num' }, q[id].moves), el('td', { class: 'num' }, q[id].blunders),
          el('td', { class: 'num' }, blunderEvery(q[id]) ? plural(blunderEvery(q[id]), 'move') : 'never'),
          el('td', { class: 'num' }, lostPerMove(q[id])))))));
  }

  function billScene() {
    const { pts, cost, seconds } = after(n);
    const ids = Object.keys(t.players).sort((a, b) => cost[b] - cost[a]);
    const max = Math.max(...ids.map((id) => cost[id]), 0.001);
    const human = (id) => t.players[id].kind === 'human';
    return el('div', { class: 'bill-layout' },
      heading(`Spent after ${plural(n, 'round')}`, 'The bill.'),
      el('table', { class: 'bill' },
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Player'), el('th', { scope: 'col' }, 'Spent'), el('th', { scope: 'col' }, 'Per point'), el('th', { scope: 'col' }, 'Thinking'),
          el('th', { scope: 'col' }, el('span', { class: 'sr-only' }, 'Share')), el('th', { scope: 'col' }, 'Points'))),
        el('tbody', {}, ids.map((id, i) => el('tr', { style: '--entry:' + i },
          el('td', {}, side(id)),
          el('td', { class: 'num' }, human(id) ? 'Snacks' : dollars(cost[id])),
          // What each point cost; a player without points has nothing to divide by.
          el('td', { class: 'num' }, human(id) ? '' : pts[id] ? dollars(cost[id] / pts[id]) : 'No points'),
          el('td', { class: 'num time' }, human(id) ? '' : hms(seconds[id])),
          el('td', { class: 'bar-cell', 'aria-hidden': 'true' }, el('span', { style: '--amount:' + cost[id] / max })),
          el('td', { class: 'num' }, points(pts[id])))))));
  }

  function nextScene() {
    const upcoming = t.rounds[n] ? { pairings: t.rounds[n].games, bye: t.rounds[n].bye } : t.next?.number === n + 1 ? t.next : null;
    return el('div', { class: 'matchups-layout' },
      heading(`Coming up / round ${n + 1}`, 'Next time.', upcoming ? 'Same board. New grudges.' : 'The pairings are not out yet.'),
      upcoming && pairingList(upcoming.pairings, n + 1, !!t.rounds[n], player),
      upcoming?.bye && el('p', {}, 'Bye: ' + name(upcoming.bye)));
  }

  // The final podium; `machines` takes the human out, for the ranking of the models alone.
  function podiumScene({ machines }) {
    const { pts, order: all } = after(n);
    const order = machines ? all.filter((id) => t.players[id]?.kind !== 'human') : all;
    return el('div', { class: 'podium-layout' },
      machines ? heading('Final standings / machines only', 'The AI podium.')
        : heading('Final standings', 'The podium.', `${t.rounds_total} rounds. ${plural(t.rounds.reduce((s, r) => s + r.games.length, 0), 'game')}. One table.`),
      // Revealed third, second, first; CSS puts the winner in the middle.
      el('ol', { class: 'podium', reversed: '' }, [2, 1, 0].map((i) => el('li', { 'data-step': '', class: 'place-' + (i + 1) },
        el('span', { class: 'place' }, ['1st', '2nd', '3rd'][i]), logo(player(order[i])), el('strong', {}, name(order[i])), el('span', { class: 'num' }, points(pts[order[i]]) + ' pts')))));
  }

  const renderers = { blunders: blundersScene, chances: chancesScene, cover: coverScene, hits: hitsScene, results: resultsScene, moment: (s) => momentScene(s.moment), standings: standingsScene, bill: billScene, next: nextScene, podium: podiumScene };
  return {
    scenes,
    // A chained presentation holds several rounds: each scene renders the round it belongs to.
    render: (scene) => { n = scene.round ?? n; return renderers[scene.type](scene); },
    // Boards need a laid-out container, so they are drawn once the scene is in the page.
    mountBoards: (root) => root.querySelectorAll('[data-fen]').forEach((node) => Chessground(node.appendChild(el('div')), {
      fen: node.dataset.fen, orientation: node.dataset.orientation, lastMove: node.dataset.last ? node.dataset.last.split(',') : undefined,
      viewOnly: true, coordinates: false, animation: { enabled: false },
      // A missed mate shows the mating move Stockfish saw; a queen gift, the capture that followed.
      drawable: { enabled: false, visible: true, autoShapes: node.dataset.arrow ? [{ orig: node.dataset.arrow.slice(0, 2), dest: node.dataset.arrow.slice(2, 4), brush: node.dataset.brush || 'green' }] : [] } })),
  };
}
