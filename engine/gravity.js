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

class GravitySimulator extends Simulator {
  constructor(args) {
    super(args);
    this.minMass = args.minMass;
    this.maxMass = args.maxMass;
    this.fr = 240;

    // this.maxVel = 9; // TODO hardcoded
    this.maxVel = 25; // TODO hardcoded
    this.initEncs();
    this.initWorld();
  }

  initWorld() {
    super.initWorld();
  }

  applyForce(bodyA, bodyB) {
    var constant = this.masses[bodyA.id] * this.masses[bodyB.id];
    var vec = Vector.sub(bodyB.position, bodyA.position);
    var disp = Math.max(Vector.magnitude(vec), 30);
    var mag = 1e-7 * constant * Math.pow(disp, 2);
    var force = Vector.mult(Vector.normalise(vec), mag);
    Body.applyForce(bodyA, bodyA.position, force);
    Body.applyForce(bodyB, bodyB.position, Vector.neg(force));
  }


  nextStep() {
    var vels_0 = this.bodies.map(x => Vector.clone(x.velocity));
    super.nextStep();
    var vels_f = this.bodies.map(x => Vector.clone(x.velocity));
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
  }

  getKineticEnergy() {
    var ke = 0;
    for (var body of this.bodies) {
        ke += 0.5 * body.mass * Vector.magnitudeSquared(body.velocity);
    }
    return ke;
  };

  getEncs() {
    console.log(this.masses);
    return this.masses;
  }

  resetState(lastReset=false) {
    super.resetState(lastReset, true, true);
    this.initKE = this.getKineticEnergy();
  }

  isValidObs() {
    return true;
  }

  isValidRo() {
    // if (Math.abs(this.getKineticEnergy() - this.initKE) > 1e-4) {
    //     return false;
    // }
    return true;
  }

  collides() {
    return false;
  }
};

module.exports = GravitySimulator;

