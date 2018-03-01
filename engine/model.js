var Matter = require('matter-js');
var Renderer = require('./render');

var Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Composite = Matter.Composite,
  Body = Matter.Body,
  Vector = Matter.Vector,
  Events = Matter.Events,
  Bodies = Matter.Bodies;

var COLORS = [
  'blue', 'red', 'green', '#f76f00', '#8c008c', '#008dc9', '#89e1e7', '#fb86f2', '#794778', 
];

var EXTRA_COLORS = [
  '#add8e6', '#fca1a1', '#a1fca7', '#ff8b2d', '#c900c9', '#07b2fc'
];

function uniform(a, b) {
  return a + Math.random() * (b - a);
}

class Simulator {
  constructor(args) {
    this.numBodies = args.numBodies;
    this.width = args.width;
    this.height = args.height;
    this.maxVel = args.maxVel;
    this.bodyRadius = args.bodyRadius; 
    this.fr = 120;

    this.masses = [];
    for (var i = 0; i < this.numBodies; ++i) this.masses.push(1); // just a default value

    this.restitutions = [];
    for (var i = 0; i < this.numBodies; ++i) this.restitutions.push(1); // just a default value

    this.initEngine();
    this.renderer = new Renderer(this.engine, this.width, this.height);
  }

  initEngine() {
    var engine = this.engine = Engine.create();
    engine.world.gravity.y = 0;
    engine.world.gravity.x = 0;
  }

  collides() {
    throw "Not Implemented Error" // override
  }

  applyForce(a, b) {
  }

  getNewBody(id, extraObjs=false) {
    var config = {
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0, 
      render: {
        fillStyle: extraObjs ? EXTRA_COLORS[id] : COLORS[id],
      },
      collisionFilter: {
        group: this.collides(),
      },
      plugin: {
        attractors: [
          (a, b) => {this.applyForce(a, b)}
        ]
      }
    };

    var body = Bodies.circle(0, 0, this.bodyRadius, config);
    body.id = id;

    Body.set(body, 'label', 'Circle '+id);
    Body.setMass(body, this.masses[id]);
    Body.setInertia(body, Infinity);
    body.restitution = this.restitutions[id];

    return body;
  }

  initWorld() {
    this.bodies = [];
    for (var i = 0; i < this.numBodies; ++i) {
      var body = this.getNewBody(i);
      this.bodies.push(body);
    }
    World.add(this.engine.world, this.bodies);
  }

  initEncs(meanOnly=false) {
    throw "Not Implemented Error";
    // override
  }

  resetPos(lastReset, isCentered) {
    if (lastReset) {
      for (var i = 0; i < this.numBodies; ++i) {
        Body.setPosition(this.bodies[i], this.initPos[i]);
      }
      return;
    }

    var padding = this.bodyRadius + 10;

    // generate initial positions
    while (true) {
      var positions = [];
      var resetAll = false;
      var totalPos = {x:0, y:0};
      var totalMass = 0;
      var center = {x:this.width/2, y:this.height/2};
      for (var i = 0; i < this.numBodies; ++i) {
        if (resetAll) break;
        var failCount = 0;
        while (true) { // generates an non-overlapping position. 
          var x = Math.round(uniform(padding, this.width - padding));
          var y = Math.round(uniform(padding, this.height - padding));
          var pos = {x:x, y:y};
          var success = true;
          for (var j = 0; j < positions.length; ++j) {
            if (Vector.magnitude(Vector.sub(positions[j], pos)) <= 2*this.bodyRadius + 10) {
              success = false;
              break;
            }
          }
          if (success) {
            positions.push(pos);
            totalPos = Vector.add(totalPos, Vector.mult(pos, this.masses[i]));
            totalMass += this.masses[i]
            break;
          } else {
            failCount++;
            if (failCount >= 5) {
              failCount = 0;  
              resetAll = true;
              break;
            }
          }
        }
      }
      if (!resetAll) break;
    }

    // set adjusted positions.
    var centerOfMass = Vector.div(totalPos, totalMass);
    var adjustPos = isCentered ? Vector.sub(centerOfMass, center) : {x:0,y:0};

    this.initPos = [];
    for (var i = 0; i < this.numBodies; ++i) {
      this.initPos.push(Vector.sub(positions[i], adjustPos));
      Body.setPosition(this.bodies[i], this.initPos[i]);
    }
  }

  resetVel(lastReset, zeroMomentum) {
    if (lastReset) {
      for (var i = 0; i < this.numBodies; ++i) {
        Body.setVelocity(this.bodies[i], this.initVel[i]);
      }
      return;
    }

    var vels = [];
    var totalMomentum = {x:0, y:0};
    var totalMass = 0;
    for (var i = 0; i < this.numBodies; ++i) {
      var vel = {x:uniform(-this.maxVel, this.maxVel), y:uniform(-this.maxVel, this.maxVel)};
      totalMomentum = Vector.add(totalMomentum, Vector.mult(vel, this.masses[i]));
      totalMass += this.masses[i];
      vels.push(vel);
    }
    var avgVel = Vector.div(totalMomentum, totalMass);

    var adjustVel = zeroMomentum ? avgVel : {x:0,y:0};
    this.initVel = [];
    for (var i = 0; i < this.numBodies; ++i) {
      this.initVel.push(Vector.sub(vels[i], adjustVel));
      Body.setVelocity(this.bodies[i], this.initVel[i]);
    }
  }

  resetState(lastReset=false, isCentered=false, zeroMomentum=false) {
    this.resetPos(lastReset, isCentered);
    this.resetVel(lastReset, zeroMomentum);

    this.step = 0;
  }

  nextStep() {
    Engine.update(this.engine, 1000 / this.fr);
    ++this.step;
  }

  render(filename) {
    this.renderer.render(filename);
  }

  getEncs() {
    throw "Not Implemented Error" // override
  }

  getState() {
    return {
      pos: this.bodies.map(obj => Vector.clone(obj.position)),
      vel: this.bodies.map(obj => Vector.clone(obj.velocity)),
    }
  }

  isValidObs() {
    return true;
  }

  isValidRo() {
    return true;
  }
}

class RenderSimulator extends Simulator {
  constructor(args) {
    super(args);
    this.initWorld();
  }

  initWorld() {
    this.extraBodies = [];
    for (var i = 0; i < this.numBodies; ++i) {
      var body = this.getNewBody(i, true);
      this.extraBodies.push(body);
    }
    World.add(this.engine.world, this.extraBodies);
    super.initWorld();
  }

  collides() {
    return false;
  }

  initEncs() {
  }
}

module.exports = {
  RenderSimulator: RenderSimulator,
  Simulator: Simulator
}

