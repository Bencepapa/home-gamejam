'use strict';

/* ============================================================
   HOME — isometric memory puzzle (parents' bedroom vertical slice)
   Engine per DESIGN.md section 10. Grid + entity model, 2:1 dimetric
   projection measured directly off assets/room/halo.png.
   ============================================================ */

// ---- measured off the plate (tools/measure_plate.py); all overridden in
// setup() by assets/sprites.json's "_room" block if present, so the whole
// projection can be tuned from tools/anchor_editor.html without code edits ----
let GRID_N = 6;
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

let toast = null;
let stepBusy = false;
const STEP_MS = 160;

let images = {};
let spriteMeta = {}; // assets/sprites.json -- per-sprite anchor point + scale
let plateDesat = null; // cached desaturated plate for present era

const DEFAULT_SPRITE_META = { anchor: { x: 0.5, y: 0.9 }, scale: 1 };

/* ---------------- ASSETS ---------------- */

function preload() {
  images.plate = loadImage('assets/room/halo.png');
  images.lightmap = loadImage('assets/room/halo_lightmap.png');
  images.crib = loadImage('assets/sprites/bolcso.png');
  images.bed = loadImage('assets/sprites/agy.png');
  images.wardrobe = loadImage('assets/sprites/szekreny.png');
  images.nightstand = loadImage('assets/sprites/ejjelisz.png');
  images.watch = loadImage('assets/sprites/ora.png');
  images.box1x1 = loadImage('assets/sprites/doboz_1x1.png');
  images.box1x2 = loadImage('assets/sprites/doboz_1x2.png');
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
  return x >= 0 && y >= 0 && x < GRID_N && y < GRID_N;
}

/* ---------------- ENTITY MODEL ----------------
   cells: footprint offsets from (x,y). push: false|'any'|'axis'.
   era: 'past' | 'present' | 'both'. anchor: true => never desaturated.
------------------------------------------------- */

function makeEntities() {
  return [
    // --- anchor object: same physical crib in both eras ---
    // grid mapping (per user's corrected ASCII floor plan): origin sits at
    // the top-right of the plan, +x grows LEFT (toward the window wall),
    // +y grows DOWN (toward the door wall) -- i.e. x = 5 - column, y = row.
    {
      id: 'crib', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
      x: 5, y: 3, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'use', era: 'both', anchor: true,
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
      lookText: 'A szüleim ágya. Ide bújtam be, ha rosszat álmodtam.'
    },
    {
      id: 'nightstand', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'past', mirror: true,
      img: 'nightstand',
      lookText: 'Apa órája és a szemüvege szokott itt lenni esténként.'
    },
    {
      id: 'wardrobe', cells: [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }],
      x: 0, y: 0, z: 0, height: 1,
      push: false, blocking: true, stackable: false,
      interact: 'look', era: 'past',
      img: 'wardrobe',
      lookText: 'A nagy szekrény. Sosem értem fel a tetejét.'
    },
    {
      // sits visually on the nightstand until it's knocked off (see
      // onNightstandBump); pixelOffset nudges it relative to the
      // nightstand's own anchor point since it shares its grid cell.
      id: 'watch', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 0.2,
      push: false, blocking: false, stackable: false, fallen: false,
      pixelOffset: { x: 100, y: -25 },
      interact: null, era: 'past',
      img: 'watch'
    },

    // --- present-only: boxes filling the same footprint area ---
    {
      id: 'box_bed_1', cells: [{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }],
      x: 4, y: 1, z: 0, height: 1,
      push: 'axis', axis: 'x', blocking: true, stackable: true,
      interact: 'look', era: 'present',
      img: 'box1x2',
      lookText: 'Anya ruhái, gondosan összehajtva. Sose látta ezt még senki.'
    },
    {
      id: 'box_nightstand', cells: [{ dx: 0, dy: 0 }],
      x: 3, y: 0, z: 0, height: 1,
      push: 'any', pull: true, blocking: true, stackable: true,
      interact: 'look', era: 'present',
      img: 'box1x1',
      lookText: 'Apa fiókjának tartalma. Az órája nincs itt. Sosem került elő.'
    },
    {
      id: 'box_wardrobe_1', cells: [{ dx: 0, dy: 0 }],
      x: 0, y: 0, z: 0, height: 1,
      push: 'any', pull: true, blocking: true, stackable: true,
      interact: 'look', era: 'present',
      img: 'box1x1',
      lookText: 'Régi könyvek a szekrényből.'
    },
    {
      id: 'box_wardrobe_2', cells: [{ dx: 0, dy: 0 }],
      x: 0, y: 1, z: 0, height: 1,
      push: 'any', pull: true, blocking: true, stackable: true,
      interact: 'look', era: 'present',
      img: 'box1x1',
      lookText: 'Kabátok, molyszagúan.'
    }
  ];
}

let entities = [];
let actor = { x: 0, y: 4, z: 0, facing: { x: 1, y: 0 } };
let undoStack = [];
let watchFound = false;
const WATCH_GOAL = { x: 0, y: 0 }; // under the wardrobe

function resetGame() {
  entities = makeEntities();
  era = 'present';
  actor = { x: 0, y: 4, z: 0, facing: { x: 1, y: 0 } };
  undoStack = [];
  watchFound = false;
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
  const room = spriteMeta._room;
  if (room) {
    if (room.originPx) ORIGIN = room.originPx;
    if (room.gridN) GRID_N = room.gridN;
    if (room.axisX && room.axisY) {
      // preferred: independently-measured per-axis vectors (see
      // tools/anchor_editor.html's 3-point calibration)
      AXIS_X = room.axisX;
      AXIS_Y = room.axisY;
    } else if (room.tileW) {
      // legacy fallback: symmetric diamond derived from a single tile size
      const tw = room.tileW, th = room.tileH || room.tileW / 2;
      AXIS_X = { x: tw / 2, y: th / 2 };
      AXIS_Y = { x: -tw / 2, y: th / 2 };
    }
  }
  resetGame();
  buildDesaturatedPlate();
}

function buildDesaturatedPlate() {
  const g = createGraphics(images.plate.width, images.plate.height);
  g.image(images.plate, 0, 0, g.width, g.height); // graphics buffers default to CORNER mode
  g.filter(GRAY);
  plateDesat = g;
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
  text('HOME', DESIGN_W / 2, DESIGN_H / 2 - 160);
  fill(230);
  textSize(20);
  text('A szülők egykori hálószobája. Valamit ott hagytál benne.', DESIGN_W / 2, DESIGN_H / 2 - 90);

  const bw = 260, bh = 60;
  const bx = DESIGN_W / 2 - bw / 2, by = DESIGN_H / 2 - 30;
  const hover = pointInRect(mouseDesign(), bx, by, bw, bh);
  fill(hover ? color(255, 200, 120) : color(230, 170, 90));
  rect(bx, by, bw, bh, 12);
  fill(30, 20, 10);
  textSize(22);
  text('Belépek', DESIGN_W / 2, by + bh / 2 + 2);
  introButton = { x: bx, y: by, w: bw, h: bh };
  pop();
}

/* ---------------- SCENE ---------------- */

function drawScene() {
  const plateImg = (era === 'present') ? plateDesat : images.plate;
  imageMode(CENTER);
  image(plateImg, DESIGN_W / 2, DESIGN_H / 2);

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

  // lightmap glow, low opacity per art direction
  push();
  tint(255, 255, 255, 38); // ~15%
  imageMode(CENTER);
  image(images.lightmap, DESIGN_W / 2, DESIGN_H / 2);
  noTint();
  pop();

  if (DEBUG_GRID) drawDebugGrid();
}

const BUMP_MS = 260; // decay time for the walk-into-it wobble

function triggerBump(e, dir) {
  e.bumpT = 1;
  e.bumpDir = (dir && dir.x !== 0) ? Math.sign(dir.x) : 1;
}

function drawEntity(e) {
  // unsliced sprite: anchor at the near (screen-lowest) corner of the
  // frontmost cell in its footprint, not the footprint's center.
  const front = e.cells.reduce((a, b) => (a.dx + a.dy > b.dx + b.dy ? a : b));
  const p = iso(e.x + front.dx + 1, e.y + front.dy + 1, e.z);
  if (e.pixelOffset) { p.x += e.pixelOffset.x; p.y += e.pixelOffset.y; }
  const img = images[e.img];
  if (!img) return;
  const meta = metaFor(e.img);
  const w = img.width * meta.scale;
  const h = img.height * meta.scale;
  const ax = meta.anchor.x;
  const ay = meta.anchor.y;

  if (e.bumpT > 0) e.bumpT = max(0, e.bumpT - deltaTime / BUMP_MS);

  push();
  translate(p.x, p.y);
  if (e.mirror) scale(-1, 1);
  if (e.bumpT > 0) {
    const skew = sin(e.bumpT * PI) * 0.3 * (e.bumpDir || 1);
    drawingContext.transform(1, 0, skew, 1, 0, 0);
  }
  imageMode(CORNER);
  const highlight = e.interact && state === STATE.PLAY && isFacingEntity(e);
  if (highlight) {
    drawingContext.shadowColor = 'rgba(255,220,140,0.9)';
    drawingContext.shadowBlur = 20;
  }
  image(img, -w * ax, -h * ay, w, h);
  if (highlight) drawingContext.shadowBlur = 0;
  pop();
}

function drawActor() {
  const p = iso(actor.x + 0.5, actor.y + 0.5, actor.z); // feet at the cell's center, not its corner
  const isBaby = era === 'past';
  const bodyH = isBaby ? 34 : 160; // adult: 2.5x taller
  const bodyW = isBaby ? 26 : 51;  // adult: 1.5x wider
  push();
  translate(p.x, p.y);
  noStroke();
  fill(0, 0, 0, 90);
  ellipse(0, -2, bodyW * 1.1, bodyW * 0.5);
  fill(20, 18, 26);
  rectMode(CENTER);
  rect(0, -bodyH * 0.55, bodyW, bodyH, bodyW * 0.4);
  circle(0, -bodyH - 4, bodyW * 0.7);
  fill(255, 220, 150);
  const fx = actor.facing.x, fy = actor.facing.y;
  const rel = iso(fx * 0.35, fy * 0.35); // relative offset only
  circle(rel.x - ORIGIN.x, rel.y - ORIGIN.y - bodyH - 4, 5);
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
  for (let gx = 0; gx <= GRID_N; gx++) {
    const a = iso(gx, 0), b = iso(gx, GRID_N);
    line(a.x, a.y, b.x, b.y);
  }
  for (let gy = 0; gy <= GRID_N; gy++) {
    const a = iso(0, gy), b = iso(GRID_N, gy);
    line(a.x, a.y, b.x, b.y);
  }
  noStroke();
}

/* ---------------- HUD ---------------- */

let undoButton = null;
function drawHUD() {
  push();
  fill(0, 0, 0, 130);
  rect(12, 12, 220, 36, 8);
  fill(255, 235, 210);
  textAlign(LEFT, CENTER);
  textSize(16);
  text(era === 'present' ? 'Jelen — a szoba most' : 'Múlt — az emlék', 22, 30);

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
  text('vissza', bx + bw / 2, by + bh / 2 + 20);
  undoButton = { x: bx, y: by, w: bw, h: bh };

  // mobile action button
  const abw = 90, abh = 90;
  const abx = DESIGN_W - abw - 24, aby = DESIGN_H - abh - 24;
  const ahov = pointInRect(mouseDesign(), abx, aby, abw, abh);
  fill(ahov ? color(255, 210, 140) : color(230, 170, 90, 220));
  circle(abx + abw / 2, aby + abh / 2, abw);
  fill(30, 20, 10);
  textSize(14);
  text('interakció', abx + abw / 2, aby + abh / 2);
  actionButton = { x: abx, y: aby, w: abw, h: abh };
  pop();
}

let actionButton = null;

/* ---------------- TRANSITION (era fade) ---------------- */

function startEraTransition(nextEra) {
  transitioning = true;
  transitionT = 0;
  pendingEra = nextEra;
}

function updateTransition() {
  if (!transitioning) return;
  transitionT += 0.05;
  if (transitionT >= 1 && pendingEra) {
    era = pendingEra;
    pendingEra = null;
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
  text('Megtaláltad apa óráját.', DESIGN_W / 2, DESIGN_H / 2 - 20);
  fill(220);
  textSize(16);
  text('(demó vége — a hálószoba-jelenet)', DESIGN_W / 2, DESIGN_H / 2 + 16);
}

/* ---------------- TOAST ---------------- */

function showToast(text) {
  toast = { text, t: 3.2 };
}

function drawToast() {
  if (!toast) return;
  toast.t -= deltaTime * 0.001;
  if (toast.t <= 0) { toast = null; return; }
  const alpha = constrain(toast.t / 3.2, 0, 1) * 255;
  push();
  textAlign(CENTER, CENTER);
  textSize(19);
  textWrap(WORD);
  const w = 700;
  const bx = DESIGN_W / 2 - w / 2, by = DESIGN_H - 130, bh = 70;
  fill(0, 0, 0, alpha * 0.72);
  rect(bx, by, w, bh, 10);
  fill(255, 240, 220, alpha);
  text(toast.text, DESIGN_W / 2, by + bh / 2, w - 40);
  pop();
}

/* ---------------- INPUT ---------------- */

function mouseDesign() { return toDesign(mouseX, mouseY); }
function pointInRect(p, x, y, w, h) { return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }

// +x on this grid points screen-left (see AXIS_X), so the physical
// right/left keys are intentionally mapped to -x/+x -- up/down (the y
// axis) already pointed the intuitive way and needed no swap.
const DIRS = {
  right: { x: -1, y: 0 }, left: { x: 1, y: 0 },
  down: { x: 0, y: 1 }, up: { x: 0, y: -1 }
};

function keyPressed() {
  if (state !== STATE.PLAY || transitioning) return;
  if (['ArrowRight', 'd', 'D'].includes(key)) tryStep(DIRS.right, keyIsDown(16));
  else if (['ArrowLeft', 'a', 'A'].includes(key)) tryStep(DIRS.left, keyIsDown(16));
  else if (['ArrowDown', 's', 'S'].includes(key)) tryStep(DIRS.down, keyIsDown(16));
  else if (['ArrowUp', 'w', 'W'].includes(key)) tryStep(DIRS.up, keyIsDown(16));
  else if (key === ' ') doInteract();
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
    if (standable(tx, ty, actor.z)) { actor.x = tx; actor.y = ty; }
    else if (standable(tx, ty, actor.z + 1)) { actor.x = tx; actor.y = ty; actor.z = actor.z + 1; }
    return;
  }

  triggerBump(blocker, dir); // every object reacts to being walked into

  if (blocker.id === 'nightstand') onNightstandBump();

  if (blocker.id === 'watch' && blocker.fallen) {
    tryPushWatch(blocker, dir, tx, ty);
    return;
  }
  if (canPush(blocker, dir)) {
    saveUndo();
    blocker.x += dir.x; blocker.y += dir.y;
    actor.x = tx; actor.y = ty;
  }
  // else: blocked, just faced it (and bumped it, above)
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
  e.x += (actor.x - back.x); e.y += (actor.y - back.y);
  actor.x = back.x; actor.y = back.y;
}

function doInteract() {
  const fx = actor.x + actor.facing.x, fy = actor.y + actor.facing.y;
  const e = entityAt(fx, fy, actor.z, () => true) ||
    activeEntities().find(ent => ent.cells.some(c => ent.x + c.dx === fx && ent.y + c.dy === fy));
  if (!e) return;

  if (e.id === 'crib' && era === 'present') {
    showToast('Megérinted a bölcsőt. Az emlék visszahúz.');
    startEraTransition('past'); // stay put -- this IS where you were standing
    return;
  }
  if (e.id === 'crib' && era === 'past') {
    showToast('A saját bölcsőm. Furcsa innen nézni.');
    return;
  }
  if (e.interact === 'look' && e.lookText) {
    showToast(e.lookText);
    return;
  }
}

/* ---------------- PAST PUZZLE: the pocket watch ---------------- */

function onNightstandBump() {
  const watch = entities.find(e => e.id === 'watch');
  if (!watch || watch.fallen) return;
  watch.fallen = true;
  watch.x = 3; watch.y = 2; // rolls two cells down, next to the bed
  watch.pixelOffset = null;
  watch.blocking = true;
  watch.push = 'any';
  watch.pushDistance = 2;
  showToast('Az óra lepottyan az éjjeliszekrényről, és odagurul az ágy mellé.');
}

function tryPushWatch(watch, dir, actorTargetX, actorTargetY) {
  const midX = watch.x + dir.x, midY = watch.y + dir.y;
  const finalX = watch.x + dir.x * 2, finalY = watch.y + dir.y * 2;
  const reachedGoal = finalX === WATCH_GOAL.x && finalY === WATCH_GOAL.y;

  if (!inBounds(finalX, finalY)) return; // hit the wall: silently refuse, like a normal box

  const midBlocked = !!entityAt(midX, midY, watch.z, o => o.blocking && o !== watch);
  const finalBlocked = !!entityAt(finalX, finalY, watch.z, o => o.blocking && o !== watch);

  if (midBlocked || (finalBlocked && !reachedGoal)) {
    breakWatch();
    return;
  }

  watch.x = finalX; watch.y = finalY;
  actor.x = actorTargetX; actor.y = actorTargetY;

  if (reachedGoal) {
    showToast('Az óra begördül a szekrény alá.');
    setTimeout(() => {
      showToast('A baba felsír.');
      setTimeout(() => {
        startEraTransition('present');
        setTimeout(() => {
          actor.x = 0; actor.y = 4; actor.facing = { x: 1, y: 0 };
          showToast('Csend van. Csak a szoba.');
        }, 900);
      }, 1400);
    }, 900);
  }
}

function breakWatch() {
  showToast('Nem így történt, hogy is volt?');
  setTimeout(resetPastPuzzle, 900);
}

function resetPastPuzzle() {
  const watch = entities.find(e => e.id === 'watch');
  if (!watch) return;
  watch.fallen = false;
  watch.x = 3; watch.y = 0;
  watch.pixelOffset = { x: 100, y: -25 };
  watch.blocking = false;
  watch.push = false;
  watch.pushDistance = 1;
  watch.bumpT = 0;
  showToast('Az óra visszakerül az éjjeliszekrényre.');
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
  if (state === STATE.INTRO) {
    if (introButton && pointInRect(p, introButton.x, introButton.y, introButton.w, introButton.h)) {
      state = STATE.PLAY;
      resetGame();
      showToast('A doboz-labirintus közepén a bölcső áll. Valahogy ismerős.');
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
