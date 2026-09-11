'use strict';

/* ============================================================
   HOME — a tiny p5.js point-and-click about getting back home
   Rooms: Corridor (hub) / Parent's Room / Child's Room /
          Living Room / Kitchen
   ============================================================ */

const DESIGN_W = 960;
const DESIGN_H = 540;

let scaleF = 1;
let offX = 0, offY = 0;

const STATE = { INTRO: 'intro', PLAY: 'play', WIN: 'win' };
let state = STATE.INTRO;

let currentRoom = 'corridor';
let prevRoom = 'corridor';
let transition = 0; // 0..1 fade
let transitioning = false;
let transitionTarget = null;

let inventory = new Set();
const NEEDED_ITEMS = ['keys', 'wallet', 'jacket', 'shoes'];

let toast = null; // {text, t}
let hoverHotspot = null;
let particles = [];
let bobT = 0;

// simple mutable per-room state (toggle lights, drawers open, etc.)
const roomState = {
  corridor: { lightOn: true, closetOpen: false },
  parent:   { lampOn: false, drawerOpen: false, bedMade: true, walletTaken: false },
  child:    { toyOut: false, curtainsOpen: false, jacketTaken: false, lightOn: true },
  living:   { tvOn: false, cushionFluffed: false, keysTaken: false },
  kitchen:  { kettleOn: false, shoesTaken: false, fridgeOpen: false }
};

function setup() {
  const holder = document.getElementById('gameHolder');
  const c = createCanvas(windowWidth, windowHeight);
  c.parent(holder);
  resizeCalc();
  noStroke();
  textFont('Georgia, serif');
  rectMode(CORNER);
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

  bobT += deltaTime * 0.001;
  currentHotspots = [];

  if (state === STATE.INTRO) {
    drawIntro();
  } else if (state === STATE.PLAY) {
    updateTransition();
    drawRoom(currentRoom);
    drawHUD();
    if (transitioning) drawTransition();
  } else if (state === STATE.WIN) {
    drawRoom('corridor');
    drawHUD();
    updateParticles();
    drawParticles();
    drawWin();
  }

  drawToast();
  pop();
}

/* ---------------- INTRO ---------------- */

function drawIntro() {
  background(18, 20, 28);
  drawStars();
  push();
  textAlign(CENTER, CENTER);
  fill(255, 236, 200);
  textSize(52);
  text('HOME', DESIGN_W / 2, DESIGN_H / 2 - 70);
  fill(220);
  textSize(18);
  text('It has been a long day. Find your keys, wallet, jacket and shoes,', DESIGN_W / 2, DESIGN_H / 2 - 10);
  text('then step out the front door.', DESIGN_W / 2, DESIGN_H / 2 + 16);

  const bw = 220, bh = 56;
  const bx = DESIGN_W / 2 - bw / 2, by = DESIGN_H / 2 + 60;
  const hover = pointInRect(mouseDesign(), bx, by, bw, bh);
  fill(hover ? color(255, 200, 120) : color(230, 170, 90));
  rect(bx, by, bw, bh, 12);
  fill(30, 20, 10);
  textSize(22);
  text('Tap to Start', DESIGN_W / 2, by + bh / 2 + 2);
  pop();
  introButton = { x: bx, y: by, w: bw, h: bh };
}

let introButton = null;

function drawStars() {
  randomSeed(42);
  fill(255, 255, 255, 60);
  for (let i = 0; i < 60; i++) {
    const x = random(DESIGN_W);
    const y = random(DESIGN_H * 0.6);
    const s = random(1, 2.5);
    ellipse(x, y, s, s);
  }
}

/* ---------------- HUD / INVENTORY ---------------- */

function drawHUD() {
  push();
  const items = [
    { id: 'keys', label: 'Keys', icon: drawIconKeys },
    { id: 'wallet', label: 'Wallet', icon: drawIconWallet },
    { id: 'jacket', label: 'Jacket', icon: drawIconJacket },
    { id: 'shoes', label: 'Shoes', icon: drawIconShoes }
  ];
  const slotW = 54, slotH = 54, gap = 10;
  const totalW = items.length * slotW + (items.length - 1) * gap;
  let x = DESIGN_W - totalW - 16;
  const y = 14;
  for (const it of items) {
    const has = inventory.has(it.id);
    fill(0, 0, 0, 120);
    rect(x, y, slotW, slotH, 10);
    fill(has ? color(90, 200, 120, 220) : color(60, 60, 70, 160));
    rect(x + 2, y + 2, slotW - 4, slotH - 4, 8);
    push();
    translate(x + slotW / 2, y + slotH / 2);
    if (!has) { fill(255, 255, 255, 40); } else { fill(255); }
    it.icon(0, 0, has ? 1 : 0.7);
    pop();
    x += slotW + gap;
  }

  // room label + back button (if not corridor)
  fill(0, 0, 0, 130);
  rect(12, 12, 170, 36, 8);
  fill(255, 235, 210);
  textAlign(LEFT, CENTER);
  textSize(16);
  text(roomTitle(currentRoom), 22, 30);

  if (currentRoom !== 'corridor') {
    const bx = 12, by = 56, bw = 100, bh = 32;
    const hov = pointInRect(mouseDesign(), bx, by, bw, bh);
    fill(hov ? color(230, 170, 90) : color(0, 0, 0, 130));
    rect(bx, by, bw, bh, 8);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text('← Corridor', bx + bw / 2, by + bh / 2 + 1);
    backButton = { x: bx, y: by, w: bw, h: bh };
  } else {
    backButton = null;
  }
  pop();
}

let backButton = null;

function roomTitle(r) {
  return {
    corridor: 'Corridor',
    parent: "Parent's Room",
    child: "Child's Room",
    living: 'Living Room',
    kitchen: 'Kitchen'
  }[r];
}

/* ---------------- TRANSITION ---------------- */

function drawTransition() {
  const alpha = (1 - abs(transition - 1)) * 255;
  fill(10, 12, 16, alpha);
  rect(0, 0, DESIGN_W, DESIGN_H);
}

function goToRoom(name) {
  if (transitioning || name === currentRoom) return;
  transitioning = true;
  transitionTarget = name;
  transition = 0;
}

function updateTransition() {
  if (!transitioning) return;
  transition += 0.08;
  if (transition >= 1 && transitionTarget) {
    currentRoom = transitionTarget;
    transitionTarget = null;
  }
  if (transition >= 2) {
    transitioning = false;
    transition = 0;
  }
}

/* ---------------- WIN ---------------- */

function drawWin() {
  fill(10, 14, 10, 210);
  rect(0, 0, DESIGN_W, DESIGN_H);
  textAlign(CENTER, CENTER);
  fill(255, 236, 200);
  textSize(46);
  text('You made it home.', DESIGN_W / 2, DESIGN_H / 2 - 30);
  fill(220);
  textSize(18);
  text('Thanks for playing.', DESIGN_W / 2, DESIGN_H / 2 + 16);

  const bw = 200, bh = 50;
  const bx = DESIGN_W / 2 - bw / 2, by = DESIGN_H / 2 + 60;
  const hov = pointInRect(mouseDesign(), bx, by, bw, bh);
  fill(hov ? color(255, 200, 120) : color(230, 170, 90));
  rect(bx, by, bw, bh, 10);
  fill(30, 20, 10);
  textSize(18);
  text('Play Again', DESIGN_W / 2, by + bh / 2 + 1);
  winButton = { x: bx, y: by, w: bw, h: bh };
}

let winButton = null;

/* ---------------- TOAST ---------------- */

function showToast(text) {
  toast = { text, t: 2.4 };
}

function drawToast() {
  if (!toast) return;
  toast.t -= deltaTime * 0.001;
  if (toast.t <= 0) { toast = null; return; }
  const alpha = constrain(toast.t / 2.4, 0, 1) * 255;
  push();
  textAlign(CENTER, CENTER);
  textSize(18);
  const w = min(DESIGN_W - 40, textWidth(toast.text) + 40);
  const bx = DESIGN_W / 2 - w / 2, by = DESIGN_H - 78, bh = 44;
  fill(0, 0, 0, alpha * 0.7);
  rect(bx, by, w, bh, 10);
  fill(255, 240, 220, alpha);
  text(toast.text, DESIGN_W / 2, by + bh / 2 + 1);
  pop();
}

/* ---------------- INPUT HELPERS ---------------- */

function mouseDesign() {
  return toDesign(mouseX, mouseY);
}

function pointInRect(p, x, y, w, h) {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}

function pointInCircle(p, cx, cy, r) {
  return dist(p.x, p.y, cx, cy) <= r;
}

/* ---------------- ICONS (vector, no assets needed) ---------------- */

function drawIconKeys(x, y, a) {
  push();
  translate(x, y);
  noFill();
  stroke(255, 255 * a);
  strokeWeight(3);
  circle(-8, 0, 12);
  line(-2, 0, 14, 0);
  line(10, 0, 10, 6);
  line(14, 0, 14, 8);
  noStroke();
  pop();
}

function drawIconWallet(x, y, a) {
  push();
  translate(x, y);
  fill(120, 80, 50, 255 * a);
  rect(-14, -10, 28, 20, 3);
  fill(230, 190, 90, 255 * a);
  rect(2, -4, 10, 8, 2);
  pop();
}

function drawIconJacket(x, y, a) {
  push();
  translate(x, y);
  fill(70, 110, 170, 255 * a);
  beginShape();
  vertex(-14, -12);
  vertex(-4, -16);
  vertex(0, -10);
  vertex(4, -16);
  vertex(14, -12);
  vertex(9, -2);
  vertex(6, -6);
  vertex(6, 16);
  vertex(-6, 16);
  vertex(-6, -6);
  vertex(-9, -2);
  endShape(CLOSE);
  pop();
}

function drawIconShoes(x, y, a) {
  push();
  translate(x, y);
  fill(200, 60, 60, 255 * a);
  ellipse(-6, 4, 20, 10);
  rect(-14, -2, 10, 8, 3);
  pop();
}

/* ---------------- GENERIC ROOM HELPERS ---------------- */

function drawWallsFloor(wallColor, floorColor) {
  fill(wallColor);
  rect(0, 0, DESIGN_W, DESIGN_H * 0.62);
  fill(floorColor);
  rect(0, DESIGN_H * 0.62, DESIGN_W, DESIGN_H * 0.38);
}

function drawWindow(x, y, w, h, skyTop, skyBottom) {
  fill(60, 45, 30);
  rect(x - 8, y - 8, w + 16, h + 16, 4);
  let ctx = drawingContext;
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(1, skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  stroke(60, 45, 30);
  strokeWeight(4);
  line(x + w / 2, y, x + w / 2, y + h);
  line(x, y + h / 2, x + w, y + h / 2);
  noStroke();
}

function drawDoor(x, y, w, h, dcolor, label) {
  fill(dcolor);
  rect(x, y, w, h, 4);
  fill(0, 0, 0, 60);
  rect(x, y, w, 6);
  fill(230, 200, 120);
  circle(x + w - 12, y + h / 2, 8);
  if (label) {
    push();
    textAlign(CENTER, CENTER);
    fill(255, 255, 255, 210);
    textSize(13);
    fill(0, 0, 0, 140);
    rect(x + w / 2 - 46, y - 26, 92, 20, 6);
    fill(255);
    text(label, x + w / 2, y - 16);
    pop();
  }
}

function hotspotGlow(x, y, w, h, active) {
  if (!active) return;
  push();
  noFill();
  stroke(255, 230, 150, 180 + 60 * sin(bobT * 4));
  strokeWeight(2);
  rect(x - 3, y - 3, w + 6, h + 6, 6);
  noStroke();
  pop();
}

/* ============================================================
   ROOM DEFINITIONS
   Each room: draw(), hotspots array {x,y,w,h,onTap}
   ============================================================ */

function drawRoom(name) {
  hoverHotspot = null;
  const rooms = { corridor: roomCorridor, parent: roomParent, child: roomChild, living: roomLiving, kitchen: roomKitchen };
  rooms[name]();
}

/* ---------- CORRIDOR (hub) ---------- */

function roomCorridor() {
  const st = roomState.corridor;
  drawWallsFloor(color(st.lightOn ? '#3b3550' : '#211d2c'), color('#5a4632'));

  // ceiling light
  fill(st.lightOn ? color(255, 240, 200) : color(90, 90, 90));
  ellipse(DESIGN_W / 2, 40, 26, 14);

  // floor runner rug
  fill(150, 40, 40);
  rect(DESIGN_W / 2 - 90, DESIGN_H * 0.66, 180, DESIGN_H * 0.3);

  // Four room doors along the corridor
  const doors = [
    { room: 'parent', x: 55, label: 'Parents' , c: '#7a5a3a'},
    { room: 'child', x: 230, label: 'Kids Room', c: '#3a6a7a' },
    { room: 'living', x: 615, label: 'Living Room', c: '#6a5a3a' },
    { room: 'kitchen', x: 790, label: 'Kitchen', c: '#4a6a3a' }
  ];
  const dy = 210, dw = 110, dh = 220;
  for (const d of doors) {
    drawDoor(d.x, dy, dw, dh, color(d.c), d.label);
    addHotspot(d.x, dy, dw, dh, () => goToRoom(d.room));
  }

  // closet (flavor interact)
  fill('#3a3345');
  rect(2, 260, 45, 170, 3);
  if (st.closetOpen) {
    fill(20, 15, 25);
    rect(7, 266, 35, 158);
    fill(200, 170, 90);
    rect(11, 280, 8, 40);
    rect(24, 280, 8, 40);
  }
  addHotspot(2, 260, 45, 170, () => {
    st.closetOpen = !st.closetOpen;
    showToast(st.closetOpen ? 'You open the closet. Old coats.' : 'You close the closet.');
  });

  // light switch
  fill(220);
  rect(925, 300, 14, 20, 2);
  addHotspot(915, 290, 40, 40, () => {
    st.lightOn = !st.lightOn;
    showToast(st.lightOn ? 'Lights on.' : 'Lights off.');
  });

  // FRONT DOOR (exit)
  const allHave = NEEDED_ITEMS.every(i => inventory.has(i));
  const fx = DESIGN_W / 2 - 70, fy = 150, fw = 140, fh = 280;
  fill(allHave ? color('#8a6a3a') : color('#5a4a30'));
  rect(fx, fy, fw, fh, 6);
  fill(0, 0, 0, 70);
  rect(fx, fy, fw, 8);
  fill(allHave ? color(255, 220, 130) : color(160, 140, 110));
  circle(fx + fw - 18, fy + fh / 2, 10);
  push();
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(14);
  fill(0, 0, 0, 150);
  rect(fx + fw / 2 - 60, fy - 30, 120, 22, 6);
  fill(allHave ? color(160, 255, 170) : color(255));
  text(allHave ? 'Front Door — Go Home!' : 'Front Door (locked)', fx + fw / 2, fy - 19);
  pop();
  addHotspot(fx, fy, fw, fh, () => {
    if (allHave) {
      state = STATE.WIN;
      spawnConfetti();
    } else {
      const missing = NEEDED_ITEMS.filter(i => !inventory.has(i));
      showToast(`You still need: ${missing.map(labelFor).join(', ')}`);
    }
  });

  handleHotspots();
}

function labelFor(id) {
  return { keys: 'keys', wallet: 'wallet', jacket: 'jacket', shoes: 'shoes' }[id];
}

/* ---------- PARENT'S ROOM ---------- */

function roomParent() {
  const st = roomState.parent;
  drawWallsFloor(color('#4a3f55'), color('#6b4f36'));
  drawWindow(700, 60, 170, 130, '#1a1a3a', '#5a4a7a');

  // bed
  fill('#5b3b2b');
  rect(60, 300, 260, 130, 6);
  fill(st.bedMade ? color('#c9d6e8') : color('#8f97a6'));
  rect(70, 300, 240, 60, 6);
  fill('#e7c7c7');
  rect(80, 300, 60, 30, 4);
  addHotspot(60, 300, 260, 130, () => {
    st.bedMade = !st.bedMade;
    showToast(st.bedMade ? 'You make the bed.' : 'You rumple the sheets.');
  });

  // lamp on nightstand
  fill('#3a2a1f');
  rect(330, 330, 40, 60, 3);
  fill(st.lampOn ? color(255, 235, 160) : color(120, 110, 90));
  ellipse(350, 320, 34, 20);
  addHotspot(330, 300, 40, 40, () => {
    st.lampOn = !st.lampOn;
    showToast(st.lampOn ? 'You switch on the lamp.' : 'You switch off the lamp.');
  });

  // dresser with drawer (wallet inside)
  fill('#4a3323');
  rect(600, 340, 180, 100, 4);
  fill('#332217');
  rect(615, st.drawerOpen ? 400 : 360, 150, 30, 3);
  if (st.drawerOpen && !st.walletTaken) {
    fill(120, 80, 50);
    rect(660, 402, 26, 18, 2);
  }
  addHotspot(600, 340, 180, 100, () => {
    if (!st.drawerOpen) {
      st.drawerOpen = true;
      showToast('You slide open the drawer.');
    } else if (!st.walletTaken) {
      st.walletTaken = true;
      inventory.add('wallet');
      showToast('You grab your wallet.');
    } else {
      showToast('The drawer is empty now.');
    }
  });

  // mirror (flavor)
  fill('#2a2436');
  rect(450, 160, 80, 110, 40);
  fill(200, 210, 230, 120);
  rect(460, 170, 60, 90, 34);
  addHotspot(450, 160, 80, 110, () => showToast('You look tired but ready for tomorrow.'));

  handleHotspots();
}

/* ---------- CHILD'S ROOM ---------- */

function roomChild() {
  const st = roomState.child;
  drawWallsFloor(color(st.lightOn ? '#3a5560' : '#22323a'), color('#7a6a45'));
  drawWindow(80, 60, 150, 110, '#20305a', '#7ea6cf');
  if (st.curtainsOpen) {
    fill(220, 120, 120, 0);
  }
  fill('#c76b6b');
  if (!st.curtainsOpen) {
    rect(70, 50, 40, 130, 2);
    rect(220, 50, 40, 130, 2);
  } else {
    rect(65, 50, 18, 130, 2);
    rect(250, 50, 18, 130, 2);
  }
  addHotspot(70, 50, 190, 130, () => {
    st.curtainsOpen = !st.curtainsOpen;
    showToast(st.curtainsOpen ? 'You open the curtains.' : 'You close the curtains.');
  });

  // bunk-ish bed
  fill('#6b4a30');
  rect(500, 300, 260, 130, 6);
  fill('#e8dca0');
  rect(510, 300, 240, 60, 6);
  fill('#c76b8a');
  ellipse(560, 320, 40, 26);
  addHotspot(500, 300, 260, 130, () => showToast('Small bed, big dreams.'));

  // toy box (jacket hidden under toys, whimsical)
  fill('#3a6a4a');
  rect(80, 340, 140, 90, 6);
  if (st.toyOut) {
    fill('#d0a030');
    triangle(100, 340, 130, 300, 160, 340);
    fill('#3050c0');
    rect(170, 320, 30, 20, 3);
  }
  addHotspot(80, 340, 140, 90, () => {
    st.toyOut = true;
    showToast('Toys everywhere! A small mess, but fun.');
  });

  // closet with jacket
  fill('#2f3a45');
  rect(320, 240, 90, 190, 3);
  fill('#20262e');
  rect(326, 246, 78, 178);
  if (!st.jacketTaken) {
    fill(200, 90, 60);
    rect(345, 280, 40, 60, 4);
  }
  addHotspot(320, 240, 90, 190, () => {
    if (!st.jacketTaken) {
      st.jacketTaken = true;
      inventory.add('jacket');
      showToast('You grab a warm jacket.');
    } else {
      showToast('Just empty hangers now.');
    }
  });

  // light switch
  fill(220);
  rect(870, 300, 14, 20, 2);
  addHotspot(860, 290, 40, 40, () => {
    st.lightOn = !st.lightOn;
    showToast(st.lightOn ? 'Lights on.' : 'Lights off.');
  });

  handleHotspots();
}

/* ---------- LIVING ROOM ---------- */

function roomLiving() {
  const st = roomState.living;
  drawWallsFloor(color('#4a4438'), color('#5a4530'));
  drawWindow(400, 60, 200, 120, '#2a2a55', '#8a7ab0');

  // sofa
  fill('#7a5a45');
  rect(60, 320, 260, 110, 10);
  fill(st.cushionFluffed ? color('#a88a6a') : color('#8a6a50'));
  rect(75, 330, 100, 60, 8);
  rect(190, 330, 100, 60, 8);
  addHotspot(60, 320, 260, 110, () => {
    st.cushionFluffed = !st.cushionFluffed;
    showToast('You fluff the cushions.');
  });

  // TV
  fill('#1a1a1a');
  rect(650, 220, 200, 120, 4);
  fill(st.tvOn ? color(120, 200, 255) : color(20, 20, 25));
  rect(660, 230, 180, 100, 2);
  fill('#3a3a3a');
  rect(730, 340, 40, 10);
  addHotspot(650, 220, 200, 120, () => {
    st.tvOn = !st.tvOn;
    showToast(st.tvOn ? 'You turn on the TV.' : 'You turn off the TV.');
  });

  // bowl by the door with keys
  fill('#3a2a1f');
  ellipse(400, 420, 70, 30);
  if (!st.keysTaken) {
    fill(230, 200, 90);
    ellipse(390, 412, 14, 14);
    ellipse(408, 410, 10, 10);
  }
  addHotspot(365, 395, 70, 50, () => {
    if (!st.keysTaken) {
      st.keysTaken = true;
      inventory.add('keys');
      showToast('You grab your keys from the bowl.');
    } else {
      showToast('The bowl is empty.');
    }
  });

  // bookshelf (flavor)
  fill('#3a2a1f');
  rect(560, 280, 60, 160, 3);
  for (let i = 0; i < 4; i++) {
    fill(color(80 + i * 30, 60, 60));
    rect(566, 290 + i * 35, 48, 10);
  }
  addHotspot(560, 280, 60, 160, () => showToast('Dusty old paperbacks.'));

  handleHotspots();
}

/* ---------- KITCHEN ---------- */

function roomKitchen() {
  const st = roomState.kitchen;
  drawWallsFloor(color('#4a5540'), color('#8a7a5a'));
  drawWindow(60, 60, 160, 110, '#3a5a3a', '#a0c98a');

  // counter
  fill('#8a8a90');
  rect(0, 320, DESIGN_W, 24);
  fill('#5a5a60');
  rect(0, 344, DESIGN_W, 120);

  // kettle
  fill('#c0c0c8');
  ellipse(150, 300, 60, 40);
  fill(st.kettleOn ? color(255, 120, 60) : color(120, 120, 130));
  rect(140, 260, 20, 20, 3);
  addHotspot(120, 260, 70, 70, () => {
    st.kettleOn = !st.kettleOn;
    showToast(st.kettleOn ? 'The kettle starts to hum.' : 'You switch off the kettle.');
  });

  // fridge
  fill('#d8d8e0');
  rect(650, 200, 140, 220, 6);
  if (st.fridgeOpen) {
    fill('#2a2a30');
    rect(660, 210, 120, 200, 4);
    fill('#e0a030');
    rect(675, 260, 30, 40, 3);
  }
  addHotspot(650, 200, 140, 220, () => {
    st.fridgeOpen = !st.fridgeOpen;
    showToast(st.fridgeOpen ? 'You open the fridge. A little cold light.' : 'You close the fridge.');
  });

  // eating table with chairs
  fill('#6b4a30');
  rect(320, 380, 220, 90, 6);
  fill('#4a3320');
  rect(340, 460, 14, 40);
  rect(490, 460, 14, 40);
  fill('#3a2a1f');
  rect(300, 420, 30, 50, 3);
  rect(560, 420, 30, 50, 3);
  addHotspot(320, 380, 220, 90, () => showToast('The table where you eat together.'));

  // shoe mat by the back door with shoes
  fill('#3a2a1f');
  rect(850, 400, 90, 40, 4);
  if (!st.shoesTaken) {
    fill(180, 60, 60);
    ellipse(875, 415, 26, 14);
    fill(60, 90, 170);
    ellipse(900, 418, 26, 14);
  }
  addHotspot(840, 385, 100, 70, () => {
    if (!st.shoesTaken) {
      st.shoesTaken = true;
      inventory.add('shoes');
      showToast('You grab a pair of shoes.');
    } else {
      showToast('The mat is empty now.');
    }
  });

  handleHotspots();
}

/* ---------------- HOTSPOT SYSTEM ---------------- */

let currentHotspots = [];

function addHotspot(x, y, w, h, onTap) {
  currentHotspots.push({ x, y, w, h, onTap });
}

function handleHotspots() {
  const p = mouseDesign();
  for (const hs of currentHotspots) {
    if (pointInRect(p, hs.x, hs.y, hs.w, hs.h)) {
      hoverHotspot = hs;
      hotspotGlow(hs.x, hs.y, hs.w, hs.h, true);
      break;
    }
  }
}

/* ---------------- CONFETTI ---------------- */

function spawnConfetti() {
  particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: random(DESIGN_W),
      y: random(-200, 0),
      vy: random(2, 5),
      vx: random(-1, 1),
      c: color(random(200, 255), random(150, 220), random(80, 180)),
      s: random(4, 9)
    });
  }
}

function updateParticles() {
  for (const pt of particles) {
    pt.y += pt.vy;
    pt.x += pt.vx;
    if (pt.y > DESIGN_H + 20) pt.y = -20;
  }
}

function drawParticles() {
  push();
  for (const pt of particles) {
    fill(pt.c);
    rect(pt.x, pt.y, pt.s, pt.s * 0.6);
  }
  pop();
}

/* ---------------- MAIN INPUT ---------------- */

function handleTapAt(px, py) {
  const p = toDesign(px, py);

  if (state === STATE.INTRO) {
    if (introButton && pointInRect(p, introButton.x, introButton.y, introButton.w, introButton.h)) {
      state = STATE.PLAY;
      currentRoom = 'corridor';
    }
    return;
  }

  if (state === STATE.WIN) {
    if (winButton && pointInRect(p, winButton.x, winButton.y, winButton.w, winButton.h)) {
      inventory.clear();
      resetRoomState();
      state = STATE.PLAY;
      currentRoom = 'corridor';
    }
    return;
  }

  if (state === STATE.PLAY) {
    if (transitioning) return;
    if (backButton && pointInRect(p, backButton.x, backButton.y, backButton.w, backButton.h)) {
      goToRoom('corridor');
      return;
    }
    for (const hs of currentHotspots) {
      if (pointInRect(p, hs.x, hs.y, hs.w, hs.h)) {
        hs.onTap();
        return;
      }
    }
  }
}

function resetRoomState() {
  roomState.corridor.lightOn = true;
  roomState.corridor.closetOpen = false;
  roomState.parent.lampOn = false;
  roomState.parent.drawerOpen = false;
  roomState.parent.bedMade = true;
  roomState.parent.walletTaken = false;
  roomState.child.toyOut = false;
  roomState.child.curtainsOpen = false;
  roomState.child.jacketTaken = false;
  roomState.child.lightOn = true;
  roomState.living.tvOn = false;
  roomState.living.cushionFluffed = false;
  roomState.living.keysTaken = false;
  roomState.kitchen.kettleOn = false;
  roomState.kitchen.shoesTaken = false;
  roomState.kitchen.fridgeOpen = false;
}

function mousePressed() {
  handleTapAt(mouseX, mouseY);
}

function touchStarted() {
  if (touches.length > 0) {
    handleTapAt(touches[0].x, touches[0].y);
  } else {
    handleTapAt(mouseX, mouseY);
  }
  return false;
}
