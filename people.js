/* people.js
   Douglas and his family. Everyone is drawn the same way: a little rounded
   body, a round head, and simple arms and legs that swing while walking.
*/

function Person(options) {
  this.x = options.x;
  this.y = options.y;
  this.height = options.height || 62;     // how tall they are, in pixels
  this.speed = options.speed || 95;
  this.radius = 15;                        // how much room they take up

  this.skin = options.skin || '#f0c39a';
  this.hair = options.hair || '#6b4226';
  this.shirt = options.shirt || '#4a90d9';
  this.pants = options.pants || '#3f4a63';
  this.shoes = options.shoes || '#40393a';
  this.longHair = !!options.longHair;
  this.backpack = options.backpack || null;

  this.z = options.z || 0;          // height off the floor (for sitting on a chair)
  this.sitting = !!options.sitting;
  this.faceX = 0;       // which way they are looking (a direction, not a place)
  this.faceY = 1;
  this.walkTime = 0;
  this.moving = false;

  // Family members follow a list of spots, one after another, forever.
  this.route = options.route || null;
  this.routeStep = 0;
  this.waitTimer = 0;
  this.pauseFor = options.pauseFor || 1.4;

  this.say = '';        // speech bubble text
  this.sayTimer = 0;
  this.lines = options.lines || [];
  this.lineIndex = 0;
  this.chatCooldown = options.chatDelay || 1.5;  // stops them all talking at once
}

/* Tick down the speech bubble timer. */
Person.prototype.tickSpeech = function (dt) {
  if (this.sayTimer > 0) {
    this.sayTimer -= dt;
    if (this.sayTimer <= 0) this.say = '';
  }
};

Person.prototype.speak = function (text, seconds) {
  this.say = text;
  this.sayTimer = seconds || 2.8;
};

Person.prototype.nextLine = function () {
  if (!this.lines.length) return;
  this.speak(this.lines[this.lineIndex % this.lines.length], 3);
  this.lineIndex++;
};

/* Move by some amount, sliding along anything solid instead of stopping dead. */
Person.prototype.moveBy = function (dx, dy, solids) {
  var r = this.radius;

  this.x += dx;
  if (solids) for (var i = 0; i < solids.length; i++) {
    var s = solids[i];
    if (this.x + r > s.x && this.x - r < s.x + s.w && this.y + r > s.y && this.y - r < s.y + s.d) {
      this.x = (dx > 0) ? s.x - r : s.x + s.w + r;
    }
  }

  this.y += dy;
  if (solids) for (var j = 0; j < solids.length; j++) {
    var t = solids[j];
    if (this.x + r > t.x && this.x - r < t.x + t.w && this.y + r > t.y && this.y - r < t.y + t.d) {
      this.y = (dy > 0) ? t.y - r : t.y + t.d + r;
    }
  }
};

/* Walking under their own steam, along their route. */
Person.prototype.update = function (dt, solids) {
  this.tickSpeech(dt);
  this.moving = false;

  if (this.route && this.route.length) {
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
    } else {
      var goal = this.route[this.routeStep];
      var dx = goal.x - this.x, dy = goal.y - this.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 6) {
        this.routeStep = (this.routeStep + 1) % this.route.length;
        this.waitTimer = goal.wait !== undefined ? goal.wait : this.pauseFor;
      } else {
        var step = Math.min(this.speed * dt, dist);
        this.moveBy((dx / dist) * step, (dy / dist) * step, solids);
        this.faceX = dx / dist;
        this.faceY = dy / dist;
        this.moving = true;
      }
    }
  }

  if (this.moving) this.walkTime += dt * 9;
  else this.walkTime *= Math.max(0, 1 - dt * 8);
};

Person.prototype.depth = function () {
  return this.x + this.y;
};

Person.prototype.draw = function (ctx) {
  var p = toScreen(this.x, this.y, this.z);
  var s = camera.zoom;
  var h = this.height * s;

  var headR = h * 0.21;
  var bodyH = h * 0.40;
  var legH  = h * 0.24;
  var bodyW = h * 0.37;
  if (this.sitting) legH *= 0.3;     // knees bent, sitting on a chair

  var swing = Math.sin(this.walkTime) * (h * 0.09);
  var bob = Math.abs(Math.sin(this.walkTime)) * (h * 0.025);

  var gy = p.y - bob;                 // the ground under their feet
  var bodyTop = gy - legH - bodyH;
  var headY = bodyTop - headR * 0.78;

  // Which way are they facing, as seen on screen?
  var screenSide = (this.faceX - this.faceY);      // left / right
  var towardUs   = (this.faceX + this.faceY);      // toward or away from camera
  var facingUs = towardUs > -0.25;

  drawShadow(ctx, this.x, this.y, this.radius * 0.95, 0.22);

  // legs
  var legW = bodyW * 0.30;
  roundRect(ctx, p.x - bodyW * 0.30 - legW / 2 + swing * 0.5, gy - legH, legW, legH, legW * 0.4, this.pants);
  roundRect(ctx, p.x + bodyW * 0.30 - legW / 2 - swing * 0.5, gy - legH, legW, legH, legW * 0.4, shade(this.pants, -0.12));
  // shoes
  roundRect(ctx, p.x - bodyW * 0.30 - legW / 2 + swing * 0.5, gy - legH * 0.28, legW, legH * 0.3, legW * 0.4, this.shoes);
  roundRect(ctx, p.x + bodyW * 0.30 - legW / 2 - swing * 0.5, gy - legH * 0.28, legW, legH * 0.3, legW * 0.4, this.shoes);

  // backpack behind them (the straps peek out at the sides)
  if (this.backpack && facingUs) {
    roundRect(ctx, p.x - bodyW * 0.62, bodyTop + bodyH * 0.05, bodyW * 1.24, bodyH * 0.8, bodyW * 0.3, this.backpack);
  }

  // arms
  var armW = bodyW * 0.26;
  roundRect(ctx, p.x - bodyW * 0.52 - armW / 2, bodyTop + bodyH * 0.12 - swing * 0.35, armW, bodyH * 0.72, armW * 0.5, shade(this.shirt, -0.14));
  roundRect(ctx, p.x + bodyW * 0.52 - armW / 2, bodyTop + bodyH * 0.12 + swing * 0.35, armW, bodyH * 0.72, armW * 0.5, shade(this.shirt, -0.14));

  // body
  roundRect(ctx, p.x - bodyW / 2, bodyTop, bodyW, bodyH + legH * 0.15, bodyW * 0.36, this.shirt);
  // a soft highlight so it doesn't look flat
  roundRect(ctx, p.x - bodyW / 2, bodyTop, bodyW * 0.42, bodyH * 0.9, bodyW * 0.3, shade(this.shirt, 0.09));

  // backpack worn on the back, seen when they walk away from us
  if (this.backpack && !facingUs) {
    roundRect(ctx, p.x - bodyW * 0.42, bodyTop + bodyH * 0.02, bodyW * 0.84, bodyH * 0.85, bodyW * 0.25, this.backpack);
    roundRect(ctx, p.x - bodyW * 0.22, bodyTop + bodyH * 0.3, bodyW * 0.44, bodyH * 0.2, 3 * s, shade(this.backpack, -0.2));
  }

  // head
  circle(ctx, p.x, headY, headR, this.skin);

  // hair
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, headY, headR * 1.06, 0, Math.PI * 2);
  ctx.clip();
  if (facingUs) {
    ctx.fillStyle = this.hair;
    ctx.fillRect(p.x - headR * 1.1, headY - headR * 1.2, headR * 2.2, headR * (this.longHair ? 1.05 : 0.85));
    if (this.longHair) {
      ctx.fillRect(p.x - headR * 1.1, headY - headR * 1.2, headR * 0.55, headR * 2.4);
      ctx.fillRect(p.x + headR * 0.55, headY - headR * 1.2, headR * 0.55, headR * 2.4);
    }
  } else {
    circle(ctx, p.x, headY, headR * 1.06, this.hair);  // back of the head
  }
  ctx.restore();

  // face (only when we can see it)
  if (facingUs) {
    var look = Math.max(-1, Math.min(1, screenSide)) * headR * 0.16;
    circle(ctx, p.x - headR * 0.33 + look, headY + headR * 0.18, headR * 0.13, '#3a3038');
    circle(ctx, p.x + headR * 0.33 + look, headY + headR * 0.18, headR * 0.13, '#3a3038');
    ctx.strokeStyle = 'rgba(90,60,60,0.55)';
    ctx.lineWidth = Math.max(1, headR * 0.1);
    ctx.beginPath();
    ctx.arc(p.x + look, headY + headR * 0.38, headR * 0.26, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  }

  if (this.say) drawBubble(ctx, this.x, this.y, this.height + 16, this.say);
};

/* Douglas asleep in bed: just a head on the pillow, under a lump of blanket. */
function drawSleeper(ctx, person, x, y, z) {
  var p = toScreen(x, y, z);
  var s = camera.zoom;
  var r = person.height * 0.2 * s;
  circle(ctx, p.x, p.y - r * 0.6, r, person.skin);
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y - r * 0.6, r * 1.05, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = person.hair;
  ctx.fillRect(p.x - r * 1.1, p.y - r * 1.8, r * 2.2, r * 0.95);
  ctx.restore();
  // closed, sleeping eyes
  ctx.strokeStyle = '#3a3038';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.arc(p.x - r * 0.32, p.y - r * 0.45, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.arc(p.x + r * 0.32, p.y - r * 0.45, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}
