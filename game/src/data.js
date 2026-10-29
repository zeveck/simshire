// Sim Shire: buildings, folk and levels. Pure data, shared by the game and the
// headless checker (design/solutions/verify.mjs).

export const W = 16, H = 9;

// cost: [wood, stone]; on: terrain it stands on; touch: terrain it must touch (4-neighbour)
export const B = {
  burrow:  { name: 'Burrow',         cost: [6, 0], on: 'grass',  folk: 'halfling', cap: 4 },
  hall:    { name: 'Stone Hall',     cost: [4, 4], on: 'grass',  touch: ['rock'], folk: 'dwarf', cap: 3 },
  tree:    { name: 'Tree House',     cost: [8, 0], on: 'forest', folk: 'elf', cap: 3 },
  troll:   { name: 'Troll Bridge',   cost: [4, 4], on: 'water',  folk: 'troll', cap: 2, bridge: true },
  warren:  { name: 'Goblin Warren',  cost: [5, 0], on: 'grass',  touch: ['rock', 'forest'], folk: 'goblin', cap: 5 },
  lair:    { name: 'Dragon Lair',    cost: [0, 12], on: 'shelf', folk: 'dragon', cap: 1, max: 1 },
  farm:    { name: 'Farm',           cost: [4, 0], on: 'grass',  food: 8 },
  orchard: { name: 'Orchard',        cost: [6, 0], on: 'grass',  food: 4 },
  dock:    { name: 'Fishing Dock',   cost: [5, 0], on: 'grass',  touch: ['water'], food: 5 },
  mush:    { name: 'Mushroom Patch', cost: [3, 0], on: 'grass',  food: 5 },
  wood:    { name: 'Woodcutter',     cost: [4, 0], on: 'grass',  touch: ['forest'], wood: 3 },
  mine:    { name: 'Mine',           cost: [6, 0], on: 'grass',  touch: ['rock'], stone: 2 },
  market:  { name: 'Market',         cost: [6, 4], on: 'grass',  food: 3, wood: 1, stone: 1 },
  garden:  { name: 'Garden',         cost: [3, 0], on: 'grass' },
  inn:     { name: 'Inn',            cost: [8, 4], on: 'grass' },
  smithy:  { name: 'Smithy',         cost: [4, 4], on: 'grass' },
  glade:   { name: 'Music Glade',    cost: [6, 0], on: 'grass' },
  green:   { name: 'Festival Green', cost: [8, 8], on: 'grass' },
  bridge:  { name: 'Bridge',         cost: [4, 2], on: 'water',  bridge: true },
  well:    { name: 'Old Well',       cost: [0, 0], on: 'grass' },
};

export const FOLK = {
  halfling: { name: 'Halflings', one: 'halfling', home: 'burrow', loves: ['orchard', 'garden', 'inn'], hates: ['smithy', 'wood', 'lair'] },
  dwarf:    { name: 'Dwarves', one: 'dwarf', home: 'hall', loves: ['rock', 'mine', 'smithy', 'inn'], hates: ['tree', 'glade'] },
  elf:      { name: 'Elves', one: 'elf', home: 'tree', loves: ['forest', 'water', 'glade', 'garden'], hates: ['wood', 'smithy', 'warren'] },
  troll:    { name: 'Trolls', one: 'troll', home: 'troll', loves: ['water', 'dock', 'inn'], hates: ['glade', 'market'] },
  goblin:   { name: 'Goblins', one: 'goblin', home: 'warren', loves: ['mush', 'mine', 'market'], hates: ['tree', 'garden'] },
  dragon:   { name: 'the Dragon', one: 'dragon', home: 'lair', loves: ['rock', 'mine', 'smithy'], hates: ['wood', 'glade'] },
};
export const FOLK_ORDER = ['halfling', 'dwarf', 'elf', 'troll', 'goblin', 'dragon'];
export const TERRAIN_NAME = { forest: 'Forest', water: 'Water', rock: 'Rock' };

export const TER = { '.': 'grass', 'T': 'forest', '~': 'water', '^': 'rock', 'L': 'rock', 'W': 'grass' };

// Tabs: slot order = key 1..7; slot 8 is always Clear.
export const TABS = [
  { id: 'homes', name: 'Homes', tools: ['burrow', 'hall', 'tree', 'troll', 'warren', 'lair'] },
  { id: 'food', name: 'Food & Goods', tools: ['farm', 'orchard', 'dock', 'mush', 'wood', 'mine', 'market'] },
  { id: 'gather', name: 'Gathering', tools: ['garden', 'inn', 'smithy', 'glade', 'green', 'bridge'] },
];

const T1 = ['burrow', 'farm', 'orchard', 'wood', 'garden'];
const T2 = [...T1, 'bridge', 'hall', 'mine', 'smithy', 'inn'];
const T3 = [...T2, 'tree', 'dock', 'glade'];
const T4 = [...T3, 'troll', 'warren', 'mush', 'market'];
const T5 = [...T4, 'lair', 'green'];

export const LEVELS = [
  {
    name: 'Green Hollow', folk: ['halfling'], tools: T1, start: [30, 0], par: 12,
    music: 'mus-meadow', grade: null,
    intro: 'A sunny meadow by a pond. The halflings want cosy burrows, good food, and an orchard or garden within a short stroll.',
    goal: { pop: 12, harmony: 65 },
    map: [
      'TTTT............',
      'TTT.......~~....',
      'TT.......~~~~...',
      'T.........~~....',
      '.......W........',
      '................',
      '....TT..........',
      '...TTT.......TTT',
      '..TTTT......TTTT',
    ],
  },
  {
    name: 'Stonebrook', folk: ['dwarf'], tools: T2, start: [40, 20], par: 15,
    music: 'mus-meadow', grade: 'rgba(150,160,175,0.14)',
    intro: 'Dwarves have come down from the hills. They love rock, mines and a ringing smithy — which the halflings can\'t stand. An Inn softens any grudge nearby.',
    goal: { pop: 24, folk: { dwarf: 6 }, neighbours: 4, harmony: 72 },
    map: [
      'TTT.....~.....^^',
      'TT......~.....^^',
      'T.......~......^',
      '........~.......',
      '......W.~.......',
      '........~......^',
      '........~......^',
      '...^^...~....^^^',
      '..^^^...~...^^^^',
    ],
    hamlet: [['farm', 2, 3], ['orchard', 4, 3], ['burrow', 3, 4, 4], ['burrow', 5, 4, 4]],
  },
  {
    name: 'Elderwood', folk: ['elf'], tools: T3, start: [40, 20], par: 33,
    music: 'mus-woodfen', grade: 'rgba(30,80,45,0.20)',
    intro: 'Deep woods round a quiet lake. Elves love forest, water, music and gardens — but not woodcutters, smithies or goblins.',
    goal: { pop: 34, folk: { elf: 6 }, neighbours: 6, harmony: 75 },
    map: [
      'TTTTTTT....TTTTT',
      'TTTTTT..~~..TTTT',
      'TTTTT..~~~~..TTT',
      'TTT....~~~.....T',
      'T.....W........^',
      '.............^^^',
      'TT.....TT.....^^',
      'TTTT...TT.......',
      'TTTTT.......TTT^',
    ],
    hamlet: [['farm', 2, 4], ['orchard', 4, 4], ['burrow', 4, 3, 4], ['burrow', 5, 5, 4], ['mine', 14, 4], ['hall', 12, 5, 3]],
  },
  {
    name: 'Fenmarsh Crossing', folk: ['troll', 'goblin'], tools: T4, start: [40, 20], par: 26,
    music: 'mus-woodfen', grade: 'rgba(40,120,130,0.18)',
    intro: 'A marshy crossing. Trolls live in bridges over water; goblins love mushrooms, mines and markets. Keep the noisy Market away from the trolls.',
    goal: { pop: 44, folk: { troll: 4, goblin: 8 }, neighbours: 10, harmony: 75 },
    map: [
      'TTT....~~....^^^',
      'TT.....~~.....^^',
      'T......~~......^',
      '.......~~.......',
      '....W..~~.......',
      '.......~~.^^....',
      '^^.....~~.^^..TT',
      '^^^....~~....TTT',
      '^^^^...~~...TTTT',
    ],
    hamlet: [['farm', 0, 3], ['farm', 0, 4], ['orchard', 2, 4], ['garden', 2, 2], ['tree', 1, 1, 3], ['burrow', 3, 3, 4], ['burrow', 3, 5, 4], ['hall', 2, 6, 3]],
  },
  {
    name: 'Ember Fell', folk: ['dragon'], tools: T5, start: [40, 20], par: 51,
    music: 'mus-ember', grade: 'rgba(230,120,50,0.20)',
    intro: 'A dragon is looking for a home on the warm rock shelf. Give it rock, a mine and a smithy, keep woodcutters away — and gather every folk around a Festival Green for the party!',
    goal: { pop: 56, households: { halfling: 2, dwarf: 2, elf: 2, troll: 2, goblin: 2 }, dragon: true, requires: ['green'], greenAll: ['halfling', 'dwarf', 'elf', 'troll', 'goblin', 'dragon'], neighbours: 14, harmony: 82 },
    map: [
      '^^^^^^..TT~TTT^^',
      '^^^^^...TT~...^^',
      'TT^^..L..T~.....',
      'TT....L...~.....',
      'T.........~.....',
      '...W......~...TT',
      '......^...~..TTT',
      '^^........~...TT',
      '^^^.......~...^^',
    ],
    hamlet: [['farm', 3, 7], ['farm', 4, 7], ['orchard', 2, 5], ['burrow', 3, 4, 4], ['tree', 1, 3, 3], ['burrow', 2, 6, 4], ['hall', 1, 6, 3]],
  },
];

// Level 1 hint scroll (shown one at a time until done).
export const HINTS_L1 = [
  { text: 'Pick the Burrow (Homes) and build it on the grass near the Old Well.', done: s => s.b.some(b => b.kind === 'burrow') },
  { text: 'Folk need food to move in. Build a Farm (Food & Goods).', done: s => s.b.some(b => b.kind === 'farm') },
  { text: 'You\'ll need wood. Put a Woodcutter by the trees, away from the Burrows.', done: s => s.b.some(b => b.kind === 'wood') },
  { text: 'Halflings love Orchards and Gardens. Build them within 2 tiles of a Burrow.', done: s => s.b.some(b => b.kind === 'orchard') && s.b.some(b => b.kind === 'garden') },
  { text: 'Grow to 12 folk with harmony 65. Tap a home to see what it thinks.', done: () => false },
];
