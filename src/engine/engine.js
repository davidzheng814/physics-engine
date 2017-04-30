var _isBrowser = typeof window !== 'undefined' && window.location;

var colors = [
  'blue', 'red', 'green', '#ffff00', 'black', 'orange'
]

var SEND_PFX = "SEND:";

var ACTIONS = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  UP: 'UP',
  DOWN: 'DOWN',
  NONE: 'NONE',
  STOP: 'STOP',
  END: 'END'
}

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
  Bodies = Matter.Bodies;

var method = Simulator.prototype;

function Simulator(elt, num_bodies, width, height) {
  this.elt = elt || null;
  this.num_bodies = num_bodies || 2;
  this.width = width || 400;
  this.height = height || 400;
  this.init();
}

method.init = function () {
  var engine = this.engine = Engine.create();
  engine.world.gravity.y = 0;

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

    $(document).keydown((e) => {
      switch(e.which) {
        case 37: // left
          this.actions.push(ACTIONS.LEFT);
          break;
        case 38: // up
          this.actions.push(ACTIONS.UP);
          break;
        case 39: // right
          this.actions.push(ACTIONS.RIGHT);
          break;
        case 40: // down
          this.actions.push(ACTIONS.DOWN);
          break;
        case 83: // stop
          this.actions.push(ACTIONS.STOP);
          break;
      }
      e.preventDefault();
    });
  } else {
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
  renderOptions.showAngleIndicator = false;
  renderOptions.showIds = false;
  renderOptions.showShadows = false;
  renderOptions.showVertexNumbers = false;
  renderOptions.showConvexHulls = false;
  renderOptions.showInternalEdges = false;
  renderOptions.showSeparations = false;
  renderOptions.background = '#fff';

  this.actions = [];
  var thickness = 50;
  var wall_config = { isStatic: true, restitution: 1, mass: 1000, inverseMass: 1/1000.};
  this.walls = [
    Bodies.rectangle(this.width/2., -thickness/2., this.width, thickness, wall_config), // top
    Bodies.rectangle(this.width/2., this.height+thickness/2., this.width, thickness, wall_config), // bottom
    Bodies.rectangle(this.height+thickness/2., this.height/2., thickness, this.height, wall_config), // right
    Bodies.rectangle(-thickness/2., this.height/2., thickness, this.height, wall_config) // left
  ];

  this.generateObjects()

  // add all of the bodies to the world
  World.add(engine.world, this.walls);
  World.add(engine.world, this.bodies);

}

method.applyAction = function () {
  if (this.actions.length == 0) return;
  var action = this.actions[0];
  var force;
  var strength = 20;
  switch (action) {
    case ACTIONS.LEFT:
      vel = {x:-strength, y:0};
      break;
    case ACTIONS.UP:
      vel = {x:0, y:-strength};
      break;
    case ACTIONS.RIGHT:
      vel = {x:strength, y:0};
      break;
    case ACTIONS.DOWN:
      vel = {x:0, y:strength};
      break;
    case ACTIONS.STOP:
      vel = {x:0, y:0};
      break;
  }
  Matter.Body.setVelocity(this.my_body, vel);
};

method.clearActions = function () {
  this.actions = [];
}

method.runEngine = function () {
  if (_isBrowser) {
    setInterval(() => {
      this.applyAction();
      this.clearActions();
      Engine.update(this.engine, 1000 / 200);
    }, 50);
  } else {
    while (true) {
      Engine.update(this.engine, 1000 / 60);
    }
  }
}

method.runEngineStep = function (action) {
  if (!_isBrowser) {
    if (action != ACTIONS.NONE) {
      this.actions.push(action);
      this.applyAction();
      this.clearActions();
    }
    Engine.update(this.engine, 1000 / 20);
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
        var payload = {
          filename: filename,
          actor: get_info(this.my_body),
          obj1: get_info(this.bodies[1])
        };
        var msg = SEND_PFX + JSON.stringify(payload) + "\n";
        console.log(msg);
        child.stdin.write(msg);
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

method.generateObjects = function () {
  var boundRadius = 75;
  var radius = 50;
  this.bodies = [];
  this.positions = [];
  for (var i = 0; i < this.num_bodies; ++i) {
    var x, y;
    while (true) { // generates an non-overlapping position. 
      x = Math.round(radius + Math.random() * (this.width - 2 * radius));
      y = Math.round(radius + Math.random() * (this.height - 2 * radius));
      var success = true;
      for (var j = 0; j < this.bodies.length; ++j) {
        if (euc_dist(this.positions[j], [x, y]) <= 2 * boundRadius) {
          success = false;
          break;
        }
      }
      if (success) break;
    }
    var config = { restitution: 1, friction:0, frictionAir: 0, render: {
      fillStyle: colors[i],
    }};
    var body = Bodies.circle(x, y, radius, config);
    if (i == 0) {
      Body.setMass(body, 5);
    } else {
      var mass = 2 + Math.floor(Math.random() * 3); // uniform over {2, 3, 4}
      Body.setMass(body, mass);
    }
    Body.setInertia(body, 10000);
    // add body and position
    this.positions.push([x, y]);
    this.bodies.push(body);
  }
  this.my_body = this.bodies[0];
}

function runFromCommandLine(filename) {
  var simulator = new Simulator();
  simulator.runRenderStep(filename+'_0.png');
  var i = 1;
  rl.on('line', (line) => {
    console.log("RECEIVED:",line);
    if (!line.startsWith(SEND_PFX)) return;
    line = line.substring(SEND_PFX.length);

    if (line === ACTIONS.END) {
      rl.close();
      process.exit(0);
    }
    var action = line.trim().toUpperCase();
    if ([ACTIONS.UP,ACTIONS.DOWN,ACTIONS.RIGHT,ACTIONS.LEFT,ACTIONS.STOP,ACTIONS.NONE]
        .indexOf(action) == -1) return;
    simulator.runRenderStep(filename+'_'+i+'.png');
    simulator.runEngineStep(action);
    ++i;
  });
}

if (!_isBrowser) {
  var optionator = require('optionator')({
    options: [{
      option: 'filename',
      alias: 'f',
      type: 'String',
      description: 'base of filename',
      required: true
    }, {
      option: 'process' ,
      alias: 'p',
      type: 'String',
      description: 'child process',
      required: false
    }]
  });
  // process invalid optiosn
  try {
      var args = optionator.parseArgv(process.argv);
  } catch(e) {
      console.log(optionator.generateHelp());
      console.log(e.message)
      process.exit(1)
  }

  var input = process.stdin;
  var output = process.stdout;
  if (args.process) {
    var tokens = args.process.split(' ');
    var child = child_process.spawn(tokens[0], tokens.splice(1));
    input = child.stdout;
    output = child.stdin;
    var child_err = child.stderr;
  }

  var rl_err = readline.createInterface({
    input: child_err,
    terminal: false
  });

  rl_err.on('line', (msg) => {
    console.log(msg);
  });

  var rl = readline.createInterface({
    input: input,
    output: output,
    terminal: false
  });

  runFromCommandLine(args.filename);
}
