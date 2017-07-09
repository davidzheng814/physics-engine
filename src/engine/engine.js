var _isBrowser = typeof window !== 'undefined' && window.location;

var colors = [
  'blue', 'red', 'green', '#ffff00', 'black', 'orange'
]

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
  Events = Matter.Events,
  Bodies = Matter.Bodies;

var method = Simulator.prototype;

var logger = function()
{
    var oldConsoleLog = null;
    var pub = {};

    pub.enableLogger =  function enableLogger() 
                        {
                            if(oldConsoleLog == null)
                                return;

                            console.log = oldConsoleLog;
                        };

    pub.disableLogger = function disableLogger()
                        {
                            oldConsoleLog = console.log;
                            console.log = function() {};
                        };

    return pub;
}();

function Simulator(elt, num_bodies, width, height) {
  this.elt = elt || null;
  this.num_bodies = num_bodies || 2;
  this.width = width || 500;
  this.height = height || 500;
  this.maxVel = 25;
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
  renderOptions.showAngleIndicator = false;
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

  this.generateObjects();

  // add all of the bodies to the world
  World.add(engine.world, this.walls);
  World.add(engine.world, this.bodies);

  this.hasCollision = false;
  this.firstCollision = -1;
  Events.on(this.engine, 'collisionStart', (event) => {
    var pairs = event.pairs;
    for (var i = 0; i < pairs.length; ++i) {
      var pair = pairs[i];
      if (pair.bodyA.label == 'Circle Body' && pair.bodyB.label == 'Circle Body') {
        if (!this.hasCollision) {
          this.hasCollision = true;
          this.firstCollision = this.step;
        }
      }
    }
  });
}

method.runEngine = function () {
  if (_isBrowser) {
    setInterval(() => {
      this.clearActions();
      Engine.update(this.engine, 1000 / 200);
    }, 50);
  } else {
    while (true) {
      Engine.update(this.engine, 1000 / 60);
    }
  }
}

method.runEngineStep = function () {
  if (!_isBrowser) {
    Engine.update(this.engine, 1000 / 60);
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
    var config = { restitution: 1.00, friction:0, frictionAir: 0, frictionStatic:0, render: {
      fillStyle: colors[i],
    }};
    var body = Bodies.circle(x, y, radius, config);

    if (i == 0) {
      var mass = 2 + Math.random() * 10; // uniform over [2,12]
      Body.setMass(body, mass);
    } else {
      var mass = 2 + Math.random() * 10; // uniform over [2,12]
      Body.setMass(body, 7);
    }

    Body.setInertia(body, Infinity);

    var vel_x = -15 + Math.random() * 30;
    var vel_y = -15 + Math.random() * 30;
    Body.setVelocity(body, {x: vel_x, y:vel_y});

    // add body and position
    this.positions.push([x, y]);
    this.bodies.push(body);
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

function run(numSteps, outputBase, idx, imageBase) {
  var simulator = new Simulator();

  var states = [];
  var data = {states: states, masses:simulator.bodies.map(x => x.mass)};
  for (var i = 0; i < numSteps; ++i) {
    simulator.step = i;
    simulator.runEngineStep();
    if (imageBase) {
      simulator.runRenderStep(imageBase+'_'+idx+'_'+i+'.png');
    }
    var state = getJsonState(simulator);
    states.push(state);
  }
  writeToFile(data, outputBase+'_'+idx+'.json');

  return {
    hasCollision: simulator.hasCollision,
    firstCollision: simulator.firstCollision
  };
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
      option: 'num-timesteps',
      alias: 't',
      type: 'Int',
      description: 'num time steps',
      required: true
    }, {
      option: 'num-groups',
      alias: 'n',
      type: 'Int',
      description: 'num groups',
      required: true
    }, {
      option: 'output-base',
      alias: 'o',
      type: 'String',
      description: 'base of json output',
      required: true
    }]
  });
  // process invalid options
  try {
      var args = optionator.parseArgv(process.argv);
  } catch(e) {
      console.log(optionator.generateHelp());
      console.log(e.message)
      process.exit(1)
  }

  var count = 0;
  var tot = 0;
  for (var idx = 0; idx < args.numGroups; ++idx) {
    res = run(args.numTimesteps, args.outputBase, idx, args.imageBase);
    if (!res.hasCollision) {
      --idx;
    } else {
      console.log(idx);
    }
  }
}
