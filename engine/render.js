var PImage = require('pureimage');
var Render = require('matter-js').Render;
var fs = require('fs');

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

class Renderer {
  constructor(engine, width, height) {
    logger.disableLogger();
    var pcanvas = PImage.make(width, height);
    pcanvas.style = {}  
    var renderer = this.renderer = Render.create({
      element: 17, // dummy
      canvas: pcanvas,
      engine: engine,
    });
    renderer.hasBounds = true;
    renderer.options.height = height;
    renderer.options.width = width;
    renderer.canvas.height = height;
    renderer.canvas.width = width;
    logger.enableLogger();

    var renderOptions = this.renderer.options;
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
  }

  render(filename) {
    Render.world(this.renderer);
    PImage.encodePNG(this.renderer.canvas, fs.createWriteStream(filename), (err) => {});
  }
}

module.exports = Renderer
