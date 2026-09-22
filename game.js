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
  SCHOOL_HALLWAY: "SCHOOL_HALLWAY",
  CLASSROOM: "CLASSROOM",
  TAXI_CUTSCENE: "TAXI_CUTSCENE",
  DESERT_END: "DESERT_END",
};

const TALK_RADIUS = 70;

const game = {
  state: STATE.TITLE,
  transition: null, // { toState, phase: 'out'|'in', t }
};

// Tracks the story twist: once true, Douglas is fleeing the monster
// teacher back out of the school instead of walking in normally.
const story = {
  fleeing: false,
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
  if (game.state === STATE.DESERT_END && key === "r") startTransition(STATE.TITLE);
  if (game.state === STATE.CUTSCENE && key === " ") cutscene.t = cutscene.duration;
  if (game.state === STATE.TAXI_CUTSCENE && key === " ") taxiCutscene.t = taxiCutscene.duration;
  if (key === "e") tryInteract();
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
// Dialogue - press E near a talkable person to hear a random line
// ---------------------------------------------------------------------
function getTalkableNPCs() {
  if (game.state === STATE.HOUSE) return house.npcs;
  if (game.state === STATE.SCHOOL) return school.kids;
  if (game.state === STATE.CLASSROOM && !classroom.seated) {
    return [classroom.teacher, ...classroom.classmates];
  }
  return [];
}

function findNearestTalkable() {
  const npcs = getTalkableNPCs();
  let nearest = null;
  let nearestDist = TALK_RADIUS;
  npcs.forEach((npc) => {
    if (!npc.lines || npc.lines.length === 0) return;
    const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (dist < nearestDist) {
      nearest = npc;
      nearestDist = dist;
    }
  });
  return nearest;
}

function tryTalk() {
  const npc = findNearestTalkable();
  if (!npc) return;
  const choices = npc.lines.filter((l) => l !== npc.speechText);
  npc.speechText = choices.length ? choices[Math.floor(Math.random() * choices.length)] : npc.lines[0];
  npc.speechTimer = 3.5;
}

// In the house, E can also turn on the TV or do a morning chore, on top
// of talking to family members. Elsewhere it's just talking.
function tryInteract() {
  if (game.state === STATE.HOUSE) {
    const action = findNearestHouseAction();
    if (!action) return;
    if (action.type === "npc") {
      const npc = action.ref;
      const choices = npc.lines.filter((l) => l !== npc.speechText);
      npc.speechText = choices.length ? choices[Math.floor(Math.random() * choices.length)] : npc.lines[0];
      npc.speechTimer = 3.5;
    } else if (action.type === "tv") {
      house.tv.on = !house.tv.on;
      showHouseMessage(house.tv.on ? "Douglas turns on the TV. Cartoons!" : "Douglas turns off the TV.");
    } else if (action.type === "chore") {
      action.ref.done = true;
      const allDone = house.chores.every((c) => c.done);
      if (allDone && !house.allChoresCelebrated) {
        house.allChoresCelebrated = true;
        showHouseMessage("Great job! All your morning chores are done!");
      } else {
        showHouseMessage(action.ref.doneMessage);
      }
    }
    return;
  }
  tryTalk();
}

function updateSpeech(npc, dt) {
  if (npc.speechTimer > 0) {
    npc.speechTimer -= dt;
    if (npc.speechTimer <= 0) npc.speechText = null;
  }
}

function wrapText(text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawSpeechBubble(x, y, text) {
  ctx.font = "13px Trebuchet MS";
  const maxWidth = 170;
  const lines = wrapText(text, maxWidth);
  const lineHeight = 16;
  const paddingX = 12;
  const paddingY = 10;
  let textWidth = 0;
  lines.forEach((l) => (textWidth = Math.max(textWidth, ctx.measureText(l).width)));
  const boxW = textWidth + paddingX * 2;
  const boxH = lines.length * lineHeight + paddingY * 2;
  const boxX = x - boxW / 2;
  const boxY = y - boxH - 14;

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 2;
  roundRect(boxX, boxY, boxW, boxH, 10);
  ctx.fill();
  ctx.stroke();

  // Little tail pointing down at the speaker
  ctx.beginPath();
  ctx.moveTo(x - 8, boxY + boxH);
  ctx.lineTo(x + 8, boxY + boxH);
  ctx.lineTo(x, boxY + boxH + 10);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
  ctx.strokeStyle = "#3a2a1a";
  ctx.beginPath();
  ctx.moveTo(x - 8, boxY + boxH);
  ctx.lineTo(x, boxY + boxH + 10);
  ctx.lineTo(x + 8, boxY + boxH);
  ctx.stroke();

  ctx.fillStyle = "#222";
  ctx.textAlign = "center";
  lines.forEach((l, i) => {
    ctx.fillText(l, x, boxY + paddingY + i * lineHeight + 12);
  });
}

function drawPeopleSpeech(npcs) {
  npcs.forEach((npc) => {
    if (npc.speechText) drawSpeechBubble(npc.x, npc.y - 46, npc.speechText);
  });
}

function drawTalkHint() {
  const npc = findNearestTalkable();
  if (npc && !npc.speechText) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    roundRect(W / 2 - 110, H - 74, 220, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "13px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(`Press E to talk${npc.label ? " to " + npc.label : ""}`, W / 2, H - 57);
  }
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

// A goofy-scary monster, used for the teacher's pop-quiz transformation.
function drawMonster(x, y, phase) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = Math.sin(phase) * 3;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 30, 28, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = "#2a1a3a";
  ctx.fillRect(-14, 10 + pulse, 10, 20);
  ctx.fillRect(4, 10 + pulse, 10, 20);

  // Body
  ctx.fillStyle = "#3f7a3f";
  roundRect(-20, -20 + pulse, 40, 38, 12);
  ctx.fill();

  // Arms
  ctx.fillRect(-28, -12 + pulse, 9, 26);
  ctx.fillRect(19, -12 + pulse, 9, 26);
  // Claws
  ctx.fillStyle = "#eee";
  [-28, -25, -22].forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx, 12 + pulse);
    ctx.lineTo(cx + 2, 20 + pulse);
    ctx.lineTo(cx + 4, 12 + pulse);
    ctx.fill();
  });
  [19, 22, 25].forEach((cx) => {
    ctx.beginPath();
    ctx.moveTo(cx, 12 + pulse);
    ctx.lineTo(cx + 2, 20 + pulse);
    ctx.lineTo(cx + 4, 12 + pulse);
    ctx.fill();
  });

  // Head
  ctx.fillStyle = "#4a8f4a";
  ctx.beginPath();
  ctx.arc(0, -32 + pulse, 19, 0, Math.PI * 2);
  ctx.fill();

  // Horns
  ctx.fillStyle = "#caa040";
  ctx.beginPath();
  ctx.moveTo(-13, -46 + pulse);
  ctx.lineTo(-9, -64 + pulse);
  ctx.lineTo(-4, -46 + pulse);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -46 + pulse);
  ctx.lineTo(9, -64 + pulse);
  ctx.lineTo(13, -46 + pulse);
  ctx.fill();

  // Glowing red eyes
  ctx.fillStyle = "#ff2020";
  ctx.beginPath();
  ctx.arc(-7, -34 + pulse, 4.5, 0, Math.PI * 2);
  ctx.arc(7, -34 + pulse, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Fangs
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(-6, -20 + pulse);
  ctx.lineTo(-3, -11 + pulse);
  ctx.lineTo(0, -20 + pulse);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -20 + pulse);
  ctx.lineTo(3, -11 + pulse);
  ctx.lineTo(6, -20 + pulse);
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = "12px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("???", x, y - 62);
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
function makeNPC(x, y, bounds, shirt, pants, hair, label, speed, lines) {
  return {
    x, y, bounds, shirt, pants, hair, label, speed,
    tx: x, ty: y, // target point
    walkPhase: Math.random() * 10,
    facing: "down",
    retarget: 0,
    lines: lines || [],
    speechText: null,
    speechTimer: 0,
  };
}

function makeStaticPerson(x, y, shirt, pants, hair, label, lines) {
  return {
    x, y, shirt, pants, hair, label,
    facing: "down",
    walkPhase: 0,
    lines: lines || [],
    speechText: null,
    speechTimer: 0,
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
  floor: { x1: 30, y1: 30, x2: 930, y2: 550 },
  door: { x1: 420, y1: 532, x2: 540, y2: 556 },
  npcs: [],
  tv: null,
  chores: [],
  allChoresCelebrated: false,
  message: null,
};

function setupHouse() {
  story.fleeing = false;
  player.x = 130;
  player.y = 150;
  player.awake = false;
  player.facing = "down";
  house.message = null;
  house.allChoresCelebrated = false;

  house.tv = { x: 60, y: 345, w: 130, h: 95, on: false, radius: 65 };

  house.chores = [
    { id: "bed", x: 125, y: 120, radius: 75, label: "make your bed", doneMessage: "Douglas makes his bed. So tidy!", done: false },
    { id: "teeth", x: 845, y: 284, radius: 55, label: "brush your teeth", doneMessage: "Sparkling clean teeth!", done: false },
    { id: "breakfast", x: 560, y: 460, radius: 70, label: "eat breakfast", doneMessage: "Yum, breakfast is done! Ready for school.", done: false },
  ];

  house.npcs = [
    makeNPC(800, 110, { x1: 715, y1: 45, x2: 920, y2: 220 }, "#e07bb0", "#6a3fa0", "#3a2a1a", "Mom", 55, [
      "Good morning, Douglas! Want some breakfast?",
      "Don't forget to brush your teeth!",
      "Have you seen my keys? Never mind, found them in the fridge again.",
      "You're growing up so fast, sweetie.",
    ]),
    makeNPC(330, 300, { x1: 80, y1: 250, x2: 760, y2: 540 }, "#3f6fb0", "#4a4a4a", "#2a2a2a", "Dad", 50, [
      "Hey champ! Ready to conquer the school day?",
      "Did I tell you about the time I was late for the bus? ...Every day.",
      "Grab an apple, they say it's good for something.",
      "Knock knock. ...Never mind, you gotta go!",
    ]),
    makeNPC(600, 260, { x1: 100, y1: 60, x2: 900, y2: 540 }, "#5fbf5f", "#c9a04a", "#7a4a2a", "Brother", 75, [
      "You're gonna be late, slowpoke!",
      "I put a frog in your backpack. Kidding! ...Maybe.",
      "Race you to the bus stop!",
      "Mom said I'm the favorite now.",
    ]),
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

  house.npcs.forEach((n) => {
    updateNPC(n, dt);
    updateSpeech(n, dt);
  });

  if (house.message) {
    house.message.timer -= dt;
    if (house.message.timer <= 0) house.message = null;
  }

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

// Finds whatever Douglas is standing closest to that E can act on: a
// family member to talk to, the TV, or an unfinished chore.
function findNearestHouseAction() {
  let nearest = null;
  let nearestDist = Infinity;

  house.npcs.forEach((npc) => {
    if (!npc.lines || npc.lines.length === 0) return;
    const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (dist < TALK_RADIUS && dist < nearestDist) {
      nearest = { type: "npc", ref: npc, label: `Press E to talk${npc.label ? " to " + npc.label : ""}` };
      nearestDist = dist;
    }
  });

  const tvX = house.tv.x + house.tv.w / 2;
  const tvY = house.tv.y + house.tv.h / 2;
  const tvDist = Math.hypot(player.x - tvX, player.y - tvY);
  if (tvDist < house.tv.radius && tvDist < nearestDist) {
    nearest = { type: "tv", label: house.tv.on ? "Press E to turn off the TV" : "Press E to turn on the TV" };
    nearestDist = tvDist;
  }

  house.chores.forEach((c) => {
    if (c.done) return;
    const dist = Math.hypot(player.x - c.x, player.y - c.y);
    if (dist < c.radius && dist < nearestDist) {
      nearest = { type: "chore", ref: c, label: `Press E to ${c.label}` };
      nearestDist = dist;
    }
  });

  return nearest;
}

function showHouseMessage(text) {
  house.message = { text, timer: 2.6 };
}

function drawHouseHint() {
  const action = findNearestHouseAction();
  if (!action) return;
  if (action.type === "npc" && action.ref.speechText) return;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(W / 2 - 140, H - 74, 280, 24, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "13px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText(action.label, W / 2, H - 57);
}

function drawChoreChecklist() {
  const items = house.chores;
  const boxW = 190;
  const boxH = 30 + items.length * 20;
  const boxX = W - boxW - 14;
  const boxY = 14;

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 2;
  roundRect(boxX, boxY, boxW, boxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#222";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText("Morning Chores", boxX + 12, boxY + 18);

  items.forEach((c, i) => {
    const ry = boxY + 34 + i * 20;
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 12, ry - 11, 14, 14);
    if (c.done) {
      ctx.fillStyle = "#3f8f3f";
      ctx.fillRect(boxX + 14, ry - 9, 10, 10);
    }
    ctx.fillStyle = "#222";
    ctx.font = "12px Trebuchet MS";
    ctx.fillText(c.label.charAt(0).toUpperCase() + c.label.slice(1), boxX + 32, ry);
  });

  ctx.textAlign = "center";
}

function drawHouseMessage(text) {
  ctx.font = "bold 14px Trebuchet MS";
  ctx.textAlign = "center";
  const w = Math.min(520, ctx.measureText(text).width + 40);
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  roundRect(W / 2 - w / 2, 64, w, 30, 10);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, W / 2, 84);
}

// A working TV: press E nearby to switch it on or off. When it's on it
// plays a little animated cartoon; when it's off the screen is dark.
function drawTV(tv) {
  ctx.fillStyle = "#333";
  roundRect(tv.x, tv.y, tv.w, tv.h, 8);
  ctx.fill();

  const sx = tv.x + 10, sy = tv.y + 8, sw = tv.w - 20, sh = tv.h - 26;
  if (tv.on) {
    const hue = (performance.now() / 15) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
    ctx.fillRect(sx, sy, sw, sh);
    const bounce = Math.abs(Math.sin(performance.now() / 300)) * (sh - 26);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(sx + sw / 2, sy + sh - 12 - bounce, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.font = "bold 10px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("TOONS!", sx + sw / 2, sy + 13);
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(sx, sy + sh);
    ctx.lineTo(sx + sw, sy);
    ctx.lineTo(sx + sw, sy + 10);
    ctx.lineTo(sx + 10, sy + sh);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#222";
  ctx.fillRect(tv.x + tv.w / 2 - 20, tv.y + tv.h, 40, 8);
}

function drawHouse() {
  // Outside-the-house background peeking through (just a neutral color)
  ctx.fillStyle = "#2b2b3a";
  ctx.fillRect(0, 0, W, H);

  const f = house.floor;

  // --- Room zones (row 1: bedrooms + kitchen, row 2: living/dining) ---
  ctx.fillStyle = "#cfe8f5"; // Douglas's room
  ctx.fillRect(30, 30, 225, 200);
  ctx.fillStyle = "#f5dbe8"; // Mom & Dad's room
  ctx.fillRect(255, 30, 225, 200);
  ctx.fillStyle = "#dcefd0"; // Brother's room
  ctx.fillRect(480, 30, 225, 200);
  ctx.fillStyle = "#f7edc6"; // Kitchen
  ctx.fillRect(705, 30, 225, 200);

  ctx.fillStyle = "#d9f0d3"; // Living / dining room
  ctx.fillRect(30, 230, 900, 320);

  // Bathroom nook, tucked under the kitchen, with its own little walls
  ctx.fillStyle = "#d7f0f5";
  ctx.fillRect(790, 230, 140, 120);
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 4;
  ctx.strokeRect(790, 230, 140, 120);

  // Outer walls / outline
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

  // Room labels
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = "12px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Douglas's Room", 142, 220);
  ctx.fillText("Mom & Dad's Room", 367, 220);
  ctx.fillText("Brother's Room", 592, 220);
  ctx.fillText("Kitchen", 817, 220);
  ctx.fillText("Bathroom", 860, 340);
  ctx.fillText("Living Room", 420, 250);

  // --- Furniture ---
  // Douglas's bed
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(50, 55, 150, 130);
  ctx.fillStyle = "#e75c5c";
  ctx.fillRect(60, 65, 130, 90);
  ctx.fillStyle = "#fff";
  ctx.fillRect(65, 70, 120, 22);
  if (!player.awake) {
    ctx.fillStyle = "#333";
    ctx.font = "bold 16px Trebuchet MS";
    ctx.fillText("Zzz...", 215, 100);
  }
  ctx.fillStyle = "#6a4a2a";
  ctx.fillRect(215, 150, 30, 30);

  // Mom & Dad's bed
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(280, 65, 170, 110);
  ctx.fillStyle = "#7a6fd0";
  ctx.fillRect(290, 75, 150, 80);
  ctx.fillStyle = "#fff";
  ctx.fillRect(295, 80, 65, 20);
  ctx.fillRect(370, 80, 65, 20);
  ctx.fillStyle = "#6a4a2a";
  ctx.fillRect(290, 185, 60, 25);

  // Brother's bed
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(505, 65, 140, 110);
  ctx.fillStyle = "#3f8f3f";
  ctx.fillRect(515, 75, 120, 80);
  ctx.fillStyle = "#fff";
  ctx.fillRect(520, 80, 110, 20);
  ctx.fillStyle = "#e08a2a";
  ctx.fillRect(650, 150, 45, 35);
  ctx.strokeStyle = "#8a5a1a";
  ctx.lineWidth = 2;
  ctx.strokeRect(650, 150, 45, 35);

  // Kitchen counter, fridge + table
  ctx.fillStyle = "#b08a5a";
  ctx.fillRect(715, 55, 200, 26);
  ctx.fillStyle = "#dfe6ea";
  ctx.fillRect(715, 95, 45, 120);
  ctx.strokeStyle = "#9aa8b0";
  ctx.lineWidth = 2;
  ctx.strokeRect(715, 95, 45, 120);
  ctx.fillStyle = "#8a6a3a";
  ctx.fillRect(820, 150, 70, 45);
  ctx.fillStyle = "#c9a04a";
  ctx.fillRect(800, 140, 20, 20);
  ctx.fillRect(900, 140, 20, 20);

  // Bathroom sink, mirror + toilet
  ctx.fillStyle = "#bcd8e0";
  ctx.fillRect(815, 240, 60, 20);
  ctx.fillStyle = "#fff";
  ctx.fillRect(815, 270, 60, 28);
  ctx.fillStyle = "#999";
  ctx.fillRect(840, 258, 6, 14);
  ctx.fillStyle = "#fff";
  ctx.fillRect(888, 270, 30, 16);
  ctx.fillRect(890, 290, 26, 30);

  // Living room couch
  ctx.fillStyle = "#6a5acd";
  roundRect(60, 260, 190, 55, 12);
  ctx.fill();

  // TV
  drawTV(house.tv);

  // Dining table
  ctx.fillStyle = "#a5673f";
  ctx.beginPath();
  ctx.ellipse(560, 460, 70, 38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7a5a2a";
  [[490, 460], [630, 460], [560, 415], [560, 505]].forEach(([cx, cy]) => {
    ctx.fillRect(cx - 8, cy - 8, 16, 16);
  });

  // Glow under whichever chore/TV hotspot Douglas can use right now
  if (player.awake) {
    const action = findNearestHouseAction();
    if (action && (action.type === "tv" || action.type === "chore")) {
      const hx = action.type === "tv" ? house.tv.x + house.tv.w / 2 : action.ref.x;
      const hy = action.type === "tv" ? house.tv.y + house.tv.h / 2 : action.ref.y;
      const pulse = 0.35 + Math.sin(performance.now() / 220) * 0.15;
      ctx.save();
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 40, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // NPCs
  house.npcs.forEach((n) => drawCharacter(n.x, n.y, n.facing, n.shirt, n.pants, n.hair, n.walkPhase, n.label));
  drawPeopleSpeech(house.npcs);

  // Player
  if (!player.awake) {
    drawCharacter(player.x, player.y, "down", "#e0763c", "#2a4a7a", "#5a3a1a", 0, null);
    ctx.fillStyle = "#222";
    ctx.font = "16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Press an arrow key (or WASD) to wake up!", W / 2, 44);
  } else {
    drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", player.moving ? player.walkPhase : 0, "Douglas");
    ctx.fillStyle = "#222";
    ctx.font = "16px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Do your morning chores, then head out the front door!", W / 2, 44);
    drawHouseHint();
    drawChoreChecklist();
    if (house.message) drawHouseMessage(house.message.text);
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

function drawBus(x, y, doorOpen, variant) {
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(70, 55, 150, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = variant === "taxi" ? "#f6c945" : "#f4c11e";
  roundRect(-70, -60, 300, 95, 16);
  ctx.fill();
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 4;
  roundRect(-70, -60, 300, 95, 16);
  ctx.stroke();

  if (variant === "taxi") {
    // Checker stripe along the side
    ctx.fillStyle = "#222";
    for (let i = 0; i < 9; i++) {
      if (i % 2 === 0) ctx.fillRect(-70 + i * 30, -12, 30, 10);
    }
    // Roof sign
    ctx.fillStyle = "#222";
    roundRect(50, -84, 60, 22, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("TAXI", 80, -68);
  }

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
const school = {
  kids: [],
  door: { x1: 440, y1: 210, x2: 520, y2: 320 },
  taxi: null,
};

function setupSchool() {
  if (story.fleeing) {
    // Bursting back outside after the monster reveal - a taxi is already on its way
    school.kids = [];
    school.taxi = { x: -260, y: 480, targetX: 610, arrived: false, doorOpen: false, driving: false, callTimer: 0 };
    player.x = 480;
    player.y = 260;
    player.facing = "down";
    return;
  }

  school.kids = [
    makeNPC(300, 460, { x1: 260, y1: 430, x2: 420, y2: 500 }, "#e07bb0", "#f0d040", "#2a2a2a", null, 40, [
      "Hurry, the bell's about to ring!",
      "Last one inside is a rotten egg!",
    ]),
    makeNPC(650, 470, { x1: 600, y1: 430, x2: 760, y2: 500 }, "#5fbf5f", "#3f6fb0", "#5a3a1a", null, 40, [
      "Morning, Douglas!",
      "I heard we have a pop quiz today...",
    ]),
  ];
  player.x = W / 2;
  player.y = 480;
  player.facing = "up";
}

function updateSchool(dt) {
  school.kids.forEach((k) => {
    updateNPC(k, dt);
    updateSpeech(k, dt);
  });
  updatePlayerMovement(dt, { x1: 40, y1: 240, x2: 920, y2: 560 });

  if (!story.fleeing) {
    const d = school.door;
    if (player.x > d.x1 - 25 && player.x < d.x2 + 25 && player.y < d.y2 && player.y > d.y1 - 30) {
      startTransition(STATE.SCHOOL_HALLWAY);
    }
    return;
  }

  // Fleeing: the taxi drives in on its own, no need to wait at a stop
  const t = school.taxi;
  t.callTimer += dt;
  if (t.callTimer > 0.6) t.driving = true;

  if (t.driving && !t.arrived) {
    t.x += (t.targetX - t.x) * Math.min(1, dt * 2.2);
    if (Math.abs(t.targetX - t.x) < 2) {
      t.x = t.targetX;
      t.arrived = true;
      t.doorOpen = true;
    }
  }

  if (t.arrived) {
    const doorX = t.x + 203;
    const doorY = t.y - 15;
    if (Math.hypot(player.x - doorX, player.y - doorY) < 45) {
      startTransition(STATE.TAXI_CUTSCENE);
    }
  }
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

  if (story.fleeing) {
    // Taxi to the rescue
    const t = school.taxi;
    drawBus(t.x, t.y, t.doorOpen, "taxi");
  } else {
    // Kids
    school.kids.forEach((k) => drawCharacter(k.x, k.y, k.facing, k.shirt, k.pants, k.hair, k.walkPhase, null));
    drawPeopleSpeech(school.kids);
  }

  // Player
  drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", player.moving ? player.walkPhase : 0, "Douglas");

  ctx.textAlign = "center";
  if (story.fleeing) {
    ctx.fillStyle = "#c81818";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText(school.taxi.arrived ? "Get in the taxi!" : "Calling a taxi...", W / 2, 30);
  } else {
    ctx.fillStyle = "#222";
    ctx.font = "16px Trebuchet MS";
    ctx.fillText("Walk up to the school doors to go inside", W / 2, 30);
    drawTalkHint();
  }
}

// ---------------------------------------------------------------------
// SCHOOL HALLWAY - a highlighted route leads to the classroom door
// ---------------------------------------------------------------------
const hallway = {
  route: [
    { x: 480, y: 560 },
    { x: 480, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 130 },
  ],
  classroomDoor: { x: 200, y: 120 },
};

function setupHallway() {
  if (story.fleeing) {
    const d = hallway.classroomDoor;
    player.x = d.x;
    player.y = d.y + 70;
    player.facing = "down";
  } else {
    player.x = 480;
    player.y = 560;
    player.facing = "up";
  }
}

function updateHallway(dt) {
  updatePlayerMovement(dt, { x1: 50, y1: 70, x2: 910, y2: 580 });

  if (story.fleeing) {
    const exitPoint = hallway.route[0];
    if (Math.hypot(player.x - exitPoint.x, player.y - exitPoint.y) < 55) {
      startTransition(STATE.SCHOOL);
    }
  } else {
    const d = hallway.classroomDoor;
    if (Math.hypot(player.x - d.x, player.y - d.y) < 55) {
      startTransition(STATE.CLASSROOM);
    }
  }
}

function drawHallway() {
  // Floor
  ctx.fillStyle = "#e8dcc0";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let gy = 0; gy < H; gy += 60) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }

  // Lockers along the right wall for flavor
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#6fa8dc" : "#4a86c8";
    ctx.fillRect(720 + (i % 4) * 44, 400 + Math.floor(i / 4) * 90, 36, 80);
    ctx.strokeStyle = "#2a4a6a";
    ctx.strokeRect(720 + (i % 4) * 44, 400 + Math.floor(i / 4) * 90, 36, 80);
  }

  // Glowing highlighted path to the classroom (turns red while fleeing)
  const pulse = 0.55 + Math.sin(performance.now() / 250) * 0.25;
  const glowRGB = story.fleeing ? "255, 60, 60" : "255, 210, 60";
  ctx.save();
  ctx.strokeStyle = `rgba(${glowRGB}, ${pulse})`;
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  hallway.route.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  hallway.route.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();

  // Classroom door
  const d = hallway.classroomDoor;
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(d.x - 35, d.y - 45, 70, 90);
  ctx.fillStyle = "#fff";
  roundRect(d.x - 55, d.y - 78, 110, 26, 6);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.font = "bold 13px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Douglas's Classroom", d.x, d.y - 60);

  // Player
  drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", player.moving ? player.walkPhase : 0, "Douglas");

  ctx.font = "16px Trebuchet MS";
  ctx.textAlign = "center";
  if (story.fleeing) {
    ctx.fillStyle = "#c81818";
    ctx.font = "bold 18px Trebuchet MS";
    ctx.fillText("RUN! Get back outside!", W / 2, 30);
  } else {
    ctx.fillStyle = "#222";
    ctx.fillText("Follow the glowing path to your classroom!", W / 2, 30);
  }
}

// ---------------------------------------------------------------------
// CLASSROOM - find the one open desk and sit down
// ---------------------------------------------------------------------
const QUIZ_DELAY = 1.4; // seconds after sitting down before the teacher speaks
const QUIZ_DURATION = 3.0; // how long the pop quiz line is shown
const TRANSFORM_DURATION = 1.4; // how long the transformation flash lasts

const classroom = {
  teacher: null,
  classmates: [],
  emptyDesk: null,
  exit: { x: 480, y: 590 },
  seated: false,
  phase: "seeking", // seeking -> seatedWait -> quiz -> transforming -> fleeing
  sinceSeated: 0,
  shake: 0,
};

function buildDeskGrid() {
  const desks = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      desks.push({ x: 340 + col * 150, y: 280 + row * 110 });
    }
  }
  return desks;
}

function setupClassroom() {
  const desks = buildDeskGrid();
  const emptyIndex = 4; // the middle desk stays open for Douglas
  const shirts = ["#e07bb0", "#5fbf5f", "#f0a030", "#9a6fd0", "#4ac0c0", "#e0763c", "#c94a6a", "#7aa8e0"];
  const classmateLines = [
    "Psst, did you study for the quiz?",
    "Nice backpack!",
    "Sit here, next to me!",
    "I hope it's pizza day at lunch.",
    "Did you finish the homework? ...Me neither.",
  ];

  classroom.classmates = desks
    .filter((_, i) => i !== emptyIndex)
    .map((desk, i) =>
      makeStaticPerson(desk.x, desk.y, shirts[i % shirts.length], "#3a3a3a", "#3a2a1a", null, [
        classmateLines[i % classmateLines.length],
      ])
    );

  classroom.emptyDesk = desks[emptyIndex];

  classroom.teacher = makeStaticPerson(480, 170, "#4a8a4a", "#2a2a2a", "#3a2a1a", "Teacher", [
    "Good morning, Douglas! Glad you could join us.",
    "Please take your seat, we're about to start.",
    "I hope you did your homework...",
    "Class, we have a pop quiz today!",
  ]);
  classroom.teacher.speechText = "Good morning, Douglas! Glad you could join us.";
  classroom.teacher.speechTimer = 4.5;
  classroom.teacher.isMonster = false;

  classroom.seated = false;
  classroom.phase = "seeking";
  classroom.sinceSeated = 0;
  classroom.shake = 0;
  player.x = 480;
  player.y = 560;
  player.facing = "up";
}

function updateClassroom(dt) {
  updateSpeech(classroom.teacher, dt);
  classroom.classmates.forEach((c) => updateSpeech(c, dt));
  if (classroom.shake > 0) classroom.shake = Math.max(0, classroom.shake - dt);

  if (!classroom.seated) {
    updatePlayerMovement(dt, { x1: 60, y1: 150, x2: 900, y2: 580 });

    const desk = classroom.emptyDesk;
    if (Math.hypot(player.x - desk.x, player.y - desk.y) < 30) {
      classroom.seated = true;
      classroom.phase = "seatedWait";
      classroom.sinceSeated = 0;
      player.x = desk.x;
      player.y = desk.y + 4;
      player.facing = "up";
    }
    return;
  }

  // Scripted pop-quiz -> monster reveal sequence
  if (classroom.phase !== "fleeing") {
    classroom.sinceSeated += dt;
    if (classroom.phase === "seatedWait" && classroom.sinceSeated > QUIZ_DELAY) {
      classroom.phase = "quiz";
      classroom.teacher.speechText = "Class, we have a pop quiz today!";
      classroom.teacher.speechTimer = QUIZ_DURATION;
    } else if (classroom.phase === "quiz" && classroom.sinceSeated > QUIZ_DELAY + QUIZ_DURATION) {
      classroom.phase = "transforming";
      classroom.teacher.isMonster = true;
      classroom.teacher.speechText = null;
      classroom.shake = 0.6;
    } else if (
      classroom.phase === "transforming" &&
      classroom.sinceSeated > QUIZ_DELAY + QUIZ_DURATION + TRANSFORM_DURATION
    ) {
      classroom.phase = "fleeing";
    }
    return;
  }

  // Fleeing: Douglas is back on his feet and needs to get out
  updatePlayerMovement(dt, { x1: 60, y1: 150, x2: 900, y2: 580 });
  const exit = classroom.exit;
  if (Math.hypot(player.x - exit.x, player.y - exit.y) < 50) {
    story.fleeing = true;
    startTransition(STATE.SCHOOL_HALLWAY);
  }
}

function drawDeskAndChair(x, y) {
  ctx.fillStyle = "#c9a04a";
  roundRect(x - 34, y - 6, 68, 28, 4);
  ctx.fill();
  ctx.strokeStyle = "#8a6a2a";
  ctx.lineWidth = 2;
  roundRect(x - 34, y - 6, 68, 28, 4);
  ctx.stroke();
  ctx.fillStyle = "#7a5a2a";
  ctx.fillRect(x - 14, y + 22, 28, 8);
}

function drawClassroom() {
  ctx.save();
  if (classroom.shake > 0) {
    const mag = classroom.shake * 8;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  // Floor
  ctx.fillStyle = "#f3e6c8";
  ctx.fillRect(0, 0, W, H);

  // Exit door back to the hallway
  const exit = classroom.exit;
  const exitGlow = classroom.phase === "fleeing";
  if (exitGlow) {
    const pulse = 0.4 + Math.sin(performance.now() / 200) * 0.25;
    ctx.fillStyle = `rgba(255, 60, 60, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(exit.x, exit.y - 20, 55, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(exit.x - 35, exit.y - 45, 70, 60);

  // Front wall + chalkboard
  ctx.fillStyle = "#e8dcc0";
  ctx.fillRect(0, 0, W, 70);
  ctx.fillStyle = "#2f5c3f";
  roundRect(340, 15, 280, 45, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "18px 'Comic Sans MS', Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Welcome, Class!", 480, 43);

  // Desks + classmates
  classroom.classmates.forEach((c) => {
    drawDeskAndChair(c.x, c.y);
    drawCharacter(c.x, c.y, c.facing, c.shirt, c.pants, c.hair, c.walkPhase, c.label);
  });
  drawPeopleSpeech(classroom.classmates);

  // The one open desk, highlighted so it's easy to spot
  if (!classroom.seated) {
    const d = classroom.emptyDesk;
    const pulse = 0.4 + Math.sin(performance.now() / 220) * 0.25;
    ctx.save();
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + 10, 46, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawDeskAndChair(d.x, d.y);
    ctx.fillStyle = "#8a6a10";
    ctx.font = "bold 13px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Your desk!", d.x, d.y - 22);
  } else {
    drawDeskAndChair(classroom.emptyDesk.x, classroom.emptyDesk.y);
  }

  // Teacher (or monster!)
  if (classroom.teacher.isMonster) {
    drawMonster(classroom.teacher.x, classroom.teacher.y, performance.now() / 150);
  } else {
    drawCharacter(classroom.teacher.x, classroom.teacher.y, classroom.teacher.facing, classroom.teacher.shirt, classroom.teacher.pants, classroom.teacher.hair, 0, classroom.teacher.label);
  }
  if (classroom.teacher.speechText) drawSpeechBubble(classroom.teacher.x, classroom.teacher.y - 46, classroom.teacher.speechText);

  // Player
  drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", player.moving ? player.walkPhase : 0, "Douglas");

  ctx.textAlign = "center";
  if (!classroom.seated) {
    ctx.fillStyle = "#222";
    ctx.font = "16px Trebuchet MS";
    ctx.fillText("Find your open desk and take a seat", W / 2, H - 16);
    drawTalkHint();
  } else if (classroom.phase === "transforming") {
    ctx.fillStyle = `rgba(200, 20, 20, ${0.6 + Math.sin(performance.now() / 80) * 0.4})`;
    ctx.font = "bold 42px Trebuchet MS";
    ctx.fillText("RAAWR!!", W / 2, 260);
  } else if (classroom.phase === "fleeing") {
    ctx.fillStyle = "#c81818";
    ctx.font = "bold 22px Trebuchet MS";
    ctx.fillText("RUN! Get out of the classroom!", W / 2, H - 16);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------
// TAXI CUTSCENE: escaping into the desert
// ---------------------------------------------------------------------
const taxiCutscene = {
  t: 0,
  duration: 4.5,
  scenery: [],
};

function setupTaxiCutscene() {
  taxiCutscene.t = 0;
  taxiCutscene.scenery = [];
  for (let i = 0; i < 8; i++) {
    taxiCutscene.scenery.push({
      x: Math.random() * W,
      type: Math.random() < 0.5 ? "cactus" : "mesa",
      scale: 0.7 + Math.random() * 0.6,
    });
  }
}

function updateTaxiCutscene(dt) {
  taxiCutscene.t += dt;
  const speed = 260 * dt;
  taxiCutscene.scenery.forEach((s) => {
    s.x -= speed;
    if (s.x < -80) s.x += W + 160;
  });
  if (taxiCutscene.t >= taxiCutscene.duration) {
    startTransition(STATE.DESERT_END);
  }
}

function drawTaxiCutscene() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
  skyGrad.addColorStop(0, "#f0a860");
  skyGrad.addColorStop(1, "#ffe0b0");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, 400);

  // Sun
  ctx.fillStyle = "#ffcf5c";
  ctx.beginPath();
  ctx.arc(760, 110, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d9a55c";
  ctx.fillRect(0, 400, W, 200);

  // Road
  ctx.fillStyle = "#7a6248";
  ctx.fillRect(0, 470, W, 130);
  ctx.strokeStyle = "#f0d040";
  ctx.setLineDash([40, 25]);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 535);
  ctx.lineTo(W, 535);
  ctx.stroke();
  ctx.setLineDash([]);

  // Scrolling desert scenery
  taxiCutscene.scenery.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, 400);
    ctx.scale(s.scale, s.scale);
    if (s.type === "cactus") {
      ctx.fillStyle = "#4a8f4a";
      ctx.fillRect(-6, -50, 12, 50);
      ctx.fillRect(-20, -34, 14, 10);
      ctx.fillRect(6, -40, 14, 10);
    } else {
      ctx.fillStyle = "#b5764a";
      ctx.beginPath();
      ctx.moveTo(-40, 0);
      ctx.lineTo(-20, -40);
      ctx.lineTo(20, -40);
      ctx.lineTo(40, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });

  // Taxi (big, foreground, stays centered while the desert scrolls past)
  drawBus(W / 2 - 90, 470, false, "taxi");

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "20px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Douglas makes his great escape...", W / 2, 60);
  ctx.font = "14px Trebuchet MS";
  ctx.fillText("(press SPACE to skip)", W / 2, 86);
}

// ---------------------------------------------------------------------
// DESERT END - the taxi drives off, leaving Douglas behind
// ---------------------------------------------------------------------
const desertEnd = {
  taxiX: 480,
};

function setupDesertEnd() {
  desertEnd.taxiX = 480;
  player.x = 480;
  player.y = 480;
  player.facing = "down";
}

function updateDesertEnd(dt) {
  if (desertEnd.taxiX < W + 200) {
    desertEnd.taxiX += 140 * dt;
  }
}

function drawDesertEnd() {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, "#f0a860");
  skyGrad.addColorStop(1, "#ffe0b0");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffcf5c";
  ctx.beginPath();
  ctx.arc(820, 110, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d9a55c";
  ctx.fillRect(0, 420, W, 180);

  // A couple of cacti for flavor
  ctx.fillStyle = "#4a8f4a";
  ctx.fillRect(120, 400, 16, 60);
  ctx.fillRect(100, 420, 18, 14);
  ctx.fillRect(640, 410, 14, 50);
  ctx.fillRect(654, 424, 16, 12);

  // Taxi driving away into the distance
  const shrink = Math.max(0.15, 1 - desertEnd.taxiX / (W + 350));
  ctx.save();
  ctx.translate(desertEnd.taxiX, 460);
  ctx.scale(shrink, shrink);
  drawBus(0, 0, false, "taxi");
  ctx.restore();

  // Douglas, left behind
  drawCharacter(player.x, player.y, player.facing, "#e0763c", "#2a4a7a", "#5a3a1a", 0, "Douglas");

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(W / 2 - 270, 60, 540, 100, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 22px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("Douglas escaped the monster... into the desert?!", W / 2, 100);
  ctx.font = "16px Trebuchet MS";
  ctx.fillText("Thanks for playing! Press R to start again.", W / 2, 130);
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
  else if (state === STATE.SCHOOL_HALLWAY) setupHallway();
  else if (state === STATE.CLASSROOM) setupClassroom();
  else if (state === STATE.TAXI_CUTSCENE) setupTaxiCutscene();
  else if (state === STATE.DESERT_END) setupDesertEnd();
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
    else if (game.state === STATE.SCHOOL_HALLWAY) updateHallway(dt);
    else if (game.state === STATE.CLASSROOM) updateClassroom(dt);
    else if (game.state === STATE.TAXI_CUTSCENE) updateTaxiCutscene(dt);
    else if (game.state === STATE.DESERT_END) updateDesertEnd(dt);
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
  else if (game.state === STATE.SCHOOL_HALLWAY) drawHallway();
  else if (game.state === STATE.CLASSROOM) drawClassroom();
  else if (game.state === STATE.TAXI_CUTSCENE) drawTaxiCutscene();
  else if (game.state === STATE.DESERT_END) drawDesertEnd();
  drawTransition();
}

requestAnimationFrame(loop);
