/* scenes.js
   The four places in the game:
     1. inside the house   2. the front yard   3. the bus ride   4. school
   Each one builds its world, then says what happens while you are there.
*/

var Scenes = {};

/* ================================================================== */
/* 1. INSIDE THE HOUSE                                                */
/* ================================================================== */

Scenes.house = function (game) {
  var W = makeWorld();
  W.sky = '#332f3d';

  var WALL = '#f0e2ca';      // colour of the inside walls
  var TALL = 118;            // walls at the back, drawn full height
  var LOW = 26;              // walls nearest the camera, kept short so we can see in

  // ---- floors -------------------------------------------------------
  addGroundPatch(W, 0, 0, 900, 620, '#c9a97f');      // under everything
  addGroundPatch(W, 18, 18, 322, 282, '#d9ab74');    // Douglas's bedroom
  addGroundPatch(W, 18, 318, 322, 284, '#e6e0d2');   // kitchen
  addGroundPatch(W, 358, 18, 144, 584, '#cf9f68');   // hallway
  addGroundPatch(W, 520, 18, 362, 282, '#c9a97f');   // brother's room
  addGroundPatch(W, 520, 318, 362, 284, '#d9ab74');  // living room

  addGroundPatch(W, 180, 110, 125, 90, '#b2d4bd');   // bedroom rug
  addGroundPatch(W, 386, 60, 90, 500, '#b98a63');    // hallway runner
  addGroundPatch(W, 610, 390, 180, 150, '#c98f7a');  // living room rug
  addGroundPatch(W, 395, 578, 80, 24, '#8a6a52');    // doormat

  // ---- outside walls ------------------------------------------------
  addWall(W, 0, 0, 900, 18, TALL, WALL);        // back wall
  addWall(W, 0, 18, 18, 584, TALL, WALL);       // left wall
  addWall(W, 882, 18, 18, 584, LOW, shade(WALL, -0.08));
  addWall(W, 0, 602, 395, 18, LOW, shade(WALL, -0.08));
  addWall(W, 475, 602, 425, 18, LOW, shade(WALL, -0.08));   // gap = the front door

  // ---- inside walls (with gaps left for doorways) ---------------------
  addWall(W, 340, 18, 18, 150, TALL, WALL);
  addWall(W, 340, 248, 18, 160, TALL, WALL);
  addWall(W, 340, 488, 18, 114, TALL, WALL);
  addWall(W, 502, 18, 18, 110, TALL, WALL);
  addWall(W, 502, 208, 18, 170, TALL, WALL);
  addWall(W, 502, 478, 18, 124, TALL, WALL);
  addWall(W, 18, 300, 322, 18, TALL, WALL);
  addWall(W, 520, 300, 362, 18, TALL, WALL);

  // ---- Douglas's bedroom ---------------------------------------------
  addBlock(W, { x: 36, y: 40, w: 130, d: 200, h: 30, color: '#a5714a' });           // bed
  addBlock(W, { x: 42, y: 48, w: 118, d: 46, h: 12, z: 30, color: '#f6f1e4', solid: false });  // pillow
  addBlock(W, { x: 42, y: 100, w: 118, d: 132, h: 18, z: 30, color: '#5f9ed6', solid: false }); // blanket
  addBlock(W, { x: 176, y: 40, w: 54, d: 54, h: 48, color: '#b9834f' });            // bedside table
  addBlock(W, { x: 250, y: 30, w: 80, d: 60, h: 72, color: '#a5714a' });            // dresser
  addBlock(W, { x: 250, y: 240, w: 80, d: 50, h: 46, color: '#d2694f' });           // toy chest

  var state = { inBed: true, alarmTime: 0 };

  // alarm clock, wobbling and ringing until Douglas gets up
  addCustom(W, 190, 55, function (ctx) {
    var wob = state.inBed ? Math.sin(state.alarmTime * 26) * 2 : 0;
    drawBlock(ctx, { x: 186 + wob * 0.4, y: 50, w: 30, d: 28, h: 20, z: 48, color: '#d84a3a' });
    drawPanelY(ctx, 78, 192, 210, 54, 66, '#ffe9a8');
    if (state.inBed) {
      var p = toScreen(200, 50, 70);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2 * camera.zoom;
      for (var i = 1; i <= 2; i++) {
        var r = (8 + i * 7 + Math.sin(state.alarmTime * 8) * 2) * camera.zoom;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, -2.5, -0.7);
        ctx.stroke();
      }
    }
  });

  // Douglas asleep, drawn only while he is still in bed
  addCustom(W, 100, 70, function (ctx) {
    if (state.inBed) drawSleeper(ctx, game.douglas, 101, 72, 56);
  }, 4);

  // ---- kitchen --------------------------------------------------------
  addBlock(W, { x: 18, y: 330, w: 78, d: 170, h: 56, color: '#d7b78c' });
  addBlock(W, { x: 18, y: 516, w: 78, d: 76, h: 132, color: '#e9ecef' });          // fridge
  addBlock(W, { x: 130, y: 400, w: 130, d: 110, h: 44, color: '#c08a55' });        // table
  addBlock(W, { x: 98, y: 432, w: 28, d: 32, h: 34, color: '#a5714a', solid: false });
  addBlock(W, { x: 264, y: 432, w: 28, d: 32, h: 34, color: '#a5714a', solid: false });
  addBlock(W, { x: 170, y: 430, w: 42, d: 40, h: 14, z: 44, color: '#d8564a', solid: false });

  // ---- living room ----------------------------------------------------
  addBlock(W, { x: 600, y: 540, w: 170, d: 58, h: 48, color: '#6f9fd8' });         // couch
  addBlock(W, { x: 650, y: 420, w: 92, d: 80, h: 28, color: '#b07a4a' });          // coffee table
  addBlock(W, { x: 640, y: 322, w: 120, d: 40, h: 34, color: '#8a6a4a' });         // TV stand
  addBlock(W, { x: 652, y: 330, w: 96, d: 26, h: 54, z: 34, color: '#2b2f36', solid: false });
  addBlock(W, { x: 800, y: 420, w: 70, d: 100, h: 105, color: '#96633d' });        // bookshelf
  addBlock(W, { x: 828, y: 330, w: 34, d: 34, h: 96, color: '#e9d38a' });          // lamp

  // ---- brother's room --------------------------------------------------
  addBlock(W, { x: 740, y: 40, w: 120, d: 170, h: 30, color: '#7a5a8a' });
  addBlock(W, { x: 746, y: 90, w: 108, d: 110, h: 16, z: 30, color: '#86c2b2', solid: false });
  addBlock(W, { x: 540, y: 40, w: 60, d: 110, h: 44, color: '#b9834f' });          // desk
  addBlock(W, { x: 610, y: 84, w: 30, d: 30, h: 34, color: '#a5714a', solid: false });
  addBlock(W, { x: 540, y: 230, w: 100, d: 40, h: 100, color: '#96633d' });

  // ---- hallway ---------------------------------------------------------
  addBlock(W, { x: 366, y: 542, w: 22, d: 22, h: 98, color: '#6b4a3a' });         // coat rack
  addBlock(W, { x: 466, y: 544, w: 32, d: 32, h: 66, color: '#4f9a4a' });          // plant

  // ---- the family ------------------------------------------------------
  var mum = new Person({
    x: 300, y: 350, height: 100, speed: 62, longHair: true,
    skin: '#f0c39a', hair: '#8a4a2a', shirt: '#d96f8f', pants: '#5a5f8a',
    route: [{ x: 300, y: 350, wait: 2.2 }, { x: 300, y: 560 }, { x: 120, y: 560, wait: 2.6 }, { x: 115, y: 380 }],
    lines: ['Morning, sleepyhead!', 'Your bus is coming soon.', 'Did you brush your teeth?']
  });
  var dad = new Person({
    x: 700, y: 400, height: 106, speed: 58,
    skin: '#e8b98f', hair: '#4a4a4a', shirt: '#5fa86f', pants: '#4a4a55',
    route: [{ x: 700, y: 400, wait: 2.4 }, { x: 560, y: 430 }, { x: 430, y: 430 }, { x: 430, y: 200, wait: 1.8 }, { x: 430, y: 430 }],
    lines: ['Have a good day at school!', 'Where did I put my keys...', 'Don\'t forget your backpack.']
  });
  var brother = new Person({
    x: 700, y: 250, height: 78, speed: 78,
    skin: '#f0c39a', hair: '#c98a3a', shirt: '#f2c14e', pants: '#6b5a4a',
    route: [{ x: 700, y: 250, wait: 1.2 }, { x: 560, y: 168 }, { x: 430, y: 168 }, { x: 430, y: 320, wait: 1.0 }, { x: 430, y: 168 }, { x: 560, y: 168 }],
    lines: ['Last one to the bus is a rotten egg!', 'I already ate all the cereal.', 'Hurry uuup!']
  });
  W.people.push(mum, dad, brother);

  W.bounds = { x1: 34, y1: 34, x2: 866, y2: 594 };

  var scene = { name: 'house', world: W, allowMove: false };

  scene.enter = function (g) {
    g.douglas.x = 100;
    g.douglas.y = 150;
    g.douglas.faceX = 0;
    g.douglas.faceY = 1;
    g.douglas.visible = false;
    camera.x = 450;
    camera.y = 310;
    camera.zoom = 0.72;
    g.setObjective('Wake up! It is a school morning.');
  };

  scene.update = function (dt, g) {
    state.alarmTime += dt;

    if (state.inBed) {
      g.setPrompt('Press E to get out of bed', function () {
        state.inBed = false;
        scene.allowMove = true;
        g.douglas.visible = true;
        g.douglas.x = 205;
        g.douglas.y = 210;
        g.setObjective('Find the front door and head outside.');
        g.douglas.speak('Uuurgh... school.', 2.4);
      });
    }

    // The camera drifts with Douglas but stays pointed at the house, so we
    // never end up staring at the empty space around it.
    camera.x += (clamp(g.douglas.x, 400, 500) - camera.x) * Math.min(1, dt * 3);
    camera.y += (clamp(g.douglas.y, 270, 350) - camera.y) * Math.min(1, dt * 3);
  };

  addSpot(W, {
    x: 435, y: 580, radius: 55, label: 'Press E to go outside',
    use: function (g) { g.goTo('yard'); }
  });

  return scene;
};

/* ================================================================== */
/* 2. THE FRONT YARD                                                  */
/* ================================================================== */

/* The road, footpaths and painted lines are shared by the yard, the bus
   ride and the school, so they live in one function. */
function addStreet(W, fromY, toY) {
  addGroundPatch(W, 60, fromY, 200, toY - fromY, '#6e7076');        // road
  addGroundPatch(W, 0, fromY, 60, toY - fromY, '#cfc9ba');          // footpath, far side
  addGroundPatch(W, 260, fromY, 60, toY - fromY, '#cfc9ba');        // footpath, our side
  for (var y = fromY; y < toY; y += 130) {
    addGroundPatch(W, 154, y, 12, 70, '#e8dd8a');                   // dashed centre line
  }
}

Scenes.yard = function (game) {
  var W = makeWorld();
  W.sky = '#8ac45c';

  addGroundPatch(W, -900, -700, 3000, 3000, '#8fc95f');
  addGrassDetail(W, -700, -400, 1500, 1300, 130, 11);
  addStreet(W, -700, 2300);

  // paths up to the front door
  addGroundPatch(W, 745, 540, 70, 190, '#d8d2c4');
  addGroundPatch(W, 300, 660, 520, 70, '#d8d2c4');
  addGroundPatch(W, 735, 528, 92, 32, '#e2ddd0');

  // Douglas's house
  addCustom(W, 780, 340, function (ctx) {
    drawHouseOutside(ctx, { x: 420, y: 140, w: 720, d: 400, h: 200, color: '#ecd9b8', roofColor: '#b5604a' });
  });
  addSolid(W, 420, 140, 720, 400);

  // the neighbours, across the road
  addCustom(W, -400, 470, function (ctx) {
    drawHouseOutside(ctx, { x: -620, y: 300, w: 440, d: 340, h: 180, color: '#cfe0ec', roofColor: '#6a7f9a' });
  });

  addBlock(W, { x: 430, y: 630, w: 280, d: 40, h: 46, color: '#4f9a4a' });   // hedges
  addBlock(W, { x: 860, y: 630, w: 270, d: 40, h: 46, color: '#4f9a4a' });

  // mailbox
  addBlock(W, { x: 336, y: 860, w: 14, d: 14, h: 82, color: '#7a5a3a' });
  addBlock(W, { x: 322, y: 852, w: 42, d: 30, h: 28, z: 82, color: '#b0553f', solid: false });

  // bus stop sign
  addCustom(W, 298, 610, function (ctx) {
    drawBlock(ctx, { x: 294, y: 606, w: 10, d: 10, h: 112, color: '#8a8f98' });
    drawPanelX(ctx, 304, 580, 636, 112, 152, '#f4c23c');
    drawPanelY(ctx, 616, 274, 324, 112, 152, shade('#f4c23c', -0.15));
  });

  addTree(W, 380, 300, 1.15);
  addTree(W, 1215, 360, 1.0, '#4f9a4a');
  addTree(W, 1010, 800, 1.2);
  addTree(W, 560, 930, 0.95, '#66ac52');
  addTree(W, -120, 180, 1.1);
  addTree(W, -150, 860, 1.0, '#4f9a4a');

  W.bounds = { x1: 276, y1: 150, x2: 1330, y2: 1000 };

  var bus = { x: 150, y: 2000, doorOpen: 0 };
  var timer = 0;
  var arrived = false;
  var startY = 2000, stopY = 520;

  addCustom(W, 190, 700, function (ctx) { drawBus(ctx, bus); });
  // the bus moves, so keep its place in the drawing order up to date
  W.props[W.props.length - 1].update = function () {
    this.cx = bus.x + 55;
    this.cy = bus.y + 160;
    this.depth = this.cx + this.cy;
  };

  var boarding = addSpot(W, {
    x: 300, y: 760, radius: 60, label: 'Press E to get on the bus',
    active: false,
    use: function (g) { g.goTo('busride'); }
  });

  var scene = { name: 'yard', world: W, allowMove: true };

  scene.enter = function (g) {
    g.douglas.x = 780;
    g.douglas.y = 590;
    g.douglas.faceX = 0;
    g.douglas.faceY = 1;
    camera.x = g.douglas.x;
    camera.y = g.douglas.y;
    camera.zoom = 0.9;
    g.setObjective('Head down the path to the street.');
  };

  scene.update = function (dt, g) {
    timer += dt;

    // the bus rolls up after a moment, slowing down as it arrives
    if (timer > 1.6 && !arrived) {
      var t = Math.min(1, (timer - 1.6) / 3.4);
      var eased = 1 - Math.pow(1 - t, 3);
      bus.y = startY + (stopY - startY) * eased;
      if (t >= 1) {
        arrived = true;
        g.setObjective('The bus is here! Get on board.');
      }
    }
    if (arrived) {
      bus.doorOpen = Math.min(1, bus.doorOpen + dt * 2.5);
      boarding.active = true;
    }

    for (var i = 0; i < W.props.length; i++) {
      if (W.props[i].update) W.props[i].update();
    }

    camera.x += (g.douglas.x - camera.x) * Math.min(1, dt * 3);
    camera.y += (g.douglas.y - camera.y) * Math.min(1, dt * 3);
  };

  return scene;
};

/* ================================================================== */
/* 3. THE BUS RIDE (a cutscene -- you just watch)                     */
/* ================================================================== */

Scenes.busride = function (game) {
  var W = makeWorld();
  W.sky = '#8fc95f';

  var END_Y = -3600;
  addGroundPatch(W, -1400, END_Y - 600, 3200, 5000, '#8fc95f');
  addGrassDetail(W, -900, END_Y - 400, 1300, 800, 420, 17);
  addStreet(W, END_Y - 600, 900);

  // Simple repeating numbers so the street looks different as it goes by,
  // but comes out the same every time you play.
  var seed = 7;
  function nextNumber() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }

  var houseColors = ['#ecd9b8', '#cfe0ec', '#e9c9c0', '#dfe4c4', '#e6d3ea'];
  var roofColors = ['#b5604a', '#6a7f9a', '#8a5f7a', '#7a8a5a', '#a8724a'];

  for (var y = 700; y > END_Y; y -= 300) {
    var pick = nextNumber();

    if (pick < 0.55) {
      (function (yy, c) {
        var w = 300 + Math.round(nextNumber() * 160);
        addCustom(W, 660 + w / 2, yy + 120, function (ctx) {
          drawHouseOutside(ctx, {
            x: 660, y: yy, w: w, d: 230, h: 150 + c * 60,
            color: houseColors[Math.floor(c * 5) % 5],
            roofColor: roofColors[Math.floor(c * 5) % 5],
            roofH: 80, door: false
          });
        });
      })(y, pick);
    } else if (pick < 0.75) {
      addTree(W, 560 + pick * 200, y + 100, 1 + pick * 0.5);
      addTree(W, 800 + pick * 120, y + 190, 0.9);
    } else if (pick < 0.88) {
      // a little park with a pond
      (function (yy) {
        addGroundPatch(W, 560, yy, 380, 260, '#7bbd52');
        addGroundPatch(W, 630, yy + 60, 220, 140, '#63b6d6');
      })(y);
      addTree(W, 900, y + 40, 1.1);
    } else {
      // corner shop
      (function (yy) {
        addCustom(W, 780, yy + 100, function (ctx) {
          drawBlock(ctx, { x: 640, y: yy, w: 280, d: 200, h: 170, color: '#e4c48a' });
          drawPanelY(ctx, yy + 200, 670, 890, 40, 120, '#9fd2e6');
          drawPanelY(ctx, yy + 200, 640, 920, 130, 160, '#d8564a');
        });
      })(y);
    }

    // the other side of the road
    if (nextNumber() < 0.5) {
      (function (yy, c) {
        addCustom(W, -320, yy + 110, function (ctx) {
          drawHouseOutside(ctx, {
            x: -520, y: yy, w: 340, d: 220, h: 150,
            color: houseColors[Math.floor(c * 5) % 5],
            roofColor: roofColors[(Math.floor(c * 5) + 2) % 5],
            roofH: 75, door: false
          });
        });
      })(y, pick);
    } else {
      addTree(W, -200, y + 90, 1.1, '#4f9a4a');
    }

    // street lamps along our footpath
    (function (yy) {
      addCustom(W, 286, yy, function (ctx) {
        drawBlock(ctx, { x: 282, y: yy - 5, w: 10, d: 10, h: 150, color: '#8a8f98' });
        drawBlock(ctx, { x: 268, y: yy - 12, w: 38, d: 24, h: 14, z: 150, color: '#f2e2a8' });
      });
    })(y - 150);
  }

  // cars sharing the road
  var cars = [
    { x: 72, y: -400, color: '#d8564a', speed: 210 },
    { x: 72, y: -1500, color: '#e8e2d2', speed: 170 },
    { x: 72, y: -2600, color: '#5f9ed6', speed: 240 }
  ];
  for (var c = 0; c < cars.length; c++) {
    (function (car) {
      addCustom(W, car.x, car.y, function (ctx) { drawCar(ctx, car.x, car.y, car.color, 'south'); });
      var prop = W.props[W.props.length - 1];
      prop.update = function () {
        car.y += car.speed * game.lastDt;
        if (car.y > 900) car.y -= 4600;
        this.cy = car.y + 90;
        this.cx = car.x + 40;
        this.depth = this.cx + this.cy;
      };
    })(cars[c]);
  }

  var bus = { x: 150, y: 520, doorOpen: 0 };
  addCustom(W, 190, 680, function (ctx) { drawBus(ctx, bus); });
  var busProp = W.props[W.props.length - 1];
  busProp.update = function () {
    this.cx = bus.x + 55;
    this.cy = bus.y + 160;
    this.depth = this.cx + this.cy;
  };

  var time = 0;
  var DURATION = 11;
  var scene = { name: 'busride', world: W, allowMove: false, cutscene: true };

  scene.enter = function (g) {
    bus.y = 520;
    bus.doorOpen = 0;
    camera.zoom = 0.78;
    camera.x = bus.x + 230;
    camera.y = bus.y + 150;
    g.setObjective('');
    g.showCaption('Douglas is on his way to school...');
    g.showBars(true);
  };

  scene.update = function (dt, g) {
    time += dt;

    // speed up smoothly, cruise, then slow down at the end
    var speed = 430;
    if (time < 1.2) speed *= time / 1.2;
    if (time > DURATION - 1.4) speed *= Math.max(0.12, (DURATION - time) / 1.4);
    bus.y -= speed * dt;

    if (time > 4.5 && time < 4.6) g.showCaption('Past the shops, over the hill...');
    if (time > 8.5 && time < 8.6) g.showCaption('Almost there!');

    for (var i = 0; i < W.props.length; i++) {
      if (W.props[i].update) W.props[i].update();
    }

    camera.x = bus.x + 230;
    camera.y = bus.y + 150;

    if (time >= DURATION) g.goTo('school');
  };

  scene.skip = function (g) { g.goTo('school'); };

  return scene;
};

/* ================================================================== */
/* 4. SCHOOL                                                          */
/* ================================================================== */

Scenes.school = function (game) {
  var W = makeWorld();
  W.sky = '#8ac45c';

  var fleeing = game.story.fleeing;   // running away from the monster?

  addGroundPatch(W, -900, -700, 3000, 3000, '#8fc95f');
  addGrassDetail(W, -300, 400, 1500, 1300, 120, 29);
  addStreet(W, -700, 2300);

  addGroundPatch(W, 320, 660, 500, 70, '#d8d2c4');   // path from the bus
  addGroundPatch(W, 780, 480, 70, 210, '#d8d2c4');   // path up to the doors
  addGroundPatch(W, 700, 470, 230, 40, '#e2ddd0');   // step in front of the doors

  // the school itself
  addCustom(W, 840, 270, function (ctx) {
    var x = 380, y = 60, w = 920, d = 420, h = 250;
    drawBlock(ctx, { x: x, y: y, w: w, d: d, h: h, color: '#d8b48c' });
    // rows of windows
    for (var i = 0; i < 6; i++) {
      var wx = x + 60 + i * 145;
      drawPanelY(ctx, y + d, wx, wx + 90, 70, 140, '#9fd2e6');
      drawPanelY(ctx, y + d, wx, wx + 90, 165, 225, shade('#9fd2e6', 0.05));
    }
    drawPanelX(ctx, x + w, y + 80, y + 180, 70, 140, shade('#9fd2e6', -0.15));
    drawPanelX(ctx, x + w, y + 240, y + 340, 70, 140, shade('#9fd2e6', -0.15));
    // front doors
    drawPanelY(ctx, y + d, 790, 890, 0, 130, '#5a4a6a');
    drawPanelY(ctx, y + d, 796, 838, 8, 122, '#7d6a94');
    drawPanelY(ctx, y + d, 842, 884, 8, 122, '#7d6a94');
    // sign over the door
    drawPanelY(ctx, y + d, 740, 940, 145, 190, '#f2e2b8');
    var a = toScreen(748, y + d, 172), b = toScreen(932, y + d, 172);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    ctx.fillStyle = '#4a3f5a';
    ctx.font = 'bold ' + Math.round(17 * camera.zoom) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCHOOL', 0, 0);
    ctx.restore();

    drawRoof(ctx, x - 18, y - 18, w + 36, d + 36, h, 78, '#7a7486');
  });
  addSolid(W, 380, 60, 920, 420);

  // flagpole
  addBlock(W, { x: 1180, y: 600, w: 12, d: 12, h: 210, color: '#c8ccd2' });
  addCustom(W, 1186, 606, function (ctx) {
    drawPanelY(ctx, 606, 1192, 1272, 150, 200, '#d8564a');
  }, 2);

  addTree(W, 520, 620, 1.2);
  addTree(W, 1010, 640, 1.05, '#4f9a4a');
  addTree(W, 1290, 880, 1.15);
  addTree(W, 620, 950, 1.0, '#66ac52');

  // other kids in the yard
  var kid1 = new Person({
    x: 700, y: 800, height: 78, speed: 70,  // (only out here before the bell)
    skin: '#e8b98f', hair: '#3a2f2a', shirt: '#e0674f', pants: '#4a5a7a', backpack: '#4f9a4a',
    route: [{ x: 700, y: 800 }, { x: 960, y: 760 }, { x: 980, y: 900 }, { x: 640, y: 900 }],
    lines: ['Hi Douglas!', 'Did you do the homework?', 'Race you to class!']
  });
  var kid2 = new Person({
    x: 460, y: 880, height: 84, speed: 60, longHair: true,
    skin: '#c98f66', hair: '#2f2622', shirt: '#7a6ad8', pants: '#3f4a63', backpack: '#e8b03a',
    route: [{ x: 460, y: 880, wait: 2 }, { x: 460, y: 700 }, { x: 600, y: 700 }, { x: 600, y: 880 }],
    lines: ['Morning!', 'The bell is about to ring.']
  });
  if (!fleeing) W.people.push(kid1, kid2);

  // The school bus is still parked out front when Douglas arrives; by the
  // time he comes running back out it has gone, and a taxi shows up.
  var bus = { x: 150, y: 520, doorOpen: 1 };
  var taxi = { x: 160, y: 1500, doorOpen: 0 };
  var taxiHere = false;
  var timer = 0;

  if (fleeing) {
    addCustom(W, 200, 660, function (ctx) { drawTaxi(ctx, taxi); });
    W.props[W.props.length - 1].update = function () {
      this.cx = taxi.x + 48;
      this.cy = taxi.y + 105;
      this.depth = this.cx + this.cy;
    };
  } else {
    addCustom(W, 190, 680, function (ctx) { drawBus(ctx, bus); });
  }

  W.bounds = { x1: 276, y1: 150, x2: 1380, y2: 1000 };

  var doorSpot = addSpot(W, {
    x: 815, y: 555, radius: 95, label: 'Press E to go inside',
    active: !fleeing,
    use: function (g) { g.goTo('hallway'); }
  });

  var taxiSpot = addSpot(W, {
    x: 300, y: 690, radius: 70, label: 'Press E to jump in the taxi',
    active: false,
    use: function (g) { g.goTo('taxiride'); }
  });

  var scene = { name: 'school', world: W, allowMove: true };

  scene.enter = function (g) {
    if (fleeing) {
      g.douglas.x = 815;
      g.douglas.y = 600;
      g.douglas.faceX = -0.6;
      g.douglas.faceY = 1;
      camera.x = g.douglas.x;
      camera.y = g.douglas.y;
      camera.zoom = 0.85;
      g.setObjective('Calling a taxi...');
      g.douglas.speak('TAXI!!', 2.5);
    } else {
      g.douglas.x = 300;
      g.douglas.y = 760;
      g.douglas.faceX = 1;
      g.douglas.faceY = -0.2;
      camera.x = 820;      // start on the school, then drift back to Douglas
      camera.y = 420;
      camera.zoom = 0.85;
      g.setObjective('You made it to school. Head for the front doors!');
      g.douglas.speak('Made it!', 2.5);
    }
  };

  var arrivedTime = 0;
  scene.update = function (dt, g) {
    timer += dt;

    if (fleeing) {
      if (!taxiHere) {
        var t = Math.min(1, timer / 3);
        taxi.y = 1500 + (560 - 1500) * (1 - Math.pow(1 - t, 3));
        if (t >= 1) {
          taxiHere = true;
          taxiSpot.active = true;
          g.setObjective('Get in the taxi!');
        }
      } else {
        taxi.doorOpen = Math.min(1, taxi.doorOpen + dt * 3);
      }
      for (var i = 0; i < W.props.length; i++) {
        if (W.props[i].update) W.props[i].update();
      }
      camera.x += (g.douglas.x - camera.x) * Math.min(1, dt * 3);
      camera.y += (g.douglas.y - camera.y) * Math.min(1, dt * 3);
      return;
    }

    // Arriving: the camera starts on the school, then swings back to Douglas.
    arrivedTime += dt;
    var speed = arrivedTime < 2.5 ? 1.1 : 3;
    camera.x += (g.douglas.x - camera.x) * Math.min(1, dt * speed);
    camera.y += (g.douglas.y - camera.y) * Math.min(1, dt * speed);
  };

  return scene;
};

/* ================================================================== */
/* 5. THE SCHOOL HALLWAY                                              */
/* ================================================================== */

Scenes.hallway = function (game) {
  var W = makeWorld();
  W.sky = '#2f3340';

  var fleeing = game.story.fleeing;   // running away from the monster?

  var WALL = '#dfe6ea';
  var TALL = 170;      // schools have high ceilings
  var LOW = 26;

  addTiledFloor(W, 18, 18, 864, 584, '#e8dcc0', '#dfd0af', 62);

  addWall(W, 0, 0, 900, 18, TALL, WALL);
  addWall(W, 0, 18, 18, 584, TALL, WALL);
  addWall(W, 882, 18, 18, 584, LOW, shade(WALL, -0.08));
  addWall(W, 0, 602, 620, 18, LOW, shade(WALL, -0.08));
  addWall(W, 700, 602, 200, 18, LOW, shade(WALL, -0.08));   // gap = the way in

  // lockers down the back wall
  for (var i = 0; i < 10; i++) {
    addBlock(W, {
      x: 300 + i * 56, y: 20, w: 48, d: 30, h: 96,
      color: i % 2 === 0 ? '#6fa8dc' : '#4a86c8'
    });
  }
  // and a few more down the left wall
  for (var j = 0; j < 4; j++) {
    addBlock(W, {
      x: 20, y: 380 + j * 56, w: 30, d: 48, h: 96,
      color: j % 2 === 0 ? '#4a86c8' : '#6fa8dc'
    });
  }

  // a bin, a water fountain and a trophy case, for flavour
  addBlock(W, { x: 820, y: 300, w: 40, d: 40, h: 54, color: '#7a8a6a' });
  addBlock(W, { x: 800, y: 120, w: 60, d: 40, h: 70, color: '#c8ccd2' });
  addBlock(W, { x: 480, y: 22, w: 120, d: 28, h: 110, color: '#8a6a4a' });

  // the classroom door, set into the back wall
  addCustom(W, 230, 18, function (ctx) {
    drawPanelY(ctx, 18, 178, 282, 0, 124, '#5a3a1a');
    drawPanelY(ctx, 18, 186, 274, 8, 116, '#7a5230');
    drawPanelY(ctx, 18, 196, 264, 74, 108, '#bfe2ee');
    drawPanelY(ctx, 18, 160, 300, 132, 168, '#f6f1e4');
    var a = toScreen(166, 18, 146), b = toScreen(294, 18, 146);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    ctx.fillStyle = '#3a3340';
    ctx.font = 'bold ' + Math.round(12 * camera.zoom) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("Douglas's Classroom", 0, 0);
    ctx.restore();
  }, 6);

  // other kids hurrying to class (they have all gone in by the time
  // Douglas comes running back the other way)
  var kidA = new Person({
    x: 700, y: 420, height: 80, speed: 88, backpack: '#4f9a4a',
    skin: '#e8b98f', hair: '#3a2f2a', shirt: '#e0674f', pants: '#4a5a7a',
    route: [{ x: 700, y: 480 }, { x: 700, y: 180 }, { x: 420, y: 180 }, { x: 420, y: 480 }],
    lines: ["Hurry, the bell's about to ring!", 'Morning, Douglas!']
  });
  var kidB = new Person({
    x: 380, y: 520, height: 76, speed: 70, longHair: true,
    skin: '#c98f66', hair: '#2f2622', shirt: '#7a6ad8', pants: '#3f4a63', backpack: '#e8b03a',
    route: [{ x: 380, y: 520, wait: 1.6 }, { x: 620, y: 520 }, { x: 620, y: 300 }, { x: 380, y: 300 }],
    lines: ['I heard we have a pop quiz today...', 'Last one inside is a rotten egg!']
  });
  if (!fleeing) W.people.push(kidA, kidB);

  W.bounds = { x1: 40, y1: 40, x2: 860, y2: 590 };

  // the route that lights up on the floor -- it runs backwards, and turns
  // red, once Douglas is running away from the monster
  var route = [
    { x: 660, y: 570 }, { x: 660, y: 330 }, { x: 230, y: 330 }, { x: 230, y: 110 }
  ];
  if (fleeing) route = route.slice().reverse();

  var time = 0;
  W.afterGround = function (ctx) {
    drawGlowPath(ctx, route, time, fleeing ? '235, 40, 40' : null);
  };

  if (fleeing) {
    addSpot(W, {
      x: 660, y: 572, radius: 75, label: 'Press E to get outside',
      use: function (g) { g.goTo('school'); }
    });
  } else {
    addSpot(W, {
      x: 230, y: 96, radius: 70, label: 'Press E to go into class',
      use: function (g) { g.goTo('classroom'); }
    });
  }

  var scene = { name: 'hallway', world: W, allowMove: true };

  scene.enter = function (g) {
    if (fleeing) {
      g.douglas.x = 230;
      g.douglas.y = 160;
      g.douglas.faceX = 0.4;
      g.douglas.faceY = 1;
    } else {
      g.douglas.x = 660;
      g.douglas.y = 575;
      g.douglas.faceX = -0.4;
      g.douglas.faceY = -1;
    }
    camera.x = 450;
    camera.y = 310;
    camera.zoom = 0.72;
    g.setObjective(fleeing
      ? 'RUN! Follow the red path back outside!'
      : 'Follow the glowing path to your classroom.');
  };

  scene.update = function (dt, g) {
    time += dt;
    camera.x += (clamp(g.douglas.x, 400, 500) - camera.x) * Math.min(1, dt * 3);
    camera.y += (clamp(g.douglas.y, 270, 350) - camera.y) * Math.min(1, dt * 3);
  };

  return scene;
};

/* ================================================================== */
/* 6. THE CLASSROOM                                                   */
/* ================================================================== */

Scenes.classroom = function (game) {
  var W = makeWorld();
  W.sky = '#2f3340';

  var WALL = '#f0e8d4';
  var TALL = 160;
  var LOW = 26;

  addTiledFloor(W, 18, 18, 864, 584, '#e8dcc0', '#dfd0af', 62);

  addWall(W, 0, 0, 900, 18, TALL, WALL);
  addWall(W, 0, 18, 18, 584, TALL, WALL);
  addWall(W, 882, 18, 18, 584, LOW, shade(WALL, -0.08));
  addWall(W, 0, 602, 400, 18, LOW, shade(WALL, -0.08));
  addWall(W, 500, 602, 400, 18, LOW, shade(WALL, -0.08));

  // blackboard across the front of the room
  addCustom(W, 460, 18, function (ctx) {
    drawPanelY(ctx, 18, 260, 660, 46, 140, '#33513f');
    drawPanelY(ctx, 18, 256, 664, 40, 48, '#8a6a4a');
    var a = toScreen(300, 18, 100), b = toScreen(620, 18, 100);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    ctx.fillStyle = '#eef3e8';
    ctx.font = 'bold ' + Math.round(20 * camera.zoom) + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome, Class!', 0, 0);
    ctx.restore();
  }, 6);

  addBlock(W, { x: 700, y: 30, w: 120, d: 56, h: 74, color: '#a5714a' });   // teacher's desk
  addBlock(W, { x: 60, y: 60, w: 70, d: 120, h: 100, color: '#96633d' });   // bookshelf
  addBlock(W, { x: 60, y: 480, w: 60, d: 60, h: 58, color: '#7a8a6a' });    // bin

  // nine desks in a grid; the middle one is free
  var cols = [280, 460, 640];
  var rows = [250, 370, 490];
  var shirts = ['#e07bb0', '#5fbf5f', '#f0a030', '#9a6fd0', '#4ac0c0', '#e0763c', '#c94a6a', '#7aa8e0'];
  var classmateLines = [
    'Psst, did you study for the quiz?',
    'Nice backpack!',
    'Sit here, next to me!',
    "I hope it's pizza day at lunch.",
    'Did you finish the homework? ...Me neither.'
  ];
  var emptyDesk = { x: cols[1], y: rows[1] };
  var seatSpot = { x: emptyDesk.x, y: emptyDesk.y + 50 };
  var n = 0;

  for (var r = 0; r < rows.length; r++) {
    for (var c = 0; c < cols.length; c++) {
      var cx = cols[c], cy = rows[r];
      addBlock(W, { x: cx - 44, y: cy - 24, w: 88, d: 48, h: 38, color: '#c08a55' });
      addBlock(W, { x: cx - 16, y: cy + 34, w: 32, d: 32, h: 30, color: '#a5714a', solid: false });
      if (cx === emptyDesk.x && cy === emptyDesk.y) continue;

      var mate = new Person({
        x: cx, y: cy + 50, z: 30, sitting: true, height: 78,
        skin: n % 3 === 0 ? '#c98f66' : '#f0c39a',
        hair: n % 2 === 0 ? '#3a2a1a' : '#6b4226',
        longHair: n % 3 === 1,
        shirt: shirts[n % shirts.length], pants: '#3a3a3a',
        chatDelay: 2 + n * 1.1,
        lines: [classmateLines[n % classmateLines.length]]
      });
      mate.faceY = -1;
      W.people.push(mate);
      n++;
    }
  }

  var teacher = new Person({
    x: 460, y: 150, height: 106, speed: 40,
    skin: '#e8b98f', hair: '#2a2a2a', shirt: '#4a8a4a', pants: '#3a3a44',
    route: [{ x: 380, y: 150, wait: 2.6 }, { x: 560, y: 150, wait: 2.6 }],
    lines: [
      'Please take your seat, we are about to start.',
      'I hope you did your homework...',
      'Class, we have a pop quiz today!'
    ]
  });
  W.people.push(teacher);

  // What the teacher turns into. Hidden until the pop quiz is announced.
  var monster = new Person({ x: 460, y: 150, height: 118 });
  monster.visible = false;
  monster.draw = function (ctx) { drawMonster(ctx, this.x, this.y, time); };
  W.people.push(monster);

  W.bounds = { x1: 50, y1: 200, x2: 850, y2: 590 };

  var time = 0;
  var seated = false;
  var sinceSeated = 0;
  var phase = 'seeking';      // seeking -> sitting -> quiz -> monster -> fleeing
  var exit = { x: 450, y: 578 };

  W.afterGround = function (ctx) {
    var pulse = 0.35 + Math.sin(time * 4) * 0.2;
    ctx.save();
    ctx.globalAlpha = pulse;
    if (!seated) {
      drawGround(ctx, seatSpot.x - 34, seatSpot.y - 30, 68, 60, '#ffd23c');
    } else if (phase === 'fleeing') {
      drawGround(ctx, exit.x - 46, exit.y - 40, 92, 70, '#ff3c3c');   // the way out
    }
    ctx.restore();
  };

  addCustom(W, seatSpot.x, seatSpot.y, function (ctx) {
    if (!seated) drawBubble(ctx, seatSpot.x, seatSpot.y, 92, 'Your desk!');
  }, 600);

  var sitSpot = addSpot(W, {
    x: seatSpot.x, y: seatSpot.y + 20, radius: 85, label: 'Press E to sit down',
    use: function (g) {
      seated = true;
      phase = 'sitting';
      sinceSeated = 0;
      sitSpot.active = false;
      scene.allowMove = false;
      g.douglas.x = seatSpot.x;
      g.douglas.y = seatSpot.y;
      g.douglas.z = 30;
      g.douglas.sitting = true;
      g.douglas.faceX = 0;
      g.douglas.faceY = -1;
      g.douglas.moving = false;
      g.setObjective('You found your seat, Douglas!');
      teacher.speak('Good morning, Douglas! Glad you could join us.', 3);
    }
  });

  var exitSpot = addSpot(W, {
    x: exit.x, y: exit.y, radius: 70, label: 'Press E to run out', active: false,
    use: function (g) {
      g.story.fleeing = true;
      g.goTo('hallway');
    }
  });

  var scene = { name: 'classroom', world: W, allowMove: true };

  scene.enter = function (g) {
    g.douglas.x = 460;
    g.douglas.y = 575;
    g.douglas.z = 0;
    g.douglas.sitting = false;
    g.douglas.faceX = 0;
    g.douglas.faceY = -1;
    camera.x = 450;
    camera.y = 310;
    camera.zoom = 0.72;
    g.setObjective('Find the empty desk and take a seat.');
    teacher.speak('Good morning! Come in, come in.', 3.5);
  };

  scene.update = function (dt, g) {
    time += dt;
    if (monster.visible) { monster.x = teacher.x; monster.y = teacher.y; }

    // The pop quiz, and what the teacher really is.
    if (seated && phase !== 'fleeing') {
      sinceSeated += dt;

      if (phase === 'sitting' && sinceSeated > 3.2) {
        phase = 'quiz';
        teacher.speak('Class, we have a pop quiz today!', 2.8);
        g.setObjective('');
      } else if (phase === 'quiz' && sinceSeated > 6.2) {
        phase = 'monster';
        teacher.visible = false;
        teacher.route = null;
        teacher.say = '';
        monster.visible = true;
        monster.x = teacher.x;
        monster.y = teacher.y;
        g.shakeScreen(0.8);
        g.showShout('RAAWR!!', 1.8);
        // the rest of the class stops chatting about homework and panics
        for (var i = 0; i < W.people.length; i++) {
          var kid = W.people[i];
          if (kid === teacher || kid === monster || kid === g.douglas) continue;
          kid.lines = ['AAAAH!', 'RUN!!', 'Not the quiz monster!', 'I did not study for THIS!'];
          kid.lineIndex = i;
          kid.chatCooldown = 0.4 * i;
          kid.say = '';
          kid.sayTimer = 0;
        }
      } else if (phase === 'monster' && sinceSeated > 8.0) {
        phase = 'fleeing';
        // Douglas jumps up out of his chair (into the gap between the rows
        // of desks, so he does not start off stuck inside one)
        g.douglas.sitting = false;
        g.douglas.z = 0;
        g.douglas.y = seatSpot.y + 10;
        g.douglas.faceY = 1;
        g.douglas.speak('NOPE!', 2);
        scene.allowMove = true;
        exitSpot.active = true;
        g.setObjective('RUN! Get out of the classroom!');
      }
    }

    camera.x += (clamp(g.douglas.x, 420, 500) - camera.x) * Math.min(1, dt * 3);
    camera.y += (clamp(g.douglas.y, 270, 350) - camera.y) * Math.min(1, dt * 3);
  };

  return scene;
};

/* ================================================================== */
/* 7. THE TAXI RIDE INTO THE DESERT (a cutscene)                      */
/* ================================================================== */

Scenes.taxiride = function (game) {
  var W = makeWorld();
  W.sky = '#e7bd82';

  var END_Y = -3000;
  addGroundPatch(W, -1400, END_Y - 600, 3200, 4600, '#e0b070');   // sand

  // dusty desert road
  addGroundPatch(W, 60, END_Y - 600, 200, 4600, '#8a6a4a');
  for (var ry = 700; ry > END_Y - 600; ry -= 130) {
    addGroundPatch(W, 154, ry, 12, 70, '#e8c85a');
  }

  // Same trick as the bus ride: simple repeating numbers so the desert
  // looks varied but comes out the same every time.
  var seed = 23;
  function nextNumber() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }

  for (var y = 700; y > END_Y; y -= 260) {
    var pick = nextNumber();

    if (pick < 0.45) {
      (function (yy, k) {
        addCustom(W, 520, yy, function (ctx) { drawCactus(ctx, 480 + k * 220, yy, 0.9 + k); });
      })(y, pick);
    } else if (pick < 0.7) {
      (function (yy, k) {
        var w = 200 + k * 260;
        addCustom(W, 560 + w / 2, yy + 90, function (ctx) {
          drawMesa(ctx, 560, yy, w, 180, 150 + k * 190);
        });
      })(y, pick);
    } else if (pick < 0.85) {
      (function (yy) {
        addGroundPatch(W, 420, yy, 300, 170, '#d5a361');       // dry scrub
      })(y);
    }

    // the far side of the road
    var other = nextNumber();
    if (other < 0.4) {
      (function (yy, k) {
        addCustom(W, -220, yy, function (ctx) { drawCactus(ctx, -220 - k * 120, yy, 0.9 + k * 0.7); });
      })(y, other);
    } else if (other < 0.62) {
      (function (yy, k) {
        addCustom(W, -420, yy + 90, function (ctx) {
          drawMesa(ctx, -560, yy, 260 + k * 200, 180, 170 + k * 200);
        });
      })(y, other);
    }
  }

  var taxi = { x: 160, y: 520, doorOpen: 0 };
  addCustom(W, 210, 620, function (ctx) { drawTaxi(ctx, taxi); });
  var taxiProp = W.props[W.props.length - 1];
  taxiProp.update = function () {
    this.cx = taxi.x + 48;
    this.cy = taxi.y + 105;
    this.depth = this.cx + this.cy;
  };

  var time = 0;
  var DURATION = 8;
  var scene = { name: 'taxiride', world: W, allowMove: false, cutscene: true };

  scene.enter = function (g) {
    taxi.y = 520;
    camera.zoom = 0.78;
    camera.x = taxi.x + 240;
    camera.y = taxi.y + 150;
    g.setObjective('');
    g.showCaption('Douglas makes his great escape...');
    g.showBars(true);
  };

  scene.update = function (dt, g) {
    time += dt;

    var speed = 470;
    if (time < 1) speed *= time;
    if (time > DURATION - 1.4) speed *= Math.max(0.12, (DURATION - time) / 1.4);
    taxi.y -= speed * dt;

    if (time > 3.6 && time < 3.7) g.showCaption('Wait... this is not the way home.');
    if (time > 6.2 && time < 6.3) g.showCaption('Is that... sand?');

    for (var i = 0; i < W.props.length; i++) {
      if (W.props[i].update) W.props[i].update();
    }

    camera.x = taxi.x + 240;
    camera.y = taxi.y + 150;

    if (time >= DURATION) g.goTo('desert');
  };

  scene.skip = function (g) { g.goTo('desert'); };

  return scene;
};

/* ================================================================== */
/* 8. THE DESERT -- the taxi drives off without him                   */
/* ================================================================== */

Scenes.desert = function (game) {
  var W = makeWorld();
  W.sky = '#e7bd82';

  addGroundPatch(W, -2000, -3000, 5000, 5000, '#e0b070');
  addGroundPatch(W, 60, -3000, 200, 5000, '#8a6a4a');
  for (var ry = 900; ry > -2400; ry -= 130) {
    addGroundPatch(W, 154, ry, 12, 70, '#e8c85a');
  }

  addCustom(W, 520, 620, function (ctx) { drawCactus(ctx, 520, 620, 1.3); });
  addCustom(W, 700, 300, function (ctx) { drawCactus(ctx, 700, 300, 1.0); });
  addCustom(W, 380, 940, function (ctx) { drawCactus(ctx, 380, 940, 1.1); });
  addCustom(W, -200, 700, function (ctx) { drawCactus(ctx, -200, 700, 1.2); });
  addCustom(W, 900, 190, function (ctx) { drawMesa(ctx, 760, 100, 380, 200, 280); });
  addCustom(W, -520, 290, function (ctx) { drawMesa(ctx, -680, 200, 320, 180, 230); });

  var taxi = { x: 160, y: 560, doorOpen: 0 };
  addCustom(W, 210, 660, function (ctx) { drawTaxi(ctx, taxi); });
  var taxiProp = W.props[W.props.length - 1];
  taxiProp.update = function () {
    this.cx = taxi.x + 48;
    this.cy = taxi.y + 105;
    this.depth = this.cx + this.cy;
  };

  W.bounds = { x1: -600, y1: 300, x2: 1100, y2: 1100 };

  var time = 0;
  var scene = { name: 'desert', world: W, allowMove: true };

  scene.enter = function (g) {
    taxi.y = 560;
    g.douglas.x = 330;
    g.douglas.y = 700;
    g.douglas.faceX = -1;
    g.douglas.faceY = 0.2;
    camera.x = g.douglas.x;
    camera.y = g.douglas.y;
    camera.zoom = 0.85;
    g.setObjective('Er... this is not school.');
    g.douglas.speak('Hey! Come back!', 3);
  };

  scene.update = function (dt, g) {
    time += dt;

    // the taxi drives off up the road and leaves him there
    if (time > 1.2) taxi.y -= 220 * dt;
    for (var i = 0; i < W.props.length; i++) {
      if (W.props[i].update) W.props[i].update();
    }

    if (time > 4 && time < 4.1) g.douglas.speak('...', 2.5);
    if (time > 7) g.finish();

    camera.x += (g.douglas.x - camera.x) * Math.min(1, dt * 3);
    camera.y += (g.douglas.y - camera.y) * Math.min(1, dt * 3);
  };

  return scene;
};
