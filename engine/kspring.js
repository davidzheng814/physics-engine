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

class SpringSimulator extends Simulator {
  constructor(args) {
    super(args);
    this.minCharge = args.minCharge;
    this.maxCharge = args.maxCharge;
    this.constant = args.constant;
    this.minDisplacement = args.minDisp;
    this.maxDisplacement = args.maxDisp;
    this.initEncs();
    this.initWorld();
  }

  applyForce(bodyA, bodyB) {
    var constant = this.constant * this.charges[bodyA.id] * this.charges[bodyB.id];
    var displacement = this.displacements[bodyA.id] + this.displacements[bodyB.id];
    var vec = Vector.sub(bodyB.position, bodyA.position);
    var mag = constant * (Vector.magnitude(vec) - displacement);
    var force = Vector.mult(Vector.normalise(vec), mag);
    Body.applyForce(bodyA, bodyA.position, force);
    Body.applyForce(bodyB, bodyB.position, Vector.neg(force));
  }

  initEncs(meanOnly=false) {
    this.charges = [];
    this.displacements = [];

    for (var i = 0; i < this.numBodies; ++i) {
      var charge = meanOnly 
        ? (this.minCharge + this.maxCharge) / 2
        : uniform(this.minCharge, this.maxCharge);
      var displacement = meanOnly 
        ? (this.minDisplacement + this.maxDisplacement) / 2
        : uniform(this.minDisplacement, this.maxDisplacement);

      this.charges.push(charge);
      this.displacements.push(displacement);
    }
  }

  getEncs() {
    var encs = [];
    for (var i = 0; i < this.numBodies; ++i) {
      encs.push(this.charges[i]);
    }
    for (var i = 0; i < this.numBodies; ++i) {
      encs.push(this.displacements[i]);
    }

    return encs;
  }

  collides() {
    return false;
  }

  resetState(lastReset=false) {
    super.resetState(lastReset, true, true);
  }
}

module.exports = SpringSimulator;
