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
  'blue', 'red', 'green', '#ffff00', 'black', 'orange'
];

var EXTRA_COLORS = [
  '#add8e6', '#fca1a1', '#a1fca7', '#ffff00', 'black', 'orange'
];

function uniform(a, b) {
  return a + Math.random() * (b - a);
}

class Simulator {
  constructor(args) {
    this.numBodies = args.numBodies; // 3
    this.width = args.width; // 512 
    this.height = args.height; // 512
    this.maxVel = args.maxVel; // 25
    this.bodyRadius = args.bodyRadius; // 35

    this.masses = [];
    for (var i = 0; i < this.numBodies; ++i) this.masses.push(1); // just a default value

    this.initEngine();
    this.initEncs();
    this.initWorld();

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

  getNewBody(id, extraObjs=false) {
    var config = { restitution: 1.00, friction:0, frictionAir: 0, frictionStatic:0, 
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

  initEncs() {
    throw "Not Implemented Error";
    // override
  }

  resetPos(isCentered) {
    var padding = 0.2 * this.width;
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
          if (Vector.magnitude(Vector.sub(positions[j], pos)) <= 2.5*this.bodyRadius) {
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
    var adjustPos = isCentered ? Vector.sub(Vector.div(totalPos, this.numBodies), center) : 0;
    for (var i = 0; i < this.numBodies; ++i) {
      Body.setPosition(this.bodies[i], Vector.sub(positions[i], adjustPos));
    }
  }

  resetVel(zeroMomentum) {
    // generate initial velocities
    var vels = [];
    var totalVel = {x:0, y:0};
    for (var i = 0; i < this.numBodies; ++i) {
      var vel = {x:uniform(-this.maxVel, this.maxVel), y:uniform(-this.maxVel, this.maxVel)};
      totalVel = Vector.add(totalVel, vel);
      vels.push(vel);
    }

    var adjustVel = zeroMomentum ? Vector.div(totalVel, this.numBodies) : 0;
    for (var i = 0; i < this.numBodies; ++i) {
      Body.setVelocity(this.bodies[i], Vector.sub(vels[i], adjustVel));
    }
  }

  resetState(isCentered=false, zeroMomentum=false, maxVel=20) {
    this.resetPos(isCentered);
    this.resetVel(zeroMomentum);
    this.step = 0;
  }

  nextStep() {
    Engine.update(this.engine, 1000 / 120);
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
      pos: this.bodies.map(obj => obj.position),
      vel: this.bodies.map(obj => obj.velocity),
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
  initWorld() {
    super.initWorld();
    this.extraBodies = [];
    for (var i = 0; i < this.numBodies.length; ++i) {
      var body = this.getNewBody(i);
      this.extraBodies.push(body);
    }

    World.add(engine.world, this.extraBodies);
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
