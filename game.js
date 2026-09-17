// Douglas's Big Morning
// A simple top-down cartoon game: wake up, leave the house, catch the
// bus, and ride to school. Everything is drawn with plain canvas shapes
// (no image files) in a chunky, colorful style.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

// ---------------------------------------------------------------------
// Game states
// ---------------------------------------------------------------------
const STATE = {
  TITLE: "TITLE",
  HOUSE: "HOUSE",
  OUTSIDE: "OUTSIDE",
  CUTSCENE: "CUTSCENE",
  SCHOOL: "SCHOOL",
};

const game = {
  state: STATE.TITLE,
  transition: null, // { toState, phase: 'out'|'in', t }
};

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  handleActionKey(e.key.toLowerCase());
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});
canvas.addEventListener("click", () => {
  if (game.state === STATE.TITLE) startTransition(STATE.HOUSE);
});

function handleActionKey(key) {
  if (game.state === STATE.TITLE && key === " ") startTransition(STATE.HOUSE);
  if (game.state === STATE.SCHOOL && key === "r") startTransition(STATE.TITLE);
  if (game.state === STATE.CUTSCENE && key === " ") cutscene.t = cutscene.duration;
}

function isMoveKeyDown() {
  return (
    keys["arrowup"] || keys["arrowdown"] || keys["arrowleft"] || keys["arrowright"] ||
    keys["w"] || keys["a"] || keys["s"] || keys["d"]
  );
}

function getMoveVector() {
  let dx = 0, dy = 0;
  if (keys["arrowleft"] || keys["a"]) dx -= 1;
  if (keys["arrowright"] || keys["d"]) dx += 1;
  if (keys["arrowup"] || keys["w"]) dy -= 1;
  if (keys["arrowdown"] || keys["s"]) dy += 1;
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  return { dx, dy };
}

// ---------------------------------------------------------------------
// Scene transitions (simple fade to black / fade in)
// ---------------------------------------------------------------------
function startTransition(toState) {
  game.transition = { toState, phase: "out", t: 0 };
}

function updateTransition(dt) {
  if (!game.transition) return;
  const tr = game.transition;
  tr.t += dt;
  const FADE_TIME = 0.35;
  if (tr.phase === "out") {
    if (tr.t >= FADE_TIME) {
      onEnterState(tr.toState);
      game.state = tr.toState;
      tr.phase = "in";
      tr.t = 0;
    }
  } else if (tr.phase === "in") {
    if (tr.t >= FADE_TIME) {
      game.transition = null;
    }
  }
}

function drawTransition() {
  if (!game.transition) return;
  const FADE_TIME = 0.35;
  const tr = game.transition;
  let alpha;
  if (tr.phase === "out") alpha = tr.t / FADE_TIME;
  else alpha = 1 - tr.t / FADE_TIME;
  alpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------------
// Character drawing helper (used for Douglas and all NPCs)
// A simple chunky peg-doll style character, drawn top-down / 3-quarter.
// ---------------------------------------------------------------------
function drawCharacter(x, y, facing, shirtColor, pantsColor, hairColor, walkPhase, label) {
  ctx.save();
  ctx.translate(x, y);

  // Soft shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const bob = Math.sin(walkPhase) * 2;
  const legSwing = Math.sin(walkPhase) * 6;

  // Legs
  ctx.fillStyle = pantsColor;
  ctx.fillRect(-9, 4 + bob - legSwing * 0.2, 7, 14);
  ctx.fillRect(2, 4 + bob + legSwing * 0.2, 7, 14);

  // Body (torso)
  ctx.fillStyle = shirtColor;
  roundRect(-13, -14 + bob, 26, 24, 8);
  ctx.fill();

  // Arms
  ctx.fillStyle = shirtColor;
  ctx.fillRect(-17, -10 + bob + legSwing * 0.15, 6, 16);
  ctx.fillRect(11, -10 + bob - legSwing * 0.15, 6, 16);

  // Head
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(0, -22 + bob, 12, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(0, -27 + bob, 12, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-12, -27 + bob, 24, 6);

  // Face - little dot eyes, direction-aware
  ctx.fillStyle = "#3a2a1a";
  const eyeOffsetX = facing === "left" ? -3 : facing === "right" ? 3 : 0;
  ctx.beginPath();
  ctx.arc(-4 + eyeOffsetX, -22 + bob, 1.6, 0, Math.PI * 2);
  ctx.arc(4 + eyeOffsetX, -22 + bob, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (label) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = "12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - 44);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------
// Player (Douglas)
// ---------------------------------------------------------------------
const player = {
  x: 130,
  y: 150,
  speed: 160,
  facing: "down",
  walkPhase: 0,
  moving: false,
  awake: false, // used only in the bedroom, before he gets out of bed
};

function updatePlayerMovement(dt, bounds) {
  const { dx, dy } = getMoveVector();
  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
    player.walkPhase += dt * 10;
    if (dx < 0) player.facing = "left";
    else if (dx > 0) player.facing = "right";
    else if (dy < 0) player.facing = "up";
    else if (dy > 0) player.facing = "down";
  }
  if (bounds) {
    player.x = Math.max(bounds.x1, Math.min(bounds.x2, player.x));
    player.y = Math.max(bounds.y1, Math.min(bounds.y2, player.y));
  }
}

// ---------------------------------------------------------------------
// NPC wander AI (family members walking around the house)
// ---------------------------------------------------------------------
function makeNPC(x, y, bounds, shirt, pants, hair, label, speed) {
  return {
    x, y, bounds, shirt, pants, hair, label, speed,
    tx: x, ty: y, // target point
    walkPhase: Math.random() * 10,
    facing: "down",
    retarget: 0,
  };
}

function updateNPC(npc, dt) {
  npc.retarget -= dt;
  if (npc.retarget <= 0) {
    npc.tx = npc.bounds.x1 + Math.random() * (npc.bounds.x2 - npc.bounds.x1);
    npc.ty = npc.bounds.y1 + Math.random() * (npc.bounds.y2 - npc.bounds.y1);
    npc.retarget = 2 + Math.random() * 3;
  }
  const dx = npc.tx - npc.x;
  const dy = npc.ty - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    const nx = dx / dist, ny = dy / dist;
    npc.x += nx * npc.speed * dt;
    npc.y += ny * npc.speed * dt;
    npc.walkPhase += dt * 8;
    if (Math.abs(nx) > Math.abs(ny)) npc.facing = nx < 0 ? "left" : "right";
    else npc.facing = ny < 0 ? "up" : "down";
  } else {
    npc.retarget = Math.min(npc.retarget, 0.3);
  }
}

// ---------------------------------------------------------------------
// HOUSE scene
// ---------------------------------------------------------------------
const house = {
  floor: { x1: 40, y1: 40, x2: 920, y2: 480 },
  door: { x1: 420, y1: 462, x2: 540, y2: 486 },
  npcs: [],
};

function setupHouse() {
  player.x = 130;
  player.y = 150;
  player.awake = false;
  player.facing = "down";
  house.npcs = [
    makeNPC(720, 130, { x1: 620, y1: 70, x2: 880, y2: 230 }, "#e07bb0", "#6a3fa0", "#3a2a1a", "Mom", 55),
    makeNPC(200, 380, { x1: 80, y1: 300, x2: 500, y2: 450 }, "#3f6fb0", "#4a4a4a", "#2a2a2a", "Dad", 50),
    makeNPC(500, 260, { x1: 100, y1: 60, x2: 880, y2: 450 }, "#5fbf5f", "#c9a04a", "#7a4a2a", "Brother", 75),
  ];
}

function updateHouse(dt) {
  const wasAwake = player.awake;
  if (!player.awake && isMoveKeyDown()) player.awake = true;

  if (player.awake) {
    updatePlayerMovement(dt, {
      x1: house.floor.x1 + 14,
      y1: house.floor.y1 + 14,
      x2: house.floor.x2 - 14,
      y2: house.floor.y2 - 14,
    });
  }

  house.npcs.forEach((n) => updateNPC(n, dt));

  // Check if Douglas walked into the front door
  if (
    wasAwake === true &&
    player.x > house.door.x1 &&
    player.x < house.door.x2 &&
    player.y > house.door.y1 - 10
  ) {
    startTransition(STATE.OUTSIDE);
  }
}

function drawHouse() {
  // Outside-the-house background peeking through (just a neutral color)
  ctx.fillStyle = "#2b2b3a";
  ctx.fillRect(0, 0, W, H);

  const f = house.floor;

  // Bedroom zone (top-left)
  ctx.fillStyle = "#cfe8f5";
  ctx.fillRect(f.x1, f.y1, 320, 220);
  // Kitchen zone (top-right)
  ctx.fillStyle = "#f7edc6";
  ctx.fillRect(f.x1 + 560, f.y1, 320, 220);
  // Living room zone (bottom band)
  ctx.fillStyle = "#d9f0d3";
  ctx.fillRect(f.x1, f.y1 + 220, f.x2 - f.x1, f.y2 - f.y1 - 220);

  // Walls / outline
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 8;
  ctx.strokeRect(f.x1, f.y1, f.x2 - f.x1, f.y2 - f.y1);

  // Front door gap (drawn as a lighter opening + door mat)
  ctx.fillStyle = "#2b2b3a";
  ctx.fillRect(house.door.x1, f.y2 - 6, house.door.x2 - house.door.x1, 14);
  ctx.fillStyle = "#a5673f";
  ctx.fillRect(house.door.x1, f.y2 - 20, house.door.x2 - house.door.x1, 16);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "12px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("front door", (house.door.x1 + house.door.x2) / 2, f.y2 + 26);

  // --- Furniture ---
  // Bed
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(70, 70, 120, 150);
  ctx.fillStyle = "#e75c5c";
  ctx.fillRect(80, 80, 100, 100);
  ctx.fillStyle = "#fff";
  ctx.fillRect(85, 85, 90, 24);
  if (!player.awake) {
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px Trebuchet MS";
    ctx.fillText("Zzz...", 220, 110);
  }
  // Nightstand
  ctx.fillStyle = "#6a4a2a";
  ctx.fillRect(200, 200, 30, 30);

  // Kitchen counter + table
  ctx.fillStyle = "#b08a5a";
  ctx.fillRect(620, 60, 260, 26);
  ctx.fillStyle = "#8a6a3a";
  ctx.fillRect(720, 160, 70, 45);
  ctx.fillStyle = "#c9a04a";
  ctx.fillRect(700, 150, 20, 20);
  ctx.fillRect(800, 150, 20, 20);

  // Living room couch + TV
  ctx.fillStyle = "#6a5acd";
  roundRect(70, 300, 140, 45, 10);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.fillRect(70, 400, 60, 40);
  ctx.fillStyle = "#111";
  ctx.fillRect(75, 405, 50, 30);

  // Dining table
  ctx.fillStyle = "#a5673f";
  ctx.beginPath();
  ctx.ellipse(500, 400, 55, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // NPCs
  house.npcs.forEach((n) => drawCharacter(n.x, n.y, n.facing, n.shirt, n.pants, n.hair, n.walkPhase, n.label));

  // Player
  if (!player.awake) {
    drawCharacter(player.x, player.y, "down", "#e0763c", "#2a4a7a", "#5a3a1a", 0, null);
    ctx.fillStyle = "#222";
    ctx.font = "16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Press an arrow key (or WASD) to wake up!", W / 2, 40);
  } else {
    drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", player.moving ? player.walkPhase : 0, "Douglas");
    ctx.fillStyle = "#222";
    ctx.font = "16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Walk to the front door to head outside", W / 2, 40);
  }
}

// ---------------------------------------------------------------------
// OUTSIDE scene
// ---------------------------------------------------------------------
const outside = {
  walk: { x1: 40, y1: 200, x2: 920, y2: 540 },
  busStop: { x1: 740, y1: 400, x2: 880, y2: 540 },
  waiting: false,
  busTimer: 0,
  bus: null, // { x, y, targetX, arrived }
};

function setupOutside() {
  player.x = 480;
  player.y = 230;
  player.facing = "down";
  outside.waiting = false;
  outside.busTimer = 0;
  outside.bus = { x: -260, y: 480, targetX: 610, arrived: false, doorOpen: false };
}

function updateOutside(dt) {
  updatePlayerMovement(dt, outside.walk);

  const b = outside.bus;

  // Waiting at the bus stop
  const atStop =
    player.x > outside.busStop.x1 - 20 &&
    player.x < outside.busStop.x2 + 20 &&
    player.y > outside.busStop.y1 - 20 &&
    player.y < outside.busStop.y2 + 20;

  if (atStop && !b.arrived) {
    outside.waiting = true;
    outside.busTimer += dt;
    if (outside.busTimer > 1.2) {
      // start driving the bus in
      b.driving = true;
    }
  }

  if (b.driving && !b.arrived) {
    b.x += (b.targetX - b.x) * Math.min(1, dt * 2.2);
    if (Math.abs(b.targetX - b.x) < 2) {
      b.x = b.targetX;
      b.arrived = true;
      b.doorOpen = true;
    }
  }

  // Getting on the bus (hotspot matches the door drawn in drawBus)
  if (b.arrived) {
    const doorX = b.x + 203;
    const doorY = b.y - 15;
    if (Math.hypot(player.x - doorX, player.y - doorY) < 45) {
      startTransition(STATE.CUTSCENE);
    }
  }
}

function drawOutside() {
  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 260);
  skyGrad.addColorStop(0, "#8ec9f0");
  skyGrad.addColorStop(1, "#cdeeff");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, 260);

  // Sun
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(860, 60, 40, 0, Math.PI * 2);
  ctx.fill();

  // Grass
  ctx.fillStyle = "#7cc26b";
  ctx.fillRect(0, 200, W, 340);

  // House exterior (top area)
  ctx.fillStyle = "#e3c08a";
  ctx.fillRect(340, 40, 320, 180);
  // Roof
  ctx.fillStyle = "#8a3a3a";
  ctx.beginPath();
  ctx.moveTo(320, 40);
  ctx.lineTo(500, -30);
  ctx.lineTo(680, 40);
  ctx.closePath();
  ctx.fill();
  // Door (matches interior door location)
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(house.door.x1, 400 - 180, house.door.x2 - house.door.x1, 90);
  // Windows
  ctx.fillStyle = "#bfe6f5";
  ctx.fillRect(380, 90, 50, 50);
  ctx.fillRect(600, 90, 50, 50);
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 4;
  ctx.strokeRect(380, 90, 50, 50);
  ctx.strokeRect(600, 90, 50, 50);

  // Sidewalk from door down to street
  ctx.fillStyle = "#c8c8c8";
  ctx.fillRect(440, 220, 100, 320);
  // Sidewalk across to bus stop
  ctx.fillRect(440, 470, 420, 60);

  // Street
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(0, 530, W, 70);
  ctx.strokeStyle = "#f0d040";
  ctx.setLineDash([30, 20]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 565);
  ctx.lineTo(W, 565);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bus stop sign + bench
  ctx.fillStyle = "#888";
  ctx.fillRect(818, 420, 6, 60);
  ctx.fillStyle = "#3a7a3a";
  roundRect(795, 395, 55, 28, 5);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("BUS STOP", 822, 413);
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(760, 460, 60, 10);
  ctx.fillRect(760, 460, 8, 20);
  ctx.fillRect(812, 460, 8, 20);

  // Bus
  const b = outside.bus;
  drawBus(b.x, b.y, b.doorOpen);

  // Player
  drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", player.moving ? player.walkPhase : 0, "Douglas");

  // Hints
  ctx.fillStyle = "#222";
  ctx.font = "16px Trebuchet MS";
  ctx.textAlign = "center";
  if (!b.arrived) {
    ctx.fillText("Walk to the bus stop sign and wait for the bus", W / 2, 30);
  } else {
    ctx.fillText("Walk onto the bus!", W / 2, 30);
  }
}

function drawBus(x, y, doorOpen) {
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(70, 55, 150, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#f4c11e";
  roundRect(-70, -60, 300, 95, 16);
  ctx.fill();
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 4;
  roundRect(-70, -60, 300, 95, 16);
  ctx.stroke();

  // Windows
  ctx.fillStyle = "#bfe6f5";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(-55 + i * 46, -45, 34, 26);
  }

  // Door
  ctx.fillStyle = doorOpen ? "#eee" : "#333";
  ctx.fillRect(190, -45, 26, 60);
  if (doorOpen) {
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(190, -45, 26, 60);
  }

  // Wheels
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(-30, 38, 16, 0, Math.PI * 2);
  ctx.arc(150, 38, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------
// CUTSCENE: bus driving to school
// ---------------------------------------------------------------------
const cutscene = {
  t: 0,
  duration: 4.5,
  scenery: [],
};

function setupCutscene() {
  cutscene.t = 0;
  cutscene.scenery = [];
  for (let i = 0; i < 10; i++) {
    cutscene.scenery.push({
      x: Math.random() * W,
      type: Math.random() < 0.5 ? "tree" : "house",
      scale: 0.7 + Math.random() * 0.6,
    });
  }
}

function updateCutscene(dt) {
  cutscene.t += dt;
  const speed = 260 * dt;
  cutscene.scenery.forEach((s) => {
    s.x -= speed;
    if (s.x < -80) s.x += W + 160;
  });
  if (cutscene.t >= cutscene.duration) {
    startTransition(STATE.SCHOOL);
  }
}

function drawCutscene() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
  skyGrad.addColorStop(0, "#8ec9f0");
  skyGrad.addColorStop(1, "#cdeeff");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, 400);

  ctx.fillStyle = "#7cc26b";
  ctx.fillRect(0, 400, W, 200);

  // Road
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(0, 470, W, 130);
  ctx.strokeStyle = "#f0d040";
  ctx.setLineDash([40, 25]);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 535);
  ctx.lineTo(W, 535);
  ctx.stroke();
  ctx.setLineDash([]);

  // Scrolling scenery (simple trees / houses passing by in background)
  cutscene.scenery.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, 400);
    ctx.scale(s.scale, s.scale);
    if (s.type === "tree") {
      ctx.fillStyle = "#7a4a2a";
      ctx.fillRect(-6, -30, 12, 30);
      ctx.fillStyle = "#3f8f3f";
      ctx.beginPath();
      ctx.arc(0, -50, 26, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#e3c08a";
      ctx.fillRect(-30, -50, 60, 50);
      ctx.fillStyle = "#8a3a3a";
      ctx.beginPath();
      ctx.moveTo(-38, -50);
      ctx.lineTo(0, -80);
      ctx.lineTo(38, -50);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  // Bus (big, foreground, stays centered while world scrolls past)
  drawBus(W / 2 - 90, 470, false);

  // Little bounce so it feels like it's driving
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "20px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Douglas is riding the bus to school...", W / 2, 60);
  ctx.font = "14px Trebuchet MS";
  ctx.fillText("(press SPACE to skip)", W / 2, 86);
}

// ---------------------------------------------------------------------
// SCHOOL scene
// ---------------------------------------------------------------------
const school = { kids: [] };

function setupSchool() {
  school.kids = [
    makeNPC(300, 460, { x1: 260, y1: 430, x2: 420, y2: 500 }, "#e07bb0", "#f0d040", "#2a2a2a", null, 40),
    makeNPC(650, 470, { x1: 600, y1: 430, x2: 760, y2: 500 }, "#5fbf5f", "#3f6fb0", "#5a3a1a", null, 40),
  ];
  player.x = W / 2;
  player.y = 480;
}

function updateSchool(dt) {
  school.kids.forEach((k) => updateNPC(k, dt));
}

function drawSchool() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 300);
  skyGrad.addColorStop(0, "#8ec9f0");
  skyGrad.addColorStop(1, "#cdeeff");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, 300);

  ctx.fillStyle = "#7cc26b";
  ctx.fillRect(0, 260, W, 340);

  // School building
  ctx.fillStyle = "#c96a4a";
  ctx.fillRect(230, 80, 500, 220);
  ctx.fillStyle = "#8a3a2a";
  ctx.fillRect(210, 60, 540, 30);

  // Flag pole
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(720, 40);
  ctx.lineTo(720, 100);
  ctx.stroke();
  ctx.fillStyle = "#3f6fb0";
  ctx.fillRect(720, 40, 34, 20);

  // Sign
  ctx.fillStyle = "#fff";
  roundRect(400, 100, 160, 50, 8);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.font = "bold 20px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("SCHOOL", 480, 132);

  // Door + steps
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(450, 220, 60, 80);
  ctx.fillStyle = "#ccc";
  ctx.fillRect(420, 300, 120, 14);
  ctx.fillRect(430, 314, 100, 14);

  // Windows
  ctx.fillStyle = "#bfe6f5";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(260 + i * 60, 120, 34, 44);
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(560 + i * 42, 120, 30, 44);
  }

  // Kids
  school.kids.forEach((k) => drawCharacter(k.x, k.y, k.facing, k.shirt, k.pants, k.hair, k.walkPhase, null));

  // Player
  drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", 0, "Douglas");

  // Text
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(W / 2 - 260, 350, 520, 90, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Trebuchet MS";
  ctx.fillText("You made it to school, Douglas!", W / 2, 390);
  ctx.font = "16px Trebuchet MS";
  ctx.fillText("Thanks for playing! Press R to start again.", W / 2, 420);
}

// ---------------------------------------------------------------------
// TITLE scene
// ---------------------------------------------------------------------
function drawTitle() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, "#6fb3e0");
  skyGrad.addColorStop(1, "#cdeeff");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  drawCharacter(W / 2, H / 2 + 40, "down", "#e0763c", "#2a4a7a", "#5a3a1a", performance.now() / 200, null);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "bold 46px Trebuchet MS";
  ctx.fillText("Douglas's Big Morning", W / 2, H / 2 - 100);

  ctx.font = "20px Trebuchet MS";
  ctx.fillText("Wake up, get out the door, and catch the bus to school!", W / 2, H / 2 - 55);

  if (Math.floor(performance.now() / 500) % 2 === 0) {
    ctx.font = "bold 22px Trebuchet MS";
    ctx.fillText("Click or press SPACE to start", W / 2, H / 2 + 140);
  }

  ctx.font = "14px Trebuchet MS";
  ctx.fillText("Move with the Arrow Keys or WASD", W / 2, H - 30);
}

// ---------------------------------------------------------------------
// State setup dispatch
// ---------------------------------------------------------------------
function onEnterState(state) {
  if (state === STATE.HOUSE) setupHouse();
  else if (state === STATE.OUTSIDE) setupOutside();
  else if (state === STATE.CUTSCENE) setupCutscene();
  else if (state === STATE.SCHOOL) setupSchool();
}

// ---------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

function update(dt) {
  const inTransitionOut = game.transition && game.transition.phase === "out";
  if (!inTransitionOut) {
    if (game.state === STATE.HOUSE) updateHouse(dt);
    else if (game.state === STATE.OUTSIDE) updateOutside(dt);
    else if (game.state === STATE.CUTSCENE) updateCutscene(dt);
    else if (game.state === STATE.SCHOOL) updateSchool(dt);
  }
  updateTransition(dt);
}

function render() {
  ctx.clearRect(0, 0, W, H);
  if (game.state === STATE.TITLE) drawTitle();
  else if (game.state === STATE.HOUSE) drawHouse();
  else if (game.state === STATE.OUTSIDE) drawOutside();
  else if (game.state === STATE.CUTSCENE) drawCutscene();
  else if (game.state === STATE.SCHOOL) drawSchool();
  drawTransition();
}

requestAnimationFrame(loop);
