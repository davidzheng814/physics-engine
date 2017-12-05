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

class CollisionSimulator extends Simulator {
  constructor(args) {
    super(args);
    this.minMass = args.minMass;
    this.maxMass = args.maxMass;

    this.initEncs();
    this.initWorld();
    this.minCollide = args.minCollide;
    this.allCollide = args.allCollide;
    this.fixFirst = args.fixFirst;
    this.colWindowStart = args.colWindowStart;
    this.colWindowEnd = args.colWindowEnd;
    this.maxVel = 9; // TODO hardcoded
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

    for (var i = 0; i < this.numBodies; ++i) {
      if (Math.abs(Math.abs(vels_f[i].x) - Math.abs(vels_0[i].x)) >= 1e-7 &&
          Math.abs(Math.abs(vels_f[i].y) - Math.abs(vels_0[i].y)) >= 1e-7) {
        collided.push(i);
      }
    }

    if (collided.length >= 2) this.collisions.push([this.step-1, collided.slice(0, 2)]);
  }

  initEncs(meanOnly=false) {
    this.masses = [];
    for (var i = 0; i < this.numBodies; ++i) {
      var mass = ((i == 0 && this.fixFirst) || meanOnly) 
          ? (this.minMass + this.maxMass) / 2
        : uniform(this.minMass, this.maxMass);
      this.masses.push(mass);
    }
  }

  getEncs() {
    return this.masses;
  }

  resetState(lastReset=false) {
    super.resetState(lastReset);
    this.collisions = [];
  }

  isValidObs() {
    // console.log(this.collisions);
    var uniqCollisions = [];
    var uniqCollidedObjs = [];
    for (var col of this.collisions.map(x=>x[1])) {
      if (!uniqCollisions.includes(col)) uniqCollisions.push(col);
      if (!uniqCollidedObjs.includes(col[0])) uniqCollidedObjs.push(col[0]);
      if (!uniqCollidedObjs.includes(col[1])) uniqCollidedObjs.push(col[1]);
    }
    var numUniqCols = uniqCollisions.length;
    var numCollidedObjs = uniqCollidedObjs.length;

    if (this.minCollide) {
      return numUniqCols == this.numBodies-1 && numCollidedObjs == this.numBodies;
    } else if (this.allCollide) {
      return (2*numUniqCols == this.numBodies*(this.numBodies-1)
          && numCollidedObjs == this.numBodies);
    } else {
      return numCollidedObjs == this.numBodies;
    }
  }

  isValidRo() {
    return this.collisions.filter(x => x[0] >= this.colWindowStart && x[0] < this.colWindowEnd).length > 0;
  }

  collides() {
    return true;
  }
};

module.exports = CollisionSimulator;
