(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
      limit: values.wheelCount,
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
    // console.log(scores, nextState);
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
  // console.log(cw_carScores);
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
    // allResults: (lastState.allResults || []).concat(cw_carScores),
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

function cw_clearPopulationWorld() {
  carMap.forEach(function(car){
    car.kill(currentRunner, world_def);
  });
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
  cw_clearPopulationWorld();
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

async function saveProgress() {
  cw_stopSimulation();

  progress = {
    generation: generationState.generation,
    genCounter: generationState.counter,
    ghost: ghost,
    topScores: graphState.cw_topScores,
    floorSeed: world_def.floorseed
  }

  var progressBlob = new Blob([JSON.stringify(progress)], {
    type: "application/json",
  });

  const newHandle = await window.showSaveFilePicker();
  const writableStream = await newHandle.createWritable();
  await writableStream.write(progressBlob);
  await writableStream.close();

  cw_startSimulation();
}

async function restoreProgress() {
  const pickerOpts = {
    types: [
      {
        description: "JSON",
        accept: {
          "application/json": [".json"],
        },
      },
    ],
    excludeAcceptAllOption: true,
    multiple: false,
  };
  const [fileHandle] = await window.showOpenFilePicker(pickerOpts);
  const progressFile = await fileHandle.getFile();
  const reader = new FileReader();
  reader.readAsText(progressFile)
  
  reader.onloadend = () => {
    var data = reader.result
    var progress = JSON.parse(data);

    cw_stopSimulation();

    generationState.generation = progress.generation;
    generationState.counter = Number(progress.genCounter);

    ghost = progress.ghost;

    graphState.cw_topScores = progress.topScores;

    world_def.floorseed = progress.floorSeed;
    document.getElementById("newseed").value = world_def.floorseed;

    currentRunner = worldRun(world_def, generationState.generation, uiListeners);
    Math.seedrandom();
    cw_clearPopulationWorld();
    resetCarUI();
    setupCarUI();
    cw_drawMiniMap();
    cw_startSimulation();
  };
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
  // console.log("about to build cars");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2FyLXNjaGVtYS9jYXItY29uc3RhbnRzLmpzb24iLCJzcmMvY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanMiLCJzcmMvY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzIiwic3JjL2Nhci1zY2hlbWEvcnVuLmpzIiwic3JjL2RyYXcvZHJhdy1jYXItc3RhdHMuanMiLCJzcmMvZHJhdy9kcmF3LWNhci5qcyIsInNyYy9kcmF3L2RyYXctY2lyY2xlLmpzIiwic3JjL2RyYXcvZHJhdy1mbG9vci5qcyIsInNyYy9kcmF3L2RyYXctdmlydHVhbC1wb2x5LmpzIiwic3JjL2RyYXcvcGxvdC1ncmFwaHMuanMiLCJzcmMvZHJhdy9zY2F0dGVyLXBsb3QuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvZ2VuZXJhdGVSYW5kb20uanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5icmVlZGluZy1jb2VmZmljaWVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmRleC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9waWNrUGFyZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3NlbGVjdEZyb21BbGxQYXJlbnRzLmpzIiwic3JjL2dob3N0L2Nhci10by1naG9zdC5qcyIsInNyYy9naG9zdC9pbmRleC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZS5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzV1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJ3aGVlbENvdW50XCI6IDIsXG4gIFwid2hlZWxNaW5SYWRpdXNcIjogMC4yLFxuICBcIndoZWVsUmFkaXVzUmFuZ2VcIjogMC41LFxuICBcIndoZWVsTWluRGVuc2l0eVwiOiA0MCxcbiAgXCJ3aGVlbERlbnNpdHlSYW5nZVwiOiAxMDAsXG4gIFwiY2hhc3Npc0RlbnNpdHlSYW5nZVwiOiAzMDAsXG4gIFwiY2hhc3Npc01pbkRlbnNpdHlcIjogMzAsXG4gIFwiY2hhc3Npc01pbkF4aXNcIjogMC4xLFxuICBcImNoYXNzaXNBeGlzUmFuZ2VcIjogMS4xXG59XG4iLCJ2YXIgY2FyQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY2FyLWNvbnN0YW50cy5qc29uXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgd29ybGREZWY6IHdvcmxkRGVmLFxuICBjYXJDb25zdGFudHM6IGdldENhckNvbnN0YW50cyxcbiAgZ2VuZXJhdGVTY2hlbWE6IGdlbmVyYXRlU2NoZW1hXG59XG5cbmZ1bmN0aW9uIHdvcmxkRGVmKCl7XG4gIHZhciBib3gyZGZwcyA9IDYwO1xuICByZXR1cm4ge1xuICAgIGdyYXZpdHk6IHsgeTogMCB9LFxuICAgIGRvU2xlZXA6IHRydWUsXG4gICAgZmxvb3JzZWVkOiBcImFiY1wiLFxuICAgIG1heEZsb29yVGlsZXM6IDIwMCxcbiAgICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcbiAgICBtb3RvclNwZWVkOiAyMCxcbiAgICBib3gyZGZwczogYm94MmRmcHMsXG4gICAgbWF4X2Nhcl9oZWFsdGg6IGJveDJkZnBzICogMTAsXG4gICAgdGlsZURpbWVuc2lvbnM6IHtcbiAgICAgIHdpZHRoOiAxLjUsXG4gICAgICBoZWlnaHQ6IDAuMTVcbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldENhckNvbnN0YW50cygpe1xuICByZXR1cm4gY2FyQ29uc3RhbnRzO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVNjaGVtYSh2YWx1ZXMpe1xuICByZXR1cm4ge1xuICAgIHdoZWVsX3JhZGl1czoge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluUmFkaXVzLFxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbFJhZGl1c1JhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgd2hlZWxfZGVuc2l0eToge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluRGVuc2l0eSxcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxEZW5zaXR5UmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICBjaGFzc2lzX2RlbnNpdHk6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogMSxcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNEZW5zaXR5UmFuZ2UsXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNNaW5EZW5zaXR5LFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgdmVydGV4X2xpc3Q6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogMTIsXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzTWluQXhpcyxcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc0F4aXNSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHdoZWVsX3ZlcnRleDoge1xuICAgICAgdHlwZTogXCJzaHVmZmxlXCIsXG4gICAgICBsZW5ndGg6IDgsXG4gICAgICBsaW1pdDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgfTtcbn1cbiIsIi8qXG4gIGdsb2JhbHMgYjJSZXZvbHV0ZUpvaW50RGVmIGIyVmVjMiBiMkJvZHlEZWYgYjJCb2R5IGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSBiMkNpcmNsZVNoYXBlXG4qL1xuXG52YXIgY3JlYXRlSW5zdGFuY2UgPSByZXF1aXJlKFwiLi4vbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XG5cbmZ1bmN0aW9uIGRlZlRvQ2FyKG5vcm1hbF9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xuICB2YXIgY2FyX2RlZiA9IGNyZWF0ZUluc3RhbmNlLmFwcGx5VHlwZXMoY29uc3RhbnRzLnNjaGVtYSwgbm9ybWFsX2RlZilcbiAgdmFyIGluc3RhbmNlID0ge307XG4gIGluc3RhbmNlLmNoYXNzaXMgPSBjcmVhdGVDaGFzc2lzKFxuICAgIHdvcmxkLCBjYXJfZGVmLnZlcnRleF9saXN0LCBjYXJfZGVmLmNoYXNzaXNfZGVuc2l0eVxuICApO1xuICB2YXIgaTtcblxuICB2YXIgd2hlZWxDb3VudCA9IGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aDtcblxuICBpbnN0YW5jZS53aGVlbHMgPSBbXTtcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xuICAgIGluc3RhbmNlLndoZWVsc1tpXSA9IGNyZWF0ZVdoZWVsKFxuICAgICAgd29ybGQsXG4gICAgICBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXSxcbiAgICAgIGNhcl9kZWYud2hlZWxfZGVuc2l0eVtpXVxuICAgICk7XG4gIH1cblxuICB2YXIgY2FybWFzcyA9IGluc3RhbmNlLmNoYXNzaXMuR2V0TWFzcygpO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xuICB9XG5cbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xuXG4gICAgdmFyIHJhbmR2ZXJ0ZXggPSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0W2Nhcl9kZWYud2hlZWxfdmVydGV4W2ldXTtcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XG4gICAgam9pbnRfZGVmLm1heE1vdG9yVG9ycXVlID0gdG9ycXVlO1xuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XG4gICAgam9pbnRfZGVmLmJvZHlBID0gaW5zdGFuY2UuY2hhc3NpcztcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcbiAgfVxuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xuXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1swXSwgMCkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxXSwgdmVydGV4c1syXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNF0sIHZlcnRleHNbNV0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzZdLCAwKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIC12ZXJ0ZXhzWzldKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzEwXSwgLXZlcnRleHNbMTFdKSk7XG5cbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xuXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG5cbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMF0sIHZlcnRleF9saXN0WzFdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMV0sIHZlcnRleF9saXN0WzJdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbM10sIHZlcnRleF9saXN0WzRdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNF0sIHZlcnRleF9saXN0WzVdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNl0sIHZlcnRleF9saXN0WzddLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbN10sIHZlcnRleF9saXN0WzBdLCBkZW5zaXR5KTtcblxuICBib2R5LnZlcnRleF9saXN0ID0gdmVydGV4X2xpc3Q7XG5cbiAgcmV0dXJuIGJvZHk7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4MSwgdmVydGV4MiwgZGVuc2l0eSkge1xuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgyKTtcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcblxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuIiwiXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZXRJbml0aWFsU3RhdGU6IGdldEluaXRpYWxTdGF0ZSxcbiAgdXBkYXRlU3RhdGU6IHVwZGF0ZVN0YXRlLFxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcbiAgY2FsY3VsYXRlU2NvcmU6IGNhbGN1bGF0ZVNjb3JlLFxufTtcblxuZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZil7XG4gIHJldHVybiB7XG4gICAgZnJhbWVzOiAwLFxuICAgIGhlYWx0aDogd29ybGRfZGVmLm1heF9jYXJfaGVhbHRoLFxuICAgIG1heFBvc2l0aW9ueTogMCxcbiAgICBtaW5Qb3NpdGlvbnk6IDAsXG4gICAgbWF4UG9zaXRpb254OiAwLFxuICB9O1xufVxuXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZShjb25zdGFudHMsIHdvcmxkQ29uc3RydWN0LCBzdGF0ZSl7XG4gIGlmKHN0YXRlLmhlYWx0aCA8PSAwKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbHJlYWR5IERlYWRcIik7XG4gIH1cbiAgaWYoc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpe1xuICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgRmluaXNoZWRcIik7XG4gIH1cblxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZSk7XG4gIC8vIGNoZWNrIGhlYWx0aFxuICB2YXIgcG9zaXRpb24gPSB3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XG4gIC8vIGNoZWNrIGlmIGNhciByZWFjaGVkIGVuZCBvZiB0aGUgcGF0aFxuICB2YXIgbmV4dFN0YXRlID0ge1xuICAgIGZyYW1lczogc3RhdGUuZnJhbWVzICsgMSxcbiAgICBtYXhQb3NpdGlvbng6IHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggPyBwb3NpdGlvbi54IDogc3RhdGUubWF4UG9zaXRpb254LFxuICAgIG1heFBvc2l0aW9ueTogcG9zaXRpb24ueSA+IHN0YXRlLm1heFBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5tYXhQb3NpdGlvbnksXG4gICAgbWluUG9zaXRpb255OiBwb3NpdGlvbi55IDwgc3RhdGUubWluUG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1pblBvc2l0aW9ueVxuICB9O1xuXG4gIGlmIChwb3NpdGlvbi54ID4gY29uc3RhbnRzLmZpbmlzaExpbmUpIHtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG5cbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG4gIG5leHRTdGF0ZS5oZWFsdGggPSBzdGF0ZS5oZWFsdGggLSAxO1xuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XG4gIH1cbiAgcmV0dXJuIG5leHRTdGF0ZTtcbn1cblxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xuICBpZihoYXNGYWlsZWQoc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAtMTtcbiAgaWYoaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIDE7XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XG4gIHJldHVybiBzdGF0ZS5oZWFsdGggPD0gMDtcbn1cbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XG4gIHJldHVybiBzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZTtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlU2NvcmUoc3RhdGUsIGNvbnN0YW50cyl7XG4gIHZhciBhdmdzcGVlZCA9IChzdGF0ZS5tYXhQb3NpdGlvbnggLyBzdGF0ZS5mcmFtZXMpICogY29uc3RhbnRzLmJveDJkZnBzO1xuICB2YXIgcG9zaXRpb24gPSBzdGF0ZS5tYXhQb3NpdGlvbng7XG4gIHZhciBzY29yZSA9IHBvc2l0aW9uICsgYXZnc3BlZWQ7XG4gIHJldHVybiB7XG4gICAgdjogc2NvcmUsXG4gICAgczogYXZnc3BlZWQsXG4gICAgeDogcG9zaXRpb24sXG4gICAgeTogc3RhdGUubWF4UG9zaXRpb255LFxuICAgIHkyOiBzdGF0ZS5taW5Qb3NpdGlvbnlcbiAgfVxufVxuIiwiLyogZ2xvYmFscyBkb2N1bWVudCAqL1xuXG52YXIgcnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKiA9PT0gQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG52YXIgY3dfQ2FyID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLl9fY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuY3dfQ2FyLnByb3RvdHlwZS5fX2NvbnN0cnVjdG9yID0gZnVuY3Rpb24gKGNhcikge1xuICB0aGlzLmNhciA9IGNhcjtcbiAgdGhpcy5jYXJfZGVmID0gY2FyLmRlZjtcbiAgdmFyIGNhcl9kZWYgPSB0aGlzLmNhcl9kZWY7XG5cbiAgdGhpcy5mcmFtZXMgPSAwO1xuICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgdGhpcy5pc19lbGl0ZSA9IGNhci5kZWYuaXNfZWxpdGU7XG4gIHRoaXMuaGVhbHRoQmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLnN0eWxlO1xuICB0aGlzLmhlYWx0aEJhclRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiICsgY2FyX2RlZi5pbmRleCkubmV4dFNpYmxpbmcubmV4dFNpYmxpbmc7XG4gIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xuICB0aGlzLm1pbmltYXBtYXJrZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJhclwiICsgY2FyX2RlZi5pbmRleCk7XG5cbiAgaWYgKHRoaXMuaXNfZWxpdGUpIHtcbiAgICB0aGlzLmhlYWx0aEJhci5iYWNrZ3JvdW5kQ29sb3IgPSBcIiMzRjcyQUZcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmhlYWx0aEJhci5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGN0M4NzNcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICNGN0M4NzNcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcbiAgfVxuXG59XG5cbmN3X0Nhci5wcm90b3R5cGUuZ2V0UG9zaXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmNhci5jYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpO1xufVxuXG5jd19DYXIucHJvdG90eXBlLmtpbGwgPSBmdW5jdGlvbiAoY3VycmVudFJ1bm5lciwgY29uc3RhbnRzKSB7XG4gIHRoaXMubWluaW1hcG1hcmtlci5zdHlsZS5ib3JkZXJMZWZ0ID0gXCIxcHggc29saWQgIzNGNzJBRlwiO1xuICB2YXIgZmluaXNoTGluZSA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmluaXNoTGluZVxuICB2YXIgbWF4X2Nhcl9oZWFsdGggPSBjb25zdGFudHMubWF4X2Nhcl9oZWFsdGg7XG4gIHZhciBzdGF0dXMgPSBydW4uZ2V0U3RhdHVzKHRoaXMuY2FyLnN0YXRlLCB7XG4gICAgZmluaXNoTGluZTogZmluaXNoTGluZSxcbiAgICBtYXhfY2FyX2hlYWx0aDogbWF4X2Nhcl9oZWFsdGgsXG4gIH0pXG4gIHN3aXRjaChzdGF0dXMpe1xuICAgIGNhc2UgMToge1xuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGNhc2UgLTE6IHtcbiAgICAgIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBcIiZkYWdnZXI7XCI7XG4gICAgICB0aGlzLmhlYWx0aEJhci53aWR0aCA9IFwiMFwiO1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3dfQ2FyO1xuIiwiXG52YXIgY3dfZHJhd1ZpcnR1YWxQb2x5ID0gcmVxdWlyZShcIi4vZHJhdy12aXJ0dWFsLXBvbHlcIik7XG52YXIgY3dfZHJhd0NpcmNsZSA9IHJlcXVpcmUoXCIuL2RyYXctY2lyY2xlXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNhcl9jb25zdGFudHMsIG15Q2FyLCBjYW1lcmEsIGN0eCl7XG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcblxuICB2YXIgd2hlZWxNaW5EZW5zaXR5ID0gY2FyX2NvbnN0YW50cy53aGVlbE1pbkRlbnNpdHlcbiAgdmFyIHdoZWVsRGVuc2l0eVJhbmdlID0gY2FyX2NvbnN0YW50cy53aGVlbERlbnNpdHlSYW5nZVxuXG4gIGlmICghbXlDYXIuYWxpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG15Q2FyUG9zID0gbXlDYXIuZ2V0UG9zaXRpb24oKTtcblxuICBpZiAobXlDYXJQb3MueCA8IChjYW1lcmFfeCAtIDUpKSB7XG4gICAgLy8gdG9vIGZhciBiZWhpbmQsIGRvbid0IGRyYXdcbiAgICByZXR1cm47XG4gIH1cblxuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiM0NDRcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xuXG4gIHZhciB3aGVlbHMgPSBteUNhci5jYXIuY2FyLndoZWVscztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHdoZWVscy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gd2hlZWxzW2ldO1xuICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xuICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG4gICAgICB2YXIgY29sb3IgPSBNYXRoLnJvdW5kKDI1NSAtICgyNTUgKiAoZi5tX2RlbnNpdHkgLSB3aGVlbE1pbkRlbnNpdHkpKSAvIHdoZWVsRGVuc2l0eVJhbmdlKS50b1N0cmluZygpO1xuICAgICAgdmFyIHJnYmNvbG9yID0gXCJyZ2IoXCIgKyBjb2xvciArIFwiLFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIpXCI7XG4gICAgICBjd19kcmF3Q2lyY2xlKGN0eCwgYiwgcy5tX3AsIHMubV9yYWRpdXMsIGIubV9zd2VlcC5hLCByZ2Jjb2xvcik7XG4gICAgfVxuICB9XG5cbiAgaWYgKG15Q2FyLmlzX2VsaXRlKSB7XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0RCRTJFRlwiO1xuICB9IGVsc2Uge1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiI0Y3Qzg3M1wiO1xuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGQUVCQ0RcIjtcbiAgfVxuICBjdHguYmVnaW5QYXRoKCk7XG5cbiAgdmFyIGNoYXNzaXMgPSBteUNhci5jYXIuY2FyLmNoYXNzaXM7XG5cbiAgZm9yIChmID0gY2hhc3Npcy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICB2YXIgY3MgPSBmLkdldFNoYXBlKCk7XG4gICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgY2hhc3NpcywgY3MubV92ZXJ0aWNlcywgY3MubV92ZXJ0ZXhDb3VudCk7XG4gIH1cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGN3X2RyYXdDaXJjbGU7XG5cbmZ1bmN0aW9uIGN3X2RyYXdDaXJjbGUoY3R4LCBib2R5LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUsIGNvbG9yKSB7XG4gIHZhciBwID0gYm9keS5HZXRXb3JsZFBvaW50KGNlbnRlcik7XG4gIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcblxuICBjdHguYmVnaW5QYXRoKCk7XG4gIGN0eC5hcmMocC54LCBwLnksIHJhZGl1cywgMCwgMiAqIE1hdGguUEksIHRydWUpO1xuXG4gIGN0eC5tb3ZlVG8ocC54LCBwLnkpO1xuICBjdHgubGluZVRvKHAueCArIHJhZGl1cyAqIE1hdGguY29zKGFuZ2xlKSwgcC55ICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpKTtcblxuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlKCk7XG59XG4iLCJ2YXIgY3dfZHJhd1ZpcnR1YWxQb2x5ID0gcmVxdWlyZShcIi4vZHJhdy12aXJ0dWFsLXBvbHlcIik7XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgY2FtZXJhLCBjd19mbG9vclRpbGVzKSB7XG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjMDAwXCI7XG4gIGN0eC5maWxsU3R5bGUgPSBcIiM3NzdcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xuICBjdHguYmVnaW5QYXRoKCk7XG5cbiAgdmFyIGs7XG4gIGlmKGNhbWVyYS5wb3MueCAtIDEwID4gMCl7XG4gICAgayA9IE1hdGguZmxvb3IoKGNhbWVyYS5wb3MueCAtIDEwKSAvIDEuNSk7XG4gIH0gZWxzZSB7XG4gICAgayA9IDA7XG4gIH1cblxuICAvLyBjb25zb2xlLmxvZyhrKTtcblxuICBvdXRlcl9sb29wOlxuICAgIGZvciAoazsgayA8IGN3X2Zsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcbiAgICAgIHZhciBiID0gY3dfZmxvb3JUaWxlc1trXTtcbiAgICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xuICAgICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcbiAgICAgICAgdmFyIHNoYXBlUG9zaXRpb24gPSBiLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzWzBdKS54O1xuICAgICAgICBpZiAoKHNoYXBlUG9zaXRpb24gPiAoY2FtZXJhX3ggLSA1KSkgJiYgKHNoYXBlUG9zaXRpb24gPCAoY2FtZXJhX3ggKyAxMCkpKSB7XG4gICAgICAgICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgYiwgcy5tX3ZlcnRpY2VzLCBzLm1fdmVydGV4Q291bnQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzaGFwZVBvc2l0aW9uID4gY2FtZXJhX3ggKyAxMCkge1xuICAgICAgICAgIGJyZWFrIG91dGVyX2xvb3A7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIGN0eC5maWxsKCk7XG4gIGN0eC5zdHJva2UoKTtcbn1cbiIsIlxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGN0eCwgYm9keSwgdnR4LCBuX3Z0eCkge1xuICAvLyBzZXQgc3Ryb2tlc3R5bGUgYW5kIGZpbGxzdHlsZSBiZWZvcmUgY2FsbFxuICAvLyBjYWxsIGJlZ2luUGF0aCBiZWZvcmUgY2FsbFxuXG4gIHZhciBwMCA9IGJvZHkuR2V0V29ybGRQb2ludCh2dHhbMF0pO1xuICBjdHgubW92ZVRvKHAwLngsIHAwLnkpO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcbiAgICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludCh2dHhbaV0pO1xuICAgIGN0eC5saW5lVG8ocC54LCBwLnkpO1xuICB9XG4gIGN0eC5saW5lVG8ocDAueCwgcDAueSk7XG59XG4iLCJ2YXIgc2NhdHRlclBsb3QgPSByZXF1aXJlKFwiLi9zY2F0dGVyLXBsb3RcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBwbG90R3JhcGhzOiBmdW5jdGlvbihncmFwaEVsZW0sIHRvcFNjb3Jlc0VsZW0sIHNjYXR0ZXJQbG90RWxlbSwgbGFzdFN0YXRlLCBzY29yZXMsIGNvbmZpZykge1xuICAgIGxhc3RTdGF0ZSA9IGxhc3RTdGF0ZSB8fCB7fTtcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBzY29yZXMubGVuZ3RoXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgdmFyIG5leHRTdGF0ZSA9IGN3X3N0b3JlR3JhcGhTY29yZXMoXG4gICAgICBsYXN0U3RhdGUsIHNjb3JlcywgZ2VuZXJhdGlvblNpemVcbiAgICApO1xuICAgIC8vIGNvbnNvbGUubG9nKHNjb3JlcywgbmV4dFN0YXRlKTtcbiAgICBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpO1xuICAgIGN3X3Bsb3RBdmVyYWdlKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xuICAgIGN3X3Bsb3RFbGl0ZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19wbG90VG9wKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xuICAgIGN3X2xpc3RUb3BTY29yZXModG9wU2NvcmVzRWxlbSwgbmV4dFN0YXRlKTtcbiAgICBuZXh0U3RhdGUuc2NhdHRlckdyYXBoID0gZHJhd0FsbFJlc3VsdHMoXG4gICAgICBzY2F0dGVyUGxvdEVsZW0sIGNvbmZpZywgbmV4dFN0YXRlLCBsYXN0U3RhdGUuc2NhdHRlckdyYXBoXG4gICAgKTtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9LFxuICBjbGVhckdyYXBoaWNzOiBmdW5jdGlvbihncmFwaEVsZW0pIHtcbiAgICB2YXIgZ3JhcGhjYW52YXMgPSBncmFwaEVsZW07XG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIHZhciBncmFwaHdpZHRoID0gNDAwO1xuICAgIHZhciBncmFwaGhlaWdodCA9IDI1MDtcbiAgICBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGN3X3N0b3JlR3JhcGhTY29yZXMobGFzdFN0YXRlLCBjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIC8vIGNvbnNvbGUubG9nKGN3X2NhclNjb3Jlcyk7XG4gIHJldHVybiB7XG4gICAgY3dfdG9wU2NvcmVzOiAobGFzdFN0YXRlLmN3X3RvcFNjb3JlcyB8fCBbXSlcbiAgICAuY29uY2F0KFtjd19jYXJTY29yZXNbMF0uc2NvcmVdKSxcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IChsYXN0U3RhdGUuY3dfZ3JhcGhBdmVyYWdlIHx8IFtdKS5jb25jYXQoW1xuICAgICAgY3dfYXZlcmFnZShjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKVxuICAgIF0pLFxuICAgIGN3X2dyYXBoRWxpdGU6IChsYXN0U3RhdGUuY3dfZ3JhcGhFbGl0ZSB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2VsaXRlYXZlcmFnZShjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKVxuICAgIF0pLFxuICAgIGN3X2dyYXBoVG9wOiAobGFzdFN0YXRlLmN3X2dyYXBoVG9wIHx8IFtdKS5jb25jYXQoW1xuICAgICAgY3dfY2FyU2NvcmVzWzBdLnNjb3JlLnZcbiAgICBdKSxcbiAgICAvLyBhbGxSZXN1bHRzOiAobGFzdFN0YXRlLmFsbFJlc3VsdHMgfHwgW10pLmNvbmNhdChjd19jYXJTY29yZXMpLFxuICB9XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RUb3Aoc3RhdGUsIGdyYXBoY3R4KSB7XG4gIHZhciBjd19ncmFwaFRvcCA9IHN0YXRlLmN3X2dyYXBoVG9wO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhUb3AubGVuZ3RoO1xuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiI0M4M0IzQlwiO1xuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoVG9wW2tdKTtcbiAgfVxuICBncmFwaGN0eC5zdHJva2UoKTtcbn1cblxuZnVuY3Rpb24gY3dfcGxvdEVsaXRlKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhFbGl0ZSA9IHN0YXRlLmN3X2dyYXBoRWxpdGU7XG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEVsaXRlLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiM3QkM3NERcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEVsaXRlW2tdKTtcbiAgfVxuICBncmFwaGN0eC5zdHJva2UoKTtcbn1cblxuZnVuY3Rpb24gY3dfcGxvdEF2ZXJhZ2Uoc3RhdGUsIGdyYXBoY3R4KSB7XG4gIHZhciBjd19ncmFwaEF2ZXJhZ2UgPSBzdGF0ZS5jd19ncmFwaEF2ZXJhZ2U7XG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEF2ZXJhZ2UubGVuZ3RoO1xuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoQXZlcmFnZVtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cblxuZnVuY3Rpb24gY3dfZWxpdGVhdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcbiAgdmFyIHN1bSA9IDA7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpOyBrKyspIHtcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnNjb3JlLnY7XG4gIH1cbiAgcmV0dXJuIHN1bSAvIE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTtcbn1cblxuZnVuY3Rpb24gY3dfYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIHZhciBzdW0gPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnNjb3JlLnY7XG4gIH1cbiAgcmV0dXJuIHN1bSAvIGdlbmVyYXRpb25TaXplO1xufVxuXG5mdW5jdGlvbiBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpIHtcbiAgZ3JhcGhjYW52YXMud2lkdGggPSBncmFwaGNhbnZhcy53aWR0aDtcbiAgZ3JhcGhjdHgudHJhbnNsYXRlKDAsIGdyYXBoaGVpZ2h0KTtcbiAgZ3JhcGhjdHguc2NhbGUoMSwgLTEpO1xuICBncmFwaGN0eC5saW5lV2lkdGggPSAxO1xuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gMik7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDIpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyA0KTtcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0IC8gNCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0ICogMyAvIDQpO1xuICBncmFwaGN0eC5zdHJva2UoKTtcbn1cblxuZnVuY3Rpb24gY3dfbGlzdFRvcFNjb3JlcyhlbGVtLCBzdGF0ZSkge1xuICB2YXIgY3dfdG9wU2NvcmVzID0gc3RhdGUuY3dfdG9wU2NvcmVzO1xuICB2YXIgdHMgPSBlbGVtO1xuICB0cy5pbm5lckhUTUwgPSBcIjxiPlRvcCBTY29yZXM6PC9iPjxiciAvPlwiO1xuICBjd190b3BTY29yZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIGlmIChhLnYgPiBiLnYpIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMVxuICAgIH1cbiAgfSk7XG5cbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLm1pbigxMCwgY3dfdG9wU2NvcmVzLmxlbmd0aCk7IGsrKykge1xuICAgIHZhciB0b3BTY29yZSA9IGN3X3RvcFNjb3Jlc1trXTtcbiAgICAvLyBjb25zb2xlLmxvZyh0b3BTY29yZSk7XG4gICAgdmFyIG4gPSBcIiNcIiArIChrICsgMSkgKyBcIjpcIjtcbiAgICB2YXIgc2NvcmUgPSBNYXRoLnJvdW5kKHRvcFNjb3JlLnYgKiAxMDApIC8gMTAwO1xuICAgIHZhciBkaXN0YW5jZSA9IFwiZDpcIiArIE1hdGgucm91bmQodG9wU2NvcmUueCAqIDEwMCkgLyAxMDA7XG4gICAgdmFyIHlyYW5nZSA9ICBcImg6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnkyICogMTAwKSAvIDEwMCArIFwiL1wiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55ICogMTAwKSAvIDEwMCArIFwibVwiO1xuICAgIHZhciBnZW4gPSBcIihHZW4gXCIgKyBjd190b3BTY29yZXNba10uaSArIFwiKVwiXG5cbiAgICB0cy5pbm5lckhUTUwgKz0gIFtuLCBzY29yZSwgZGlzdGFuY2UsIHlyYW5nZSwgZ2VuXS5qb2luKFwiIFwiKSArIFwiPGJyIC8+XCI7XG4gIH1cbn1cblxuZnVuY3Rpb24gZHJhd0FsbFJlc3VsdHMoc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIGFsbFJlc3VsdHMsIHByZXZpb3VzR3JhcGgpe1xuICBpZighc2NhdHRlclBsb3RFbGVtKSByZXR1cm47XG4gIHJldHVybiBzY2F0dGVyUGxvdChzY2F0dGVyUGxvdEVsZW0sIGFsbFJlc3VsdHMsIGNvbmZpZy5wcm9wZXJ0eU1hcCwgcHJldmlvdXNHcmFwaClcbn1cbiIsIi8qIGdsb2JhbHMgdmlzIEhpZ2hjaGFydHMgKi9cblxuLy8gQ2FsbGVkIHdoZW4gdGhlIFZpc3VhbGl6YXRpb24gQVBJIGlzIGxvYWRlZC5cblxubW9kdWxlLmV4cG9ydHMgPSBoaWdoQ2hhcnRzO1xuZnVuY3Rpb24gaGlnaENoYXJ0cyhlbGVtLCBzY29yZXMpe1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNjb3Jlc1swXS5kZWYpO1xuICBrZXlzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24oY3VyQXJyYXksIGtleSl7XG4gICAgdmFyIGwgPSBzY29yZXNbMF0uZGVmW2tleV0ubGVuZ3RoO1xuICAgIHZhciBzdWJBcnJheSA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xuICAgICAgc3ViQXJyYXkucHVzaChrZXkgKyBcIi5cIiArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gY3VyQXJyYXkuY29uY2F0KHN1YkFycmF5KTtcbiAgfSwgW10pO1xuICBmdW5jdGlvbiByZXRyaWV2ZVZhbHVlKG9iaiwgcGF0aCl7XG4gICAgcmV0dXJuIHBhdGguc3BsaXQoXCIuXCIpLnJlZHVjZShmdW5jdGlvbihjdXJWYWx1ZSwga2V5KXtcbiAgICAgIHJldHVybiBjdXJWYWx1ZVtrZXldO1xuICAgIH0sIG9iaik7XG4gIH1cblxuICB2YXIgZGF0YU9iaiA9IE9iamVjdC5rZXlzKHNjb3JlcykucmVkdWNlKGZ1bmN0aW9uKGt2LCBzY29yZSl7XG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XG4gICAgICBrdltrZXldLmRhdGEucHVzaChbXG4gICAgICAgIHJldHJpZXZlVmFsdWUoc2NvcmUuZGVmLCBrZXkpLCBzY29yZS5zY29yZS52XG4gICAgICBdKVxuICAgIH0pXG4gICAgcmV0dXJuIGt2O1xuICB9LCBrZXlzLnJlZHVjZShmdW5jdGlvbihrdiwga2V5KXtcbiAgICBrdltrZXldID0ge1xuICAgICAgbmFtZToga2V5LFxuICAgICAgZGF0YTogW10sXG4gICAgfVxuICAgIHJldHVybiBrdjtcbiAgfSwge30pKVxuICBIaWdoY2hhcnRzLmNoYXJ0KGVsZW0uaWQsIHtcbiAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgdHlwZTogJ3NjYXR0ZXInLFxuICAgICAgICAgIHpvb21UeXBlOiAneHknXG4gICAgICB9LFxuICAgICAgdGl0bGU6IHtcbiAgICAgICAgICB0ZXh0OiAnUHJvcGVydHkgVmFsdWUgdG8gU2NvcmUnXG4gICAgICB9LFxuICAgICAgeEF4aXM6IHtcbiAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICB0ZXh0OiAnTm9ybWFsaXplZCdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHN0YXJ0T25UaWNrOiB0cnVlLFxuICAgICAgICAgIGVuZE9uVGljazogdHJ1ZSxcbiAgICAgICAgICBzaG93TGFzdExhYmVsOiB0cnVlXG4gICAgICB9LFxuICAgICAgeUF4aXM6IHtcbiAgICAgICAgICB0aXRsZToge1xuICAgICAgICAgICAgICB0ZXh0OiAnU2NvcmUnXG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGxlZ2VuZDoge1xuICAgICAgICAgIGxheW91dDogJ3ZlcnRpY2FsJyxcbiAgICAgICAgICBhbGlnbjogJ2xlZnQnLFxuICAgICAgICAgIHZlcnRpY2FsQWxpZ246ICd0b3AnLFxuICAgICAgICAgIHg6IDEwMCxcbiAgICAgICAgICB5OiA3MCxcbiAgICAgICAgICBmbG9hdGluZzogdHJ1ZSxcbiAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IChIaWdoY2hhcnRzLnRoZW1lICYmIEhpZ2hjaGFydHMudGhlbWUubGVnZW5kQmFja2dyb3VuZENvbG9yKSB8fCAnI0ZGRkZGRicsXG4gICAgICAgICAgYm9yZGVyV2lkdGg6IDFcbiAgICAgIH0sXG4gICAgICBwbG90T3B0aW9uczoge1xuICAgICAgICAgIHNjYXR0ZXI6IHtcbiAgICAgICAgICAgICAgbWFya2VyOiB7XG4gICAgICAgICAgICAgICAgICByYWRpdXM6IDUsXG4gICAgICAgICAgICAgICAgICBzdGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICBob3Zlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lQ29sb3I6ICdyZ2IoMTAwLDEwMCwxMDApJ1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgc3RhdGVzOiB7XG4gICAgICAgICAgICAgICAgICBob3Zlcjoge1xuICAgICAgICAgICAgICAgICAgICAgIG1hcmtlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgdG9vbHRpcDoge1xuICAgICAgICAgICAgICAgICAgaGVhZGVyRm9ybWF0OiAnPGI+e3Nlcmllcy5uYW1lfTwvYj48YnI+JyxcbiAgICAgICAgICAgICAgICAgIHBvaW50Rm9ybWF0OiAne3BvaW50Lnh9LCB7cG9pbnQueX0nXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc2VyaWVzOiBrZXlzLm1hcChmdW5jdGlvbihrZXkpe1xuICAgICAgICByZXR1cm4gZGF0YU9ialtrZXldO1xuICAgICAgfSlcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHZpc0NoYXJ0KGVsZW0sIHNjb3JlcywgcHJvcGVydHlNYXAsIGdyYXBoKSB7XG5cbiAgLy8gQ3JlYXRlIGFuZCBwb3B1bGF0ZSBhIGRhdGEgdGFibGUuXG4gIHZhciBkYXRhID0gbmV3IHZpcy5EYXRhU2V0KCk7XG4gIHNjb3Jlcy5mb3JFYWNoKGZ1bmN0aW9uKHNjb3JlSW5mbyl7XG4gICAgZGF0YS5hZGQoe1xuICAgICAgeDogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC54KSxcbiAgICAgIHk6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXG4gICAgICB6OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxuICAgICAgc3R5bGU6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueiksXG4gICAgICAvLyBleHRyYTogZGVmLmFuY2VzdHJ5XG4gICAgfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldFByb3BlcnR5KGluZm8sIGtleSl7XG4gICAgaWYoa2V5ID09PSBcInNjb3JlXCIpe1xuICAgICAgcmV0dXJuIGluZm8uc2NvcmUudlxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW5mby5kZWZba2V5XTtcbiAgICB9XG4gIH1cblxuICAvLyBzcGVjaWZ5IG9wdGlvbnNcbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgd2lkdGg6ICAnNjAwcHgnLFxuICAgIGhlaWdodDogJzYwMHB4JyxcbiAgICBzdHlsZTogJ2RvdC1zaXplJyxcbiAgICBzaG93UGVyc3BlY3RpdmU6IHRydWUsXG4gICAgc2hvd0xlZ2VuZDogdHJ1ZSxcbiAgICBzaG93R3JpZDogdHJ1ZSxcbiAgICBzaG93U2hhZG93OiBmYWxzZSxcblxuICAgIC8vIE9wdGlvbiB0b29sdGlwIGNhbiBiZSB0cnVlLCBmYWxzZSwgb3IgYSBmdW5jdGlvbiByZXR1cm5pbmcgYSBzdHJpbmcgd2l0aCBIVE1MIGNvbnRlbnRzXG4gICAgdG9vbHRpcDogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAvLyBwYXJhbWV0ZXIgcG9pbnQgY29udGFpbnMgcHJvcGVydGllcyB4LCB5LCB6LCBhbmQgZGF0YVxuICAgICAgLy8gZGF0YSBpcyB0aGUgb3JpZ2luYWwgb2JqZWN0IHBhc3NlZCB0byB0aGUgcG9pbnQgY29uc3RydWN0b3JcbiAgICAgIHJldHVybiAnc2NvcmU6IDxiPicgKyBwb2ludC56ICsgJzwvYj48YnI+JzsgLy8gKyBwb2ludC5kYXRhLmV4dHJhO1xuICAgIH0sXG5cbiAgICAvLyBUb29sdGlwIGRlZmF1bHQgc3R5bGluZyBjYW4gYmUgb3ZlcnJpZGRlblxuICAgIHRvb2x0aXBTdHlsZToge1xuICAgICAgY29udGVudDoge1xuICAgICAgICBiYWNrZ3JvdW5kICAgIDogJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC43KScsXG4gICAgICAgIHBhZGRpbmcgICAgICAgOiAnMTBweCcsXG4gICAgICAgIGJvcmRlclJhZGl1cyAgOiAnMTBweCdcbiAgICAgIH0sXG4gICAgICBsaW5lOiB7XG4gICAgICAgIGJvcmRlckxlZnQgICAgOiAnMXB4IGRvdHRlZCByZ2JhKDAsIDAsIDAsIDAuNSknXG4gICAgICB9LFxuICAgICAgZG90OiB7XG4gICAgICAgIGJvcmRlciAgICAgICAgOiAnNXB4IHNvbGlkIHJnYmEoMCwgMCwgMCwgMC41KSdcbiAgICAgIH1cbiAgICB9LFxuXG4gICAga2VlcEFzcGVjdFJhdGlvOiB0cnVlLFxuICAgIHZlcnRpY2FsUmF0aW86IDAuNVxuICB9O1xuXG4gIHZhciBjYW1lcmEgPSBncmFwaCA/IGdyYXBoLmdldENhbWVyYVBvc2l0aW9uKCkgOiBudWxsO1xuXG4gIC8vIGNyZWF0ZSBvdXIgZ3JhcGhcbiAgdmFyIGNvbnRhaW5lciA9IGVsZW07XG4gIGdyYXBoID0gbmV3IHZpcy5HcmFwaDNkKGNvbnRhaW5lciwgZGF0YSwgb3B0aW9ucyk7XG5cbiAgaWYgKGNhbWVyYSkgZ3JhcGguc2V0Q2FtZXJhUG9zaXRpb24oY2FtZXJhKTsgLy8gcmVzdG9yZSBjYW1lcmEgcG9zaXRpb25cbiAgcmV0dXJuIGdyYXBoO1xufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVyYXRlUmFuZG9tO1xuZnVuY3Rpb24gZ2VuZXJhdGVSYW5kb20oKXtcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG59XG4iLCIvLyBodHRwOi8vc3VubWluZ3Rhby5ibG9nc3BvdC5jb20vMjAxNi8xMS9pbmJyZWVkaW5nLWNvZWZmaWNpZW50Lmh0bWxcbm1vZHVsZS5leHBvcnRzID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50O1xuXG5mdW5jdGlvbiBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQoY2hpbGQpe1xuICB2YXIgbmFtZUluZGV4ID0gbmV3IE1hcCgpO1xuICB2YXIgZmxhZ2dlZCA9IG5ldyBTZXQoKTtcbiAgdmFyIGNvbnZlcmdlbmNlUG9pbnRzID0gbmV3IFNldCgpO1xuICBjcmVhdGVBbmNlc3RyeU1hcChjaGlsZCwgW10pO1xuXG4gIHZhciBzdG9yZWRDb2VmZmljaWVudHMgPSBuZXcgTWFwKCk7XG5cbiAgcmV0dXJuIEFycmF5LmZyb20oY29udmVyZ2VuY2VQb2ludHMudmFsdWVzKCkpLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcbiAgICB2YXIgaUNvID0gZ2V0Q29lZmZpY2llbnQocG9pbnQpO1xuICAgIHJldHVybiBzdW0gKyBpQ287XG4gIH0sIDApO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUFuY2VzdHJ5TWFwKGluaXROb2RlKXtcbiAgICB2YXIgaXRlbXNJblF1ZXVlID0gW3sgbm9kZTogaW5pdE5vZGUsIHBhdGg6IFtdIH1dO1xuICAgIGRve1xuICAgICAgdmFyIGl0ZW0gPSBpdGVtc0luUXVldWUuc2hpZnQoKTtcbiAgICAgIHZhciBub2RlID0gaXRlbS5ub2RlO1xuICAgICAgdmFyIHBhdGggPSBpdGVtLnBhdGg7XG4gICAgICBpZihwcm9jZXNzSXRlbShub2RlLCBwYXRoKSl7XG4gICAgICAgIHZhciBuZXh0UGF0aCA9IFsgbm9kZS5pZCBdLmNvbmNhdChwYXRoKTtcbiAgICAgICAgaXRlbXNJblF1ZXVlID0gaXRlbXNJblF1ZXVlLmNvbmNhdChub2RlLmFuY2VzdHJ5Lm1hcChmdW5jdGlvbihwYXJlbnQpe1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBub2RlOiBwYXJlbnQsXG4gICAgICAgICAgICBwYXRoOiBuZXh0UGF0aFxuICAgICAgICAgIH07XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICB9d2hpbGUoaXRlbXNJblF1ZXVlLmxlbmd0aCk7XG5cblxuICAgIGZ1bmN0aW9uIHByb2Nlc3NJdGVtKG5vZGUsIHBhdGgpe1xuICAgICAgdmFyIG5ld0FuY2VzdG9yID0gIW5hbWVJbmRleC5oYXMobm9kZS5pZCk7XG4gICAgICBpZihuZXdBbmNlc3Rvcil7XG4gICAgICAgIG5hbWVJbmRleC5zZXQobm9kZS5pZCwge1xuICAgICAgICAgIHBhcmVudHM6IChub2RlLmFuY2VzdHJ5IHx8IFtdKS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQuaWQ7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXG4gICAgICAgICAgY2hpbGRyZW46IFtdLFxuICAgICAgICAgIGNvbnZlcmdlbmNlczogW10sXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcblxuICAgICAgICBmbGFnZ2VkLmFkZChub2RlLmlkKVxuICAgICAgICBuYW1lSW5kZXguZ2V0KG5vZGUuaWQpLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGRJZGVudGlmaWVyKXtcbiAgICAgICAgICB2YXIgb2Zmc2V0cyA9IGZpbmRDb252ZXJnZW5jZShjaGlsZElkZW50aWZpZXIucGF0aCwgcGF0aCk7XG4gICAgICAgICAgaWYoIW9mZnNldHMpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgY2hpbGRJRCA9IHBhdGhbb2Zmc2V0c1sxXV07XG4gICAgICAgICAgY29udmVyZ2VuY2VQb2ludHMuYWRkKGNoaWxkSUQpO1xuICAgICAgICAgIG5hbWVJbmRleC5nZXQoY2hpbGRJRCkuY29udmVyZ2VuY2VzLnB1c2goe1xuICAgICAgICAgICAgcGFyZW50OiBub2RlLmlkLFxuICAgICAgICAgICAgb2Zmc2V0czogb2Zmc2V0cyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmKHBhdGgubGVuZ3RoKXtcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5wdXNoKHtcbiAgICAgICAgICBjaGlsZDogcGF0aFswXSxcbiAgICAgICAgICBwYXRoOiBwYXRoXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZighbmV3QW5jZXN0b3Ipe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZighbm9kZS5hbmNlc3RyeSl7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvZWZmaWNpZW50KGlkKXtcbiAgICBpZihzdG9yZWRDb2VmZmljaWVudHMuaGFzKGlkKSl7XG4gICAgICByZXR1cm4gc3RvcmVkQ29lZmZpY2llbnRzLmdldChpZCk7XG4gICAgfVxuICAgIHZhciBub2RlID0gbmFtZUluZGV4LmdldChpZCk7XG4gICAgdmFyIHZhbCA9IG5vZGUuY29udmVyZ2VuY2VzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcbiAgICAgIHJldHVybiBzdW0gKyBNYXRoLnBvdygxIC8gMiwgcG9pbnQub2Zmc2V0cy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCB2YWx1ZSl7XG4gICAgICAgIHJldHVybiBzdW0gKyB2YWx1ZTtcbiAgICAgIH0sIDEpKSAqICgxICsgZ2V0Q29lZmZpY2llbnQocG9pbnQucGFyZW50KSk7XG4gICAgfSwgMCk7XG4gICAgc3RvcmVkQ29lZmZpY2llbnRzLnNldChpZCwgdmFsKTtcblxuICAgIHJldHVybiB2YWw7XG5cbiAgfVxuICBmdW5jdGlvbiBmaW5kQ29udmVyZ2VuY2UobGlzdEEsIGxpc3RCKXtcbiAgICB2YXIgY2ksIGNqLCBsaSwgbGo7XG4gICAgb3V0ZXJsb29wOlxuICAgIGZvcihjaSA9IDAsIGxpID0gbGlzdEEubGVuZ3RoOyBjaSA8IGxpOyBjaSsrKXtcbiAgICAgIGZvcihjaiA9IDAsIGxqID0gbGlzdEIubGVuZ3RoOyBjaiA8IGxqOyBjaisrKXtcbiAgICAgICAgaWYobGlzdEFbY2ldID09PSBsaXN0Qltjal0pe1xuICAgICAgICAgIGJyZWFrIG91dGVybG9vcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBpZihjaSA9PT0gbGkpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gW2NpLCBjal07XG4gIH1cbn1cbiIsInZhciBjYXJDb25zdHJ1Y3QgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XG5cbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XG5cbnZhciBzY2hlbWEgPSBjYXJDb25zdHJ1Y3QuZ2VuZXJhdGVTY2hlbWEoY2FyQ29uc3RhbnRzKTtcbnZhciBwaWNrUGFyZW50ID0gcmVxdWlyZShcIi4vcGlja1BhcmVudFwiKTtcbnZhciBzZWxlY3RGcm9tQWxsUGFyZW50cyA9IHJlcXVpcmUoXCIuL3NlbGVjdEZyb21BbGxQYXJlbnRzXCIpO1xuY29uc3QgY29uc3RhbnRzID0ge1xuICBnZW5lcmF0aW9uU2l6ZTogMjAsXG4gIHNjaGVtYTogc2NoZW1hLFxuICBjaGFtcGlvbkxlbmd0aDogMSxcbiAgbXV0YXRpb25fcmFuZ2U6IDEsXG4gIGdlbl9tdXRhdGlvbjogMC4wNSxcbn07XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBjdXJyZW50Q2hvaWNlcyA9IG5ldyBNYXAoKTtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXG4gICAge30sXG4gICAgY29uc3RhbnRzLFxuICAgIHtcbiAgICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzOiBzZWxlY3RGcm9tQWxsUGFyZW50cyxcbiAgICAgIGdlbmVyYXRlUmFuZG9tOiByZXF1aXJlKFwiLi9nZW5lcmF0ZVJhbmRvbVwiKSxcbiAgICAgIHBpY2tQYXJlbnQ6IHBpY2tQYXJlbnQuYmluZCh2b2lkIDAsIGN1cnJlbnRDaG9pY2VzKSxcbiAgICB9XG4gICk7XG59XG5tb2R1bGUuZXhwb3J0cy5jb25zdGFudHMgPSBjb25zdGFudHNcbiIsInZhciBuQXR0cmlidXRlcyA9IDE1O1xubW9kdWxlLmV4cG9ydHMgPSBwaWNrUGFyZW50O1xuXG5mdW5jdGlvbiBwaWNrUGFyZW50KGN1cnJlbnRDaG9pY2VzLCBjaG9vc2VJZCwga2V5IC8qICwgcGFyZW50cyAqLyl7XG4gIGlmKCFjdXJyZW50Q2hvaWNlcy5oYXMoY2hvb3NlSWQpKXtcbiAgICBjdXJyZW50Q2hvaWNlcy5zZXQoY2hvb3NlSWQsIGluaXRpYWxpemVQaWNrKCkpXG4gIH1cbiAgLy8gY29uc29sZS5sb2coY2hvb3NlSWQpO1xuICB2YXIgc3RhdGUgPSBjdXJyZW50Q2hvaWNlcy5nZXQoY2hvb3NlSWQpO1xuICAvLyBjb25zb2xlLmxvZyhzdGF0ZS5jdXJwYXJlbnQpO1xuICBzdGF0ZS5pKytcbiAgaWYoW1wid2hlZWxfcmFkaXVzXCIsIFwid2hlZWxfdmVydGV4XCIsIFwid2hlZWxfZGVuc2l0eVwiXS5pbmRleE9mKGtleSkgPiAtMSl7XG4gICAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcbiAgICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xuICB9XG4gIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XG4gIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XG5cbiAgZnVuY3Rpb24gY3dfY2hvb3NlUGFyZW50KHN0YXRlKSB7XG4gICAgdmFyIGN1cnBhcmVudCA9IHN0YXRlLmN1cnBhcmVudDtcbiAgICB2YXIgYXR0cmlidXRlSW5kZXggPSBzdGF0ZS5pO1xuICAgIHZhciBzd2FwUG9pbnQxID0gc3RhdGUuc3dhcFBvaW50MVxuICAgIHZhciBzd2FwUG9pbnQyID0gc3RhdGUuc3dhcFBvaW50MlxuICAgIC8vIGNvbnNvbGUubG9nKHN3YXBQb2ludDEsIHN3YXBQb2ludDIsIGF0dHJpYnV0ZUluZGV4KVxuICAgIGlmICgoc3dhcFBvaW50MSA9PSBhdHRyaWJ1dGVJbmRleCkgfHwgKHN3YXBQb2ludDIgPT0gYXR0cmlidXRlSW5kZXgpKSB7XG4gICAgICByZXR1cm4gY3VycGFyZW50ID09IDEgPyAwIDogMVxuICAgIH1cbiAgICByZXR1cm4gY3VycGFyZW50XG4gIH1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplUGljaygpe1xuICAgIHZhciBjdXJwYXJlbnQgPSAwO1xuXG4gICAgdmFyIHN3YXBQb2ludDEgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN3YXBQb2ludDE7XG4gICAgd2hpbGUgKHN3YXBQb2ludDIgPT0gc3dhcFBvaW50MSkge1xuICAgICAgc3dhcFBvaW50MiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcykpO1xuICAgIH1cbiAgICB2YXIgaSA9IDA7XG4gICAgcmV0dXJuIHtcbiAgICAgIGN1cnBhcmVudDogY3VycGFyZW50LFxuICAgICAgaTogaSxcbiAgICAgIHN3YXBQb2ludDE6IHN3YXBQb2ludDEsXG4gICAgICBzd2FwUG9pbnQyOiBzd2FwUG9pbnQyXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50ID0gcmVxdWlyZShcIi4vaW5icmVlZGluZy1jb2VmZmljaWVudFwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaW1wbGVTZWxlY3Q7XG5cbmZ1bmN0aW9uIHNpbXBsZVNlbGVjdChwYXJlbnRzKXtcbiAgdmFyIHRvdGFsUGFyZW50cyA9IHBhcmVudHMubGVuZ3RoXG4gIHZhciByID0gTWF0aC5yYW5kb20oKTtcbiAgaWYgKHIgPT0gMClcbiAgICByZXR1cm4gMDtcbiAgcmV0dXJuIE1hdGguZmxvb3IoLU1hdGgubG9nKHIpICogdG90YWxQYXJlbnRzKSAlIHRvdGFsUGFyZW50cztcbn1cblxuZnVuY3Rpb24gc2VsZWN0RnJvbUFsbFBhcmVudHMocGFyZW50cywgcGFyZW50TGlzdCwgcHJldmlvdXNQYXJlbnRJbmRleCkge1xuICB2YXIgcHJldmlvdXNQYXJlbnQgPSBwYXJlbnRzW3ByZXZpb3VzUGFyZW50SW5kZXhdO1xuICB2YXIgdmFsaWRQYXJlbnRzID0gcGFyZW50cy5maWx0ZXIoZnVuY3Rpb24ocGFyZW50LCBpKXtcbiAgICBpZihwcmV2aW91c1BhcmVudEluZGV4ID09PSBpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYoIXByZXZpb3VzUGFyZW50KXtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB2YXIgY2hpbGQgPSB7XG4gICAgICBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMiksXG4gICAgICBhbmNlc3RyeTogW3ByZXZpb3VzUGFyZW50LCBwYXJlbnRdLm1hcChmdW5jdGlvbihwKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogcC5kZWYuaWQsXG4gICAgICAgICAgYW5jZXN0cnk6IHAuZGVmLmFuY2VzdHJ5XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIHZhciBpQ28gPSBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQoY2hpbGQpO1xuICAgIGNvbnNvbGUubG9nKFwiaW5icmVlZGluZyBjb2VmZmljaWVudFwiLCBpQ28pXG4gICAgaWYoaUNvID4gMC4yNSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KVxuICBpZih2YWxpZFBhcmVudHMubGVuZ3RoID09PSAwKXtcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcGFyZW50cy5sZW5ndGgpXG4gIH1cbiAgdmFyIHRvdGFsU2NvcmUgPSB2YWxpZFBhcmVudHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcGFyZW50KXtcbiAgICByZXR1cm4gc3VtICsgcGFyZW50LnNjb3JlLnY7XG4gIH0sIDApO1xuICB2YXIgciA9IHRvdGFsU2NvcmUgKiBNYXRoLnJhbmRvbSgpO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgdmFsaWRQYXJlbnRzLmxlbmd0aDsgaSsrKXtcbiAgICB2YXIgc2NvcmUgPSB2YWxpZFBhcmVudHNbaV0uc2NvcmUudjtcbiAgICBpZihyID4gc2NvcmUpe1xuICAgICAgciA9IHIgLSBzY29yZTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBpO1xufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNhcikge1xuICB2YXIgb3V0ID0ge1xuICAgIGNoYXNzaXM6IGdob3N0X2dldF9jaGFzc2lzKGNhci5jaGFzc2lzKSxcbiAgICB3aGVlbHM6IFtdLFxuICAgIHBvczoge3g6IGNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCkueCwgeTogY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKS55fVxuICB9O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FyLndoZWVscy5sZW5ndGg7IGkrKykge1xuICAgIG91dC53aGVlbHNbaV0gPSBnaG9zdF9nZXRfd2hlZWwoY2FyLndoZWVsc1tpXSk7XG4gIH1cblxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBnaG9zdF9nZXRfY2hhc3NpcyhjKSB7XG4gIHZhciBnYyA9IFtdO1xuXG4gIGZvciAodmFyIGYgPSBjLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xuICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xuXG4gICAgdmFyIHAgPSB7XG4gICAgICB2dHg6IFtdLFxuICAgICAgbnVtOiAwXG4gICAgfVxuXG4gICAgcC5udW0gPSBzLm1fdmVydGV4Q291bnQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHMubV92ZXJ0ZXhDb3VudDsgaSsrKSB7XG4gICAgICBwLnZ0eC5wdXNoKGMuR2V0V29ybGRQb2ludChzLm1fdmVydGljZXNbaV0pKTtcbiAgICB9XG5cbiAgICBnYy5wdXNoKHApO1xuICB9XG5cbiAgcmV0dXJuIGdjO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9nZXRfd2hlZWwodykge1xuICB2YXIgZ3cgPSBbXTtcblxuICBmb3IgKHZhciBmID0gdy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcblxuICAgIHZhciBjID0ge1xuICAgICAgcG9zOiB3LkdldFdvcmxkUG9pbnQocy5tX3ApLFxuICAgICAgcmFkOiBzLm1fcmFkaXVzLFxuICAgICAgYW5nOiB3Lm1fc3dlZXAuYVxuICAgIH1cblxuICAgIGd3LnB1c2goYyk7XG4gIH1cblxuICByZXR1cm4gZ3c7XG59XG4iLCJcbnZhciBnaG9zdF9nZXRfZnJhbWUgPSByZXF1aXJlKFwiLi9jYXItdG8tZ2hvc3QuanNcIik7XG5cbnZhciBlbmFibGVfZ2hvc3QgPSB0cnVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2hvc3RfY3JlYXRlX3JlcGxheTogZ2hvc3RfY3JlYXRlX3JlcGxheSxcbiAgZ2hvc3RfY3JlYXRlX2dob3N0OiBnaG9zdF9jcmVhdGVfZ2hvc3QsXG4gIGdob3N0X3BhdXNlOiBnaG9zdF9wYXVzZSxcbiAgZ2hvc3RfcmVzdW1lOiBnaG9zdF9yZXN1bWUsXG4gIGdob3N0X2dldF9wb3NpdGlvbjogZ2hvc3RfZ2V0X3Bvc2l0aW9uLFxuICBnaG9zdF9jb21wYXJlX3RvX3JlcGxheTogZ2hvc3RfY29tcGFyZV90b19yZXBsYXksXG4gIGdob3N0X21vdmVfZnJhbWU6IGdob3N0X21vdmVfZnJhbWUsXG4gIGdob3N0X2FkZF9yZXBsYXlfZnJhbWU6IGdob3N0X2FkZF9yZXBsYXlfZnJhbWUsXG4gIGdob3N0X2RyYXdfZnJhbWU6IGdob3N0X2RyYXdfZnJhbWUsXG4gIGdob3N0X3Jlc2V0X2dob3N0OiBnaG9zdF9yZXNldF9naG9zdFxufVxuXG5mdW5jdGlvbiBnaG9zdF9jcmVhdGVfcmVwbGF5KCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIG51bV9mcmFtZXM6IDAsXG4gICAgZnJhbWVzOiBbXSxcbiAgfVxufVxuXG5mdW5jdGlvbiBnaG9zdF9jcmVhdGVfZ2hvc3QoKSB7XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7XG4gICAgcmVwbGF5OiBudWxsLFxuICAgIGZyYW1lOiAwLFxuICAgIGRpc3Q6IC0xMDBcbiAgfVxufVxuXG5mdW5jdGlvbiBnaG9zdF9yZXNldF9naG9zdChnaG9zdCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdCA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgZ2hvc3QuZnJhbWUgPSAwO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9wYXVzZShnaG9zdCkge1xuICBpZiAoZ2hvc3QgIT0gbnVsbClcbiAgICBnaG9zdC5vbGRfZnJhbWUgPSBnaG9zdC5mcmFtZTtcbiAgZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9yZXN1bWUoZ2hvc3QpIHtcbiAgaWYgKGdob3N0ICE9IG51bGwpXG4gICAgZ2hvc3QuZnJhbWUgPSBnaG9zdC5vbGRfZnJhbWU7XG59XG5cbmZ1bmN0aW9uIGdob3N0X2dldF9wb3NpdGlvbihnaG9zdCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdCA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0LmZyYW1lIDwgMClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIHZhciBmcmFtZSA9IGdob3N0LnJlcGxheS5mcmFtZXNbZ2hvc3QuZnJhbWVdO1xuICByZXR1cm4gZnJhbWUucG9zO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9jb21wYXJlX3RvX3JlcGxheShyZXBsYXksIGdob3N0LCBtYXgpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChyZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgaWYgKGdob3N0LmRpc3QgPCBtYXgpIHtcbiAgICBnaG9zdC5yZXBsYXkgPSByZXBsYXk7XG4gICAgZ2hvc3QuZGlzdCA9IG1heDtcbiAgICBnaG9zdC5mcmFtZSA9IDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdCA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0LnJlcGxheSA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgZ2hvc3QuZnJhbWUrKztcbiAgaWYgKGdob3N0LmZyYW1lID49IGdob3N0LnJlcGxheS5udW1fZnJhbWVzKVxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3QucmVwbGF5Lm51bV9mcmFtZXMgLSAxO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKHJlcGxheSwgY2FyKSB7XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKHJlcGxheSA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgZnJhbWUgPSBnaG9zdF9nZXRfZnJhbWUoY2FyKTtcbiAgcmVwbGF5LmZyYW1lcy5wdXNoKGZyYW1lKTtcbiAgcmVwbGF5Lm51bV9mcmFtZXMrKztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0LCBjYW1lcmEpIHtcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5mcmFtZSA8IDApXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIHZhciBmcmFtZSA9IGdob3N0LnJlcGxheS5mcmFtZXNbZ2hvc3QuZnJhbWVdO1xuXG4gIC8vIHdoZWVsIHN0eWxlXG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjYWFhXCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGZyYW1lLndoZWVscy5sZW5ndGg7IGkrKykge1xuICAgIGZvciAodmFyIHcgaW4gZnJhbWUud2hlZWxzW2ldKSB7XG4gICAgICBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGZyYW1lLndoZWVsc1tpXVt3XS5wb3MsIGZyYW1lLndoZWVsc1tpXVt3XS5yYWQsIGZyYW1lLndoZWVsc1tpXVt3XS5hbmcpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNoYXNzaXMgc3R5bGVcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjYWFhXCI7XG4gIGN0eC5maWxsU3R5bGUgPSBcIiNlZWVcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xuICBjdHguYmVnaW5QYXRoKCk7XG4gIGZvciAodmFyIGMgaW4gZnJhbWUuY2hhc3NpcylcbiAgICBnaG9zdF9kcmF3X3BvbHkoY3R4LCBmcmFtZS5jaGFzc2lzW2NdLnZ0eCwgZnJhbWUuY2hhc3Npc1tjXS5udW0pO1xuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGdob3N0X2RyYXdfcG9seShjdHgsIHZ0eCwgbl92dHgpIHtcbiAgY3R4Lm1vdmVUbyh2dHhbMF0ueCwgdnR4WzBdLnkpO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcbiAgICBjdHgubGluZVRvKHZ0eFtpXS54LCB2dHhbaV0ueSk7XG4gIH1cbiAgY3R4LmxpbmVUbyh2dHhbMF0ueCwgdnR4WzBdLnkpO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGNlbnRlciwgcmFkaXVzLCBhbmdsZSkge1xuICBjdHguYmVnaW5QYXRoKCk7XG4gIGN0eC5hcmMoY2VudGVyLngsIGNlbnRlci55LCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcblxuICBjdHgubW92ZVRvKGNlbnRlci54LCBjZW50ZXIueSk7XG4gIGN0eC5saW5lVG8oY2VudGVyLnggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSksIGNlbnRlci55ICsgcmFkaXVzICogTWF0aC5zaW4oYW5nbGUpKTtcblxuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlKCk7XG59XG4iLCIvKiBnbG9iYWxzIGRvY3VtZW50IHBlcmZvcm1hbmNlIGxvY2FsU3RvcmFnZSBhbGVydCBjb25maXJtIGJ0b2EgSFRNTERpdkVsZW1lbnQgKi9cbi8qIGdsb2JhbHMgYjJWZWMyICovXG4vLyBHbG9iYWwgVmFyc1xuXG52YXIgd29ybGRSdW4gPSByZXF1aXJlKFwiLi93b3JsZC9ydW4uanNcIik7XG52YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XG5cbnZhciBtYW5hZ2VSb3VuZCA9IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzXCIpO1xuXG52YXIgZ2hvc3RfZm5zID0gcmVxdWlyZShcIi4vZ2hvc3QvaW5kZXguanNcIik7XG5cbnZhciBkcmF3Q2FyID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWNhci5qc1wiKTtcbnZhciBncmFwaF9mbnMgPSByZXF1aXJlKFwiLi9kcmF3L3Bsb3QtZ3JhcGhzLmpzXCIpO1xudmFyIHBsb3RfZ3JhcGhzID0gZ3JhcGhfZm5zLnBsb3RHcmFwaHM7XG52YXIgY3dfY2xlYXJHcmFwaGljcyA9IGdyYXBoX2Zucy5jbGVhckdyYXBoaWNzO1xudmFyIGN3X2RyYXdGbG9vciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1mbG9vci5qc1wiKTtcblxudmFyIGdob3N0X2RyYXdfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfZHJhd19mcmFtZTtcbnZhciBnaG9zdF9jcmVhdGVfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX2dob3N0O1xudmFyIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfYWRkX3JlcGxheV9mcmFtZTtcbnZhciBnaG9zdF9jb21wYXJlX3RvX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jb21wYXJlX3RvX3JlcGxheTtcbnZhciBnaG9zdF9nZXRfcG9zaXRpb24gPSBnaG9zdF9mbnMuZ2hvc3RfZ2V0X3Bvc2l0aW9uO1xudmFyIGdob3N0X21vdmVfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfbW92ZV9mcmFtZTtcbnZhciBnaG9zdF9yZXNldF9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9yZXNldF9naG9zdFxudmFyIGdob3N0X3BhdXNlID0gZ2hvc3RfZm5zLmdob3N0X3BhdXNlO1xudmFyIGdob3N0X3Jlc3VtZSA9IGdob3N0X2Zucy5naG9zdF9yZXN1bWU7XG52YXIgZ2hvc3RfY3JlYXRlX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfcmVwbGF5O1xuXG52YXIgY3dfQ2FyID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWNhci1zdGF0cy5qc1wiKTtcbnZhciBnaG9zdDtcbnZhciBjYXJNYXAgPSBuZXcgTWFwKCk7XG5cbnZhciBkb0RyYXcgPSB0cnVlO1xudmFyIGN3X3BhdXNlZCA9IGZhbHNlO1xuXG52YXIgYm94MmRmcHMgPSA2MDtcbnZhciBzY3JlZW5mcHMgPSA2MDtcbnZhciBza2lwVGlja3MgPSBNYXRoLnJvdW5kKDEwMDAgLyBib3gyZGZwcyk7XG52YXIgbWF4RnJhbWVTa2lwID0gc2tpcFRpY2tzICogMjtcblxudmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpbmJveFwiKTtcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG52YXIgY2FtZXJhID0ge1xuICBzcGVlZDogMC4wNSxcbiAgcG9zOiB7XG4gICAgeDogMCwgeTogMFxuICB9LFxuICB0YXJnZXQ6IC0xLFxuICB6b29tOiA3MFxufVxuXG52YXIgbWluaW1hcGNhbWVyYSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGNhbWVyYVwiKS5zdHlsZTtcbnZhciBtaW5pbWFwaG9sZGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtaW5pbWFwaG9sZGVyXCIpO1xuXG52YXIgbWluaW1hcGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcFwiKTtcbnZhciBtaW5pbWFwY3R4ID0gbWluaW1hcGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG52YXIgbWluaW1hcHNjYWxlID0gMztcbnZhciBtaW5pbWFwZm9nZGlzdGFuY2UgPSAwO1xudmFyIGZvZ2Rpc3RhbmNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwZm9nXCIpLnN0eWxlO1xuXG5cbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XG5cblxudmFyIG1heF9jYXJfaGVhbHRoID0gYm94MmRmcHMgKiAxMDtcblxudmFyIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBudWxsO1xuXG52YXIgZGlzdGFuY2VNZXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGlzdGFuY2VtZXRlclwiKTtcbnZhciBoZWlnaHRNZXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVpZ2h0bWV0ZXJcIik7XG5cbnZhciBsZWFkZXJQb3NpdGlvbiA9IHtcbiAgeDogMCwgeTogMFxufVxuXG5taW5pbWFwY2FtZXJhLndpZHRoID0gMTIgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XG5taW5pbWFwY2FtZXJhLmhlaWdodCA9IDYgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XG5cblxuLy8gPT09PT09PSBXT1JMRCBTVEFURSA9PT09PT1cbnZhciBnZW5lcmF0aW9uQ29uZmlnID0gcmVxdWlyZShcIi4vZ2VuZXJhdGlvbi1jb25maWdcIik7XG5cblxudmFyIHdvcmxkX2RlZiA9IHtcbiAgZ3Jhdml0eTogbmV3IGIyVmVjMigwLjAsIC05LjgxKSxcbiAgZG9TbGVlcDogdHJ1ZSxcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcbiAgdGlsZURpbWVuc2lvbnM6IG5ldyBiMlZlYzIoMS41LCAwLjE1KSxcbiAgbWF4Rmxvb3JUaWxlczogMjAwLFxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcbiAgYm94MmRmcHM6IGJveDJkZnBzLFxuICBtb3RvclNwZWVkOiAyMCxcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxuICBzY2hlbWE6IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLnNjaGVtYVxufVxuXG52YXIgY3dfZGVhZENhcnM7XG52YXIgZ3JhcGhTdGF0ZSA9IHtcbiAgY3dfdG9wU2NvcmVzOiBbXSxcbiAgY3dfZ3JhcGhBdmVyYWdlOiBbXSxcbiAgY3dfZ3JhcGhFbGl0ZTogW10sXG4gIGN3X2dyYXBoVG9wOiBbXSxcbn07XG5cbmZ1bmN0aW9uIHJlc2V0R3JhcGhTdGF0ZSgpe1xuICBncmFwaFN0YXRlID0ge1xuICAgIGN3X3RvcFNjb3JlczogW10sXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiBbXSxcbiAgICBjd19ncmFwaEVsaXRlOiBbXSxcbiAgICBjd19ncmFwaFRvcDogW10sXG4gIH07XG59XG5cblxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG52YXIgZ2VuZXJhdGlvblN0YXRlO1xuXG4vLyA9PT09PT09PSBBY3Rpdml0eSBTdGF0ZSA9PT09XG52YXIgY3VycmVudFJ1bm5lcjtcbnZhciBsb29wcyA9IDA7XG52YXIgbmV4dEdhbWVUaWNrID0gKG5ldyBEYXRlKS5nZXRUaW1lKCk7XG5cbmZ1bmN0aW9uIHNob3dEaXN0YW5jZShkaXN0YW5jZSwgaGVpZ2h0KSB7XG4gIGRpc3RhbmNlTWV0ZXIuaW5uZXJIVE1MID0gZGlzdGFuY2UgKyBcIiBtZXRlcnM8YnIgLz5cIjtcbiAgaGVpZ2h0TWV0ZXIuaW5uZXJIVE1MID0gaGVpZ2h0ICsgXCIgbWV0ZXJzXCI7XG4gIGlmIChkaXN0YW5jZSA+IG1pbmltYXBmb2dkaXN0YW5jZSkge1xuICAgIGZvZ2Rpc3RhbmNlLndpZHRoID0gODAwIC0gTWF0aC5yb3VuZChkaXN0YW5jZSArIDE1KSAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcbiAgICBtaW5pbWFwZm9nZGlzdGFuY2UgPSBkaXN0YW5jZTtcbiAgfVxufVxuXG5cblxuLyogPT09IEVORCBDYXIgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qID09PT0gR2VuZXJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuZnVuY3Rpb24gY3dfZ2VuZXJhdGlvblplcm8oKSB7XG5cbiAgZ2VuZXJhdGlvblN0YXRlID0gbWFuYWdlUm91bmQuZ2VuZXJhdGlvblplcm8oZ2VuZXJhdGlvbkNvbmZpZygpKTtcbn1cblxuZnVuY3Rpb24gcmVzZXRDYXJVSSgpe1xuICBjd19kZWFkQ2FycyA9IDA7XG4gIGxlYWRlclBvc2l0aW9uID0ge1xuICAgIHg6IDAsIHk6IDBcbiAgfTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyLnRvU3RyaW5nKCk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemUudG9TdHJpbmcoKTtcbn1cblxuLyogPT09PSBFTkQgR2VucmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKiA9PT09IERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmZ1bmN0aW9uIGN3X2RyYXdTY3JlZW4oKSB7XG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xuICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gIGN0eC5zYXZlKCk7XG4gIGN3X3NldENhbWVyYVBvc2l0aW9uKCk7XG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55O1xuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xuICBjdHgudHJhbnNsYXRlKDIwMCAtIChjYW1lcmFfeCAqIHpvb20pLCAyMDAgKyAoY2FtZXJhX3kgKiB6b29tKSk7XG4gIGN0eC5zY2FsZSh6b29tLCAtem9vbSk7XG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgZmxvb3JUaWxlcyk7XG4gIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKTtcbiAgY3dfZHJhd0NhcnMoKTtcbiAgY3R4LnJlc3RvcmUoKTtcbn1cblxuZnVuY3Rpb24gY3dfbWluaW1hcENhbWVyYSgvKiB4LCB5Ki8pIHtcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54XG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueVxuICBtaW5pbWFwY2FtZXJhLmxlZnQgPSBNYXRoLnJvdW5kKCgyICsgY2FtZXJhX3gpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcbiAgbWluaW1hcGNhbWVyYS50b3AgPSBNYXRoLnJvdW5kKCgzMSAtIGNhbWVyYV95KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XG59XG5cbmZ1bmN0aW9uIGN3X3NldENhbWVyYVRhcmdldChrKSB7XG4gIGNhbWVyYS50YXJnZXQgPSBrO1xufVxuXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFQb3NpdGlvbigpIHtcbiAgdmFyIGNhbWVyYVRhcmdldFBvc2l0aW9uXG4gIGlmIChjYW1lcmEudGFyZ2V0ICE9PSAtMSkge1xuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gY2FyTWFwLmdldChjYW1lcmEudGFyZ2V0KS5nZXRQb3NpdGlvbigpO1xuICB9IGVsc2Uge1xuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gbGVhZGVyUG9zaXRpb247XG4gIH1cbiAgdmFyIGRpZmZfeSA9IGNhbWVyYS5wb3MueSAtIGNhbWVyYVRhcmdldFBvc2l0aW9uLnk7XG4gIHZhciBkaWZmX3ggPSBjYW1lcmEucG9zLnggLSBjYW1lcmFUYXJnZXRQb3NpdGlvbi54O1xuICBjYW1lcmEucG9zLnkgLT0gY2FtZXJhLnNwZWVkICogZGlmZl95O1xuICBjYW1lcmEucG9zLnggLT0gY2FtZXJhLnNwZWVkICogZGlmZl94O1xuICBjd19taW5pbWFwQ2FtZXJhKGNhbWVyYS5wb3MueCwgY2FtZXJhLnBvcy55KTtcbn1cblxuZnVuY3Rpb24gY3dfZHJhd0dob3N0UmVwbGF5KCkge1xuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcbiAgdmFyIGNhclBvc2l0aW9uID0gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KTtcbiAgY2FtZXJhLnBvcy54ID0gY2FyUG9zaXRpb24ueDtcbiAgY2FtZXJhLnBvcy55ID0gY2FyUG9zaXRpb24ueTtcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XG4gIHNob3dEaXN0YW5jZShcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxuICAgIE1hdGgucm91bmQoY2FyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcbiAgKTtcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICBjdHguc2F2ZSgpO1xuICBjdHgudHJhbnNsYXRlKFxuICAgIDIwMCAtIChjYXJQb3NpdGlvbi54ICogY2FtZXJhLnpvb20pLFxuICAgIDIwMCArIChjYXJQb3NpdGlvbi55ICogY2FtZXJhLnpvb20pXG4gICk7XG4gIGN0eC5zY2FsZShjYW1lcmEuem9vbSwgLWNhbWVyYS56b29tKTtcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0KTtcbiAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgZmxvb3JUaWxlcyk7XG4gIGN0eC5yZXN0b3JlKCk7XG59XG5cblxuZnVuY3Rpb24gY3dfZHJhd0NhcnMoKSB7XG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcbiAgZm9yICh2YXIgayA9IChjd19jYXJBcnJheS5sZW5ndGggLSAxKTsgayA+PSAwOyBrLS0pIHtcbiAgICB2YXIgbXlDYXIgPSBjd19jYXJBcnJheVtrXTtcbiAgICBkcmF3Q2FyKGNhckNvbnN0YW50cywgbXlDYXIsIGNhbWVyYSwgY3R4KVxuICB9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZURpc3BsYXkoKSB7XG4gIGNhbnZhcy53aWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgaWYgKGRvRHJhdykge1xuICAgIGRvRHJhdyA9IGZhbHNlO1xuICAgIGN3X3N0b3BTaW11bGF0aW9uKCk7XG4gICAgY3dfcnVubmluZ0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSArICgxMDAwIC8gc2NyZWVuZnBzKTtcbiAgICAgIHdoaWxlICh0aW1lID4gcGVyZm9ybWFuY2Uubm93KCkpIHtcbiAgICAgICAgc2ltdWxhdGlvblN0ZXAoKTtcbiAgICAgIH1cbiAgICB9LCAxKTtcbiAgfSBlbHNlIHtcbiAgICBkb0RyYXcgPSB0cnVlO1xuICAgIGNsZWFySW50ZXJ2YWwoY3dfcnVubmluZ0ludGVydmFsKTtcbiAgICBjd19zdGFydFNpbXVsYXRpb24oKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19kcmF3TWluaU1hcCgpIHtcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xuICBtaW5pbWFwZm9nZGlzdGFuY2UgPSAwO1xuICBmb2dkaXN0YW5jZS53aWR0aCA9IFwiODAwcHhcIjtcbiAgbWluaW1hcGNhbnZhcy53aWR0aCA9IG1pbmltYXBjYW52YXMud2lkdGg7XG4gIG1pbmltYXBjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgbWluaW1hcGN0eC5iZWdpblBhdGgoKTtcbiAgbWluaW1hcGN0eC5tb3ZlVG8oMCwgMzUgKiBtaW5pbWFwc2NhbGUpO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGZsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcbiAgICBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW2tdO1xuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcbiAgICB2YXIgbGFzdF93b3JsZF9jb29yZHMgPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF93b3JsZF9jb29yZHM7XG4gICAgbWluaW1hcGN0eC5saW5lVG8oKHRpbGVfcG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlLCAoLXRpbGVfcG9zaXRpb24ueSArIDM1KSAqIG1pbmltYXBzY2FsZSk7XG4gIH1cbiAgbWluaW1hcGN0eC5zdHJva2UoKTtcbn1cblxuLyogPT09PSBFTkQgRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xudmFyIHVpTGlzdGVuZXJzID0ge1xuICBwcmVDYXJTdGVwOiBmdW5jdGlvbigpe1xuICAgIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xuICB9LFxuICBjYXJTdGVwKGNhcil7XG4gICAgdXBkYXRlQ2FyVUkoY2FyKTtcbiAgfSxcbiAgY2FyRGVhdGgoY2FySW5mbyl7XG5cbiAgICB2YXIgayA9IGNhckluZm8uaW5kZXg7XG5cbiAgICB2YXIgY2FyID0gY2FySW5mby5jYXIsIHNjb3JlID0gY2FySW5mby5zY29yZTtcbiAgICBjYXJNYXAuZ2V0KGNhckluZm8pLmtpbGwoY3VycmVudFJ1bm5lciwgd29ybGRfZGVmKTtcblxuICAgIC8vIHJlZm9jdXMgY2FtZXJhIHRvIGxlYWRlciBvbiBkZWF0aFxuICAgIGlmIChjYW1lcmEudGFyZ2V0ID09IGNhckluZm8pIHtcbiAgICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKHNjb3JlKTtcbiAgICBjYXJNYXAuZGVsZXRlKGNhckluZm8pO1xuICAgIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5KGNhci5yZXBsYXksIGdob3N0LCBzY29yZS52KTtcbiAgICBzY29yZS5pID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XG5cbiAgICBjd19kZWFkQ2FycysrO1xuICAgIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wdWxhdGlvblwiKS5pbm5lckhUTUwgPSAoZ2VuZXJhdGlvblNpemUgLSBjd19kZWFkQ2FycykudG9TdHJpbmcoKTtcblxuICAgIC8vIGNvbnNvbGUubG9nKGxlYWRlclBvc2l0aW9uLmxlYWRlciwgaylcbiAgICBpZiAobGVhZGVyUG9zaXRpb24ubGVhZGVyID09IGspIHtcbiAgICAgIC8vIGxlYWRlciBpcyBkZWFkLCBmaW5kIG5ldyBsZWFkZXJcbiAgICAgIGN3X2ZpbmRMZWFkZXIoKTtcbiAgICB9XG4gIH0sXG4gIGdlbmVyYXRpb25FbmQocmVzdWx0cyl7XG4gICAgY2xlYW51cFJvdW5kKHJlc3VsdHMpO1xuICAgIHJldHVybiBjd19uZXdSb3VuZChyZXN1bHRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaW11bGF0aW9uU3RlcCgpIHsgIFxuICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcbiAgc2hvd0Rpc3RhbmNlKFxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueCAqIDEwMCkgLyAxMDAsXG4gICAgTWF0aC5yb3VuZChsZWFkZXJQb3NpdGlvbi55ICogMTAwKSAvIDEwMFxuICApO1xufVxuXG5mdW5jdGlvbiBnYW1lTG9vcCgpIHtcbiAgbG9vcHMgPSAwO1xuICB3aGlsZSAoIWN3X3BhdXNlZCAmJiAobmV3IERhdGUpLmdldFRpbWUoKSA+IG5leHRHYW1lVGljayAmJiBsb29wcyA8IG1heEZyYW1lU2tpcCkgeyAgIFxuICAgIG5leHRHYW1lVGljayArPSBza2lwVGlja3M7XG4gICAgbG9vcHMrKztcbiAgfVxuICBzaW11bGF0aW9uU3RlcCgpO1xuICBjd19kcmF3U2NyZWVuKCk7XG5cbiAgaWYoIWN3X3BhdXNlZCkgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUNhclVJKGNhckluZm8pe1xuICB2YXIgayA9IGNhckluZm8uaW5kZXg7XG4gIHZhciBjYXIgPSBjYXJNYXAuZ2V0KGNhckluZm8pO1xuICB2YXIgcG9zaXRpb24gPSBjYXIuZ2V0UG9zaXRpb24oKTtcblxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcbiAgY2FyLm1pbmltYXBtYXJrZXIuc3R5bGUubGVmdCA9IE1hdGgucm91bmQoKHBvc2l0aW9uLnggKyA1KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XG4gIGNhci5oZWFsdGhCYXIud2lkdGggPSBNYXRoLnJvdW5kKChjYXIuY2FyLnN0YXRlLmhlYWx0aCAvIG1heF9jYXJfaGVhbHRoKSAqIDEwMCkgKyBcIiVcIjtcbiAgaWYgKHBvc2l0aW9uLnggPiBsZWFkZXJQb3NpdGlvbi54KSB7XG4gICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICBsZWFkZXJQb3NpdGlvbi5sZWFkZXIgPSBrO1xuICAgIC8vIGNvbnNvbGUubG9nKFwibmV3IGxlYWRlcjogXCIsIGspO1xuICB9XG59XG5cbmZ1bmN0aW9uIGN3X2ZpbmRMZWFkZXIoKSB7XG4gIHZhciBsZWFkID0gMDtcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGN3X2NhckFycmF5Lmxlbmd0aDsgaysrKSB7XG4gICAgaWYgKCFjd19jYXJBcnJheVtrXS5hbGl2ZSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHZhciBwb3NpdGlvbiA9IGN3X2NhckFycmF5W2tdLmdldFBvc2l0aW9uKCk7XG4gICAgaWYgKHBvc2l0aW9uLnggPiBsZWFkKSB7XG4gICAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmFzdEZvcndhcmQoKXtcbiAgdmFyIGdlbiA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xuICB3aGlsZShnZW4gPT09IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyKXtcbiAgICBjdXJyZW50UnVubmVyLnN0ZXAoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhbnVwUm91bmQocmVzdWx0cyl7XG5cbiAgcmVzdWx0cy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgaWYgKGEuc2NvcmUudiA+IGIuc2NvcmUudikge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAxXG4gICAgfVxuICB9KVxuICBncmFwaFN0YXRlID0gcGxvdF9ncmFwaHMoXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJncmFwaGNhbnZhc1wiKSxcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcHNjb3Jlc1wiKSxcbiAgICBudWxsLFxuICAgIGdyYXBoU3RhdGUsXG4gICAgcmVzdWx0c1xuICApO1xufVxuXG5mdW5jdGlvbiBjd19uZXdSb3VuZChyZXN1bHRzKSB7XG4gIGNhbWVyYS5wb3MueCA9IGNhbWVyYS5wb3MueSA9IDA7XG4gIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XG5cbiAgZ2VuZXJhdGlvblN0YXRlID0gbWFuYWdlUm91bmQubmV4dEdlbmVyYXRpb24oXG4gICAgZ2VuZXJhdGlvblN0YXRlLCByZXN1bHRzLCBnZW5lcmF0aW9uQ29uZmlnKClcbiAgKTtcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XG4gICAgLy8gR0hPU1QgRElTQUJMRURcbiAgICBnaG9zdCA9IG51bGw7XG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xuICB9IGVsc2Uge1xuICAgIC8vIFJFLUVOQUJMRSBHSE9TVFxuICAgIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcbiAgfVxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xuICBzZXR1cENhclVJKCk7XG4gIGN3X2RyYXdNaW5pTWFwKCk7XG4gIHJlc2V0Q2FyVUkoKTtcbn1cblxuZnVuY3Rpb24gY3dfc3RhcnRTaW11bGF0aW9uKCkge1xuICBjd19wYXVzZWQgPSBmYWxzZTtcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XG59XG5cbmZ1bmN0aW9uIGN3X3N0b3BTaW11bGF0aW9uKCkge1xuICBjd19wYXVzZWQgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBjd19jbGVhclBvcHVsYXRpb25Xb3JsZCgpIHtcbiAgY2FyTWFwLmZvckVhY2goZnVuY3Rpb24oY2FyKXtcbiAgICBjYXIua2lsbChjdXJyZW50UnVubmVyLCB3b3JsZF9kZWYpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uVUkoKSB7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBcIlwiO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgY3dfY2xlYXJHcmFwaGljcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpKTtcbiAgcmVzZXRHcmFwaFN0YXRlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Jlc2V0V29ybGQoKSB7XG4gIGRvRHJhdyA9IHRydWU7XG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ld3NlZWRcIikudmFsdWU7XG4gIGN3X2NsZWFyUG9wdWxhdGlvbldvcmxkKCk7XG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCk7XG5cbiAgTWF0aC5zZWVkcmFuZG9tKCk7XG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bihcbiAgICB3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVyc1xuICApO1xuXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XG4gIHJlc2V0Q2FyVUkoKTtcbiAgc2V0dXBDYXJVSSgpXG4gIGN3X2RyYXdNaW5pTWFwKCk7XG5cbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ2FyVUkoKXtcbiAgY3VycmVudFJ1bm5lci5jYXJzLm1hcChmdW5jdGlvbihjYXJJbmZvKXtcbiAgICB2YXIgY2FyID0gbmV3IGN3X0NhcihjYXJJbmZvLCBjYXJNYXApO1xuICAgIGNhck1hcC5zZXQoY2FySW5mbywgY2FyKTtcbiAgICBjYXIucmVwbGF5ID0gZ2hvc3RfY3JlYXRlX3JlcGxheSgpO1xuICAgIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUoY2FyLnJlcGxheSwgY2FyLmNhci5jYXIpO1xuICB9KVxufVxuXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmFzdC1mb3J3YXJkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBmYXN0Rm9yd2FyZCgpXG59KTtcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNzYXZlLXByb2dyZXNzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBzYXZlUHJvZ3Jlc3MoKVxufSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjcmVzdG9yZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgcmVzdG9yZVByb2dyZXNzKClcbn0pO1xuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1kaXNwbGF5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICB0b2dnbGVEaXNwbGF5KClcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbmV3LXBvcHVsYXRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKClcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcbiAgcmVzZXRDYXJVSSgpO1xufSlcblxuYXN5bmMgZnVuY3Rpb24gc2F2ZVByb2dyZXNzKCkge1xuICBjd19zdG9wU2ltdWxhdGlvbigpO1xuXG4gIHByb2dyZXNzID0ge1xuICAgIGdlbmVyYXRpb246IGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLFxuICAgIGdlbkNvdW50ZXI6IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyLFxuICAgIGdob3N0OiBnaG9zdCxcbiAgICB0b3BTY29yZXM6IGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzLFxuICAgIGZsb29yU2VlZDogd29ybGRfZGVmLmZsb29yc2VlZFxuICB9XG5cbiAgdmFyIHByb2dyZXNzQmxvYiA9IG5ldyBCbG9iKFtKU09OLnN0cmluZ2lmeShwcm9ncmVzcyldLCB7XG4gICAgdHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gIH0pO1xuXG4gIGNvbnN0IG5ld0hhbmRsZSA9IGF3YWl0IHdpbmRvdy5zaG93U2F2ZUZpbGVQaWNrZXIoKTtcbiAgY29uc3Qgd3JpdGFibGVTdHJlYW0gPSBhd2FpdCBuZXdIYW5kbGUuY3JlYXRlV3JpdGFibGUoKTtcbiAgYXdhaXQgd3JpdGFibGVTdHJlYW0ud3JpdGUocHJvZ3Jlc3NCbG9iKTtcbiAgYXdhaXQgd3JpdGFibGVTdHJlYW0uY2xvc2UoKTtcblxuICBjd19zdGFydFNpbXVsYXRpb24oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVzdG9yZVByb2dyZXNzKCkge1xuICBjb25zdCBwaWNrZXJPcHRzID0ge1xuICAgIHR5cGVzOiBbXG4gICAgICB7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBcIkpTT05cIixcbiAgICAgICAgYWNjZXB0OiB7XG4gICAgICAgICAgXCJhcHBsaWNhdGlvbi9qc29uXCI6IFtcIi5qc29uXCJdLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdLFxuICAgIGV4Y2x1ZGVBY2NlcHRBbGxPcHRpb246IHRydWUsXG4gICAgbXVsdGlwbGU6IGZhbHNlLFxuICB9O1xuICBjb25zdCBbZmlsZUhhbmRsZV0gPSBhd2FpdCB3aW5kb3cuc2hvd09wZW5GaWxlUGlja2VyKHBpY2tlck9wdHMpO1xuICBjb25zdCBwcm9ncmVzc0ZpbGUgPSBhd2FpdCBmaWxlSGFuZGxlLmdldEZpbGUoKTtcbiAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgcmVhZGVyLnJlYWRBc1RleHQocHJvZ3Jlc3NGaWxlKVxuICBcbiAgcmVhZGVyLm9ubG9hZGVuZCA9ICgpID0+IHtcbiAgICB2YXIgZGF0YSA9IHJlYWRlci5yZXN1bHRcbiAgICB2YXIgcHJvZ3Jlc3MgPSBKU09OLnBhcnNlKGRhdGEpO1xuXG4gICAgY3dfc3RvcFNpbXVsYXRpb24oKTtcblxuICAgIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uID0gcHJvZ3Jlc3MuZ2VuZXJhdGlvbjtcbiAgICBnZW5lcmF0aW9uU3RhdGUuY291bnRlciA9IE51bWJlcihwcm9ncmVzcy5nZW5Db3VudGVyKTtcblxuICAgIGdob3N0ID0gcHJvZ3Jlc3MuZ2hvc3Q7XG5cbiAgICBncmFwaFN0YXRlLmN3X3RvcFNjb3JlcyA9IHByb2dyZXNzLnRvcFNjb3JlcztcblxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBwcm9ncmVzcy5mbG9vclNlZWQ7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlID0gd29ybGRfZGVmLmZsb29yc2VlZDtcblxuICAgIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XG4gICAgTWF0aC5zZWVkcmFuZG9tKCk7XG4gICAgY3dfY2xlYXJQb3B1bGF0aW9uV29ybGQoKTtcbiAgICByZXNldENhclVJKCk7XG4gICAgc2V0dXBDYXJVSSgpO1xuICAgIGN3X2RyYXdNaW5pTWFwKCk7XG4gICAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XG4gIH07XG59XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY29uZmlybS1yZXNldFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgY3dfY29uZmlybVJlc2V0V29ybGQoKVxufSlcblxuZnVuY3Rpb24gY3dfY29uZmlybVJlc2V0V29ybGQoKSB7XG4gIGlmIChjb25maXJtKCdSZWFsbHkgcmVzZXQgd29ybGQ/JykpIHtcbiAgICBjd19yZXNldFdvcmxkKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8vIGdob3N0IHJlcGxheSBzdHVmZlxuXG5cbmZ1bmN0aW9uIGN3X3BhdXNlU2ltdWxhdGlvbigpIHtcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcbiAgZ2hvc3RfcGF1c2UoZ2hvc3QpO1xufVxuXG5mdW5jdGlvbiBjd19yZXN1bWVTaW11bGF0aW9uKCkge1xuICBjd19wYXVzZWQgPSBmYWxzZTtcbiAgZ2hvc3RfcmVzdW1lKGdob3N0KTtcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XG59XG5cbmZ1bmN0aW9uIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKSB7XG4gIGlmICghZG9EcmF3KSB7XG4gICAgdG9nZ2xlRGlzcGxheSgpO1xuICB9XG4gIGN3X3BhdXNlU2ltdWxhdGlvbigpO1xuICBjd19naG9zdFJlcGxheUludGVydmFsID0gc2V0SW50ZXJ2YWwoY3dfZHJhd0dob3N0UmVwbGF5LCBNYXRoLnJvdW5kKDEwMDAgLyBzY3JlZW5mcHMpKTtcbn1cblxuZnVuY3Rpb24gY3dfc3RvcEdob3N0UmVwbGF5KCkge1xuICBjbGVhckludGVydmFsKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwpO1xuICBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcbiAgY3dfZmluZExlYWRlcigpO1xuICBjYW1lcmEucG9zLnggPSBsZWFkZXJQb3NpdGlvbi54O1xuICBjYW1lcmEucG9zLnkgPSBsZWFkZXJQb3NpdGlvbi55O1xuICBjd19yZXN1bWVTaW11bGF0aW9uKCk7XG59XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWdob3N0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbihlKXtcbiAgY3dfdG9nZ2xlR2hvc3RSZXBsYXkoZS50YXJnZXQpXG59KVxuXG5mdW5jdGlvbiBjd190b2dnbGVHaG9zdFJlcGxheShidXR0b24pIHtcbiAgaWYgKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPT0gbnVsbCkge1xuICAgIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKTtcbiAgICBidXR0b24udmFsdWUgPSBcIlJlc3VtZSBzaW11bGF0aW9uXCI7XG4gIH0gZWxzZSB7XG4gICAgY3dfc3RvcEdob3N0UmVwbGF5KCk7XG4gICAgYnV0dG9uLnZhbHVlID0gXCJWaWV3IHRvcCByZXBsYXlcIjtcbiAgfVxufVxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmIEVORFxuXG4vLyBpbml0aWFsIHN0dWZmLCBvbmx5IGNhbGxlZCBvbmNlIChob3BlZnVsbHkpXG5mdW5jdGlvbiBjd19pbml0KCkge1xuICAvLyBjbG9uZSBzaWx2ZXIgZG90IGFuZCBoZWFsdGggYmFyXG4gIHZhciBtbW0gPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnbWluaW1hcG1hcmtlcicpWzBdO1xuICB2YXIgaGJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdoZWFsdGhiYXInKVswXTtcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XG5cbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG5cbiAgICAvLyBtaW5pbWFwIG1hcmtlcnNcbiAgICB2YXIgbmV3YmFyID0gbW1tLmNsb25lTm9kZSh0cnVlKTtcbiAgICBuZXdiYXIuaWQgPSBcImJhclwiICsgaztcbiAgICBuZXdiYXIuc3R5bGUucGFkZGluZ1RvcCA9IGsgKiA5ICsgXCJweFwiO1xuICAgIG1pbmltYXBob2xkZXIuYXBwZW5kQ2hpbGQobmV3YmFyKTtcblxuICAgIC8vIGhlYWx0aCBiYXJzXG4gICAgdmFyIG5ld2hlYWx0aCA9IGhiYXIuY2xvbmVOb2RlKHRydWUpO1xuICAgIG5ld2hlYWx0aC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIkRJVlwiKVswXS5pZCA9IFwiaGVhbHRoXCIgKyBrO1xuICAgIG5ld2hlYWx0aC5jYXJfaW5kZXggPSBrO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIpLmFwcGVuZENoaWxkKG5ld2hlYWx0aCk7XG4gIH1cbiAgbW1tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobW1tKTtcbiAgaGJhci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGhiYXIpO1xuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XG4gIHJlc2V0Q2FyVUkoKTtcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcbiAgc2V0dXBDYXJVSSgpO1xuICBjd19kcmF3TWluaU1hcCgpO1xuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcbiAgXG59XG5cbmZ1bmN0aW9uIHJlbE1vdXNlQ29vcmRzKGV2ZW50KSB7XG4gIHZhciB0b3RhbE9mZnNldFggPSAwO1xuICB2YXIgdG90YWxPZmZzZXRZID0gMDtcbiAgdmFyIGNhbnZhc1ggPSAwO1xuICB2YXIgY2FudmFzWSA9IDA7XG4gIHZhciBjdXJyZW50RWxlbWVudCA9IHRoaXM7XG5cbiAgZG8ge1xuICAgIHRvdGFsT2Zmc2V0WCArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRMZWZ0IC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcbiAgICB0b3RhbE9mZnNldFkgKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0VG9wIC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgIGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQub2Zmc2V0UGFyZW50XG4gIH1cbiAgd2hpbGUgKGN1cnJlbnRFbGVtZW50KTtcblxuICBjYW52YXNYID0gZXZlbnQucGFnZVggLSB0b3RhbE9mZnNldFg7XG4gIGNhbnZhc1kgPSBldmVudC5wYWdlWSAtIHRvdGFsT2Zmc2V0WTtcblxuICByZXR1cm4ge3g6IGNhbnZhc1gsIHk6IGNhbnZhc1l9XG59XG5IVE1MRGl2RWxlbWVudC5wcm90b3R5cGUucmVsTW91c2VDb29yZHMgPSByZWxNb3VzZUNvb3Jkcztcbm1pbmltYXBob2xkZXIub25jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICB2YXIgY29vcmRzID0gbWluaW1hcGhvbGRlci5yZWxNb3VzZUNvb3JkcyhldmVudCk7XG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcbiAgdmFyIGNsb3Nlc3QgPSB7XG4gICAgdmFsdWU6IGN3X2NhckFycmF5WzBdLmNhcixcbiAgICBkaXN0OiBNYXRoLmFicygoKGN3X2NhckFycmF5WzBdLmdldFBvc2l0aW9uKCkueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KSxcbiAgICB4OiBjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnhcbiAgfVxuXG4gIHZhciBtYXhYID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjd19jYXJBcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwb3MgPSBjd19jYXJBcnJheVtpXS5nZXRQb3NpdGlvbigpO1xuICAgIHZhciBkaXN0ID0gTWF0aC5hYnMoKChwb3MueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KTtcbiAgICBpZiAoZGlzdCA8IGNsb3Nlc3QuZGlzdCkge1xuICAgICAgY2xvc2VzdC52YWx1ZSA9IGN3X2NhckFycmF5LmNhcjtcbiAgICAgIGNsb3Nlc3QuZGlzdCA9IGRpc3Q7XG4gICAgICBjbG9zZXN0LnggPSBwb3MueDtcbiAgICB9XG4gICAgbWF4WCA9IE1hdGgubWF4KHBvcy54LCBtYXhYKTtcbiAgfVxuXG4gIGlmIChjbG9zZXN0LnggPT0gbWF4WCkgeyAvLyBmb2N1cyBvbiBsZWFkZXIgYWdhaW5cbiAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xuICB9IGVsc2Uge1xuICAgIGN3X3NldENhbWVyYVRhcmdldChjbG9zZXN0LnZhbHVlKTtcbiAgfVxufVxuXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25yYXRlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0TXV0YXRpb24oZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9uc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldE11dGF0aW9uUmFuZ2UoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zsb29yXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0TXV0YWJsZUZsb29yKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxufSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZ3Jhdml0eVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldEdyYXZpdHkoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2VsaXRlc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldEVsaXRlU2l6ZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uKG11dGF0aW9uKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbl9tdXRhdGlvbiA9IHBhcnNlRmxvYXQobXV0YXRpb24pO1xufVxuXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvblJhbmdlKHJhbmdlKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLm11dGF0aW9uX3JhbmdlID0gcGFyc2VGbG9hdChyYW5nZSk7XG59XG5cbmZ1bmN0aW9uIGN3X3NldE11dGFibGVGbG9vcihjaG9pY2UpIHtcbiAgd29ybGRfZGVmLm11dGFibGVfZmxvb3IgPSAoY2hvaWNlID09IDEpO1xufVxuXG5mdW5jdGlvbiBjd19zZXRHcmF2aXR5KGNob2ljZSkge1xuICB3b3JsZF9kZWYuZ3Jhdml0eSA9IG5ldyBiMlZlYzIoMC4wLCAtcGFyc2VGbG9hdChjaG9pY2UpKTtcbiAgdmFyIHdvcmxkID0gY3VycmVudFJ1bm5lci5zY2VuZS53b3JsZFxuICAvLyBDSEVDSyBHUkFWSVRZIENIQU5HRVNcbiAgaWYgKHdvcmxkLkdldEdyYXZpdHkoKS55ICE9IHdvcmxkX2RlZi5ncmF2aXR5LnkpIHtcbiAgICB3b3JsZC5TZXRHcmF2aXR5KHdvcmxkX2RlZi5ncmF2aXR5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19zZXRFbGl0ZVNpemUoY2xvbmVzKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmNoYW1waW9uTGVuZ3RoID0gcGFyc2VJbnQoY2xvbmVzLCAxMCk7XG59XG5cbmN3X2luaXQoKTtcbiIsInZhciByYW5kb20gPSByZXF1aXJlKFwiLi9yYW5kb20uanNcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGluc3RhbmNlLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20uY3JlYXRlTm9ybWFscyhzY2hlbWFQcm9wLCBnZW5lcmF0b3IpO1xuICAgICAgaW5zdGFuY2Vba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LCB7IGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSB9KTtcbiAgfSxcbiAgY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBhcmVudENob29zZXIpe1xuICAgIHZhciBpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcbiAgICAgICAgdmFyIHAgPSBwYXJlbnRDaG9vc2VyKGlkLCBrZXksIHBhcmVudHMpO1xuICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xuICAgICAgfVxuICAgICAgY3Jvc3NEZWZba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcbiAgICB9LCB7XG4gICAgICBpZDogaWQsXG4gICAgICBhbmNlc3RyeTogcGFyZW50cy5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnksXG4gICAgICAgIH07XG4gICAgICB9KVxuICAgIH0pO1xuICB9LFxuICBjcmVhdGVNdXRhdGVkQ2xvbmUoc2NoZW1hLCBnZW5lcmF0b3IsIHBhcmVudCwgZmFjdG9yLCBjaGFuY2VUb011dGF0ZSl7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciBvcmlnaW5hbFZhbHVlcyA9IHBhcmVudFtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgICBzY2hlbWFQcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlXG4gICAgICApO1xuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9LCB7XG4gICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxuICAgIH0pO1xuICB9LFxuICBhcHBseVR5cGVzKHNjaGVtYSwgcGFyZW50KXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XG4gICAgICB2YXIgdmFsdWVzO1xuICAgICAgc3dpdGNoKHNjaGVtYVByb3AudHlwZSl7XG4gICAgICAgIGNhc2UgXCJzaHVmZmxlXCIgOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb1NodWZmbGUoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcbiAgICAgICAgY2FzZSBcImZsb2F0XCIgOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0Zsb2F0KHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJpbnRlZ2VyXCI6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvSW50ZWdlcihzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7c2NoZW1hUHJvcC50eXBlfSBvZiBzY2hlbWEgZm9yIGtleSAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XG4gICAgICByZXR1cm4gY2xvbmU7XG4gICAgfSwge1xuICAgICAgaWQ6IHBhcmVudC5pZCxcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnlcbiAgICB9KTtcbiAgfSxcbn1cbiIsInZhciBjcmVhdGUgPSByZXF1aXJlKFwiLi4vY3JlYXRlLWluc3RhbmNlXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2VuZXJhdGlvblplcm86IGdlbmVyYXRpb25aZXJvLFxuICBuZXh0R2VuZXJhdGlvbjogbmV4dEdlbmVyYXRpb25cbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKXtcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICBzY2hlbWEgPSBjb25maWcuc2NoZW1hO1xuICB2YXIgY3dfY2FyR2VuZXJhdGlvbiA9IFtdO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcbiAgICB2YXIgZGVmID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpXG4gICAgfSk7XG4gICAgZGVmLmluZGV4ID0gaztcbiAgICBjd19jYXJHZW5lcmF0aW9uLnB1c2goZGVmKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGNvdW50ZXI6IDAsXG4gICAgZ2VuZXJhdGlvbjogY3dfY2FyR2VuZXJhdGlvbixcbiAgfTtcbn1cblxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24oXG4gIHByZXZpb3VzU3RhdGUsXG4gIHNjb3JlcyxcbiAgY29uZmlnXG4pe1xuICB2YXIgY2hhbXBpb25fbGVuZ3RoID0gY29uZmlnLmNoYW1waW9uTGVuZ3RoLFxuICAgIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gY29uZmlnLnNlbGVjdEZyb21BbGxQYXJlbnRzO1xuXG4gIHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XG4gIHZhciBuZXdib3JuO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGNoYW1waW9uX2xlbmd0aDsgaysrKSB7YGBcbiAgICBzY29yZXNba10uZGVmLmlzX2VsaXRlID0gdHJ1ZTtcbiAgICBzY29yZXNba10uZGVmLmluZGV4ID0gaztcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2goc2NvcmVzW2tdLmRlZik7XG4gIH1cbiAgdmFyIHBhcmVudExpc3QgPSBbXTtcbiAgZm9yIChrID0gY2hhbXBpb25fbGVuZ3RoOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuICAgIHZhciBwYXJlbnQxID0gc2VsZWN0RnJvbUFsbFBhcmVudHMoc2NvcmVzLCBwYXJlbnRMaXN0KTtcbiAgICB2YXIgcGFyZW50MiA9IHBhcmVudDE7XG4gICAgd2hpbGUgKHBhcmVudDIgPT0gcGFyZW50MSkge1xuICAgICAgcGFyZW50MiA9IHNlbGVjdEZyb21BbGxQYXJlbnRzKHNjb3JlcywgcGFyZW50TGlzdCwgcGFyZW50MSk7XG4gICAgfVxuICAgIHZhciBwYWlyID0gW3BhcmVudDEsIHBhcmVudDJdXG4gICAgcGFyZW50TGlzdC5wdXNoKHBhaXIpO1xuICAgIG5ld2Jvcm4gPSBtYWtlQ2hpbGQoY29uZmlnLFxuICAgICAgcGFpci5tYXAoZnVuY3Rpb24ocGFyZW50KSB7IHJldHVybiBzY29yZXNbcGFyZW50XS5kZWY7IH0pXG4gICAgKTtcbiAgICBuZXdib3JuID0gbXV0YXRlKGNvbmZpZywgbmV3Ym9ybik7XG4gICAgbmV3Ym9ybi5pc19lbGl0ZSA9IGZhbHNlO1xuICAgIG5ld2Jvcm4uaW5kZXggPSBrO1xuICAgIG5ld0dlbmVyYXRpb24ucHVzaChuZXdib3JuKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY291bnRlcjogcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgMSxcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxuICB9O1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VDaGlsZChjb25maWcsIHBhcmVudHMpe1xuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcbiAgICBwaWNrUGFyZW50ID0gY29uZmlnLnBpY2tQYXJlbnQ7XG4gIHJldHVybiBjcmVhdGUuY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBpY2tQYXJlbnQpXG59XG5cblxuZnVuY3Rpb24gbXV0YXRlKGNvbmZpZywgcGFyZW50KXtcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXG4gICAgbXV0YXRpb25fcmFuZ2UgPSBjb25maWcubXV0YXRpb25fcmFuZ2UsXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcbiAgICBnZW5lcmF0ZVJhbmRvbSA9IGNvbmZpZy5nZW5lcmF0ZVJhbmRvbTtcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXG4gICAgc2NoZW1hLFxuICAgIGdlbmVyYXRlUmFuZG9tLFxuICAgIHBhcmVudCxcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXG4gICAgZ2VuX211dGF0aW9uXG4gIClcbn1cbiIsIlxuXG5jb25zdCByYW5kb20gPSB7XG4gIHNodWZmbGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGggfHwgMTAsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICB9LCBnZW5lcmF0b3IpKTtcbiAgfSxcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHZhbHVlcy5wdXNoKFxuICAgICAgICBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgbXV0YXRlU2h1ZmZsZShcbiAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICAgKSk7XG4gIH0sXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtYXBUb1NodWZmbGUocHJvcCwgbm9ybWFscyl7XG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcbiAgICB2YXIgc29ydGVkID0gbm9ybWFscy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSwgYil7XG4gICAgICByZXR1cm4gYSAtIGI7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uKHZhbCl7XG4gICAgICByZXR1cm4gc29ydGVkLmluZGV4T2YodmFsKTtcbiAgICB9KS5tYXAoZnVuY3Rpb24oaSl7XG4gICAgICByZXR1cm4gaSArIG9mZnNldDtcbiAgICB9KS5zbGljZSgwLCBsaW1pdCk7XG4gIH0sXG4gIG1hcFRvSW50ZWdlcihwcm9wLCBub3JtYWxzKXtcbiAgICBwcm9wID0ge1xuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMTAsXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXG4gICAgfVxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKS5tYXAoZnVuY3Rpb24oZmxvYXQpe1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xuICAgIH0pO1xuICB9LFxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xuICAgIHByb3AgPSB7XG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXG4gICAgfVxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbihub3JtYWwpe1xuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcbiAgICAgIHJldHVybiBtaW4gKyBub3JtYWwgKiByYW5nZVxuICAgIH0pXG4gIH0sXG4gIG11dGF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xuICAgICAgaWYoZ2VuZXJhdG9yKCkgPiBjaGFuY2VUb011dGF0ZSl7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG11dGF0ZU5vcm1hbChcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xuXG5mdW5jdGlvbiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBtdXRhdGlvbl9yYW5nZSl7XG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG11dGF0ZSBiZXlvbmQgYm91bmRzXCIpO1xuICB9XG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xuICBpZiAobmV3TWluIDwgMCkgbmV3TWluID0gMDtcbiAgaWYgKG5ld01pbiArIG11dGF0aW9uX3JhbmdlICA+IDEpXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbCh7XG4gICAgaW5jbHVzaXZlOiB0cnVlLFxuICB9LCBnZW5lcmF0b3IpO1xuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKXtcbiAgaWYoIXByb3AuaW5jbHVzaXZlKXtcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdlbmVyYXRvcigpIDwgMC41ID9cbiAgICBnZW5lcmF0b3IoKSA6XG4gICAgMSAtIGdlbmVyYXRvcigpO1xuICB9XG59XG4iLCIvKiBnbG9iYWxzIGJ0b2EgKi9cbnZhciBzZXR1cFNjZW5lID0gcmVxdWlyZShcIi4vc2V0dXAtc2NlbmVcIik7XG52YXIgY2FyUnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvZGVmLXRvLWNhclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBydW5EZWZzO1xuZnVuY3Rpb24gcnVuRGVmcyh3b3JsZF9kZWYsIGRlZnMsIGxpc3RlbmVycykge1xuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcbiAgfVxuXG4gIHZhciBzY2VuZSA9IHNldHVwU2NlbmUod29ybGRfZGVmKTtcbiAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xuICAvLyBjb25zb2xlLmxvZyhcImFib3V0IHRvIGJ1aWxkIGNhcnNcIik7XG4gIHZhciBjYXJzID0gZGVmcy5tYXAoKGRlZiwgaSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBpbmRleDogaSxcbiAgICAgIGRlZjogZGVmLFxuICAgICAgY2FyOiBkZWZUb0NhcihkZWYsIHNjZW5lLndvcmxkLCB3b3JsZF9kZWYpLFxuICAgICAgc3RhdGU6IGNhclJ1bi5nZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKVxuICAgIH07XG4gIH0pO1xuICB2YXIgYWxpdmVjYXJzID0gY2FycztcbiAgcmV0dXJuIHtcbiAgICBzY2VuZTogc2NlbmUsXG4gICAgY2FyczogY2FycyxcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJubyBtb3JlIGNhcnNcIik7XG4gICAgICB9XG4gICAgICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDIwLCAyMCk7XG4gICAgICBsaXN0ZW5lcnMucHJlQ2FyU3RlcCgpO1xuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XG4gICAgICAgIGNhci5zdGF0ZSA9IGNhclJ1bi51cGRhdGVTdGF0ZShcbiAgICAgICAgICB3b3JsZF9kZWYsIGNhci5jYXIsIGNhci5zdGF0ZVxuICAgICAgICApO1xuICAgICAgICB2YXIgc3RhdHVzID0gY2FyUnVuLmdldFN0YXR1cyhjYXIuc3RhdGUsIHdvcmxkX2RlZik7XG4gICAgICAgIGxpc3RlbmVycy5jYXJTdGVwKGNhcik7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xuICAgICAgICBsaXN0ZW5lcnMuY2FyRGVhdGgoY2FyKTtcblxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcbiAgICAgICAgdmFyIHdvcmxkQ2FyID0gY2FyLmNhcjtcbiAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIuY2hhc3Npcyk7XG5cbiAgICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCB3b3JsZENhci53aGVlbHMubGVuZ3RoOyB3KyspIHtcbiAgICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci53aGVlbHNbd10pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSlcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxpc3RlbmVycy5nZW5lcmF0aW9uRW5kKGNhcnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG59XG4iLCIvKiBnbG9iYWxzIGIyV29ybGQgYjJWZWMyIGIyQm9keURlZiBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgKi9cblxuLypcblxud29ybGRfZGVmID0ge1xuICBncmF2aXR5OiB7eCwgeX0sXG4gIGRvU2xlZXA6IGJvb2xlYW4sXG4gIGZsb29yc2VlZDogc3RyaW5nLFxuICB0aWxlRGltZW5zaW9ucyxcbiAgbWF4Rmxvb3JUaWxlcyxcbiAgbXV0YWJsZV9mbG9vcjogYm9vbGVhblxufVxuXG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdvcmxkX2RlZil7XG5cbiAgdmFyIHdvcmxkID0gbmV3IGIyV29ybGQod29ybGRfZGVmLmdyYXZpdHksIHdvcmxkX2RlZi5kb1NsZWVwKTtcbiAgdmFyIGZsb29yVGlsZXMgPSBjd19jcmVhdGVGbG9vcihcbiAgICB3b3JsZCxcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkLFxuICAgIHdvcmxkX2RlZi50aWxlRGltZW5zaW9ucyxcbiAgICB3b3JsZF9kZWYubWF4Rmxvb3JUaWxlcyxcbiAgICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vclxuICApO1xuXG4gIHZhciBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW1xuICAgIGZsb29yVGlsZXMubGVuZ3RoIC0gMVxuICBdO1xuICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXG4gICAgbGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXVxuICApO1xuICB3b3JsZC5maW5pc2hMaW5lID0gdGlsZV9wb3NpdGlvbi54O1xuICByZXR1cm4ge1xuICAgIHdvcmxkOiB3b3JsZCxcbiAgICBmbG9vclRpbGVzOiBmbG9vclRpbGVzLFxuICAgIGZpbmlzaExpbmU6IHRpbGVfcG9zaXRpb24ueFxuICB9O1xufVxuXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vcih3b3JsZCwgZmxvb3JzZWVkLCBkaW1lbnNpb25zLCBtYXhGbG9vclRpbGVzLCBtdXRhYmxlX2Zsb29yKSB7XG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xuICB2YXIgY3dfZmxvb3JUaWxlcyA9IFtdO1xuICBNYXRoLnNlZWRyYW5kb20oZmxvb3JzZWVkKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBtYXhGbG9vclRpbGVzOyBrKyspIHtcbiAgICBpZiAoIW11dGFibGVfZmxvb3IpIHtcbiAgICAgIC8vIGtlZXAgb2xkIGltcG9zc2libGUgdHJhY2tzIGlmIG5vdCB1c2luZyBtdXRhYmxlIGZsb29yc1xuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuNSAqIGsgLyBtYXhGbG9vclRpbGVzXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpZiBwYXRoIGlzIG11dGFibGUgb3ZlciByYWNlcywgY3JlYXRlIHNtb290aGVyIHRyYWNrc1xuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIGsgLyBtYXhGbG9vclRpbGVzXG4gICAgICApO1xuICAgIH1cbiAgICBjd19mbG9vclRpbGVzLnB1c2gobGFzdF90aWxlKTtcbiAgICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xuICB9XG4gIHJldHVybiBjd19mbG9vclRpbGVzO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yVGlsZSh3b3JsZCwgZGltLCBwb3NpdGlvbiwgYW5nbGUpIHtcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54LCBwb3NpdGlvbi55KTtcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcblxuICB2YXIgY29vcmRzID0gbmV3IEFycmF5KCk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIC1kaW0ueSkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAtZGltLnkpKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xuXG4gIHZhciBjZW50ZXIgPSBuZXcgYjJWZWMyKDAsIDApO1xuXG4gIHZhciBuZXdjb29yZHMgPSBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKTtcblxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XG4gIHJldHVybiBjb29yZHMubWFwKGZ1bmN0aW9uKGNvb3JkKXtcbiAgICByZXR1cm4ge1xuICAgICAgeDogTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgLSBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci54LFxuICAgICAgeTogTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgKyBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci55LFxuICAgIH07XG4gIH0pO1xufVxuIl19
