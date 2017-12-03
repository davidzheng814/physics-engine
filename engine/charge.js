var _isBrowser = typeof window !== 'undefined' && window.location;

var colors = [
  'blue', 'red', 'green', '#ffff00', 'black', 'orange'
]

var extra_colors = [
  '#add8e6', '#fca1a1', '#a1fca7', '#ffff00', 'black', 'orange'
]

if (!_isBrowser) {
  var Matter = require('matter-js');
  var MatterAttractors = require('matter-attractors');
  var PImage = require('pureimage');
  var fs = require('fs');
  var path = require('path');
  var readline = require('readline');
  var child_process = require('child_process');
  Matter.use(MatterAttractors);
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
radius = 35.;

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
  renderOptions.showAngleIndicator = false;
  renderOptions.showIds = false;
  renderOptions.showShadows = false;
  renderOptions.showVertexNumbers = false;
  renderOptions.showConvexHulls = false;
  renderOptions.showInternalEdges = false;
  renderOptions.showSeparations = false;
  renderOptions.background = '#fff';

  if (extra_objs) {
    this.generateObjects(true);
    World.add(engine.world, this.extra_bodies);
  }

  this.generateObjects();
  World.add(engine.world, this.bodies);

}

method.runEngineStep = function () {
  if (!_isBrowser) {
    var center = {x:this.width/2, y:this.height/2};
    // for (var body of this.bodies) {
    //   var force = Vector.sub(body.position, center);
    //   var mag = Vector.magnitude(force);
    //   force = Vector.mult(force, -1e-7 * mag);
    //   Body.applyForce(body, body.position, force);
    // }
    Engine.update(this.engine, 1000 / 240);
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

method.generateObjects = function (extra_objs=false) {
  if (extra_objs) {
    this.extra_bodies = [];
    var bodies = this.extra_bodies;
  } else {
    this.bodies = [];
    var bodies = this.bodies;
  }

  for (var i = 0; i < this.numBodies; ++i) {
    var config = { restitution: 1.00, friction:0, frictionAir: 0, frictionStatic:0, 
      render: {
        fillStyle: extra_objs ? extra_colors[i] : colors[i],
      },
      collisionFilter: {
        group: -1,
      },
      plugin: {
        attractors: [
          function(bodyA, bodyB) {
            var distx = (bodyB.position.x - bodyA.position.x);
            var disty = (bodyB.position.y - bodyA.position.y);
            var dist = Math.sqrt(distx * distx + disty * disty);
            var force = {
              x: bodyA.charge * bodyB.charge * distx / Math.pow(dist, 3),
              y: bodyA.charge * bodyB.charge * disty / Math.pow(dist, 3),
            }

            var maxForce = .01;
            if (Vector.magnitude(force) > maxForce) {
              force = Vector.mult(force, maxForce / Vector.magnitude(force));
            }

            Body.applyForce(bodyA, bodyA.position, force);
            Body.applyForce(bodyB, bodyB.position, Vector.neg(force));
          }
        ]
      }
    };

    var body = Bodies.circle(0, 0, radius, config);

    body.charge = uniform(10, 40);

    Body.set(body, 'label', 'Circle '+i);
    Body.setMass(body, 1);
    Body.setInertia(body, Infinity);

    // add body and position
    bodies.push(body);
  }
}

function uniform(a, b) {
  return a + Math.random() * (b - a);
}

method.resetState = function() {
  var padding = 0.2 * this.width;
  this.step = 0;
  var positions = [];
  var totalPos = {x:0, y:0};
  var center = {x:this.width/2, y:this.height/2};

  // generate initial positions
  for (var i = 0; i < this.numBodies; ++i) {
    while (true) { // generates an non-overlapping position. 
      var x = Math.round(uniform(padding, this.width - padding));
      var y = Math.round(uniform(padding, this.height - padding));
      var pos = {x:x, y:y};
      var success = true;
      for (var j = 0; j < positions.length; ++j) {
        if (Vector.magnitude(Vector.sub(positions[j], pos)) <= 2.5 * radius) {
          success = false;
          break;
        }
      }
      if (success) {
        positions.push(pos);
        totalPos = Vector.add(totalPos, pos);
        break;
      }
    }
  }

  // set adjusted positions.
  var adjustPos = Vector.sub(Vector.div(totalPos, this.numBodies), center);
  for (var i = 0; i < this.numBodies; ++i) {
    Body.setPosition(this.bodies[i], Vector.sub(positions[i], adjustPos));
  }

  // generate initial velocities
  var vels = [];
  var totalVel = {x:0, y:0};
  for (var i = 0; i < this.numBodies; ++i) {
    var vel = Vector.normalise(Vector.perp(Vector.sub(this.bodies[i].position, center)));
    vel = Vector.mult(vel, uniform(5, 10));
    vel = Vector.add(vel, {x:uniform(-1, 1), y:uniform(-1, 1)});

    totalVel = Vector.add(totalVel, vel);

    vels.push(vel);
  }

  var adjustVel = Vector.div(totalVel, this.numBodies);
  for (var i = 0; i < this.numBodies; ++i) {
    Body.setVelocity(this.bodies[i], Vector.sub(vels[i], adjustVel));
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

  console.log("Ind:", idx, "Charges:", simulator.bodies.map(x => x.charge));

  var enc_states = [];
  var data = {
    enc_states: enc_states,
    masses:simulator.bodies.map(x => x.charge),
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

  data.all_states.push(states);
  data.all_collisions.push(simulator.collisions);

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
      alias: 't',
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
    var args = optionator.parseArgv(process.argv);
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
