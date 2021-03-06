var _isBrowser = typeof window !== 'undefined' && window.location;

var colors = [
  'blue', 'red', 'green', '#ffff00', 'black', 'orange'
]

var extra_colors = [
  '#add8e6', '#fca1a1', '#a1fca7', '#ffff00', 'black', 'orange'
]

if (!_isBrowser) {
  var Matter = require('matter-js');
  var PImage = require('pureimage');
  var fs = require('fs');
  var path = require('path');
  var readline = require('readline');
  var child_process = require('child_process');
}

var Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Composite = Matter.Composite,
  Body = Matter.Body,
  Vector = Matter.Vector,
  Events = Matter.Events,
  Bodies = Matter.Bodies;

var method = Simulator.prototype;

var oldConsoleLog = null;
var logger = {
  enableLogger: function () {
     if(oldConsoleLog == null) return;
     console.log = oldConsoleLog;
  }, 
  disableLogger: function () {
    oldConsoleLog = console.log;
    console.log = function() {};
  }
};

numBodies = 3;
radius = 70.;

function Simulator(extra_objs=false) {
  this.elt = null;
  this.numBodies = numBodies;
  this.width = 512;
  this.height = 512;
  this.maxVel = 25;
  this.init(extra_objs);
  this.step = 0;
}

method.init = function (extra_objs) {
  var engine = this.engine = Engine.create();
  engine.world.gravity.y = 0;
  engine.world.gravity.x = 0;

  if (_isBrowser) {
    var render = this.render = Render.create({
      element: this.elt,
      engine: engine,
      options: {
        showAngleIndicator: false,
        wireframes: true,
        width: this.width * 2,
        height: this.height * 2,
      }
    });
  } else {
    logger.disableLogger();
    var pcanvas = PImage.make(this.width, this.height);
    pcanvas.style = {}  
    var render = this.render = Render.create({
      element: 17, // dummy
      canvas: pcanvas,
      engine: this.engine,
    });
    this.render.hasBounds = true;
    this.render.options.height = this.height;
    this.render.options.width = this.width;
    this.render.canvas.height = this.height;
    this.render.canvas.width = this.width;
    logger.enableLogger();
  }

  var renderOptions = this.render.options;
  renderOptions.wireframes = false;
  renderOptions.hasBounds = false;
  renderOptions.showDebug = false;
  renderOptions.showBroadphase = false;
  renderOptions.showBounds = false;
  renderOptions.showVelocity = false;
  renderOptions.showCollisions = false;
  renderOptions.showAxes = false;
  renderOptions.showPositions = false;
  renderOptions.showAngleIndicator = true;
  renderOptions.showIds = false;
  renderOptions.showShadows = false;
  renderOptions.showVertexNumbers = false;
  renderOptions.showConvexHulls = false;
  renderOptions.showInternalEdges = false;
  renderOptions.showSeparations = false;
  renderOptions.background = '#fff';

  var thickness = 50;
  var wall_config = { isStatic: true, restitution: 1, mass: Infinity};
  this.walls = [
    Bodies.rectangle(this.width/2., -thickness/2., this.width, thickness, wall_config), // top
    Bodies.rectangle(this.width/2., this.height+thickness/2., this.width, thickness, wall_config), // bottom
    Bodies.rectangle(this.width+thickness/2., this.height/2., thickness, this.height, wall_config), // right
    Bodies.rectangle(-thickness/2., this.height/2., thickness, this.height, wall_config) // left
  ];

  if (extra_objs) {
    this.generateObjects(true);
    World.add(engine.world, this.extra_bodies);
  }

  this.generateObjects();
  World.add(engine.world, this.bodies);
  World.add(engine.world, this.walls);

  this.collisions = [];
  var getBodyInd = (x) => parseInt(x.label.split(" ")[1]);
  // Events.on(this.engine, 'collisionStart', (event) => {
  //   var pairs = event.pairs;
  //   for (var i = 0; i < pairs.length; ++i) {
  //     var pair = pairs[i];
  //     if (pair.bodyA.label.startsWith('Circle') &&
  //       pair.bodyB.label.startsWith('Circle')) {
  //       var inds = [getBodyInd(pair.bodyA), getBodyInd(pair.bodyB)];
  //       inds.sort();
  //       this.collisions.push([this.step, inds]);
  //     }
  //   }
  // });
}

method.runEngineStep = function () {
  if (!_isBrowser) {
    var vels0 = this.bodies.map((x) => ({x:x.velocity.x, y:x.velocity.y}));
    Engine.update(this.engine, 1000 / 120);
    var vels_f = this.bodies.map((x) => ({x:x.velocity.x, y:x.velocity.y}));
    var collided = [];
    for (var i = 0; i < numBodies; ++i) {
      if (Math.abs(Math.abs(vels_f[i].x) - Math.abs(vels0[i].x)) >= 1e-7 &&
          Math.abs(Math.abs(vels_f[i].y) - Math.abs(vels0[i].y)) >= 1e-7) {
        collided.push(true);
      } else {
        collided.push(false);
      }
    }

    for (var i = 0; i < numBodies; ++i) {
      for (var j = i+1; j < numBodies; ++j) {
        if (collided[i] && collided[j]) {
          this.collisions.push([this.step, [i, j]]);
        }
      }
    }
  }
}

method.runRenderStep = function (filename) {
  if (!_isBrowser) {
    Render.world(this.render);
    PImage.encodePNG(this.render.canvas, fs.createWriteStream(filename),
      (err) => {
        var get_info = (body) => {
          return { 
            pos: [Math.round(body.position.x), Math.round(body.position.y)],
            mass: Math.round(body.mass)
					};
        };
    });
  }
}

method.runRender = function () {
  if (_isBrowser) {
    Render.run(this.render);
  }
}

function euc_dist(p1, p2) {
    var x2 = Math.pow(p1[0] - p2[0], 2),
        y2 = Math.pow(p1[1] - p2[1], 2);
    return Math.sqrt(x2 + y2);
}

method.generateObjects = function (extra_objs=false) {
  if (extra_objs) {
    this.extra_bodies = [];
    var bodies = this.extra_bodies;
  } else {
    this.bodies = [];
    var bodies = this.bodies;
  }

  for (var i = 0; i < this.numBodies; ++i) {
    var config = { restitution: 1.00, friction:0, frictionAir: 0, frictionStatic:0, render: {
      fillStyle: extra_objs ? extra_colors[i] : colors[i],
    }};
    var body = Bodies.circle(0, 0, radius, config);
    Body.set(body, 'label', 'Circle '+i);

    // if (i == 0) {
      // var mass = 5;
    // var mass = 7;
      // } else {
      // var mass = 5 * Math.pow(2, -2 + Math.random() * 4);
    var mass = 2 + Math.random() * 10;
    // }

    Body.setMass(body, mass);
    Body.setInertia(body, Infinity);

    // add body and position
    bodies.push(body);
  }
}

method.resetState = function() {
  var padding = 0.2 * this.width;
  var positions = [];
  this.step = 0;
  for (var i = 0; i < this.numBodies; ++i) {
    var x, y;
    while (true) { // generates an non-overlapping position. 
      x = Math.round(padding + Math.random() * (this.width - 2 * padding));
      y = Math.round(padding + Math.random() * (this.height - 2 * padding));
      var success = true;
      for (var j = 0; j < positions.length; ++j) {
        if (euc_dist(positions[j], [x, y]) <= 2.5 * radius) {
          success = false;
          break;
        }
      }
      if (success) break;
    }
    positions.push([x, y]);
    Body.setPosition(this.bodies[i], {x:x, y:y});

    var vel_x = -9 + Math.random() * 18;
    var vel_y = -9 + Math.random() * 18;
    Body.setVelocity(this.bodies[i], {x: vel_x, y:vel_y});
  }
}

function getJsonState(simulator) {
  // extract position/velocity/mass
  return {
    pos: simulator.bodies.map(obj => {return {
      x:obj.position.x / simulator.width, y:obj.position.y / simulator.height}}),
    vel: simulator.bodies.map(obj => {return {
      x:obj.velocity.x / simulator.maxVel, y:obj.velocity.y / simulator.maxVel}}),
  }
}

function writeToFile(data, outputFile) {
  text = JSON.stringify(data);
  fs.writeFileSync(outputFile, text);
}

function simulate(numEncodeSteps, numPredSteps, outputBase, idx, imageBase) {
  var simulator = new Simulator();
  simulator.resetState();

  console.log("Ind:", idx, "Masses:", simulator.bodies.map(x => x.mass));

  var enc_states = [];
  var data = {
    enc_states: enc_states,
    masses:simulator.bodies.map(x => x.mass),
    enc_collisions:simulator.collisions,
    all_states:[],
    all_collisions:[],
  };

  var frame_count = 0;
  for (var i = 0; i < numEncodeSteps; ++i) {
    simulator.runEngineStep();
    if (imageBase) {
      simulator.runRenderStep(imageBase+'_'+idx+'_'+frame_count+'.png');
      ++frame_count;
    }
    var state = getJsonState(simulator);
    enc_states.push(state);
    ++simulator.step;
  }

  if (!isValidEncode(data.enc_collisions)) {
    return false;
  };

  for (var i = 0; i < numBodies; ++i) {
    for (var j = i+1; j < numBodies; ++j) {
      var start_frame_count = frame_count;
      while (true) {
        simulator.collisions = [];
        simulator.resetState();
        var states = [];
        for (var t = 0; t < numPredSteps; ++t) {
          simulator.runEngineStep();
          if (imageBase) {
            simulator.runRenderStep(imageBase+'_'+idx+'_'+frame_count+'.png');
            ++frame_count;
          }
          var state = getJsonState(simulator);
          states.push(state);
          ++simulator.step;
        }

        if (isValidPred(simulator.collisions, i, j)) {
          break;
        } else {
          frame_count = start_frame_count;
        }
      }
      data.all_states.push(states);
      data.all_collisions.push(simulator.collisions);
    }
  }

  return data;
}

function render(data, imageBase) {
  var simulator = new Simulator(true);
  for (var i = 0; i < data.states.length; ++i) {
    for (var j = 0; j < simulator.bodies.length; ++j) {
      var pos = data.states[i].pos[j];
      pos['x'] *= simulator.width;
      pos['y'] *= simulator.height;
      Body.setPosition(simulator.bodies[j], data.states[i].pos[j]);

      var pos = data.true_states[i].pos[j];
      pos['x'] *= simulator.width;
      pos['y'] *= simulator.height;
      Body.setPosition(simulator.extra_bodies[j], data.true_states[i].pos[j]);
    }
    simulator.runRenderStep(imageBase+'_'+i+'.png')
  }
}

function isValidEncode(enc_collisions) {
  var uniq_col_objs = [];
  for (var col of enc_collisions) {
    var col_objs = col[1];
    var success = true;
    for (var uniq_col of uniq_col_objs) {
      if (col_objs[0] == uniq_col[0] && col_objs[1] == uniq_col[1]) {
        success = false;
        break;
      }
    }
    if (success) uniq_col_objs.push(col_objs);
  }
  return uniq_col_objs.length >= numBodies;
}

function isValidPred(pred_collisions, i, j) {
  for (var collision of pred_collisions) {
    if (collision[0] < 5) continue;
    if (collision[0] >= args.collisionWindow) {
      break;
    }

    if(collision[1][0] == i && collision[1][1] == j) {
      return true;
    }
  }
  return false;
}

if (!_isBrowser) {
  var optionator = require('optionator')({
    options: [{
      option: 'image-base',
      alias: 'i',
      type: 'String',
      description: 'base of filename',
      required: false
    }, {
      option: 'num-encode-steps',
      alias: 'e',
      type: 'Int',
      description: 'num encode steps',
      required: false
    }, {
      option: 'num-pred-steps',
      alias: 'p',
      type: 'Int',
      description: 'num pred steps',
      required: false
    }, {
      option: 'collision-window',
      alias: 'c',
      type: 'Int',
      description: 'number of steps in pred before collision needs to happen',
      required: false
    }, {
      option: 'num-groups',
      alias: 'n',
      type: 'Int',
      description: 'num groups',
      required: false
    }, {
      option: 'output-base',
      alias: 'o',
      type: 'String',
      description: 'base of json output',
      required: false
    }, {
      option: 'state-file',
      type: 'String',
      description: 'file of states to render',
      required: false
    }, {
      option: 'start-idx',
      type: 'Int',
      alias: 's',
      description: 'Start index',
      required: false
    }]
  });
  // process invalid options
  try {
    args = optionator.parseArgv(process.argv);
  } catch(e) {
      console.log(optionator.generateHelp());
      console.log(e.message)
      process.exit(1)
  }

  if (args.stateFile) {
    fs.readFile(args.stateFile, function(err, data) {
      if (err) return console.log(err);
      data = JSON.parse(data);
      render(data, args.imageBase);

    });
  } else {
    for (var idx = args.startIdx; idx < args.numGroups; ++idx) {
      var data = simulate(args.numEncodeSteps, args.numPredSteps, args.outputBase, idx, args.imageBase);
      if (data) {
        writeToFile(data, args.outputBase+'_'+idx+'.json');
      } else {
        --idx;
      }
    }
  }
}
