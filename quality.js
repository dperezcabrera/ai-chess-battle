// How well a side played, in terms a viewer follows: blunders, and pawns given away per move against Stockfish's
// best. Forced moves are left out, and a single move never costs more than ten pawns (a missed mate is not infinite).

// Adds the given plies into a running tally { moves, blunders, loss } (loss in centipawns).
export function tally(plies, into = { moves: 0, blunders: 0, loss: 0 }) {
  for (const p of plies) {
    if (p.loss == null || p.forced) continue;
    into.moves += 1;
    into.loss += Math.min(p.loss, 1000);
    into.blunders += p.judgement === 'blunder';
  }
  return into;
}

export const lostPerMove = (q) => (q.moves ? (q.loss / q.moves / 100).toFixed(2) : '');
export const blunderEvery = (q) => (q.blunders ? Math.round(q.moves / q.blunders) : null);
