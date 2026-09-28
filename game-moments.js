// Hand-written moments for a round's great hits. Keyed by round; ply 1 is White's first move and the board shows the
// position after it (0 is the start). `momentExtras` join the automatic moments, first in line; `momentPicks`
// replace them altogether for that round.
// This repository is public: only commit moments for rounds that are already published.
export const momentExtras = {
  3: [
    { board: 1, ply: 37, title: 'The machine strikes back', metric: '+2.9',
      caption: 'Gemini 3.8 Flash found Stockfish’s own move. For a few moves, a machine was winning against the undefeated human.' },
  ],
};

export const momentPicks = {
  // 5: [
  //   { board: 3, ply: 116, title: 'Lone king vs all', metric: 'Mate in 4', caption: 'Someone teach it that you win by checkmate.' },
  // ],
};
