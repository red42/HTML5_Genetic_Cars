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

function make_def_standard(def) {
    var extents = 0.5;

    def.wheel_vertex = [
        0,
        4
    ];
}

function defToCar(normal_def, world, constants){
  var car_def = createInstance.applyTypes(constants.schema, normal_def)
  make_def_standard(car_def);
  
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

function make_def_standard(def) {
    var extents = 1;

    def.vertex_list = [
        extents,

        extents / 2,
        extents / 2,

        extents,

        extents / 2,
        extents / 2,

        extents,

        extents / 4,
        extents / 4,

        0,

        extents / 4,
        extents / 4
    ];
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function(){
      return Math.random()
    });

    make_def_standard(def);

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

    make_def_standard(newborn);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL25peC9zdG9yZS9xcmR2Nzd2MTNheHA0a2gyZ21mYTN3a3I2cnBrYnphOC1ub2RlLWJyb3dzZXJpZnktMTYuMS4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL2Nhci1zY2hlbWEvY2FyLWNvbnN0YW50cy5qc29uIiwic3JjL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzIiwic3JjL2Nhci1zY2hlbWEvZGVmLXRvLWNhci5qcyIsInNyYy9jYXItc2NoZW1hL3J1bi5qcyIsInNyYy9kcmF3L2RyYXctY2FyLXN0YXRzLmpzIiwic3JjL2RyYXcvZHJhdy1jYXIuanMiLCJzcmMvZHJhdy9kcmF3LWNpcmNsZS5qcyIsInNyYy9kcmF3L2RyYXctZmxvb3IuanMiLCJzcmMvZHJhdy9kcmF3LXZpcnR1YWwtcG9seS5qcyIsInNyYy9kcmF3L3Bsb3QtZ3JhcGhzLmpzIiwic3JjL2RyYXcvc2NhdHRlci1wbG90LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2dlbmVyYXRlUmFuZG9tLmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luYnJlZWRpbmctY29lZmZpY2llbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5kZXguanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvcGlja1BhcmVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9zZWxlY3RGcm9tQWxsUGFyZW50cy5qcyIsInNyYy9naG9zdC9jYXItdG8tZ2hvc3QuanMiLCJzcmMvZ2hvc3QvaW5kZXguanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2UuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9yYW5kb20uanMiLCJzcmMvd29ybGQvcnVuLmpzIiwic3JjL3dvcmxkL3NldHVwLXNjZW5lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwid2hlZWxDb3VudFwiOiAyLFxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcbiAgXCJ3aGVlbFJhZGl1c1JhbmdlXCI6IDAuNSxcbiAgXCJ3aGVlbE1pbkRlbnNpdHlcIjogNDAsXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxuICBcImNoYXNzaXNEZW5zaXR5UmFuZ2VcIjogMzAwLFxuICBcImNoYXNzaXNNaW5EZW5zaXR5XCI6IDMwLFxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcbiAgXCJjaGFzc2lzQXhpc1JhbmdlXCI6IDEuMVxufVxuIiwidmFyIGNhckNvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2Nhci1jb25zdGFudHMuanNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHdvcmxkRGVmOiB3b3JsZERlZixcbiAgY2FyQ29uc3RhbnRzOiBnZXRDYXJDb25zdGFudHMsXG4gIGdlbmVyYXRlU2NoZW1hOiBnZW5lcmF0ZVNjaGVtYVxufVxuXG5mdW5jdGlvbiB3b3JsZERlZigpe1xuICB2YXIgYm94MmRmcHMgPSA2MDtcbiAgcmV0dXJuIHtcbiAgICBncmF2aXR5OiB7IHk6IDAgfSxcbiAgICBkb1NsZWVwOiB0cnVlLFxuICAgIGZsb29yc2VlZDogXCJhYmNcIixcbiAgICBtYXhGbG9vclRpbGVzOiAyMDAsXG4gICAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXG4gICAgbW90b3JTcGVlZDogMjAsXG4gICAgYm94MmRmcHM6IGJveDJkZnBzLFxuICAgIG1heF9jYXJfaGVhbHRoOiBib3gyZGZwcyAqIDEwLFxuICAgIHRpbGVEaW1lbnNpb25zOiB7XG4gICAgICB3aWR0aDogMS41LFxuICAgICAgaGVpZ2h0OiAwLjE1XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDYXJDb25zdGFudHMoKXtcbiAgcmV0dXJuIGNhckNvbnN0YW50cztcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTY2hlbWEodmFsdWVzKXtcbiAgcmV0dXJuIHtcbiAgICB3aGVlbF9yYWRpdXM6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pblJhZGl1cyxcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxSYWRpdXNSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHdoZWVsX2RlbnNpdHk6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pbkRlbnNpdHksXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsRGVuc2l0eVJhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgY2hhc3Npc19kZW5zaXR5OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IDEsXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzRGVuc2l0eVJhbmdlLFxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzTWluRGVuc2l0eSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHZlcnRleF9saXN0OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IDEyLFxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc01pbkF4aXMsXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNBeGlzUmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICB3aGVlbF92ZXJ0ZXg6IHtcbiAgICAgIHR5cGU6IFwic2h1ZmZsZVwiLFxuICAgICAgbGVuZ3RoOiA4LFxuICAgICAgbGltaXQ6IDIsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgfTtcbn1cbiIsIi8qXG4gIGdsb2JhbHMgYjJSZXZvbHV0ZUpvaW50RGVmIGIyVmVjMiBiMkJvZHlEZWYgYjJCb2R5IGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSBiMkNpcmNsZVNoYXBlXG4qL1xuXG52YXIgY3JlYXRlSW5zdGFuY2UgPSByZXF1aXJlKFwiLi4vbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XG5cbmZ1bmN0aW9uIG1ha2VfZGVmX3N0YW5kYXJkKGRlZikge1xuICAgIHZhciBleHRlbnRzID0gMC41O1xuXG4gICAgZGVmLndoZWVsX3ZlcnRleCA9IFtcbiAgICAgICAgMCxcbiAgICAgICAgNFxuICAgIF07XG59XG5cbmZ1bmN0aW9uIGRlZlRvQ2FyKG5vcm1hbF9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xuICB2YXIgY2FyX2RlZiA9IGNyZWF0ZUluc3RhbmNlLmFwcGx5VHlwZXMoY29uc3RhbnRzLnNjaGVtYSwgbm9ybWFsX2RlZilcbiAgbWFrZV9kZWZfc3RhbmRhcmQoY2FyX2RlZik7XG4gIFxuICB2YXIgaW5zdGFuY2UgPSB7fTtcbiAgaW5zdGFuY2UuY2hhc3NpcyA9IGNyZWF0ZUNoYXNzaXMoXG4gICAgd29ybGQsIGNhcl9kZWYudmVydGV4X2xpc3QsIGNhcl9kZWYuY2hhc3Npc19kZW5zaXR5XG4gICk7XG4gIHZhciBpO1xuXG4gIHZhciB3aGVlbENvdW50ID0gY2FyX2RlZi53aGVlbF9yYWRpdXMubGVuZ3RoO1xuXG4gIGluc3RhbmNlLndoZWVscyA9IFtdO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgaW5zdGFuY2Uud2hlZWxzW2ldID0gY3JlYXRlV2hlZWwoXG4gICAgICB3b3JsZCxcbiAgICAgIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldLFxuICAgICAgY2FyX2RlZi53aGVlbF9kZW5zaXR5W2ldXG4gICAgKTtcbiAgfVxuXG4gIHZhciBjYXJtYXNzID0gaW5zdGFuY2UuY2hhc3Npcy5HZXRNYXNzKCk7XG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcbiAgICBjYXJtYXNzICs9IGluc3RhbmNlLndoZWVsc1tpXS5HZXRNYXNzKCk7XG4gIH1cblxuICB2YXIgam9pbnRfZGVmID0gbmV3IGIyUmV2b2x1dGVKb2ludERlZigpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcbiAgICB2YXIgdG9ycXVlID0gY2FybWFzcyAqIC1jb25zdGFudHMuZ3Jhdml0eS55IC8gY2FyX2RlZi53aGVlbF9yYWRpdXNbaV07XG5cbiAgICB2YXIgcmFuZHZlcnRleCA9IGluc3RhbmNlLmNoYXNzaXMudmVydGV4X2xpc3RbY2FyX2RlZi53aGVlbF92ZXJ0ZXhbaV1dO1xuXG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQS5TZXQocmFuZHZlcnRleC54LCByYW5kdmVydGV4LnkpO1xuICAgIGpvaW50X2RlZi5sb2NhbEFuY2hvckIuU2V0KDAsIDApO1xuICAgIGpvaW50X2RlZi5tYXhNb3RvclRvcnF1ZSA9IHRvcnF1ZTtcbiAgICBqb2ludF9kZWYubW90b3JTcGVlZCA9IC1jb25zdGFudHMubW90b3JTcGVlZDtcbiAgICBqb2ludF9kZWYuZW5hYmxlTW90b3IgPSB0cnVlO1xuICAgIGpvaW50X2RlZi5ib2R5QSA9IGluc3RhbmNlLmNoYXNzaXM7XG4gICAgam9pbnRfZGVmLmJvZHlCID0gaW5zdGFuY2Uud2hlZWxzW2ldO1xuICAgIHdvcmxkLkNyZWF0ZUpvaW50KGpvaW50X2RlZik7XG4gIH1cblxuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXMod29ybGQsIHZlcnRleHMsIGRlbnNpdHkpIHtcblxuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMF0sIDApKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMV0sIHZlcnRleHNbMl0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIHZlcnRleHNbM10pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzRdLCB2ZXJ0ZXhzWzVdKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s2XSwgMCkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbN10sIC12ZXJ0ZXhzWzhdKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigwLCAtdmVydGV4c1s5XSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxMF0sIC12ZXJ0ZXhzWzExXSkpO1xuXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KDAuMCwgNC4wKTtcblxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzBdLCB2ZXJ0ZXhfbGlzdFsxXSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzFdLCB2ZXJ0ZXhfbGlzdFsyXSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzJdLCB2ZXJ0ZXhfbGlzdFszXSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzNdLCB2ZXJ0ZXhfbGlzdFs0XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzRdLCB2ZXJ0ZXhfbGlzdFs1XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzVdLCB2ZXJ0ZXhfbGlzdFs2XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzZdLCB2ZXJ0ZXhfbGlzdFs3XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzddLCB2ZXJ0ZXhfbGlzdFswXSwgZGVuc2l0eSk7XG5cbiAgYm9keS52ZXJ0ZXhfbGlzdCA9IHZlcnRleF9saXN0O1xuXG4gIHJldHVybiBib2R5O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleDEsIHZlcnRleDIsIGRlbnNpdHkpIHtcbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4MSk7XG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4Mik7XG4gIHZlcnRleF9saXN0LnB1c2goYjJWZWMyLk1ha2UoMCwgMCkpO1xuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xuICBmaXhfZGVmLmRlbnNpdHkgPSBkZW5zaXR5O1xuICBmaXhfZGVmLmZyaWN0aW9uID0gMTA7XG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcbiAgZml4X2RlZi5zaGFwZS5TZXRBc0FycmF5KHZlcnRleF9saXN0LCAzKTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdoZWVsKHdvcmxkLCByYWRpdXMsIGRlbnNpdHkpIHtcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMCwgMCk7XG5cbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcblxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKHJhZGl1cyk7XG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxO1xuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xuICBmaXhfZGVmLmZpbHRlci5ncm91cEluZGV4ID0gLTE7XG5cbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xuICByZXR1cm4gYm9keTtcbn1cbiIsIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2V0SW5pdGlhbFN0YXRlOiBnZXRJbml0aWFsU3RhdGUsXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcbiAgZ2V0U3RhdHVzOiBnZXRTdGF0dXMsXG4gIGNhbGN1bGF0ZVNjb3JlOiBjYWxjdWxhdGVTY29yZSxcbn07XG5cbmZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpe1xuICByZXR1cm4ge1xuICAgIGZyYW1lczogMCxcbiAgICBoZWFsdGg6IHdvcmxkX2RlZi5tYXhfY2FyX2hlYWx0aCxcbiAgICBtYXhQb3NpdGlvbnk6IDAsXG4gICAgbWluUG9zaXRpb255OiAwLFxuICAgIG1heFBvc2l0aW9ueDogMCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3RhdGUoY29uc3RhbnRzLCB3b3JsZENvbnN0cnVjdCwgc3RhdGUpe1xuICBpZihzdGF0ZS5oZWFsdGggPD0gMCl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQWxyZWFkeSBEZWFkXCIpO1xuICB9XG4gIGlmKHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJhbHJlYWR5IEZpbmlzaGVkXCIpO1xuICB9XG5cbiAgLy8gY29uc29sZS5sb2coc3RhdGUpO1xuICAvLyBjaGVjayBoZWFsdGhcbiAgdmFyIHBvc2l0aW9uID0gd29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRQb3NpdGlvbigpO1xuICAvLyBjaGVjayBpZiBjYXIgcmVhY2hlZCBlbmQgb2YgdGhlIHBhdGhcbiAgdmFyIG5leHRTdGF0ZSA9IHtcbiAgICBmcmFtZXM6IHN0YXRlLmZyYW1lcyArIDEsXG4gICAgbWF4UG9zaXRpb254OiBwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ID8gcG9zaXRpb24ueCA6IHN0YXRlLm1heFBvc2l0aW9ueCxcbiAgICBtYXhQb3NpdGlvbnk6IHBvc2l0aW9uLnkgPiBzdGF0ZS5tYXhQb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWF4UG9zaXRpb255LFxuICAgIG1pblBvc2l0aW9ueTogcG9zaXRpb24ueSA8IHN0YXRlLm1pblBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5taW5Qb3NpdGlvbnlcbiAgfTtcblxuICBpZiAocG9zaXRpb24ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKSB7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfVxuXG4gIGlmIChwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ICsgMC4wMikge1xuICAgIG5leHRTdGF0ZS5oZWFsdGggPSBjb25zdGFudHMubWF4X2Nhcl9oZWFsdGg7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfVxuICBuZXh0U3RhdGUuaGVhbHRoID0gc3RhdGUuaGVhbHRoIC0gMTtcbiAgaWYgKE1hdGguYWJzKHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKS54KSA8IDAuMDAxKSB7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCAtPSA1O1xuICB9XG4gIHJldHVybiBuZXh0U3RhdGU7XG59XG5cbmZ1bmN0aW9uIGdldFN0YXR1cyhzdGF0ZSwgY29uc3RhbnRzKXtcbiAgaWYoaGFzRmFpbGVkKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gLTE7XG4gIGlmKGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAxO1xuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gaGFzRmFpbGVkKHN0YXRlIC8qLCBjb25zdGFudHMgKi8pe1xuICByZXR1cm4gc3RhdGUuaGVhbHRoIDw9IDA7XG59XG5mdW5jdGlvbiBoYXNTdWNjZXNzKHN0YXRlLCBjb25zdGFudHMpe1xuICByZXR1cm4gc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmU7XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZVNjb3JlKHN0YXRlLCBjb25zdGFudHMpe1xuICB2YXIgYXZnc3BlZWQgPSAoc3RhdGUubWF4UG9zaXRpb254IC8gc3RhdGUuZnJhbWVzKSAqIGNvbnN0YW50cy5ib3gyZGZwcztcbiAgdmFyIHBvc2l0aW9uID0gc3RhdGUubWF4UG9zaXRpb254O1xuICB2YXIgc2NvcmUgPSBwb3NpdGlvbiArIGF2Z3NwZWVkO1xuICByZXR1cm4ge1xuICAgIHY6IHNjb3JlLFxuICAgIHM6IGF2Z3NwZWVkLFxuICAgIHg6IHBvc2l0aW9uLFxuICAgIHk6IHN0YXRlLm1heFBvc2l0aW9ueSxcbiAgICB5Mjogc3RhdGUubWluUG9zaXRpb255XG4gIH1cbn1cbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgKi9cblxudmFyIHJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09IENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xudmFyIGN3X0NhciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmN3X0Nhci5wcm90b3R5cGUuX19jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChjYXIpIHtcbiAgdGhpcy5jYXIgPSBjYXI7XG4gIHRoaXMuY2FyX2RlZiA9IGNhci5kZWY7XG4gIHZhciBjYXJfZGVmID0gdGhpcy5jYXJfZGVmO1xuXG4gIHRoaXMuZnJhbWVzID0gMDtcbiAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gIHRoaXMuaXNfZWxpdGUgPSBjYXIuZGVmLmlzX2VsaXRlO1xuICB0aGlzLmhlYWx0aEJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIgKyBjYXJfZGVmLmluZGV4KS5zdHlsZTtcbiAgdGhpcy5oZWFsdGhCYXJUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xuICB0aGlzLmhlYWx0aEJhclRleHQuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcbiAgdGhpcy5taW5pbWFwbWFya2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYXJcIiArIGNhcl9kZWYuaW5kZXgpO1xuXG4gIGlmICh0aGlzLmlzX2VsaXRlKSB7XG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjM0Y3MkFGXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjRjdDODczXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjRjdDODczXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XG4gIH1cblxufVxuXG5jd19DYXIucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jYXIuY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcbn1cblxuY3dfQ2FyLnByb3RvdHlwZS5raWxsID0gZnVuY3Rpb24gKGN1cnJlbnRSdW5uZXIsIGNvbnN0YW50cykge1xuICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcbiAgdmFyIGZpbmlzaExpbmUgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZpbmlzaExpbmVcbiAgdmFyIG1heF9jYXJfaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xuICB2YXIgc3RhdHVzID0gcnVuLmdldFN0YXR1cyh0aGlzLmNhci5zdGF0ZSwge1xuICAgIGZpbmlzaExpbmU6IGZpbmlzaExpbmUsXG4gICAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxuICB9KVxuICBzd2l0Y2goc3RhdHVzKXtcbiAgICBjYXNlIDE6IHtcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XG4gICAgICBicmVha1xuICAgIH1cbiAgICBjYXNlIC0xOiB7XG4gICAgICB0aGlzLmhlYWx0aEJhclRleHQuaW5uZXJIVE1MID0gXCImZGFnZ2VyO1wiO1xuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHRoaXMuYWxpdmUgPSBmYWxzZTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGN3X0NhcjtcbiIsIlxudmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xudmFyIGN3X2RyYXdDaXJjbGUgPSByZXF1aXJlKFwiLi9kcmF3LWNpcmNsZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXJfY29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpe1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG5cbiAgdmFyIHdoZWVsTWluRGVuc2l0eSA9IGNhcl9jb25zdGFudHMud2hlZWxNaW5EZW5zaXR5XG4gIHZhciB3aGVlbERlbnNpdHlSYW5nZSA9IGNhcl9jb25zdGFudHMud2hlZWxEZW5zaXR5UmFuZ2VcblxuICBpZiAoIW15Q2FyLmFsaXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBteUNhclBvcyA9IG15Q2FyLmdldFBvc2l0aW9uKCk7XG5cbiAgaWYgKG15Q2FyUG9zLnggPCAoY2FtZXJhX3ggLSA1KSkge1xuICAgIC8vIHRvbyBmYXIgYmVoaW5kLCBkb24ndCBkcmF3XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjNDQ0XCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcblxuICB2YXIgd2hlZWxzID0gbXlDYXIuY2FyLmNhci53aGVlbHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYiA9IHdoZWVsc1tpXTtcbiAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xuICAgICAgdmFyIGNvbG9yID0gTWF0aC5yb3VuZCgyNTUgLSAoMjU1ICogKGYubV9kZW5zaXR5IC0gd2hlZWxNaW5EZW5zaXR5KSkgLyB3aGVlbERlbnNpdHlSYW5nZSkudG9TdHJpbmcoKTtcbiAgICAgIHZhciByZ2Jjb2xvciA9IFwicmdiKFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIsXCIgKyBjb2xvciArIFwiKVwiO1xuICAgICAgY3dfZHJhd0NpcmNsZShjdHgsIGIsIHMubV9wLCBzLm1fcmFkaXVzLCBiLm1fc3dlZXAuYSwgcmdiY29sb3IpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChteUNhci5pc19lbGl0ZSkge1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNEQkUyRUZcIjtcbiAgfSBlbHNlIHtcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNGN0M4NzNcIjtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjRkFFQkNEXCI7XG4gIH1cbiAgY3R4LmJlZ2luUGF0aCgpO1xuXG4gIHZhciBjaGFzc2lzID0gbXlDYXIuY2FyLmNhci5jaGFzc2lzO1xuXG4gIGZvciAoZiA9IGNoYXNzaXMuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIGNzID0gZi5HZXRTaGFwZSgpO1xuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xuICB9XG4gIGN0eC5maWxsKCk7XG4gIGN0eC5zdHJva2UoKTtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xuXG5mdW5jdGlvbiBjd19kcmF3Q2lyY2xlKGN0eCwgYm9keSwgY2VudGVyLCByYWRpdXMsIGFuZ2xlLCBjb2xvcikge1xuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xuICBjdHguZmlsbFN0eWxlID0gY29sb3I7XG5cbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKHAueCwgcC55LCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcblxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcbiAgY3R4LmxpbmVUbyhwLnggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSksIHAueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGNhbWVyYSwgY3dfZmxvb3JUaWxlcykge1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAwMFwiO1xuICBjdHguZmlsbFN0eWxlID0gXCIjNzc3XCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuXG4gIHZhciBrO1xuICBpZihjYW1lcmEucG9zLnggLSAxMCA+IDApe1xuICAgIGsgPSBNYXRoLmZsb29yKChjYW1lcmEucG9zLnggLSAxMCkgLyAxLjUpO1xuICB9IGVsc2Uge1xuICAgIGsgPSAwO1xuICB9XG5cbiAgLy8gY29uc29sZS5sb2coayk7XG5cbiAgb3V0ZXJfbG9vcDpcbiAgICBmb3IgKGs7IGsgPCBjd19mbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XG4gICAgICB2YXIgYiA9IGN3X2Zsb29yVGlsZXNba107XG4gICAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG4gICAgICAgIHZhciBzaGFwZVBvc2l0aW9uID0gYi5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1swXSkueDtcbiAgICAgICAgaWYgKChzaGFwZVBvc2l0aW9uID4gKGNhbWVyYV94IC0gNSkpICYmIChzaGFwZVBvc2l0aW9uIDwgKGNhbWVyYV94ICsgMTApKSkge1xuICAgICAgICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGIsIHMubV92ZXJ0aWNlcywgcy5tX3ZlcnRleENvdW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hhcGVQb3NpdGlvbiA+IGNhbWVyYV94ICsgMTApIHtcbiAgICAgICAgICBicmVhayBvdXRlcl9sb29wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlKCk7XG59XG4iLCJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGJvZHksIHZ0eCwgbl92dHgpIHtcbiAgLy8gc2V0IHN0cm9rZXN0eWxlIGFuZCBmaWxsc3R5bGUgYmVmb3JlIGNhbGxcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcblxuICB2YXIgcDAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4WzBdKTtcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgdmFyIHAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4W2ldKTtcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcbiAgfVxuICBjdHgubGluZVRvKHAwLngsIHAwLnkpO1xufVxuIiwidmFyIHNjYXR0ZXJQbG90ID0gcmVxdWlyZShcIi4vc2NhdHRlci1wbG90XCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24oZ3JhcGhFbGVtLCB0b3BTY29yZXNFbGVtLCBzY2F0dGVyUGxvdEVsZW0sIGxhc3RTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19saXN0VG9wU2NvcmVzKHRvcFNjb3Jlc0VsZW0sIG5leHRTdGF0ZSk7XG4gICAgbmV4dFN0YXRlLnNjYXR0ZXJHcmFwaCA9IGRyYXdBbGxSZXN1bHRzKFxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxuICAgICk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfSxcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24oZ3JhcGhFbGVtKSB7XG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICBjb25zb2xlLmxvZyhjd19jYXJTY29yZXMpO1xuICByZXR1cm4ge1xuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiAobGFzdFN0YXRlLmN3X2dyYXBoQXZlcmFnZSB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaEVsaXRlOiAobGFzdFN0YXRlLmN3X2dyYXBoRWxpdGUgfHwgW10pLmNvbmNhdChbXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaFRvcDogKGxhc3RTdGF0ZS5jd19ncmFwaFRvcCB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52XG4gICAgXSksXG4gICAgYWxsUmVzdWx0czogKGxhc3RTdGF0ZS5hbGxSZXN1bHRzIHx8IFtdKS5jb25jYXQoY3dfY2FyU2NvcmVzKSxcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoVG9wLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RFbGl0ZShzdGF0ZSwgZ3JhcGhjdHgpIHtcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhFbGl0ZS5sZW5ndGg7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjN0JDNzREXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhBdmVyYWdlLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xuICB9XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIHZhciBzdW0gPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7XG59XG5cbmZ1bmN0aW9uIGN3X2F2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICB2YXIgc3VtID0gMDtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBnZW5lcmF0aW9uU2l6ZTtcbn1cblxuZnVuY3Rpb24gY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KSB7XG4gIGdyYXBoY2FudmFzLndpZHRoID0gZ3JhcGhjYW52YXMud2lkdGg7XG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XG4gIGdyYXBoY3R4LnNjYWxlKDEsIC0xKTtcbiAgZ3JhcGhjdHgubGluZVdpZHRoID0gMTtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDIpO1xuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDQpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcbiAgdmFyIHRzID0gZWxlbTtcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS52ID4gYi52KSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDFcbiAgICB9XG4gIH0pO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIGN3X3RvcFNjb3Jlcy5sZW5ndGgpOyBrKyspIHtcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XG4gICAgLy8gY29uc29sZS5sb2codG9wU2NvcmUpO1xuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxuXG4gICAgdHMuaW5uZXJIVE1MICs9ICBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcbiAgaWYoIXNjYXR0ZXJQbG90RWxlbSkgcmV0dXJuO1xuICByZXR1cm4gc2NhdHRlclBsb3Qoc2NhdHRlclBsb3RFbGVtLCBhbGxSZXN1bHRzLCBjb25maWcucHJvcGVydHlNYXAsIHByZXZpb3VzR3JhcGgpXG59XG4iLCIvKiBnbG9iYWxzIHZpcyBIaWdoY2hhcnRzICovXG5cbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzY29yZXNbMF0uZGVmKTtcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKGN1ckFycmF5LCBrZXkpe1xuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcbiAgICB2YXIgc3ViQXJyYXkgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1ckFycmF5LmNvbmNhdChzdWJBcnJheSk7XG4gIH0sIFtdKTtcbiAgZnVuY3Rpb24gcmV0cmlldmVWYWx1ZShvYmosIHBhdGgpe1xuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24oY3VyVmFsdWUsIGtleSl7XG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcbiAgICB9LCBvYmopO1xuICB9XG5cbiAgdmFyIGRhdGFPYmogPSBPYmplY3Qua2V5cyhzY29yZXMpLnJlZHVjZShmdW5jdGlvbihrdiwgc2NvcmUpe1xuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xuICAgICAgICByZXRyaWV2ZVZhbHVlKHNjb3JlLmRlZiwga2V5KSwgc2NvcmUuc2NvcmUudlxuICAgICAgXSlcbiAgICB9KVxuICAgIHJldHVybiBrdjtcbiAgfSwga2V5cy5yZWR1Y2UoZnVuY3Rpb24oa3YsIGtleSl7XG4gICAga3Zba2V5XSA9IHtcbiAgICAgIG5hbWU6IGtleSxcbiAgICAgIGRhdGE6IFtdLFxuICAgIH1cbiAgICByZXR1cm4ga3Y7XG4gIH0sIHt9KSlcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XG4gICAgICBjaGFydDoge1xuICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xuICAgICAgfSxcbiAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xuICAgICAgfSxcbiAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgdGV4dDogJ05vcm1hbGl6ZWQnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGFydE9uVGljazogdHJ1ZSxcbiAgICAgICAgICBlbmRPblRpY2s6IHRydWUsXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHlBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgdGV4dDogJ1Njb3JlJ1xuICAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICBsYXlvdXQ6ICd2ZXJ0aWNhbCcsXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcbiAgICAgICAgICB2ZXJ0aWNhbEFsaWduOiAndG9wJyxcbiAgICAgICAgICB4OiAxMDAsXG4gICAgICAgICAgeTogNzAsXG4gICAgICAgICAgZmxvYXRpbmc6IHRydWUsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHwgJyNGRkZGRkYnLFxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXG4gICAgICB9LFxuICAgICAgcGxvdE9wdGlvbnM6IHtcbiAgICAgICAgICBzY2F0dGVyOiB7XG4gICAgICAgICAgICAgIG1hcmtlcjoge1xuICAgICAgICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHN0YXRlczoge1xuICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXG4gICAgICAgICAgICAgICAgICBwb2ludEZvcm1hdDogJ3twb2ludC54fSwge3BvaW50Lnl9J1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcbiAgICAgIH0pXG4gIH0pO1xufVxuXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xuXG4gIC8vIENyZWF0ZSBhbmQgcG9wdWxhdGUgYSBkYXRhIHRhYmxlLlxuICB2YXIgZGF0YSA9IG5ldyB2aXMuRGF0YVNldCgpO1xuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xuICAgIGRhdGEuYWRkKHtcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxuICAgICAgejogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRQcm9wZXJ0eShpbmZvLCBrZXkpe1xuICAgIGlmKGtleSA9PT0gXCJzY29yZVwiKXtcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGluZm8uZGVmW2tleV07XG4gICAgfVxuICB9XG5cbiAgLy8gc3BlY2lmeSBvcHRpb25zXG4gIHZhciBvcHRpb25zID0ge1xuICAgIHdpZHRoOiAgJzYwMHB4JyxcbiAgICBoZWlnaHQ6ICc2MDBweCcsXG4gICAgc3R5bGU6ICdkb3Qtc2l6ZScsXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxuICAgIHNob3dMZWdlbmQ6IHRydWUsXG4gICAgc2hvd0dyaWQ6IHRydWUsXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXG5cbiAgICAvLyBPcHRpb24gdG9vbHRpcCBjYW4gYmUgdHJ1ZSwgZmFsc2UsIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nIHdpdGggSFRNTCBjb250ZW50c1xuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcbiAgICAgIC8vIGRhdGEgaXMgdGhlIG9yaWdpbmFsIG9iamVjdCBwYXNzZWQgdG8gdGhlIHBvaW50IGNvbnN0cnVjdG9yXG4gICAgICByZXR1cm4gJ3Njb3JlOiA8Yj4nICsgcG9pbnQueiArICc8L2I+PGJyPic7IC8vICsgcG9pbnQuZGF0YS5leHRyYTtcbiAgICB9LFxuXG4gICAgLy8gVG9vbHRpcCBkZWZhdWx0IHN0eWxpbmcgY2FuIGJlIG92ZXJyaWRkZW5cbiAgICB0b29sdGlwU3R5bGU6IHtcbiAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgYmFja2dyb3VuZCAgICA6ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNyknLFxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxuICAgICAgICBib3JkZXJSYWRpdXMgIDogJzEwcHgnXG4gICAgICB9LFxuICAgICAgbGluZToge1xuICAgICAgICBib3JkZXJMZWZ0ICAgIDogJzFweCBkb3R0ZWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xuICAgICAgfSxcbiAgICAgIGRvdDoge1xuICAgICAgICBib3JkZXIgICAgICAgIDogJzVweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSknXG4gICAgICB9XG4gICAgfSxcblxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcbiAgfTtcblxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcblxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xuICBncmFwaCA9IG5ldyB2aXMuR3JhcGgzZChjb250YWluZXIsIGRhdGEsIG9wdGlvbnMpO1xuXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXG4gIHJldHVybiBncmFwaDtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZVJhbmRvbTtcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCl7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufVxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcblxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKXtcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcbiAgdmFyIGZsYWdnZWQgPSBuZXcgU2V0KCk7XG4gIHZhciBjb252ZXJnZW5jZVBvaW50cyA9IG5ldyBTZXQoKTtcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcblxuICB2YXIgc3RvcmVkQ29lZmZpY2llbnRzID0gbmV3IE1hcCgpO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnZlcmdlbmNlUG9pbnRzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcbiAgICByZXR1cm4gc3VtICsgaUNvO1xuICB9LCAwKTtcblxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XG4gICAgdmFyIGl0ZW1zSW5RdWV1ZSA9IFt7IG5vZGU6IGluaXROb2RlLCBwYXRoOiBbXSB9XTtcbiAgICBkb3tcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XG4gICAgICB2YXIgbm9kZSA9IGl0ZW0ubm9kZTtcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xuICAgICAgICB2YXIgbmV4dFBhdGggPSBbIG5vZGUuaWQgXS5jb25jYXQocGF0aCk7XG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQobm9kZS5hbmNlc3RyeS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbm9kZTogcGFyZW50LFxuICAgICAgICAgICAgcGF0aDogbmV4dFBhdGhcbiAgICAgICAgICB9O1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xuXG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcbiAgICAgIHZhciBuZXdBbmNlc3RvciA9ICFuYW1lSW5kZXguaGFzKG5vZGUuaWQpO1xuICAgICAgaWYobmV3QW5jZXN0b3Ipe1xuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcbiAgICAgICAgICBwYXJlbnRzOiAobm9kZS5hbmNlc3RyeSB8fCBbXSkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgZmxhZ2dlZC5hZGQobm9kZS5pZClcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkSWRlbnRpZmllcil7XG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xuICAgICAgICAgIGlmKCFvZmZzZXRzKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNoaWxkSUQgPSBwYXRoW29mZnNldHNbMV1dO1xuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgIHBhcmVudDogbm9kZS5pZCxcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCl7XG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXG4gICAgICAgICAgcGF0aDogcGF0aFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYoIW5ld0FuY2VzdG9yKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYoIW5vZGUuYW5jZXN0cnkpe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XG4gICAgaWYoc3RvcmVkQ29lZmZpY2llbnRzLmhhcyhpZCkpe1xuICAgICAgcmV0dXJuIHN0b3JlZENvZWZmaWNpZW50cy5nZXQoaWQpO1xuICAgIH1cbiAgICB2YXIgbm9kZSA9IG5hbWVJbmRleC5nZXQoaWQpO1xuICAgIHZhciB2YWwgPSBub2RlLmNvbnZlcmdlbmNlcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xuICAgICAgICByZXR1cm4gc3VtICsgdmFsdWU7XG4gICAgICB9LCAxKSkgKiAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpO1xuICAgIH0sIDApO1xuICAgIHN0b3JlZENvZWZmaWNpZW50cy5zZXQoaWQsIHZhbCk7XG5cbiAgICByZXR1cm4gdmFsO1xuXG4gIH1cbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XG4gICAgdmFyIGNpLCBjaiwgbGksIGxqO1xuICAgIG91dGVybG9vcDpcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XG4gICAgICBmb3IoY2ogPSAwLCBsaiA9IGxpc3RCLmxlbmd0aDsgY2ogPCBsajsgY2orKyl7XG4gICAgICAgIGlmKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKXtcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoY2kgPT09IGxpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIFtjaSwgY2pdO1xuICB9XG59XG4iLCJ2YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xuXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xuXG52YXIgc2NoZW1hID0gY2FyQ29uc3RydWN0LmdlbmVyYXRlU2NoZW1hKGNhckNvbnN0YW50cyk7XG52YXIgcGlja1BhcmVudCA9IHJlcXVpcmUoXCIuL3BpY2tQYXJlbnRcIik7XG52YXIgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSByZXF1aXJlKFwiLi9zZWxlY3RGcm9tQWxsUGFyZW50c1wiKTtcbmNvbnN0IGNvbnN0YW50cyA9IHtcbiAgZ2VuZXJhdGlvblNpemU6IDIwLFxuICBzY2hlbWE6IHNjaGVtYSxcbiAgY2hhbXBpb25MZW5ndGg6IDEsXG4gIG11dGF0aW9uX3JhbmdlOiAxLFxuICBnZW5fbXV0YXRpb246IDAuMDUsXG59O1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpe1xuICB2YXIgY3VycmVudENob2ljZXMgPSBuZXcgTWFwKCk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKFxuICAgIHt9LFxuICAgIGNvbnN0YW50cyxcbiAgICB7XG4gICAgICBzZWxlY3RGcm9tQWxsUGFyZW50czogc2VsZWN0RnJvbUFsbFBhcmVudHMsXG4gICAgICBnZW5lcmF0ZVJhbmRvbTogcmVxdWlyZShcIi4vZ2VuZXJhdGVSYW5kb21cIiksXG4gICAgICBwaWNrUGFyZW50OiBwaWNrUGFyZW50LmJpbmQodm9pZCAwLCBjdXJyZW50Q2hvaWNlcyksXG4gICAgfVxuICApO1xufVxubW9kdWxlLmV4cG9ydHMuY29uc3RhbnRzID0gY29uc3RhbnRzXG4iLCJ2YXIgbkF0dHJpYnV0ZXMgPSAxNTtcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcblxuZnVuY3Rpb24gcGlja1BhcmVudChjdXJyZW50Q2hvaWNlcywgY2hvb3NlSWQsIGtleSAvKiAsIHBhcmVudHMgKi8pe1xuICBpZighY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSl7XG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxuICB9XG4gIC8vIGNvbnNvbGUubG9nKGNob29zZUlkKTtcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcbiAgLy8gY29uc29sZS5sb2coc3RhdGUuY3VycGFyZW50KTtcbiAgc3RhdGUuaSsrXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xuICAgIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XG4gICAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcbiAgfVxuICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xuICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xuXG4gIGZ1bmN0aW9uIGN3X2Nob29zZVBhcmVudChzdGF0ZSkge1xuICAgIHZhciBjdXJwYXJlbnQgPSBzdGF0ZS5jdXJwYXJlbnQ7XG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcbiAgICB2YXIgc3dhcFBvaW50MSA9IHN0YXRlLnN3YXBQb2ludDFcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcbiAgICBpZiAoKHN3YXBQb2ludDEgPT0gYXR0cmlidXRlSW5kZXgpIHx8IChzd2FwUG9pbnQyID09IGF0dHJpYnV0ZUluZGV4KSkge1xuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDFcbiAgICB9XG4gICAgcmV0dXJuIGN1cnBhcmVudFxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVBpY2soKXtcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcblxuICAgIHZhciBzd2FwUG9pbnQxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcbiAgICAgIHN3YXBQb2ludDIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcbiAgICB9XG4gICAgdmFyIGkgPSAwO1xuICAgIHJldHVybiB7XG4gICAgICBjdXJwYXJlbnQ6IGN1cnBhcmVudCxcbiAgICAgIGk6IGksXG4gICAgICBzd2FwUG9pbnQxOiBzd2FwUG9pbnQxLFxuICAgICAgc3dhcFBvaW50Mjogc3dhcFBvaW50MlxuICAgIH1cbiAgfVxufVxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xuXG5mdW5jdGlvbiBzaW1wbGVTZWxlY3QocGFyZW50cyl7XG4gIHZhciB0b3RhbFBhcmVudHMgPSBwYXJlbnRzLmxlbmd0aFxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XG4gIGlmIChyID09IDApXG4gICAgcmV0dXJuIDA7XG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcbiAgdmFyIHByZXZpb3VzUGFyZW50ID0gcGFyZW50c1twcmV2aW91c1BhcmVudEluZGV4XTtcbiAgdmFyIHZhbGlkUGFyZW50cyA9IHBhcmVudHMuZmlsdGVyKGZ1bmN0aW9uKHBhcmVudCwgaSl7XG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGNoaWxkID0ge1xuICAgICAgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLFxuICAgICAgYW5jZXN0cnk6IFtwcmV2aW91c1BhcmVudCwgcGFyZW50XS5tYXAoZnVuY3Rpb24ocCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IHAuZGVmLmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcbiAgICBjb25zb2xlLmxvZyhcImluYnJlZWRpbmcgY29lZmZpY2llbnRcIiwgaUNvKVxuICAgIGlmKGlDbyA+IDAuMjUpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSlcbiAgaWYodmFsaWRQYXJlbnRzLmxlbmd0aCA9PT0gMCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBhcmVudHMubGVuZ3RoKVxuICB9XG4gIHZhciB0b3RhbFNjb3JlID0gdmFsaWRQYXJlbnRzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBhcmVudCl7XG4gICAgcmV0dXJuIHN1bSArIHBhcmVudC5zY29yZS52O1xuICB9LCAwKTtcbiAgdmFyIHIgPSB0b3RhbFNjb3JlICogTWF0aC5yYW5kb20oKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKyl7XG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XG4gICAgaWYociA+IHNjb3JlKXtcbiAgICAgIHIgPSByIC0gc2NvcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaTtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXIpIHtcbiAgdmFyIG91dCA9IHtcbiAgICBjaGFzc2lzOiBnaG9zdF9nZXRfY2hhc3NpcyhjYXIuY2hhc3NpcyksXG4gICAgd2hlZWxzOiBbXSxcbiAgICBwb3M6IHt4OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLngsIHk6IGNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCkueX1cbiAgfTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhci53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXQud2hlZWxzW2ldID0gZ2hvc3RfZ2V0X3doZWVsKGNhci53aGVlbHNbaV0pO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xuICB2YXIgZ2MgPSBbXTtcblxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcblxuICAgIHZhciBwID0ge1xuICAgICAgdnR4OiBbXSxcbiAgICAgIG51bTogMFxuICAgIH1cblxuICAgIHAubnVtID0gcy5tX3ZlcnRleENvdW50O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzLm1fdmVydGV4Q291bnQ7IGkrKykge1xuICAgICAgcC52dHgucHVzaChjLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzW2ldKSk7XG4gICAgfVxuXG4gICAgZ2MucHVzaChwKTtcbiAgfVxuXG4gIHJldHVybiBnYztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3doZWVsKHcpIHtcbiAgdmFyIGd3ID0gW107XG5cbiAgZm9yICh2YXIgZiA9IHcuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG5cbiAgICB2YXIgYyA9IHtcbiAgICAgIHBvczogdy5HZXRXb3JsZFBvaW50KHMubV9wKSxcbiAgICAgIHJhZDogcy5tX3JhZGl1cyxcbiAgICAgIGFuZzogdy5tX3N3ZWVwLmFcbiAgICB9XG5cbiAgICBndy5wdXNoKGMpO1xuICB9XG5cbiAgcmV0dXJuIGd3O1xufVxuIiwiXG52YXIgZ2hvc3RfZ2V0X2ZyYW1lID0gcmVxdWlyZShcIi4vY2FyLXRvLWdob3N0LmpzXCIpO1xuXG52YXIgZW5hYmxlX2dob3N0ID0gdHJ1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdob3N0X2NyZWF0ZV9yZXBsYXk6IGdob3N0X2NyZWF0ZV9yZXBsYXksXG4gIGdob3N0X2NyZWF0ZV9naG9zdDogZ2hvc3RfY3JlYXRlX2dob3N0LFxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXG4gIGdob3N0X3Jlc3VtZTogZ2hvc3RfcmVzdW1lLFxuICBnaG9zdF9nZXRfcG9zaXRpb246IGdob3N0X2dldF9wb3NpdGlvbixcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxuICBnaG9zdF9tb3ZlX2ZyYW1lOiBnaG9zdF9tb3ZlX2ZyYW1lLFxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lOiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lLFxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxuICBnaG9zdF9yZXNldF9naG9zdDogZ2hvc3RfcmVzZXRfZ2hvc3Rcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX3JlcGxheSgpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBudW1fZnJhbWVzOiAwLFxuICAgIGZyYW1lczogW10sXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX2dob3N0KCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHJlcGxheTogbnVsbCxcbiAgICBmcmFtZTogMCxcbiAgICBkaXN0OiAtMTAwXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lID0gMDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcGF1c2UoZ2hvc3QpIHtcbiAgaWYgKGdob3N0ICE9IG51bGwpXG4gICAgZ2hvc3Qub2xkX2ZyYW1lID0gZ2hvc3QuZnJhbWU7XG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XG4gIGlmIChnaG9zdCAhPSBudWxsKVxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3Qub2xkX2ZyYW1lO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5mcmFtZSA8IDApXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcbiAgcmV0dXJuIGZyYW1lLnBvcztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY29tcGFyZV90b19yZXBsYXkocmVwbGF5LCBnaG9zdCwgbWF4KSB7XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAocmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGlmIChnaG9zdC5kaXN0IDwgbWF4KSB7XG4gICAgZ2hvc3QucmVwbGF5ID0gcmVwbGF5O1xuICAgIGdob3N0LmRpc3QgPSBtYXg7XG4gICAgZ2hvc3QuZnJhbWUgPSAwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lKys7XG4gIGlmIChnaG9zdC5mcmFtZSA+PSBnaG9zdC5yZXBsYXkubnVtX2ZyYW1lcylcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0LnJlcGxheS5udW1fZnJhbWVzIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShyZXBsYXksIGNhcikge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm47XG4gIGlmIChyZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgdmFyIGZyYW1lID0gZ2hvc3RfZ2V0X2ZyYW1lKGNhcik7XG4gIHJlcGxheS5mcmFtZXMucHVzaChmcmFtZSk7XG4gIHJlcGxheS5udW1fZnJhbWVzKys7XG59XG5cbmZ1bmN0aW9uIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKSB7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0LnJlcGxheSA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcblxuICAvLyB3aGVlbCBzdHlsZVxuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmcmFtZS53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciB3IGluIGZyYW1lLndoZWVsc1tpXSkge1xuICAgICAgZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBmcmFtZS53aGVlbHNbaV1bd10ucG9zLCBmcmFtZS53aGVlbHNbaV1bd10ucmFkLCBmcmFtZS53aGVlbHNbaV1bd10uYW5nKTtcbiAgICB9XG4gIH1cblxuICAvLyBjaGFzc2lzIHN0eWxlXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBmb3IgKHZhciBjIGluIGZyYW1lLmNoYXNzaXMpXG4gICAgZ2hvc3RfZHJhd19wb2x5KGN0eCwgZnJhbWUuY2hhc3Npc1tjXS52dHgsIGZyYW1lLmNoYXNzaXNbY10ubnVtKTtcbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9kcmF3X3BvbHkoY3R4LCB2dHgsIG5fdnR4KSB7XG4gIGN0eC5tb3ZlVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgY3R4LmxpbmVUbyh2dHhbaV0ueCwgdnR4W2ldLnkpO1xuICB9XG4gIGN0eC5saW5lVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUpIHtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKGNlbnRlci54LCBjZW50ZXIueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XG5cbiAgY3R4Lm1vdmVUbyhjZW50ZXIueCwgY2VudGVyLnkpO1xuICBjdHgubGluZVRvKGNlbnRlci54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBjZW50ZXIueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwiLyogZ2xvYmFscyBkb2N1bWVudCBwZXJmb3JtYW5jZSBsb2NhbFN0b3JhZ2UgYWxlcnQgY29uZmlybSBidG9hIEhUTUxEaXZFbGVtZW50ICovXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xuLy8gR2xvYmFsIFZhcnNcblxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xudmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xuXG52YXIgbWFuYWdlUm91bmQgPSByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qc1wiKTtcblxudmFyIGdob3N0X2ZucyA9IHJlcXVpcmUoXCIuL2dob3N0L2luZGV4LmpzXCIpO1xuXG52YXIgZHJhd0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXIuanNcIik7XG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xudmFyIGN3X2NsZWFyR3JhcGhpY3MgPSBncmFwaF9mbnMuY2xlYXJHcmFwaGljcztcbnZhciBjd19kcmF3Rmxvb3IgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctZmxvb3IuanNcIik7XG5cbnZhciBnaG9zdF9kcmF3X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2RyYXdfZnJhbWU7XG52YXIgZ2hvc3RfY3JlYXRlX2dob3N0ID0gZ2hvc3RfZm5zLmdob3N0X2NyZWF0ZV9naG9zdDtcbnZhciBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2FkZF9yZXBsYXlfZnJhbWU7XG52YXIgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY29tcGFyZV90b19yZXBsYXk7XG52YXIgZ2hvc3RfZ2V0X3Bvc2l0aW9uID0gZ2hvc3RfZm5zLmdob3N0X2dldF9wb3NpdGlvbjtcbnZhciBnaG9zdF9tb3ZlX2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X21vdmVfZnJhbWU7XG52YXIgZ2hvc3RfcmVzZXRfZ2hvc3QgPSBnaG9zdF9mbnMuZ2hvc3RfcmVzZXRfZ2hvc3RcbnZhciBnaG9zdF9wYXVzZSA9IGdob3N0X2Zucy5naG9zdF9wYXVzZTtcbnZhciBnaG9zdF9yZXN1bWUgPSBnaG9zdF9mbnMuZ2hvc3RfcmVzdW1lO1xudmFyIGdob3N0X2NyZWF0ZV9yZXBsYXkgPSBnaG9zdF9mbnMuZ2hvc3RfY3JlYXRlX3JlcGxheTtcblxudmFyIGN3X0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXItc3RhdHMuanNcIik7XG52YXIgZ2hvc3Q7XG52YXIgY2FyTWFwID0gbmV3IE1hcCgpO1xuXG52YXIgZG9EcmF3ID0gdHJ1ZTtcbnZhciBjd19wYXVzZWQgPSBmYWxzZTtcblxudmFyIGJveDJkZnBzID0gNjA7XG52YXIgc2NyZWVuZnBzID0gNjA7XG52YXIgc2tpcFRpY2tzID0gTWF0aC5yb3VuZCgxMDAwIC8gYm94MmRmcHMpO1xudmFyIG1heEZyYW1lU2tpcCA9IHNraXBUaWNrcyAqIDI7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5ib3hcIik7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxudmFyIGNhbWVyYSA9IHtcbiAgc3BlZWQ6IDAuMDUsXG4gIHBvczoge1xuICAgIHg6IDAsIHk6IDBcbiAgfSxcbiAgdGFyZ2V0OiAtMSxcbiAgem9vbTogNzBcbn1cblxudmFyIG1pbmltYXBjYW1lcmEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBjYW1lcmFcIikuc3R5bGU7XG52YXIgbWluaW1hcGhvbGRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbWluaW1hcGhvbGRlclwiKTtcblxudmFyIG1pbmltYXBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBcIik7XG52YXIgbWluaW1hcGN0eCA9IG1pbmltYXBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xudmFyIG1pbmltYXBzY2FsZSA9IDM7XG52YXIgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcbnZhciBmb2dkaXN0YW5jZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGZvZ1wiKS5zdHlsZTtcblxuXG52YXIgY2FyQ29uc3RhbnRzID0gY2FyQ29uc3RydWN0LmNhckNvbnN0YW50cygpO1xuXG5cbnZhciBtYXhfY2FyX2hlYWx0aCA9IGJveDJkZnBzICogMTA7XG5cbnZhciBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcblxudmFyIGRpc3RhbmNlTWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRpc3RhbmNlbWV0ZXJcIik7XG52YXIgaGVpZ2h0TWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlaWdodG1ldGVyXCIpO1xuXG52YXIgbGVhZGVyUG9zaXRpb24gPSB7XG4gIHg6IDAsIHk6IDBcbn1cblxubWluaW1hcGNhbWVyYS53aWR0aCA9IDEyICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xubWluaW1hcGNhbWVyYS5oZWlnaHQgPSA2ICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xuXG5cbi8vID09PT09PT0gV09STEQgU1RBVEUgPT09PT09XG52YXIgZ2VuZXJhdGlvbkNvbmZpZyA9IHJlcXVpcmUoXCIuL2dlbmVyYXRpb24tY29uZmlnXCIpO1xuXG5cbnZhciB3b3JsZF9kZWYgPSB7XG4gIGdyYXZpdHk6IG5ldyBiMlZlYzIoMC4wLCAtOS44MSksXG4gIGRvU2xlZXA6IHRydWUsXG4gIGZsb29yc2VlZDogYnRvYShNYXRoLnNlZWRyYW5kb20oKSksXG4gIHRpbGVEaW1lbnNpb25zOiBuZXcgYjJWZWMyKDEuNSwgMC4xNSksXG4gIG1heEZsb29yVGlsZXM6IDIwMCxcbiAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXG4gIGJveDJkZnBzOiBib3gyZGZwcyxcbiAgbW90b3JTcGVlZDogMjAsXG4gIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcbiAgc2NoZW1hOiBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5zY2hlbWFcbn1cblxudmFyIGN3X2RlYWRDYXJzO1xudmFyIGdyYXBoU3RhdGUgPSB7XG4gIGN3X3RvcFNjb3JlczogW10sXG4gIGN3X2dyYXBoQXZlcmFnZTogW10sXG4gIGN3X2dyYXBoRWxpdGU6IFtdLFxuICBjd19ncmFwaFRvcDogW10sXG59O1xuXG5mdW5jdGlvbiByZXNldEdyYXBoU3RhdGUoKXtcbiAgZ3JhcGhTdGF0ZSA9IHtcbiAgICBjd190b3BTY29yZXM6IFtdLFxuICAgIGN3X2dyYXBoQXZlcmFnZTogW10sXG4gICAgY3dfZ3JhcGhFbGl0ZTogW10sXG4gICAgY3dfZ3JhcGhUb3A6IFtdLFxuICB9O1xufVxuXG5cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxudmFyIGdlbmVyYXRpb25TdGF0ZTtcblxuLy8gPT09PT09PT0gQWN0aXZpdHkgU3RhdGUgPT09PVxudmFyIGN1cnJlbnRSdW5uZXI7XG52YXIgbG9vcHMgPSAwO1xudmFyIG5leHRHYW1lVGljayA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpO1xuXG5mdW5jdGlvbiBzaG93RGlzdGFuY2UoZGlzdGFuY2UsIGhlaWdodCkge1xuICBkaXN0YW5jZU1ldGVyLmlubmVySFRNTCA9IGRpc3RhbmNlICsgXCIgbWV0ZXJzPGJyIC8+XCI7XG4gIGhlaWdodE1ldGVyLmlubmVySFRNTCA9IGhlaWdodCArIFwiIG1ldGVyc1wiO1xuICBpZiAoZGlzdGFuY2UgPiBtaW5pbWFwZm9nZGlzdGFuY2UpIHtcbiAgICBmb2dkaXN0YW5jZS53aWR0aCA9IDgwMCAtIE1hdGgucm91bmQoZGlzdGFuY2UgKyAxNSkgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XG4gICAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gZGlzdGFuY2U7XG4gIH1cbn1cblxuXG5cbi8qID09PSBFTkQgQ2FyID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKiA9PT09IEdlbmVyYXRpb24gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmZ1bmN0aW9uIGN3X2dlbmVyYXRpb25aZXJvKCkge1xuXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XG59XG5cbmZ1bmN0aW9uIHJlc2V0Q2FyVUkoKXtcbiAgY3dfZGVhZENhcnMgPSAwO1xuICBsZWFkZXJQb3NpdGlvbiA9IHtcbiAgICB4OiAwLCB5OiAwXG4gIH07XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlci50b1N0cmluZygpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwb3B1bGF0aW9uXCIpLmlubmVySFRNTCA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplLnRvU3RyaW5nKCk7XG59XG5cbi8qID09PT0gRU5EIEdlbnJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09PSBEcmF3aW5nID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5mdW5jdGlvbiBjd19kcmF3U2NyZWVuKCkge1xuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICBjdHguc2F2ZSgpO1xuICBjd19zZXRDYW1lcmFQb3NpdGlvbigpO1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueTtcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcbiAgY3R4LnRyYW5zbGF0ZSgyMDAgLSAoY2FtZXJhX3ggKiB6b29tKSwgMjAwICsgKGNhbWVyYV95ICogem9vbSkpO1xuICBjdHguc2NhbGUoem9vbSwgLXpvb20pO1xuICBjd19kcmF3Rmxvb3IoY3R4LCBjYW1lcmEsIGZsb29yVGlsZXMpO1xuICBnaG9zdF9kcmF3X2ZyYW1lKGN0eCwgZ2hvc3QsIGNhbWVyYSk7XG4gIGN3X2RyYXdDYXJzKCk7XG4gIGN0eC5yZXN0b3JlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X21pbmltYXBDYW1lcmEoLyogeCwgeSovKSB7XG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueFxuICB2YXIgY2FtZXJhX3kgPSBjYW1lcmEucG9zLnlcbiAgbWluaW1hcGNhbWVyYS5sZWZ0ID0gTWF0aC5yb3VuZCgoMiArIGNhbWVyYV94KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XG4gIG1pbmltYXBjYW1lcmEudG9wID0gTWF0aC5yb3VuZCgoMzEgLSBjYW1lcmFfeSkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xufVxuXG5mdW5jdGlvbiBjd19zZXRDYW1lcmFUYXJnZXQoaykge1xuICBjYW1lcmEudGFyZ2V0ID0gaztcbn1cblxuZnVuY3Rpb24gY3dfc2V0Q2FtZXJhUG9zaXRpb24oKSB7XG4gIHZhciBjYW1lcmFUYXJnZXRQb3NpdGlvblxuICBpZiAoY2FtZXJhLnRhcmdldCAhPT0gLTEpIHtcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGNhck1hcC5nZXQoY2FtZXJhLnRhcmdldCkuZ2V0UG9zaXRpb24oKTtcbiAgfSBlbHNlIHtcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGxlYWRlclBvc2l0aW9uO1xuICB9XG4gIHZhciBkaWZmX3kgPSBjYW1lcmEucG9zLnkgLSBjYW1lcmFUYXJnZXRQb3NpdGlvbi55O1xuICB2YXIgZGlmZl94ID0gY2FtZXJhLnBvcy54IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueDtcbiAgY2FtZXJhLnBvcy55IC09IGNhbWVyYS5zcGVlZCAqIGRpZmZfeTtcbiAgY2FtZXJhLnBvcy54IC09IGNhbWVyYS5zcGVlZCAqIGRpZmZfeDtcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XG59XG5cbmZ1bmN0aW9uIGN3X2RyYXdHaG9zdFJlcGxheSgpIHtcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XG4gIHZhciBjYXJQb3NpdGlvbiA9IGdob3N0X2dldF9wb3NpdGlvbihnaG9zdCk7XG4gIGNhbWVyYS5wb3MueCA9IGNhclBvc2l0aW9uLng7XG4gIGNhbWVyYS5wb3MueSA9IGNhclBvc2l0aW9uLnk7XG4gIGN3X21pbmltYXBDYW1lcmEoY2FtZXJhLnBvcy54LCBjYW1lcmEucG9zLnkpO1xuICBzaG93RGlzdGFuY2UoXG4gICAgTWF0aC5yb3VuZChjYXJQb3NpdGlvbi54ICogMTAwKSAvIDEwMCxcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnkgKiAxMDApIC8gMTAwXG4gICk7XG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgY3R4LnNhdmUoKTtcbiAgY3R4LnRyYW5zbGF0ZShcbiAgICAyMDAgLSAoY2FyUG9zaXRpb24ueCAqIGNhbWVyYS56b29tKSxcbiAgICAyMDAgKyAoY2FyUG9zaXRpb24ueSAqIGNhbWVyYS56b29tKVxuICApO1xuICBjdHguc2NhbGUoY2FtZXJhLnpvb20sIC1jYW1lcmEuem9vbSk7XG4gIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCk7XG4gIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xuICBjd19kcmF3Rmxvb3IoY3R4LCBjYW1lcmEsIGZsb29yVGlsZXMpO1xuICBjdHgucmVzdG9yZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2RyYXdDYXJzKCkge1xuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XG4gIGZvciAodmFyIGsgPSAoY3dfY2FyQXJyYXkubGVuZ3RoIC0gMSk7IGsgPj0gMDsgay0tKSB7XG4gICAgdmFyIG15Q2FyID0gY3dfY2FyQXJyYXlba107XG4gICAgZHJhd0NhcihjYXJDb25zdGFudHMsIG15Q2FyLCBjYW1lcmEsIGN0eClcbiAgfVxufVxuXG5mdW5jdGlvbiB0b2dnbGVEaXNwbGF5KCkge1xuICBjYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XG4gIGlmIChkb0RyYXcpIHtcbiAgICBkb0RyYXcgPSBmYWxzZTtcbiAgICBjd19zdG9wU2ltdWxhdGlvbigpO1xuICAgIGN3X3J1bm5pbmdJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB0aW1lID0gcGVyZm9ybWFuY2Uubm93KCkgKyAoMTAwMCAvIHNjcmVlbmZwcyk7XG4gICAgICB3aGlsZSAodGltZSA+IHBlcmZvcm1hbmNlLm5vdygpKSB7XG4gICAgICAgIHNpbXVsYXRpb25TdGVwKCk7XG4gICAgICB9XG4gICAgfSwgMSk7XG4gIH0gZWxzZSB7XG4gICAgZG9EcmF3ID0gdHJ1ZTtcbiAgICBjbGVhckludGVydmFsKGN3X3J1bm5pbmdJbnRlcnZhbCk7XG4gICAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3dfZHJhd01pbmlNYXAoKSB7XG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcbiAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcbiAgZm9nZGlzdGFuY2Uud2lkdGggPSBcIjgwMHB4XCI7XG4gIG1pbmltYXBjYW52YXMud2lkdGggPSBtaW5pbWFwY2FudmFzLndpZHRoO1xuICBtaW5pbWFwY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XG4gIG1pbmltYXBjdHguYmVnaW5QYXRoKCk7XG4gIG1pbmltYXBjdHgubW92ZVRvKDAsIDM1ICogbWluaW1hcHNjYWxlKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBmbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XG4gICAgbGFzdF90aWxlID0gZmxvb3JUaWxlc1trXTtcbiAgICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gICAgdmFyIGxhc3Rfd29ybGRfY29vcmRzID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQobGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXSk7XG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3Rfd29ybGRfY29vcmRzO1xuICAgIG1pbmltYXBjdHgubGluZVRvKCh0aWxlX3Bvc2l0aW9uLnggKyA1KSAqIG1pbmltYXBzY2FsZSwgKC10aWxlX3Bvc2l0aW9uLnkgKyAzNSkgKiBtaW5pbWFwc2NhbGUpO1xuICB9XG4gIG1pbmltYXBjdHguc3Ryb2tlKCk7XG59XG5cbi8qID09PT0gRU5EIERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbnZhciB1aUxpc3RlbmVycyA9IHtcbiAgcHJlQ2FyU3RlcDogZnVuY3Rpb24oKXtcbiAgICBnaG9zdF9tb3ZlX2ZyYW1lKGdob3N0KTtcbiAgfSxcbiAgY2FyU3RlcChjYXIpe1xuICAgIHVwZGF0ZUNhclVJKGNhcik7XG4gIH0sXG4gIGNhckRlYXRoKGNhckluZm8pe1xuXG4gICAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xuXG4gICAgdmFyIGNhciA9IGNhckluZm8uY2FyLCBzY29yZSA9IGNhckluZm8uc2NvcmU7XG4gICAgY2FyTWFwLmdldChjYXJJbmZvKS5raWxsKGN1cnJlbnRSdW5uZXIsIHdvcmxkX2RlZik7XG5cbiAgICAvLyByZWZvY3VzIGNhbWVyYSB0byBsZWFkZXIgb24gZGVhdGhcbiAgICBpZiAoY2FtZXJhLnRhcmdldCA9PSBjYXJJbmZvKSB7XG4gICAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhzY29yZSk7XG4gICAgY2FyTWFwLmRlbGV0ZShjYXJJbmZvKTtcbiAgICBnaG9zdF9jb21wYXJlX3RvX3JlcGxheShjYXIucmVwbGF5LCBnaG9zdCwgc2NvcmUudik7XG4gICAgc2NvcmUuaSA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xuXG4gICAgY3dfZGVhZENhcnMrKztcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gKGdlbmVyYXRpb25TaXplIC0gY3dfZGVhZENhcnMpLnRvU3RyaW5nKCk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhsZWFkZXJQb3NpdGlvbi5sZWFkZXIsIGspXG4gICAgaWYgKGxlYWRlclBvc2l0aW9uLmxlYWRlciA9PSBrKSB7XG4gICAgICAvLyBsZWFkZXIgaXMgZGVhZCwgZmluZCBuZXcgbGVhZGVyXG4gICAgICBjd19maW5kTGVhZGVyKCk7XG4gICAgfVxuICB9LFxuICBnZW5lcmF0aW9uRW5kKHJlc3VsdHMpe1xuICAgIGNsZWFudXBSb3VuZChyZXN1bHRzKTtcbiAgICByZXR1cm4gY3dfbmV3Um91bmQocmVzdWx0cyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2ltdWxhdGlvblN0ZXAoKSB7ICBcbiAgY3VycmVudFJ1bm5lci5zdGVwKCk7XG4gIHNob3dEaXN0YW5jZShcbiAgICBNYXRoLnJvdW5kKGxlYWRlclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2FtZUxvb3AoKSB7XG4gIGxvb3BzID0gMDtcbiAgd2hpbGUgKCFjd19wYXVzZWQgJiYgKG5ldyBEYXRlKS5nZXRUaW1lKCkgPiBuZXh0R2FtZVRpY2sgJiYgbG9vcHMgPCBtYXhGcmFtZVNraXApIHsgICBcbiAgICBuZXh0R2FtZVRpY2sgKz0gc2tpcFRpY2tzO1xuICAgIGxvb3BzKys7XG4gIH1cbiAgc2ltdWxhdGlvblN0ZXAoKTtcbiAgY3dfZHJhd1NjcmVlbigpO1xuXG4gIGlmKCFjd19wYXVzZWQpIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVDYXJVSShjYXJJbmZvKXtcbiAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xuICB2YXIgY2FyID0gY2FyTWFwLmdldChjYXJJbmZvKTtcbiAgdmFyIHBvc2l0aW9uID0gY2FyLmdldFBvc2l0aW9uKCk7XG5cbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShjYXIucmVwbGF5LCBjYXIuY2FyLmNhcik7XG4gIGNhci5taW5pbWFwbWFya2VyLnN0eWxlLmxlZnQgPSBNYXRoLnJvdW5kKChwb3NpdGlvbi54ICsgNSkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xuICBjYXIuaGVhbHRoQmFyLndpZHRoID0gTWF0aC5yb3VuZCgoY2FyLmNhci5zdGF0ZS5oZWFsdGggLyBtYXhfY2FyX2hlYWx0aCkgKiAxMDApICsgXCIlXCI7XG4gIGlmIChwb3NpdGlvbi54ID4gbGVhZGVyUG9zaXRpb24ueCkge1xuICAgIGxlYWRlclBvc2l0aW9uID0gcG9zaXRpb247XG4gICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcbiAgICAvLyBjb25zb2xlLmxvZyhcIm5ldyBsZWFkZXI6IFwiLCBrKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19maW5kTGVhZGVyKCkge1xuICB2YXIgbGVhZCA9IDA7XG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBjd19jYXJBcnJheS5sZW5ndGg7IGsrKykge1xuICAgIGlmICghY3dfY2FyQXJyYXlba10uYWxpdmUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgcG9zaXRpb24gPSBjd19jYXJBcnJheVtrXS5nZXRQb3NpdGlvbigpO1xuICAgIGlmIChwb3NpdGlvbi54ID4gbGVhZCkge1xuICAgICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZhc3RGb3J3YXJkKCl7XG4gIHZhciBnZW4gPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcbiAgd2hpbGUoZ2VuID09PSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcil7XG4gICAgY3VycmVudFJ1bm5lci5zdGVwKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYW51cFJvdW5kKHJlc3VsdHMpe1xuXG4gIHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIGlmIChhLnNjb3JlLnYgPiBiLnNjb3JlLnYpIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gMVxuICAgIH1cbiAgfSlcbiAgZ3JhcGhTdGF0ZSA9IHBsb3RfZ3JhcGhzKFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIiksXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIiksXG4gICAgbnVsbCxcbiAgICBncmFwaFN0YXRlLFxuICAgIHJlc3VsdHNcbiAgKTtcbn1cblxuZnVuY3Rpb24gY3dfbmV3Um91bmQocmVzdWx0cykge1xuICBjYW1lcmEucG9zLnggPSBjYW1lcmEucG9zLnkgPSAwO1xuICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xuXG4gIGdlbmVyYXRpb25TdGF0ZSA9IG1hbmFnZVJvdW5kLm5leHRHZW5lcmF0aW9uKFxuICAgIGdlbmVyYXRpb25TdGF0ZSwgcmVzdWx0cywgZ2VuZXJhdGlvbkNvbmZpZygpXG4gICk7XG4gIGlmICh3b3JsZF9kZWYubXV0YWJsZV9mbG9vcikge1xuICAgIC8vIEdIT1NUIERJU0FCTEVEXG4gICAgZ2hvc3QgPSBudWxsO1xuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBSRS1FTkFCTEUgR0hPU1RcbiAgICBnaG9zdF9yZXNldF9naG9zdChnaG9zdCk7XG4gIH1cbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcbiAgc2V0dXBDYXJVSSgpO1xuICBjd19kcmF3TWluaU1hcCgpO1xuICByZXNldENhclVJKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3N0YXJ0U2ltdWxhdGlvbigpIHtcbiAgY3dfcGF1c2VkID0gZmFsc2U7XG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xufVxuXG5mdW5jdGlvbiBjd19zdG9wU2ltdWxhdGlvbigpIHtcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uVUkoKSB7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBcIlwiO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhcnNcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgY3dfY2xlYXJHcmFwaGljcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpKTtcbiAgcmVzZXRHcmFwaFN0YXRlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Jlc2V0V29ybGQoKSB7XG4gIGRvRHJhdyA9IHRydWU7XG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ld3NlZWRcIikudmFsdWU7XG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCk7XG5cbiAgTWF0aC5zZWVkcmFuZG9tKCk7XG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bihcbiAgICB3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVyc1xuICApO1xuXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XG4gIHJlc2V0Q2FyVUkoKTtcbiAgc2V0dXBDYXJVSSgpXG4gIGN3X2RyYXdNaW5pTWFwKCk7XG5cbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XG59XG5cbmZ1bmN0aW9uIHNldHVwQ2FyVUkoKXtcbiAgY3VycmVudFJ1bm5lci5jYXJzLm1hcChmdW5jdGlvbihjYXJJbmZvKXtcbiAgICB2YXIgY2FyID0gbmV3IGN3X0NhcihjYXJJbmZvLCBjYXJNYXApO1xuICAgIGNhck1hcC5zZXQoY2FySW5mbywgY2FyKTtcbiAgICBjYXIucmVwbGF5ID0gZ2hvc3RfY3JlYXRlX3JlcGxheSgpO1xuICAgIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUoY2FyLnJlcGxheSwgY2FyLmNhci5jYXIpO1xuICB9KVxufVxuXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmFzdC1mb3J3YXJkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBmYXN0Rm9yd2FyZCgpXG59KTtcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNzYXZlLXByb2dyZXNzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBzYXZlUHJvZ3Jlc3MoKVxufSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjcmVzdG9yZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgcmVzdG9yZVByb2dyZXNzKClcbn0pO1xuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1kaXNwbGF5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICB0b2dnbGVEaXNwbGF5KClcbn0pXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbmV3LXBvcHVsYXRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKClcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcbiAgcmVzZXRDYXJVSSgpO1xufSlcblxuZnVuY3Rpb24gc2F2ZVByb2dyZXNzKCkge1xuICBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID0gSlNPTi5zdHJpbmdpZnkoZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24pO1xuICBsb2NhbFN0b3JhZ2UuY3dfZ2VuQ291bnRlciA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xuICBsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QgPSBKU09OLnN0cmluZ2lmeShnaG9zdCk7XG4gIGxvY2FsU3RvcmFnZS5jd190b3BTY29yZXMgPSBKU09OLnN0cmluZ2lmeShncmFwaFN0YXRlLmN3X3RvcFNjb3Jlcyk7XG4gIGxvY2FsU3RvcmFnZS5jd19mbG9vclNlZWQgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xufVxuXG5mdW5jdGlvbiByZXN0b3JlUHJvZ3Jlc3MoKSB7XG4gIGlmICh0eXBlb2YgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9PSAndW5kZWZpbmVkJyB8fCBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID09IG51bGwpIHtcbiAgICBhbGVydChcIk5vIHNhdmVkIHByb2dyZXNzIGZvdW5kXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBjd19zdG9wU2ltdWxhdGlvbigpO1xuICBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbik7XG4gIGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyID0gbG9jYWxTdG9yYWdlLmN3X2dlbkNvdW50ZXI7XG4gIGdob3N0ID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QpO1xuICBncmFwaFN0YXRlLmN3X3RvcFNjb3JlcyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3RvcFNjb3Jlcyk7XG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBsb2NhbFN0b3JhZ2UuY3dfZmxvb3JTZWVkO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ld3NlZWRcIikudmFsdWUgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xuXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XG4gIGN3X2RyYXdNaW5pTWFwKCk7XG4gIE1hdGguc2VlZHJhbmRvbSgpO1xuXG4gIHJlc2V0Q2FyVUkoKTtcbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XG59XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY29uZmlybS1yZXNldFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgY3dfY29uZmlybVJlc2V0V29ybGQoKVxufSlcblxuZnVuY3Rpb24gY3dfY29uZmlybVJlc2V0V29ybGQoKSB7XG4gIGlmIChjb25maXJtKCdSZWFsbHkgcmVzZXQgd29ybGQ/JykpIHtcbiAgICBjd19yZXNldFdvcmxkKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8vIGdob3N0IHJlcGxheSBzdHVmZlxuXG5cbmZ1bmN0aW9uIGN3X3BhdXNlU2ltdWxhdGlvbigpIHtcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcbiAgZ2hvc3RfcGF1c2UoZ2hvc3QpO1xufVxuXG5mdW5jdGlvbiBjd19yZXN1bWVTaW11bGF0aW9uKCkge1xuICBjd19wYXVzZWQgPSBmYWxzZTtcbiAgZ2hvc3RfcmVzdW1lKGdob3N0KTtcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XG59XG5cbmZ1bmN0aW9uIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKSB7XG4gIGlmICghZG9EcmF3KSB7XG4gICAgdG9nZ2xlRGlzcGxheSgpO1xuICB9XG4gIGN3X3BhdXNlU2ltdWxhdGlvbigpO1xuICBjd19naG9zdFJlcGxheUludGVydmFsID0gc2V0SW50ZXJ2YWwoY3dfZHJhd0dob3N0UmVwbGF5LCBNYXRoLnJvdW5kKDEwMDAgLyBzY3JlZW5mcHMpKTtcbn1cblxuZnVuY3Rpb24gY3dfc3RvcEdob3N0UmVwbGF5KCkge1xuICBjbGVhckludGVydmFsKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwpO1xuICBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcbiAgY3dfZmluZExlYWRlcigpO1xuICBjYW1lcmEucG9zLnggPSBsZWFkZXJQb3NpdGlvbi54O1xuICBjYW1lcmEucG9zLnkgPSBsZWFkZXJQb3NpdGlvbi55O1xuICBjd19yZXN1bWVTaW11bGF0aW9uKCk7XG59XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlLWdob3N0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbihlKXtcbiAgY3dfdG9nZ2xlR2hvc3RSZXBsYXkoZS50YXJnZXQpXG59KVxuXG5mdW5jdGlvbiBjd190b2dnbGVHaG9zdFJlcGxheShidXR0b24pIHtcbiAgaWYgKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPT0gbnVsbCkge1xuICAgIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKTtcbiAgICBidXR0b24udmFsdWUgPSBcIlJlc3VtZSBzaW11bGF0aW9uXCI7XG4gIH0gZWxzZSB7XG4gICAgY3dfc3RvcEdob3N0UmVwbGF5KCk7XG4gICAgYnV0dG9uLnZhbHVlID0gXCJWaWV3IHRvcCByZXBsYXlcIjtcbiAgfVxufVxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmIEVORFxuXG4vLyBpbml0aWFsIHN0dWZmLCBvbmx5IGNhbGxlZCBvbmNlIChob3BlZnVsbHkpXG5mdW5jdGlvbiBjd19pbml0KCkge1xuICAvLyBjbG9uZSBzaWx2ZXIgZG90IGFuZCBoZWFsdGggYmFyXG4gIHZhciBtbW0gPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnbWluaW1hcG1hcmtlcicpWzBdO1xuICB2YXIgaGJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdoZWFsdGhiYXInKVswXTtcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XG5cbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG5cbiAgICAvLyBtaW5pbWFwIG1hcmtlcnNcbiAgICB2YXIgbmV3YmFyID0gbW1tLmNsb25lTm9kZSh0cnVlKTtcbiAgICBuZXdiYXIuaWQgPSBcImJhclwiICsgaztcbiAgICBuZXdiYXIuc3R5bGUucGFkZGluZ1RvcCA9IGsgKiA5ICsgXCJweFwiO1xuICAgIG1pbmltYXBob2xkZXIuYXBwZW5kQ2hpbGQobmV3YmFyKTtcblxuICAgIC8vIGhlYWx0aCBiYXJzXG4gICAgdmFyIG5ld2hlYWx0aCA9IGhiYXIuY2xvbmVOb2RlKHRydWUpO1xuICAgIG5ld2hlYWx0aC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIkRJVlwiKVswXS5pZCA9IFwiaGVhbHRoXCIgKyBrO1xuICAgIG5ld2hlYWx0aC5jYXJfaW5kZXggPSBrO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIpLmFwcGVuZENoaWxkKG5ld2hlYWx0aCk7XG4gIH1cbiAgbW1tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobW1tKTtcbiAgaGJhci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGhiYXIpO1xuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XG4gIHJlc2V0Q2FyVUkoKTtcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcbiAgc2V0dXBDYXJVSSgpO1xuICBjd19kcmF3TWluaU1hcCgpO1xuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcbiAgXG59XG5cbmZ1bmN0aW9uIHJlbE1vdXNlQ29vcmRzKGV2ZW50KSB7XG4gIHZhciB0b3RhbE9mZnNldFggPSAwO1xuICB2YXIgdG90YWxPZmZzZXRZID0gMDtcbiAgdmFyIGNhbnZhc1ggPSAwO1xuICB2YXIgY2FudmFzWSA9IDA7XG4gIHZhciBjdXJyZW50RWxlbWVudCA9IHRoaXM7XG5cbiAgZG8ge1xuICAgIHRvdGFsT2Zmc2V0WCArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRMZWZ0IC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcbiAgICB0b3RhbE9mZnNldFkgKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0VG9wIC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgIGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQub2Zmc2V0UGFyZW50XG4gIH1cbiAgd2hpbGUgKGN1cnJlbnRFbGVtZW50KTtcblxuICBjYW52YXNYID0gZXZlbnQucGFnZVggLSB0b3RhbE9mZnNldFg7XG4gIGNhbnZhc1kgPSBldmVudC5wYWdlWSAtIHRvdGFsT2Zmc2V0WTtcblxuICByZXR1cm4ge3g6IGNhbnZhc1gsIHk6IGNhbnZhc1l9XG59XG5IVE1MRGl2RWxlbWVudC5wcm90b3R5cGUucmVsTW91c2VDb29yZHMgPSByZWxNb3VzZUNvb3Jkcztcbm1pbmltYXBob2xkZXIub25jbGljayA9IGZ1bmN0aW9uIChldmVudCkge1xuICB2YXIgY29vcmRzID0gbWluaW1hcGhvbGRlci5yZWxNb3VzZUNvb3JkcyhldmVudCk7XG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcbiAgdmFyIGNsb3Nlc3QgPSB7XG4gICAgdmFsdWU6IGN3X2NhckFycmF5WzBdLmNhcixcbiAgICBkaXN0OiBNYXRoLmFicygoKGN3X2NhckFycmF5WzBdLmdldFBvc2l0aW9uKCkueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KSxcbiAgICB4OiBjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnhcbiAgfVxuXG4gIHZhciBtYXhYID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjd19jYXJBcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwb3MgPSBjd19jYXJBcnJheVtpXS5nZXRQb3NpdGlvbigpO1xuICAgIHZhciBkaXN0ID0gTWF0aC5hYnMoKChwb3MueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KTtcbiAgICBpZiAoZGlzdCA8IGNsb3Nlc3QuZGlzdCkge1xuICAgICAgY2xvc2VzdC52YWx1ZSA9IGN3X2NhckFycmF5LmNhcjtcbiAgICAgIGNsb3Nlc3QuZGlzdCA9IGRpc3Q7XG4gICAgICBjbG9zZXN0LnggPSBwb3MueDtcbiAgICB9XG4gICAgbWF4WCA9IE1hdGgubWF4KHBvcy54LCBtYXhYKTtcbiAgfVxuXG4gIGlmIChjbG9zZXN0LnggPT0gbWF4WCkgeyAvLyBmb2N1cyBvbiBsZWFkZXIgYWdhaW5cbiAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xuICB9IGVsc2Uge1xuICAgIGN3X3NldENhbWVyYVRhcmdldChjbG9zZXN0LnZhbHVlKTtcbiAgfVxufVxuXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25yYXRlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0TXV0YXRpb24oZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9uc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldE11dGF0aW9uUmFuZ2UoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zsb29yXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0TXV0YWJsZUZsb29yKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxufSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZ3Jhdml0eVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldEdyYXZpdHkoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2VsaXRlc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldEVsaXRlU2l6ZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uKG11dGF0aW9uKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbl9tdXRhdGlvbiA9IHBhcnNlRmxvYXQobXV0YXRpb24pO1xufVxuXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvblJhbmdlKHJhbmdlKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLm11dGF0aW9uX3JhbmdlID0gcGFyc2VGbG9hdChyYW5nZSk7XG59XG5cbmZ1bmN0aW9uIGN3X3NldE11dGFibGVGbG9vcihjaG9pY2UpIHtcbiAgd29ybGRfZGVmLm11dGFibGVfZmxvb3IgPSAoY2hvaWNlID09IDEpO1xufVxuXG5mdW5jdGlvbiBjd19zZXRHcmF2aXR5KGNob2ljZSkge1xuICB3b3JsZF9kZWYuZ3Jhdml0eSA9IG5ldyBiMlZlYzIoMC4wLCAtcGFyc2VGbG9hdChjaG9pY2UpKTtcbiAgdmFyIHdvcmxkID0gY3VycmVudFJ1bm5lci5zY2VuZS53b3JsZFxuICAvLyBDSEVDSyBHUkFWSVRZIENIQU5HRVNcbiAgaWYgKHdvcmxkLkdldEdyYXZpdHkoKS55ICE9IHdvcmxkX2RlZi5ncmF2aXR5LnkpIHtcbiAgICB3b3JsZC5TZXRHcmF2aXR5KHdvcmxkX2RlZi5ncmF2aXR5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19zZXRFbGl0ZVNpemUoY2xvbmVzKSB7XG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmNoYW1waW9uTGVuZ3RoID0gcGFyc2VJbnQoY2xvbmVzLCAxMCk7XG59XG5cbmN3X2luaXQoKTtcbiIsInZhciByYW5kb20gPSByZXF1aXJlKFwiLi9yYW5kb20uanNcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGluc3RhbmNlLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcblxuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5jcmVhdGVOb3JtYWxzKHNjaGVtYVByb3AsIGdlbmVyYXRvcik7XG4gICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sIHsgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpIH0pO1xuICB9LFxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XG4gICAgdmFyIGlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzMik7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcmVudHNbcF1ba2V5XVtpXSk7XG4gICAgICB9XG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNyb3NzRGVmO1xuICAgIH0sIHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnRzLm1hcChmdW5jdGlvbihwYXJlbnQpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgfSk7XG4gIH0sXG4gIGNyZWF0ZU11dGF0ZWRDbG9uZShzY2hlbWEsIGdlbmVyYXRvciwgcGFyZW50LCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLm11dGF0ZU5vcm1hbHMoXG4gICAgICAgIHNjaGVtYVByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGVcbiAgICAgICk7XG4gICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH0sIHtcbiAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XG4gICAgfSk7XG4gIH0sXG4gIGFwcGx5VHlwZXMoc2NoZW1hLCBwYXJlbnQpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcbiAgICAgIHZhciB2YWx1ZXM7XG4gICAgICBzd2l0Y2goc2NoZW1hUHJvcC50eXBlKXtcbiAgICAgICAgY2FzZSBcInNodWZmbGVcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiZmxvYXRcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvRmxvYXQoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcbiAgICAgICAgY2FzZSBcImludGVnZXJcIjpcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9JbnRlZ2VyKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWApO1xuICAgICAgfVxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9LCB7XG4gICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxuICAgIH0pO1xuICB9LFxufVxuIiwidmFyIGNyZWF0ZSA9IHJlcXVpcmUoXCIuLi9jcmVhdGUtaW5zdGFuY2VcIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXG4gIG5leHRHZW5lcmF0aW9uOiBuZXh0R2VuZXJhdGlvblxufVxuXG5mdW5jdGlvbiBtYWtlX2RlZl9zdGFuZGFyZChkZWYpIHtcbiAgICB2YXIgZXh0ZW50cyA9IDE7XG5cbiAgICBkZWYudmVydGV4X2xpc3QgPSBbXG4gICAgICAgIGV4dGVudHMsXG5cbiAgICAgICAgZXh0ZW50cyAvIDIsXG4gICAgICAgIGV4dGVudHMgLyAyLFxuXG4gICAgICAgIGV4dGVudHMsXG5cbiAgICAgICAgZXh0ZW50cyAvIDIsXG4gICAgICAgIGV4dGVudHMgLyAyLFxuXG4gICAgICAgIGV4dGVudHMsXG5cbiAgICAgICAgZXh0ZW50cyAvIDQsXG4gICAgICAgIGV4dGVudHMgLyA0LFxuXG4gICAgICAgIDAsXG5cbiAgICAgICAgZXh0ZW50cyAvIDQsXG4gICAgICAgIGV4dGVudHMgLyA0XG4gICAgXTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKXtcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICBzY2hlbWEgPSBjb25maWcuc2NoZW1hO1xuICB2YXIgY3dfY2FyR2VuZXJhdGlvbiA9IFtdO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcbiAgICB2YXIgZGVmID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZnVuY3Rpb24oKXtcbiAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpXG4gICAgfSk7XG5cbiAgICBtYWtlX2RlZl9zdGFuZGFyZChkZWYpO1xuXG4gICAgZGVmLmluZGV4ID0gaztcbiAgICBjd19jYXJHZW5lcmF0aW9uLnB1c2goZGVmKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGNvdW50ZXI6IDAsXG4gICAgZ2VuZXJhdGlvbjogY3dfY2FyR2VuZXJhdGlvbixcbiAgfTtcbn1cblxuZnVuY3Rpb24gbmV4dEdlbmVyYXRpb24oXG4gIHByZXZpb3VzU3RhdGUsXG4gIHNjb3JlcyxcbiAgY29uZmlnXG4pe1xuICB2YXIgY2hhbXBpb25fbGVuZ3RoID0gY29uZmlnLmNoYW1waW9uTGVuZ3RoLFxuICAgIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxuICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gY29uZmlnLnNlbGVjdEZyb21BbGxQYXJlbnRzO1xuXG4gIHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XG4gIHZhciBuZXdib3JuO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGNoYW1waW9uX2xlbmd0aDsgaysrKSB7YGBcbiAgICBzY29yZXNba10uZGVmLmlzX2VsaXRlID0gdHJ1ZTtcbiAgICBzY29yZXNba10uZGVmLmluZGV4ID0gaztcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2goc2NvcmVzW2tdLmRlZik7XG4gIH1cbiAgdmFyIHBhcmVudExpc3QgPSBbXTtcbiAgZm9yIChrID0gY2hhbXBpb25fbGVuZ3RoOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuICAgIHZhciBwYXJlbnQxID0gc2VsZWN0RnJvbUFsbFBhcmVudHMoc2NvcmVzLCBwYXJlbnRMaXN0KTtcbiAgICB2YXIgcGFyZW50MiA9IHBhcmVudDE7XG4gICAgd2hpbGUgKHBhcmVudDIgPT0gcGFyZW50MSkge1xuICAgICAgcGFyZW50MiA9IHNlbGVjdEZyb21BbGxQYXJlbnRzKHNjb3JlcywgcGFyZW50TGlzdCwgcGFyZW50MSk7XG4gICAgfVxuICAgIHZhciBwYWlyID0gW3BhcmVudDEsIHBhcmVudDJdXG4gICAgcGFyZW50TGlzdC5wdXNoKHBhaXIpO1xuICAgIG5ld2Jvcm4gPSBtYWtlQ2hpbGQoY29uZmlnLFxuICAgICAgcGFpci5tYXAoZnVuY3Rpb24ocGFyZW50KSB7IHJldHVybiBzY29yZXNbcGFyZW50XS5kZWY7IH0pXG4gICAgKTtcbiAgICBuZXdib3JuID0gbXV0YXRlKGNvbmZpZywgbmV3Ym9ybik7XG4gICAgbmV3Ym9ybi5pc19lbGl0ZSA9IGZhbHNlO1xuICAgIG5ld2Jvcm4uaW5kZXggPSBrO1xuXG4gICAgbWFrZV9kZWZfc3RhbmRhcmQobmV3Ym9ybik7XG5cbiAgICBuZXdHZW5lcmF0aW9uLnB1c2gobmV3Ym9ybik7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNvdW50ZXI6IHByZXZpb3VzU3RhdGUuY291bnRlciArIDEsXG4gICAgZ2VuZXJhdGlvbjogbmV3R2VuZXJhdGlvbixcbiAgfTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlQ2hpbGQoY29uZmlnLCBwYXJlbnRzKXtcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXG4gICAgcGlja1BhcmVudCA9IGNvbmZpZy5waWNrUGFyZW50O1xuICByZXR1cm4gY3JlYXRlLmNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBwYXJlbnRzLCBwaWNrUGFyZW50KVxufVxuXG5cbmZ1bmN0aW9uIG11dGF0ZShjb25maWcsIHBhcmVudCl7XG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxuICAgIG11dGF0aW9uX3JhbmdlID0gY29uZmlnLm11dGF0aW9uX3JhbmdlLFxuICAgIGdlbl9tdXRhdGlvbiA9IGNvbmZpZy5nZW5fbXV0YXRpb24sXG4gICAgZ2VuZXJhdGVSYW5kb20gPSBjb25maWcuZ2VuZXJhdGVSYW5kb207XG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxuICAgIHNjaGVtYSxcbiAgICBnZW5lcmF0ZVJhbmRvbSxcbiAgICBwYXJlbnQsXG4gICAgTWF0aC5tYXgobXV0YXRpb25fcmFuZ2UpLFxuICAgIGdlbl9tdXRhdGlvblxuICApXG59XG4iLCJcblxuY29uc3QgcmFuZG9tID0ge1xuICBzaHVmZmxlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoIHx8IDEwLFxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgIH0sIGdlbmVyYXRvcikpO1xuICB9LFxuICBjcmVhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20uY3JlYXRlTm9ybWFscyh7XG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxuICAgIH0sIGdlbmVyYXRvcikpO1xuICB9LFxuICBjcmVhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgdmFyIGwgPSBwcm9wLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gW107XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGw7IGkrKyl7XG4gICAgICB2YWx1ZXMucHVzaChcbiAgICAgICAgY3JlYXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvcilcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH0sXG4gIG11dGF0ZVNodWZmbGUoXG4gICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICl7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb1NodWZmbGUocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgICApKTtcbiAgfSxcbiAgbXV0YXRlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvSW50ZWdlcihwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtdXRhdGVGbG9hdHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgcmFuZG9tLm11dGF0ZU5vcm1hbHMoXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgICApKTtcbiAgfSxcbiAgbWFwVG9TaHVmZmxlKHByb3AsIG5vcm1hbHMpe1xuICAgIHZhciBvZmZzZXQgPSBwcm9wLm9mZnNldCB8fCAwO1xuICAgIHZhciBsaW1pdCA9IHByb3AubGltaXQgfHwgcHJvcC5sZW5ndGg7XG4gICAgdmFyIHNvcnRlZCA9IG5vcm1hbHMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsIGIpe1xuICAgICAgcmV0dXJuIGEgLSBiO1xuICAgIH0pO1xuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbih2YWwpe1xuICAgICAgcmV0dXJuIHNvcnRlZC5pbmRleE9mKHZhbCk7XG4gICAgfSkubWFwKGZ1bmN0aW9uKGkpe1xuICAgICAgcmV0dXJuIGkgKyBvZmZzZXQ7XG4gICAgfSkuc2xpY2UoMCwgbGltaXQpO1xuICB9LFxuICBtYXBUb0ludGVnZXIocHJvcCwgbm9ybWFscyl7XG4gICAgcHJvcCA9IHtcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEwLFxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aFxuICAgIH1cbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgbm9ybWFscykubWFwKGZ1bmN0aW9uKGZsb2F0KXtcbiAgICAgIHJldHVybiBNYXRoLnJvdW5kKGZsb2F0KTtcbiAgICB9KTtcbiAgfSxcbiAgbWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKXtcbiAgICBwcm9wID0ge1xuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMVxuICAgIH1cbiAgICByZXR1cm4gbm9ybWFscy5tYXAoZnVuY3Rpb24obm9ybWFsKXtcbiAgICAgIHZhciBtaW4gPSBwcm9wLm1pbjtcbiAgICAgIHZhciByYW5nZSA9IHByb3AucmFuZ2U7XG4gICAgICByZXR1cm4gbWluICsgbm9ybWFsICogcmFuZ2VcbiAgICB9KVxuICB9LFxuICBtdXRhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XG4gICAgdmFyIGZhY3RvciA9IChwcm9wLmZhY3RvciB8fCAxKSAqIG11dGF0aW9uX3JhbmdlXG4gICAgcmV0dXJuIG9yaWdpbmFsVmFsdWVzLm1hcChmdW5jdGlvbihvcmlnaW5hbFZhbHVlKXtcbiAgICAgIGlmKGdlbmVyYXRvcigpID4gY2hhbmNlVG9NdXRhdGUpe1xuICAgICAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtdXRhdGVOb3JtYWwoXG4gICAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgZmFjdG9yXG4gICAgICApO1xuICAgIH0pO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJhbmRvbTtcblxuZnVuY3Rpb24gbXV0YXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgbXV0YXRpb25fcmFuZ2Upe1xuICBpZihtdXRhdGlvbl9yYW5nZSA+IDEpe1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBtdXRhdGUgYmV5b25kIGJvdW5kc1wiKTtcbiAgfVxuICB2YXIgbmV3TWluID0gb3JpZ2luYWxWYWx1ZSAtIDAuNTtcbiAgaWYgKG5ld01pbiA8IDApIG5ld01pbiA9IDA7XG4gIGlmIChuZXdNaW4gKyBtdXRhdGlvbl9yYW5nZSAgPiAxKVxuICAgIG5ld01pbiA9IDEgLSBtdXRhdGlvbl9yYW5nZTtcbiAgdmFyIHJhbmdlVmFsdWUgPSBjcmVhdGVOb3JtYWwoe1xuICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgfSwgZ2VuZXJhdG9yKTtcbiAgcmV0dXJuIG5ld01pbiArIHJhbmdlVmFsdWUgKiBtdXRhdGlvbl9yYW5nZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvcil7XG4gIGlmKCFwcm9wLmluY2x1c2l2ZSl7XG4gICAgcmV0dXJuIGdlbmVyYXRvcigpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBnZW5lcmF0b3IoKSA8IDAuNSA/XG4gICAgZ2VuZXJhdG9yKCkgOlxuICAgIDEgLSBnZW5lcmF0b3IoKTtcbiAgfVxufVxuIiwiLyogZ2xvYmFscyBidG9hICovXG52YXIgc2V0dXBTY2VuZSA9IHJlcXVpcmUoXCIuL3NldHVwLXNjZW5lXCIpO1xudmFyIGNhclJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcbnZhciBkZWZUb0NhciA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL2RlZi10by1jYXJcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gcnVuRGVmcztcbmZ1bmN0aW9uIHJ1bkRlZnMod29ybGRfZGVmLCBkZWZzLCBsaXN0ZW5lcnMpIHtcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XG4gICAgLy8gR0hPU1QgRElTQUJMRURcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XG4gIH1cblxuICB2YXIgc2NlbmUgPSBzZXR1cFNjZW5lKHdvcmxkX2RlZik7XG4gIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBidWlsZCBjYXJzXCIpO1xuICB2YXIgY2FycyA9IGRlZnMubWFwKChkZWYsIGkpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgaW5kZXg6IGksXG4gICAgICBkZWY6IGRlZixcbiAgICAgIGNhcjogZGVmVG9DYXIoZGVmLCBzY2VuZS53b3JsZCwgd29ybGRfZGVmKSxcbiAgICAgIHN0YXRlOiBjYXJSdW4uZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZilcbiAgICB9O1xuICB9KTtcbiAgdmFyIGFsaXZlY2FycyA9IGNhcnM7XG4gIHJldHVybiB7XG4gICAgc2NlbmU6IHNjZW5lLFxuICAgIGNhcnM6IGNhcnMsXG4gICAgc3RlcDogZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gbW9yZSBjYXJzXCIpO1xuICAgICAgfVxuICAgICAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xuICAgICAgbGlzdGVuZXJzLnByZUNhclN0ZXAoKTtcbiAgICAgIGFsaXZlY2FycyA9IGFsaXZlY2Fycy5maWx0ZXIoZnVuY3Rpb24gKGNhcikge1xuICAgICAgICBjYXIuc3RhdGUgPSBjYXJSdW4udXBkYXRlU3RhdGUoXG4gICAgICAgICAgd29ybGRfZGVmLCBjYXIuY2FyLCBjYXIuc3RhdGVcbiAgICAgICAgKTtcbiAgICAgICAgdmFyIHN0YXR1cyA9IGNhclJ1bi5nZXRTdGF0dXMoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xuICAgICAgICBsaXN0ZW5lcnMuY2FyU3RlcChjYXIpO1xuICAgICAgICBpZiAoc3RhdHVzID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY2FyLnNjb3JlID0gY2FyUnVuLmNhbGN1bGF0ZVNjb3JlKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcbiAgICAgICAgbGlzdGVuZXJzLmNhckRlYXRoKGNhcik7XG5cbiAgICAgICAgdmFyIHdvcmxkID0gc2NlbmUud29ybGQ7XG4gICAgICAgIHZhciB3b3JsZENhciA9IGNhci5jYXI7XG4gICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLmNoYXNzaXMpO1xuXG4gICAgICAgIGZvciAodmFyIHcgPSAwOyB3IDwgd29ybGRDYXIud2hlZWxzLmxlbmd0aDsgdysrKSB7XG4gICAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIud2hlZWxzW3ddKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pXG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsaXN0ZW5lcnMuZ2VuZXJhdGlvbkVuZChjYXJzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxufVxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXG5cbi8qXG5cbndvcmxkX2RlZiA9IHtcbiAgZ3Jhdml0eToge3gsIHl9LFxuICBkb1NsZWVwOiBib29sZWFuLFxuICBmbG9vcnNlZWQ6IHN0cmluZyxcbiAgdGlsZURpbWVuc2lvbnMsXG4gIG1heEZsb29yVGlsZXMsXG4gIG11dGFibGVfZmxvb3I6IGJvb2xlYW5cbn1cblxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3b3JsZF9kZWYpe1xuXG4gIHZhciB3b3JsZCA9IG5ldyBiMldvcmxkKHdvcmxkX2RlZi5ncmF2aXR5LCB3b3JsZF9kZWYuZG9TbGVlcCk7XG4gIHZhciBmbG9vclRpbGVzID0gY3dfY3JlYXRlRmxvb3IoXG4gICAgd29ybGQsXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCxcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXG4gICAgd29ybGRfZGVmLm1heEZsb29yVGlsZXMsXG4gICAgd29ybGRfZGVmLm11dGFibGVfZmxvb3JcbiAgKTtcblxuICB2YXIgbGFzdF90aWxlID0gZmxvb3JUaWxlc1tcbiAgICBmbG9vclRpbGVzLmxlbmd0aCAtIDFcbiAgXTtcbiAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxuICAgIGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM11cbiAgKTtcbiAgd29ybGQuZmluaXNoTGluZSA9IHRpbGVfcG9zaXRpb24ueDtcbiAgcmV0dXJuIHtcbiAgICB3b3JsZDogd29ybGQsXG4gICAgZmxvb3JUaWxlczogZmxvb3JUaWxlcyxcbiAgICBmaW5pc2hMaW5lOiB0aWxlX3Bvc2l0aW9uLnhcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3Iod29ybGQsIGZsb29yc2VlZCwgZGltZW5zaW9ucywgbWF4Rmxvb3JUaWxlcywgbXV0YWJsZV9mbG9vcikge1xuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcbiAgdmFyIGN3X2Zsb29yVGlsZXMgPSBbXTtcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgbWF4Rmxvb3JUaWxlczsgaysrKSB7XG4gICAgaWYgKCFtdXRhYmxlX2Zsb29yKSB7XG4gICAgICAvLyBrZWVwIG9sZCBpbXBvc3NpYmxlIHRyYWNrcyBpZiBub3QgdXNpbmcgbXV0YWJsZSBmbG9vcnNcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjUgKiBrIC8gbWF4Rmxvb3JUaWxlc1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaWYgcGF0aCBpcyBtdXRhYmxlIG92ZXIgcmFjZXMsIGNyZWF0ZSBzbW9vdGhlciB0cmFja3NcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjIgKiBrIC8gbWF4Rmxvb3JUaWxlc1xuICAgICAgKTtcbiAgICB9XG4gICAgY3dfZmxvb3JUaWxlcy5wdXNoKGxhc3RfdGlsZSk7XG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xuICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcbiAgfVxuICByZXR1cm4gY3dfZmxvb3JUaWxlcztcbn1cblxuXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vclRpbGUod29ybGQsIGRpbSwgcG9zaXRpb24sIGFuZ2xlKSB7XG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcblxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAwLjU7XG5cbiAgdmFyIGNvb3JkcyA9IG5ldyBBcnJheSgpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIDApKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAtZGltLnkpKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgLWRpbS55KSk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIDApKTtcblxuICB2YXIgY2VudGVyID0gbmV3IGIyVmVjMigwLCAwKTtcblxuICB2YXIgbmV3Y29vcmRzID0gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSk7XG5cbiAgZml4X2RlZi5zaGFwZS5TZXRBc0FycmF5KG5ld2Nvb3Jkcyk7XG5cbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xuICByZXR1cm4gYm9keTtcbn1cblxuZnVuY3Rpb24gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSkge1xuICByZXR1cm4gY29vcmRzLm1hcChmdW5jdGlvbihjb29yZCl7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpIC0gTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgKyBjZW50ZXIueCxcbiAgICAgIHk6IE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpICsgTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgKyBjZW50ZXIueSxcbiAgICB9O1xuICB9KTtcbn1cbiJdfQ==
