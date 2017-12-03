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

class SpringSimulator extends Simulator{
  applyForce(bodyA, bodyB) {
    var constant = this.constants[bodyA.id][bodyB.id];
    var displacement = this.displacements[bodyA.id][bodyB.id];
    var vec = Vector.sub(bodyB.position, bodyA.position);
    var mag = constant * (Vector.magnitude(vec) - displacement);
    var force = Vector.mult(Vector.normalise(vec), mag);
    Body.applyForce(bodyA, bodyA.position, force);
    Body.applyForce(bodyB, bodyB.position, Vector.neg(force));
  }

  initEncs() {
    this.constants = [];
    this.displacements = [];
    for (var i = 0; i < this.numBodies; ++i) {
      var const_row = [];
      this.constants.push(const_row);
      var disp_row = [];
      this.displacements.push(disp_row);
      for (var j = 0; j < this.numBodies; ++j) {
        const_row.push(0);
        disp_row.push(0);
      }
    }

    for (var i = 0; i < this.numBodies; ++i) {
      for (var j = i+1; j < this.numBodies; ++j) {
        var constant = uniform(5e-5, 30e-5);
        var displacement = uniform(50, 300);
        this.constants[i][j] = this.constants[j][i] = constant;
        this.displacements[i][j] = this.displacements[j][i] = displacement;
      }
    }
  }

  getEncs() {
    var encs = [];
    for (var i = 0; i < this.numBodies; ++i) {
      for (var j = i+1; j < this.numBodies; ++j) {
        encs.push(this.constants[i][j]);
      }
    }
    for (var i = 0; i < this.numBodies; ++i) {
      for (var j = i+1; j < this.numBodies; ++j) {
        encs.push(this.displacements[i][j]);
      }
    }

    return encs;
  }

  collides() {
    return false;
  }

  resetState() {
    super.resetState(true, true);
  }
}

module.exports = SpringSimulator
