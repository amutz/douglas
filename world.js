/* world.js
   A "world" is one place you can walk around in: the house, the front yard,
   the street, the school. It holds the flat ground patches, the things
   standing on it, the people, and the invisible boxes you bump into.
*/

function makeWorld() {
  return {
    ground: [],      // flat patches, drawn first
    props: [],       // things with height, drawn back to front
    solids: [],      // boxes you cannot walk through
    people: [],
    spots: [],       // places where you can press E to do something
    bounds: { x1: -9999, y1: -9999, x2: 9999, y2: 9999 },
    sky: '#8fc95f'
  };
}

function addGroundPatch(world, x, y, w, d, color, z) {
  world.ground.push({ x: x, y: y, w: w, d: d, color: color, z: z || 0 });
}

/* Scatters tufts of grass and little flowers so the lawn isn't one flat
   colour. Call it before the roads and paths are added, so they go on top. */
function addGrassDetail(world, x1, y1, x2, y2, count, seed) {
  var s = seed || 3;
  function next() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
  for (var i = 0; i < count; i++) {
    var x = x1 + next() * (x2 - x1);
    var y = y1 + next() * (y2 - y1);
    var k = next();
    if (k < 0.7) addGroundPatch(world, x, y, 30 + k * 50, 22 + k * 30, '#84c054');
    else addGroundPatch(world, x, y, 9, 9, k < 0.85 ? '#f4e87c' : '#f4f2ea');
  }
}

/* A floor made of squared-off tiles, in two shades. */
function addTiledFloor(world, x, y, w, d, colorA, colorB, tile) {
  tile = tile || 60;
  for (var ty = 0; ty < d; ty += tile) {
    for (var tx = 0; tx < w; tx += tile) {
      var even = ((tx / tile) + (ty / tile)) % 2 === 0;
      addGroundPatch(world, x + tx, y + ty,
        Math.min(tile, w - tx), Math.min(tile, d - ty), even ? colorA : colorB);
    }
  }
}

/* A glowing line along the floor showing where to go. */
function drawGlowPath(ctx, route, time, rgb) {
  var pulse = 0.52 + Math.sin(time * 4) * 0.2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(' + (rgb || '255, 210, 60') + ', ' + pulse.toFixed(2) + ')';
  ctx.lineWidth = 26 * camera.zoom;
  ctx.beginPath();
  for (var i = 0; i < route.length; i++) {
    var p = toScreen(route[i].x, route[i].y, 0);
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 5 * camera.zoom;
  ctx.stroke();
  ctx.restore();
}

function addSolid(world, x, y, w, d) {
  world.solids.push({ x: x, y: y, w: w, d: d });
}

/* Is this person hidden behind the block? If so the block is drawn
   see-through, so you can still see who is in the room. */
function hiddenBehind(b, who) {
  if (who.visible === false) return false;
  if (who.x + who.y >= b.x + b.w / 2 + b.y + b.d / 2) return false;  // person is in front

  var top = (b.z || 0) + b.h;
  var corners = [
    toScreen(b.x, b.y, top), toScreen(b.x + b.w, b.y, top),
    toScreen(b.x + b.w, b.y + b.d, top), toScreen(b.x, b.y + b.d, top),
    toScreen(b.x, b.y + b.d, b.z || 0), toScreen(b.x + b.w, b.y + b.d, b.z || 0)
  ];
  var minX = corners[0].x, maxX = minX, minY = corners[0].y, maxY = minY;
  for (var i = 1; i < corners.length; i++) {
    minX = Math.min(minX, corners[i].x); maxX = Math.max(maxX, corners[i].x);
    minY = Math.min(minY, corners[i].y); maxY = Math.max(maxY, corners[i].y);
  }

  var p = toScreen(who.x, who.y, 0);
  var headY = p.y - (who.height || 62) * camera.zoom;
  if (p.x < minX - 4 || p.x > maxX + 4) return false;
  if (p.y < minY || headY > maxY) return false;
  return true;
}

/* Walls fade if anybody at all is standing behind them. */
function blockAlpha(b, people) {
  for (var i = 0; i < people.length; i++) {
    if (hiddenBehind(b, people[i])) return 0.3;
  }
  return 1;
}

/* Put a block in the world. Set solid:false for rugs and decorations. */
function addBlock(world, o) {
  var b = {
    x: o.x, y: o.y, z: o.z || 0, w: o.w, d: o.d, h: o.h,
    color: o.color, topColor: o.topColor,
    skipFront: o.skipFront, skipRight: o.skipRight
  };
  var canFade = o.fade !== false && b.h >= 55;

  world.props.push({
    cx: b.x + b.w / 2, cy: b.y + b.d / 2,
    depth: b.x + b.w / 2 + b.y + b.d / 2 + (o.depthNudge || 0),
    draw: function (ctx) {
      var a = canFade ? blockAlpha(b, world.people) : 1;
      if (a < 1) {
        ctx.save();
        ctx.globalAlpha = a;
        drawBlock(ctx, b);
        ctx.restore();
      } else {
        drawBlock(ctx, b);
      }
    }
  });

  if (o.solid !== false) addSolid(world, b.x, b.y, b.w, b.d);
  return b;
}

/* Long walls get chopped into short pieces, otherwise they draw on top of
   things that are really standing in front of them. */
function addWall(world, x, y, w, d, h, color) {
  var pieces = Math.max(1, Math.ceil(Math.max(w, d) / 70));
  for (var i = 0; i < pieces; i++) {
    var last = (i === pieces - 1);
    if (w >= d) {
      addBlock(world, {
        x: x + (w / pieces) * i, y: y, w: w / pieces, d: d, h: h, color: color,
        skipRight: !last
      });
    } else {
      addBlock(world, {
        x: x, y: y + (d / pieces) * i, w: w, d: d / pieces, h: h, color: color,
        skipFront: !last
      });
    }
  }
}

/* Anything drawn by hand: pass the spot it sits on and a draw function. */
function addCustom(world, x, y, draw, depthNudge) {
  world.props.push({
    cx: x, cy: y,
    depth: x + y + (depthNudge || 0),
    draw: draw
  });
}

function addTree(world, x, y, size, leafColor) {
  addCustom(world, x, y, function (ctx) { drawTree(ctx, x, y, size, leafColor); });
  addSolid(world, x - 14 * (size || 1), y - 14 * (size || 1), 28 * (size || 1), 28 * (size || 1));
}

function addSpot(world, o) {
  world.spots.push(o);   // { x, y, radius, label, use() }
  return o;
}

/* ------------------------------------------------------------------ */
/* Bigger things that show up in more than one place                   */
/* ------------------------------------------------------------------ */

/* A house seen from outside: walls, a sloped roof, a door and windows. */
function drawHouseOutside(ctx, o) {
  var wallColor = o.color || '#ecd9b8';
  var h = o.h || 200;
  drawBlock(ctx, { x: o.x, y: o.y, w: o.w, d: o.d, h: h, color: wallColor });

  var midX = o.x + o.w / 2;
  var yFront = o.y + o.d;

  // windows on the side facing us
  drawPanelY(ctx, yFront, o.x + o.w * 0.12, o.x + o.w * 0.28, h * 0.42, h * 0.78, '#9fd2e6');
  drawPanelY(ctx, yFront, o.x + o.w * 0.72, o.x + o.w * 0.88, h * 0.42, h * 0.78, '#9fd2e6');
  // a window on the right-hand side
  drawPanelX(ctx, o.x + o.w, o.y + o.d * 0.25, o.y + o.d * 0.45, h * 0.42, h * 0.78, shade('#9fd2e6', -0.15));

  if (o.door !== false) {
    drawPanelY(ctx, yFront, midX - 42, midX + 42, 0, h * 0.62, '#7a4f31');
    drawPanelY(ctx, yFront, midX - 34, midX + 34, h * 0.05, h * 0.56, '#96633d');
    circle(ctx, toScreen(midX + 24, yFront, h * 0.3).x, toScreen(midX + 24, yFront, h * 0.3).y, 3 * camera.zoom, '#e8d08a');
  }

  drawRoof(ctx, o.x - 16, o.y - 16, o.w + 32, o.d + 32, h, o.roofH || 105, o.roofColor || '#b5604a');
}

/* The school bus. It always points north (away from us) so we can see the
   door on its right-hand side. */
function drawBus(ctx, bus) {
  var x = bus.x, y = bus.y;
  var w = 110, d = 320;
  var yellow = '#f4c23c';

  drawShadow(ctx, x + w / 2, y + d / 2, 90, 0.16);

  // wheels
  drawBlock(ctx, { x: x + 4, y: y + 40, w: w - 8, d: 44, h: 30, color: '#2e2b30' });
  drawBlock(ctx, { x: x + 4, y: y + d - 90, w: w - 8, d: 44, h: 30, color: '#2e2b30' });

  // body
  drawBlock(ctx, { x: x, y: y, w: w, d: d, h: 150, z: 24, color: yellow });
  // black stripe
  drawPanelX(ctx, x + w, y, y + d, 74, 88, '#33302f');
  drawPanelY(ctx, y + d, x, x + w, 74, 88, '#33302f');

  // windows down the side we can see
  for (var i = 0; i < 5; i++) {
    var y1 = y + 42 + i * 52;
    drawPanelX(ctx, x + w, y1, y1 + 38, 104, 156, '#bfe2ee');
  }
  // back window
  drawPanelY(ctx, y + d, x + 26, x + w - 26, 106, 156, '#bfe2ee');
  // tail lights
  drawPanelY(ctx, y + d, x + 8, x + 22, 48, 68, '#d8452f');
  drawPanelY(ctx, y + d, x + w - 22, x + w - 8, 48, 68, '#d8452f');

  // the door, which slides open when it stops
  var open = bus.doorOpen || 0;
  var dy1 = y + d - 116, dy2 = dy1 + 68;
  drawPanelX(ctx, x + w, dy1, dy2, 24, 156, '#3c3833');      // the doorway
  if (open < 1) {
    var leaf = ((dy2 - dy1) / 2) * (1 - open);               // two folding halves
    drawPanelX(ctx, x + w, dy1, dy1 + leaf, 24, 156, '#d9a92e');
    drawPanelX(ctx, x + w, dy2 - leaf, dy2, 24, 156, '#d9a92e');
    drawPanelX(ctx, x + w, dy1 + leaf * 0.24, dy1 + leaf * 0.76, 62, 140, '#bfe2ee');
    drawPanelX(ctx, x + w, dy2 - leaf * 0.76, dy2 - leaf * 0.24, 62, 140, '#bfe2ee');
    drawPanelX(ctx, x + w, dy1 + leaf - 2, dy1 + leaf + 2, 24, 156, '#3c3833');   // the join
  }

  // "SCHOOL BUS" on the side
  var a = toScreen(x + w, y + 230, 96);
  var b = toScreen(x + w, y + 150, 96);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
  ctx.fillStyle = '#33302f';
  ctx.font = 'bold ' + Math.round(11 * camera.zoom) + 'px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCHOOL BUS', 0, 0);
  ctx.restore();
}

/* A plain car for the streets. dir is 'north' or 'south'. */
function drawCar(ctx, x, y, color, dir) {
  var w = 80, d = 180;
  drawShadow(ctx, x + w / 2, y + d / 2, 48, 0.15);
  drawBlock(ctx, { x: x + 6, y: y + 24, w: w - 12, d: 34, h: 18, color: '#2e2b30' });
  drawBlock(ctx, { x: x + 6, y: y + d - 58, w: w - 12, d: 34, h: 18, color: '#2e2b30' });
  drawBlock(ctx, { x: x, y: y, w: w, d: d, h: 46, z: 14, color: color });
  drawBlock(ctx, { x: x + 8, y: y + 42, w: w - 16, d: d - 90, h: 32, z: 60, color: shade(color, -0.12) });
  drawPanelX(ctx, x + w - 8, y + 50, y + d - 56, 66, 88, '#c6e3ed');
  var back = (dir === 'south') ? y : y + d;
  drawPanelY(ctx, back, x + 6, x + 24, 24, 40, dir === 'south' ? '#fff3c4' : '#d8452f');
  drawPanelY(ctx, back, x + w - 24, x + w - 6, 24, 40, dir === 'south' ? '#fff3c4' : '#d8452f');
}

/* ------------------------------------------------------------------ */
/* Drawing a whole world                                               */
/* ------------------------------------------------------------------ */

function renderWorld(ctx, world, extras) {
  ctx.fillStyle = world.sky;
  ctx.fillRect(0, 0, view.w, view.h);

  var i;
  for (i = 0; i < world.ground.length; i++) {
    var g = world.ground[i];
    if (g.w + g.d < 700) {     // small patches off screen can be skipped
      var gs = toScreen(g.x + g.w / 2, g.y + g.d / 2, 0);
      if (gs.x < -200 || gs.x > view.w + 200 || gs.y < -200 || gs.y > view.h + 200) continue;
    }
    drawGround(ctx, g.x, g.y, g.w, g.d, g.color, g.z);
  }

  if (world.afterGround) world.afterGround(ctx);

  // everything with height, sorted so far-away things are drawn first
  var list = [];
  for (i = 0; i < world.props.length; i++) {
    var p = world.props[i];
    var s = toScreen(p.cx, p.cy, 0);
    if (s.x < -420 || s.x > view.w + 420 || s.y < -520 || s.y > view.h + 420) continue;
    list.push(p);
  }
  for (i = 0; i < world.people.length; i++) {
    var person = world.people[i];
    if (person.visible === false) continue;
    list.push({ depth: person.depth(), person: person });
  }
  if (extras) for (i = 0; i < extras.length; i++) list.push(extras[i]);

  list.sort(function (a, b) { return a.depth - b.depth; });

  for (i = 0; i < list.length; i++) {
    if (list[i].person) list[i].person.draw(ctx);
    else list[i].draw(ctx);
  }
}

/* Keep someone inside the edges of the world. */
function clampToBounds(person, bounds) {
  if (person.x < bounds.x1) person.x = bounds.x1;
  if (person.x > bounds.x2) person.x = bounds.x2;
  if (person.y < bounds.y1) person.y = bounds.y1;
  if (person.y > bounds.y2) person.y = bounds.y2;
}

/* Gently push the player out of other people so nobody walks through anyone. */
function pushApart(player, others) {
  for (var i = 0; i < others.length; i++) {
    var o = others[i];
    if (o === player) continue;
    var dx = player.x - o.x, dy = player.y - o.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var want = player.radius + o.radius;
    if (dist > 0.01 && dist < want) {
      player.x += (dx / dist) * (want - dist);
      player.y += (dy / dist) * (want - dist);
    }
  }
}

/* A taxi, pointing north like the bus so we can see the door on its side. */
function drawTaxi(ctx, taxi) {
  var x = taxi.x, y = taxi.y;
  var w = 96, d = 210;
  var yellow = '#f6c945';

  drawShadow(ctx, x + w / 2, y + d / 2, 58, 0.16);

  drawBlock(ctx, { x: x + 5, y: y + 26, w: w - 10, d: 38, h: 20, color: '#2e2b30' });
  drawBlock(ctx, { x: x + 5, y: y + d - 64, w: w - 10, d: 38, h: 20, color: '#2e2b30' });

  drawBlock(ctx, { x: x, y: y, w: w, d: d, h: 52, z: 14, color: yellow });
  drawBlock(ctx, { x: x + 8, y: y + 48, w: w - 16, d: d - 104, h: 38, z: 66, color: shade(yellow, -0.08) });

  // checker stripe down the side
  for (var i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      drawPanelX(ctx, x + w, y + 14 + i * 21, y + 14 + (i + 1) * 21, 30, 44, '#26242a');
    }
  }

  // windows
  drawPanelX(ctx, x + w - 8, y + 56, y + d - 60, 72, 98, '#c6e3ed');
  drawPanelY(ctx, y + d - 56, x + 14, x + w - 14, 72, 100, '#c6e3ed');   // back window
  drawPanelY(ctx, y + d, x + 6, x + 22, 22, 36, '#d8452f');
  drawPanelY(ctx, y + d, x + w - 22, x + w - 6, 22, 36, '#d8452f');

  // the door Douglas climbs into
  var open = taxi.doorOpen || 0;
  var dy1 = y + d - 116, dy2 = dy1 + 58;
  drawPanelX(ctx, x + w, dy1, dy2, 16, 66, '#3c3833');
  if (open < 1) {
    drawPanelX(ctx, x + w, dy1, dy2 - (dy2 - dy1) * open, 16, 66, shade(yellow, -0.14));
  }

  // roof sign
  drawBlock(ctx, { x: x + 18, y: y + 86, w: w - 36, d: 42, h: 18, z: 104, color: '#26242a' });
  var a = toScreen(x + w - 20, y + 124, 122), b = toScreen(x + w - 20, y + 88, 122);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
  ctx.fillStyle = '#ffd45e';
  ctx.font = 'bold ' + Math.round(11 * camera.zoom) + 'px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAXI', 0, 0);
  ctx.restore();
}

/* A desert cactus. */
function drawCactus(ctx, x, y, size) {
  size = size || 1;
  drawShadow(ctx, x + 8 * size, y + 8 * size, 16 * size, 0.16);
  drawBlock(ctx, { x: x - 11 * size, y: y - 11 * size, w: 22 * size, d: 22 * size, h: 92 * size, color: '#4a8f4a' });
  drawBlock(ctx, { x: x - 34 * size, y: y - 9 * size, w: 24 * size, d: 18 * size, h: 16 * size, z: 44 * size, color: '#3f7f42' });
  drawBlock(ctx, { x: x - 34 * size, y: y - 9 * size, w: 16 * size, d: 18 * size, h: 30 * size, z: 44 * size, color: '#3f7f42' });
  drawBlock(ctx, { x: x + 11 * size, y: y - 9 * size, w: 24 * size, d: 18 * size, h: 14 * size, z: 60 * size, color: '#3f7f42' });
  drawBlock(ctx, { x: x + 20 * size, y: y - 9 * size, w: 15 * size, d: 18 * size, h: 26 * size, z: 60 * size, color: '#3f7f42' });
}

/* A big lump of red rock. */
function drawMesa(ctx, x, y, w, d, h) {
  drawBlock(ctx, { x: x, y: y, w: w, d: d, h: h * 0.62, color: '#b5764a' });
  drawBlock(ctx, { x: x + w * 0.14, y: y + d * 0.14, w: w * 0.72, d: d * 0.72, h: h * 0.38, z: h * 0.62, color: '#c08557' });
}
