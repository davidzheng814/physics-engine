var Matter = require('matter-js');
var MatterAttractors = require('matter-attractors');
var fs = require('fs');
var path = require('path');
var readline = require('readline');
var child_process = require('child_process');
var SpringSimulator = require('./spring');
var RenderSimulator = require('./model').RenderSimulator;
var optionator = require('./parser');
Matter.use(MatterAttractors);

var Engine = Matter.Engine,
  Render = Matter.Render,
  World = Matter.World,
  Composite = Matter.Composite,
  Body = Matter.Body,
  Vector = Matter.Vector,
  Events = Matter.Events,
  Bodies = Matter.Bodies;

function generate(args, idx) {
  if (args.physics == 'spring') {
    var simulator = new SpringSimulator(args);
  } else if (args.physics == 'collision') {
    // var simulator = new CollisionSimulator(args);
  }

  simulator.resetState();

  var data = {
    encs:simulator.getEncs(),
    obs_states: [],
    ro_states:[],
  };

  // Run observation steps.
  for (var i = 0; i < args.numObsSteps; ++i) {
    simulator.nextStep();
    var state = simulator.getState();
    data.obs_states.push(state);

    if (args.imageBase) simulator.render(args.imageBase+'_'+idx+'_'+i+'.png');
  }
  if (!simulator.isValidObs()) return false;

  // Run rollout steps.
  simulator.resetState();
  var run_states = [];
  for (var t = 0; t < args.numRoSteps; ++t) {
    simulator.nextStep();
    var state = simulator.getState();
    run_states.push(state);

    if (args.imageBase) simulator.render(args.imageBase+'_'+idx+'_'+(args.numObsSteps+t)+'.png');
  }
  data.ro_states.push(run_states);
  if (!simulator.isValidRo()) return false;

  // Return results on success
  console.log("Ind:", idx, "Encs:", simulator.getEncs());
  return data;
}

function render(args, data) {
  var simulator = new RenderSimulator(args);
  for (var i = 0; i < data.states.length; ++i) {
    for (var j = 0; j < simulator.bodies.length; ++j) {
      var pos = data.states[i].pos[j];
      Body.setPosition(simulator.bodies[j], data.states[i].pos[j]);

      var pos = data.true_states[i].pos[j];
      Body.setPosition(simulator.extraBodies[j], data.true_states[i].pos[j]);
    }
    simulator.render(args.imageBase+'_'+i+'.png')
  }
}

function writeToFile(data, outputFile) {
  var text = JSON.stringify(data);
  fs.writeFileSync(outputFile, text);
}


function main() {
  // process invalid options
  try {
    var args = optionator.parseArgv(process.argv);
  } catch(e) {
      console.log(optionator.generateHelp());
      console.log(e.message)
      process.exit(1)
  }

  if (args.stateFile) { // render states from a state file. 
    fs.readFile(args.stateFile, function(err, data) {
      if (err) return console.log(err);
      data = JSON.parse(data);
      render(args, data);
    });
  } else { // generate states from scratch.
    for (var idx = args.startIdx; idx < args.numGroups; ++idx) {
      var data = generate(args, idx);
      if (data) { // Successful run
        writeToFile(data, args.outputBase+'_'+idx+'.json');
      } else { // Unsuccessful run
        --idx;
      }
    }
  }
}

main();
