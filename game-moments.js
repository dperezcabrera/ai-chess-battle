// Hand-written moments for a round's great hits, keyed by round. Moves are written as in the game player:
// '19.' is White's 19th move and '19...' Black's (a bare number counts plies: 1 is White's first move).
//   { board, ply: '19.', title, metric, caption }           one position, after that move
//   { board, from: '17...', to: '21.', title, metric, caption,
//     notes: { '19.': 'A line for this move.' } }            Next walks every move from `from` to `to`
//   `steps: true` with `ply` is short for from the move before it; `side: 'black'` picks whose view and verdict.
// `momentExtras` join the automatic moments, first in line; `momentPicks` replace them altogether for that round.
// This repository is public: only commit moments for rounds that are already published.
export const momentExtras = {
  3: [
    { board: 1, from: '18...', to: '19.', title: 'The machine strikes back', metric: '+2.9',
      caption: 'The human slipped and Gemini 3.8 Flash found Stockfish’s own reply. For a few moves, a machine was winning against the undefeated human.' },
  ],
};

export const momentPicks = {
  // 5: [
  //   { board: 3, ply: 116, title: 'Lone king vs all', metric: 'Mate in 4', caption: 'Someone teach it that you win by checkmate.' },
  // ],
};
