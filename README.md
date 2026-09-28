# AI chess battle

Frontier LLMs, System One models and one human play a Swiss chess tournament, released here one round at a time.

Every game can be replayed move by move with Stockfish's evaluation, each model's thinking time, tokens and cost, and the answers it gave. The site is static and served by GitHub Pages.

The games are played with [system-one-chess](https://github.com/dperezcabrera/system-one-chess), which also builds this site.


## Presentation mode

The presentation is the site's home page (`index.html`); the old tournament page lives at `tournament.html`, and `participants.html` redirects to the home page, keeping its query and anchor.

The sequence is: hype and contradictory claims → confusion → chessboard → rules → Stockfish → contenders → line-up, then every published round (see Round episodes below). Before round 1 is published, the presentation ends on its matchups (`#matchups-r1`). Nothing advances automatically. Use the chapter links, Previous/Next, Left/Right, Page Up/Page Down, or Space; Home/End jump to the first/last scene. Controls retain their normal keyboard behaviour, and Escape closes the details dialog. The fullscreen button keeps the presentation controls available.

Player links such as `#human`, encoded model IDs, and the original numeric links (`#1`–`#16`) continue to work. `?t=TOURNAMENT_ID` selects the tournament. The old `?present` URL also works; all presentation pages now use the same stage.

Participant facts and sources come from `data/participants.json`; editorial nicknames and jokes live in `presentation-copy.js`. Opening matchups come from the tournament data. Once round 1 is published, each matchup opens its game in a new tab. Failed or missing tournament data does not prevent the participant introductions from loading.

## Round episodes

`?round=N` tells round N as a sequence of scenes: the round's cover, the pairings with their results (each Next reveals one board; each board opens its replay in a new tab), the table after the round (wins, draws, losses, accuracy, thinking time, spend, tie-break, and whether each player went up, down or stayed), and the round's great hits, then the next pairings; the last round ends with the bill (spend, cost per point and thinking time for the whole tournament) and the AI podium. The great hits are three per round, one per game: the tournament's special moments appear once each, in the round where they happened (a mate that changes hands, stepped move by move; a queen given away; a lone king against everything; a missed mate in five or fewer), and the rest are the round's own upset, blunder, longest think, dearest move, cleanest game or quickest win. `game-moments.js` can hand-pick a round's moments instead. A replay ends with a link back to its round's results. The presentation itself chains every published round after the round 1 matchups, the same scenes one round after another.

`?game=3-1` replays board 1 of round 3 move by move: the matchup, the board with the advantage bar and a plain-language verdict on every move (Stockfish's judgement and best move, the model's thinking time, reasoning length and cost; Jev's probabilities), then the result. Next and Previous play one move; Home and End jump to the start or the end of the game. Only published games load; any other board shows a "not published" card. Stockfish's hand-written remarks live in `game-comments.js`, keyed by board and ply; commit them only for published rounds.

Add `rec` (`?round=3&rec`, or `?rec` for the introduction) for screen recording: the navigation and the cursor are hidden and the keyboard still drives the scenes.

Run locally with `bash scripts/run.sh` and open `http://localhost:8770/`. There are no additional runtime dependencies or build steps. When regenerating this site from system-one-chess, preserve the presentation files (including `presentation-copy.js`) and its navigation links.
