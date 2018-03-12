(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
module.exports={
  "wheelCount": 2,
  "wheelMinRadius": 0.2,
  "wheelRadiusRange": 0.5,
  "wheelMinDensity": 40,
  "wheelDensityRange": 100,
  "chassisDensityRange": 300,
  "chassisMinDensity": 30,
  "chassisMinAxis": 0.1,
  "chassisAxisRange": 1.1
}

},{}],2:[function(require,module,exports){
var carConstants = require("./car-constants.json");

module.exports = {
  worldDef: worldDef,
  carConstants: getCarConstants,
  generateSchema: generateSchema
}

function worldDef(){
  var box2dfps = 60;
  return {
    gravity: { y: 0 },
    doSleep: true,
    floorseed: "abc",
    maxFloorTiles: 200,
    mutable_floor: false,
    motorSpeed: 20,
    box2dfps: box2dfps,
    max_car_health: box2dfps * 10,
    tileDimensions: {
      width: 1.5,
      height: 0.15
    }
  };
}

function getCarConstants(){
  return carConstants;
}

function generateSchema(values){
  return {
    wheel_radius: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinRadius,
      range: values.wheelRadiusRange,
      factor: 1,
    },
    wheel_density: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinDensity,
      range: values.wheelDensityRange,
      factor: 1,
    },
    chassis_density: {
      type: "float",
      length: 1,
      min: values.chassisDensityRange,
      range: values.chassisMinDensity,
      factor: 1,
    },
    vertex_list: {
      type: "float",
      length: 12,
      min: values.chassisMinAxis,
      range: values.chassisAxisRange,
      factor: 1,
    },
    wheel_vertex: {
      type: "shuffle",
      length: 8,
      limit: 2,
      factor: 1,
    },
  };
}

},{"./car-constants.json":1}],3:[function(require,module,exports){
/*
  globals b2RevoluteJointDef b2Vec2 b2BodyDef b2Body b2FixtureDef b2PolygonShape b2CircleShape
*/

var createInstance = require("../machine-learning/create-instance");

module.exports = defToCar;

function defToCar(normal_def, world, constants){
  var car_def = createInstance.applyTypes(constants.schema, normal_def)
  var instance = {};
  instance.chassis = createChassis(
    world, car_def.vertex_list, car_def.chassis_density
  );
  var i;

  var wheelCount = car_def.wheel_radius.length;

  instance.wheels = [];
  for (i = 0; i < wheelCount; i++) {
    instance.wheels[i] = createWheel(
      world,
      car_def.wheel_radius[i],
      car_def.wheel_density[i]
    );
  }

  var carmass = instance.chassis.GetMass();
  for (i = 0; i < wheelCount; i++) {
    carmass += instance.wheels[i].GetMass();
  }

  var joint_def = new b2RevoluteJointDef();

  for (i = 0; i < wheelCount; i++) {
    var torque = carmass * -constants.gravity.y / car_def.wheel_radius[i];

    var randvertex = instance.chassis.vertex_list[car_def.wheel_vertex[i]];
    joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
    joint_def.localAnchorB.Set(0, 0);
    joint_def.maxMotorTorque = torque;
    joint_def.motorSpeed = -constants.motorSpeed;
    joint_def.enableMotor = true;
    joint_def.bodyA = instance.chassis;
    joint_def.bodyB = instance.wheels[i];
    world.CreateJoint(joint_def);
  }

  return instance;
}

function createChassis(world, vertexs, density) {

  var vertex_list = new Array();
  vertex_list.push(new b2Vec2(vertexs[0], 0));
  vertex_list.push(new b2Vec2(vertexs[1], vertexs[2]));
  vertex_list.push(new b2Vec2(0, vertexs[3]));
  vertex_list.push(new b2Vec2(-vertexs[4], vertexs[5]));
  vertex_list.push(new b2Vec2(-vertexs[6], 0));
  vertex_list.push(new b2Vec2(-vertexs[7], -vertexs[8]));
  vertex_list.push(new b2Vec2(0, -vertexs[9]));
  vertex_list.push(new b2Vec2(vertexs[10], -vertexs[11]));

  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 4.0);

  var body = world.CreateBody(body_def);

  createChassisPart(body, vertex_list[0], vertex_list[1], density);
  createChassisPart(body, vertex_list[1], vertex_list[2], density);
  createChassisPart(body, vertex_list[2], vertex_list[3], density);
  createChassisPart(body, vertex_list[3], vertex_list[4], density);
  createChassisPart(body, vertex_list[4], vertex_list[5], density);
  createChassisPart(body, vertex_list[5], vertex_list[6], density);
  createChassisPart(body, vertex_list[6], vertex_list[7], density);
  createChassisPart(body, vertex_list[7], vertex_list[0], density);

  body.vertex_list = vertex_list;

  return body;
}


function createChassisPart(body, vertex1, vertex2, density) {
  var vertex_list = new Array();
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0, 0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = density;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list, 3);

  body.CreateFixture(fix_def);
}

function createWheel(world, radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

},{"../machine-learning/create-instance":20}],4:[function(require,module,exports){


module.exports = {
  getInitialState: getInitialState,
  updateState: updateState,
  getStatus: getStatus,
  calculateScore: calculateScore,
};

function getInitialState(world_def){
  return {
    frames: 0,
    health: world_def.max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
  };
}

function updateState(constants, worldConstruct, state){
  if(state.health <= 0){
    throw new Error("Already Dead");
  }
  if(state.maxPositionx > constants.finishLine){
    throw new Error("already Finished");
  }

  // console.log(state);
  // check health
  var position = worldConstruct.chassis.GetPosition();
  // check if car reached end of the path
  var nextState = {
    frames: state.frames + 1,
    maxPositionx: position.x > state.maxPositionx ? position.x : state.maxPositionx,
    maxPositiony: position.y > state.maxPositiony ? position.y : state.maxPositiony,
    minPositiony: position.y < state.minPositiony ? position.y : state.minPositiony
  };

  if (position.x > constants.finishLine) {
    return nextState;
  }

  if (position.x > state.maxPositionx + 0.02) {
    nextState.health = constants.max_car_health;
    return nextState;
  }
  nextState.health = state.health - 1;
  if (Math.abs(worldConstruct.chassis.GetLinearVelocity().x) < 0.001) {
    nextState.health -= 5;
  }
  return nextState;
}

function getStatus(state, constants){
  if(hasFailed(state, constants)) return -1;
  if(hasSuccess(state, constants)) return 1;
  return 0;
}

function hasFailed(state /*, constants */){
  return state.health <= 0;
}
function hasSuccess(state, constants){
  return state.maxPositionx > constants.finishLine;
}

function calculateScore(state, constants){
  var avgspeed = (state.maxPositionx / state.frames) * constants.box2dfps;
  var position = state.maxPositionx;
  var score = position + avgspeed;
  return {
    v: score,
    s: avgspeed,
    x: position,
    y: state.maxPositiony,
    y2: state.minPositiony
  }
}

},{}],5:[function(require,module,exports){
/* globals document */

var run = require("../car-schema/run");

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function () {
  this.__constructor.apply(this, arguments);
}

cw_Car.prototype.__constructor = function (car) {
  this.car = car;
  this.car_def = car.def;
  var car_def = this.car_def;

  this.frames = 0;
  this.alive = true;
  this.is_elite = car.def.is_elite;
  this.healthBar = document.getElementById("health" + car_def.index).style;
  this.healthBarText = document.getElementById("health" + car_def.index).nextSibling.nextSibling;
  this.healthBarText.innerHTML = car_def.index;
  this.minimapmarker = document.getElementById("bar" + car_def.index);

  if (this.is_elite) {
    this.healthBar.backgroundColor = "#3F72AF";
    this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
    this.minimapmarker.innerHTML = car_def.index;
  } else {
    this.healthBar.backgroundColor = "#F7C873";
    this.minimapmarker.style.borderLeft = "1px solid #F7C873";
    this.minimapmarker.innerHTML = car_def.index;
  }

}

cw_Car.prototype.getPosition = function () {
  return this.car.car.chassis.GetPosition();
}

cw_Car.prototype.kill = function (currentRunner, constants) {
  this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
  var finishLine = currentRunner.scene.finishLine
  var max_car_health = constants.max_car_health;
  var status = run.getStatus(this.car.state, {
    finishLine: finishLine,
    max_car_health: max_car_health,
  })
  switch(status){
    case 1: {
      this.healthBar.width = "0";
      break
    }
    case -1: {
      this.healthBarText.innerHTML = "&dagger;";
      this.healthBar.width = "0";
      break
    }
  }
  this.alive = false;

}

module.exports = cw_Car;

},{"../car-schema/run":4}],6:[function(require,module,exports){

var cw_drawVirtualPoly = require("./draw-virtual-poly");
var cw_drawCircle = require("./draw-circle");

module.exports = function(car_constants, myCar, camera, ctx){
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;

  var wheelMinDensity = car_constants.wheelMinDensity
  var wheelDensityRange = car_constants.wheelDensityRange

  if (!myCar.alive) {
    return;
  }
  var myCarPos = myCar.getPosition();

  if (myCarPos.x < (camera_x - 5)) {
    // too far behind, don't draw
    return;
  }

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1 / zoom;

  var wheels = myCar.car.car.wheels;

  for (var i = 0; i < wheels.length; i++) {
    var b = wheels[i];
    for (var f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelDensityRange).toString();
      var rgbcolor = "rgb(" + color + "," + color + "," + color + ")";
      cw_drawCircle(ctx, b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
    }
  }

  if (myCar.is_elite) {
    ctx.strokeStyle = "#3F72AF";
    ctx.fillStyle = "#DBE2EF";
  } else {
    ctx.strokeStyle = "#F7C873";
    ctx.fillStyle = "#FAEBCD";
  }
  ctx.beginPath();

  var chassis = myCar.car.car.chassis;

  for (f = chassis.GetFixtureList(); f; f = f.m_next) {
    var cs = f.GetShape();
    cw_drawVirtualPoly(ctx, chassis, cs.m_vertices, cs.m_vertexCount);
  }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-circle":7,"./draw-virtual-poly":9}],7:[function(require,module,exports){

module.exports = cw_drawCircle;

function cw_drawCircle(ctx, body, center, radius, angle, color) {
  var p = body.GetWorldPoint(center);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + radius * Math.cos(angle), p.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{}],8:[function(require,module,exports){
var cw_drawVirtualPoly = require("./draw-virtual-poly");
module.exports = function(ctx, camera, cw_floorTiles) {
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#777";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();

  var k;
  if(camera.pos.x - 10 > 0){
    k = Math.floor((camera.pos.x - 10) / 1.5);
  } else {
    k = 0;
  }

  // console.log(k);

  outer_loop:
    for (k; k < cw_floorTiles.length; k++) {
      var b = cw_floorTiles[k];
      for (var f = b.GetFixtureList(); f; f = f.m_next) {
        var s = f.GetShape();
        var shapePosition = b.GetWorldPoint(s.m_vertices[0]).x;
        if ((shapePosition > (camera_x - 5)) && (shapePosition < (camera_x + 10))) {
          cw_drawVirtualPoly(ctx, b, s.m_vertices, s.m_vertexCount);
        }
        if (shapePosition > camera_x + 10) {
          break outer_loop;
        }
      }
    }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-virtual-poly":9}],9:[function(require,module,exports){


module.exports = function(ctx, body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    var p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);
}

},{}],10:[function(require,module,exports){
var scatterPlot = require("./scatter-plot");

module.exports = {
  plotGraphs: function(graphElem, topScoresElem, scatterPlotElem, lastState, scores, config) {
    lastState = lastState || {};
    var generationSize = scores.length
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    var nextState = cw_storeGraphScores(
      lastState, scores, generationSize
    );
    console.log(scores, nextState);
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
    cw_plotAverage(nextState, graphctx);
    cw_plotElite(nextState, graphctx);
    cw_plotTop(nextState, graphctx);
    cw_listTopScores(topScoresElem, nextState);
    nextState.scatterGraph = drawAllResults(
      scatterPlotElem, config, nextState, lastState.scatterGraph
    );
    return nextState;
  },
  clearGraphics: function(graphElem) {
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
  }
};


function cw_storeGraphScores(lastState, cw_carScores, generationSize) {
  console.log(cw_carScores);
  return {
    cw_topScores: (lastState.cw_topScores || [])
    .concat([cw_carScores[0].score]),
    cw_graphAverage: (lastState.cw_graphAverage || []).concat([
      cw_average(cw_carScores, generationSize)
    ]),
    cw_graphElite: (lastState.cw_graphElite || []).concat([
      cw_eliteaverage(cw_carScores, generationSize)
    ]),
    cw_graphTop: (lastState.cw_graphTop || []).concat([
      cw_carScores[0].score.v
    ]),
    allResults: (lastState.allResults || []).concat(cw_carScores),
  }
}

function cw_plotTop(state, graphctx) {
  var cw_graphTop = state.cw_graphTop;
  var graphsize = cw_graphTop.length;
  graphctx.strokeStyle = "#C83B3B";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphTop[k]);
  }
  graphctx.stroke();
}

function cw_plotElite(state, graphctx) {
  var cw_graphElite = state.cw_graphElite;
  var graphsize = cw_graphElite.length;
  graphctx.strokeStyle = "#7BC74D";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphElite[k]);
  }
  graphctx.stroke();
}

function cw_plotAverage(state, graphctx) {
  var cw_graphAverage = state.cw_graphAverage;
  var graphsize = cw_graphAverage.length;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphAverage[k]);
  }
  graphctx.stroke();
}


function cw_eliteaverage(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < Math.floor(generationSize / 2); k++) {
    sum += scores[k].score.v;
  }
  return sum / Math.floor(generationSize / 2);
}

function cw_average(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < generationSize; k++) {
    sum += scores[k].score.v;
  }
  return sum / generationSize;
}

function cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight) {
  graphcanvas.width = graphcanvas.width;
  graphctx.translate(0, graphheight);
  graphctx.scale(1, -1);
  graphctx.lineWidth = 1;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, graphheight / 2);
  graphctx.lineTo(graphwidth, graphheight / 2);
  graphctx.moveTo(0, graphheight / 4);
  graphctx.lineTo(graphwidth, graphheight / 4);
  graphctx.moveTo(0, graphheight * 3 / 4);
  graphctx.lineTo(graphwidth, graphheight * 3 / 4);
  graphctx.stroke();
}

function cw_listTopScores(elem, state) {
  var cw_topScores = state.cw_topScores;
  var ts = elem;
  ts.innerHTML = "<b>Top Scores:</b><br />";
  cw_topScores.sort(function (a, b) {
    if (a.v > b.v) {
      return -1
    } else {
      return 1
    }
  });

  for (var k = 0; k < Math.min(10, cw_topScores.length); k++) {
    var topScore = cw_topScores[k];
    // console.log(topScore);
    var n = "#" + (k + 1) + ":";
    var score = Math.round(topScore.v * 100) / 100;
    var distance = "d:" + Math.round(topScore.x * 100) / 100;
    var yrange =  "h:" + Math.round(topScore.y2 * 100) / 100 + "/" + Math.round(topScore.y * 100) / 100 + "m";
    var gen = "(Gen " + cw_topScores[k].i + ")"

    ts.innerHTML +=  [n, score, distance, yrange, gen].join(" ") + "<br />";
  }
}

function drawAllResults(scatterPlotElem, config, allResults, previousGraph){
  if(!scatterPlotElem) return;
  return scatterPlot(scatterPlotElem, allResults, config.propertyMap, previousGraph)
}

},{"./scatter-plot":11}],11:[function(require,module,exports){
/* globals vis Highcharts */

// Called when the Visualization API is loaded.

module.exports = highCharts;
function highCharts(elem, scores){
  var keys = Object.keys(scores[0].def);
  keys = keys.reduce(function(curArray, key){
    var l = scores[0].def[key].length;
    var subArray = [];
    for(var i = 0; i < l; i++){
      subArray.push(key + "." + i);
    }
    return curArray.concat(subArray);
  }, []);
  function retrieveValue(obj, path){
    return path.split(".").reduce(function(curValue, key){
      return curValue[key];
    }, obj);
  }

  var dataObj = Object.keys(scores).reduce(function(kv, score){
    keys.forEach(function(key){
      kv[key].data.push([
        retrieveValue(score.def, key), score.score.v
      ])
    })
    return kv;
  }, keys.reduce(function(kv, key){
    kv[key] = {
      name: key,
      data: [],
    }
    return kv;
  }, {}))
  Highcharts.chart(elem.id, {
      chart: {
          type: 'scatter',
          zoomType: 'xy'
      },
      title: {
          text: 'Property Value to Score'
      },
      xAxis: {
          title: {
              enabled: true,
              text: 'Normalized'
          },
          startOnTick: true,
          endOnTick: true,
          showLastLabel: true
      },
      yAxis: {
          title: {
              text: 'Score'
          }
      },
      legend: {
          layout: 'vertical',
          align: 'left',
          verticalAlign: 'top',
          x: 100,
          y: 70,
          floating: true,
          backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
          borderWidth: 1
      },
      plotOptions: {
          scatter: {
              marker: {
                  radius: 5,
                  states: {
                      hover: {
                          enabled: true,
                          lineColor: 'rgb(100,100,100)'
                      }
                  }
              },
              states: {
                  hover: {
                      marker: {
                          enabled: false
                      }
                  }
              },
              tooltip: {
                  headerFormat: '<b>{series.name}</b><br>',
                  pointFormat: '{point.x}, {point.y}'
              }
          }
      },
      series: keys.map(function(key){
        return dataObj[key];
      })
  });
}

function visChart(elem, scores, propertyMap, graph) {

  // Create and populate a data table.
  var data = new vis.DataSet();
  scores.forEach(function(scoreInfo){
    data.add({
      x: getProperty(scoreInfo, propertyMap.x),
      y: getProperty(scoreInfo, propertyMap.x),
      z: getProperty(scoreInfo, propertyMap.z),
      style: getProperty(scoreInfo, propertyMap.z),
      // extra: def.ancestry
    });
  });

  function getProperty(info, key){
    if(key === "score"){
      return info.score.v
    } else {
      return info.def[key];
    }
  }

  // specify options
  var options = {
    width:  '600px',
    height: '600px',
    style: 'dot-size',
    showPerspective: true,
    showLegend: true,
    showGrid: true,
    showShadow: false,

    // Option tooltip can be true, false, or a function returning a string with HTML contents
    tooltip: function (point) {
      // parameter point contains properties x, y, z, and data
      // data is the original object passed to the point constructor
      return 'score: <b>' + point.z + '</b><br>'; // + point.data.extra;
    },

    // Tooltip default styling can be overridden
    tooltipStyle: {
      content: {
        background    : 'rgba(255, 255, 255, 0.7)',
        padding       : '10px',
        borderRadius  : '10px'
      },
      line: {
        borderLeft    : '1px dotted rgba(0, 0, 0, 0.5)'
      },
      dot: {
        border        : '5px solid rgba(0, 0, 0, 0.5)'
      }
    },

    keepAspectRatio: true,
    verticalRatio: 0.5
  };

  var camera = graph ? graph.getCameraPosition() : null;

  // create our graph
  var container = elem;
  graph = new vis.Graph3d(container, data, options);

  if (camera) graph.setCameraPosition(camera); // restore camera position
  return graph;
}

},{}],12:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],13:[function(require,module,exports){
// http://sunmingtao.blogspot.com/2016/11/inbreeding-coefficient.html
module.exports = getInbreedingCoefficient;

function getInbreedingCoefficient(child){
  var nameIndex = new Map();
  var flagged = new Set();
  var convergencePoints = new Set();
  createAncestryMap(child, []);

  var storedCoefficients = new Map();

  return Array.from(convergencePoints.values()).reduce(function(sum, point){
    var iCo = getCoefficient(point);
    return sum + iCo;
  }, 0);

  function createAncestryMap(initNode){
    var itemsInQueue = [{ node: initNode, path: [] }];
    do{
      var item = itemsInQueue.shift();
      var node = item.node;
      var path = item.path;
      if(processItem(node, path)){
        var nextPath = [ node.id ].concat(path);
        itemsInQueue = itemsInQueue.concat(node.ancestry.map(function(parent){
          return {
            node: parent,
            path: nextPath
          };
        }));
      }
    }while(itemsInQueue.length);


    function processItem(node, path){
      var newAncestor = !nameIndex.has(node.id);
      if(newAncestor){
        nameIndex.set(node.id, {
          parents: (node.ancestry || []).map(function(parent){
            return parent.id;
          }),
          id: node.id,
          children: [],
          convergences: [],
        });
      } else {

        flagged.add(node.id)
        nameIndex.get(node.id).children.forEach(function(childIdentifier){
          var offsets = findConvergence(childIdentifier.path, path);
          if(!offsets){
            return;
          }
          var childID = path[offsets[1]];
          convergencePoints.add(childID);
          nameIndex.get(childID).convergences.push({
            parent: node.id,
            offsets: offsets,
          });
        });
      }

      if(path.length){
        nameIndex.get(node.id).children.push({
          child: path[0],
          path: path
        });
      }

      if(!newAncestor){
        return;
      }
      if(!node.ancestry){
        return;
      }
      return true;
    }
  }

  function getCoefficient(id){
    if(storedCoefficients.has(id)){
      return storedCoefficients.get(id);
    }
    var node = nameIndex.get(id);
    var val = node.convergences.reduce(function(sum, point){
      return sum + Math.pow(1 / 2, point.offsets.reduce(function(sum, value){
        return sum + value;
      }, 1)) * (1 + getCoefficient(point.parent));
    }, 0);
    storedCoefficients.set(id, val);

    return val;

  }
  function findConvergence(listA, listB){
    var ci, cj, li, lj;
    outerloop:
    for(ci = 0, li = listA.length; ci < li; ci++){
      for(cj = 0, lj = listB.length; cj < lj; cj++){
        if(listA[ci] === listB[cj]){
          break outerloop;
        }
      }
    }
    if(ci === li){
      return false;
    }
    return [ci, cj];
  }
}

},{}],14:[function(require,module,exports){
var carConstruct = require("../car-schema/construct.js");

var carConstants = carConstruct.carConstants();

var schema = carConstruct.generateSchema(carConstants);
var pickParent = require("./pickParent");
var selectFromAllParents = require("./selectFromAllParents");
const constants = {
  generationSize: 20,
  schema: schema,
  championLength: 1,
  mutation_range: 1,
  gen_mutation: 0.05,
};
module.exports = function(){
  var currentChoices = new Map();
  return Object.assign(
    {},
    constants,
    {
      selectFromAllParents: selectFromAllParents,
      generateRandom: require("./generateRandom"),
      pickParent: pickParent.bind(void 0, currentChoices),
    }
  );
}
module.exports.constants = constants

},{"../car-schema/construct.js":2,"./generateRandom":12,"./pickParent":15,"./selectFromAllParents":16}],15:[function(require,module,exports){
var nAttributes = 15;
module.exports = pickParent;

function pickParent(currentChoices, chooseId, key /* , parents */){
  if(!currentChoices.has(chooseId)){
    currentChoices.set(chooseId, initializePick())
  }
  // console.log(chooseId);
  var state = currentChoices.get(chooseId);
  // console.log(state.curparent);
  state.i++
  if(["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1){
    state.curparent = cw_chooseParent(state);
    return state.curparent;
  }
  state.curparent = cw_chooseParent(state);
  return state.curparent;

  function cw_chooseParent(state) {
    var curparent = state.curparent;
    var attributeIndex = state.i;
    var swapPoint1 = state.swapPoint1
    var swapPoint2 = state.swapPoint2
    // console.log(swapPoint1, swapPoint2, attributeIndex)
    if ((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
      return curparent == 1 ? 0 : 1
    }
    return curparent
  }

  function initializePick(){
    var curparent = 0;

    var swapPoint1 = Math.floor(Math.random() * (nAttributes));
    var swapPoint2 = swapPoint1;
    while (swapPoint2 == swapPoint1) {
      swapPoint2 = Math.floor(Math.random() * (nAttributes));
    }
    var i = 0;
    return {
      curparent: curparent,
      i: i,
      swapPoint1: swapPoint1,
      swapPoint2: swapPoint2
    }
  }
}

},{}],16:[function(require,module,exports){
var getInbreedingCoefficient = require("./inbreeding-coefficient");

module.exports = simpleSelect;

function simpleSelect(parents){
  var totalParents = parents.length
  var r = Math.random();
  if (r == 0)
    return 0;
  return Math.floor(-Math.log(r) * totalParents) % totalParents;
}

function selectFromAllParents(parents, parentList, previousParentIndex) {
  var previousParent = parents[previousParentIndex];
  var validParents = parents.filter(function(parent, i){
    if(previousParentIndex === i){
      return false;
    }
    if(!previousParent){
      return true;
    }
    var child = {
      id: Math.random().toString(32),
      ancestry: [previousParent, parent].map(function(p){
        return {
          id: p.def.id,
          ancestry: p.def.ancestry
        }
      })
    }
    var iCo = getInbreedingCoefficient(child);
    console.log("inbreeding coefficient", iCo)
    if(iCo > 0.25){
      return false;
    }
    return true;
  })
  if(validParents.length === 0){
    return Math.floor(Math.random() * parents.length)
  }
  var totalScore = validParents.reduce(function(sum, parent){
    return sum + parent.score.v;
  }, 0);
  var r = totalScore * Math.random();
  for(var i = 0; i < validParents.length; i++){
    var score = validParents[i].score.v;
    if(r > score){
      r = r - score;
    } else {
      break;
    }
  }
  return i;
}

},{"./inbreeding-coefficient":13}],17:[function(require,module,exports){

module.exports = function(car) {
  var out = {
    chassis: ghost_get_chassis(car.chassis),
    wheels: [],
    pos: {x: car.chassis.GetPosition().x, y: car.chassis.GetPosition().y}
  };

  for (var i = 0; i < car.wheels.length; i++) {
    out.wheels[i] = ghost_get_wheel(car.wheels[i]);
  }

  return out;
}

function ghost_get_chassis(c) {
  var gc = [];

  for (var f = c.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var p = {
      vtx: [],
      num: 0
    }

    p.num = s.m_vertexCount;

    for (var i = 0; i < s.m_vertexCount; i++) {
      p.vtx.push(c.GetWorldPoint(s.m_vertices[i]));
    }

    gc.push(p);
  }

  return gc;
}

function ghost_get_wheel(w) {
  var gw = [];

  for (var f = w.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var c = {
      pos: w.GetWorldPoint(s.m_p),
      rad: s.m_radius,
      ang: w.m_sweep.a
    }

    gw.push(c);
  }

  return gw;
}

},{}],18:[function(require,module,exports){

var ghost_get_frame = require("./car-to-ghost.js");

var enable_ghost = true;

module.exports = {
  ghost_create_replay: ghost_create_replay,
  ghost_create_ghost: ghost_create_ghost,
  ghost_pause: ghost_pause,
  ghost_resume: ghost_resume,
  ghost_get_position: ghost_get_position,
  ghost_compare_to_replay: ghost_compare_to_replay,
  ghost_move_frame: ghost_move_frame,
  ghost_add_replay_frame: ghost_add_replay_frame,
  ghost_draw_frame: ghost_draw_frame,
  ghost_reset_ghost: ghost_reset_ghost
}

function ghost_create_replay() {
  if (!enable_ghost)
    return null;

  return {
    num_frames: 0,
    frames: [],
  }
}

function ghost_create_ghost() {
  if (!enable_ghost)
    return null;

  return {
    replay: null,
    frame: 0,
    dist: -100
  }
}

function ghost_reset_ghost(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  ghost.frame = 0;
}

function ghost_pause(ghost) {
  if (ghost != null)
    ghost.old_frame = ghost.frame;
  ghost_reset_ghost(ghost);
}

function ghost_resume(ghost) {
  if (ghost != null)
    ghost.frame = ghost.old_frame;
}

function ghost_get_position(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;
  var frame = ghost.replay.frames[ghost.frame];
  return frame.pos;
}

function ghost_compare_to_replay(replay, ghost, max) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (replay == null)
    return;

  if (ghost.dist < max) {
    ghost.replay = replay;
    ghost.dist = max;
    ghost.frame = 0;
  }
}

function ghost_move_frame(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.replay == null)
    return;
  ghost.frame++;
  if (ghost.frame >= ghost.replay.num_frames)
    ghost.frame = ghost.replay.num_frames - 1;
}

function ghost_add_replay_frame(replay, car) {
  if (!enable_ghost)
    return;
  if (replay == null)
    return;

  var frame = ghost_get_frame(car);
  replay.frames.push(frame);
  replay.num_frames++;
}

function ghost_draw_frame(ctx, ghost, camera) {
  var zoom = camera.zoom;
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;

  var frame = ghost.replay.frames[ghost.frame];

  // wheel style
  ctx.fillStyle = "#eee";
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1 / zoom;

  for (var i = 0; i < frame.wheels.length; i++) {
    for (var w in frame.wheels[i]) {
      ghost_draw_circle(ctx, frame.wheels[i][w].pos, frame.wheels[i][w].rad, frame.wheels[i][w].ang);
    }
  }

  // chassis style
  ctx.strokeStyle = "#aaa";
  ctx.fillStyle = "#eee";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (var c in frame.chassis)
    ghost_draw_poly(ctx, frame.chassis[c].vtx, frame.chassis[c].num);
  ctx.fill();
  ctx.stroke();
}

function ghost_draw_poly(ctx, vtx, n_vtx) {
  ctx.moveTo(vtx[0].x, vtx[0].y);
  for (var i = 1; i < n_vtx; i++) {
    ctx.lineTo(vtx[i].x, vtx[i].y);
  }
  ctx.lineTo(vtx[0].x, vtx[0].y);
}

function ghost_draw_circle(ctx, center, radius, angle) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(center.x, center.y);
  ctx.lineTo(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{"./car-to-ghost.js":17}],19:[function(require,module,exports){
/* globals document performance localStorage alert confirm btoa HTMLDivElement */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");
var carConstruct = require("./car-schema/construct.js");

var manageRound = require("./machine-learning/genetic-algorithm/manage-round.js");

var ghost_fns = require("./ghost/index.js");

var drawCar = require("./draw/draw-car.js");
var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;
var cw_clearGraphics = graph_fns.clearGraphics;
var cw_drawFloor = require("./draw/draw-floor.js");

var ghost_draw_frame = ghost_fns.ghost_draw_frame;
var ghost_create_ghost = ghost_fns.ghost_create_ghost;
var ghost_add_replay_frame = ghost_fns.ghost_add_replay_frame;
var ghost_compare_to_replay = ghost_fns.ghost_compare_to_replay;
var ghost_get_position = ghost_fns.ghost_get_position;
var ghost_move_frame = ghost_fns.ghost_move_frame;
var ghost_reset_ghost = ghost_fns.ghost_reset_ghost
var ghost_pause = ghost_fns.ghost_pause;
var ghost_resume = ghost_fns.ghost_resume;
var ghost_create_replay = ghost_fns.ghost_create_replay;

var cw_Car = require("./draw/draw-car-stats.js");
var ghost;
var carMap = new Map();

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;
var skipTicks = Math.round(1000 / box2dfps);
var maxFrameSkip = skipTicks * 2;

var canvas = document.getElementById("mainbox");
var ctx = canvas.getContext("2d");

var camera = {
  speed: 0.05,
  pos: {
    x: 0, y: 0
  },
  target: -1,
  zoom: 70
}

var minimapcamera = document.getElementById("minimapcamera").style;
var minimapholder = document.querySelector("#minimapholder");

var minimapcanvas = document.getElementById("minimap");
var minimapctx = minimapcanvas.getContext("2d");
var minimapscale = 3;
var minimapfogdistance = 0;
var fogdistance = document.getElementById("minimapfog").style;


var carConstants = carConstruct.carConstants();


var max_car_health = box2dfps * 10;

var cw_ghostReplayInterval = null;

var distanceMeter = document.getElementById("distancemeter");
var heightMeter = document.getElementById("heightmeter");

var leaderPosition = {
  x: 0, y: 0
}

minimapcamera.width = 12 * minimapscale + "px";
minimapcamera.height = 6 * minimapscale + "px";


// ======= WORLD STATE ======
var generationConfig = require("./generation-config");


var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false,
  box2dfps: box2dfps,
  motorSpeed: 20,
  max_car_health: max_car_health,
  schema: generationConfig.constants.schema
}

var cw_deadCars;
var graphState = {
  cw_topScores: [],
  cw_graphAverage: [],
  cw_graphElite: [],
  cw_graphTop: [],
};

function resetGraphState(){
  graphState = {
    cw_topScores: [],
    cw_graphAverage: [],
    cw_graphElite: [],
    cw_graphTop: [],
  };
}



// ==========================

var generationState;

// ======== Activity State ====
var currentRunner;
var loops = 0;
var nextGameTick = (new Date).getTime();

function showDistance(distance, height) {
  distanceMeter.innerHTML = distance + " meters<br />";
  heightMeter.innerHTML = height + " meters";
  if (distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}



/* === END Car ============================================================= */
/* ========================================================================= */


/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {

  generationState = manageRound.generationZero(generationConfig());
}

function resetCarUI(){
  cw_deadCars = 0;
  leaderPosition = {
    x: 0, y: 0
  };
  document.getElementById("generation").innerHTML = generationState.counter.toString();
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML = generationConfig.constants.generationSize.toString();
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  var floorTiles = currentRunner.scene.floorTiles;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  cw_setCameraPosition();
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  var zoom = camera.zoom;
  ctx.translate(200 - (camera_x * zoom), 200 + (camera_y * zoom));
  ctx.scale(zoom, -zoom);
  cw_drawFloor(ctx, camera, floorTiles);
  ghost_draw_frame(ctx, ghost, camera);
  cw_drawCars();
  ctx.restore();
}

function cw_minimapCamera(/* x, y*/) {
  var camera_x = camera.pos.x
  var camera_y = camera.pos.y
  minimapcamera.left = Math.round((2 + camera_x) * minimapscale) + "px";
  minimapcamera.top = Math.round((31 - camera_y) * minimapscale) + "px";
}

function cw_setCameraTarget(k) {
  camera.target = k;
}

function cw_setCameraPosition() {
  var cameraTargetPosition
  if (camera.target !== -1) {
    cameraTargetPosition = carMap.get(camera.target).getPosition();
  } else {
    cameraTargetPosition = leaderPosition;
  }
  var diff_y = camera.pos.y - cameraTargetPosition.y;
  var diff_x = camera.pos.x - cameraTargetPosition.x;
  camera.pos.y -= camera.speed * diff_y;
  camera.pos.x -= camera.speed * diff_x;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
}

function cw_drawGhostReplay() {
  var floorTiles = currentRunner.scene.floorTiles;
  var carPosition = ghost_get_position(ghost);
  camera.pos.x = carPosition.x;
  camera.pos.y = carPosition.y;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
  showDistance(
    Math.round(carPosition.x * 100) / 100,
    Math.round(carPosition.y * 100) / 100
  );
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    200 - (carPosition.x * camera.zoom),
    200 + (carPosition.y * camera.zoom)
  );
  ctx.scale(camera.zoom, -camera.zoom);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  cw_drawFloor(ctx, camera, floorTiles);
  ctx.restore();
}


function cw_drawCars() {
  var cw_carArray = Array.from(carMap.values());
  for (var k = (cw_carArray.length - 1); k >= 0; k--) {
    var myCar = cw_carArray[k];
    drawCar(carConstants, myCar, camera, ctx)
  }
}

function toggleDisplay() {
  canvas.width = canvas.width;
  if (doDraw) {
    doDraw = false;
    cw_stopSimulation();
    cw_runningInterval = setInterval(function () {
      var time = performance.now() + (1000 / screenfps);
      while (time > performance.now()) {
        simulationStep();
      }
    }, 1);
  } else {
    doDraw = true;
    clearInterval(cw_runningInterval);
    cw_startSimulation();
  }
}

function cw_drawMiniMap() {
  var floorTiles = currentRunner.scene.floorTiles;
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#3F72AF";
  minimapctx.beginPath();
  minimapctx.moveTo(0, 35 * minimapscale);
  for (var k = 0; k < floorTiles.length; k++) {
    last_tile = floorTiles[k];
    var last_fixture = last_tile.GetFixtureList();
    var last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
    minimapctx.lineTo((tile_position.x + 5) * minimapscale, (-tile_position.y + 35) * minimapscale);
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */
var uiListeners = {
  preCarStep: function(){
    ghost_move_frame(ghost);
  },
  carStep(car){
    updateCarUI(car);
  },
  carDeath(carInfo){

    var k = carInfo.index;

    var car = carInfo.car, score = carInfo.score;
    carMap.get(carInfo).kill(currentRunner, world_def);

    // refocus camera to leader on death
    if (camera.target == carInfo) {
      cw_setCameraTarget(-1);
    }
    // console.log(score);
    carMap.delete(carInfo);
    ghost_compare_to_replay(car.replay, ghost, score.v);
    score.i = generationState.counter;

    cw_deadCars++;
    var generationSize = generationConfig.constants.generationSize;
    document.getElementById("population").innerHTML = (generationSize - cw_deadCars).toString();

    // console.log(leaderPosition.leader, k)
    if (leaderPosition.leader == k) {
      // leader is dead, find new leader
      cw_findLeader();
    }
  },
  generationEnd(results){
    cleanupRound(results);
    return cw_newRound(results);
  }
}

function simulationStep() {  
  currentRunner.step();
  showDistance(
    Math.round(leaderPosition.x * 100) / 100,
    Math.round(leaderPosition.y * 100) / 100
  );
}

function gameLoop() {
  loops = 0;
  while (!cw_paused && (new Date).getTime() > nextGameTick && loops < maxFrameSkip) {   
    nextGameTick += skipTicks;
    loops++;
  }
  simulationStep();
  cw_drawScreen();

  if(!cw_paused) window.requestAnimationFrame(gameLoop);
}

function updateCarUI(carInfo){
  var k = carInfo.index;
  var car = carMap.get(carInfo);
  var position = car.getPosition();

  ghost_add_replay_frame(car.replay, car.car.car);
  car.minimapmarker.style.left = Math.round((position.x + 5) * minimapscale) + "px";
  car.healthBar.width = Math.round((car.car.state.health / max_car_health) * 100) + "%";
  if (position.x > leaderPosition.x) {
    leaderPosition = position;
    leaderPosition.leader = k;
    // console.log("new leader: ", k);
  }
}

function cw_findLeader() {
  var lead = 0;
  var cw_carArray = Array.from(carMap.values());
  for (var k = 0; k < cw_carArray.length; k++) {
    if (!cw_carArray[k].alive) {
      continue;
    }
    var position = cw_carArray[k].getPosition();
    if (position.x > lead) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
  }
}

function fastForward(){
  var gen = generationState.counter;
  while(gen === generationState.counter){
    currentRunner.step();
  }
}

function cleanupRound(results){

  results.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  graphState = plot_graphs(
    document.getElementById("graphcanvas"),
    document.getElementById("topscores"),
    null,
    graphState,
    results
  );
}

function cw_newRound(results) {
  camera.pos.x = camera.pos.y = 0;
  cw_setCameraTarget(-1);

  generationState = manageRound.nextGeneration(
    generationState, results, generationConfig()
  );
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    ghost = null;
    world_def.floorseed = btoa(Math.seedrandom());
  } else {
    // RE-ENABLE GHOST
    ghost_reset_ghost(ghost);
  }
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  resetCarUI();
}

function cw_startSimulation() {
  cw_paused = false;
  window.requestAnimationFrame(gameLoop);
}

function cw_stopSimulation() {
  cw_paused = true;
}

function cw_resetPopulationUI() {
  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML = "";
  document.getElementById("topscores").innerHTML = "";
  cw_clearGraphics(document.getElementById("graphcanvas"));
  resetGraphState();
}

function cw_resetWorld() {
  doDraw = true;
  cw_stopSimulation();
  world_def.floorseed = document.getElementById("newseed").value;
  cw_resetPopulationUI();

  Math.seedrandom();
  cw_generationZero();
  currentRunner = worldRun(
    world_def, generationState.generation, uiListeners
  );

  ghost = ghost_create_ghost();
  resetCarUI();
  setupCarUI()
  cw_drawMiniMap();

  cw_startSimulation();
}

function setupCarUI(){
  currentRunner.cars.map(function(carInfo){
    var car = new cw_Car(carInfo, carMap);
    carMap.set(carInfo, car);
    car.replay = ghost_create_replay();
    ghost_add_replay_frame(car.replay, car.car.car);
  })
}


document.querySelector("#fast-forward").addEventListener("click", function(){
  fastForward()
});

document.querySelector("#save-progress").addEventListener("click", function(){
  saveProgress()
});

document.querySelector("#restore-progress").addEventListener("click", function(){
  restoreProgress()
});

document.querySelector("#toggle-display").addEventListener("click", function(){
  toggleDisplay()
})

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
})

function saveProgress() {
  localStorage.cw_savedGeneration = JSON.stringify(generationState.generation);
  localStorage.cw_genCounter = generationState.counter;
  localStorage.cw_ghost = JSON.stringify(ghost);
  localStorage.cw_topScores = JSON.stringify(graphState.cw_topScores);
  localStorage.cw_floorSeed = world_def.floorseed;
}

function restoreProgress() {
  if (typeof localStorage.cw_savedGeneration == 'undefined' || localStorage.cw_savedGeneration == null) {
    alert("No saved progress found");
    return;
  }
  cw_stopSimulation();
  generationState.generation = JSON.parse(localStorage.cw_savedGeneration);
  generationState.counter = localStorage.cw_genCounter;
  ghost = JSON.parse(localStorage.cw_ghost);
  graphState.cw_topScores = JSON.parse(localStorage.cw_topScores);
  world_def.floorseed = localStorage.cw_floorSeed;
  document.getElementById("newseed").value = world_def.floorseed;

  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  cw_drawMiniMap();
  Math.seedrandom();

  resetCarUI();
  cw_startSimulation();
}

document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

// ghost replay stuff


function cw_pauseSimulation() {
  cw_paused = true;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  window.requestAnimationFrame(gameLoop);
}

function cw_startGhostReplay() {
  if (!doDraw) {
    toggleDisplay();
  }
  cw_pauseSimulation();
  cw_ghostReplayInterval = setInterval(cw_drawGhostReplay, Math.round(1000 / screenfps));
}

function cw_stopGhostReplay() {
  clearInterval(cw_ghostReplayInterval);
  cw_ghostReplayInterval = null;
  cw_findLeader();
  camera.pos.x = leaderPosition.x;
  camera.pos.y = leaderPosition.y;
  cw_resumeSimulation();
}

document.querySelector("#toggle-ghost").addEventListener("click", function(e){
  cw_toggleGhostReplay(e.target)
})

function cw_toggleGhostReplay(button) {
  if (cw_ghostReplayInterval == null) {
    cw_startGhostReplay();
    button.value = "Resume simulation";
  } else {
    cw_stopGhostReplay();
    button.value = "View top replay";
  }
}
// ghost replay stuff END

// initial stuff, only called once (hopefully)
function cw_init() {
  // clone silver dot and health bar
  var mmm = document.getElementsByName('minimapmarker')[0];
  var hbar = document.getElementsByName('healthbar')[0];
  var generationSize = generationConfig.constants.generationSize;

  for (var k = 0; k < generationSize; k++) {

    // minimap markers
    var newbar = mmm.cloneNode(true);
    newbar.id = "bar" + k;
    newbar.style.paddingTop = k * 9 + "px";
    minimapholder.appendChild(newbar);

    // health bars
    var newhealth = hbar.cloneNode(true);
    newhealth.getElementsByTagName("DIV")[0].id = "health" + k;
    newhealth.car_index = k;
    document.getElementById("health").appendChild(newhealth);
  }
  mmm.parentNode.removeChild(mmm);
  hbar.parentNode.removeChild(hbar);
  world_def.floorseed = btoa(Math.seedrandom());
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  window.requestAnimationFrame(gameLoop);
  
}

function relMouseCoords(event) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = this;

  do {
    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    currentElement = currentElement.offsetParent
  }
  while (currentElement);

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return {x: canvasX, y: canvasY}
}
HTMLDivElement.prototype.relMouseCoords = relMouseCoords;
minimapholder.onclick = function (event) {
  var coords = minimapholder.relMouseCoords(event);
  var cw_carArray = Array.from(carMap.values());
  var closest = {
    value: cw_carArray[0].car,
    dist: Math.abs(((cw_carArray[0].getPosition().x + 6) * minimapscale) - coords.x),
    x: cw_carArray[0].getPosition().x
  }

  var maxX = 0;
  for (var i = 0; i < cw_carArray.length; i++) {
    var pos = cw_carArray[i].getPosition();
    var dist = Math.abs(((pos.x + 6) * minimapscale) - coords.x);
    if (dist < closest.dist) {
      closest.value = cw_carArray.car;
      closest.dist = dist;
      closest.x = pos.x;
    }
    maxX = Math.max(pos.x, maxX);
  }

  if (closest.x == maxX) { // focus on leader again
    cw_setCameraTarget(-1);
  } else {
    cw_setCameraTarget(closest.value);
  }
}


document.querySelector("#mutationrate").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutation(elem.options[elem.selectedIndex].value)
})

document.querySelector("#mutationsize").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutationRange(elem.options[elem.selectedIndex].value)
})

document.querySelector("#floor").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutableFloor(elem.options[elem.selectedIndex].value)
});

document.querySelector("#gravity").addEventListener("change", function(e){
  var elem = e.target
  cw_setGravity(elem.options[elem.selectedIndex].value)
})

document.querySelector("#elitesize").addEventListener("change", function(e){
  var elem = e.target
  cw_setEliteSize(elem.options[elem.selectedIndex].value)
})

function cw_setMutation(mutation) {
  generationConfig.constants.gen_mutation = parseFloat(mutation);
}

function cw_setMutationRange(range) {
  generationConfig.constants.mutation_range = parseFloat(range);
}

function cw_setMutableFloor(choice) {
  world_def.mutable_floor = (choice == 1);
}

function cw_setGravity(choice) {
  world_def.gravity = new b2Vec2(0.0, -parseFloat(choice));
  var world = currentRunner.scene.world
  // CHECK GRAVITY CHANGES
  if (world.GetGravity().y != world_def.gravity.y) {
    world.SetGravity(world_def.gravity);
  }
}

function cw_setEliteSize(clones) {
  generationConfig.constants.championLength = parseInt(clones, 10);
}

cw_init();

},{"./car-schema/construct.js":2,"./draw/draw-car-stats.js":5,"./draw/draw-car.js":6,"./draw/draw-floor.js":8,"./draw/plot-graphs.js":10,"./generation-config":14,"./ghost/index.js":18,"./machine-learning/genetic-algorithm/manage-round.js":21,"./world/run.js":23}],20:[function(require,module,exports){
var random = require("./random.js");

module.exports = {
  createGenerationZero(schema, generator){
    return Object.keys(schema).reduce(function(instance, key){
      var schemaProp = schema[key];
      var values = random.createNormals(schemaProp, generator);
      instance[key] = values;
      return instance;
    }, { id: Math.random().toString(32) });
  },
  createCrossBreed(schema, parents, parentChooser){
    var id = Math.random().toString(32);
    return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = parentChooser(id, key, parents);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
      return crossDef;
    }, {
      id: id,
      ancestry: parents.map(function(parent){
        return {
          id: parent.id,
          ancestry: parent.ancestry,
        };
      })
    });
  },
  createMutatedClone(schema, generator, parent, factor, chanceToMutate){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values = random.mutateNormals(
        schemaProp, generator, originalValues, factor, chanceToMutate
      );
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
  applyTypes(schema, parent){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values;
      switch(schemaProp.type){
        case "shuffle" :
          values = random.mapToShuffle(schemaProp, originalValues); break;
        case "float" :
          values = random.mapToFloat(schemaProp, originalValues); break;
        case "integer":
          values = random.mapToInteger(schemaProp, originalValues); break;
        default:
          throw new Error(`Unknown type ${schemaProp.type} of schema for key ${key}`);
      }
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
}

},{"./random.js":22}],21:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function(){
      return Math.random()
    });
    def.index = k;
    cw_carGeneration.push(def);
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

function nextGeneration(
  previousState,
  scores,
  config
){
  var champion_length = config.championLength,
    generationSize = config.generationSize,
    selectFromAllParents = config.selectFromAllParents;

  var newGeneration = new Array();
  var newborn;
  for (var k = 0; k < champion_length; k++) {``
    scores[k].def.is_elite = true;
    scores[k].def.index = k;
    newGeneration.push(scores[k].def);
  }
  var parentList = [];
  for (k = champion_length; k < generationSize; k++) {
    var parent1 = selectFromAllParents(scores, parentList);
    var parent2 = parent1;
    while (parent2 == parent1) {
      parent2 = selectFromAllParents(scores, parentList, parent1);
    }
    var pair = [parent1, parent2]
    parentList.push(pair);
    newborn = makeChild(config,
      pair.map(function(parent) { return scores[parent].def; })
    );
    newborn = mutate(config, newborn);
    newborn.is_elite = false;
    newborn.index = k;
    newGeneration.push(newborn);
  }

  return {
    counter: previousState.counter + 1,
    generation: newGeneration,
  };
}


function makeChild(config, parents){
  var schema = config.schema,
    pickParent = config.pickParent;
  return create.createCrossBreed(schema, parents, pickParent)
}


function mutate(config, parent){
  var schema = config.schema,
    mutation_range = config.mutation_range,
    gen_mutation = config.gen_mutation,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    Math.max(mutation_range),
    gen_mutation
  )
}

},{"../create-instance":20}],22:[function(require,module,exports){


const random = {
  shuffleIntegers(prop, generator){
    return random.mapToShuffle(prop, random.createNormals({
      length: prop.length || 10,
      inclusive: true,
    }, generator));
  },
  createIntegers(prop, generator){
    return random.mapToInteger(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createFloats(prop, generator){
    return random.mapToFloat(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createNormals(prop, generator){
    var l = prop.length;
    var values = [];
    for(var i = 0; i < l; i++){
      values.push(
        createNormal(prop, generator)
      );
    }
    return values;
  },
  mutateShuffle(
    prop, generator, originalValues, mutation_range, chanceToMutate
  ){
    return random.mapToShuffle(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateIntegers(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToInteger(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateFloats(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToFloat(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mapToShuffle(prop, normals){
    var offset = prop.offset || 0;
    var limit = prop.limit || prop.length;
    var sorted = normals.slice().sort(function(a, b){
      return a - b;
    });
    return normals.map(function(val){
      return sorted.indexOf(val);
    }).map(function(i){
      return i + offset;
    }).slice(0, limit);
  },
  mapToInteger(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 10,
      length: prop.length
    }
    return random.mapToFloat(prop, normals).map(function(float){
      return Math.round(float);
    });
  },
  mapToFloat(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    return normals.map(function(normal){
      var min = prop.min;
      var range = prop.range;
      return min + normal * range
    })
  },
  mutateNormals(prop, generator, originalValues, mutation_range, chanceToMutate){
    var factor = (prop.factor || 1) * mutation_range
    return originalValues.map(function(originalValue){
      if(generator() > chanceToMutate){
        return originalValue;
      }
      return mutateNormal(
        prop, generator, originalValue, factor
      );
    });
  }
};

module.exports = random;

function mutateNormal(prop, generator, originalValue, mutation_range){
  if(mutation_range > 1){
    throw new Error("Cannot mutate beyond bounds");
  }
  var newMin = originalValue - 0.5;
  if (newMin < 0) newMin = 0;
  if (newMin + mutation_range  > 1)
    newMin = 1 - mutation_range;
  var rangeValue = createNormal({
    inclusive: true,
  }, generator);
  return newMin + rangeValue * mutation_range;
}

function createNormal(prop, generator){
  if(!prop.inclusive){
    return generator();
  } else {
    return generator() < 0.5 ?
    generator() :
    1 - generator();
  }
}

},{}],23:[function(require,module,exports){
/* globals btoa */
var setupScene = require("./setup-scene");
var carRun = require("../car-schema/run");
var defToCar = require("../car-schema/def-to-car");

module.exports = runDefs;
function runDefs(world_def, defs, listeners) {
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    world_def.floorseed = btoa(Math.seedrandom());
  }

  var scene = setupScene(world_def);
  scene.world.Step(1 / world_def.box2dfps, 20, 20);
  console.log("about to build cars");
  var cars = defs.map((def, i) => {
    return {
      index: i,
      def: def,
      car: defToCar(def, scene.world, world_def),
      state: carRun.getInitialState(world_def)
    };
  });
  var alivecars = cars;
  return {
    scene: scene,
    cars: cars,
    step: function () {
      if (alivecars.length === 0) {
        throw new Error("no more cars");
      }
      scene.world.Step(1 / world_def.box2dfps, 20, 20);
      listeners.preCarStep();
      alivecars = alivecars.filter(function (car) {
        car.state = carRun.updateState(
          world_def, car.car, car.state
        );
        var status = carRun.getStatus(car.state, world_def);
        listeners.carStep(car);
        if (status === 0) {
          return true;
        }
        car.score = carRun.calculateScore(car.state, world_def);
        listeners.carDeath(car);

        var world = scene.world;
        var worldCar = car.car;
        world.DestroyBody(worldCar.chassis);

        for (var w = 0; w < worldCar.wheels.length; w++) {
          world.DestroyBody(worldCar.wheels[w]);
        }

        return false;
      })
      if (alivecars.length === 0) {
        listeners.generationEnd(cars);
      }
    }
  }

}

},{"../car-schema/def-to-car":3,"../car-schema/run":4,"./setup-scene":24}],24:[function(require,module,exports){
/* globals b2World b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

/*

world_def = {
  gravity: {x, y},
  doSleep: boolean,
  floorseed: string,
  tileDimensions,
  maxFloorTiles,
  mutable_floor: boolean
}

*/

module.exports = function(world_def){

  var world = new b2World(world_def.gravity, world_def.doSleep);
  var floorTiles = cw_createFloor(
    world,
    world_def.floorseed,
    world_def.tileDimensions,
    world_def.maxFloorTiles,
    world_def.mutable_floor
  );

  var last_tile = floorTiles[
    floorTiles.length - 1
  ];
  var last_fixture = last_tile.GetFixtureList();
  var tile_position = last_tile.GetWorldPoint(
    last_fixture.GetShape().m_vertices[3]
  );
  world.finishLine = tile_position.x;
  return {
    world: world,
    floorTiles: floorTiles,
    finishLine: tile_position.x
  };
}

function cw_createFloor(world, floorseed, dimensions, maxFloorTiles, mutable_floor) {
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  var cw_floorTiles = [];
  Math.seedrandom(floorseed);
  for (var k = 0; k < maxFloorTiles; k++) {
    if (!mutable_floor) {
      // keep old impossible tracks if not using mutable floors
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.5 * k / maxFloorTiles
      );
    } else {
      // if path is mutable over races, create smoother tracks
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.2 * k / maxFloorTiles
      );
    }
    cw_floorTiles.push(last_tile);
    var last_fixture = last_tile.GetFixtureList();
    tile_position = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
  }
  return cw_floorTiles;
}


function cw_createFloorTile(world, dim, position, angle) {
  var body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0, 0));
  coords.push(new b2Vec2(0, -dim.y));
  coords.push(new b2Vec2(dim.x, -dim.y));
  coords.push(new b2Vec2(dim.x, 0));

  var center = new b2Vec2(0, 0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  return coords.map(function(coord){
    return {
      x: Math.cos(angle) * (coord.x - center.x) - Math.sin(angle) * (coord.y - center.y) + center.x,
      y: Math.sin(angle) * (coord.x - center.x) + Math.cos(angle) * (coord.y - center.y) + center.y,
    };
  });
}

},{}]},{},[19])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9fYnJvd3Nlci1wYWNrQDYuMC40QGJyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9jYXItc2NoZW1hL2Nhci1jb25zdGFudHMuanNvbiIsInNyYy9jYXItc2NoZW1hL2NvbnN0cnVjdC5qcyIsInNyYy9jYXItc2NoZW1hL2RlZi10by1jYXIuanMiLCJzcmMvY2FyLXNjaGVtYS9ydW4uanMiLCJzcmMvZHJhdy9kcmF3LWNhci1zdGF0cy5qcyIsInNyYy9kcmF3L2RyYXctY2FyLmpzIiwic3JjL2RyYXcvZHJhdy1jaXJjbGUuanMiLCJzcmMvZHJhdy9kcmF3LWZsb29yLmpzIiwic3JjL2RyYXcvZHJhdy12aXJ0dWFsLXBvbHkuanMiLCJzcmMvZHJhdy9wbG90LWdyYXBocy5qcyIsInNyYy9kcmF3L3NjYXR0ZXItcGxvdC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9nZW5lcmF0ZVJhbmRvbS5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmJyZWVkaW5nLWNvZWZmaWNpZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luZGV4LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3BpY2tQYXJlbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvc2VsZWN0RnJvbUFsbFBhcmVudHMuanMiLCJzcmMvZ2hvc3QvY2FyLXRvLWdob3N0LmpzIiwic3JjL2dob3N0L2luZGV4LmpzIiwic3JjL2luZGV4LmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvcmFuZG9tLmpzIiwic3JjL3dvcmxkL3J1bi5qcyIsInNyYy93b3JsZC9zZXR1cC1zY2VuZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCJtb2R1bGUuZXhwb3J0cz17XHJcbiAgXCJ3aGVlbENvdW50XCI6IDIsXHJcbiAgXCJ3aGVlbE1pblJhZGl1c1wiOiAwLjIsXHJcbiAgXCJ3aGVlbFJhZGl1c1JhbmdlXCI6IDAuNSxcclxuICBcIndoZWVsTWluRGVuc2l0eVwiOiA0MCxcclxuICBcIndoZWVsRGVuc2l0eVJhbmdlXCI6IDEwMCxcclxuICBcImNoYXNzaXNEZW5zaXR5UmFuZ2VcIjogMzAwLFxyXG4gIFwiY2hhc3Npc01pbkRlbnNpdHlcIjogMzAsXHJcbiAgXCJjaGFzc2lzTWluQXhpc1wiOiAwLjEsXHJcbiAgXCJjaGFzc2lzQXhpc1JhbmdlXCI6IDEuMVxyXG59XHJcbiIsInZhciBjYXJDb25zdGFudHMgPSByZXF1aXJlKFwiLi9jYXItY29uc3RhbnRzLmpzb25cIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICB3b3JsZERlZjogd29ybGREZWYsXHJcbiAgY2FyQ29uc3RhbnRzOiBnZXRDYXJDb25zdGFudHMsXHJcbiAgZ2VuZXJhdGVTY2hlbWE6IGdlbmVyYXRlU2NoZW1hXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdvcmxkRGVmKCl7XHJcbiAgdmFyIGJveDJkZnBzID0gNjA7XHJcbiAgcmV0dXJuIHtcclxuICAgIGdyYXZpdHk6IHsgeTogMCB9LFxyXG4gICAgZG9TbGVlcDogdHJ1ZSxcclxuICAgIGZsb29yc2VlZDogXCJhYmNcIixcclxuICAgIG1heEZsb29yVGlsZXM6IDIwMCxcclxuICAgIG11dGFibGVfZmxvb3I6IGZhbHNlLFxyXG4gICAgbW90b3JTcGVlZDogMjAsXHJcbiAgICBib3gyZGZwczogYm94MmRmcHMsXHJcbiAgICBtYXhfY2FyX2hlYWx0aDogYm94MmRmcHMgKiAxMCxcclxuICAgIHRpbGVEaW1lbnNpb25zOiB7XHJcbiAgICAgIHdpZHRoOiAxLjUsXHJcbiAgICAgIGhlaWdodDogMC4xNVxyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENhckNvbnN0YW50cygpe1xyXG4gIHJldHVybiBjYXJDb25zdGFudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlU2NoZW1hKHZhbHVlcyl7XHJcbiAgcmV0dXJuIHtcclxuICAgIHdoZWVsX3JhZGl1czoge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluUmFkaXVzLFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsUmFkaXVzUmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB3aGVlbF9kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5EZW5zaXR5LFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsRGVuc2l0eVJhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgY2hhc3Npc19kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiAxLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzRGVuc2l0eVJhbmdlLFxyXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNNaW5EZW5zaXR5LFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgdmVydGV4X2xpc3Q6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IDEyLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzTWluQXhpcyxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzQXhpc1JhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgd2hlZWxfdmVydGV4OiB7XHJcbiAgICAgIHR5cGU6IFwic2h1ZmZsZVwiLFxyXG4gICAgICBsZW5ndGg6IDgsXHJcbiAgICAgIGxpbWl0OiAyLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gIH07XHJcbn1cclxuIiwiLypcclxuICBnbG9iYWxzIGIyUmV2b2x1dGVKb2ludERlZiBiMlZlYzIgYjJCb2R5RGVmIGIyQm9keSBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgYjJDaXJjbGVTaGFwZVxyXG4qL1xyXG5cclxudmFyIGNyZWF0ZUluc3RhbmNlID0gcmVxdWlyZShcIi4uL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBkZWZUb0NhcjtcclxuXHJcbmZ1bmN0aW9uIGRlZlRvQ2FyKG5vcm1hbF9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xyXG4gIHZhciBjYXJfZGVmID0gY3JlYXRlSW5zdGFuY2UuYXBwbHlUeXBlcyhjb25zdGFudHMuc2NoZW1hLCBub3JtYWxfZGVmKVxyXG4gIHZhciBpbnN0YW5jZSA9IHt9O1xyXG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxyXG4gICAgd29ybGQsIGNhcl9kZWYudmVydGV4X2xpc3QsIGNhcl9kZWYuY2hhc3Npc19kZW5zaXR5XHJcbiAgKTtcclxuICB2YXIgaTtcclxuXHJcbiAgdmFyIHdoZWVsQ291bnQgPSBjYXJfZGVmLndoZWVsX3JhZGl1cy5sZW5ndGg7XHJcblxyXG4gIGluc3RhbmNlLndoZWVscyA9IFtdO1xyXG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcclxuICAgIGluc3RhbmNlLndoZWVsc1tpXSA9IGNyZWF0ZVdoZWVsKFxyXG4gICAgICB3b3JsZCxcclxuICAgICAgY2FyX2RlZi53aGVlbF9yYWRpdXNbaV0sXHJcbiAgICAgIGNhcl9kZWYud2hlZWxfZGVuc2l0eVtpXVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHZhciBjYXJtYXNzID0gaW5zdGFuY2UuY2hhc3Npcy5HZXRNYXNzKCk7XHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcclxuXHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xyXG5cclxuICAgIHZhciByYW5kdmVydGV4ID0gaW5zdGFuY2UuY2hhc3Npcy52ZXJ0ZXhfbGlzdFtjYXJfZGVmLndoZWVsX3ZlcnRleFtpXV07XHJcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XHJcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JCLlNldCgwLCAwKTtcclxuICAgIGpvaW50X2RlZi5tYXhNb3RvclRvcnF1ZSA9IHRvcnF1ZTtcclxuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xyXG4gICAgam9pbnRfZGVmLmVuYWJsZU1vdG9yID0gdHJ1ZTtcclxuICAgIGpvaW50X2RlZi5ib2R5QSA9IGluc3RhbmNlLmNoYXNzaXM7XHJcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XHJcbiAgICB3b3JsZC5DcmVhdGVKb2ludChqb2ludF9kZWYpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGluc3RhbmNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzKHdvcmxkLCB2ZXJ0ZXhzLCBkZW5zaXR5KSB7XHJcblxyXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzBdLCAwKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMV0sIHZlcnRleHNbMl0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s0XSwgdmVydGV4c1s1XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s2XSwgMCkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgLXZlcnRleHNbOV0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxMF0sIC12ZXJ0ZXhzWzExXSkpO1xyXG5cclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xyXG5cclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG5cclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFswXSwgdmVydGV4X2xpc3RbMV0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzFdLCB2ZXJ0ZXhfbGlzdFsyXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFszXSwgdmVydGV4X2xpc3RbNF0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzRdLCB2ZXJ0ZXhfbGlzdFs1XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs2XSwgdmVydGV4X2xpc3RbN10sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzddLCB2ZXJ0ZXhfbGlzdFswXSwgZGVuc2l0eSk7XHJcblxyXG4gIGJvZHkudmVydGV4X2xpc3QgPSB2ZXJ0ZXhfbGlzdDtcclxuXHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXgxLCB2ZXJ0ZXgyLCBkZW5zaXR5KSB7XHJcbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XHJcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDIpO1xyXG4gIHZlcnRleF9saXN0LnB1c2goYjJWZWMyLk1ha2UoMCwgMCkpO1xyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcclxuICBmaXhfZGVmLmRlbnNpdHkgPSBkZW5zaXR5O1xyXG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcclxuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xyXG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcclxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xyXG5cclxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVdoZWVsKHdvcmxkLCByYWRpdXMsIGRlbnNpdHkpIHtcclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMCwgMCk7XHJcblxyXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XHJcblxyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJDaXJjbGVTaGFwZShyYWRpdXMpO1xyXG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XHJcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcclxuICBmaXhfZGVmLmZpbHRlci5ncm91cEluZGV4ID0gLTE7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxuICByZXR1cm4gYm9keTtcclxufVxyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdldEluaXRpYWxTdGF0ZTogZ2V0SW5pdGlhbFN0YXRlLFxyXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcclxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcclxuICBjYWxjdWxhdGVTY29yZTogY2FsY3VsYXRlU2NvcmUsXHJcbn07XHJcblxyXG5mdW5jdGlvbiBnZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKXtcclxuICByZXR1cm4ge1xyXG4gICAgZnJhbWVzOiAwLFxyXG4gICAgaGVhbHRoOiB3b3JsZF9kZWYubWF4X2Nhcl9oZWFsdGgsXHJcbiAgICBtYXhQb3NpdGlvbnk6IDAsXHJcbiAgICBtaW5Qb3NpdGlvbnk6IDAsXHJcbiAgICBtYXhQb3NpdGlvbng6IDAsXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU3RhdGUoY29uc3RhbnRzLCB3b3JsZENvbnN0cnVjdCwgc3RhdGUpe1xyXG4gIGlmKHN0YXRlLmhlYWx0aCA8PSAwKXtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkFscmVhZHkgRGVhZFwiKTtcclxuICB9XHJcbiAgaWYoc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpe1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSBGaW5pc2hlZFwiKTtcclxuICB9XHJcblxyXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlKTtcclxuICAvLyBjaGVjayBoZWFsdGhcclxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbiAgLy8gY2hlY2sgaWYgY2FyIHJlYWNoZWQgZW5kIG9mIHRoZSBwYXRoXHJcbiAgdmFyIG5leHRTdGF0ZSA9IHtcclxuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcclxuICAgIG1heFBvc2l0aW9ueDogcG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCA/IHBvc2l0aW9uLnggOiBzdGF0ZS5tYXhQb3NpdGlvbngsXHJcbiAgICBtYXhQb3NpdGlvbnk6IHBvc2l0aW9uLnkgPiBzdGF0ZS5tYXhQb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgbWluUG9zaXRpb255OiBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueVxyXG4gIH07XHJcblxyXG4gIGlmIChwb3NpdGlvbi54ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpIHtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfVxyXG5cclxuICBpZiAocG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCArIDAuMDIpIHtcclxuICAgIG5leHRTdGF0ZS5oZWFsdGggPSBjb25zdGFudHMubWF4X2Nhcl9oZWFsdGg7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH1cclxuICBuZXh0U3RhdGUuaGVhbHRoID0gc3RhdGUuaGVhbHRoIC0gMTtcclxuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcclxuICAgIG5leHRTdGF0ZS5oZWFsdGggLT0gNTtcclxuICB9XHJcbiAgcmV0dXJuIG5leHRTdGF0ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xyXG4gIGlmKGhhc0ZhaWxlZChzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIC0xO1xyXG4gIGlmKGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAxO1xyXG4gIHJldHVybiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XHJcbiAgcmV0dXJuIHN0YXRlLmhlYWx0aCA8PSAwO1xyXG59XHJcbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XHJcbiAgcmV0dXJuIHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxjdWxhdGVTY29yZShzdGF0ZSwgY29uc3RhbnRzKXtcclxuICB2YXIgYXZnc3BlZWQgPSAoc3RhdGUubWF4UG9zaXRpb254IC8gc3RhdGUuZnJhbWVzKSAqIGNvbnN0YW50cy5ib3gyZGZwcztcclxuICB2YXIgcG9zaXRpb24gPSBzdGF0ZS5tYXhQb3NpdGlvbng7XHJcbiAgdmFyIHNjb3JlID0gcG9zaXRpb24gKyBhdmdzcGVlZDtcclxuICByZXR1cm4ge1xyXG4gICAgdjogc2NvcmUsXHJcbiAgICBzOiBhdmdzcGVlZCxcclxuICAgIHg6IHBvc2l0aW9uLFxyXG4gICAgeTogc3RhdGUubWF4UG9zaXRpb255LFxyXG4gICAgeTI6IHN0YXRlLm1pblBvc2l0aW9ueVxyXG4gIH1cclxufVxyXG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50ICovXHJcblxyXG52YXIgcnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT0gQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbnZhciBjd19DYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUuX19jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChjYXIpIHtcclxuICB0aGlzLmNhciA9IGNhcjtcclxuICB0aGlzLmNhcl9kZWYgPSBjYXIuZGVmO1xyXG4gIHZhciBjYXJfZGVmID0gdGhpcy5jYXJfZGVmO1xyXG5cclxuICB0aGlzLmZyYW1lcyA9IDA7XHJcbiAgdGhpcy5hbGl2ZSA9IHRydWU7XHJcbiAgdGhpcy5pc19lbGl0ZSA9IGNhci5kZWYuaXNfZWxpdGU7XHJcbiAgdGhpcy5oZWFsdGhCYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiICsgY2FyX2RlZi5pbmRleCkuc3R5bGU7XHJcbiAgdGhpcy5oZWFsdGhCYXJUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xyXG4gIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIHRoaXMubWluaW1hcG1hcmtlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmFyXCIgKyBjYXJfZGVmLmluZGV4KTtcclxuXHJcbiAgaWYgKHRoaXMuaXNfZWxpdGUpIHtcclxuICAgIHRoaXMuaGVhbHRoQmFyLmJhY2tncm91bmRDb2xvciA9IFwiIzNGNzJBRlwiO1xyXG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjRjdDODczXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICNGN0M4NzNcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuY2FyLmNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XHJcbn1cclxuXHJcbmN3X0Nhci5wcm90b3R5cGUua2lsbCA9IGZ1bmN0aW9uIChjdXJyZW50UnVubmVyLCBjb25zdGFudHMpIHtcclxuICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcclxuICB2YXIgZmluaXNoTGluZSA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmluaXNoTGluZVxyXG4gIHZhciBtYXhfY2FyX2hlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcclxuICB2YXIgc3RhdHVzID0gcnVuLmdldFN0YXR1cyh0aGlzLmNhci5zdGF0ZSwge1xyXG4gICAgZmluaXNoTGluZTogZmluaXNoTGluZSxcclxuICAgIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcclxuICB9KVxyXG4gIHN3aXRjaChzdGF0dXMpe1xyXG4gICAgY2FzZSAxOiB7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XHJcbiAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgICBjYXNlIC0xOiB7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBcIiZkYWdnZXI7XCI7XHJcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XHJcbiAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgfVxyXG4gIHRoaXMuYWxpdmUgPSBmYWxzZTtcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY3dfQ2FyO1xyXG4iLCJcclxudmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG52YXIgY3dfZHJhd0NpcmNsZSA9IHJlcXVpcmUoXCIuL2RyYXctY2lyY2xlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXJfY29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpe1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcclxuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xyXG5cclxuICB2YXIgd2hlZWxNaW5EZW5zaXR5ID0gY2FyX2NvbnN0YW50cy53aGVlbE1pbkRlbnNpdHlcclxuICB2YXIgd2hlZWxEZW5zaXR5UmFuZ2UgPSBjYXJfY29uc3RhbnRzLndoZWVsRGVuc2l0eVJhbmdlXHJcblxyXG4gIGlmICghbXlDYXIuYWxpdmUpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIG15Q2FyUG9zID0gbXlDYXIuZ2V0UG9zaXRpb24oKTtcclxuXHJcbiAgaWYgKG15Q2FyUG9zLnggPCAoY2FtZXJhX3ggLSA1KSkge1xyXG4gICAgLy8gdG9vIGZhciBiZWhpbmQsIGRvbid0IGRyYXdcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzQ0NFwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuXHJcbiAgdmFyIHdoZWVscyA9IG15Q2FyLmNhci5jYXIud2hlZWxzO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHdoZWVscy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGIgPSB3aGVlbHNbaV07XHJcbiAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcbiAgICAgIHZhciBjb2xvciA9IE1hdGgucm91bmQoMjU1IC0gKDI1NSAqIChmLm1fZGVuc2l0eSAtIHdoZWVsTWluRGVuc2l0eSkpIC8gd2hlZWxEZW5zaXR5UmFuZ2UpLnRvU3RyaW5nKCk7XHJcbiAgICAgIHZhciByZ2Jjb2xvciA9IFwicmdiKFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIsXCIgKyBjb2xvciArIFwiKVwiO1xyXG4gICAgICBjd19kcmF3Q2lyY2xlKGN0eCwgYiwgcy5tX3AsIHMubV9yYWRpdXMsIGIubV9zd2VlcC5hLCByZ2Jjb2xvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAobXlDYXIuaXNfZWxpdGUpIHtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0RCRTJFRlwiO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNGN0M4NzNcIjtcclxuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGQUVCQ0RcIjtcclxuICB9XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICB2YXIgY2hhc3NpcyA9IG15Q2FyLmNhci5jYXIuY2hhc3NpcztcclxuXHJcbiAgZm9yIChmID0gY2hhc3Npcy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBjcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xyXG4gIH1cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCJcclxubW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xyXG5cclxuZnVuY3Rpb24gY3dfZHJhd0NpcmNsZShjdHgsIGJvZHksIGNlbnRlciwgcmFkaXVzLCBhbmdsZSwgY29sb3IpIHtcclxuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcclxuXHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGN0eC5hcmMocC54LCBwLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG5cclxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcclxuICBjdHgubGluZVRvKHAueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgcC55ICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpKTtcclxuXHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgY2FtZXJhLCBjd19mbG9vclRpbGVzKSB7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjMDAwXCI7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiIzc3N1wiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gIHZhciBrO1xyXG4gIGlmKGNhbWVyYS5wb3MueCAtIDEwID4gMCl7XHJcbiAgICBrID0gTWF0aC5mbG9vcigoY2FtZXJhLnBvcy54IC0gMTApIC8gMS41KTtcclxuICB9IGVsc2Uge1xyXG4gICAgayA9IDA7XHJcbiAgfVxyXG5cclxuICAvLyBjb25zb2xlLmxvZyhrKTtcclxuXHJcbiAgb3V0ZXJfbG9vcDpcclxuICAgIGZvciAoazsgayA8IGN3X2Zsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcclxuICAgICAgdmFyIGIgPSBjd19mbG9vclRpbGVzW2tdO1xyXG4gICAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgICAgICB2YXIgc2hhcGVQb3NpdGlvbiA9IGIuR2V0V29ybGRQb2ludChzLm1fdmVydGljZXNbMF0pLng7XHJcbiAgICAgICAgaWYgKChzaGFwZVBvc2l0aW9uID4gKGNhbWVyYV94IC0gNSkpICYmIChzaGFwZVBvc2l0aW9uIDwgKGNhbWVyYV94ICsgMTApKSkge1xyXG4gICAgICAgICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgYiwgcy5tX3ZlcnRpY2VzLCBzLm1fdmVydGV4Q291bnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc2hhcGVQb3NpdGlvbiA+IGNhbWVyYV94ICsgMTApIHtcclxuICAgICAgICAgIGJyZWFrIG91dGVyX2xvb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuIiwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgYm9keSwgdnR4LCBuX3Z0eCkge1xyXG4gIC8vIHNldCBzdHJva2VzdHlsZSBhbmQgZmlsbHN0eWxlIGJlZm9yZSBjYWxsXHJcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcclxuXHJcbiAgdmFyIHAwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFswXSk7XHJcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcclxuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcclxuICAgIHZhciBwID0gYm9keS5HZXRXb3JsZFBvaW50KHZ0eFtpXSk7XHJcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcclxuICB9XHJcbiAgY3R4LmxpbmVUbyhwMC54LCBwMC55KTtcclxufVxyXG4iLCJ2YXIgc2NhdHRlclBsb3QgPSByZXF1aXJlKFwiLi9zY2F0dGVyLXBsb3RcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBwbG90R3JhcGhzOiBmdW5jdGlvbihncmFwaEVsZW0sIHRvcFNjb3Jlc0VsZW0sIHNjYXR0ZXJQbG90RWxlbSwgbGFzdFN0YXRlLCBzY29yZXMsIGNvbmZpZykge1xyXG4gICAgbGFzdFN0YXRlID0gbGFzdFN0YXRlIHx8IHt9O1xyXG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxyXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xyXG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XHJcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XHJcbiAgICB2YXIgbmV4dFN0YXRlID0gY3dfc3RvcmVHcmFwaFNjb3JlcyhcclxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXHJcbiAgICApO1xyXG4gICAgY29uc29sZS5sb2coc2NvcmVzLCBuZXh0U3RhdGUpO1xyXG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcclxuICAgIGN3X3Bsb3RBdmVyYWdlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdEVsaXRlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X2xpc3RUb3BTY29yZXModG9wU2NvcmVzRWxlbSwgbmV4dFN0YXRlKTtcclxuICAgIG5leHRTdGF0ZS5zY2F0dGVyR3JhcGggPSBkcmF3QWxsUmVzdWx0cyhcclxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxyXG4gICAgKTtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfSxcclxuICBjbGVhckdyYXBoaWNzOiBmdW5jdGlvbihncmFwaEVsZW0pIHtcclxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcclxuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHZhciBncmFwaHdpZHRoID0gNDAwO1xyXG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xyXG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcclxuICB9XHJcbn07XHJcblxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcmVHcmFwaFNjb3JlcyhsYXN0U3RhdGUsIGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICBjb25zb2xlLmxvZyhjd19jYXJTY29yZXMpO1xyXG4gIHJldHVybiB7XHJcbiAgICBjd190b3BTY29yZXM6IChsYXN0U3RhdGUuY3dfdG9wU2NvcmVzIHx8IFtdKVxyXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXHJcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IChsYXN0U3RhdGUuY3dfZ3JhcGhBdmVyYWdlIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19hdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXHJcbiAgICBdKSxcclxuICAgIGN3X2dyYXBoRWxpdGU6IChsYXN0U3RhdGUuY3dfZ3JhcGhFbGl0ZSB8fCBbXSkuY29uY2F0KFtcclxuICAgICAgY3dfZWxpdGVhdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXHJcbiAgICBdKSxcclxuICAgIGN3X2dyYXBoVG9wOiAobGFzdFN0YXRlLmN3X2dyYXBoVG9wIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19jYXJTY29yZXNbMF0uc2NvcmUudlxyXG4gICAgXSksXHJcbiAgICBhbGxSZXN1bHRzOiAobGFzdFN0YXRlLmFsbFJlc3VsdHMgfHwgW10pLmNvbmNhdChjd19jYXJTY29yZXMpLFxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcGxvdFRvcChzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcclxuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhUb3AubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjQzgzQjNCXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90RWxpdGUoc3RhdGUsIGdyYXBoY3R4KSB7XHJcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEVsaXRlLmxlbmd0aDtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzdCQzc0RFwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XHJcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90QXZlcmFnZShzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEF2ZXJhZ2UubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xyXG4gIH1cclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7IGsrKykge1xyXG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xyXG4gIH1cclxuICByZXR1cm4gc3VtIC8gTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19hdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICB2YXIgc3VtID0gMDtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcclxuICB9XHJcbiAgcmV0dXJuIHN1bSAvIGdlbmVyYXRpb25TaXplO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpIHtcclxuICBncmFwaGNhbnZhcy53aWR0aCA9IGdyYXBoY2FudmFzLndpZHRoO1xyXG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XHJcbiAgZ3JhcGhjdHguc2NhbGUoMSwgLTEpO1xyXG4gIGdyYXBoY3R4LmxpbmVXaWR0aCA9IDE7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyA0KTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0ICogMyAvIDQpO1xyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19saXN0VG9wU2NvcmVzKGVsZW0sIHN0YXRlKSB7XHJcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcclxuICB2YXIgdHMgPSBlbGVtO1xyXG4gIHRzLmlubmVySFRNTCA9IFwiPGI+VG9wIFNjb3Jlczo8L2I+PGJyIC8+XCI7XHJcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIGlmIChhLnYgPiBiLnYpIHtcclxuICAgICAgcmV0dXJuIC0xXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGgubWluKDEwLCBjd190b3BTY29yZXMubGVuZ3RoKTsgaysrKSB7XHJcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XHJcbiAgICAvLyBjb25zb2xlLmxvZyh0b3BTY29yZSk7XHJcbiAgICB2YXIgbiA9IFwiI1wiICsgKGsgKyAxKSArIFwiOlwiO1xyXG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcclxuICAgIHZhciBkaXN0YW5jZSA9IFwiZDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueCAqIDEwMCkgLyAxMDA7XHJcbiAgICB2YXIgeXJhbmdlID0gIFwiaDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueTIgKiAxMDApIC8gMTAwICsgXCIvXCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnkgKiAxMDApIC8gMTAwICsgXCJtXCI7XHJcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxyXG5cclxuICAgIHRzLmlubmVySFRNTCArPSAgW24sIHNjb3JlLCBkaXN0YW5jZSwgeXJhbmdlLCBnZW5dLmpvaW4oXCIgXCIpICsgXCI8YnIgLz5cIjtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcclxuICBpZighc2NhdHRlclBsb3RFbGVtKSByZXR1cm47XHJcbiAgcmV0dXJuIHNjYXR0ZXJQbG90KHNjYXR0ZXJQbG90RWxlbSwgYWxsUmVzdWx0cywgY29uZmlnLnByb3BlcnR5TWFwLCBwcmV2aW91c0dyYXBoKVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgdmlzIEhpZ2hjaGFydHMgKi9cclxuXHJcbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGhpZ2hDaGFydHM7XHJcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNjb3Jlc1swXS5kZWYpO1xyXG4gIGtleXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbihjdXJBcnJheSwga2V5KXtcclxuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcclxuICAgIHZhciBzdWJBcnJheSA9IFtdO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjdXJBcnJheS5jb25jYXQoc3ViQXJyYXkpO1xyXG4gIH0sIFtdKTtcclxuICBmdW5jdGlvbiByZXRyaWV2ZVZhbHVlKG9iaiwgcGF0aCl7XHJcbiAgICByZXR1cm4gcGF0aC5zcGxpdChcIi5cIikucmVkdWNlKGZ1bmN0aW9uKGN1clZhbHVlLCBrZXkpe1xyXG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcclxuICAgIH0sIG9iaik7XHJcbiAgfVxyXG5cclxuICB2YXIgZGF0YU9iaiA9IE9iamVjdC5rZXlzKHNjb3JlcykucmVkdWNlKGZ1bmN0aW9uKGt2LCBzY29yZSl7XHJcbiAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KXtcclxuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xyXG4gICAgICAgIHJldHJpZXZlVmFsdWUoc2NvcmUuZGVmLCBrZXkpLCBzY29yZS5zY29yZS52XHJcbiAgICAgIF0pXHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIGt2O1xyXG4gIH0sIGtleXMucmVkdWNlKGZ1bmN0aW9uKGt2LCBrZXkpe1xyXG4gICAga3Zba2V5XSA9IHtcclxuICAgICAgbmFtZToga2V5LFxyXG4gICAgICBkYXRhOiBbXSxcclxuICAgIH1cclxuICAgIHJldHVybiBrdjtcclxuICB9LCB7fSkpXHJcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XHJcbiAgICAgIGNoYXJ0OiB7XHJcbiAgICAgICAgICB0eXBlOiAnc2NhdHRlcicsXHJcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xyXG4gICAgICB9LFxyXG4gICAgICB0aXRsZToge1xyXG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xyXG4gICAgICB9LFxyXG4gICAgICB4QXhpczoge1xyXG4gICAgICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgIHRleHQ6ICdOb3JtYWxpemVkJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHN0YXJ0T25UaWNrOiB0cnVlLFxyXG4gICAgICAgICAgZW5kT25UaWNrOiB0cnVlLFxyXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICB5QXhpczoge1xyXG4gICAgICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgICAgICB0ZXh0OiAnU2NvcmUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGxlZ2VuZDoge1xyXG4gICAgICAgICAgbGF5b3V0OiAndmVydGljYWwnLFxyXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcclxuICAgICAgICAgIHZlcnRpY2FsQWxpZ246ICd0b3AnLFxyXG4gICAgICAgICAgeDogMTAwLFxyXG4gICAgICAgICAgeTogNzAsXHJcbiAgICAgICAgICBmbG9hdGluZzogdHJ1ZSxcclxuICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogKEhpZ2hjaGFydHMudGhlbWUgJiYgSGlnaGNoYXJ0cy50aGVtZS5sZWdlbmRCYWNrZ3JvdW5kQ29sb3IpIHx8ICcjRkZGRkZGJyxcclxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXHJcbiAgICAgIH0sXHJcbiAgICAgIHBsb3RPcHRpb25zOiB7XHJcbiAgICAgICAgICBzY2F0dGVyOiB7XHJcbiAgICAgICAgICAgICAgbWFya2VyOiB7XHJcbiAgICAgICAgICAgICAgICAgIHJhZGl1czogNSxcclxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBob3Zlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgc3RhdGVzOiB7XHJcbiAgICAgICAgICAgICAgICAgIGhvdmVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICB0b29sdGlwOiB7XHJcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXHJcbiAgICAgICAgICAgICAgICAgIHBvaW50Rm9ybWF0OiAne3BvaW50Lnh9LCB7cG9pbnQueX0nXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBzZXJpZXM6IGtleXMubWFwKGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcclxuICAgICAgfSlcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gdmlzQ2hhcnQoZWxlbSwgc2NvcmVzLCBwcm9wZXJ0eU1hcCwgZ3JhcGgpIHtcclxuXHJcbiAgLy8gQ3JlYXRlIGFuZCBwb3B1bGF0ZSBhIGRhdGEgdGFibGUuXHJcbiAgdmFyIGRhdGEgPSBuZXcgdmlzLkRhdGFTZXQoKTtcclxuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xyXG4gICAgZGF0YS5hZGQoe1xyXG4gICAgICB4OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxyXG4gICAgICB6OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxyXG4gICAgICBzdHlsZTogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcclxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5KGluZm8sIGtleSl7XHJcbiAgICBpZihrZXkgPT09IFwic2NvcmVcIil7XHJcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBpbmZvLmRlZltrZXldO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gc3BlY2lmeSBvcHRpb25zXHJcbiAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICB3aWR0aDogICc2MDBweCcsXHJcbiAgICBoZWlnaHQ6ICc2MDBweCcsXHJcbiAgICBzdHlsZTogJ2RvdC1zaXplJyxcclxuICAgIHNob3dQZXJzcGVjdGl2ZTogdHJ1ZSxcclxuICAgIHNob3dMZWdlbmQ6IHRydWUsXHJcbiAgICBzaG93R3JpZDogdHJ1ZSxcclxuICAgIHNob3dTaGFkb3c6IGZhbHNlLFxyXG5cclxuICAgIC8vIE9wdGlvbiB0b29sdGlwIGNhbiBiZSB0cnVlLCBmYWxzZSwgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBzdHJpbmcgd2l0aCBIVE1MIGNvbnRlbnRzXHJcbiAgICB0b29sdGlwOiBmdW5jdGlvbiAocG9pbnQpIHtcclxuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcclxuICAgICAgLy8gZGF0YSBpcyB0aGUgb3JpZ2luYWwgb2JqZWN0IHBhc3NlZCB0byB0aGUgcG9pbnQgY29uc3RydWN0b3JcclxuICAgICAgcmV0dXJuICdzY29yZTogPGI+JyArIHBvaW50LnogKyAnPC9iPjxicj4nOyAvLyArIHBvaW50LmRhdGEuZXh0cmE7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFRvb2x0aXAgZGVmYXVsdCBzdHlsaW5nIGNhbiBiZSBvdmVycmlkZGVuXHJcbiAgICB0b29sdGlwU3R5bGU6IHtcclxuICAgICAgY29udGVudDoge1xyXG4gICAgICAgIGJhY2tncm91bmQgICAgOiAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjcpJyxcclxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxyXG4gICAgICAgIGJvcmRlclJhZGl1cyAgOiAnMTBweCdcclxuICAgICAgfSxcclxuICAgICAgbGluZToge1xyXG4gICAgICAgIGJvcmRlckxlZnQgICAgOiAnMXB4IGRvdHRlZCByZ2JhKDAsIDAsIDAsIDAuNSknXHJcbiAgICAgIH0sXHJcbiAgICAgIGRvdDoge1xyXG4gICAgICAgIGJvcmRlciAgICAgICAgOiAnNXB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC41KSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBrZWVwQXNwZWN0UmF0aW86IHRydWUsXHJcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcclxuICB9O1xyXG5cclxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcclxuXHJcbiAgLy8gY3JlYXRlIG91ciBncmFwaFxyXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xyXG4gIGdyYXBoID0gbmV3IHZpcy5HcmFwaDNkKGNvbnRhaW5lciwgZGF0YSwgb3B0aW9ucyk7XHJcblxyXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXHJcbiAgcmV0dXJuIGdyYXBoO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVyYXRlUmFuZG9tO1xyXG5mdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbSgpe1xyXG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xyXG59XHJcbiIsIi8vIGh0dHA6Ly9zdW5taW5ndGFvLmJsb2dzcG90LmNvbS8yMDE2LzExL2luYnJlZWRpbmctY29lZmZpY2llbnQuaHRtbFxyXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcclxuXHJcbmZ1bmN0aW9uIGdldEluYnJlZWRpbmdDb2VmZmljaWVudChjaGlsZCl7XHJcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcclxuICB2YXIgZmxhZ2dlZCA9IG5ldyBTZXQoKTtcclxuICB2YXIgY29udmVyZ2VuY2VQb2ludHMgPSBuZXcgU2V0KCk7XHJcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcclxuXHJcbiAgdmFyIHN0b3JlZENvZWZmaWNpZW50cyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgcmV0dXJuIEFycmF5LmZyb20oY29udmVyZ2VuY2VQb2ludHMudmFsdWVzKCkpLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcclxuICAgIHZhciBpQ28gPSBnZXRDb2VmZmljaWVudChwb2ludCk7XHJcbiAgICByZXR1cm4gc3VtICsgaUNvO1xyXG4gIH0sIDApO1xyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XHJcbiAgICB2YXIgaXRlbXNJblF1ZXVlID0gW3sgbm9kZTogaW5pdE5vZGUsIHBhdGg6IFtdIH1dO1xyXG4gICAgZG97XHJcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XHJcbiAgICAgIHZhciBub2RlID0gaXRlbS5ub2RlO1xyXG4gICAgICB2YXIgcGF0aCA9IGl0ZW0ucGF0aDtcclxuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xyXG4gICAgICAgIHZhciBuZXh0UGF0aCA9IFsgbm9kZS5pZCBdLmNvbmNhdChwYXRoKTtcclxuICAgICAgICBpdGVtc0luUXVldWUgPSBpdGVtc0luUXVldWUuY29uY2F0KG5vZGUuYW5jZXN0cnkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBub2RlOiBwYXJlbnQsXHJcbiAgICAgICAgICAgIHBhdGg6IG5leHRQYXRoXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0pKTtcclxuICAgICAgfVxyXG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcclxuICAgICAgdmFyIG5ld0FuY2VzdG9yID0gIW5hbWVJbmRleC5oYXMobm9kZS5pZCk7XHJcbiAgICAgIGlmKG5ld0FuY2VzdG9yKXtcclxuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcclxuICAgICAgICAgIHBhcmVudHM6IChub2RlLmFuY2VzdHJ5IHx8IFtdKS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcclxuICAgICAgICAgICAgcmV0dXJuIHBhcmVudC5pZDtcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXHJcbiAgICAgICAgICBjaGlsZHJlbjogW10sXHJcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICBmbGFnZ2VkLmFkZChub2RlLmlkKVxyXG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZElkZW50aWZpZXIpe1xyXG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xyXG4gICAgICAgICAgaWYoIW9mZnNldHMpe1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgY2hpbGRJRCA9IHBhdGhbb2Zmc2V0c1sxXV07XHJcbiAgICAgICAgICBjb252ZXJnZW5jZVBvaW50cy5hZGQoY2hpbGRJRCk7XHJcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcclxuICAgICAgICAgICAgcGFyZW50OiBub2RlLmlkLFxyXG4gICAgICAgICAgICBvZmZzZXRzOiBvZmZzZXRzLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKHBhdGgubGVuZ3RoKXtcclxuICAgICAgICBuYW1lSW5kZXguZ2V0KG5vZGUuaWQpLmNoaWxkcmVuLnB1c2goe1xyXG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXHJcbiAgICAgICAgICBwYXRoOiBwYXRoXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFuZXdBbmNlc3Rvcil7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGlmKCFub2RlLmFuY2VzdHJ5KXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XHJcbiAgICBpZihzdG9yZWRDb2VmZmljaWVudHMuaGFzKGlkKSl7XHJcbiAgICAgIHJldHVybiBzdG9yZWRDb2VmZmljaWVudHMuZ2V0KGlkKTtcclxuICAgIH1cclxuICAgIHZhciBub2RlID0gbmFtZUluZGV4LmdldChpZCk7XHJcbiAgICB2YXIgdmFsID0gbm9kZS5jb252ZXJnZW5jZXMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcG9pbnQpe1xyXG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xyXG4gICAgICAgIHJldHVybiBzdW0gKyB2YWx1ZTtcclxuICAgICAgfSwgMSkpICogKDEgKyBnZXRDb2VmZmljaWVudChwb2ludC5wYXJlbnQpKTtcclxuICAgIH0sIDApO1xyXG4gICAgc3RvcmVkQ29lZmZpY2llbnRzLnNldChpZCwgdmFsKTtcclxuXHJcbiAgICByZXR1cm4gdmFsO1xyXG5cclxuICB9XHJcbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XHJcbiAgICB2YXIgY2ksIGNqLCBsaSwgbGo7XHJcbiAgICBvdXRlcmxvb3A6XHJcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XHJcbiAgICAgIGZvcihjaiA9IDAsIGxqID0gbGlzdEIubGVuZ3RoOyBjaiA8IGxqOyBjaisrKXtcclxuICAgICAgICBpZihsaXN0QVtjaV0gPT09IGxpc3RCW2NqXSl7XHJcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZihjaSA9PT0gbGkpe1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gW2NpLCBjal07XHJcbiAgfVxyXG59XHJcbiIsInZhciBjYXJDb25zdHJ1Y3QgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XHJcblxyXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xyXG5cclxudmFyIHNjaGVtYSA9IGNhckNvbnN0cnVjdC5nZW5lcmF0ZVNjaGVtYShjYXJDb25zdGFudHMpO1xyXG52YXIgcGlja1BhcmVudCA9IHJlcXVpcmUoXCIuL3BpY2tQYXJlbnRcIik7XHJcbnZhciBzZWxlY3RGcm9tQWxsUGFyZW50cyA9IHJlcXVpcmUoXCIuL3NlbGVjdEZyb21BbGxQYXJlbnRzXCIpO1xyXG5jb25zdCBjb25zdGFudHMgPSB7XHJcbiAgZ2VuZXJhdGlvblNpemU6IDIwLFxyXG4gIHNjaGVtYTogc2NoZW1hLFxyXG4gIGNoYW1waW9uTGVuZ3RoOiAxLFxyXG4gIG11dGF0aW9uX3JhbmdlOiAxLFxyXG4gIGdlbl9tdXRhdGlvbjogMC4wNSxcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe1xyXG4gIHZhciBjdXJyZW50Q2hvaWNlcyA9IG5ldyBNYXAoKTtcclxuICByZXR1cm4gT2JqZWN0LmFzc2lnbihcclxuICAgIHt9LFxyXG4gICAgY29uc3RhbnRzLFxyXG4gICAge1xyXG4gICAgICBzZWxlY3RGcm9tQWxsUGFyZW50czogc2VsZWN0RnJvbUFsbFBhcmVudHMsXHJcbiAgICAgIGdlbmVyYXRlUmFuZG9tOiByZXF1aXJlKFwiLi9nZW5lcmF0ZVJhbmRvbVwiKSxcclxuICAgICAgcGlja1BhcmVudDogcGlja1BhcmVudC5iaW5kKHZvaWQgMCwgY3VycmVudENob2ljZXMpLFxyXG4gICAgfVxyXG4gICk7XHJcbn1cclxubW9kdWxlLmV4cG9ydHMuY29uc3RhbnRzID0gY29uc3RhbnRzXHJcbiIsInZhciBuQXR0cmlidXRlcyA9IDE1O1xyXG5tb2R1bGUuZXhwb3J0cyA9IHBpY2tQYXJlbnQ7XHJcblxyXG5mdW5jdGlvbiBwaWNrUGFyZW50KGN1cnJlbnRDaG9pY2VzLCBjaG9vc2VJZCwga2V5IC8qICwgcGFyZW50cyAqLyl7XHJcbiAgaWYoIWN1cnJlbnRDaG9pY2VzLmhhcyhjaG9vc2VJZCkpe1xyXG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxyXG4gIH1cclxuICAvLyBjb25zb2xlLmxvZyhjaG9vc2VJZCk7XHJcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcclxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZS5jdXJwYXJlbnQpO1xyXG4gIHN0YXRlLmkrK1xyXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xyXG4gICAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcclxuICAgIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XHJcbiAgfVxyXG4gIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XHJcbiAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcclxuXHJcbiAgZnVuY3Rpb24gY3dfY2hvb3NlUGFyZW50KHN0YXRlKSB7XHJcbiAgICB2YXIgY3VycGFyZW50ID0gc3RhdGUuY3VycGFyZW50O1xyXG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcclxuICAgIHZhciBzd2FwUG9pbnQxID0gc3RhdGUuc3dhcFBvaW50MVxyXG4gICAgdmFyIHN3YXBQb2ludDIgPSBzdGF0ZS5zd2FwUG9pbnQyXHJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcclxuICAgIGlmICgoc3dhcFBvaW50MSA9PSBhdHRyaWJ1dGVJbmRleCkgfHwgKHN3YXBQb2ludDIgPT0gYXR0cmlidXRlSW5kZXgpKSB7XHJcbiAgICAgIHJldHVybiBjdXJwYXJlbnQgPT0gMSA/IDAgOiAxXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY3VycGFyZW50XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBpbml0aWFsaXplUGljaygpe1xyXG4gICAgdmFyIGN1cnBhcmVudCA9IDA7XHJcblxyXG4gICAgdmFyIHN3YXBQb2ludDEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcclxuICAgIHZhciBzd2FwUG9pbnQyID0gc3dhcFBvaW50MTtcclxuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcclxuICAgICAgc3dhcFBvaW50MiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcykpO1xyXG4gICAgfVxyXG4gICAgdmFyIGkgPSAwO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY3VycGFyZW50OiBjdXJwYXJlbnQsXHJcbiAgICAgIGk6IGksXHJcbiAgICAgIHN3YXBQb2ludDE6IHN3YXBQb2ludDEsXHJcbiAgICAgIHN3YXBQb2ludDI6IHN3YXBQb2ludDJcclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNpbXBsZVNlbGVjdDtcclxuXHJcbmZ1bmN0aW9uIHNpbXBsZVNlbGVjdChwYXJlbnRzKXtcclxuICB2YXIgdG90YWxQYXJlbnRzID0gcGFyZW50cy5sZW5ndGhcclxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XHJcbiAgaWYgKHIgPT0gMClcclxuICAgIHJldHVybiAwO1xyXG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcclxuICB2YXIgcHJldmlvdXNQYXJlbnQgPSBwYXJlbnRzW3ByZXZpb3VzUGFyZW50SW5kZXhdO1xyXG4gIHZhciB2YWxpZFBhcmVudHMgPSBwYXJlbnRzLmZpbHRlcihmdW5jdGlvbihwYXJlbnQsIGkpe1xyXG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIGNoaWxkID0ge1xyXG4gICAgICBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMiksXHJcbiAgICAgIGFuY2VzdHJ5OiBbcHJldmlvdXNQYXJlbnQsIHBhcmVudF0ubWFwKGZ1bmN0aW9uKHApe1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBpZDogcC5kZWYuaWQsXHJcbiAgICAgICAgICBhbmNlc3RyeTogcC5kZWYuYW5jZXN0cnlcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcclxuICAgIGNvbnNvbGUubG9nKFwiaW5icmVlZGluZyBjb2VmZmljaWVudFwiLCBpQ28pXHJcbiAgICBpZihpQ28gPiAwLjI1KXtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSlcclxuICBpZih2YWxpZFBhcmVudHMubGVuZ3RoID09PSAwKXtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwYXJlbnRzLmxlbmd0aClcclxuICB9XHJcbiAgdmFyIHRvdGFsU2NvcmUgPSB2YWxpZFBhcmVudHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcGFyZW50KXtcclxuICAgIHJldHVybiBzdW0gKyBwYXJlbnQuc2NvcmUudjtcclxuICB9LCAwKTtcclxuICB2YXIgciA9IHRvdGFsU2NvcmUgKiBNYXRoLnJhbmRvbSgpO1xyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCB2YWxpZFBhcmVudHMubGVuZ3RoOyBpKyspe1xyXG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XHJcbiAgICBpZihyID4gc2NvcmUpe1xyXG4gICAgICByID0gciAtIHNjb3JlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBpO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNhcikge1xyXG4gIHZhciBvdXQgPSB7XHJcbiAgICBjaGFzc2lzOiBnaG9zdF9nZXRfY2hhc3NpcyhjYXIuY2hhc3NpcyksXHJcbiAgICB3aGVlbHM6IFtdLFxyXG4gICAgcG9zOiB7eDogY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKS54LCB5OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLnl9XHJcbiAgfTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYXIud2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBvdXQud2hlZWxzW2ldID0gZ2hvc3RfZ2V0X3doZWVsKGNhci53aGVlbHNbaV0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG91dDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xyXG4gIHZhciBnYyA9IFtdO1xyXG5cclxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcclxuICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xyXG5cclxuICAgIHZhciBwID0ge1xyXG4gICAgICB2dHg6IFtdLFxyXG4gICAgICBudW06IDBcclxuICAgIH1cclxuXHJcbiAgICBwLm51bSA9IHMubV92ZXJ0ZXhDb3VudDtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHMubV92ZXJ0ZXhDb3VudDsgaSsrKSB7XHJcbiAgICAgIHAudnR4LnB1c2goYy5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1tpXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGdjLnB1c2gocCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZ2M7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2dldF93aGVlbCh3KSB7XHJcbiAgdmFyIGd3ID0gW107XHJcblxyXG4gIGZvciAodmFyIGYgPSB3LkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcblxyXG4gICAgdmFyIGMgPSB7XHJcbiAgICAgIHBvczogdy5HZXRXb3JsZFBvaW50KHMubV9wKSxcclxuICAgICAgcmFkOiBzLm1fcmFkaXVzLFxyXG4gICAgICBhbmc6IHcubV9zd2VlcC5hXHJcbiAgICB9XHJcblxyXG4gICAgZ3cucHVzaChjKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBndztcclxufVxyXG4iLCJcclxudmFyIGdob3N0X2dldF9mcmFtZSA9IHJlcXVpcmUoXCIuL2Nhci10by1naG9zdC5qc1wiKTtcclxuXHJcbnZhciBlbmFibGVfZ2hvc3QgPSB0cnVlO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2hvc3RfY3JlYXRlX3JlcGxheTogZ2hvc3RfY3JlYXRlX3JlcGxheSxcclxuICBnaG9zdF9jcmVhdGVfZ2hvc3Q6IGdob3N0X2NyZWF0ZV9naG9zdCxcclxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXHJcbiAgZ2hvc3RfcmVzdW1lOiBnaG9zdF9yZXN1bWUsXHJcbiAgZ2hvc3RfZ2V0X3Bvc2l0aW9uOiBnaG9zdF9nZXRfcG9zaXRpb24sXHJcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxyXG4gIGdob3N0X21vdmVfZnJhbWU6IGdob3N0X21vdmVfZnJhbWUsXHJcbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZTogZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSxcclxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxyXG4gIGdob3N0X3Jlc2V0X2dob3N0OiBnaG9zdF9yZXNldF9naG9zdFxyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9jcmVhdGVfcmVwbGF5KCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuIG51bGw7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBudW1fZnJhbWVzOiAwLFxyXG4gICAgZnJhbWVzOiBbXSxcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2NyZWF0ZV9naG9zdCgpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybiBudWxsO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVwbGF5OiBudWxsLFxyXG4gICAgZnJhbWU6IDAsXHJcbiAgICBkaXN0OiAtMTAwXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9yZXNldF9naG9zdChnaG9zdCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdCA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG4gIGdob3N0LmZyYW1lID0gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfcGF1c2UoZ2hvc3QpIHtcclxuICBpZiAoZ2hvc3QgIT0gbnVsbClcclxuICAgIGdob3N0Lm9sZF9mcmFtZSA9IGdob3N0LmZyYW1lO1xyXG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XHJcbiAgaWYgKGdob3N0ICE9IG51bGwpXHJcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0Lm9sZF9mcmFtZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgdmFyIGZyYW1lID0gZ2hvc3QucmVwbGF5LmZyYW1lc1tnaG9zdC5mcmFtZV07XHJcbiAgcmV0dXJuIGZyYW1lLnBvcztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfY29tcGFyZV90b19yZXBsYXkocmVwbGF5LCBnaG9zdCwgbWF4KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKHJlcGxheSA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICBpZiAoZ2hvc3QuZGlzdCA8IG1heCkge1xyXG4gICAgZ2hvc3QucmVwbGF5ID0gcmVwbGF5O1xyXG4gICAgZ2hvc3QuZGlzdCA9IG1heDtcclxuICAgIGdob3N0LmZyYW1lID0gMDtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgZ2hvc3QuZnJhbWUrKztcclxuICBpZiAoZ2hvc3QuZnJhbWUgPj0gZ2hvc3QucmVwbGF5Lm51bV9mcmFtZXMpXHJcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0LnJlcGxheS5udW1fZnJhbWVzIC0gMTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShyZXBsYXksIGNhcikge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChyZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIGZyYW1lID0gZ2hvc3RfZ2V0X2ZyYW1lKGNhcik7XHJcbiAgcmVwbGF5LmZyYW1lcy5wdXNoKGZyYW1lKTtcclxuICByZXBsYXkubnVtX2ZyYW1lcysrO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSkge1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0LmZyYW1lIDwgMClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIHZhciBmcmFtZSA9IGdob3N0LnJlcGxheS5mcmFtZXNbZ2hvc3QuZnJhbWVdO1xyXG5cclxuICAvLyB3aGVlbCBzdHlsZVxyXG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcclxuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNhYWFcIjtcclxuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZnJhbWUud2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBmb3IgKHZhciB3IGluIGZyYW1lLndoZWVsc1tpXSkge1xyXG4gICAgICBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGZyYW1lLndoZWVsc1tpXVt3XS5wb3MsIGZyYW1lLndoZWVsc1tpXVt3XS5yYWQsIGZyYW1lLndoZWVsc1tpXVt3XS5hbmcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gY2hhc3NpcyBzdHlsZVxyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xyXG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcclxuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XHJcbiAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGZvciAodmFyIGMgaW4gZnJhbWUuY2hhc3NpcylcclxuICAgIGdob3N0X2RyYXdfcG9seShjdHgsIGZyYW1lLmNoYXNzaXNbY10udnR4LCBmcmFtZS5jaGFzc2lzW2NdLm51bSk7XHJcbiAgY3R4LmZpbGwoKTtcclxuICBjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2RyYXdfcG9seShjdHgsIHZ0eCwgbl92dHgpIHtcclxuICBjdHgubW92ZVRvKHZ0eFswXS54LCB2dHhbMF0ueSk7XHJcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XHJcbiAgICBjdHgubGluZVRvKHZ0eFtpXS54LCB2dHhbaV0ueSk7XHJcbiAgfVxyXG4gIGN0eC5saW5lVG8odnR4WzBdLngsIHZ0eFswXS55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUpIHtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgY3R4LmFyYyhjZW50ZXIueCwgY2VudGVyLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xyXG5cclxuICBjdHgubW92ZVRvKGNlbnRlci54LCBjZW50ZXIueSk7XHJcbiAgY3R4LmxpbmVUbyhjZW50ZXIueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgY2VudGVyLnkgKyByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSkpO1xyXG5cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50IHBlcmZvcm1hbmNlIGxvY2FsU3RvcmFnZSBhbGVydCBjb25maXJtIGJ0b2EgSFRNTERpdkVsZW1lbnQgKi9cclxuLyogZ2xvYmFscyBiMlZlYzIgKi9cclxuLy8gR2xvYmFsIFZhcnNcclxuXHJcbnZhciB3b3JsZFJ1biA9IHJlcXVpcmUoXCIuL3dvcmxkL3J1bi5qc1wiKTtcclxudmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xyXG5cclxudmFyIG1hbmFnZVJvdW5kID0gcmVxdWlyZShcIi4vbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanNcIik7XHJcblxyXG52YXIgZ2hvc3RfZm5zID0gcmVxdWlyZShcIi4vZ2hvc3QvaW5kZXguanNcIik7XHJcblxyXG52YXIgZHJhd0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXIuanNcIik7XHJcbnZhciBncmFwaF9mbnMgPSByZXF1aXJlKFwiLi9kcmF3L3Bsb3QtZ3JhcGhzLmpzXCIpO1xyXG52YXIgcGxvdF9ncmFwaHMgPSBncmFwaF9mbnMucGxvdEdyYXBocztcclxudmFyIGN3X2NsZWFyR3JhcGhpY3MgPSBncmFwaF9mbnMuY2xlYXJHcmFwaGljcztcclxudmFyIGN3X2RyYXdGbG9vciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1mbG9vci5qc1wiKTtcclxuXHJcbnZhciBnaG9zdF9kcmF3X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2RyYXdfZnJhbWU7XHJcbnZhciBnaG9zdF9jcmVhdGVfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX2dob3N0O1xyXG52YXIgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9hZGRfcmVwbGF5X2ZyYW1lO1xyXG52YXIgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY29tcGFyZV90b19yZXBsYXk7XHJcbnZhciBnaG9zdF9nZXRfcG9zaXRpb24gPSBnaG9zdF9mbnMuZ2hvc3RfZ2V0X3Bvc2l0aW9uO1xyXG52YXIgZ2hvc3RfbW92ZV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9tb3ZlX2ZyYW1lO1xyXG52YXIgZ2hvc3RfcmVzZXRfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfcmVzZXRfZ2hvc3RcclxudmFyIGdob3N0X3BhdXNlID0gZ2hvc3RfZm5zLmdob3N0X3BhdXNlO1xyXG52YXIgZ2hvc3RfcmVzdW1lID0gZ2hvc3RfZm5zLmdob3N0X3Jlc3VtZTtcclxudmFyIGdob3N0X2NyZWF0ZV9yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX3JlcGxheTtcclxuXHJcbnZhciBjd19DYXIgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctY2FyLXN0YXRzLmpzXCIpO1xyXG52YXIgZ2hvc3Q7XHJcbnZhciBjYXJNYXAgPSBuZXcgTWFwKCk7XHJcblxyXG52YXIgZG9EcmF3ID0gdHJ1ZTtcclxudmFyIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG5cclxudmFyIGJveDJkZnBzID0gNjA7XHJcbnZhciBzY3JlZW5mcHMgPSA2MDtcclxudmFyIHNraXBUaWNrcyA9IE1hdGgucm91bmQoMTAwMCAvIGJveDJkZnBzKTtcclxudmFyIG1heEZyYW1lU2tpcCA9IHNraXBUaWNrcyAqIDI7XHJcblxyXG52YXIgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYWluYm94XCIpO1xyXG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbnZhciBjYW1lcmEgPSB7XHJcbiAgc3BlZWQ6IDAuMDUsXHJcbiAgcG9zOiB7XHJcbiAgICB4OiAwLCB5OiAwXHJcbiAgfSxcclxuICB0YXJnZXQ6IC0xLFxyXG4gIHpvb206IDcwXHJcbn1cclxuXHJcbnZhciBtaW5pbWFwY2FtZXJhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwY2FtZXJhXCIpLnN0eWxlO1xyXG52YXIgbWluaW1hcGhvbGRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbWluaW1hcGhvbGRlclwiKTtcclxuXHJcbnZhciBtaW5pbWFwY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwXCIpO1xyXG52YXIgbWluaW1hcGN0eCA9IG1pbmltYXBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG52YXIgbWluaW1hcHNjYWxlID0gMztcclxudmFyIG1pbmltYXBmb2dkaXN0YW5jZSA9IDA7XHJcbnZhciBmb2dkaXN0YW5jZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGZvZ1wiKS5zdHlsZTtcclxuXHJcblxyXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xyXG5cclxuXHJcbnZhciBtYXhfY2FyX2hlYWx0aCA9IGJveDJkZnBzICogMTA7XHJcblxyXG52YXIgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XHJcblxyXG52YXIgZGlzdGFuY2VNZXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGlzdGFuY2VtZXRlclwiKTtcclxudmFyIGhlaWdodE1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWlnaHRtZXRlclwiKTtcclxuXHJcbnZhciBsZWFkZXJQb3NpdGlvbiA9IHtcclxuICB4OiAwLCB5OiAwXHJcbn1cclxuXHJcbm1pbmltYXBjYW1lcmEud2lkdGggPSAxMiAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcclxubWluaW1hcGNhbWVyYS5oZWlnaHQgPSA2ICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG5cclxuXHJcbi8vID09PT09PT0gV09STEQgU1RBVEUgPT09PT09XHJcbnZhciBnZW5lcmF0aW9uQ29uZmlnID0gcmVxdWlyZShcIi4vZ2VuZXJhdGlvbi1jb25maWdcIik7XHJcblxyXG5cclxudmFyIHdvcmxkX2RlZiA9IHtcclxuICBncmF2aXR5OiBuZXcgYjJWZWMyKDAuMCwgLTkuODEpLFxyXG4gIGRvU2xlZXA6IHRydWUsXHJcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcclxuICB0aWxlRGltZW5zaW9uczogbmV3IGIyVmVjMigxLjUsIDAuMTUpLFxyXG4gIG1heEZsb29yVGlsZXM6IDIwMCxcclxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcclxuICBib3gyZGZwczogYm94MmRmcHMsXHJcbiAgbW90b3JTcGVlZDogMjAsXHJcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIHNjaGVtYTogZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuc2NoZW1hXHJcbn1cclxuXHJcbnZhciBjd19kZWFkQ2FycztcclxudmFyIGdyYXBoU3RhdGUgPSB7XHJcbiAgY3dfdG9wU2NvcmVzOiBbXSxcclxuICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxyXG4gIGN3X2dyYXBoRWxpdGU6IFtdLFxyXG4gIGN3X2dyYXBoVG9wOiBbXSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIHJlc2V0R3JhcGhTdGF0ZSgpe1xyXG4gIGdyYXBoU3RhdGUgPSB7XHJcbiAgICBjd190b3BTY29yZXM6IFtdLFxyXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiBbXSxcclxuICAgIGN3X2dyYXBoRWxpdGU6IFtdLFxyXG4gICAgY3dfZ3JhcGhUb3A6IFtdLFxyXG4gIH07XHJcbn1cclxuXHJcblxyXG5cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbnZhciBnZW5lcmF0aW9uU3RhdGU7XHJcblxyXG4vLyA9PT09PT09PSBBY3Rpdml0eSBTdGF0ZSA9PT09XHJcbnZhciBjdXJyZW50UnVubmVyO1xyXG52YXIgbG9vcHMgPSAwO1xyXG52YXIgbmV4dEdhbWVUaWNrID0gKG5ldyBEYXRlKS5nZXRUaW1lKCk7XHJcblxyXG5mdW5jdGlvbiBzaG93RGlzdGFuY2UoZGlzdGFuY2UsIGhlaWdodCkge1xyXG4gIGRpc3RhbmNlTWV0ZXIuaW5uZXJIVE1MID0gZGlzdGFuY2UgKyBcIiBtZXRlcnM8YnIgLz5cIjtcclxuICBoZWlnaHRNZXRlci5pbm5lckhUTUwgPSBoZWlnaHQgKyBcIiBtZXRlcnNcIjtcclxuICBpZiAoZGlzdGFuY2UgPiBtaW5pbWFwZm9nZGlzdGFuY2UpIHtcclxuICAgIGZvZ2Rpc3RhbmNlLndpZHRoID0gODAwIC0gTWF0aC5yb3VuZChkaXN0YW5jZSArIDE1KSAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcclxuICAgIG1pbmltYXBmb2dkaXN0YW5jZSA9IGRpc3RhbmNlO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG4vKiA9PT0gRU5EIENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT0gR2VuZXJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbmZ1bmN0aW9uIGN3X2dlbmVyYXRpb25aZXJvKCkge1xyXG5cclxuICBnZW5lcmF0aW9uU3RhdGUgPSBtYW5hZ2VSb3VuZC5nZW5lcmF0aW9uWmVybyhnZW5lcmF0aW9uQ29uZmlnKCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNldENhclVJKCl7XHJcbiAgY3dfZGVhZENhcnMgPSAwO1xyXG4gIGxlYWRlclBvc2l0aW9uID0ge1xyXG4gICAgeDogMCwgeTogMFxyXG4gIH07XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyLnRvU3RyaW5nKCk7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYXJzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwb3B1bGF0aW9uXCIpLmlubmVySFRNTCA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplLnRvU3RyaW5nKCk7XHJcbn1cclxuXHJcbi8qID09PT0gRU5EIEdlbnJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09IERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG5mdW5jdGlvbiBjd19kcmF3U2NyZWVuKCkge1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xyXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICBjdHguc2F2ZSgpO1xyXG4gIGN3X3NldENhbWVyYVBvc2l0aW9uKCk7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueTtcclxuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xyXG4gIGN0eC50cmFuc2xhdGUoMjAwIC0gKGNhbWVyYV94ICogem9vbSksIDIwMCArIChjYW1lcmFfeSAqIHpvb20pKTtcclxuICBjdHguc2NhbGUoem9vbSwgLXpvb20pO1xyXG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgZmxvb3JUaWxlcyk7XHJcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0LCBjYW1lcmEpO1xyXG4gIGN3X2RyYXdDYXJzKCk7XHJcbiAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfbWluaW1hcENhbWVyYSgvKiB4LCB5Ki8pIHtcclxuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLnhcclxuICB2YXIgY2FtZXJhX3kgPSBjYW1lcmEucG9zLnlcclxuICBtaW5pbWFwY2FtZXJhLmxlZnQgPSBNYXRoLnJvdW5kKCgyICsgY2FtZXJhX3gpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxuICBtaW5pbWFwY2FtZXJhLnRvcCA9IE1hdGgucm91bmQoKDMxIC0gY2FtZXJhX3kpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0Q2FtZXJhVGFyZ2V0KGspIHtcclxuICBjYW1lcmEudGFyZ2V0ID0gaztcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0Q2FtZXJhUG9zaXRpb24oKSB7XHJcbiAgdmFyIGNhbWVyYVRhcmdldFBvc2l0aW9uXHJcbiAgaWYgKGNhbWVyYS50YXJnZXQgIT09IC0xKSB7XHJcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGNhck1hcC5nZXQoY2FtZXJhLnRhcmdldCkuZ2V0UG9zaXRpb24oKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY2FtZXJhVGFyZ2V0UG9zaXRpb24gPSBsZWFkZXJQb3NpdGlvbjtcclxuICB9XHJcbiAgdmFyIGRpZmZfeSA9IGNhbWVyYS5wb3MueSAtIGNhbWVyYVRhcmdldFBvc2l0aW9uLnk7XHJcbiAgdmFyIGRpZmZfeCA9IGNhbWVyYS5wb3MueCAtIGNhbWVyYVRhcmdldFBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55IC09IGNhbWVyYS5zcGVlZCAqIGRpZmZfeTtcclxuICBjYW1lcmEucG9zLnggLT0gY2FtZXJhLnNwZWVkICogZGlmZl94O1xyXG4gIGN3X21pbmltYXBDYW1lcmEoY2FtZXJhLnBvcy54LCBjYW1lcmEucG9zLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3R2hvc3RSZXBsYXkoKSB7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XHJcbiAgdmFyIGNhclBvc2l0aW9uID0gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KTtcclxuICBjYW1lcmEucG9zLnggPSBjYXJQb3NpdGlvbi54O1xyXG4gIGNhbWVyYS5wb3MueSA9IGNhclBvc2l0aW9uLnk7XHJcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XHJcbiAgc2hvd0Rpc3RhbmNlKFxyXG4gICAgTWF0aC5yb3VuZChjYXJQb3NpdGlvbi54ICogMTAwKSAvIDEwMCxcclxuICAgIE1hdGgucm91bmQoY2FyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcclxuICApO1xyXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICBjdHguc2F2ZSgpO1xyXG4gIGN0eC50cmFuc2xhdGUoXHJcbiAgICAyMDAgLSAoY2FyUG9zaXRpb24ueCAqIGNhbWVyYS56b29tKSxcclxuICAgIDIwMCArIChjYXJQb3NpdGlvbi55ICogY2FtZXJhLnpvb20pXHJcbiAgKTtcclxuICBjdHguc2NhbGUoY2FtZXJhLnpvb20sIC1jYW1lcmEuem9vbSk7XHJcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0KTtcclxuICBnaG9zdF9tb3ZlX2ZyYW1lKGdob3N0KTtcclxuICBjd19kcmF3Rmxvb3IoY3R4LCBjYW1lcmEsIGZsb29yVGlsZXMpO1xyXG4gIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjd19kcmF3Q2FycygpIHtcclxuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XHJcbiAgZm9yICh2YXIgayA9IChjd19jYXJBcnJheS5sZW5ndGggLSAxKTsgayA+PSAwOyBrLS0pIHtcclxuICAgIHZhciBteUNhciA9IGN3X2NhckFycmF5W2tdO1xyXG4gICAgZHJhd0NhcihjYXJDb25zdGFudHMsIG15Q2FyLCBjYW1lcmEsIGN0eClcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvZ2dsZURpc3BsYXkoKSB7XHJcbiAgY2FudmFzLndpZHRoID0gY2FudmFzLndpZHRoO1xyXG4gIGlmIChkb0RyYXcpIHtcclxuICAgIGRvRHJhdyA9IGZhbHNlO1xyXG4gICAgY3dfc3RvcFNpbXVsYXRpb24oKTtcclxuICAgIGN3X3J1bm5pbmdJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIHRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSArICgxMDAwIC8gc2NyZWVuZnBzKTtcclxuICAgICAgd2hpbGUgKHRpbWUgPiBwZXJmb3JtYW5jZS5ub3coKSkge1xyXG4gICAgICAgIHNpbXVsYXRpb25TdGVwKCk7XHJcbiAgICAgIH1cclxuICAgIH0sIDEpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkb0RyYXcgPSB0cnVlO1xyXG4gICAgY2xlYXJJbnRlcnZhbChjd19ydW5uaW5nSW50ZXJ2YWwpO1xyXG4gICAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3TWluaU1hcCgpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xyXG4gIG1pbmltYXBmb2dkaXN0YW5jZSA9IDA7XHJcbiAgZm9nZGlzdGFuY2Uud2lkdGggPSBcIjgwMHB4XCI7XHJcbiAgbWluaW1hcGNhbnZhcy53aWR0aCA9IG1pbmltYXBjYW52YXMud2lkdGg7XHJcbiAgbWluaW1hcGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gIG1pbmltYXBjdHguYmVnaW5QYXRoKCk7XHJcbiAgbWluaW1hcGN0eC5tb3ZlVG8oMCwgMzUgKiBtaW5pbWFwc2NhbGUpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZmxvb3JUaWxlcy5sZW5ndGg7IGsrKykge1xyXG4gICAgbGFzdF90aWxlID0gZmxvb3JUaWxlc1trXTtcclxuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICAgIHZhciBsYXN0X3dvcmxkX2Nvb3JkcyA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xyXG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3Rfd29ybGRfY29vcmRzO1xyXG4gICAgbWluaW1hcGN0eC5saW5lVG8oKHRpbGVfcG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlLCAoLXRpbGVfcG9zaXRpb24ueSArIDM1KSAqIG1pbmltYXBzY2FsZSk7XHJcbiAgfVxyXG4gIG1pbmltYXBjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbi8qID09PT0gRU5EIERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG52YXIgdWlMaXN0ZW5lcnMgPSB7XHJcbiAgcHJlQ2FyU3RlcDogZnVuY3Rpb24oKXtcclxuICAgIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xyXG4gIH0sXHJcbiAgY2FyU3RlcChjYXIpe1xyXG4gICAgdXBkYXRlQ2FyVUkoY2FyKTtcclxuICB9LFxyXG4gIGNhckRlYXRoKGNhckluZm8pe1xyXG5cclxuICAgIHZhciBrID0gY2FySW5mby5pbmRleDtcclxuXHJcbiAgICB2YXIgY2FyID0gY2FySW5mby5jYXIsIHNjb3JlID0gY2FySW5mby5zY29yZTtcclxuICAgIGNhck1hcC5nZXQoY2FySW5mbykua2lsbChjdXJyZW50UnVubmVyLCB3b3JsZF9kZWYpO1xyXG5cclxuICAgIC8vIHJlZm9jdXMgY2FtZXJhIHRvIGxlYWRlciBvbiBkZWF0aFxyXG4gICAgaWYgKGNhbWVyYS50YXJnZXQgPT0gY2FySW5mbykge1xyXG4gICAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xyXG4gICAgfVxyXG4gICAgLy8gY29uc29sZS5sb2coc2NvcmUpO1xyXG4gICAgY2FyTWFwLmRlbGV0ZShjYXJJbmZvKTtcclxuICAgIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5KGNhci5yZXBsYXksIGdob3N0LCBzY29yZS52KTtcclxuICAgIHNjb3JlLmkgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuXHJcbiAgICBjd19kZWFkQ2FycysrO1xyXG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gKGdlbmVyYXRpb25TaXplIC0gY3dfZGVhZENhcnMpLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgLy8gY29uc29sZS5sb2cobGVhZGVyUG9zaXRpb24ubGVhZGVyLCBrKVxyXG4gICAgaWYgKGxlYWRlclBvc2l0aW9uLmxlYWRlciA9PSBrKSB7XHJcbiAgICAgIC8vIGxlYWRlciBpcyBkZWFkLCBmaW5kIG5ldyBsZWFkZXJcclxuICAgICAgY3dfZmluZExlYWRlcigpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZ2VuZXJhdGlvbkVuZChyZXN1bHRzKXtcclxuICAgIGNsZWFudXBSb3VuZChyZXN1bHRzKTtcclxuICAgIHJldHVybiBjd19uZXdSb3VuZChyZXN1bHRzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNpbXVsYXRpb25TdGVwKCkgeyAgXHJcbiAgY3VycmVudFJ1bm5lci5zdGVwKCk7XHJcbiAgc2hvd0Rpc3RhbmNlKFxyXG4gICAgTWF0aC5yb3VuZChsZWFkZXJQb3NpdGlvbi54ICogMTAwKSAvIDEwMCxcclxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcclxuICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnYW1lTG9vcCgpIHtcclxuICBsb29wcyA9IDA7XHJcbiAgd2hpbGUgKCFjd19wYXVzZWQgJiYgKG5ldyBEYXRlKS5nZXRUaW1lKCkgPiBuZXh0R2FtZVRpY2sgJiYgbG9vcHMgPCBtYXhGcmFtZVNraXApIHsgICBcclxuICAgIG5leHRHYW1lVGljayArPSBza2lwVGlja3M7XHJcbiAgICBsb29wcysrO1xyXG4gIH1cclxuICBzaW11bGF0aW9uU3RlcCgpO1xyXG4gIGN3X2RyYXdTY3JlZW4oKTtcclxuXHJcbiAgaWYoIWN3X3BhdXNlZCkgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUNhclVJKGNhckluZm8pe1xyXG4gIHZhciBrID0gY2FySW5mby5pbmRleDtcclxuICB2YXIgY2FyID0gY2FyTWFwLmdldChjYXJJbmZvKTtcclxuICB2YXIgcG9zaXRpb24gPSBjYXIuZ2V0UG9zaXRpb24oKTtcclxuXHJcbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShjYXIucmVwbGF5LCBjYXIuY2FyLmNhcik7XHJcbiAgY2FyLm1pbmltYXBtYXJrZXIuc3R5bGUubGVmdCA9IE1hdGgucm91bmQoKHBvc2l0aW9uLnggKyA1KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XHJcbiAgY2FyLmhlYWx0aEJhci53aWR0aCA9IE1hdGgucm91bmQoKGNhci5jYXIuc3RhdGUuaGVhbHRoIC8gbWF4X2Nhcl9oZWFsdGgpICogMTAwKSArIFwiJVwiO1xyXG4gIGlmIChwb3NpdGlvbi54ID4gbGVhZGVyUG9zaXRpb24ueCkge1xyXG4gICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcIm5ldyBsZWFkZXI6IFwiLCBrKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2ZpbmRMZWFkZXIoKSB7XHJcbiAgdmFyIGxlYWQgPSAwO1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaysrKSB7XHJcbiAgICBpZiAoIWN3X2NhckFycmF5W2tdLmFsaXZlKSB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG4gICAgdmFyIHBvc2l0aW9uID0gY3dfY2FyQXJyYXlba10uZ2V0UG9zaXRpb24oKTtcclxuICAgIGlmIChwb3NpdGlvbi54ID4gbGVhZCkge1xyXG4gICAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgICBsZWFkZXJQb3NpdGlvbi5sZWFkZXIgPSBrO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmFzdEZvcndhcmQoKXtcclxuICB2YXIgZ2VuID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XHJcbiAgd2hpbGUoZ2VuID09PSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcil7XHJcbiAgICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBSb3VuZChyZXN1bHRzKXtcclxuXHJcbiAgcmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICBpZiAoYS5zY29yZS52ID4gYi5zY29yZS52KSB7XHJcbiAgICAgIHJldHVybiAtMVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIDFcclxuICAgIH1cclxuICB9KVxyXG4gIGdyYXBoU3RhdGUgPSBwbG90X2dyYXBocyhcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIiksXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcHNjb3Jlc1wiKSxcclxuICAgIG51bGwsXHJcbiAgICBncmFwaFN0YXRlLFxyXG4gICAgcmVzdWx0c1xyXG4gICk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X25ld1JvdW5kKHJlc3VsdHMpIHtcclxuICBjYW1lcmEucG9zLnggPSBjYW1lcmEucG9zLnkgPSAwO1xyXG4gIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcblxyXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLm5leHRHZW5lcmF0aW9uKFxyXG4gICAgZ2VuZXJhdGlvblN0YXRlLCByZXN1bHRzLCBnZW5lcmF0aW9uQ29uZmlnKClcclxuICApO1xyXG4gIGlmICh3b3JsZF9kZWYubXV0YWJsZV9mbG9vcikge1xyXG4gICAgLy8gR0hPU1QgRElTQUJMRURcclxuICAgIGdob3N0ID0gbnVsbDtcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gUkUtRU5BQkxFIEdIT1NUXHJcbiAgICBnaG9zdF9yZXNldF9naG9zdChnaG9zdCk7XHJcbiAgfVxyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XHJcbiAgc2V0dXBDYXJVSSgpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdGFydFNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gZmFsc2U7XHJcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0b3BTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCkge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgY3dfY2xlYXJHcmFwaGljcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpKTtcclxuICByZXNldEdyYXBoU3RhdGUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzZXRXb3JsZCgpIHtcclxuICBkb0RyYXcgPSB0cnVlO1xyXG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XHJcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV3c2VlZFwiKS52YWx1ZTtcclxuICBjd19yZXNldFBvcHVsYXRpb25VSSgpO1xyXG5cclxuICBNYXRoLnNlZWRyYW5kb20oKTtcclxuICBjd19nZW5lcmF0aW9uWmVybygpO1xyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bihcclxuICAgIHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzXHJcbiAgKTtcclxuXHJcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcclxuICByZXNldENhclVJKCk7XHJcbiAgc2V0dXBDYXJVSSgpXHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuXHJcbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldHVwQ2FyVUkoKXtcclxuICBjdXJyZW50UnVubmVyLmNhcnMubWFwKGZ1bmN0aW9uKGNhckluZm8pe1xyXG4gICAgdmFyIGNhciA9IG5ldyBjd19DYXIoY2FySW5mbywgY2FyTWFwKTtcclxuICAgIGNhck1hcC5zZXQoY2FySW5mbywgY2FyKTtcclxuICAgIGNhci5yZXBsYXkgPSBnaG9zdF9jcmVhdGVfcmVwbGF5KCk7XHJcbiAgICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcclxuICB9KVxyXG59XHJcblxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmYXN0LWZvcndhcmRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgZmFzdEZvcndhcmQoKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2F2ZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBzYXZlUHJvZ3Jlc3MoKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjcmVzdG9yZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICByZXN0b3JlUHJvZ3Jlc3MoKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWRpc3BsYXlcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgdG9nZ2xlRGlzcGxheSgpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI25ldy1wb3B1bGF0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKClcclxuICBjd19nZW5lcmF0aW9uWmVybygpO1xyXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG59KVxyXG5cclxuZnVuY3Rpb24gc2F2ZVByb2dyZXNzKCkge1xyXG4gIGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPSBKU09OLnN0cmluZ2lmeShnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbik7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X2dlbkNvdW50ZXIgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuICBsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QgPSBKU09OLnN0cmluZ2lmeShnaG9zdCk7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X3RvcFNjb3JlcyA9IEpTT04uc3RyaW5naWZ5KGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzKTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfZmxvb3JTZWVkID0gd29ybGRfZGVmLmZsb29yc2VlZDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzdG9yZVByb2dyZXNzKCkge1xyXG4gIGlmICh0eXBlb2YgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9PSAndW5kZWZpbmVkJyB8fCBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID09IG51bGwpIHtcclxuICAgIGFsZXJ0KFwiTm8gc2F2ZWQgcHJvZ3Jlc3MgZm91bmRcIik7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XHJcbiAgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24gPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24pO1xyXG4gIGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyID0gbG9jYWxTdG9yYWdlLmN3X2dlbkNvdW50ZXI7XHJcbiAgZ2hvc3QgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd19naG9zdCk7XHJcbiAgZ3JhcGhTdGF0ZS5jd190b3BTY29yZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd190b3BTY29yZXMpO1xyXG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBsb2NhbFN0b3JhZ2UuY3dfZmxvb3JTZWVkO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV3c2VlZFwiKS52YWx1ZSA9IHdvcmxkX2RlZi5mbG9vcnNlZWQ7XHJcblxyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuICBNYXRoLnNlZWRyYW5kb20oKTtcclxuXHJcbiAgcmVzZXRDYXJVSSgpO1xyXG4gIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xyXG59XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NvbmZpcm0tcmVzZXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgY3dfY29uZmlybVJlc2V0V29ybGQoKVxyXG59KVxyXG5cclxuZnVuY3Rpb24gY3dfY29uZmlybVJlc2V0V29ybGQoKSB7XHJcbiAgaWYgKGNvbmZpcm0oJ1JlYWxseSByZXNldCB3b3JsZD8nKSkge1xyXG4gICAgY3dfcmVzZXRXb3JsZCgpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBnaG9zdCByZXBsYXkgc3R1ZmZcclxuXHJcblxyXG5mdW5jdGlvbiBjd19wYXVzZVNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcclxuICBnaG9zdF9wYXVzZShnaG9zdCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc3VtZVNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gZmFsc2U7XHJcbiAgZ2hvc3RfcmVzdW1lKGdob3N0KTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RhcnRHaG9zdFJlcGxheSgpIHtcclxuICBpZiAoIWRvRHJhdykge1xyXG4gICAgdG9nZ2xlRGlzcGxheSgpO1xyXG4gIH1cclxuICBjd19wYXVzZVNpbXVsYXRpb24oKTtcclxuICBjd19naG9zdFJlcGxheUludGVydmFsID0gc2V0SW50ZXJ2YWwoY3dfZHJhd0dob3N0UmVwbGF5LCBNYXRoLnJvdW5kKDEwMDAgLyBzY3JlZW5mcHMpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcEdob3N0UmVwbGF5KCkge1xyXG4gIGNsZWFySW50ZXJ2YWwoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCk7XHJcbiAgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IG51bGw7XHJcbiAgY3dfZmluZExlYWRlcigpO1xyXG4gIGNhbWVyYS5wb3MueCA9IGxlYWRlclBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55ID0gbGVhZGVyUG9zaXRpb24ueTtcclxuICBjd19yZXN1bWVTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWdob3N0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbihlKXtcclxuICBjd190b2dnbGVHaG9zdFJlcGxheShlLnRhcmdldClcclxufSlcclxuXHJcbmZ1bmN0aW9uIGN3X3RvZ2dsZUdob3N0UmVwbGF5KGJ1dHRvbikge1xyXG4gIGlmIChjd19naG9zdFJlcGxheUludGVydmFsID09IG51bGwpIHtcclxuICAgIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKTtcclxuICAgIGJ1dHRvbi52YWx1ZSA9IFwiUmVzdW1lIHNpbXVsYXRpb25cIjtcclxuICB9IGVsc2Uge1xyXG4gICAgY3dfc3RvcEdob3N0UmVwbGF5KCk7XHJcbiAgICBidXR0b24udmFsdWUgPSBcIlZpZXcgdG9wIHJlcGxheVwiO1xyXG4gIH1cclxufVxyXG4vLyBnaG9zdCByZXBsYXkgc3R1ZmYgRU5EXHJcblxyXG4vLyBpbml0aWFsIHN0dWZmLCBvbmx5IGNhbGxlZCBvbmNlIChob3BlZnVsbHkpXHJcbmZ1bmN0aW9uIGN3X2luaXQoKSB7XHJcbiAgLy8gY2xvbmUgc2lsdmVyIGRvdCBhbmQgaGVhbHRoIGJhclxyXG4gIHZhciBtbW0gPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnbWluaW1hcG1hcmtlcicpWzBdO1xyXG4gIHZhciBoYmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ2hlYWx0aGJhcicpWzBdO1xyXG4gIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplO1xyXG5cclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuXHJcbiAgICAvLyBtaW5pbWFwIG1hcmtlcnNcclxuICAgIHZhciBuZXdiYXIgPSBtbW0uY2xvbmVOb2RlKHRydWUpO1xyXG4gICAgbmV3YmFyLmlkID0gXCJiYXJcIiArIGs7XHJcbiAgICBuZXdiYXIuc3R5bGUucGFkZGluZ1RvcCA9IGsgKiA5ICsgXCJweFwiO1xyXG4gICAgbWluaW1hcGhvbGRlci5hcHBlbmRDaGlsZChuZXdiYXIpO1xyXG5cclxuICAgIC8vIGhlYWx0aCBiYXJzXHJcbiAgICB2YXIgbmV3aGVhbHRoID0gaGJhci5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBuZXdoZWFsdGguZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJESVZcIilbMF0uaWQgPSBcImhlYWx0aFwiICsgaztcclxuICAgIG5ld2hlYWx0aC5jYXJfaW5kZXggPSBrO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIikuYXBwZW5kQ2hpbGQobmV3aGVhbHRoKTtcclxuICB9XHJcbiAgbW1tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobW1tKTtcclxuICBoYmFyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaGJhcik7XHJcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XHJcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcclxuICByZXNldENhclVJKCk7XHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcclxuICBzZXR1cENhclVJKCk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxuICBcclxufVxyXG5cclxuZnVuY3Rpb24gcmVsTW91c2VDb29yZHMoZXZlbnQpIHtcclxuICB2YXIgdG90YWxPZmZzZXRYID0gMDtcclxuICB2YXIgdG90YWxPZmZzZXRZID0gMDtcclxuICB2YXIgY2FudmFzWCA9IDA7XHJcbiAgdmFyIGNhbnZhc1kgPSAwO1xyXG4gIHZhciBjdXJyZW50RWxlbWVudCA9IHRoaXM7XHJcblxyXG4gIGRvIHtcclxuICAgIHRvdGFsT2Zmc2V0WCArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRMZWZ0IC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcclxuICAgIHRvdGFsT2Zmc2V0WSArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRUb3AgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxUb3A7XHJcbiAgICBjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50Lm9mZnNldFBhcmVudFxyXG4gIH1cclxuICB3aGlsZSAoY3VycmVudEVsZW1lbnQpO1xyXG5cclxuICBjYW52YXNYID0gZXZlbnQucGFnZVggLSB0b3RhbE9mZnNldFg7XHJcbiAgY2FudmFzWSA9IGV2ZW50LnBhZ2VZIC0gdG90YWxPZmZzZXRZO1xyXG5cclxuICByZXR1cm4ge3g6IGNhbnZhc1gsIHk6IGNhbnZhc1l9XHJcbn1cclxuSFRNTERpdkVsZW1lbnQucHJvdG90eXBlLnJlbE1vdXNlQ29vcmRzID0gcmVsTW91c2VDb29yZHM7XHJcbm1pbmltYXBob2xkZXIub25jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gIHZhciBjb29yZHMgPSBtaW5pbWFwaG9sZGVyLnJlbE1vdXNlQ29vcmRzKGV2ZW50KTtcclxuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XHJcbiAgdmFyIGNsb3Nlc3QgPSB7XHJcbiAgICB2YWx1ZTogY3dfY2FyQXJyYXlbMF0uY2FyLFxyXG4gICAgZGlzdDogTWF0aC5hYnMoKChjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnggKyA2KSAqIG1pbmltYXBzY2FsZSkgLSBjb29yZHMueCksXHJcbiAgICB4OiBjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnhcclxuICB9XHJcblxyXG4gIHZhciBtYXhYID0gMDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgcG9zID0gY3dfY2FyQXJyYXlbaV0uZ2V0UG9zaXRpb24oKTtcclxuICAgIHZhciBkaXN0ID0gTWF0aC5hYnMoKChwb3MueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KTtcclxuICAgIGlmIChkaXN0IDwgY2xvc2VzdC5kaXN0KSB7XHJcbiAgICAgIGNsb3Nlc3QudmFsdWUgPSBjd19jYXJBcnJheS5jYXI7XHJcbiAgICAgIGNsb3Nlc3QuZGlzdCA9IGRpc3Q7XHJcbiAgICAgIGNsb3Nlc3QueCA9IHBvcy54O1xyXG4gICAgfVxyXG4gICAgbWF4WCA9IE1hdGgubWF4KHBvcy54LCBtYXhYKTtcclxuICB9XHJcblxyXG4gIGlmIChjbG9zZXN0LnggPT0gbWF4WCkgeyAvLyBmb2N1cyBvbiBsZWFkZXIgYWdhaW5cclxuICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN3X3NldENhbWVyYVRhcmdldChjbG9zZXN0LnZhbHVlKTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9ucmF0ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRNdXRhdGlvbihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25zaXplXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldE11dGF0aW9uUmFuZ2UoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zsb29yXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldE11dGFibGVGbG9vcihlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2dyYXZpdHlcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0R3Jhdml0eShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZWxpdGVzaXplXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldEVsaXRlU2l6ZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uKG11dGF0aW9uKSB7XHJcbiAgZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuX211dGF0aW9uID0gcGFyc2VGbG9hdChtdXRhdGlvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uUmFuZ2UocmFuZ2UpIHtcclxuICBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5tdXRhdGlvbl9yYW5nZSA9IHBhcnNlRmxvYXQocmFuZ2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRNdXRhYmxlRmxvb3IoY2hvaWNlKSB7XHJcbiAgd29ybGRfZGVmLm11dGFibGVfZmxvb3IgPSAoY2hvaWNlID09IDEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRHcmF2aXR5KGNob2ljZSkge1xyXG4gIHdvcmxkX2RlZi5ncmF2aXR5ID0gbmV3IGIyVmVjMigwLjAsIC1wYXJzZUZsb2F0KGNob2ljZSkpO1xyXG4gIHZhciB3b3JsZCA9IGN1cnJlbnRSdW5uZXIuc2NlbmUud29ybGRcclxuICAvLyBDSEVDSyBHUkFWSVRZIENIQU5HRVNcclxuICBpZiAod29ybGQuR2V0R3Jhdml0eSgpLnkgIT0gd29ybGRfZGVmLmdyYXZpdHkueSkge1xyXG4gICAgd29ybGQuU2V0R3Jhdml0eSh3b3JsZF9kZWYuZ3Jhdml0eSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRFbGl0ZVNpemUoY2xvbmVzKSB7XHJcbiAgZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuY2hhbXBpb25MZW5ndGggPSBwYXJzZUludChjbG9uZXMsIDEwKTtcclxufVxyXG5cclxuY3dfaW5pdCgpO1xyXG4iLCJ2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4vcmFuZG9tLmpzXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGluc3RhbmNlLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLmNyZWF0ZU5vcm1hbHMoc2NoZW1hUHJvcCwgZ2VuZXJhdG9yKTtcclxuICAgICAgaW5zdGFuY2Vba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfSwgeyBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMikgfSk7XHJcbiAgfSxcclxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XHJcbiAgICB2YXIgaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKTtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gW107XHJcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcclxuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XHJcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcclxuICAgICAgfVxyXG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xyXG4gICAgICByZXR1cm4gY3Jvc3NEZWY7XHJcbiAgICB9LCB7XHJcbiAgICAgIGlkOiBpZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudHMubWFwKGZ1bmN0aW9uKHBhcmVudCl7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9LFxyXG4gIGNyZWF0ZU11dGF0ZWRDbG9uZShzY2hlbWEsIGdlbmVyYXRvciwgcGFyZW50LCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlKXtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgICBzY2hlbWFQcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICAgICk7XHJcbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSxcclxuICBhcHBseVR5cGVzKHNjaGVtYSwgcGFyZW50KXtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXM7XHJcbiAgICAgIHN3aXRjaChzY2hlbWFQcm9wLnR5cGUpe1xyXG4gICAgICAgIGNhc2UgXCJzaHVmZmxlXCIgOlxyXG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmbG9hdFwiIDpcclxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0Zsb2F0KHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImludGVnZXJcIjpcclxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0ludGVnZXIoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWApO1xyXG4gICAgICB9XHJcbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSxcclxufVxyXG4iLCJ2YXIgY3JlYXRlID0gcmVxdWlyZShcIi4uL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGdlbmVyYXRpb25aZXJvOiBnZW5lcmF0aW9uWmVybyxcclxuICBuZXh0R2VuZXJhdGlvbjogbmV4dEdlbmVyYXRpb25cclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKXtcclxuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBjb25maWcuZ2VuZXJhdGlvblNpemUsXHJcbiAgc2NoZW1hID0gY29uZmlnLnNjaGVtYTtcclxuICB2YXIgY3dfY2FyR2VuZXJhdGlvbiA9IFtdO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG4gICAgdmFyIGRlZiA9IGNyZWF0ZS5jcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGZ1bmN0aW9uKCl7XHJcbiAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpXHJcbiAgICB9KTtcclxuICAgIGRlZi5pbmRleCA9IGs7XHJcbiAgICBjd19jYXJHZW5lcmF0aW9uLnB1c2goZGVmKTtcclxuICB9XHJcbiAgcmV0dXJuIHtcclxuICAgIGNvdW50ZXI6IDAsXHJcbiAgICBnZW5lcmF0aW9uOiBjd19jYXJHZW5lcmF0aW9uLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5leHRHZW5lcmF0aW9uKFxyXG4gIHByZXZpb3VzU3RhdGUsXHJcbiAgc2NvcmVzLFxyXG4gIGNvbmZpZ1xyXG4pe1xyXG4gIHZhciBjaGFtcGlvbl9sZW5ndGggPSBjb25maWcuY2hhbXBpb25MZW5ndGgsXHJcbiAgICBnZW5lcmF0aW9uU2l6ZSA9IGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSxcclxuICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gY29uZmlnLnNlbGVjdEZyb21BbGxQYXJlbnRzO1xyXG5cclxuICB2YXIgbmV3R2VuZXJhdGlvbiA9IG5ldyBBcnJheSgpO1xyXG4gIHZhciBuZXdib3JuO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgY2hhbXBpb25fbGVuZ3RoOyBrKyspIHtgYFxyXG4gICAgc2NvcmVzW2tdLmRlZi5pc19lbGl0ZSA9IHRydWU7XHJcbiAgICBzY29yZXNba10uZGVmLmluZGV4ID0gaztcclxuICAgIG5ld0dlbmVyYXRpb24ucHVzaChzY29yZXNba10uZGVmKTtcclxuICB9XHJcbiAgdmFyIHBhcmVudExpc3QgPSBbXTtcclxuICBmb3IgKGsgPSBjaGFtcGlvbl9sZW5ndGg7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcbiAgICB2YXIgcGFyZW50MSA9IHNlbGVjdEZyb21BbGxQYXJlbnRzKHNjb3JlcywgcGFyZW50TGlzdCk7XHJcbiAgICB2YXIgcGFyZW50MiA9IHBhcmVudDE7XHJcbiAgICB3aGlsZSAocGFyZW50MiA9PSBwYXJlbnQxKSB7XHJcbiAgICAgIHBhcmVudDIgPSBzZWxlY3RGcm9tQWxsUGFyZW50cyhzY29yZXMsIHBhcmVudExpc3QsIHBhcmVudDEpO1xyXG4gICAgfVxyXG4gICAgdmFyIHBhaXIgPSBbcGFyZW50MSwgcGFyZW50Ml1cclxuICAgIHBhcmVudExpc3QucHVzaChwYWlyKTtcclxuICAgIG5ld2Jvcm4gPSBtYWtlQ2hpbGQoY29uZmlnLFxyXG4gICAgICBwYWlyLm1hcChmdW5jdGlvbihwYXJlbnQpIHsgcmV0dXJuIHNjb3Jlc1twYXJlbnRdLmRlZjsgfSlcclxuICAgICk7XHJcbiAgICBuZXdib3JuID0gbXV0YXRlKGNvbmZpZywgbmV3Ym9ybik7XHJcbiAgICBuZXdib3JuLmlzX2VsaXRlID0gZmFsc2U7XHJcbiAgICBuZXdib3JuLmluZGV4ID0gaztcclxuICAgIG5ld0dlbmVyYXRpb24ucHVzaChuZXdib3JuKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBjb3VudGVyOiBwcmV2aW91c1N0YXRlLmNvdW50ZXIgKyAxLFxyXG4gICAgZ2VuZXJhdGlvbjogbmV3R2VuZXJhdGlvbixcclxuICB9O1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gbWFrZUNoaWxkKGNvbmZpZywgcGFyZW50cyl7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBwaWNrUGFyZW50ID0gY29uZmlnLnBpY2tQYXJlbnQ7XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGlja1BhcmVudClcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjb25maWcsIHBhcmVudCl7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBtdXRhdGlvbl9yYW5nZSA9IGNvbmZpZy5tdXRhdGlvbl9yYW5nZSxcclxuICAgIGdlbl9tdXRhdGlvbiA9IGNvbmZpZy5nZW5fbXV0YXRpb24sXHJcbiAgICBnZW5lcmF0ZVJhbmRvbSA9IGNvbmZpZy5nZW5lcmF0ZVJhbmRvbTtcclxuICByZXR1cm4gY3JlYXRlLmNyZWF0ZU11dGF0ZWRDbG9uZShcclxuICAgIHNjaGVtYSxcclxuICAgIGdlbmVyYXRlUmFuZG9tLFxyXG4gICAgcGFyZW50LFxyXG4gICAgTWF0aC5tYXgobXV0YXRpb25fcmFuZ2UpLFxyXG4gICAgZ2VuX211dGF0aW9uXHJcbiAgKVxyXG59XHJcbiIsIlxyXG5cclxuY29uc3QgcmFuZG9tID0ge1xyXG4gIHNodWZmbGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb1NodWZmbGUocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoIHx8IDEwLFxyXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgICB9LCBnZW5lcmF0b3IpKTtcclxuICB9LFxyXG4gIGNyZWF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvSW50ZWdlcihwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XHJcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXHJcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICAgIH0sIGdlbmVyYXRvcikpO1xyXG4gIH0sXHJcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxyXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgICB9LCBnZW5lcmF0b3IpKTtcclxuICB9LFxyXG4gIGNyZWF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHZhciBsID0gcHJvcC5sZW5ndGg7XHJcbiAgICB2YXIgdmFsdWVzID0gW107XHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcclxuICAgICAgdmFsdWVzLnB1c2goXHJcbiAgICAgICAgY3JlYXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvcilcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgfSxcclxuICBtdXRhdGVTaHVmZmxlKFxyXG4gICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcclxuICAgICkpO1xyXG4gIH0sXHJcbiAgbXV0YXRlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcclxuICAgICkpO1xyXG4gIH0sXHJcbiAgbXV0YXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXHJcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICAgKSk7XHJcbiAgfSxcclxuICBtYXBUb1NodWZmbGUocHJvcCwgbm9ybWFscyl7XHJcbiAgICB2YXIgb2Zmc2V0ID0gcHJvcC5vZmZzZXQgfHwgMDtcclxuICAgIHZhciBsaW1pdCA9IHByb3AubGltaXQgfHwgcHJvcC5sZW5ndGg7XHJcbiAgICB2YXIgc29ydGVkID0gbm9ybWFscy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSwgYil7XHJcbiAgICAgIHJldHVybiBhIC0gYjtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uKHZhbCl7XHJcbiAgICAgIHJldHVybiBzb3J0ZWQuaW5kZXhPZih2YWwpO1xyXG4gICAgfSkubWFwKGZ1bmN0aW9uKGkpe1xyXG4gICAgICByZXR1cm4gaSArIG9mZnNldDtcclxuICAgIH0pLnNsaWNlKDAsIGxpbWl0KTtcclxuICB9LFxyXG4gIG1hcFRvSW50ZWdlcihwcm9wLCBub3JtYWxzKXtcclxuICAgIHByb3AgPSB7XHJcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcclxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMTAsXHJcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGhcclxuICAgIH1cclxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKS5tYXAoZnVuY3Rpb24oZmxvYXQpe1xyXG4gICAgICByZXR1cm4gTWF0aC5yb3VuZChmbG9hdCk7XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIG1hcFRvRmxvYXQocHJvcCwgbm9ybWFscyl7XHJcbiAgICBwcm9wID0ge1xyXG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXHJcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDFcclxuICAgIH1cclxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbihub3JtYWwpe1xyXG4gICAgICB2YXIgbWluID0gcHJvcC5taW47XHJcbiAgICAgIHZhciByYW5nZSA9IHByb3AucmFuZ2U7XHJcbiAgICAgIHJldHVybiBtaW4gKyBub3JtYWwgKiByYW5nZVxyXG4gICAgfSlcclxuICB9LFxyXG4gIG11dGF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcclxuICAgIHZhciBmYWN0b3IgPSAocHJvcC5mYWN0b3IgfHwgMSkgKiBtdXRhdGlvbl9yYW5nZVxyXG4gICAgcmV0dXJuIG9yaWdpbmFsVmFsdWVzLm1hcChmdW5jdGlvbihvcmlnaW5hbFZhbHVlKXtcclxuICAgICAgaWYoZ2VuZXJhdG9yKCkgPiBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsVmFsdWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG11dGF0ZU5vcm1hbChcclxuICAgICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIGZhY3RvclxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSByYW5kb207XHJcblxyXG5mdW5jdGlvbiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBtdXRhdGlvbl9yYW5nZSl7XHJcbiAgaWYobXV0YXRpb25fcmFuZ2UgPiAxKXtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBtdXRhdGUgYmV5b25kIGJvdW5kc1wiKTtcclxuICB9XHJcbiAgdmFyIG5ld01pbiA9IG9yaWdpbmFsVmFsdWUgLSAwLjU7XHJcbiAgaWYgKG5ld01pbiA8IDApIG5ld01pbiA9IDA7XHJcbiAgaWYgKG5ld01pbiArIG11dGF0aW9uX3JhbmdlICA+IDEpXHJcbiAgICBuZXdNaW4gPSAxIC0gbXV0YXRpb25fcmFuZ2U7XHJcbiAgdmFyIHJhbmdlVmFsdWUgPSBjcmVhdGVOb3JtYWwoe1xyXG4gICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gIH0sIGdlbmVyYXRvcik7XHJcbiAgcmV0dXJuIG5ld01pbiArIHJhbmdlVmFsdWUgKiBtdXRhdGlvbl9yYW5nZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgaWYoIXByb3AuaW5jbHVzaXZlKXtcclxuICAgIHJldHVybiBnZW5lcmF0b3IoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIGdlbmVyYXRvcigpIDwgMC41ID9cclxuICAgIGdlbmVyYXRvcigpIDpcclxuICAgIDEgLSBnZW5lcmF0b3IoKTtcclxuICB9XHJcbn1cclxuIiwiLyogZ2xvYmFscyBidG9hICovXHJcbnZhciBzZXR1cFNjZW5lID0gcmVxdWlyZShcIi4vc2V0dXAtc2NlbmVcIik7XHJcbnZhciBjYXJSdW4gPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9ydW5cIik7XHJcbnZhciBkZWZUb0NhciA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL2RlZi10by1jYXJcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJ1bkRlZnM7XHJcbmZ1bmN0aW9uIHJ1bkRlZnMod29ybGRfZGVmLCBkZWZzLCBsaXN0ZW5lcnMpIHtcclxuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcclxuICAgIC8vIEdIT1NUIERJU0FCTEVEXHJcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XHJcbiAgfVxyXG5cclxuICB2YXIgc2NlbmUgPSBzZXR1cFNjZW5lKHdvcmxkX2RlZik7XHJcbiAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xyXG4gIGNvbnNvbGUubG9nKFwiYWJvdXQgdG8gYnVpbGQgY2Fyc1wiKTtcclxuICB2YXIgY2FycyA9IGRlZnMubWFwKChkZWYsIGkpID0+IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGluZGV4OiBpLFxyXG4gICAgICBkZWY6IGRlZixcclxuICAgICAgY2FyOiBkZWZUb0NhcihkZWYsIHNjZW5lLndvcmxkLCB3b3JsZF9kZWYpLFxyXG4gICAgICBzdGF0ZTogY2FyUnVuLmdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpXHJcbiAgICB9O1xyXG4gIH0pO1xyXG4gIHZhciBhbGl2ZWNhcnMgPSBjYXJzO1xyXG4gIHJldHVybiB7XHJcbiAgICBzY2VuZTogc2NlbmUsXHJcbiAgICBjYXJzOiBjYXJzLFxyXG4gICAgc3RlcDogZnVuY3Rpb24gKCkge1xyXG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vIG1vcmUgY2Fyc1wiKTtcclxuICAgICAgfVxyXG4gICAgICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDIwLCAyMCk7XHJcbiAgICAgIGxpc3RlbmVycy5wcmVDYXJTdGVwKCk7XHJcbiAgICAgIGFsaXZlY2FycyA9IGFsaXZlY2Fycy5maWx0ZXIoZnVuY3Rpb24gKGNhcikge1xyXG4gICAgICAgIGNhci5zdGF0ZSA9IGNhclJ1bi51cGRhdGVTdGF0ZShcclxuICAgICAgICAgIHdvcmxkX2RlZiwgY2FyLmNhciwgY2FyLnN0YXRlXHJcbiAgICAgICAgKTtcclxuICAgICAgICB2YXIgc3RhdHVzID0gY2FyUnVuLmdldFN0YXR1cyhjYXIuc3RhdGUsIHdvcmxkX2RlZik7XHJcbiAgICAgICAgbGlzdGVuZXJzLmNhclN0ZXAoY2FyKTtcclxuICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FyLnNjb3JlID0gY2FyUnVuLmNhbGN1bGF0ZVNjb3JlKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcclxuICAgICAgICBsaXN0ZW5lcnMuY2FyRGVhdGgoY2FyKTtcclxuXHJcbiAgICAgICAgdmFyIHdvcmxkID0gc2NlbmUud29ybGQ7XHJcbiAgICAgICAgdmFyIHdvcmxkQ2FyID0gY2FyLmNhcjtcclxuICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci5jaGFzc2lzKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCB3b3JsZENhci53aGVlbHMubGVuZ3RoOyB3KyspIHtcclxuICAgICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLndoZWVsc1t3XSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH0pXHJcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgbGlzdGVuZXJzLmdlbmVyYXRpb25FbmQoY2Fycyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG59XHJcbiIsIi8qIGdsb2JhbHMgYjJXb3JsZCBiMlZlYzIgYjJCb2R5RGVmIGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSAqL1xyXG5cclxuLypcclxuXHJcbndvcmxkX2RlZiA9IHtcclxuICBncmF2aXR5OiB7eCwgeX0sXHJcbiAgZG9TbGVlcDogYm9vbGVhbixcclxuICBmbG9vcnNlZWQ6IHN0cmluZyxcclxuICB0aWxlRGltZW5zaW9ucyxcclxuICBtYXhGbG9vclRpbGVzLFxyXG4gIG11dGFibGVfZmxvb3I6IGJvb2xlYW5cclxufVxyXG5cclxuKi9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24od29ybGRfZGVmKXtcclxuXHJcbiAgdmFyIHdvcmxkID0gbmV3IGIyV29ybGQod29ybGRfZGVmLmdyYXZpdHksIHdvcmxkX2RlZi5kb1NsZWVwKTtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN3X2NyZWF0ZUZsb29yKFxyXG4gICAgd29ybGQsXHJcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkLFxyXG4gICAgd29ybGRfZGVmLnRpbGVEaW1lbnNpb25zLFxyXG4gICAgd29ybGRfZGVmLm1heEZsb29yVGlsZXMsXHJcbiAgICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vclxyXG4gICk7XHJcblxyXG4gIHZhciBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW1xyXG4gICAgZmxvb3JUaWxlcy5sZW5ndGggLSAxXHJcbiAgXTtcclxuICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XHJcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChcclxuICAgIGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM11cclxuICApO1xyXG4gIHdvcmxkLmZpbmlzaExpbmUgPSB0aWxlX3Bvc2l0aW9uLng7XHJcbiAgcmV0dXJuIHtcclxuICAgIHdvcmxkOiB3b3JsZCxcclxuICAgIGZsb29yVGlsZXM6IGZsb29yVGlsZXMsXHJcbiAgICBmaW5pc2hMaW5lOiB0aWxlX3Bvc2l0aW9uLnhcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vcih3b3JsZCwgZmxvb3JzZWVkLCBkaW1lbnNpb25zLCBtYXhGbG9vclRpbGVzLCBtdXRhYmxlX2Zsb29yKSB7XHJcbiAgdmFyIGxhc3RfdGlsZSA9IG51bGw7XHJcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcclxuICB2YXIgY3dfZmxvb3JUaWxlcyA9IFtdO1xyXG4gIE1hdGguc2VlZHJhbmRvbShmbG9vcnNlZWQpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgbWF4Rmxvb3JUaWxlczsgaysrKSB7XHJcbiAgICBpZiAoIW11dGFibGVfZmxvb3IpIHtcclxuICAgICAgLy8ga2VlcCBvbGQgaW1wb3NzaWJsZSB0cmFja3MgaWYgbm90IHVzaW5nIG11dGFibGUgZmxvb3JzXHJcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcclxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuNSAqIGsgLyBtYXhGbG9vclRpbGVzXHJcbiAgICAgICk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBpZiBwYXRoIGlzIG11dGFibGUgb3ZlciByYWNlcywgY3JlYXRlIHNtb290aGVyIHRyYWNrc1xyXG4gICAgICBsYXN0X3RpbGUgPSBjd19jcmVhdGVGbG9vclRpbGUoXHJcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjIgKiBrIC8gbWF4Rmxvb3JUaWxlc1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgY3dfZmxvb3JUaWxlcy5wdXNoKGxhc3RfdGlsZSk7XHJcbiAgICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XHJcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQobGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXSk7XHJcbiAgfVxyXG4gIHJldHVybiBjd19mbG9vclRpbGVzO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3JUaWxlKHdvcmxkLCBkaW0sIHBvc2l0aW9uLCBhbmdsZSkge1xyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuXHJcbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xyXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xyXG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAwLjU7XHJcblxyXG4gIHZhciBjb29yZHMgPSBuZXcgQXJyYXkoKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIDApKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIC1kaW0ueSkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIC1kaW0ueSkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIDApKTtcclxuXHJcbiAgdmFyIGNlbnRlciA9IG5ldyBiMlZlYzIoMCwgMCk7XHJcblxyXG4gIHZhciBuZXdjb29yZHMgPSBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKTtcclxuXHJcbiAgZml4X2RlZi5zaGFwZS5TZXRBc0FycmF5KG5ld2Nvb3Jkcyk7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxuICByZXR1cm4gYm9keTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSkge1xyXG4gIHJldHVybiBjb29yZHMubWFwKGZ1bmN0aW9uKGNvb3JkKXtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpIC0gTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgKyBjZW50ZXIueCxcclxuICAgICAgeTogTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgKyBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci55LFxyXG4gICAgfTtcclxuICB9KTtcclxufVxyXG4iXX0=
