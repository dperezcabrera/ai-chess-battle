// Figurine notation for viewers who don't read chess letters: Nf3 shows a knight then "f3", e4 a pawn then "e4",
// drawn with the board's own piece images (chessground's cburnett set) in the colour of the side that moves.
const names = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };

export function piece(letter, colour) {
  // Chessground styles `.cg-wrap piece.<role>.<colour>`; the wrapper only borrows that rule.
  const wrap = document.createElement('span');
  wrap.className = 'cg-wrap fig';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', names[letter]);
  const img = document.createElement('piece');
  img.className = names[letter] + ' ' + colour;
  wrap.append(img);
  return wrap;
}

// Returns the move as a list of nodes and text, ready to be a child of an element.
export function figurine(san, colour = 'white') {
  if (!san) return [];
  const parts = san.split(/([KQRBN])/).filter(Boolean).map((part) => names[part] ? piece(part, colour) : part);
  return /^[a-h]/.test(san) ? [piece('P', colour), ...parts] : parts;
}
