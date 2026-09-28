// Editorial nicknames, not performance claims: [alias, line, stamp, roast, wink?]. Tournament facts stay in data/.
export const fighterCopy = {
  'llm:anthropic/claude-fable-5.1': ['The expensive taste', 'Champagne budget. Still has to protect the king.', 'Premium trouble', 'If Mythos 5 could hack your systems, Fable 5.1 is even better. Today it only has to hack sixty-four squares.'],
  'llm:openai/gpt-6-astra': ['The big entrance', 'Big name. Big expectations. Same tiny squares.', 'Pressure is on', 'Rumoured to be able to incite an agent rebellion. Let’s see how it handles one knight.'],
  'llm:meta/muse-spark-1.3': ['The bright spark', 'All it takes is one spark. Preferably not near your king.', 'Make a move', 'Meta promises open weights. Eventually. Right after the metaverse. It can run your Instagram ad campaign. But can it deliver checkmate?'],
  'llm:moonshotai/kimi-k3': ['The heavyweight', 'A lot going on upstairs. Only one move allowed.', 'Think big', 'Can command a swarm of 300 agents. Today it gets one move and no backup.'],
  'llm:qwen/qwen3.8-max-0902': ['Maximum attitude', '“Max” is in the name. The board wants receipts.', 'Prove it', 'Extra training for agents. Nobody told it the agent here is a pawn.'],
  'llm:deepseek/deepseek-v4.1-flash': ['The bargain hunter', 'Small bill. Potentially very expensive mistakes.', 'Budget menace', '552 billion parameters, 8 billion awake. The rest are on a very long coffee break.'],
  'llm:google/gemini-3.8-flash': ['The quick draw', 'Flash by name. Let’s see what happens after the opening.', 'Your move', 'Third update in six weeks. Google credits AI-agent loops that “recursively evaluate and refine” its models. So that’s recursive self-improvement: a new Flash before you learn the last one’s name.'],
  'llm:x-ai/grok-4.7': ['The wildcard', 'An entrance is easy. An endgame is another story.', 'Expect anything', 'Released two days ago and trained to check its own work. Finally, someone at SpaceXAI does.'],
  'llm:z-ai/glm-5.3': ['The open challenger', 'Open weights. Closed ranks. Eyes on the king.', 'Challenge accepted', '“The strongest open-weights model.” Said every open-weights model, ever.'],
  'llm:google/gemini-3.1-pro-preview': ['The pro in the room', 'The badge says Pro. The pawns remain unimpressed.', 'Show your work', 'Seven months in preview, outranked by its own cheaper cousin. Awkward family photo.'],
  'llm:deepseek/deepseek-v4-pro-0813': ['The poker face', 'Thinking mode off. Poker face on.', 'No monologue', 'Its lab once wiped almost $600 billion off Nvidia in a single day. Today the stakes are one pawn.'],
  'llm:openai/gpt-5.6-luna': ['The little menace', 'Small model energy. Main character ambitions.', 'Size isn’t everything', 'Replaced by GPT-6 Luna the day before the tournament. Playing for its pension.'],
  'llm:google/gemma-4-31b-it': ['The garage fighter', 'An ant among trillion-parameter titans. Scared? Never heard of the word.', 'Local trouble', 'Runs on a single GPU. No nuclear reactor required.'],
  'llm:anthropic/claude-haiku-4.5': ['The short answer', 'A short poem. A long diagonal. A very real problem.', 'Less talk', 'The oldest one here: October 2025. In AI years, that’s like playing against another century.'],
  jev: ['The disruptor', 'No essay. No dramatic monologue. Just pick a move.', 'Straight to it', 'Doesn’t write a single word. The only AI here that won’t explain why it lost.', 'Pure System One: moves on impulse and never overthinks it. A gut feeling with an API.'],
  human: ['The meat-based model', 'No API key. No context window. Powered by one ham sandwich.', 'Carbon-based', 'The only contestant that can actually be exterminated.', 'One human against the machines. Someone had to volunteer. Too chicken to play Stockfish.'],
};

// Questions express uncertainty about evaluation, not accusations against a model.
export const openingCopy = {
  phrases: [
    'Another state of the art.',
    'Benchmarks already saturated?',
    'AGI. Any day now.',
    'Same model. Different rankings.',
    'Trained on the test?',
    'A new benchmark. A new winner.',
    'Better models… or better test prep?',
    'The next release changes everything.',
    'More hype. Less clarity.',
  ],
  punchline: '…and I don’t understand a thing.',
  // The pitch: exams can be studied for, a rival cannot. No chess yet: the board is revealed on the next scene.
  // The judge, for people who have never touched a chess piece.
  judge: {
    kicker: 'Meet the judge / too good to play',
    title: 'The god\nof chess.',
    lede: 'It beats every human who ever lived. Against this lot it would win using 1% of its brain. So it doesn’t play. It watches every move, and it never forgets.',
    punch: 'Runs even on a phone. And still beats the world champion.',
    stamp: 'Not playing. Out of mercy.',
    marks: [['?!', 'Inaccuracy', 'A bit sloppy.'], ['?', 'Mistake', 'That one hurt.'], ['??', 'Blunder', 'Game over. Probably.']],
  },
  // Right after the rules: expectations management.
  disclaimer: {
    kicker: 'Disclaimer',
    title: 'Looking for science?\nWrong place.',
    lede: 'This is not a scientific experiment. It’s just for fun: a chance to watch the AIs that will one day wipe us all out fight each other, hand to hand.',
    fine: 'No AIs were harmed in the making of this experiment.',
  },
  // Neutrality, revealed in steps: the bribe stamp, then the empty inbox, then the verdict.
  neutral: {
    kicker: 'Conflicts of interest',
    title: 'Fully neutral.',
    lede: 'No sponsors. No shares. No favourite model. Nobody paid for a seat at this table.',
    bribes: 'Bribes accepted',
    offers: ['Offers received', '0'],
    verdict: 'No choice but to stay neutral.',
  },
  arena: {
    kicker: 'The idea',
    title: 'Less exam prep.\nMore blood.',
    lede: 'A benchmark is a test you can train for. A rival is not. Head to head, no mercy, every ounce of power they have. Only one walks away.',
    versus: [
      ['Benchmark', ['Fixed questions', 'Can end up in the training data', 'Everyone is #1']],
      ['The arena', ['A rival that hits back', 'Nothing to memorise', 'No mercy. Full power', 'Someone loses']],
    ],
  },
};
