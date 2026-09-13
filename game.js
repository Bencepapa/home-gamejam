'use strict';

/* ============================================================
   HOME — isometric memory puzzle (parents' bedroom vertical slice)
   Engine per DESIGN.md section 10. Grid + entity model, 2:1 dimetric
   projection measured directly off assets/room/halo.png.
   ============================================================ */

// ---- measured off the plate (tools/measure_plate.py); all overridden in
// setup() by assets/sprites.json's "_room" block if present, so the whole
// projection can be tuned from tools/anchor_editor.html without code edits ----
let GRID_W = 6, GRID_H = 6; // separate width/height -- not every room is square (the corridor is a hallway, 7x3)
// Per-axis screen vectors (px moved per +1 grid step). Kept independent
// rather than a single symmetric TW/TH, because a real plate photo/render
// can have two axes that aren't perfect mirror images of each other.
let AXIS_X = { x: 100.4, y: 50.4 };
let AXIS_Y = { x: -100.4, y: 50.4 };
const ZH = 64;                   // one z-level; deliberately not TH or TH/2
let ORIGIN = { x: 720, y: 395 }; // plate's back apex == grid (0,0)

const DESIGN_W = 1448, DESIGN_H = 1086; // native plate resolution
let scaleF = 1, offX = 0, offY = 0;

const STATE = { INTRO: 'intro', PLAY: 'play', WIN: 'win' };
let state = STATE.INTRO;
let era = 'present'; // 'present' | 'past'

let transitioning = false;
let transitionT = 0;
let pendingEra = null;
let pendingAction = null;

let toast = null;
let stepBusy = false;
const STEP_MS = 160;

let images = {};
let spriteMeta = {}; // assets/sprites.json -- per-sprite anchor point + scale
let plateDesat = {}; // cached desaturated plates for present era, keyed by plateImg key

const DEFAULT_SPRITE_META = { anchor: { x: 0.5, y: 0.9 }, scale: 1 };

/* ---------------- I18N ---------------- */

const STRINGS = {
  en: {
    title: 'HOME',
    subtitle: "Your parents' old bedroom. You left something in there.",
    enter: 'Enter',
    enterHint: 'Click, or press Space / Enter',
    eraPresent: 'Present — the room, now',
    eraPast: 'Past — the memory',
    undo: 'undo',
    interact: 'interact',
    winTitle: "You found dad's watch.",
    winSubtitle: "That's it. I found my way home.",
    lookBed: "My parents' bed. I used to crawl in here after a bad dream.",
    lookNightstand: "Dad's watch and glasses used to sit here every evening.",
    lookWardrobe: 'I hide in here when mom is angry.',
    lookBoxBed: "Mom's clothes, folded neatly. No one has ever seen this.",
    lookBoxNightstand: "Dad's drawer, emptied out. His watch isn't here. It never turned up.",
    alreadyRemember: 'I already remember.',
    touchCribToast: 'You touch the crib. The memory pulls you back.',
    cribPastToast: 'My own crib. Strange, seeing it from here.',
    wardrobeFoundToast: 'The watch. There it is, where the baby rolled it.',
    wardrobeSearchToast: "The old wardrobe. I'm looking for something in it, but I don't know what.",
    watchFallToast: 'The watch tumbles off the nightstand...',
    watchHitsCribToast: '...and rolls straight into the crib.',
    watchRollsToast: '...and rolls off toward the bed.',
    watchGoalToast: 'The watch rolls under the wardrobe.',
    babyCriesToast: 'The baby starts crying.',
    quietRoomToast: "It's quiet. Just the room.",
    watchBreakToast: "That's not how it happened. How was it again?",
    watchResetToast: 'The watch is back on the nightstand.',
    introFirstToast: 'A maze of boxes surrounds the crib in the middle. Somehow familiar.',
    lookTV: 'My favorite game is Ice Climber.',
    tvTouchToast: 'You touch the TV. The memory pulls you back.',
    lookCoatrack: 'Two coats hang here now. There used to be four.',
    roomBedroom: 'Bedroom',
    roomLiving: 'Living room',
    roomCorridor: 'Corridor'
  },
  hu: {
    title: 'HOME',
    subtitle: 'A szülők egykori hálószobája. Valamit ott hagytál benne.',
    enter: 'Belépek',
    enterHint: 'Kattints, vagy nyomj Space / Entert',
    eraPresent: 'Jelen — a szoba most',
    eraPast: 'Múlt — az emlék',
    undo: 'vissza',
    interact: 'interakció',
    winTitle: 'Megtaláltad apa óráját.',
    winSubtitle: 'Ennyi volt. Hazataláltam.',
    lookBed: 'A szüleim ágya. Ide bújtam be, ha rosszat álmodtam.',
    lookNightstand: 'Apa órája és a szemüvege szokott itt lenni esténként.',
    lookWardrobe: 'Ide bújok, ha anya mérges.',
    lookBoxBed: 'Anya ruhái, gondosan összehajtva. Sose látta ezt még senki.',
    lookBoxNightstand: 'Apa fiókjának tartalma. Az órája nincs itt. Sosem került elő.',
    alreadyRemember: 'Már emlékszem.',
    touchCribToast: 'Megérinted a bölcsőt. Az emlék visszahúz.',
    cribPastToast: 'A saját bölcsőm. Furcsa innen nézni.',
    wardrobeFoundToast: 'Az óra. Ott van, ahová a baba begörgette.',
    wardrobeSearchToast: 'A régi szekrény. Valamit keresek benne, de nem tudom, mit.',
    watchFallToast: 'Az óra lepottyan az éjjeliszekrényről...',
    watchHitsCribToast: '...és nekigurul a bölcsőnek.',
    watchRollsToast: '...és odagurul az ágy mellé.',
    watchGoalToast: 'Az óra begördül a szekrény alá.',
    babyCriesToast: 'A baba felsír.',
    quietRoomToast: 'Csend van. Csak a szoba.',
    watchBreakToast: 'Nem így történt, hogy is volt?',
    watchResetToast: 'Az óra visszakerül az éjjeliszekrényre.',
    introFirstToast: 'A doboz-labirintus közepén a bölcső áll. Valahogy ismerős.',
    lookTV: 'A kedvenc játékom az Ice Climber.',
    tvTouchToast: 'Megérinted a tévét. Az emlék visszahúz.',
    lookCoatrack: 'Két kabát lóg itt most. Régen négy volt.',
    roomBedroom: 'Hálószoba',
    roomLiving: 'Nappali',
    roomCorridor: 'Folyosó'
  }
};

function detectLang() {
  try {
    const saved = localStorage.getItem('home_lang');
    if (saved === 'en' || saved === 'hu') return saved;
  } catch (e) { /* localStorage unavailable -- fall through to autodetect */ }
  return (navigator.language || '').toLowerCase().startsWith('hu') ? 'hu' : 'en';
}

let lang = detectLang();
function t(key) { return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; }
function setLang(l) {
  lang = l;
  try { localStorage.setItem('home_lang', l); } catch (e) { /* ignore */ }
}

/* ---------------- ASSETS ---------------- */

function preload() {
  images.plate = loadImage('assets/room/halo.png');
  images.lightmap = loadImage('assets/room/halo_lightmap.png');
  images.livingPlate = loadImage('assets/room/nappali.png');
  images.crib = loadImage('assets/sprites/bolcso.png');
  images.bed = loadImage('assets/sprites/agy.png');
  images.wardrobe = loadImage('assets/sprites/szekreny.png');
  images.wardrobeEmpty = loadImage('assets/sprites/szekreny_ures.png');
  images.shelf1 = loadImage('assets/sprites/konyvszekr1.png');
  images.shelf2 = loadImage('assets/sprites/konyvszekr2.png');
  images.nightstand = loadImage('assets/sprites/ejjelisz.png');
  images.watch = loadImage('assets/sprites/ora.png');
  images.box1x1 = loadImage('assets/sprites/doboz_1x1.png');
  images.box1x2 = loadImage('assets/sprites/doboz_1x2.png');
  const CHAR_POSES = { man30: ['stand', 'touch'], kid2: ['stand', 'touch'], kid10: ['stand', 'touch', 'sit'] };
  for (const ch in CHAR_POSES) {
    for (const dir of ['ne', 'se']) {
      for (const pose of CHAR_POSES[ch]) {
        const key = `${ch}_${dir}_${pose}`;
        images[key] = loadImage(`assets/sprites/${key}.png`);
      }
    }
  }
  spriteMeta = loadJSON('assets/sprites.json');
}

function metaFor(imgKey) {
  return spriteMeta[imgKey] || DEFAULT_SPRITE_META;
}

/* ---------------- ISO TRANSFORM ---------------- */

function iso(x, y, z = 0) {
  return {
    x: ORIGIN.x + x * AXIS_X.x + y * AXIS_Y.x,
    y: ORIGIN.y + x * AXIS_X.y + y * AXIS_Y.y - z * ZH
  };
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < GRID_W && y < GRID_H;
}

/* ---------------- ENTITY MODEL ----------------
   cells: footprint offsets from (x,y). push: false|'any'|'axis'.
   era: 'past' | 'present' | 'both'. Which present-era entity stays in
   color (the "active" one) is decided dynamically by isColorAnchor().
------------------------------------------------- */

function makeBedroomEntities() {
  return [
    // grid mapping (per user's corrected ASCII floor plan): origin sits at
    // the top-right of the plan, +x grows LEFT (toward the window wall),
    // +y grows DOWN (toward the door wall) -- i.e. x = 5 - column, y = row.
    {
      // Two separate entities, not one era:'both' one -- the present and
      // past puzzles must never share mutable state. Pushing the crib
      // around in the past (the baby's doing) must not move "the crib" in
      // the present, and vice versa, even though it's visually the same
      // object. Whether crib_present desaturates is dynamic (see
      // isColorAnchor) -- it's the "active color" signal until solved.
      id: 'crib_present', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
      x: 3, y: 2, z: 0, height: 1,
      push: 'any', blocking: true, stackable: false, // pushable here too -- just independent of crib_past
      interact: 'use', era: 'present',
      img: 'crib'
    },
    {
      id: 'crib_past', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
      x: 3, y: 2, z: 0, height: 1,
      push: 'any', blocking: true, stackable: false, // the baby can shove it around the room
      interact: 'use', era: 'past',
      img: 'crib'
    },

    // --- past-only furniture (the parents' room as it was) ---
    {
      id: 'bed', cells: [
        { dx: 0, dy: 0 }, { dx: 1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
        { dx: 0, dy: 2 }, { dx: 1, dy: 2 }
      ],
      x: 4, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'past',
      img: 'bed',
      lookKey: 'lookBed'
    },
    {
      id: 'nightstand', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'past', mirror: true,
      img: 'nightstand',
      lookKey: 'lookNightstand'
    },
    {
      id: 'wardrobe', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
      x: 0, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'past',
      img: 'wardrobe',
      lookKey: 'lookWardrobe'
    },
    {
      // sits visually on the nightstand until it's knocked off (see
      // onNightstandBump). attachedTo/attachOffset render it relative to
      // the TARGET entity's own anchor point (not its own grid cell), so
      // it rides along with the nightstand and its own sprite anchor stays
      // normal instead of needing to be hand-tuned into some huge fraction.
      id: 'watch', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 0.2,
      push: false, blocking: false, stackable: false, fallen: false,
      attachedTo: 'nightstand', attachOffset: { x: 0, y: -100 },
      interact: null, era: 'past',
      img: 'watch'
    },

    // --- present-only: boxes filling the same footprint area ---
    {
      // x:3 (not 4) so there's a clear cell on BOTH sides along its push
      // axis -- at x:4 its right edge sat flush against the grid boundary
      // (x:5 is the last column), so it could never be pushed: +x push hit
      // the wall, and -x push needed the actor standing at x:6, off-grid.
      id: 'box_bed_1', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }],
      x: 3, y: 1, z: 0, height: 1,
      push: 'axis', axis: 'x', blocking: true, stackable: true,
      interact: 'look', era: 'present',
      img: 'box1x2',
      lookKey: 'lookBoxBed'
    },
    {
      id: 'box_nightstand', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 1,
      push: 'any', pull: true, blocking: true, stackable: true,
      interact: 'look', era: 'present',
      img: 'box1x1',
      lookKey: 'lookBoxNightstand'
    },
    {
      // the actual wardrobe, not boxes -- it stayed exactly where it stood
      // in the past. Desaturates like everything else in the present UNTIL
      // watchFound flips it to the active color (see isColorAnchor) -- it's
      // where the watch turns up, once the past puzzle has pushed it under
      // there. See the 'wardrobe_present' interact below.
      id: 'wardrobe_present', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
      x: 0, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'present',
      img: 'wardrobeEmpty' // emptied out for the move, not just a grayed copy of the full one
    }
  ];
}

// ---- living room (nappali) -- layout only for now, per the user's grid
// spec. Every piece still uses the bedroom's box1x1/box1x2 sprites as a
// placeholder ("díszlet") until the real art lands; only id/cells/position
// carry meaning yet. Wall convention matches the bedroom: y=0 is the
// window wall (TV lives there), x=0 is the shelf/door wall (door opening
// at y=4-5, below shelf2).
function makeLivingEntities() {
  return [
    // the TV is this room's transition trigger/anchor, same role the crib
    // plays in the bedroom -- split present/past for the same reason.
    {
      id: 'tv_present', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'use', era: 'present',
      img: 'box1x1'
    },
    {
      id: 'tv_past', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'past',
      img: 'box1x1',
      lookKey: 'lookTV'
    },

    // bookshelves, unchanged between eras for now (era: 'both') -- which
    // one is "empty" vs "still full" is pending the real puzzle logic
    { id: 'shelf1', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }], x: 0, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false, interact: null, era: 'both', img: 'shelf1' },
    { id: 'shelf2', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }], x: 0, y: 2, z: 0, height: 1,
      push: false, blocking: true, stackable: false, interact: null, era: 'both', img: 'shelf2' },

    // L-shaped couch (two pieces), coffee table in front of it, decor
    { id: 'couch1', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }], x: 3, y: 4, z: 0, height: 1,
      push: false, blocking: true, stackable: false, interact: null, era: 'both', img: 'box1x2' },
    { id: 'couch2', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }], x: 5, y: 3, z: 0, height: 1,
      push: false, blocking: true, stackable: false, interact: null, era: 'both', img: 'box1x2' },
    { id: 'table', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }], x: 3, y: 2, z: 0, height: 1,
      push: false, blocking: true, stackable: false, interact: null, era: 'both', img: 'box1x2' },
    { id: 'planter', cells: [{ dx: 0, dy: 0 }], x: 6, y: 1, z: 0, height: 1,
      push: false, blocking: true, stackable: false, interact: null, era: 'both', img: 'box1x1' },

    // the pouf the kid pushes to the shelf and climbs -- past only for now
    { id: 'puff', cells: [{ dx: 0, dy: 0 }], x: 1, y: 3, z: 0, height: 1,
      push: 'any', blocking: true, stackable: true, interact: null, era: 'past', img: 'box1x1' },

    // present-only clutter blocking the path to the TV
    { id: 'box_living_1', cells: [{ dx: 0, dy: 0 }], x: 3, y: 1, z: 0, height: 1,
      push: 'any', blocking: true, stackable: true, interact: null, era: 'present', img: 'box1x1' },
    { id: 'box_living_2', cells: [{ dx: 0, dy: 0 }], x: 1, y: 1, z: 0, height: 1,
      push: 'any', blocking: true, stackable: true, interact: null, era: 'present', img: 'box1x1' },
    { id: 'box_living_3', cells: [{ dx: 0, dy: 0 }], x: 2, y: 5, z: 0, height: 1,
      push: 'any', blocking: true, stackable: true, interact: null, era: 'present', img: 'box1x1' }
  ];
}

// ---- corridor (folyosó) -- the hub. 7 wide x 3 deep, all 4 room doors
// along the y=0 wall (only two rooms exist so far -- the other two door
// slots aren't placed until gyerekszoba/ebédlő exist). Placeholder boxes
// stand in for the coat rack and doors until there's real art; door
// entities just call switchRoom() directly rather than a real transition,
// since there's no per-room "return to corridor" doorway wired up yet.
function makeCorridorEntities() {
  return [
    { id: 'coatrack', cells: [{ dx: 0, dy: 0 }], x: 3, y: 2, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'both', img: 'box1x1', lookKey: 'lookCoatrack' },
    { id: 'door_bedroom', cells: [{ dx: 0, dy: 0 }], x: 1, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'use', era: 'both', img: 'box1x1' },
    { id: 'door_living', cells: [{ dx: 0, dy: 0 }], x: 5, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'use', era: 'both', img: 'box1x1' }
  ];
}

// ---- room registry. Press 1/2/3 in-game to switch rooms directly
// (dev-only, until the corridor's own doors do this in-fiction).
const ROOMS = {
  bedroom: {
    gridW: 6, gridH: 6, axisX: { x: 100.4, y: 50.4 }, axisY: { x: -100.4, y: 50.4 },
    originPx: { x: 720, y: 395 },
    plateImg: 'plate', lightmapImg: 'lightmap',
    spritesJsonKey: '_room', // unprefixed, for backward compatibility
    makeEntities: makeBedroomEntities,
    spawn: { x: 0, y: 4, facing: { x: 1, y: 0 } },
    pastCharacter: 'kid2' // the baby
  },
  living: {
    // fallback axis vectors below, used only until tools/anchor_editor.html
    // has measured the real plate and written a '_room_living' block to
    // sprites.json (see applyRoomConfig)
    gridW: 7, gridH: 7, axisX: { x: 100.4, y: 50.4 }, axisY: { x: -100.4, y: 50.4 },
    originPx: { x: 720, y: 395 },
    plateImg: 'livingPlate', lightmapImg: null,
    spritesJsonKey: '_room_living',
    makeEntities: makeLivingEntities,
    spawn: { x: 1, y: 4, facing: { x: 1, y: 0 } },
    pastCharacter: 'kid10' // the preschooler
  },
  corridor: {
    // hallway, not a room -- deliberately non-square (7 long x 3 deep).
    // No plate generated/measured yet, same placeholder-axis situation the
    // living room started in.
    gridW: 7, gridH: 3, axisX: { x: 100.4, y: 50.4 }, axisY: { x: -100.4, y: 50.4 },
    originPx: { x: 720, y: 395 },
    plateImg: null, lightmapImg: null,
    spritesJsonKey: '_room_corridor',
    makeEntities: makeCorridorEntities,
    spawn: { x: 3, y: 1, facing: { x: 0, y: -1 } },
    pastCharacter: null // no flashback scene of its own (yet)
  }
};
let currentRoomId = 'bedroom';
const ROOM_NAME_KEYS = { bedroom: 'roomBedroom', living: 'roomLiving', corridor: 'roomCorridor' };

function applyRoomConfig(roomId) {
  const cfg = ROOMS[roomId];
  GRID_W = cfg.gridW;
  GRID_H = cfg.gridH;
  AXIS_X = cfg.axisX;
  AXIS_Y = cfg.axisY;
  ORIGIN = cfg.originPx;
  // real, measured calibration from sprites.json (written by
  // tools/anchor_editor.html) overrides the fallback values above, once
  // it exists -- each room's block lives under its own key there
  // ('_room' for the bedroom, kept unprefixed for backward compatibility;
  // '_room_<id>' for every other room)
  const room = spriteMeta[cfg.spritesJsonKey];
  if (room) {
    if (room.originPx) ORIGIN = room.originPx;
    // gridW/gridH (independent dimensions) win when present; gridN is the
    // older square-only field, kept for rooms calibrated before the
    // corridor needed a non-square grid
    if (room.gridW) GRID_W = room.gridW;
    else if (room.gridN) GRID_W = room.gridN;
    if (room.gridH) GRID_H = room.gridH;
    else if (room.gridN) GRID_H = room.gridN;
    if (room.axisX && room.axisY) {
      AXIS_X = room.axisX;
      AXIS_Y = room.axisY;
    } else if (room.tileW) {
      const tw = room.tileW, th = room.tileH || room.tileW / 2;
      AXIS_X = { x: tw / 2, y: th / 2 };
      AXIS_Y = { x: -tw / 2, y: th / 2 };
    }
  }
  computeDirs();
}

function switchRoom(roomId) {
  if (!ROOMS[roomId] || roomId === currentRoomId) return;
  currentRoomId = roomId;
  applyRoomConfig(roomId);
  resetGame();
}

let entities = [];
let actor = { x: 0, y: 4, z: 0, facing: { x: 1, y: 0 } };
let undoStack = [];
let watchFound = false;
const WATCH_GOAL = { x: 0, y: 0 }; // under the wardrobe

function resetGame() {
  const cfg = ROOMS[currentRoomId];
  entities = cfg.makeEntities();
  era = 'present';
  actor = { x: cfg.spawn.x, y: cfg.spawn.y, z: 0, facing: { ...cfg.spawn.facing } };
  undoStack = [];
  watchFound = false; // only meaningful in the bedroom; harmless elsewhere
}

function activeEntities() {
  return entities.filter(e => e.era === era || e.era === 'both');
}

function entityAt(x, y, z, filterFn) {
  for (const e of activeEntities()) {
    if (filterFn && !filterFn(e)) continue;
    for (const c of e.cells) {
      if (e.x + c.dx === x && e.y + c.dy === y && e.z === z) return e;
    }
  }
  return null;
}

function standable(x, y, z) {
  if (!inBounds(x, y)) return false;
  if (entityAt(x, y, z, e => e.blocking)) return false;
  if (z === 0) return true;
  const below = entityAt(x, y, z - 1, () => true);
  return !!(below && below.stackable);
}

/* ---------------- SETUP / DRAW ---------------- */

function setup() {
  const holder = document.getElementById('gameHolder');
  const c = createCanvas(windowWidth, windowHeight);
  c.parent(holder);
  resizeCalc();
  noStroke();
  textFont('Georgia, serif');
  imageMode(CENTER);
  rectMode(CORNER);
  applyRoomConfig(currentRoomId);
  resetGame();
  buildDesaturatedPlate();
  buildDesaturatedSprites();
}

function buildDesaturatedPlate() {
  for (const roomId in ROOMS) {
    const key = ROOMS[roomId].plateImg;
    const img = key && images[key];
    if (!img || plateDesat[key]) continue;
    const g = createGraphics(img.width, img.height);
    g.image(img, 0, 0, g.width, g.height); // graphics buffers default to CORNER mode
    g.filter(GRAY);
    plateDesat[key] = g;
  }
}

// Present-day props (not the actor) desaturate by default, per DESIGN.md's
// "active color" rule -- exactly one object stays in color at a time, and
// that object IS the "go here next" signal. See isColorAnchor().
const DESATURATABLE_SPRITES = ['crib', 'bed', 'wardrobe', 'wardrobeEmpty', 'nightstand', 'watch', 'box1x1', 'box1x2', 'shelf1', 'shelf2'];
let imagesDesat = {};
function buildDesaturatedSprites() {
  for (const key of DESATURATABLE_SPRITES) {
    const img = images[key];
    if (!img) continue;
    const g = createGraphics(img.width, img.height);
    g.image(img, 0, 0, g.width, g.height);
    g.filter(GRAY);
    imagesDesat[key] = g;
  }
}

// Exactly one entity is the "active color" at a time: the crib until the
// past puzzle is solved, then the wardrobe (where the watch turns up).
function isColorAnchor(e) {
  if (e.id === 'crib_present') return !watchFound;
  if (e.id === 'wardrobe_present') return watchFound;
  if (e.id === 'tv_present') return true; // TODO: gate on a "solved" flag once the room's puzzle exists
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resizeCalc();
}

function resizeCalc() {
  scaleF = min(width / DESIGN_W, height / DESIGN_H);
  offX = (width - DESIGN_W * scaleF) / 2;
  offY = (height - DESIGN_H * scaleF) / 2;
}

function toDesign(px, py) {
  return { x: (px - offX) / scaleF, y: (py - offY) / scaleF };
}

function draw() {
  background(8, 10, 14);
  push();
  translate(offX, offY);
  scale(scaleF);
  imageMode(CENTER);

  if (state === STATE.INTRO) {
    drawIntro();
  } else {
    updateTransition();
    drawScene();
    drawHUD();
    if (transitioning) drawFade();
    if (state === STATE.WIN) drawWinOverlay();
  }
  drawToast();
  pop();
}

/* ---------------- INTRO ---------------- */

let introButton = null;
function drawIntro() {
  background(18, 20, 28);
  push();
  imageMode(CENTER);
  tint(255, 60);
  image(images.plate, DESIGN_W / 2, DESIGN_H / 2, images.plate.width * 0.7, images.plate.height * 0.7);
  noTint();
  textAlign(CENTER, CENTER);
  fill(255, 236, 200);
  textSize(52);
  text(t('title'), DESIGN_W / 2, DESIGN_H / 2 - 160);
  fill(230);
  textSize(20);
  text(t('subtitle'), DESIGN_W / 2, DESIGN_H / 2 - 90);

  // a plain, understated prompt instead of a generic filled button -- fits
  // the antique/melancholy tone better than a rounded-rect UI widget
  const label = t('enter');
  textSize(26);
  const tw = textWidth(label);
  const cx = DESIGN_W / 2, cy = DESIGN_H / 2 + 10;
  const bw = tw + 80, bh = 56; // generous click/tap target around the text
  const bx = cx - bw / 2, by = cy - bh / 2;
  const hover = pointInRect(mouseDesign(), bx, by, bw, bh);
  fill(hover ? color(255, 230, 190) : color(220, 195, 160));
  text(label, cx, cy);
  stroke(hover ? color(255, 230, 190) : color(220, 195, 160));
  strokeWeight(1.5);
  line(cx - tw / 2 - 14, cy + 22, cx + tw / 2 + 14, cy + 22);
  noStroke();
  fill(170);
  textSize(13);
  text(t('enterHint'), cx, cy + 50);
  introButton = { x: bx, y: by, w: bw, h: bh };

  drawLangToggle();
  pop();
}

let langButton = null;
function drawLangToggle() {
  const bw = 64, bh = 32;
  const bx = DESIGN_W - bw - 24, by = 24;
  const hov = pointInRect(mouseDesign(), bx, by, bw, bh);
  fill(hov ? color(255, 255, 255, 55) : color(255, 255, 255, 22));
  rect(bx, by, bw, bh, 6);
  fill(230);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(lang === 'hu' ? 'EN' : 'HU', bx + bw / 2, by + bh / 2 + 1);
  langButton = { x: bx, y: by, w: bw, h: bh };
}

/* ---------------- SCENE ---------------- */

const LIGHTMAP_BASE = 0.12;   // alpha at t=0 (within the requested 0.10-0.15)
const LIGHTMAP_MIN = 0.05;
const LIGHTMAP_MAX = 0.50;

function lightmapAlpha() {
  const t = millis() * 0.001;
  const slowBreath = 0.30 * sin(t * 0.05);  // big amplitude, very slow -- the "breathing"
  const medWave = 0.15 * sin(t * 0.3);      // slower flicker
  const fastWave = 0.1 * sin(t * 1.1);     // faster flicker
  return constrain(LIGHTMAP_BASE + slowBreath + medWave + fastWave, LIGHTMAP_MIN, LIGHTMAP_MAX);
}

function drawScene() {
  const room = ROOMS[currentRoomId];
  const rawPlate = room.plateImg ? images[room.plateImg] : null;
  const plateImg = (era === 'present' && plateDesat[room.plateImg]) ? plateDesat[room.plateImg] : rawPlate;
  if (plateImg) {
    imageMode(CENTER);
    image(plateImg, DESIGN_W / 2, DESIGN_H / 2);
  } else {
    // no plate art yet for this room -- flat floor + grid so the layout
    // is checkable before the real plate exists (see ROOMS.living)
    fill(40, 36, 30);
    rect(0, 0, DESIGN_W, DESIGN_H);
    drawDebugGrid();
  }

  const drawables = [];

  for (const e of activeEntities()) {
    const front = e.cells.reduce((a, b) => (a.dx + a.dy > b.dx + b.dy ? a : b));
    const depth = (e.x + front.dx + e.y + front.dy) * 1000 + e.z * 10 + 2;
    drawables.push({ depth, draw: () => drawEntity(e) });
  }

  {
    const depth = (actor.x + actor.y) * 1000 + actor.z * 10 + 2;
    drawables.push({ depth, draw: () => drawActor() });
  }

  drawables.sort((a, b) => a.depth - b.depth);
  for (const d of drawables) d.draw();

  // lightmap glow -- flickers gently: two faster sines dither the opacity,
  // a third, slow, big-amplitude sine drifts it up and down like a breath.
  // All phases start at 0, so alpha(0) == LIGHTMAP_BASE exactly.
  if (room.lightmapImg && images[room.lightmapImg]) {
    push();
    tint(255, 255, 255, lightmapAlpha() * 255);
    imageMode(CENTER);
    image(images[room.lightmapImg], DESIGN_W / 2, DESIGN_H / 2);
    noTint();
    pop();
  }

  if (DEBUG_GRID) drawDebugGrid();
}

const BUMP_MS = 130; // decay time for the walk-into-it (stationary) wobble
const DROP_MS = 380; // time spent visually falling before it starts rolling
const ROLL_MS = 650; // time spent rolling to where it comes to rest
const FADE_MS = 550; // time spent dissolving away after breaking

function triggerBump(e, dir) {
  e.bumpT = 1;
  e.bumpDir = (dir && dir.x !== 0) ? Math.sign(dir.x) : 1;
}

// Slide animation for an entity that actually changed grid cell (pushed
// box, rolled watch). e.x/e.y are already the new LOGICAL position by the
// time this is called; we just remember where it visually came from and
// ease the render position toward it over a short, distance-scaled time.
// A watch rolling 2 cells in one push still gets ONE tween end to end,
// not two chained ones, since fromX/fromY is always its pre-push cell.
function startMoveAnim(e, fromX, fromY, dir, durMsOverride) {
  e.animFromX = fromX;
  e.animFromY = fromY;
  e.animT = 0;
  const dist = Math.hypot(e.x - fromX, e.y - fromY) || 1;
  e.animDurMs = durMsOverride || (120 + dist * 40); // fast, a little longer for a 2-cell roll
  e.animDir = (dir && dir.x !== 0) ? Math.sign(dir.x) : 1;
}

// Base screen anchor for an entity's OWN grid cell (front corner of its
// footprint, plus its own pixelOffset if any) -- ignores attachedTo.
function entityBasePoint(e) {
  const front = e.cells.reduce((a, b) => (a.dx + a.dy > b.dx + b.dy ? a : b));
  const p = iso(e.x + front.dx + 1, e.y + front.dy + 1, e.z);
  if (e.pixelOffset) { p.x += e.pixelOffset.x; p.y += e.pixelOffset.y; }
  return p;
}

function drawEntity(e) {
  let rx = e.x, ry = e.y;
  let skew = 0;

  if (e.bumpT > 0) {
    e.bumpT = max(0, e.bumpT - deltaTime / BUMP_MS);
    const eraFactor = era === 'past' ? 0.6 : 1; // the baby bumps things more gently
    skew += sin(e.bumpT * PI) * 0.2 * eraFactor * (e.bumpDir || 1);
  }
  if (e.animT !== undefined && e.animT < 1) {
    e.animT = min(1, e.animT + deltaTime / (e.animDurMs || 150));
    const eased = 1 - pow(1 - e.animT, 3); // ease-out cubic
    rx = lerp(e.animFromX, e.x, eased);
    ry = lerp(e.animFromY, e.y, eased);
    skew += sin(min(e.animT, 1) * PI) * 0.15 * (e.animDir || 1);
  }
  if (e.mirror) skew *= -1; // the mirror scale() below flips the shear too

  let p;
  if (e.attachedTo) {
    const target = entities.find(t => t.id === e.attachedTo);
    p = target ? entityBasePoint(target) : entityBasePoint(e);
    if (target && e.attachOffset) { p.x += e.attachOffset.x; p.y += e.attachOffset.y; }
  } else {
    // unsliced sprite: anchor at the near (screen-lowest) corner of the
    // frontmost cell in its footprint, not the footprint's center.
    const front = e.cells.reduce((a, b) => (a.dx + a.dy > b.dx + b.dy ? a : b));
    p = iso(rx + front.dx + 1, ry + front.dy + 1, e.z);
    if (e.pixelOffset) { p.x += e.pixelOffset.x; p.y += e.pixelOffset.y; }
    if (e.dropT > 0) { // falling off something it was attached to
      e.dropT = max(0, e.dropT - deltaTime / DROP_MS);
      p.y -= 70 * e.dropT; // still airborne, eases down to the floor
    }
  }
  const img = images[e.img];
  if (!img) return;
  const desatAmt = desaturationAmount(e); // 0 = full color, 1 = fully gray
  const desatImg = imagesDesat[e.img];
  const meta = metaFor(e.img);
  const w = img.width * meta.scale;
  const h = img.height * meta.scale;
  const ax = meta.anchor.x;
  const ay = meta.anchor.y;

  // fadeT ramps 0->1 to visually dissolve an entity in place (e.g. the
  // watch breaking) -- a placeholder for swapping in a broken-watch sprite
  // later; for now it just fades away to show something went wrong.
  let fadeAlpha = 255;
  if (e.fadeT !== undefined && e.fadeT < 1) {
    e.fadeT = min(1, e.fadeT + deltaTime / FADE_MS);
    fadeAlpha = (1 - e.fadeT) * 255;
  } else if (e.fadeT >= 1) {
    return; // fully dissolved -- nothing left to draw
  }

  push();
  translate(p.x, p.y);
  if (e.mirror) scale(-1, 1);
  if (skew !== 0) drawingContext.transform(1, 0, skew, 1, 0, 0);
  imageMode(CORNER);
  const highlight = e.interact && state === STATE.PLAY && isFacingEntity(e);
  if (highlight) {
    drawingContext.shadowColor = 'rgba(255,220,140,0.9)';
    drawingContext.shadowBlur = 20;
  }
  tint(255, 255, 255, fadeAlpha);
  image(img, -w * ax, -h * ay, w, h); // color base, always
  if (desatAmt > 0 && desatImg) {
    tint(255, 255, 255, desatAmt * fadeAlpha); // gray overlay blended on top (0.5 = "still newish")
    image(desatImg, -w * ax, -h * ay, w, h);
  }
  noTint();
  if (highlight) drawingContext.shadowBlur = 0;
  pop();
}

// Boxes are new (moving-day cardboard), not aged like the rest of the
// room, so they only partially desaturate. Everything else in the
// desaturatable set goes fully gray, except the current color anchor.
function desaturationAmount(e) {
  if (era !== 'present' || isColorAnchor(e)) return 0;
  if (e.img === 'box1x1' || e.img === 'box1x2') return 0.5;
  return imagesDesat[e.img] ? 1 : 0;
}

const WALK_MS = 220; // one totter cycle per completed step
let actorWalk = { t: 1 };
let actorStepParity = 1;
function triggerWalk() {
  actorWalk.t = 0;
  actorStepParity *= -1; // alternate lean side each step, like a real gait
}

// Only NE and SE are real art; NW/SW are the mirror images of them. The
// grid's two axes each point at one screen diagonal (see AXIS_X/AXIS_Y),
// so the four possible single-axis facings map onto exactly these four.
function facingToSpriteDir(facing) {
  if (facing.x === -1) return { dir: 'ne', mirror: false };
  if (facing.x === 1) return { dir: 'se', mirror: true };
  if (facing.y === 1) return { dir: 'se', mirror: false };
  if (facing.y === -1) return { dir: 'ne', mirror: true };
  return { dir: 'se', mirror: false };
}

const TOUCH_MS = 300; // how long the touch pose holds after an interaction (2/3 of the original 450)
let actorTouchT = 0;
function triggerTouch() { actorTouchT = TOUCH_MS; }

// per-character walk/shadow tuning -- keyed by the sprite prefix, not by
// a single baby/adult split, since each room's past can use a different
// kid (the bedroom's baby totters harder and casts a smaller shadow than
// the living room's older preschooler, who in turn is smaller than the
// adult)
const CHAR_TRAITS = {
  man30: { wobbleAmp: 1, shadowMult: 0.62, shadowMin: 42 },
  kid2: { wobbleAmp: 3, shadowMult: 0.5, shadowMin: 26 },
  kid10: { wobbleAmp: 2, shadowMult: 0.55, shadowMin: 32 }
};

function drawActor() {
  const p = iso(actor.x + 0.5, actor.y + 0.5, actor.z); // feet at the cell's center, not its corner
  const character = era === 'past' ? ROOMS[currentRoomId].pastCharacter : 'man30';
  const traits = CHAR_TRAITS[character] || CHAR_TRAITS.man30;

  if (actorWalk.t < 1) actorWalk.t = min(1, actorWalk.t + deltaTime / WALK_MS);
  const wob = actorWalk.t < 1 ? sin(actorWalk.t * PI) : 0;
  if (actorTouchT > 0) actorTouchT = max(0, actorTouchT - deltaTime);
  const wobbleAmp = traits.wobbleAmp;

  const pose = actorTouchT > 0 ? 'touch' : 'stand';
  const { dir, mirror } = facingToSpriteDir(actor.facing);
  const key = `${character}_${dir}_${pose}`;
  const img = images[key];
  if (!img) return;
  const meta = metaFor(key); // scale is 1 here -- sprites are already sized 1:1 to the grid
  const w = img.width * meta.scale;
  const h = img.height * meta.scale;

  push();
  translate(p.x, p.y);
  noStroke();
  fill(0, 0, 0, 90);
  const shadowW = max(traits.shadowMin, w * traits.shadowMult); // floor so it's never invisible
  ellipse(0, -2, shadowW, shadowW * 0.42); // ground shadow stays put, doesn't wobble

  rotate(radians(3.5) * wobbleAmp * actorStepParity * wob);
  const stretchX = 1 + wob * 0.05 * wobbleAmp;
  const stretchY = 1 - wob * 0.05 * wobbleAmp;
  scale((mirror ? -1 : 1) * stretchX, stretchY); // mirror + walk stretch combined

  if (pose === 'touch' && actorTouchT > 0) {
    // leans forward into whatever it's touching, easing in and back out
    const tProg = constrain(actorTouchT / TOUCH_MS, 0, 1);
    const touchSkew = sin(tProg * PI) * 0.22 * (mirror ? -1 : 1);
    drawingContext.transform(1, 0, touchSkew, 1, 0, 0);
  }

  imageMode(CORNER);
  image(img, -w * meta.anchor.x, -h * meta.anchor.y, w, h);
  pop();
}

function isFacingEntity(e) {
  const fx = actor.x + actor.facing.x, fy = actor.y + actor.facing.y;
  return e.cells.some(c => e.x + c.dx === fx && e.y + c.dy === fy);
}

const DEBUG_GRID = false;
function drawDebugGrid() {
  stroke(0, 255, 255, 90);
  strokeWeight(1);
  for (let gx = 0; gx <= GRID_W; gx++) {
    const a = iso(gx, 0), b = iso(gx, GRID_H);
    line(a.x, a.y, b.x, b.y);
  }
  for (let gy = 0; gy <= GRID_H; gy++) {
    const a = iso(0, gy), b = iso(GRID_W, gy);
    line(a.x, a.y, b.x, b.y);
  }
  noStroke();
}

/* ---------------- HUD ---------------- */

let undoButton = null;
function drawHUD() {
  push();
  fill(0, 0, 0, 130);
  rect(12, 12, 220, 54, 8);
  fill(200, 190, 175);
  textAlign(LEFT, CENTER);
  textSize(12);
  text(t(ROOM_NAME_KEYS[currentRoomId] || 'roomBedroom'), 22, 26);
  fill(255, 235, 210);
  textSize(16);
  text(era === 'present' ? t('eraPresent') : t('eraPast'), 22, 47);

  const bw = 90, bh = 60;
  const bx = 12, by = DESIGN_H - bh - 16;
  const hov = pointInRect(mouseDesign(), bx, by, bw, bh);
  fill(hov ? color(230, 170, 90) : color(0, 0, 0, 140));
  rect(bx, by, bw, bh, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(28);
  text('↺', bx + bw / 2, by + bh / 2 - 4);
  textSize(11);
  text(t('undo'), bx + bw / 2, by + bh / 2 + 20);
  undoButton = { x: bx, y: by, w: bw, h: bh };

  // mobile action button
  const abw = 90, abh = 90;
  const abx = DESIGN_W - abw - 24, aby = DESIGN_H - abh - 24;
  const ahov = pointInRect(mouseDesign(), abx, aby, abw, abh);
  fill(ahov ? color(255, 210, 140) : color(230, 170, 90, 220));
  circle(abx + abw / 2, aby + abh / 2, abw);
  fill(30, 20, 10);
  textSize(14);
  text(t('interact'), abx + abw / 2, aby + abh / 2);
  actionButton = { x: abx, y: aby, w: abw, h: abh };

  drawLangToggle();
  pop();
}

let actionButton = null;

/* ---------------- TRANSITION (era fade) ---------------- */

// nextEra: pass null/undefined to fade without changing era (e.g. a
// puzzle reset). action: runs exactly once, at the blackest point of the
// fade (transitionT hits 1) -- same moment the era itself swaps, so
// anything that needs to change while the scene is hidden (actor
// position/facing, entity state) can go here instead of a setTimeout that
// only approximately lines up with the fade and shows a visible glitch.
function startEraTransition(nextEra, action) {
  transitioning = true;
  transitionT = 0;
  pendingEra = nextEra || null;
  pendingAction = action || null;
}

function updateTransition() {
  if (!transitioning) return;
  transitionT += 0.05;
  if (transitionT >= 1) {
    if (pendingEra) { era = pendingEra; pendingEra = null; }
    if (pendingAction) { const fn = pendingAction; pendingAction = null; fn(); }
  }
  if (transitionT >= 2) {
    transitioning = false;
    transitionT = 0;
  }
}

function drawFade() {
  const alpha = (1 - abs(transitionT - 1)) * 255;
  fill(6, 6, 10, alpha);
  rect(0, 0, DESIGN_W, DESIGN_H);
}

/* ---------------- WIN ---------------- */

function drawWinOverlay() {
  fill(10, 14, 10, 180);
  rect(0, 0, DESIGN_W, DESIGN_H);
  textAlign(CENTER, CENTER);
  fill(255, 236, 200);
  textSize(40);
  text(t('winTitle'), DESIGN_W / 2, DESIGN_H / 2 - 20);
  fill(220);
  textSize(16);
  text(t('winSubtitle'), DESIGN_W / 2, DESIGN_H / 2 + 16);
}

/* ---------------- TOAST ---------------- */

const TOAST_MULT = 3; // every toast stays up 3x as long as its base duration
function showToast(text, dur) {
  const d = (dur || 3.2) * TOAST_MULT;
  toast = { text, t: d, dur: d };
}

function drawToast() {
  if (!toast) return;
  toast.t -= deltaTime * 0.001;
  if (toast.t <= 0) { toast = null; return; }
  const alpha = constrain(toast.t / toast.dur, 0, 1) * 255;
  push();
  textAlign(CENTER, CENTER);
  textSize(38); // 2x the original 19
  textWrap(WORD);
  const w = 1100;
  const pad = 30;
  const bx = DESIGN_W / 2 - w / 2, by = DESIGN_H - 190, bh = 130;
  fill(0, 0, 0, alpha * 0.72);
  rect(bx, by, w, bh, 10);
  fill(255, 240, 220, alpha);
  // p5's text(str,x,y,width,height) anchors (x,y) at the box's TOP-LEFT
  // corner regardless of textAlign, so x must be the box's left edge (not
  // the design-space center) or a wide wrap box drifts off-canvas to the
  // right -- CENTER alignment still centers each wrapped line within it.
  text(toast.text, bx + pad, by + bh / 2, w - pad * 2);
  pop();
}

/* ---------------- INPUT ---------------- */

function mouseDesign() { return toDesign(mouseX, mouseY); }
function pointInRect(p, x, y, w, h) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }

// Whether +grid-x/+grid-y point toward screen-right/screen-down depends
// on each room's OWN measured AXIS_X/AXIS_Y (independently 3-point
// calibrated per room, so their signs aren't guaranteed to match --
// the bedroom's +x happens to point screen-LEFT, so its right/left keys
// need swapping; a room whose +x points screen-right doesn't). Recomputed
// whenever the active room's axes change, instead of one hardcoded
// mapping tuned for a single room's calibration.
let DIRS = { right: { x: -1, y: 0 }, left: { x: 1, y: 0 }, down: { x: 0, y: 1 }, up: { x: 0, y: -1 } };
function computeDirs() {
  const rightSign = AXIS_X.x > 0 ? 1 : -1;
  const downSign = AXIS_Y.y > 0 ? 1 : -1;
  DIRS = {
    right: { x: rightSign, y: 0 }, left: { x: -rightSign, y: 0 },
    down: { x: 0, y: downSign }, up: { x: 0, y: -downSign }
  };
}

function keyPressed() {
  if (state === STATE.INTRO) {
    if (key === ' ' || keyCode === ENTER) startGame();
    return;
  }
  if (state !== STATE.PLAY || transitioning) return;
  // dev-only room switch, stands in for the corridor hub until it exists
  if (key === '1') { switchRoom('bedroom'); return; }
  if (key === '2') { switchRoom('living'); return; }
  if (key === '3') { switchRoom('corridor'); return; }
  if (['ArrowRight', 'd', 'D'].includes(key)) tryStep(DIRS.right, keyIsDown(16));
  else if (['ArrowLeft', 'a', 'A'].includes(key)) tryStep(DIRS.left, keyIsDown(16));
  else if (['ArrowDown', 's', 'S'].includes(key)) tryStep(DIRS.down, keyIsDown(16));
  else if (['ArrowUp', 'w', 'W'].includes(key)) tryStep(DIRS.up, keyIsDown(16));
  else if (key === ' ' || keyCode === ENTER || ['z', 'Z', 'y', 'Y', 'x', 'X'].includes(key)) doInteract();
}

function startGame() {
  state = STATE.PLAY;
  resetGame();
  showToast(t('introFirstToast'));
}

function tryStep(dir, pulling) {
  if (stepBusy) return;
  stepBusy = true;
  setTimeout(() => stepBusy = false, STEP_MS);

  if (pulling) { tryPull(dir); return; }

  const tx = actor.x + dir.x, ty = actor.y + dir.y;
  actor.facing = dir;
  if (!inBounds(tx, ty)) return;

  const blocker = entityAt(tx, ty, actor.z, e => e.blocking);
  if (!blocker) {
    if (standable(tx, ty, actor.z)) { actor.x = tx; actor.y = ty; triggerWalk(); }
    else if (standable(tx, ty, actor.z + 1)) { actor.x = tx; actor.y = ty; actor.z = actor.z + 1; triggerWalk(); }
    return;
  }

  if (blocker.id === 'nightstand') onNightstandBump();

  if (blocker.id === 'watch' && blocker.fallen) {
    tryPushWatch(blocker, dir, tx, ty);
    return;
  }
  if (canPush(blocker, dir)) {
    saveUndo();
    const fromX = blocker.x, fromY = blocker.y;
    blocker.x += dir.x; blocker.y += dir.y;
    startMoveAnim(blocker, fromX, fromY, dir); // it slides, so no separate bonk-in-place
    actor.x = tx; actor.y = ty;
    triggerWalk();
    triggerTouch();
  } else {
    triggerBump(blocker, dir); // didn't move: a stationary "bonk" reaction instead
    triggerTouch();
  }
}

function canPush(e, dir) {
  if (!e.push) return false;
  if (e.push === 'axis') {
    const alongY = (dir.x === 0);
    if (alongY && e.axis !== 'y') return false;
    if (!alongY && e.axis !== 'x') return false;
  }
  for (const c of e.cells) {
    const nx = e.x + c.dx + dir.x, ny = e.y + c.dy + dir.y;
    if (!inBounds(nx, ny)) return false;
    const occupant = entityAt(nx, ny, e.z, other => other.blocking && other !== e);
    if (occupant && occupant !== e) return false;
  }
  return true;
}

function tryPull(dir) {
  const front = { x: actor.x + actor.facing.x, y: actor.y + actor.facing.y };
  const e = entityAt(front.x, front.y, actor.z, o => o.pull);
  if (!e) return;
  const back = { x: actor.x - actor.facing.x, y: actor.y - actor.facing.y };
  if (!inBounds(back.x, back.y) || !standable(back.x, back.y, actor.z)) return;
  saveUndo();
  const fromX = e.x, fromY = e.y;
  e.x += (actor.x - back.x); e.y += (actor.y - back.y);
  startMoveAnim(e, fromX, fromY, { x: back.x - actor.x, y: back.y - actor.y });
  actor.x = back.x; actor.y = back.y;
  triggerWalk();
  triggerTouch();
}

function doInteract() {
  const fx = actor.x + actor.facing.x, fy = actor.y + actor.facing.y;
  const e = entityAt(fx, fy, actor.z, () => true) ||
    activeEntities().find(ent => ent.cells.some(c => ent.x + c.dx === fx && ent.y + c.dy === fy));
  if (!e) return;
  triggerTouch();

  if (e.id === 'crib_present') {
    if (watchFound) {
      // the memory's already been relived and resolved -- touching the
      // crib again shouldn't keep re-opening the flashback
      showToast(t('alreadyRemember'));
      return;
    }
    showToast(t('touchCribToast'));
    // the flashback opens with the baby climbing out of the wardrobe,
    // regardless of where the adult was standing in the present -- the
    // reposition happens as the transition's own action, exactly when the
    // screen is black, so there's no visible "adult stands there a beat,
    // then snaps to the kid's spot" glitch.
    startEraTransition('past', () => {
      actor.x = 1; actor.y = 0; actor.facing = { x: 1, y: 0 }; actor.z = 0;
    });
    return;
  }
  if (e.id === 'crib_past') {
    showToast(t('cribPastToast'));
    return;
  }
  if (e.id === 'wardrobe_present') {
    if (watchFound) {
      showToast(t('wardrobeFoundToast'));
      state = STATE.WIN;
    } else {
      showToast(t('wardrobeSearchToast'));
    }
    return;
  }
  if (e.id === 'tv_present') {
    // no "already solved" guard yet -- the room's puzzle isn't wired up,
    // this just proves the transition works with a second room's entities
    showToast(t('tvTouchToast'));
    startEraTransition('past', () => {
      actor.x = 3; actor.y = 3; actor.facing = { x: 0, y: -1 }; // facing the TV/table
    });
    return;
  }
  if (e.id === 'door_bedroom') { switchRoom('bedroom'); return; }
  if (e.id === 'door_living') { switchRoom('living'); return; }
  if (e.interact === 'look' && e.lookKey) {
    showToast(t(e.lookKey));
    return;
  }
}

/* ---------------- PAST PUZZLE: the pocket watch ---------------- */

function onNightstandBump() {
  const watch = entities.find(e => e.id === 'watch');
  if (!watch || watch.fallen) return;
  watch.fallen = true;
  watch.blocking = true;
  watch.push = 'any';
  watch.pushDistance = 2;

  const nightstand = entities.find(e => e.id === 'nightstand');
  watch.attachedTo = null; // detach -- render from its own grid cell from now on
  watch.x = nightstand.x; watch.y = nightstand.y; // phase 1: drop straight down, still on the nightstand's cell
  watch.dropT = 1;
  showToast(t('watchFallToast'));

  setTimeout(() => {
    // phase 2: it rolls toward (3,2) -- but that's also crib_past's own
    // default cell. If the player hasn't pushed the crib out of the way
    // first, the watch rolls straight into it and breaks.
    const fromX = watch.x, fromY = watch.y;
    const blocked = !!entityAt(3, 2, watch.z, o => o.blocking && o !== watch);
    // stop one cell short (right up against the crib) instead of rolling
    // on top of it when it's in the way
    watch.x = 3; watch.y = blocked ? 1 : 2;
    startMoveAnim(watch, fromX, fromY, null, ROLL_MS);
    if (blocked) {
      showToast(t('watchHitsCribToast'));
      setTimeout(() => { triggerBump(watch, { x: 0, y: 0 }); breakWatch(); }, ROLL_MS - 100);
    } else {
      showToast(t('watchRollsToast'));
    }
  }, DROP_MS);
}

function tryPushWatch(watch, dir, actorTargetX, actorTargetY) {
  triggerTouch();
  // The watch rolls along its path (up to 2 cells) and stops at the FIRST
  // of: the goal cell (vanishes under the wardrobe, even one cell early
  // and even if the full 2-cell distance would've overshot the wall), or
  // an obstruction (breaks). It doesn't need to travel the full distance
  // to succeed -- this also sidesteps needing the fall/goal cells to share
  // x/y parity, since any cell along the path can be the winning one.
  const fromX = watch.x, fromY = watch.y;
  const midX = watch.x + dir.x, midY = watch.y + dir.y;
  const finalX = watch.x + dir.x * 2, finalY = watch.y + dir.y * 2;

  if (midX === WATCH_GOAL.x && midY === WATCH_GOAL.y) {
    watch.x = midX; watch.y = midY;
    startMoveAnim(watch, fromX, fromY, dir);
    actor.x = actorTargetX; actor.y = actorTargetY;
    triggerWalk();
    onWatchReachedGoal();
    return;
  }

  const midBlocked = !inBounds(midX, midY) || !!entityAt(midX, midY, watch.z, o => o.blocking && o !== watch);
  if (midBlocked) {
    // no room to even take the first step -- it's already touching the
    // obstacle from here, so just react in place before breaking
    triggerBump(watch, dir);
    breakWatch();
    return;
  }

  if (finalX === WATCH_GOAL.x && finalY === WATCH_GOAL.y) {
    watch.x = finalX; watch.y = finalY;
    startMoveAnim(watch, fromX, fromY, dir);
    actor.x = actorTargetX; actor.y = actorTargetY;
    triggerWalk();
    onWatchReachedGoal();
    return;
  }

  const finalBlocked = !inBounds(finalX, finalY) || !!entityAt(finalX, finalY, watch.z, o => o.blocking && o !== watch);
  if (finalBlocked) {
    // the second cell is blocked, but the first is clear -- slide up to
    // the obstacle before reacting, instead of breaking on the spot
    watch.x = midX; watch.y = midY;
    startMoveAnim(watch, fromX, fromY, dir);
    actor.x = actorTargetX; actor.y = actorTargetY;
    triggerWalk();
    setTimeout(() => { triggerBump(watch, dir); breakWatch(); }, watch.animDurMs);
    return;
  }

  watch.x = finalX; watch.y = finalY;
  startMoveAnim(watch, fromX, fromY, dir);
  actor.x = actorTargetX; actor.y = actorTargetY;
  triggerWalk();
}

function onWatchReachedGoal() {
  watchFound = true; // the wardrobe_present interaction checks this
  showToast(t('watchGoalToast'));
  setTimeout(() => {
    showToast(t('babyCriesToast'));
    setTimeout(() => {
      startEraTransition('present', () => {
        actor.x = 0; actor.y = 4; actor.facing = { x: 1, y: 0 };
      });
      setTimeout(() => showToast(t('quietRoomToast')), 900);
    }, 1400);
  }, 900);
}

function breakWatch() {
  showToast(t('watchBreakToast'), 5); // held longer -- give it time to read
  const watch = entities.find(e => e.id === 'watch');
  if (watch) watch.fadeT = 0; // dissolve it in place -- stands in for a broken-watch sprite later
  setTimeout(() => {
    startEraTransition(null, resetPastPuzzle); // fade out, reset while hidden, fade back in
  }, 1100);
}

function resetPastPuzzle() {
  const watch = entities.find(e => e.id === 'watch');
  if (!watch) return;
  watch.fallen = false;
  watch.x = 3; watch.y = 0;
  watch.attachedTo = 'nightstand'; watch.attachOffset = { x: 0, y: -100 };
  watch.blocking = false;
  watch.push = false;
  watch.pushDistance = 1;
  watch.bumpT = 0;
  watch.dropT = 0;
  watch.fadeT = undefined; // undo the dissolve from a break
  watch.animT = undefined; // cancel any slide it was mid-way through
  showToast(t('watchResetToast'));
}

function saveUndo() {
  undoStack.push({
    actor: { x: actor.x, y: actor.y, z: actor.z, facing: { ...actor.facing } },
    ents: entities.filter(e => e.push).map(e => ({ id: e.id, x: e.x, y: e.y, z: e.z }))
  });
  if (undoStack.length > 50) undoStack.shift();
}

function doUndo() {
  const snap = undoStack.pop();
  if (!snap) return;
  actor.x = snap.actor.x; actor.y = snap.actor.y; actor.z = snap.actor.z; actor.facing = snap.actor.facing;
  for (const s of snap.ents) {
    const e = entities.find(en => en.id === s.id);
    if (e) { e.x = s.x; e.y = s.y; e.z = s.z; }
  }
}

/* touch: swipe to move, tap action button to interact, tap undo to undo */
let touchStart = null;

function mousePressed() { handlePress(mouseX, mouseY); }
function touchStarted() {
  if (touches.length > 0) { touchStart = { x: touches[0].x, y: touches[0].y }; handlePress(touches[0].x, touches[0].y); }
  return false;
}
function touchEnded() {
  if (!touchStart) return false;
  const p = toDesign(mouseX, mouseY);
  const start = toDesign(touchStart.x, touchStart.y);
  const dx = p.x - start.x, dy = p.y - start.y;
  touchStart = null;
  if (state !== STATE.PLAY || transitioning) return false;
  if (abs(dx) < 30 && abs(dy) < 30) return false; // treat as tap, handled in handlePress
  if (abs(dx) > abs(dy)) tryStep(dx > 0 ? DIRS.right : DIRS.left, false);
  else tryStep(dy > 0 ? DIRS.down : DIRS.up, false);
  return false;
}

function handlePress(px, py) {
  const p = toDesign(px, py);
  if (langButton && pointInRect(p, langButton.x, langButton.y, langButton.w, langButton.h)) {
    setLang(lang === 'hu' ? 'en' : 'hu');
    return;
  }
  if (state === STATE.INTRO) {
    if (introButton && pointInRect(p, introButton.x, introButton.y, introButton.w, introButton.h)) {
      startGame();
    }
    return;
  }
  if (state === STATE.WIN) return;
  if (undoButton && pointInRect(p, undoButton.x, undoButton.y, undoButton.w, undoButton.h)) {
    doUndo();
    return;
  }
  if (actionButton && pointInRect(p, actionButton.x, actionButton.y, actionButton.w, actionButton.h)) {
    doInteract();
    return;
  }
}
