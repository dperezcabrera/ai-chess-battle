// The opening a game went into, named from its first moves (SAN), for the few lines this tournament's players use.
export function openingName(san) {
  const [w1, b1, w2, b2, w3] = san;
  if (w1 === 'd4') return w2 === 'Nf3' && san[4] === 'e3' ? 'Colle System' : 'Queen’s Pawn';
  if (w1 !== 'e4') return 'Other';
  const defence = { c5: 'Sicilian', e6: 'French', c6: 'Caro-Kann', Nf6: 'Alekhine', d5: 'Scandinavian', d6: 'Pirc', g6: 'Modern' }[b1];
  if (defence) return defence;
  if (b1 !== 'e5') return 'Other';
  if (w2 === 'Nf3' && b2 === 'Nf6') return 'Petrov';
  if (w2 === 'Nf3' && b2 === 'Nc6') return whiteChoice[w3] || 'Open Game';
  return 'Open Game';
}

// Black's own answer to 1.e4: the defence, or 1…e5 (the Petrov when it follows with 2…Nf6).
export function defenceName(san) {
  if (san[1] === 'e5') return san[3] === 'Nf6' && san[2] === 'Nf3' ? 'Petrov' : '1…e5';
  return openingName(san.slice(0, 2));
}

// White's third move after 1.e4 e5 2.Nf3 Nc6, the one choice White makes on its own in these games.
export const whiteChoice = { Bb5: 'Ruy Lopez', Bc4: 'Italian', d4: 'Scotch', Nc3: 'Four Knights' };

// The most frequent item and how often it came up, or null for an empty list.
export function favourite(list) {
  const count = {};
  for (const x of list) count[x] = (count[x] || 0) + 1;
  const [name, times] = Object.entries(count).sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, times, of: list.length } : null;
}
