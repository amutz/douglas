/* draw.js
   Helpers for drawing the world from an angled, looking-down camera --
   the same sort of view used by games like Sneaky Sasquatch.

   The world is a flat map: x goes right, y goes away from us, and z is
   height off the ground. These helpers turn those three numbers into a
   single point on the canvas.
*/

var ISO_X = 0.86;  // sideways spread of the angled view
var ISO_Y = 0.50;  // how squashed the ground looks
var ISO_Z = 0.95;  // how tall one unit of height looks

var camera = { x: 0, y: 0, zoom: 1 };
var view = { w: 960, h: 600 };
var camOffset = { x: 0, y: 0 };

// Works out where the camera is pointing. Call once before drawing a frame.
function updateCamera() {
  var cx = (camera.x - camera.y) * ISO_X * camera.zoom;
  var cy = (camera.x + camera.y) * ISO_Y * camera.zoom;
  camOffset.x = view.w / 2 - cx;
  camOffset.y = view.h * 0.52 - cy;
}

function toScreen(x, y, z) {
  z = z || 0;
  return {
    x: (x - y) * ISO_X * camera.zoom + camOffset.x,
    y: ((x + y) * ISO_Y - z * ISO_Z) * camera.zoom + camOffset.y
  };
}

/* Makes a colour lighter (amount above 0) or darker (amount below 0). */
function shade(color, amount) {
  var n = parseInt(color.slice(1), 16);
  var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  }
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function toHex(v) {
  v = Math.max(0, Math.min(255, Math.round(v)));
  return (v < 16 ? '0' : '') + v.toString(16);
}

function clamp(v, low, high) {
  return v < low ? low : (v > high ? high : v);
}

function fillPoly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  // Drawing the outline in the same colour hides the hairline gaps that
  // appear where two shapes meet.
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* A flat patch of ground: grass, a floor, a rug, a road... */
function drawGround(ctx, x, y, w, d, color, z) {
  z = z || 0;
  fillPoly(ctx, [
    toScreen(x, y, z), toScreen(x + w, y, z),
    toScreen(x + w, y + d, z), toScreen(x, y + d, z)
  ], color);
}

/* A solid block. The top is lit, the two sides we can see are darker. */
function drawBlock(ctx, b) {
  var z = b.z || 0;
  var top = z + b.h;
  var x2 = b.x + b.w, y2 = b.y + b.d;

  var topColor   = b.topColor || shade(b.color, 0.16);
  var frontColor = shade(b.color, -0.06);   // the side facing us
  var rightColor = shade(b.color, -0.26);   // the side facing right

  // side facing us (bigger y)
  if (!b.skipFront) fillPoly(ctx, [
    toScreen(b.x, y2, z), toScreen(x2, y2, z),
    toScreen(x2, y2, top), toScreen(b.x, y2, top)
  ], frontColor);

  // side facing right (bigger x)
  if (!b.skipRight) fillPoly(ctx, [
    toScreen(x2, b.y, z), toScreen(x2, y2, z),
    toScreen(x2, y2, top), toScreen(x2, b.y, top)
  ], rightColor);

  // the top
  fillPoly(ctx, [
    toScreen(b.x, b.y, top), toScreen(x2, b.y, top),
    toScreen(x2, y2, top), toScreen(b.x, y2, top)
  ], topColor);
}

/* A sloped roof with a ridge along the middle, like a house in a storybook. */
function drawRoof(ctx, x, y, w, d, baseZ, height, color) {
  var x2 = x + w, y2 = y + d;
  var midY = y + d / 2;
  var ridgeA = toScreen(x + w * 0.12, midY, baseZ + height);
  var ridgeB = toScreen(x2 - w * 0.12, midY, baseZ + height);

  // far slope first, then the ends, then the slope facing us
  fillPoly(ctx, [toScreen(x, y, baseZ), toScreen(x2, y, baseZ), ridgeB, ridgeA], shade(color, -0.2));
  fillPoly(ctx, [toScreen(x, y, baseZ), toScreen(x, y2, baseZ), ridgeA], shade(color, -0.32));
  fillPoly(ctx, [toScreen(x2, y, baseZ), toScreen(x2, y2, baseZ), ridgeB], shade(color, -0.32));
  fillPoly(ctx, [toScreen(x, y2, baseZ), toScreen(x2, y2, baseZ), ridgeB, ridgeA], shade(color, 0.08));
}

/* Soft shadow on the ground under a thing. */
function drawShadow(ctx, x, y, radius, alpha) {
  var p = toScreen(x, y, 0);
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 0.2 : alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, radius * 1.5 * camera.zoom, radius * 0.8 * camera.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* Rounded rectangle, drawn straight onto the screen (not in world space). */
function roundRect(ctx, x, y, w, h, r, color) {
  if (r > w / 2) r = w / 2;
  if (r > h / 2) r = h / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/* A leafy tree: a trunk plus a few overlapping blobs. */
function drawTree(ctx, x, y, size, leafColor) {
  size = size || 1;
  leafColor = leafColor || '#5aa356';
  drawShadow(ctx, x + 12 * size, y + 12 * size, 36 * size, 0.18);
  drawBlock(ctx, { x: x - 11 * size, y: y - 11 * size, w: 22 * size, d: 22 * size, h: 112 * size, color: '#8a6440' });

  var p = toScreen(x, y, 112 * size);
  var s = camera.zoom * size;
  circle(ctx, p.x - 29 * s, p.y + 8 * s, 34 * s, shade(leafColor, -0.14));
  circle(ctx, p.x + 29 * s, p.y + 5 * s, 31 * s, shade(leafColor, -0.2));
  circle(ctx, p.x, p.y + 16 * s, 39 * s, leafColor);
  circle(ctx, p.x - 5 * s, p.y - 21 * s, 35 * s, shade(leafColor, 0.1));
}

/* A speech bubble floating above a spot in the world. */
function drawBubble(ctx, x, y, z, text) {
  var p = toScreen(x, y, z);
  ctx.font = 'bold ' + Math.round(15 * camera.zoom) + 'px "Trebuchet MS", sans-serif';
  var w = ctx.measureText(text).width + 22 * camera.zoom;
  var h = 30 * camera.zoom;
  var bx = p.x - w / 2, by = p.y - h - 10 * camera.zoom;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, bx, by, w, h, 10 * camera.zoom, '#ffffff');
  ctx.restore();

  fillPoly(ctx, [
    { x: p.x - 7 * camera.zoom, y: by + h - 1 },
    { x: p.x + 7 * camera.zoom, y: by + h - 1 },
    { x: p.x, y: by + h + 11 * camera.zoom }
  ], '#ffffff');

  ctx.fillStyle = '#332f3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, p.x, by + h / 2 + 1);
}

/* Flat panels stuck onto the side of a block: windows, doors, signs. */
function drawPanelX(ctx, xPlane, y1, y2, z1, z2, color) {
  fillPoly(ctx, [
    toScreen(xPlane, y1, z1), toScreen(xPlane, y2, z1),
    toScreen(xPlane, y2, z2), toScreen(xPlane, y1, z2)
  ], color);
}

function drawPanelY(ctx, yPlane, x1, x2, z1, z2, color) {
  fillPoly(ctx, [
    toScreen(x1, yPlane, z1), toScreen(x2, yPlane, z1),
    toScreen(x2, yPlane, z2), toScreen(x1, yPlane, z2)
  ], color);
}
