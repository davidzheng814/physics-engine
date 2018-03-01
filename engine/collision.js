var Matter = require('matter-js');
var Renderer = require('./render');
var Simulator = require('./model').Simulator;

var Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Composite = Matter.Composite,
  Body = Matter.Body,
  Vector = Matter.Vector,
  Events = Matter.Events,
  Bodies = Matter.Bodies;

function uniform(a, b) {
  return a + Math.random() * (b - a);
}

function geo_uniform(a, b) {
  return a * (b / a) ** Math.random()
}

function ke(body) {
  return 0.5 * body.mass * Vector.magnitudeSquared(body.velocity);
}

class CollisionSimulator extends Simulator {
  constructor(args) {
    super(args);
    this.minMass = args.minMass;
    this.maxMass = args.maxMass;
    this.oneRestitution = args.oneRestitution;
    this.minRestitution = args.minRestitution;
    this.maxRestitution = args.maxRestitution;

    this.minCollide = args.minCollide;
    this.allCollide = args.allCollide;
    this.fixFirst = args.fixFirst;
    this.colWindowStart = args.colWindowStart;
    this.colWindowEnd = args.colWindowEnd;
    // this.maxVel = 9; // TODO hardcoded
    this.maxVel = 15; // TODO hardcoded
    this.initEncs();
    this.initWorld();

    // Events.on(this.engine, 'collisionStart', (event) => {
    //   var bodyA = event.pairs[0].bodyA;
    //   var bodyB = event.pairs[0].bodyB;
    //   var collision = event.pairs[0].collision;
    //   if (!bodyA.label.startsWith('Circle') || !bodyB.label.startsWith('Circle')) return;
    //   console.log("Col:", collision.normal);
    // });
  }

  initWorld() {
    super.initWorld();
    var thickness = 50;
    var wall_config = { isStatic: true, restitution: 1, mass: Infinity};
    this.walls = [
      Bodies.rectangle(this.width/2., -thickness/2., this.width, thickness, wall_config), // top
      Bodies.rectangle(this.width/2., this.height+thickness/2., this.width, thickness, wall_config), // bottom
      Bodies.rectangle(this.width+thickness/2., this.height/2., thickness, this.height, wall_config), // right
      Bodies.rectangle(-thickness/2., this.height/2., thickness, this.height, wall_config) // left
    ];
    World.add(this.engine.world, this.walls);
  }

  nextStep() {
    var vels_0 = this.bodies.map(x => Vector.clone(x.velocity));
    super.nextStep();
    var vels_f = this.bodies.map(x => Vector.clone(x.velocity));
    var collided = [];
    var wall_collided = [];

    for (var i = 0; i < this.numBodies; ++i) {
      if (Math.abs(Math.abs(vels_f[i].x) - Math.abs(vels_0[i].x)) >= 1e-7 &&
          Math.abs(Math.abs(vels_f[i].y) - Math.abs(vels_0[i].y)) >= 1e-7) {
        collided.push(i);
      }
    }

    for (var i = 0; i < this.numBodies; ++i) {
      if (Vector.magnitude(Vector.sub(vels_f[i], vels_0[i])) > 1e-5) {
        wall_collided.push(i);
      }
    }

    if (collided.length >= 2) this.collisions.push([this.step-1, collided.slice(0, 2)]);
    if (wall_collided.length == 1) this.wall_collisions.push([this.step, wall_collided[0]]);
  }

  initEncs(meanOnly=false) {
    this.masses = [];
    for (var i = 0; i < this.numBodies; ++i) {
      var mass = (i == 0 || meanOnly) 
        ? 1
        : geo_uniform(this.minMass, this.maxMass);
      this.masses.push(mass);
      if ('bodies' in this) {
        Body.setMass(this.bodies[i], mass);
      }
    }

    if (!this.oneRestitution) {
      this.restitutions = [];
      for (var i = 0; i < this.numBodies; ++i) {
        var restitution = (i == 0 || meanOnly) 
          ? (this.minRestitution + this.maxRestitution) / 2
          : uniform(this.minRestitution, this.maxRestitution);
        this.restitutions.push(restitution);
        if ('bodies' in this) {
          this.bodies[i].restitution = restitution;
        }
      }
    }

    this.collisions = [];
    this.wall_collisions = [];
  }

  getKineticEnergy() {
    var ke = 0;
    for (var body of this.bodies) {
        ke += 0.5 * body.mass * Vector.magnitudeSquared(body.velocity);
    }
    return ke;
  };

  getEncs() {
    if (this.oneRestitution) return this.masses;
    return this.masses.concat(this.restitutions);
  }

  resetState(lastReset=false) {
    super.resetState(lastReset);
    this.initKE = this.getKineticEnergy();
    this.collisions = [];
    this.wall_collisions = [];
  }

  isValidObs() {
    // if (Math.abs(this.getKineticEnergy() - this.initKE) > 1e-4) {
    //     return false;
    // }

    var connectedObjs = [0];
    var nextObjs = [0];
    while (nextObjs.length > 0) {
      var cur_obj = nextObjs.pop();
      for (var col of this.collisions.map(x=>x[1])) {
        if (col[0] == cur_obj && connectedObjs.indexOf(col[1]) == -1) {
            connectedObjs.push(col[1]);
            nextObjs.push(col[1]);
        } else if (col[1] == cur_obj && connectedObjs.indexOf(col[0]) == -1) {
          connectedObjs.push(col[0]);
          nextObjs.push(col[0]);
        }
      }
    }

    if (connectedObjs.length != this.numBodies) return false;

    if (this.oneRestitution) return true;

    var restKnownObjs = []; // true if object i has a restitution that is known. 
    for (var i = 0; i < this.numBodies; ++i) {
      restKnownObjs.push(false);
    }

    for (var col of this.collisions.map(x => x[1])) {
      if (this.bodies[col[0]].restitution < this.bodies[col[1]].restitution) {
        restKnownObjs[col[1]] = true;
      } else {
        restKnownObjs[col[0]] = true;
      }
    }

    for (var col_obj of this.wall_collisions.map(x => x[1])) {
      restKnownObjs[col_obj] = true;
    }

    var numRestKnownObjs = 0;
    for (var i = 0; i < this.numBodies; ++i) {
      if (restKnownObjs[i]) numRestKnownObjs++;
    }

    // return numRestKnownObjs == this.numBodies - 1;
    return numRestKnownObjs == this.numBodies;
  }

  isValidRo() {
    // if (Math.abs(this.getKineticEnergy() - this.initKE) > 1e-4) {
    //     return false;
    // }
    return this.collisions.length >= this.numBodies - 1;
  }

  collides() {
    return true;
  }
};

module.exports = CollisionSimulator;

