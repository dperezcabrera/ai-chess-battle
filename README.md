# AI chess battle

Fourteen frontier LLMs, Jev (a System One model) and one human play a nine-round Swiss chess tournament.
Stockfish judges every move, and every model's thinking time and cost are counted.

**See it:** https://dperezcabrera.github.io/ai-chess-battle/

The games were played and scored with [ai-chess-lab](https://github.com/dperezcabrera/ai-chess-lab), which also
builds the data behind this site. The site itself is static and served by GitHub Pages.

## The presentation

The home page (`index.html`) is a presentation: the idea, the rules, the judge, the contenders and the line-up,
then every round one after another.

- Click anywhere (or press →, Space or Page Down) to go on; click the left edge (or press ←, Page Up) to go back.
- Home and End jump to the first and last scene.
- Nothing advances on its own.

Each round has its cover, the pairings with their results (each one links to its game), the table after the round
(wins, draws, losses, blunders, pawns lost per move, thinking time, spend, tie-break and the change of place) and
its three great hits. The last round adds how often each model blundered, how each one opens, the chances each one took, the bill and
the AI podium.

### Links

- `?round=N` starts at round N.
- `?game=3-1` replays board 1 of round 3 move by move: an advantage bar, Stockfish's verdict on every move, the
  model's thinking time and cost, then the result. Home and End jump to the start or the end of the game.
- `#human`, a model's encoded ID and the numeric links `#1`–`#16` open a contender.
- `?t=TOURNAMENT_ID` selects another tournament; `participants.html` redirects to the home page.
- `?rec` hides the cursor and turns click navigation off; the keyboard still drives the scenes.

### Files

- `data/participants.json`: facts and sources for each contender.
- `presentation-copy.js`: nicknames and jokes.
- `game-moments.js`: hand-picked great hits for a round (a single position or a range of moves).
- `game-comments.js`: hand-written remarks on specific moves.

## Run it locally

`bash scripts/run.sh`, then open `http://localhost:8770/`. No build step and no dependencies.
