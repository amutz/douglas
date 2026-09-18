/* game.js
   Sets everything up: the canvas, the keys, and the loop that draws a new
   picture about 60 times a second. Also handles moving from one place to
   the next (the house -> the yard -> the bus -> school).
*/

var stage = document.getElementById('stage');
var canvas = document.getElementById('game');
var ctx = canvas.getContext('2d');

var objectiveEl = document.getElementById('objective');
var promptEl = document.getElementById('prompt');
var captionEl = document.getElementById('caption');
var barsEl = document.getElementById('bars');
var titleEl = document.getElementById('title');
var endcardEl = document.getElementById('endcard');
var fadeEl = document.getElementById('fade');
var shoutEl = document.getElementById('shout');

/* ---- the canvas fills the window, and stays sharp on good screens ---- */
function resize() {
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  view.w = stage.clientWidth;
  view.h = stage.clientHeight;
  canvas.width = Math.round(view.w * dpr);
  canvas.height = Math.round(view.h * dpr);
  canvas.style.width = view.w + 'px';
  canvas.style.height = view.h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  applyZoom();
}

/* Small screens get zoomed out a bit so you can still see what is going on. */
function applyZoom() {
  // The angled view is much wider than it is tall, so the width of the
  // window is what decides how far we need to zoom out.
  var fit = Math.max(0.45, Math.min(1, view.w / 820));
  camera.zoom = (game.sceneZoom || 1) * fit;
}

window.addEventListener('resize', resize);

/* ---- keyboard ------------------------------------------------------- */
var keys = {};
var interactPressed = false;

window.addEventListener('keydown', function (e) {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') interactPressed = true;
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) e.preventDefault();
});
window.addEventListener('keyup', function (e) {
  keys[e.key.toLowerCase()] = false;
});

function held() {
  var up = keys['w'] || keys['arrowup'];
  var down = keys['s'] || keys['arrowdown'];
  var left = keys['a'] || keys['arrowleft'];
  var right = keys['d'] || keys['arrowright'];
  var x = 0, y = 0;
  // On screen, "up" is away from us, which means less x AND less y.
  if (up) { x -= 1; y -= 1; }
  if (down) { x += 1; y += 1; }
  if (left) { x -= 1; y += 1; }
  if (right) { x += 1; y -= 1; }
  return { x: x, y: y };
}

/* ---- touch: drag on the left side to walk, tap the right side to act -- */
var touch = { id: null, startX: 0, startY: 0, x: 0, y: 0 };

canvas.addEventListener('pointerdown', function (e) {
  if (e.clientX < view.w * 0.55 && touch.id === null) {
    touch.id = e.pointerId;
    touch.startX = touch.x = e.clientX;
    touch.startY = touch.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  } else {
    interactPressed = true;
  }
});
canvas.addEventListener('pointermove', function (e) {
  if (e.pointerId === touch.id) { touch.x = e.clientX; touch.y = e.clientY; }
});
function endTouch(e) { if (e.pointerId === touch.id) touch.id = null; }
canvas.addEventListener('pointerup', endTouch);
canvas.addEventListener('pointercancel', endTouch);

function touchDirection() {
  if (touch.id === null) return null;
  var dx = touch.x - touch.startX, dy = touch.y - touch.startY;
  var len = Math.sqrt(dx * dx + dy * dy);
  if (len < 14) return null;
  // turn a screen direction back into a direction on the ground
  var a = dx / ISO_X, b = dy / ISO_Y;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

promptEl.addEventListener('click', function () { interactPressed = true; });

/* ================================================================== */
/* The game itself                                                     */
/* ================================================================== */

var game = {
  douglas: new Person({
    x: 0, y: 0, height: 86, speed: 165,
    skin: '#f0c39a', hair: '#6b4226', shirt: '#4a90d9',
    pants: '#3f4a63', shoes: '#40393a', backpack: '#c8543a'
  }),
  scene: null,
  sceneZoom: 1,
  lastDt: 0,
  running: false,
  shake: 0,
  // Remembers that the teacher turned into a monster, so the school,
  // hallway and classroom know Douglas is running away, not arriving.
  story: { fleeing: false }
};

game.setObjective = function (text) {
  if (!text) { objectiveEl.classList.add('hidden'); return; }
  objectiveEl.textContent = text;
  objectiveEl.classList.remove('hidden');
};

var pendingPrompt = null;
game.setPrompt = function (label, action) {
  pendingPrompt = { label: label, action: action };
};

game.showCaption = function (text) {
  if (!text) { captionEl.classList.add('hidden'); return; }
  captionEl.textContent = text;
  captionEl.classList.remove('hidden');
};

game.showBars = function (on) {
  barsEl.classList.toggle('hidden', !on);
};

/* Big shouty text across the middle of the screen. */
var shoutTimer = 0;
game.showShout = function (text, seconds) {
  if (!text) { shoutEl.classList.add('hidden'); shoutTimer = 0; return; }
  shoutEl.textContent = text;
  shoutEl.classList.remove('hidden');
  shoutTimer = seconds || 1.5;
};

/* Rattles the screen, for when something startling happens. */
game.shakeScreen = function (seconds) {
  game.shake = seconds;
};

/* ---- moving from one place to the next, with a black fade ---------- */
var fade = { amount: 0, direction: 0, nextScene: null };

game.goTo = function (name) {
  if (fade.direction !== 0) return;
  fade.direction = 1;
  fade.nextScene = name;
};

function startScene(name) {
  // Douglas always starts a new place standing up, on his feet, visible.
  game.douglas.z = 0;
  game.douglas.sitting = false;
  game.douglas.visible = true;
  game.scene = Scenes[name](game);
  game.scene.world.people.push(game.douglas);
  game.showCaption('');
  game.showBars(!!game.scene.cutscene);
  game.scene.enter(game);
  game.sceneZoom = camera.zoom;
  applyZoom();
}

game.finish = function () {
  game.running = false;
  game.showShout('');
  promptEl.classList.add('hidden');
  objectiveEl.classList.add('hidden');
  endcardEl.classList.remove('hidden');
};

/* ---- one step of the game ------------------------------------------ */
function update(dt) {
  // the black fade between places
  if (fade.direction === 1) {
    fade.amount = Math.min(1, fade.amount + dt * 2.6);
    if (fade.amount >= 1) {
      startScene(fade.nextScene);
      fade.direction = -1;
    }
  } else if (fade.direction === -1) {
    fade.amount = Math.max(0, fade.amount - dt * 2.2);
    if (fade.amount <= 0) fade.direction = 0;
  }
  fadeEl.style.opacity = fade.amount;

  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt);
  if (shoutTimer > 0) {
    shoutTimer -= dt;
    if (shoutTimer <= 0) shoutEl.classList.add('hidden');
  }

  if (!game.running || !game.scene) { interactPressed = false; return; }

  var scene = game.scene;
  var world = scene.world;
  var douglas = game.douglas;
  pendingPrompt = null;

  // --- walking ---
  var moving = false;
  if (scene.allowMove && fade.direction === 0) {
    var dir = touchDirection() || held();
    var len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    if (len > 0.001) {
      var nx = dir.x / len, ny = dir.y / len;
      douglas.moveBy(nx * douglas.speed * dt, ny * douglas.speed * dt, world.solids);
      clampToBounds(douglas, world.bounds);
      pushApart(douglas, world.people);
      douglas.faceX = nx;
      douglas.faceY = ny;
      moving = true;
    }
  }
  douglas.moving = moving;
  if (moving) douglas.walkTime += dt * 10;
  else douglas.walkTime *= Math.max(0, 1 - dt * 8);
  douglas.tickSpeech(dt);

  // --- the family and other kids ---
  var someoneTalking = false;
  for (var i = 0; i < world.people.length; i++) {
    if (world.people[i].sayTimer > 0) someoneTalking = true;
  }

  for (i = 0; i < world.people.length; i++) {
    var p = world.people[i];
    if (p === douglas) continue;
    p.update(dt, world.solids);

    // They greet you when you walk past -- but only one at a time, so a
    // room full of people doesn't shout all at once.
    p.chatCooldown -= dt;
    var dx = p.x - douglas.x, dy = p.y - douglas.y;
    if (!someoneTalking && p.chatCooldown <= 0 && dx * dx + dy * dy < 190 * 190) {
      p.nextLine();
      p.chatCooldown = 10;
      someoneTalking = true;
    }
  }

  scene.update(dt, game);

  // --- is Douglas standing somewhere he can do something? ---
  if (scene.allowMove) {
    for (var s = 0; s < world.spots.length; s++) {
      var spot = world.spots[s];
      if (spot.active === false) continue;
      var sx = spot.x - douglas.x, sy = spot.y - douglas.y;
      if (sx * sx + sy * sy < spot.radius * spot.radius) {
        game.setPrompt(spot.label, spot.use);
        break;
      }
    }
  }

  // --- showing and using the prompt ---
  if (pendingPrompt && fade.direction === 0) {
    if (promptEl.textContent !== pendingPrompt.label) promptEl.textContent = pendingPrompt.label;
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }

  if (interactPressed) {
    if (scene.cutscene && scene.skip) scene.skip(game);
    else if (pendingPrompt && fade.direction === 0) pendingPrompt.action(game);
  }
  interactPressed = false;
}

function render() {
  updateCamera();

  var shaking = game.shake > 0;
  if (shaking) {
    var mag = game.shake * 12;
    ctx.save();
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  if (game.scene) renderWorld(ctx, game.scene.world);
  else { ctx.fillStyle = '#332f3d'; ctx.fillRect(0, 0, view.w, view.h); }

  if (shaking) ctx.restore();

  if (touch.id !== null) drawThumbStick();
}

/* A ring and a dot showing where a finger is dragging. */
function drawThumbStick() {
  var dx = touch.x - touch.startX, dy = touch.y - touch.startY;
  var len = Math.sqrt(dx * dx + dy * dy);
  if (len > 46) { dx = dx / len * 46; dy = dy / len * 46; }
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(touch.startX, touch.startY, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  circle(ctx, touch.startX + dx, touch.startY + dy, 20, '#ffffff');
  ctx.restore();
}

var lastTime = 0;
function frame(now) {
  var dt = Math.min(0.05, (now - lastTime) / 1000) || 0;
  lastTime = now;
  game.lastDt = dt;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

/* ---- starting and restarting ---------------------------------------- */
function beginGame(sceneName) {
  titleEl.classList.add('hidden');
  endcardEl.classList.add('hidden');
  game.showShout('');
  game.shake = 0;
  game.story.fleeing = false;
  game.running = true;
  fade.amount = 1;
  fade.direction = -1;
  startScene(sceneName || 'house');
}

document.getElementById('startBtn').addEventListener('click', function () { beginGame('house'); });
document.getElementById('againBtn').addEventListener('click', function () { beginGame('house'); });

resize();
requestAnimationFrame(frame);

// Handy while building the game: index.html#yard jumps straight to a place.
var jump = location.hash.replace('#', '');
if (jump && Scenes[jump]) beginGame(jump);
