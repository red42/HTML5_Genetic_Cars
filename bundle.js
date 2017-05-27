(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
  "wheelCount": 2,
  "wheelMinRadius": 0.2,
  "wheelRadiusRange": 0.5,
  "wheelMinDensity": 40,
  "wheelDensityRange": 100,
  "chassisDensityRange": 300,
  "chassisMinDensity": 30,
  "chassisMinAxis": 0.1,
  "chassisAxisRange": 1.1,
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
      max: 7,
      length: 2,
      factor: 0.5,
    },
  };
}

},{"./car-constants.json":1}],3:[function(require,module,exports){
/*
  globals b2RevoluteJointDef b2Vec2 b2BodyDef b2Body b2FixtureDef b2PolygonShape b2CircleShape
*/
module.exports = defToCar;

function defToCar(car_def, world, constants){
  var instance = {};
  instance.chassis = createChassis(
    world, car_def.vertex_list, car_def.chassis_density
  );
  var i;

  var wheelCount = car_def.wheel_radius.length;

  instance.wheels = [];
  for (i = 0; i < wheelCount; i++) {
    instance.wheels[i] = createWheel(
      world, car_def.wheel_radius[i], car_def.wheel_density[i]
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

},{}],4:[function(require,module,exports){


module.exports = {
  runDef: runDef,
  updateState: updateState,
  getStatus: getStatus,
  calculateScore: calculateScore,
};

function runDef(world_def, ee, car){

  var state = {
    frames: 0,
    health: world_def.max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
  };
  var resolve, result;
  ee.on("step", step);
  function step(){
    state = updateState(world_def, car, state);
    if(getStatus(state) != 0){
      ee.removeListener("step", step);
      ee.emit("end", car, state);
      if(!resolve){
        result = state;
      } else {
        resolve(result);
      }
    }
  }
  return new Promise(function(res){
    if(result){
      res(result)
    } else {
      resolve = res;
    }
  })
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
  console.log(state);
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

  var wheels = myCar.constructedCar.wheels;

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

  var chassis = myCar.constructedCar.chassis;

  for (f = chassis.GetFixtureList(); f; f = f.m_next) {
    var cs = f.GetShape();
    cw_drawVirtualPoly(ctx, chassis, cs.m_vertices, cs.m_vertexCount);
  }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-circle":6,"./draw-virtual-poly":8}],6:[function(require,module,exports){

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

},{}],7:[function(require,module,exports){
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

},{"./draw-virtual-poly":8}],8:[function(require,module,exports){


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

},{}],9:[function(require,module,exports){
/* globals document */

module.exports = {
  plotGraphs: function(lastState, scores, generationSize) {
    var graphcanvas = document.getElementById("graphcanvas");
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
    cw_listTopScores(nextState);
    return nextState;
  },
  clearGraphics: function(){
    var graphcanvas = document.getElementById("graphcanvas");
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
  },
};


function cw_storeGraphScores(lastState, cw_carScores, generationSize) {
  return {
    cw_topScores: lastState.cw_topScores.concat([cw_carScores[0]]),
    cw_graphAverage: lastState.cw_graphAverage.concat([
      cw_average(cw_carScores, generationSize)
    ]),
    cw_graphElite: lastState.cw_graphElite.concat([
      cw_eliteaverage(cw_carScores, generationSize)
    ]),
    cw_graphTop: lastState.cw_graphTop.concat([
      cw_carScores[0].v
    ])
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
    sum += scores[k].v;
  }
  return sum / Math.floor(generationSize / 2);
}

function cw_average(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < generationSize; k++) {
    sum += scores[k].v;
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

function cw_listTopScores(state) {
  var cw_topScores = state.cw_topScores;
  var ts = document.getElementById("topscores");
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
    console.log(topScore);
    var n = "#" + (k + 1) + ":";
    var score = Math.round(topScore.v * 100) / 100;
    var distance = "d:" + Math.round(topScore.x * 100) / 100;
    var yrange =  "h:" + Math.round(topScore.y2 * 100) / 100 + "/" + Math.round(topScore.y * 100) / 100 + "m";
    var gen = "(Gen " + cw_topScores[k].i + ")"

    document.getElementById("topscores").innerHTML +=  [n, score, distance, yrange, gen].join(" ") + "<br />";
  }
}

},{}],10:[function(require,module,exports){
var random = require("./random.js");

module.exports = {
  updateState(defs, scores, state){
    var ids = defs.map(function(def){
      return def.id
    });
    var results = defs.map(function(def, i){
      return {
        id: def.id,
        definition: def,
        score: scores[i],
        generation: state.generations.length
      }
    });
    var trials = results.reduce(function(trials, info){
      trials[info.id] = info;
      return trials;
    }, state.trials);
    return {
      generations: [ids.sort(sortByScore)].concat(state.generations),
      trials: trials,
      sortedTrials: state.sortedTrials.concat(ids).sort(sortByScore),
    };

    function sortByScore(a, b){
      return trials[b].score - trials[a].score;
    }
  },
  createGenerationZero(schema, generator){
    return Object.keys(schema).reduce(function(instance, key){
      var schemaProp = schema[key];
      var values;
      switch(schemaProp.type){
        case "shuffle" :
          values = random.shuffleIntegers(schemaProp, generator); break;
        case "float" :
          values = random.createFloats(schemaProp, generator); break;
        case "integer":
          values = random.createIntegers(schemaProp, generator); break;
        default:
          throw new Error(`Unknown type ${schemaProp.type} of schema for key ${key}`);
      }
      instance[key] = values;
      return instance;
    }, { id: Date.now().toString(32) });
  },
  createCrossBreed(schema, parents, parentChooser){
    return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = parentChooser(key, parents);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
      return crossDef;
    }, {
      id: Date.now().toString(32),
      ancestry: [parents.map(function(parent){
        return [parent.id].concat(parent.ancestry);
      })]
    });
  },
  createMutatedClone(schema, generator, parent, factor){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var values;
      // console.log(key, parent[key]);
      switch(schemaProp.type){
        case "shuffle" : values = random.mutateShuffle(
          schemaProp, generator, parent[key], factor
        ); break;
        case "float" : values = random.mutateFloats(
          schemaProp, generator, parent[key], factor
        ); break;
        case "integer": values = random.mutateIntegers(
          schemaProp, generator, parent[key], factor
        ); break;
        default:
          throw new Error(`Unknown type ${schemaProp.type} of schema for key ${key}`);
      }
      clone[key] = values;
      return clone;
    }, {
      id: Date.now().toString(32),
      ancestry: [parent.id].concat(parent.ancestry)
    });
  }
}

},{"./random.js":14}],11:[function(require,module,exports){

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

},{}],12:[function(require,module,exports){

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

},{"./car-to-ghost.js":11}],13:[function(require,module,exports){
/* globals document performance localStorage alert confirm btoa HTMLDivElement */
/* globals b2Vec2 */
// Global Vars

var setupScene = require("./world/setup-scene.js");

var carConstruct = require("./car-schema/construct.js");
var defToCar = require("./car-schema/def-to-car.js");
var run = require("./car-schema/run.js");
var genetic = require("./genetic-algorithm.js");

var ghost_fns = require("./ghost/index.js");

var drawCar = require("./draw/draw-car.js");
var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;
var cw_clearGraphics = graph_fns.clearGraphics;
var cw_drawFloor = require("./draw/draw-floor.js");

var ghost_draw_frame = ghost_fns.ghost_draw_frame;
var ghost_create_replay = ghost_fns.ghost_create_replay;
var ghost_create_ghost = ghost_fns.ghost_create_ghost;
var ghost_add_replay_frame = ghost_fns.ghost_add_replay_frame;
var ghost_compare_to_replay = ghost_fns.ghost_compare_to_replay;
var ghost_get_position = ghost_fns.ghost_get_position;
var ghost_move_frame = ghost_fns.ghost_move_frame;
var ghost_reset_ghost = ghost_fns.ghost_reset_ghost
var ghost_pause = ghost_fns.ghost_pause;
var ghost_resume = ghost_fns.ghost_resume;

var ghost;

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;

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

var generationSize = 20;
var cw_carArray = new Array();
var cw_carGeneration = new Array();

var cw_carScores = new Array();

var gen_champions = 1;
var gen_mutation = 0.05;
var mutation_range = 1;
var gen_counter = 0;
var nAttributes = 15;

var last_drawn_tile = 0;

var carConstants = carConstruct.carConstants();

var schema = carConstruct.generateSchema(carConstants);

var max_car_health = box2dfps * 10;

var motorSpeed = 20;

var swapPoint1 = 0;
var swapPoint2 = 0;

var cw_ghostReplayInterval = null;

var distanceMeter = document.getElementById("distancemeter");
var heightMeter = document.getElementById("heightmeter");

var leaderPosition = new Object();
leaderPosition.x = 0;
leaderPosition.y = 0;

minimapcamera.width = 12 * minimapscale + "px";
minimapcamera.height = 6 * minimapscale + "px";


// ======= WORLD STATE ======


var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false
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

// ======== Activity State ====
var cw_runningInterval;
var cw_drawInterval;
var currentScene;

function showDistance(distance, height) {
  distanceMeter.innerHTML = distance + " meters<br />";
  heightMeter.innerHTML = height + " meters";
  if (distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function () {
  this.__constructor.apply(this, arguments);
}

cw_Car.prototype.chassis = null;

cw_Car.prototype.wheels = [];

cw_Car.prototype.__constructor = function (car_def) {
  this.car_def = car_def;
  this.state = {
    frames: 0,
    health: max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
  }
  this.frames = 0;
  this.alive = true;
  this.is_elite = car_def.is_elite;
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

  var constructedCar = defToCar(car_def, currentScene.world, {
    gravity: world_def.gravity,
    motorSpeed: motorSpeed,
  });
  this.constructedCar = constructedCar;

  this.replay = ghost_create_replay();
  ghost_add_replay_frame(this.replay, this.constructedCar);
}

cw_Car.prototype.getPosition = function () {
  return this.constructedCar.chassis.GetPosition();
}

cw_Car.prototype.kill = function () {
  switch(this.getStatus()){
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
  var score = run.calculateScore(this.state, {
    box2dfps: box2dfps
  });
  // console.log(score);
  ghost_compare_to_replay(this.replay, ghost, score.v);
  score.car_def = this.car_def;
  score.i = gen_counter;
  cw_carScores.push(score);
  var car = this.constructedCar;
  currentScene.world.DestroyBody(car.chassis);

  for (var i = 0; i < car.wheels.length; i++) {
    currentScene.world.DestroyBody(car.wheels[i]);
  }
  this.alive = false;

  // refocus camera to leader on death
  if (camera.target == this.car_def.index) {
    cw_setCameraTarget(-1);
  }
}
cw_Car.prototype.updateState = function(){
  this.state = run.updateState({
    finishLine: currentScene.finishLine,
    max_car_health: max_car_health,
  }, this.constructedCar, this.state)
}

cw_Car.prototype.getStatus = function () {
  // check health
  return run.getStatus(this.state, {
    finishLine: currentScene.finishLine,
    max_car_health: max_car_health,
  })
}


/* === END Car ============================================================= */
/* ========================================================================= */


/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {
  cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = genetic.createGenerationZero(schema, function(){
      return Math.random()
    });
    def.index = k;
    cw_carGeneration.push(def);
  }

  gen_counter = 0;
  cw_materializeGeneration();
  resetCarUI();
}

function cw_materializeGeneration() {
  cw_carArray = new Array();
  for (var k = 0; k < generationSize; k++) {
    cw_carArray.push(new cw_Car(cw_carGeneration[k]));
  }
}

function resetCarUI(){
  cw_deadCars = 0;
  leaderPosition = new Object();
  leaderPosition.x = 0;
  leaderPosition.y = 0;
  document.getElementById("generation").innerHTML = gen_counter.toString();
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML = generationSize.toString();
}

function cw_nextGeneration() {
  var newGeneration = new Array();
  var newborn;
  for (var k = 0; k < gen_champions; k++) {``
    cw_carScores[k].car_def.is_elite = true;
    cw_carScores[k].car_def.index = k;
    newGeneration.push(cw_carScores[k].car_def);
  }
  for (k = gen_champions; k < generationSize; k++) {
    var parent1 = cw_getParents();
    var parent2 = parent1;
    while (parent2 == parent1) {
      parent2 = cw_getParents();
    }
    newborn = cw_makeChild(
      cw_carScores[parent1].car_def,
      cw_carScores[parent2].car_def
    );
    newborn = cw_mutate(newborn);
    newborn.is_elite = false;
    newborn.index = k;
    newGeneration.push(newborn);
  }
  cw_carScores = new Array();
  cw_carGeneration = newGeneration;
  gen_counter++;
}

function cw_getParents() {
  var r = Math.random();
  if (r == 0)
    return 0;
  return Math.floor(-Math.log(r) * generationSize) % generationSize;
}

function cw_makeChild(car_def1, car_def2) {
  var curparent = 0;

  swapPoint1 = Math.round(Math.random() * (nAttributes - 1));
  swapPoint2 = swapPoint1;
  while (swapPoint2 == swapPoint1) {
    swapPoint2 = Math.round(Math.random() * (nAttributes - 1));
  }
  var i = 0;
  return genetic.createCrossBreed(schema, [car_def1, car_def2], function(key /* , parents */){
    if(["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1){
      curparent = cw_chooseParent(curparent, ++i);
      return curparent;
    }
    return cw_chooseParent(curparent, ++i);
  })
}

function cw_mutate(parent){
  return genetic.createMutatedClone(schema, function(){
    return Math.random()
  }, parent, Math.max(mutation_range, gen_mutation))
}


function cw_chooseParent(curparent, attributeIndex) {
  var ret;
  if ((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
    if (curparent == 1) {
      ret = 0;
    } else {
      ret = 1;
    }
  } else {
    ret = curparent;
  }
  return ret;
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  var zoom = camera.zoom;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  cw_setCameraPosition();
  ctx.translate(200 - (camera_x * zoom), 200 + (camera_y * zoom));
  ctx.scale(zoom, -zoom);
  cw_drawFloor(ctx, camera, currentScene.floorTiles);
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
  if (camera.target >= 0) {
    cameraTargetPosition = cw_carArray[camera.target].getPosition();
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
  var carPosition = ghost_get_position(ghost);
  camera.pos.x = carPosition.x;
  camera.pos.y = carPosition.y;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
  showDistance(Math.round(carPosition.x * 100) / 100, Math.round(carPosition.y * 100) / 100);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(200 - (carPosition.x * camera.zoom), 200 + (carPosition.y * camera.zoom));
  ctx.scale(camera.zoom, -camera.zoom);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  cw_drawFloor(ctx, camera, currentScene.floorTiles);
  ctx.restore();
}


function cw_drawCars() {
  for (var k = (cw_carArray.length - 1); k >= 0; k--) {
    var myCar = cw_carArray[k];
    drawCar(carConstants, myCar, camera, ctx)
  }
}

function toggleDisplay() {
  if (cw_paused) {
    return;
  }
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
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#3F72AF";
  minimapctx.beginPath();
  minimapctx.moveTo(0, 35 * minimapscale);
  for (var k = 0; k < currentScene.floorTiles.length; k++) {
    last_tile = currentScene.floorTiles[k];
    var last_fixture = last_tile.GetFixtureList();
    var last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
    minimapctx.lineTo((tile_position.x + 5) * minimapscale, (-tile_position.y + 35) * minimapscale);
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */

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
  cw_resetPopulation()
})

function saveProgress() {
  localStorage.cw_savedGeneration = JSON.stringify(cw_carGeneration);
  localStorage.cw_genCounter = gen_counter;
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
  cw_carGeneration = JSON.parse(localStorage.cw_savedGeneration);
  gen_counter = localStorage.cw_genCounter;
  ghost = JSON.parse(localStorage.cw_ghost);
  graphState.cw_topScores = JSON.parse(localStorage.cw_topScores);
  world_def.floorseed = localStorage.cw_floorSeed;
  document.getElementById("newseed").value = world_def.floorseed;

  currentScene = setupScene(world_def);
  cw_drawMiniMap();
  Math.seedrandom();

  cw_materializeGeneration();
  resetCarUI();
  cw_startSimulation();
}


function simulationStep() {
  var world = currentScene.world
  world.Step(1 / box2dfps, 20, 20);
  ghost_move_frame(ghost);
  for (var k = 0; k < generationSize; k++) {
    var car = cw_carArray[k];
    if (!car.alive) {
      continue;
    }
    car.frames++;
    car.updateState();
    updateCarUI(car, k);
    var status = car.getStatus();
    if(status === 0){
      car.kill();
      cw_deadCars++;
      if (cw_deadCars >= generationSize) {
        cleanupRound();
        return cw_newRound();
      }
    }
  }
  showDistance(
    Math.round(leaderPosition.x * 100) / 100,
    Math.round(leaderPosition.y * 100) / 100
  );
}

function updateCarUI(car, k){
  var position = car.getPosition();

  ghost_add_replay_frame(car.replay, car.constructedCar);
  car.minimapmarker.style.left = Math.round((position.x + 5) * minimapscale) + "px";
  car.healthBar.width = Math.round((car.state.health / max_car_health) * 100) + "%";
  var status = car.getStatus();
  if(status === 0){
    if (position.x > leaderPosition.x) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
    return;
  }
  document.getElementById("population").innerHTML = (generationSize - cw_deadCars).toString();
  cw_carArray[k].minimapmarker.style.borderLeft = "1px solid #3F72AF";
  if (leaderPosition.leader == k) {
    // leader is dead, find new leader
    cw_findLeader();
  }
}

function cw_findLeader() {
  var lead = 0;
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

function cleanupRound(){

  cw_carScores.sort(function (a, b) {
    if (a.v > b.v) {
      return -1
    } else {
      return 1
    }
  })
  graphState = plot_graphs(
    graphState, cw_carScores, generationSize
  );
}

function cw_newRound() {
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    ghost = null;
    world_def.floorseed = btoa(Math.seedrandom());
    currentScene = setupScene(world_def);
    cw_drawMiniMap();
  } else {
    // RE-ENABLE GHOST
    ghost_reset_ghost(ghost);
  }

  camera.pos.x = camera.pos.y = 0;
  cw_setCameraTarget(-1);

  cw_nextGeneration();
  cw_materializeGeneration();
  resetCarUI();
}

function cw_startSimulation() {
  cw_runningInterval = setInterval(simulationStep, Math.round(1000 / box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000 / screenfps));
}

function cw_stopSimulation() {
  clearInterval(cw_runningInterval);
  clearInterval(cw_drawInterval);
}

function cw_resetPopulation() {
  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML = "";
  document.getElementById("topscores").innerHTML = "";
  cw_clearGraphics();
  cw_carArray = new Array();
  cw_carGeneration = new Array();
  cw_carScores = new Array();
  resetGraphState();
  swapPoint1 = 0;
  swapPoint2 = 0;
  cw_generationZero();
}

function cw_resetWorld() {
  doDraw = true;
  cw_stopSimulation();
  world_def.floorseed = document.getElementById("newseed").value;
  currentScene = setupScene(world_def);
  cw_drawMiniMap();
  Math.seedrandom();
  cw_resetPopulation();
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

var old_last_drawn_tile;

function cw_pauseSimulation() {
  cw_paused = true;
  clearInterval(cw_runningInterval);
  clearInterval(cw_drawInterval);
  old_last_drawn_tile = last_drawn_tile;
  last_drawn_tile = 0;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  last_drawn_tile = old_last_drawn_tile;
  cw_runningInterval = setInterval(simulationStep, Math.round(1000 / box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000 / screenfps));
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
  currentScene = setupScene(world_def);
  cw_drawMiniMap();
  cw_generationZero();
  cw_runningInterval = setInterval(simulationStep, Math.round(1000 / box2dfps));
  cw_drawInterval = setInterval(cw_drawScreen, Math.round(1000 / screenfps));
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
  var closest = {
    index: 0,
    dist: Math.abs(((cw_carArray[0].getPosition().x + 6) * minimapscale) - coords.x),
    x: cw_carArray[0].getPosition().x
  }

  var maxX = 0;
  for (var i = 0; i < cw_carArray.length; i++) {
    if (!cw_carArray[i].alive) {
      continue;
    }
    var pos = cw_carArray[i].getPosition();
    var dist = Math.abs(((pos.x + 6) * minimapscale) - coords.x);
    if (dist < closest.dist) {
      closest.index = i;
      closest.dist = dist;
      closest.x = pos.x;
    }
    maxX = Math.max(pos.x, maxX);
  }

  if (closest.x == maxX) { // focus on leader again
    cw_setCameraTarget(-1);
  } else {
    cw_setCameraTarget(closest.index);
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
  gen_mutation = parseFloat(mutation);
}

function cw_setMutationRange(range) {
  mutation_range = parseFloat(range);
}

function cw_setMutableFloor(choice) {
  world_def.mutable_floor = (choice == 1);
}

function cw_setGravity(choice) {
  world_def.gravity = new b2Vec2(0.0, -parseFloat(choice));
  var world = currentScene.world
  // CHECK GRAVITY CHANGES
  if (world.GetGravity().y != world_def.gravity.y) {
    world.SetGravity(world_def.gravity);
  }
}

function cw_setEliteSize(clones) {
  gen_champions = parseInt(clones, 10);
}

cw_init();

},{"./car-schema/construct.js":2,"./car-schema/def-to-car.js":3,"./car-schema/run.js":4,"./draw/draw-car.js":5,"./draw/draw-floor.js":7,"./draw/plot-graphs.js":9,"./genetic-algorithm.js":10,"./ghost/index.js":12,"./world/setup-scene.js":15}],14:[function(require,module,exports){


const random = {
  shuffleIntegers(prop, generator){
    var offset = prop.offset || 0;
    var max = prop.max || 10;
    var l = prop.length || max;
    var values = [0];
    if(l === 1) return values;
    for(var i = 1; i < max; i++){
      var placement = random.createIntegers(
        { length: 1, min: 0, range: i }, generator
      )[0];
      if(placement === 0){
        values.unshift(i);
      } else if(placement === i){
        values.push(i)
      } else {
        values.splice(placement, 0, i)
      }
    }
    return values.slice(0, l).map(function(num){
      return offset + num;
    });
  },
  createIntegers(prop, generator){
    return random.createFloats({
      min: prop.min || 0,
      range: prop.range || 10,
      length: prop.length
    }, generator).map(function(float){
      return Math.round(float);
    });
  },
  createFloats(prop, generator){
    var l = prop.length;
    prop = {
      min: prop.min || 0,
      range: prop.range || 1,
    }
    var values = [];
    for(var i = 0; i < l; i++){
      values.push(
        createFloat(prop, generator)
      );
    }
    return values;
  },
  mutateShuffle(prop, generator, originalValues, mutation_range){
    var l = prop.length || 1;
    var max = prop.max || 10;
    var factor = (prop.factor || 1) * mutation_range
    var values = [];
    for(var i = 0; i < l; i++){
      var nextVal;
      do {
        nextVal = random.mutateIntegers(
          { min: 0, range: max },
          generator,
          [originalValues[i]],
          factor
        )[0];
      } while(values.indexOf(nextVal) > -1);
      values.push(nextVal)
    }
    return values;
  },
  mutateIntegers(prop, generator, originalValues, mutation_range){
    var factor = (prop.factor || 1) * mutation_range
    prop = {
      min: prop.min || 0,
      range: prop.range || 10
    }
    return random.mutateFloats(
      prop, generator, originalValues, factor
    ).map(function(float){
      return Math.round(float);
    })
  },
  mutateFloats(prop, generator, originalValues, mutation_range){
    var factor = (prop.factor || 1) * mutation_range
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    // console.log(arguments);
    return originalValues.map(function(originalValue){
      return mutateFloat(
        prop, generator, originalValue, factor
      );
    });
  },
};

module.exports = random;

function createFloat(prop, generator){
  var min = prop.min;
  var range = prop.range;
  return min + createRandom({inclusive: true}, generator) * range
}

function mutateFloat(prop, generator, originalValue, mutation_range){
  var oldMin = prop.min;
  var oldRange = prop.range;
  var newRange = oldRange * mutation_range;
  if(newRange > oldRange){
    throw new Error("mutation should scale to zero");
  }
  var newMin = originalValue - 0.5 * newRange;
  if (newMin < oldMin) newMin = oldMin;
  if (newMin + newRange  > oldMin + oldRange)
    newMin = (oldMin + oldRange) - newRange;
  return createFloat({
    min: newMin,
    range: newRange
  }, generator);

}

function createRandom(prop, generator){
  if(!prop.inclusive){
    return generator();
  } else {
    return generator() < 0.5 ?
    generator() :
    1 - generator();
  }
}

},{}],15:[function(require,module,exports){
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

},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY2FyLXNjaGVtYS9jYXItY29uc3RhbnRzLmpzb24iLCJzcmMvY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanMiLCJzcmMvY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzIiwic3JjL2Nhci1zY2hlbWEvcnVuLmpzIiwic3JjL2RyYXcvZHJhdy1jYXIuanMiLCJzcmMvZHJhdy9kcmF3LWNpcmNsZS5qcyIsInNyYy9kcmF3L2RyYXctZmxvb3IuanMiLCJzcmMvZHJhdy9kcmF3LXZpcnR1YWwtcG9seS5qcyIsInNyYy9kcmF3L3Bsb3QtZ3JhcGhzLmpzIiwic3JjL2dlbmV0aWMtYWxnb3JpdGhtLmpzIiwic3JjL2dob3N0L2Nhci10by1naG9zdC5qcyIsInNyYy9naG9zdC9pbmRleC5qcyIsInNyYy9pbmRleC5qcyIsInNyYy9yYW5kb20uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3MEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwid2hlZWxDb3VudFwiOiAyLFxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcbiAgXCJ3aGVlbFJhZGl1c1JhbmdlXCI6IDAuNSxcbiAgXCJ3aGVlbE1pbkRlbnNpdHlcIjogNDAsXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxuICBcImNoYXNzaXNEZW5zaXR5UmFuZ2VcIjogMzAwLFxuICBcImNoYXNzaXNNaW5EZW5zaXR5XCI6IDMwLFxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcbiAgXCJjaGFzc2lzQXhpc1JhbmdlXCI6IDEuMSxcbn1cbiIsInZhciBjYXJDb25zdGFudHMgPSByZXF1aXJlKFwiLi9jYXItY29uc3RhbnRzLmpzb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB3b3JsZERlZjogd29ybGREZWYsXG4gIGNhckNvbnN0YW50czogZ2V0Q2FyQ29uc3RhbnRzLFxuICBnZW5lcmF0ZVNjaGVtYTogZ2VuZXJhdGVTY2hlbWFcbn1cblxuZnVuY3Rpb24gd29ybGREZWYoKXtcbiAgdmFyIGJveDJkZnBzID0gNjA7XG4gIHJldHVybiB7XG4gICAgZ3Jhdml0eTogeyB5OiAwIH0sXG4gICAgZG9TbGVlcDogdHJ1ZSxcbiAgICBmbG9vcnNlZWQ6IFwiYWJjXCIsXG4gICAgbWF4Rmxvb3JUaWxlczogMjAwLFxuICAgIG11dGFibGVfZmxvb3I6IGZhbHNlLFxuICAgIG1vdG9yU3BlZWQ6IDIwLFxuICAgIGJveDJkZnBzOiBib3gyZGZwcyxcbiAgICBtYXhfY2FyX2hlYWx0aDogYm94MmRmcHMgKiAxMCxcbiAgICB0aWxlRGltZW5zaW9uczoge1xuICAgICAgd2lkdGg6IDEuNSxcbiAgICAgIGhlaWdodDogMC4xNVxuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2FyQ29uc3RhbnRzKCl7XG4gIHJldHVybiBjYXJDb25zdGFudHM7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2NoZW1hKHZhbHVlcyl7XG4gIHJldHVybiB7XG4gICAgd2hlZWxfcmFkaXVzOiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5SYWRpdXMsXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsUmFkaXVzUmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICB3aGVlbF9kZW5zaXR5OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5EZW5zaXR5LFxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbERlbnNpdHlSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIGNoYXNzaXNfZGVuc2l0eToge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiAxLFxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc0RlbnNpdHlSYW5nZSxcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc01pbkRlbnNpdHksXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICB2ZXJ0ZXhfbGlzdDoge1xuICAgICAgdHlwZTogXCJmbG9hdFwiLFxuICAgICAgbGVuZ3RoOiAxMixcbiAgICAgIG1pbjogdmFsdWVzLmNoYXNzaXNNaW5BeGlzLFxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzQXhpc1JhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgd2hlZWxfdmVydGV4OiB7XG4gICAgICB0eXBlOiBcInNodWZmbGVcIixcbiAgICAgIG1heDogNyxcbiAgICAgIGxlbmd0aDogMixcbiAgICAgIGZhY3RvcjogMC41LFxuICAgIH0sXG4gIH07XG59XG4iLCIvKlxuICBnbG9iYWxzIGIyUmV2b2x1dGVKb2ludERlZiBiMlZlYzIgYjJCb2R5RGVmIGIyQm9keSBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgYjJDaXJjbGVTaGFwZVxuKi9cbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XG5cbmZ1bmN0aW9uIGRlZlRvQ2FyKGNhcl9kZWYsIHdvcmxkLCBjb25zdGFudHMpe1xuICB2YXIgaW5zdGFuY2UgPSB7fTtcbiAgaW5zdGFuY2UuY2hhc3NpcyA9IGNyZWF0ZUNoYXNzaXMoXG4gICAgd29ybGQsIGNhcl9kZWYudmVydGV4X2xpc3QsIGNhcl9kZWYuY2hhc3Npc19kZW5zaXR5XG4gICk7XG4gIHZhciBpO1xuXG4gIHZhciB3aGVlbENvdW50ID0gY2FyX2RlZi53aGVlbF9yYWRpdXMubGVuZ3RoO1xuXG4gIGluc3RhbmNlLndoZWVscyA9IFtdO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgaW5zdGFuY2Uud2hlZWxzW2ldID0gY3JlYXRlV2hlZWwoXG4gICAgICB3b3JsZCwgY2FyX2RlZi53aGVlbF9yYWRpdXNbaV0sIGNhcl9kZWYud2hlZWxfZGVuc2l0eVtpXVxuICAgICk7XG4gIH1cblxuICB2YXIgY2FybWFzcyA9IGluc3RhbmNlLmNoYXNzaXMuR2V0TWFzcygpO1xuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgY2FybWFzcyArPSBpbnN0YW5jZS53aGVlbHNbaV0uR2V0TWFzcygpO1xuICB9XG5cbiAgdmFyIGpvaW50X2RlZiA9IG5ldyBiMlJldm9sdXRlSm9pbnREZWYoKTtcblxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XG4gICAgdmFyIHRvcnF1ZSA9IGNhcm1hc3MgKiAtY29uc3RhbnRzLmdyYXZpdHkueSAvIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldO1xuXG4gICAgdmFyIHJhbmR2ZXJ0ZXggPSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0W2Nhcl9kZWYud2hlZWxfdmVydGV4W2ldXTtcbiAgICBqb2ludF9kZWYubG9jYWxBbmNob3JBLlNldChyYW5kdmVydGV4LngsIHJhbmR2ZXJ0ZXgueSk7XG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XG4gICAgam9pbnRfZGVmLm1heE1vdG9yVG9ycXVlID0gdG9ycXVlO1xuICAgIGpvaW50X2RlZi5tb3RvclNwZWVkID0gLWNvbnN0YW50cy5tb3RvclNwZWVkO1xuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XG4gICAgam9pbnRfZGVmLmJvZHlBID0gaW5zdGFuY2UuY2hhc3NpcztcbiAgICBqb2ludF9kZWYuYm9keUIgPSBpbnN0YW5jZS53aGVlbHNbaV07XG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcbiAgfVxuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xuXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1swXSwgMCkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxXSwgdmVydGV4c1syXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoMCwgdmVydGV4c1szXSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNF0sIHZlcnRleHNbNV0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzZdLCAwKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s3XSwgLXZlcnRleHNbOF0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIC12ZXJ0ZXhzWzldKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzEwXSwgLXZlcnRleHNbMTFdKSk7XG5cbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMC4wLCA0LjApO1xuXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XG5cbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMF0sIHZlcnRleF9saXN0WzFdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMV0sIHZlcnRleF9saXN0WzJdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMl0sIHZlcnRleF9saXN0WzNdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbM10sIHZlcnRleF9saXN0WzRdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNF0sIHZlcnRleF9saXN0WzVdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNV0sIHZlcnRleF9saXN0WzZdLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNl0sIHZlcnRleF9saXN0WzddLCBkZW5zaXR5KTtcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbN10sIHZlcnRleF9saXN0WzBdLCBkZW5zaXR5KTtcblxuICBib2R5LnZlcnRleF9saXN0ID0gdmVydGV4X2xpc3Q7XG5cbiAgcmV0dXJuIGJvZHk7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4MSwgdmVydGV4MiwgZGVuc2l0eSkge1xuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgxKTtcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgyKTtcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxMDtcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkodmVydGV4X2xpc3QsIDMpO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcblxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDE7XG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuIiwiXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBydW5EZWY6IHJ1bkRlZixcbiAgdXBkYXRlU3RhdGU6IHVwZGF0ZVN0YXRlLFxuICBnZXRTdGF0dXM6IGdldFN0YXR1cyxcbiAgY2FsY3VsYXRlU2NvcmU6IGNhbGN1bGF0ZVNjb3JlLFxufTtcblxuZnVuY3Rpb24gcnVuRGVmKHdvcmxkX2RlZiwgZWUsIGNhcil7XG5cbiAgdmFyIHN0YXRlID0ge1xuICAgIGZyYW1lczogMCxcbiAgICBoZWFsdGg6IHdvcmxkX2RlZi5tYXhfY2FyX2hlYWx0aCxcbiAgICBtYXhQb3NpdGlvbnk6IDAsXG4gICAgbWluUG9zaXRpb255OiAwLFxuICAgIG1heFBvc2l0aW9ueDogMCxcbiAgfTtcbiAgdmFyIHJlc29sdmUsIHJlc3VsdDtcbiAgZWUub24oXCJzdGVwXCIsIHN0ZXApO1xuICBmdW5jdGlvbiBzdGVwKCl7XG4gICAgc3RhdGUgPSB1cGRhdGVTdGF0ZSh3b3JsZF9kZWYsIGNhciwgc3RhdGUpO1xuICAgIGlmKGdldFN0YXR1cyhzdGF0ZSkgIT0gMCl7XG4gICAgICBlZS5yZW1vdmVMaXN0ZW5lcihcInN0ZXBcIiwgc3RlcCk7XG4gICAgICBlZS5lbWl0KFwiZW5kXCIsIGNhciwgc3RhdGUpO1xuICAgICAgaWYoIXJlc29sdmUpe1xuICAgICAgICByZXN1bHQgPSBzdGF0ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlcyl7XG4gICAgaWYocmVzdWx0KXtcbiAgICAgIHJlcyhyZXN1bHQpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUgPSByZXM7XG4gICAgfVxuICB9KVxufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKGNvbnN0YW50cywgd29ybGRDb25zdHJ1Y3QsIHN0YXRlKXtcbiAgaWYoc3RhdGUuaGVhbHRoIDw9IDApe1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFscmVhZHkgRGVhZFwiKTtcbiAgfVxuICBpZihzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSBGaW5pc2hlZFwiKTtcbiAgfVxuXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlKTtcbiAgLy8gY2hlY2sgaGVhbHRoXG4gIHZhciBwb3NpdGlvbiA9IHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcbiAgLy8gY2hlY2sgaWYgY2FyIHJlYWNoZWQgZW5kIG9mIHRoZSBwYXRoXG4gIHZhciBuZXh0U3RhdGUgPSB7XG4gICAgZnJhbWVzOiBzdGF0ZS5mcmFtZXMgKyAxLFxuICAgIG1heFBvc2l0aW9ueDogcG9zaXRpb24ueCA+IHN0YXRlLm1heFBvc2l0aW9ueCA/IHBvc2l0aW9uLnggOiBzdGF0ZS5tYXhQb3NpdGlvbngsXG4gICAgbWF4UG9zaXRpb255OiBwb3NpdGlvbi55ID4gc3RhdGUubWF4UG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1heFBvc2l0aW9ueSxcbiAgICBtaW5Qb3NpdGlvbnk6IHBvc2l0aW9uLnkgPCBzdGF0ZS5taW5Qb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWluUG9zaXRpb255XG4gIH07XG5cbiAgaWYgKHBvc2l0aW9uLnggPiBjb25zdGFudHMuZmluaXNoTGluZSkge1xuICAgIHJldHVybiBuZXh0U3RhdGU7XG4gIH1cbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xuICB9XG4gIG5leHRTdGF0ZS5oZWFsdGggPSBzdGF0ZS5oZWFsdGggLSAxO1xuICBpZiAoTWF0aC5hYnMod29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRMaW5lYXJWZWxvY2l0eSgpLngpIDwgMC4wMDEpIHtcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XG4gIH1cbiAgcmV0dXJuIG5leHRTdGF0ZTtcbn1cblxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXRlLCBjb25zdGFudHMpe1xuICBpZihoYXNGYWlsZWQoc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAtMTtcbiAgaWYoaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIDE7XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBoYXNGYWlsZWQoc3RhdGUgLyosIGNvbnN0YW50cyAqLyl7XG4gIHJldHVybiBzdGF0ZS5oZWFsdGggPD0gMDtcbn1cbmZ1bmN0aW9uIGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cyl7XG4gIHJldHVybiBzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZTtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlU2NvcmUoc3RhdGUsIGNvbnN0YW50cyl7XG4gIGNvbnNvbGUubG9nKHN0YXRlKTtcbiAgdmFyIGF2Z3NwZWVkID0gKHN0YXRlLm1heFBvc2l0aW9ueCAvIHN0YXRlLmZyYW1lcykgKiBjb25zdGFudHMuYm94MmRmcHM7XG4gIHZhciBwb3NpdGlvbiA9IHN0YXRlLm1heFBvc2l0aW9ueDtcbiAgdmFyIHNjb3JlID0gcG9zaXRpb24gKyBhdmdzcGVlZDtcbiAgcmV0dXJuIHtcbiAgICB2OiBzY29yZSxcbiAgICBzOiBhdmdzcGVlZCxcbiAgICB4OiBwb3NpdGlvbixcbiAgICB5OiBzdGF0ZS5tYXhQb3NpdGlvbnksXG4gICAgeTI6IHN0YXRlLm1pblBvc2l0aW9ueVxuICB9XG59XG4iLCJcbnZhciBjd19kcmF3VmlydHVhbFBvbHkgPSByZXF1aXJlKFwiLi9kcmF3LXZpcnR1YWwtcG9seVwiKTtcbnZhciBjd19kcmF3Q2lyY2xlID0gcmVxdWlyZShcIi4vZHJhdy1jaXJjbGVcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY2FyX2NvbnN0YW50cywgbXlDYXIsIGNhbWVyYSwgY3R4KXtcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xuXG4gIHZhciB3aGVlbE1pbkRlbnNpdHkgPSBjYXJfY29uc3RhbnRzLndoZWVsTWluRGVuc2l0eVxuICB2YXIgd2hlZWxEZW5zaXR5UmFuZ2UgPSBjYXJfY29uc3RhbnRzLndoZWVsRGVuc2l0eVJhbmdlXG5cbiAgaWYgKCFteUNhci5hbGl2ZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgbXlDYXJQb3MgPSBteUNhci5nZXRQb3NpdGlvbigpO1xuXG4gIGlmIChteUNhclBvcy54IDwgKGNhbWVyYV94IC0gNSkpIHtcbiAgICAvLyB0b28gZmFyIGJlaGluZCwgZG9uJ3QgZHJhd1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzQ0NFwiO1xuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XG5cbiAgdmFyIHdoZWVscyA9IG15Q2FyLmNvbnN0cnVjdGVkQ2FyLndoZWVscztcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHdoZWVscy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gd2hlZWxzW2ldO1xuICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xuICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG4gICAgICB2YXIgY29sb3IgPSBNYXRoLnJvdW5kKDI1NSAtICgyNTUgKiAoZi5tX2RlbnNpdHkgLSB3aGVlbE1pbkRlbnNpdHkpKSAvIHdoZWVsRGVuc2l0eVJhbmdlKS50b1N0cmluZygpO1xuICAgICAgdmFyIHJnYmNvbG9yID0gXCJyZ2IoXCIgKyBjb2xvciArIFwiLFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIpXCI7XG4gICAgICBjd19kcmF3Q2lyY2xlKGN0eCwgYiwgcy5tX3AsIHMubV9yYWRpdXMsIGIubV9zd2VlcC5hLCByZ2Jjb2xvcik7XG4gICAgfVxuICB9XG5cbiAgaWYgKG15Q2FyLmlzX2VsaXRlKSB7XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0RCRTJFRlwiO1xuICB9IGVsc2Uge1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiI0Y3Qzg3M1wiO1xuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNGQUVCQ0RcIjtcbiAgfVxuICBjdHguYmVnaW5QYXRoKCk7XG5cbiAgdmFyIGNoYXNzaXMgPSBteUNhci5jb25zdHJ1Y3RlZENhci5jaGFzc2lzO1xuXG4gIGZvciAoZiA9IGNoYXNzaXMuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIGNzID0gZi5HZXRTaGFwZSgpO1xuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xuICB9XG4gIGN0eC5maWxsKCk7XG4gIGN0eC5zdHJva2UoKTtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xuXG5mdW5jdGlvbiBjd19kcmF3Q2lyY2xlKGN0eCwgYm9keSwgY2VudGVyLCByYWRpdXMsIGFuZ2xlLCBjb2xvcikge1xuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xuICBjdHguZmlsbFN0eWxlID0gY29sb3I7XG5cbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKHAueCwgcC55LCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcblxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcbiAgY3R4LmxpbmVUbyhwLnggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSksIHAueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGNhbWVyYSwgY3dfZmxvb3JUaWxlcykge1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAwMFwiO1xuICBjdHguZmlsbFN0eWxlID0gXCIjNzc3XCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuXG4gIHZhciBrO1xuICBpZihjYW1lcmEucG9zLnggLSAxMCA+IDApe1xuICAgIGsgPSBNYXRoLmZsb29yKChjYW1lcmEucG9zLnggLSAxMCkgLyAxLjUpO1xuICB9IGVsc2Uge1xuICAgIGsgPSAwO1xuICB9XG5cbiAgLy8gY29uc29sZS5sb2coayk7XG5cbiAgb3V0ZXJfbG9vcDpcbiAgICBmb3IgKGs7IGsgPCBjd19mbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XG4gICAgICB2YXIgYiA9IGN3X2Zsb29yVGlsZXNba107XG4gICAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG4gICAgICAgIHZhciBzaGFwZVBvc2l0aW9uID0gYi5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1swXSkueDtcbiAgICAgICAgaWYgKChzaGFwZVBvc2l0aW9uID4gKGNhbWVyYV94IC0gNSkpICYmIChzaGFwZVBvc2l0aW9uIDwgKGNhbWVyYV94ICsgMTApKSkge1xuICAgICAgICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGIsIHMubV92ZXJ0aWNlcywgcy5tX3ZlcnRleENvdW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hhcGVQb3NpdGlvbiA+IGNhbWVyYV94ICsgMTApIHtcbiAgICAgICAgICBicmVhayBvdXRlcl9sb29wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlKCk7XG59XG4iLCJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGJvZHksIHZ0eCwgbl92dHgpIHtcbiAgLy8gc2V0IHN0cm9rZXN0eWxlIGFuZCBmaWxsc3R5bGUgYmVmb3JlIGNhbGxcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcblxuICB2YXIgcDAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4WzBdKTtcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgdmFyIHAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4W2ldKTtcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcbiAgfVxuICBjdHgubGluZVRvKHAwLngsIHAwLnkpO1xufVxuIiwiLyogZ2xvYmFscyBkb2N1bWVudCAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24obGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gICAgdmFyIGdyYXBoY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJncmFwaGNhbnZhc1wiKTtcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19saXN0VG9wU2NvcmVzKG5leHRTdGF0ZSk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfSxcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24oKXtcbiAgICB2YXIgZ3JhcGhjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgfSxcbn07XG5cblxuZnVuY3Rpb24gY3dfc3RvcmVHcmFwaFNjb3JlcyhsYXN0U3RhdGUsIGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcbiAgcmV0dXJuIHtcbiAgICBjd190b3BTY29yZXM6IGxhc3RTdGF0ZS5jd190b3BTY29yZXMuY29uY2F0KFtjd19jYXJTY29yZXNbMF1dKSxcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IGxhc3RTdGF0ZS5jd19ncmFwaEF2ZXJhZ2UuY29uY2F0KFtcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaEVsaXRlOiBsYXN0U3RhdGUuY3dfZ3JhcGhFbGl0ZS5jb25jYXQoW1xuICAgICAgY3dfZWxpdGVhdmVyYWdlKGN3X2NhclNjb3JlcywgZ2VuZXJhdGlvblNpemUpXG4gICAgXSksXG4gICAgY3dfZ3JhcGhUb3A6IGxhc3RTdGF0ZS5jd19ncmFwaFRvcC5jb25jYXQoW1xuICAgICAgY3dfY2FyU2NvcmVzWzBdLnZcbiAgICBdKVxuICB9XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RUb3Aoc3RhdGUsIGdyYXBoY3R4KSB7XG4gIHZhciBjd19ncmFwaFRvcCA9IHN0YXRlLmN3X2dyYXBoVG9wO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhUb3AubGVuZ3RoO1xuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiI0M4M0IzQlwiO1xuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoVG9wW2tdKTtcbiAgfVxuICBncmFwaGN0eC5zdHJva2UoKTtcbn1cblxuZnVuY3Rpb24gY3dfcGxvdEVsaXRlKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhFbGl0ZSA9IHN0YXRlLmN3X2dyYXBoRWxpdGU7XG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEVsaXRlLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiM3QkM3NERcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEVsaXRlW2tdKTtcbiAgfVxuICBncmFwaGN0eC5zdHJva2UoKTtcbn1cblxuZnVuY3Rpb24gY3dfcGxvdEF2ZXJhZ2Uoc3RhdGUsIGdyYXBoY3R4KSB7XG4gIHZhciBjd19ncmFwaEF2ZXJhZ2UgPSBzdGF0ZS5jd19ncmFwaEF2ZXJhZ2U7XG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaEF2ZXJhZ2UubGVuZ3RoO1xuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoQXZlcmFnZVtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cblxuZnVuY3Rpb24gY3dfZWxpdGVhdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcbiAgdmFyIHN1bSA9IDA7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpOyBrKyspIHtcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnY7XG4gIH1cbiAgcmV0dXJuIHN1bSAvIE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTtcbn1cblxuZnVuY3Rpb24gY3dfYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIHZhciBzdW0gPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnY7XG4gIH1cbiAgcmV0dXJuIHN1bSAvIGdlbmVyYXRpb25TaXplO1xufVxuXG5mdW5jdGlvbiBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpIHtcbiAgZ3JhcGhjYW52YXMud2lkdGggPSBncmFwaGNhbnZhcy53aWR0aDtcbiAgZ3JhcGhjdHgudHJhbnNsYXRlKDAsIGdyYXBoaGVpZ2h0KTtcbiAgZ3JhcGhjdHguc2NhbGUoMSwgLTEpO1xuICBncmFwaGN0eC5saW5lV2lkdGggPSAxO1xuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gMik7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDIpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgLyA0KTtcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0IC8gNCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0ICogMyAvIDQpO1xuICBncmFwaGN0eC5zdHJva2UoKTtcbn1cblxuZnVuY3Rpb24gY3dfbGlzdFRvcFNjb3JlcyhzdGF0ZSkge1xuICB2YXIgY3dfdG9wU2NvcmVzID0gc3RhdGUuY3dfdG9wU2NvcmVzO1xuICB2YXIgdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRvcHNjb3Jlc1wiKTtcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS52ID4gYi52KSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDFcbiAgICB9XG4gIH0pO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIGN3X3RvcFNjb3Jlcy5sZW5ndGgpOyBrKyspIHtcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XG4gICAgY29uc29sZS5sb2codG9wU2NvcmUpO1xuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIikuaW5uZXJIVE1MICs9ICBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xuICB9XG59XG4iLCJ2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4vcmFuZG9tLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdXBkYXRlU3RhdGUoZGVmcywgc2NvcmVzLCBzdGF0ZSl7XG4gICAgdmFyIGlkcyA9IGRlZnMubWFwKGZ1bmN0aW9uKGRlZil7XG4gICAgICByZXR1cm4gZGVmLmlkXG4gICAgfSk7XG4gICAgdmFyIHJlc3VsdHMgPSBkZWZzLm1hcChmdW5jdGlvbihkZWYsIGkpe1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IGRlZi5pZCxcbiAgICAgICAgZGVmaW5pdGlvbjogZGVmLFxuICAgICAgICBzY29yZTogc2NvcmVzW2ldLFxuICAgICAgICBnZW5lcmF0aW9uOiBzdGF0ZS5nZW5lcmF0aW9ucy5sZW5ndGhcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgdHJpYWxzID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24odHJpYWxzLCBpbmZvKXtcbiAgICAgIHRyaWFsc1tpbmZvLmlkXSA9IGluZm87XG4gICAgICByZXR1cm4gdHJpYWxzO1xuICAgIH0sIHN0YXRlLnRyaWFscyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdlbmVyYXRpb25zOiBbaWRzLnNvcnQoc29ydEJ5U2NvcmUpXS5jb25jYXQoc3RhdGUuZ2VuZXJhdGlvbnMpLFxuICAgICAgdHJpYWxzOiB0cmlhbHMsXG4gICAgICBzb3J0ZWRUcmlhbHM6IHN0YXRlLnNvcnRlZFRyaWFscy5jb25jYXQoaWRzKS5zb3J0KHNvcnRCeVNjb3JlKSxcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gc29ydEJ5U2NvcmUoYSwgYil7XG4gICAgICByZXR1cm4gdHJpYWxzW2JdLnNjb3JlIC0gdHJpYWxzW2FdLnNjb3JlO1xuICAgIH1cbiAgfSxcbiAgY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihpbnN0YW5jZSwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XG4gICAgICB2YXIgdmFsdWVzO1xuICAgICAgc3dpdGNoKHNjaGVtYVByb3AudHlwZSl7XG4gICAgICAgIGNhc2UgXCJzaHVmZmxlXCIgOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5zaHVmZmxlSW50ZWdlcnMoc2NoZW1hUHJvcCwgZ2VuZXJhdG9yKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJmbG9hdFwiIDpcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20uY3JlYXRlRmxvYXRzKHNjaGVtYVByb3AsIGdlbmVyYXRvcik7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiaW50ZWdlclwiOlxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5jcmVhdGVJbnRlZ2VycyhzY2hlbWFQcm9wLCBnZW5lcmF0b3IpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3NjaGVtYVByb3AudHlwZX0gb2Ygc2NoZW1hIGZvciBrZXkgJHtrZXl9YCk7XG4gICAgICB9XG4gICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sIHsgaWQ6IERhdGUubm93KCkudG9TdHJpbmcoMzIpIH0pO1xuICB9LFxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoa2V5LCBwYXJlbnRzKTtcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcbiAgICAgIH1cbiAgICAgIGNyb3NzRGVmW2tleV0gPSB2YWx1ZXM7XG4gICAgICByZXR1cm4gY3Jvc3NEZWY7XG4gICAgfSwge1xuICAgICAgaWQ6IERhdGUubm93KCkudG9TdHJpbmcoMzIpLFxuICAgICAgYW5jZXN0cnk6IFtwYXJlbnRzLm1hcChmdW5jdGlvbihwYXJlbnQpe1xuICAgICAgICByZXR1cm4gW3BhcmVudC5pZF0uY29uY2F0KHBhcmVudC5hbmNlc3RyeSk7XG4gICAgICB9KV1cbiAgICB9KTtcbiAgfSxcbiAgY3JlYXRlTXV0YXRlZENsb25lKHNjaGVtYSwgZ2VuZXJhdG9yLCBwYXJlbnQsIGZhY3Rvcil7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcbiAgICAgIHZhciB2YWx1ZXM7XG4gICAgICAvLyBjb25zb2xlLmxvZyhrZXksIHBhcmVudFtrZXldKTtcbiAgICAgIHN3aXRjaChzY2hlbWFQcm9wLnR5cGUpe1xuICAgICAgICBjYXNlIFwic2h1ZmZsZVwiIDogdmFsdWVzID0gcmFuZG9tLm11dGF0ZVNodWZmbGUoXG4gICAgICAgICAgc2NoZW1hUHJvcCwgZ2VuZXJhdG9yLCBwYXJlbnRba2V5XSwgZmFjdG9yXG4gICAgICAgICk7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiZmxvYXRcIiA6IHZhbHVlcyA9IHJhbmRvbS5tdXRhdGVGbG9hdHMoXG4gICAgICAgICAgc2NoZW1hUHJvcCwgZ2VuZXJhdG9yLCBwYXJlbnRba2V5XSwgZmFjdG9yXG4gICAgICAgICk7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiaW50ZWdlclwiOiB2YWx1ZXMgPSByYW5kb20ubXV0YXRlSW50ZWdlcnMoXG4gICAgICAgICAgc2NoZW1hUHJvcCwgZ2VuZXJhdG9yLCBwYXJlbnRba2V5XSwgZmFjdG9yXG4gICAgICAgICk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0eXBlICR7c2NoZW1hUHJvcC50eXBlfSBvZiBzY2hlbWEgZm9yIGtleSAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XG4gICAgICByZXR1cm4gY2xvbmU7XG4gICAgfSwge1xuICAgICAgaWQ6IERhdGUubm93KCkudG9TdHJpbmcoMzIpLFxuICAgICAgYW5jZXN0cnk6IFtwYXJlbnQuaWRdLmNvbmNhdChwYXJlbnQuYW5jZXN0cnkpXG4gICAgfSk7XG4gIH1cbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXIpIHtcbiAgdmFyIG91dCA9IHtcbiAgICBjaGFzc2lzOiBnaG9zdF9nZXRfY2hhc3NpcyhjYXIuY2hhc3NpcyksXG4gICAgd2hlZWxzOiBbXSxcbiAgICBwb3M6IHt4OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLngsIHk6IGNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCkueX1cbiAgfTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhci53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXQud2hlZWxzW2ldID0gZ2hvc3RfZ2V0X3doZWVsKGNhci53aGVlbHNbaV0pO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xuICB2YXIgZ2MgPSBbXTtcblxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcblxuICAgIHZhciBwID0ge1xuICAgICAgdnR4OiBbXSxcbiAgICAgIG51bTogMFxuICAgIH1cblxuICAgIHAubnVtID0gcy5tX3ZlcnRleENvdW50O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzLm1fdmVydGV4Q291bnQ7IGkrKykge1xuICAgICAgcC52dHgucHVzaChjLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzW2ldKSk7XG4gICAgfVxuXG4gICAgZ2MucHVzaChwKTtcbiAgfVxuXG4gIHJldHVybiBnYztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3doZWVsKHcpIHtcbiAgdmFyIGd3ID0gW107XG5cbiAgZm9yICh2YXIgZiA9IHcuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG5cbiAgICB2YXIgYyA9IHtcbiAgICAgIHBvczogdy5HZXRXb3JsZFBvaW50KHMubV9wKSxcbiAgICAgIHJhZDogcy5tX3JhZGl1cyxcbiAgICAgIGFuZzogdy5tX3N3ZWVwLmFcbiAgICB9XG5cbiAgICBndy5wdXNoKGMpO1xuICB9XG5cbiAgcmV0dXJuIGd3O1xufVxuIiwiXG52YXIgZ2hvc3RfZ2V0X2ZyYW1lID0gcmVxdWlyZShcIi4vY2FyLXRvLWdob3N0LmpzXCIpO1xuXG52YXIgZW5hYmxlX2dob3N0ID0gdHJ1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdob3N0X2NyZWF0ZV9yZXBsYXk6IGdob3N0X2NyZWF0ZV9yZXBsYXksXG4gIGdob3N0X2NyZWF0ZV9naG9zdDogZ2hvc3RfY3JlYXRlX2dob3N0LFxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXG4gIGdob3N0X3Jlc3VtZTogZ2hvc3RfcmVzdW1lLFxuICBnaG9zdF9nZXRfcG9zaXRpb246IGdob3N0X2dldF9wb3NpdGlvbixcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxuICBnaG9zdF9tb3ZlX2ZyYW1lOiBnaG9zdF9tb3ZlX2ZyYW1lLFxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lOiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lLFxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxuICBnaG9zdF9yZXNldF9naG9zdDogZ2hvc3RfcmVzZXRfZ2hvc3Rcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX3JlcGxheSgpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBudW1fZnJhbWVzOiAwLFxuICAgIGZyYW1lczogW10sXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX2dob3N0KCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHJlcGxheTogbnVsbCxcbiAgICBmcmFtZTogMCxcbiAgICBkaXN0OiAtMTAwXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lID0gMDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcGF1c2UoZ2hvc3QpIHtcbiAgaWYgKGdob3N0ICE9IG51bGwpXG4gICAgZ2hvc3Qub2xkX2ZyYW1lID0gZ2hvc3QuZnJhbWU7XG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XG4gIGlmIChnaG9zdCAhPSBudWxsKVxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3Qub2xkX2ZyYW1lO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5mcmFtZSA8IDApXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcbiAgcmV0dXJuIGZyYW1lLnBvcztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY29tcGFyZV90b19yZXBsYXkocmVwbGF5LCBnaG9zdCwgbWF4KSB7XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAocmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGlmIChnaG9zdC5kaXN0IDwgbWF4KSB7XG4gICAgZ2hvc3QucmVwbGF5ID0gcmVwbGF5O1xuICAgIGdob3N0LmRpc3QgPSBtYXg7XG4gICAgZ2hvc3QuZnJhbWUgPSAwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lKys7XG4gIGlmIChnaG9zdC5mcmFtZSA+PSBnaG9zdC5yZXBsYXkubnVtX2ZyYW1lcylcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0LnJlcGxheS5udW1fZnJhbWVzIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShyZXBsYXksIGNhcikge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm47XG4gIGlmIChyZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgdmFyIGZyYW1lID0gZ2hvc3RfZ2V0X2ZyYW1lKGNhcik7XG4gIHJlcGxheS5mcmFtZXMucHVzaChmcmFtZSk7XG4gIHJlcGxheS5udW1fZnJhbWVzKys7XG59XG5cbmZ1bmN0aW9uIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKSB7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0LnJlcGxheSA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcblxuICAvLyB3aGVlbCBzdHlsZVxuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmcmFtZS53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciB3IGluIGZyYW1lLndoZWVsc1tpXSkge1xuICAgICAgZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBmcmFtZS53aGVlbHNbaV1bd10ucG9zLCBmcmFtZS53aGVlbHNbaV1bd10ucmFkLCBmcmFtZS53aGVlbHNbaV1bd10uYW5nKTtcbiAgICB9XG4gIH1cblxuICAvLyBjaGFzc2lzIHN0eWxlXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBmb3IgKHZhciBjIGluIGZyYW1lLmNoYXNzaXMpXG4gICAgZ2hvc3RfZHJhd19wb2x5KGN0eCwgZnJhbWUuY2hhc3Npc1tjXS52dHgsIGZyYW1lLmNoYXNzaXNbY10ubnVtKTtcbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9kcmF3X3BvbHkoY3R4LCB2dHgsIG5fdnR4KSB7XG4gIGN0eC5tb3ZlVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgY3R4LmxpbmVUbyh2dHhbaV0ueCwgdnR4W2ldLnkpO1xuICB9XG4gIGN0eC5saW5lVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUpIHtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKGNlbnRlci54LCBjZW50ZXIueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XG5cbiAgY3R4Lm1vdmVUbyhjZW50ZXIueCwgY2VudGVyLnkpO1xuICBjdHgubGluZVRvKGNlbnRlci54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBjZW50ZXIueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwiLyogZ2xvYmFscyBkb2N1bWVudCBwZXJmb3JtYW5jZSBsb2NhbFN0b3JhZ2UgYWxlcnQgY29uZmlybSBidG9hIEhUTUxEaXZFbGVtZW50ICovXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xuLy8gR2xvYmFsIFZhcnNcblxudmFyIHNldHVwU2NlbmUgPSByZXF1aXJlKFwiLi93b3JsZC9zZXR1cC1zY2VuZS5qc1wiKTtcblxudmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4vY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzXCIpO1xudmFyIHJ1biA9IHJlcXVpcmUoXCIuL2Nhci1zY2hlbWEvcnVuLmpzXCIpO1xudmFyIGdlbmV0aWMgPSByZXF1aXJlKFwiLi9nZW5ldGljLWFsZ29yaXRobS5qc1wiKTtcblxudmFyIGdob3N0X2ZucyA9IHJlcXVpcmUoXCIuL2dob3N0L2luZGV4LmpzXCIpO1xuXG52YXIgZHJhd0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXIuanNcIik7XG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xudmFyIGN3X2NsZWFyR3JhcGhpY3MgPSBncmFwaF9mbnMuY2xlYXJHcmFwaGljcztcbnZhciBjd19kcmF3Rmxvb3IgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctZmxvb3IuanNcIik7XG5cbnZhciBnaG9zdF9kcmF3X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2RyYXdfZnJhbWU7XG52YXIgZ2hvc3RfY3JlYXRlX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfcmVwbGF5O1xudmFyIGdob3N0X2NyZWF0ZV9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfZ2hvc3Q7XG52YXIgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9hZGRfcmVwbGF5X2ZyYW1lO1xudmFyIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5ID0gZ2hvc3RfZm5zLmdob3N0X2NvbXBhcmVfdG9fcmVwbGF5O1xudmFyIGdob3N0X2dldF9wb3NpdGlvbiA9IGdob3N0X2Zucy5naG9zdF9nZXRfcG9zaXRpb247XG52YXIgZ2hvc3RfbW92ZV9mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9tb3ZlX2ZyYW1lO1xudmFyIGdob3N0X3Jlc2V0X2dob3N0ID0gZ2hvc3RfZm5zLmdob3N0X3Jlc2V0X2dob3N0XG52YXIgZ2hvc3RfcGF1c2UgPSBnaG9zdF9mbnMuZ2hvc3RfcGF1c2U7XG52YXIgZ2hvc3RfcmVzdW1lID0gZ2hvc3RfZm5zLmdob3N0X3Jlc3VtZTtcblxudmFyIGdob3N0O1xuXG52YXIgZG9EcmF3ID0gdHJ1ZTtcbnZhciBjd19wYXVzZWQgPSBmYWxzZTtcblxudmFyIGJveDJkZnBzID0gNjA7XG52YXIgc2NyZWVuZnBzID0gNjA7XG5cbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5ib3hcIik7XG52YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxudmFyIGNhbWVyYSA9IHtcbiAgc3BlZWQ6IDAuMDUsXG4gIHBvczoge1xuICAgIHg6IDAsIHk6IDBcbiAgfSxcbiAgdGFyZ2V0OiAtMSxcbiAgem9vbTogNzBcbn1cblxudmFyIG1pbmltYXBjYW1lcmEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBjYW1lcmFcIikuc3R5bGU7XG52YXIgbWluaW1hcGhvbGRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbWluaW1hcGhvbGRlclwiKTtcblxudmFyIG1pbmltYXBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBcIik7XG52YXIgbWluaW1hcGN0eCA9IG1pbmltYXBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xudmFyIG1pbmltYXBzY2FsZSA9IDM7XG52YXIgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcbnZhciBmb2dkaXN0YW5jZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGZvZ1wiKS5zdHlsZTtcblxudmFyIGdlbmVyYXRpb25TaXplID0gMjA7XG52YXIgY3dfY2FyQXJyYXkgPSBuZXcgQXJyYXkoKTtcbnZhciBjd19jYXJHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XG5cbnZhciBjd19jYXJTY29yZXMgPSBuZXcgQXJyYXkoKTtcblxudmFyIGdlbl9jaGFtcGlvbnMgPSAxO1xudmFyIGdlbl9tdXRhdGlvbiA9IDAuMDU7XG52YXIgbXV0YXRpb25fcmFuZ2UgPSAxO1xudmFyIGdlbl9jb3VudGVyID0gMDtcbnZhciBuQXR0cmlidXRlcyA9IDE1O1xuXG52YXIgbGFzdF9kcmF3bl90aWxlID0gMDtcblxudmFyIGNhckNvbnN0YW50cyA9IGNhckNvbnN0cnVjdC5jYXJDb25zdGFudHMoKTtcblxudmFyIHNjaGVtYSA9IGNhckNvbnN0cnVjdC5nZW5lcmF0ZVNjaGVtYShjYXJDb25zdGFudHMpO1xuXG52YXIgbWF4X2Nhcl9oZWFsdGggPSBib3gyZGZwcyAqIDEwO1xuXG52YXIgbW90b3JTcGVlZCA9IDIwO1xuXG52YXIgc3dhcFBvaW50MSA9IDA7XG52YXIgc3dhcFBvaW50MiA9IDA7XG5cbnZhciBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcblxudmFyIGRpc3RhbmNlTWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRpc3RhbmNlbWV0ZXJcIik7XG52YXIgaGVpZ2h0TWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlaWdodG1ldGVyXCIpO1xuXG52YXIgbGVhZGVyUG9zaXRpb24gPSBuZXcgT2JqZWN0KCk7XG5sZWFkZXJQb3NpdGlvbi54ID0gMDtcbmxlYWRlclBvc2l0aW9uLnkgPSAwO1xuXG5taW5pbWFwY2FtZXJhLndpZHRoID0gMTIgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XG5taW5pbWFwY2FtZXJhLmhlaWdodCA9IDYgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XG5cblxuLy8gPT09PT09PSBXT1JMRCBTVEFURSA9PT09PT1cblxuXG52YXIgd29ybGRfZGVmID0ge1xuICBncmF2aXR5OiBuZXcgYjJWZWMyKDAuMCwgLTkuODEpLFxuICBkb1NsZWVwOiB0cnVlLFxuICBmbG9vcnNlZWQ6IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpLFxuICB0aWxlRGltZW5zaW9uczogbmV3IGIyVmVjMigxLjUsIDAuMTUpLFxuICBtYXhGbG9vclRpbGVzOiAyMDAsXG4gIG11dGFibGVfZmxvb3I6IGZhbHNlXG59XG5cbnZhciBjd19kZWFkQ2FycztcbnZhciBncmFwaFN0YXRlID0ge1xuICBjd190b3BTY29yZXM6IFtdLFxuICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxuICBjd19ncmFwaEVsaXRlOiBbXSxcbiAgY3dfZ3JhcGhUb3A6IFtdLFxufTtcblxuZnVuY3Rpb24gcmVzZXRHcmFwaFN0YXRlKCl7XG4gIGdyYXBoU3RhdGUgPSB7XG4gICAgY3dfdG9wU2NvcmVzOiBbXSxcbiAgICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxuICAgIGN3X2dyYXBoRWxpdGU6IFtdLFxuICAgIGN3X2dyYXBoVG9wOiBbXSxcbiAgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLy8gPT09PT09PT0gQWN0aXZpdHkgU3RhdGUgPT09PVxudmFyIGN3X3J1bm5pbmdJbnRlcnZhbDtcbnZhciBjd19kcmF3SW50ZXJ2YWw7XG52YXIgY3VycmVudFNjZW5lO1xuXG5mdW5jdGlvbiBzaG93RGlzdGFuY2UoZGlzdGFuY2UsIGhlaWdodCkge1xuICBkaXN0YW5jZU1ldGVyLmlubmVySFRNTCA9IGRpc3RhbmNlICsgXCIgbWV0ZXJzPGJyIC8+XCI7XG4gIGhlaWdodE1ldGVyLmlubmVySFRNTCA9IGhlaWdodCArIFwiIG1ldGVyc1wiO1xuICBpZiAoZGlzdGFuY2UgPiBtaW5pbWFwZm9nZGlzdGFuY2UpIHtcbiAgICBmb2dkaXN0YW5jZS53aWR0aCA9IDgwMCAtIE1hdGgucm91bmQoZGlzdGFuY2UgKyAxNSkgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XG4gICAgbWluaW1hcGZvZ2Rpc3RhbmNlID0gZGlzdGFuY2U7XG4gIH1cbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09IENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xudmFyIGN3X0NhciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmN3X0Nhci5wcm90b3R5cGUuY2hhc3NpcyA9IG51bGw7XG5cbmN3X0Nhci5wcm90b3R5cGUud2hlZWxzID0gW107XG5cbmN3X0Nhci5wcm90b3R5cGUuX19jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChjYXJfZGVmKSB7XG4gIHRoaXMuY2FyX2RlZiA9IGNhcl9kZWY7XG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgZnJhbWVzOiAwLFxuICAgIGhlYWx0aDogbWF4X2Nhcl9oZWFsdGgsXG4gICAgbWF4UG9zaXRpb255OiAwLFxuICAgIG1pblBvc2l0aW9ueTogMCxcbiAgICBtYXhQb3NpdGlvbng6IDAsXG4gIH1cbiAgdGhpcy5mcmFtZXMgPSAwO1xuICB0aGlzLmFsaXZlID0gdHJ1ZTtcbiAgdGhpcy5pc19lbGl0ZSA9IGNhcl9kZWYuaXNfZWxpdGU7XG4gIHRoaXMuaGVhbHRoQmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLnN0eWxlO1xuICB0aGlzLmhlYWx0aEJhclRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiICsgY2FyX2RlZi5pbmRleCkubmV4dFNpYmxpbmcubmV4dFNpYmxpbmc7XG4gIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xuICB0aGlzLm1pbmltYXBtYXJrZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJhclwiICsgY2FyX2RlZi5pbmRleCk7XG5cbiAgaWYgKHRoaXMuaXNfZWxpdGUpIHtcbiAgICB0aGlzLmhlYWx0aEJhci5iYWNrZ3JvdW5kQ29sb3IgPSBcIiMzRjcyQUZcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmhlYWx0aEJhci5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGN0M4NzNcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICNGN0M4NzNcIjtcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcbiAgfVxuXG4gIHZhciBjb25zdHJ1Y3RlZENhciA9IGRlZlRvQ2FyKGNhcl9kZWYsIGN1cnJlbnRTY2VuZS53b3JsZCwge1xuICAgIGdyYXZpdHk6IHdvcmxkX2RlZi5ncmF2aXR5LFxuICAgIG1vdG9yU3BlZWQ6IG1vdG9yU3BlZWQsXG4gIH0pO1xuICB0aGlzLmNvbnN0cnVjdGVkQ2FyID0gY29uc3RydWN0ZWRDYXI7XG5cbiAgdGhpcy5yZXBsYXkgPSBnaG9zdF9jcmVhdGVfcmVwbGF5KCk7XG4gIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUodGhpcy5yZXBsYXksIHRoaXMuY29uc3RydWN0ZWRDYXIpO1xufVxuXG5jd19DYXIucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jb25zdHJ1Y3RlZENhci5jaGFzc2lzLkdldFBvc2l0aW9uKCk7XG59XG5cbmN3X0Nhci5wcm90b3R5cGUua2lsbCA9IGZ1bmN0aW9uICgpIHtcbiAgc3dpdGNoKHRoaXMuZ2V0U3RhdHVzKCkpe1xuICAgIGNhc2UgMToge1xuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGNhc2UgLTE6IHtcbiAgICAgIHRoaXMuaGVhbHRoQmFyVGV4dC5pbm5lckhUTUwgPSBcIiZkYWdnZXI7XCI7XG4gICAgICB0aGlzLmhlYWx0aEJhci53aWR0aCA9IFwiMFwiO1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgdmFyIHNjb3JlID0gcnVuLmNhbGN1bGF0ZVNjb3JlKHRoaXMuc3RhdGUsIHtcbiAgICBib3gyZGZwczogYm94MmRmcHNcbiAgfSk7XG4gIC8vIGNvbnNvbGUubG9nKHNjb3JlKTtcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXkodGhpcy5yZXBsYXksIGdob3N0LCBzY29yZS52KTtcbiAgc2NvcmUuY2FyX2RlZiA9IHRoaXMuY2FyX2RlZjtcbiAgc2NvcmUuaSA9IGdlbl9jb3VudGVyO1xuICBjd19jYXJTY29yZXMucHVzaChzY29yZSk7XG4gIHZhciBjYXIgPSB0aGlzLmNvbnN0cnVjdGVkQ2FyO1xuICBjdXJyZW50U2NlbmUud29ybGQuRGVzdHJveUJvZHkoY2FyLmNoYXNzaXMpO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FyLndoZWVscy5sZW5ndGg7IGkrKykge1xuICAgIGN1cnJlbnRTY2VuZS53b3JsZC5EZXN0cm95Qm9keShjYXIud2hlZWxzW2ldKTtcbiAgfVxuICB0aGlzLmFsaXZlID0gZmFsc2U7XG5cbiAgLy8gcmVmb2N1cyBjYW1lcmEgdG8gbGVhZGVyIG9uIGRlYXRoXG4gIGlmIChjYW1lcmEudGFyZ2V0ID09IHRoaXMuY2FyX2RlZi5pbmRleCkge1xuICAgIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XG4gIH1cbn1cbmN3X0Nhci5wcm90b3R5cGUudXBkYXRlU3RhdGUgPSBmdW5jdGlvbigpe1xuICB0aGlzLnN0YXRlID0gcnVuLnVwZGF0ZVN0YXRlKHtcbiAgICBmaW5pc2hMaW5lOiBjdXJyZW50U2NlbmUuZmluaXNoTGluZSxcbiAgICBtYXhfY2FyX2hlYWx0aDogbWF4X2Nhcl9oZWFsdGgsXG4gIH0sIHRoaXMuY29uc3RydWN0ZWRDYXIsIHRoaXMuc3RhdGUpXG59XG5cbmN3X0Nhci5wcm90b3R5cGUuZ2V0U3RhdHVzID0gZnVuY3Rpb24gKCkge1xuICAvLyBjaGVjayBoZWFsdGhcbiAgcmV0dXJuIHJ1bi5nZXRTdGF0dXModGhpcy5zdGF0ZSwge1xuICAgIGZpbmlzaExpbmU6IGN1cnJlbnRTY2VuZS5maW5pc2hMaW5lLFxuICAgIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcbiAgfSlcbn1cblxuXG4vKiA9PT0gRU5EIENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09PSBHZW5lcmF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5mdW5jdGlvbiBjd19nZW5lcmF0aW9uWmVybygpIHtcbiAgY3dfY2FyR2VuZXJhdGlvbiA9IFtdO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcbiAgICB2YXIgZGVmID0gZ2VuZXRpYy5jcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGZ1bmN0aW9uKCl7XG4gICAgICByZXR1cm4gTWF0aC5yYW5kb20oKVxuICAgIH0pO1xuICAgIGRlZi5pbmRleCA9IGs7XG4gICAgY3dfY2FyR2VuZXJhdGlvbi5wdXNoKGRlZik7XG4gIH1cblxuICBnZW5fY291bnRlciA9IDA7XG4gIGN3X21hdGVyaWFsaXplR2VuZXJhdGlvbigpO1xuICByZXNldENhclVJKCk7XG59XG5cbmZ1bmN0aW9uIGN3X21hdGVyaWFsaXplR2VuZXJhdGlvbigpIHtcbiAgY3dfY2FyQXJyYXkgPSBuZXcgQXJyYXkoKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG4gICAgY3dfY2FyQXJyYXkucHVzaChuZXcgY3dfQ2FyKGN3X2NhckdlbmVyYXRpb25ba10pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNldENhclVJKCl7XG4gIGN3X2RlYWRDYXJzID0gMDtcbiAgbGVhZGVyUG9zaXRpb24gPSBuZXcgT2JqZWN0KCk7XG4gIGxlYWRlclBvc2l0aW9uLnggPSAwO1xuICBsZWFkZXJQb3NpdGlvbi55ID0gMDtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IGdlbl9jb3VudGVyLnRvU3RyaW5nKCk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gZ2VuZXJhdGlvblNpemUudG9TdHJpbmcoKTtcbn1cblxuZnVuY3Rpb24gY3dfbmV4dEdlbmVyYXRpb24oKSB7XG4gIHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XG4gIHZhciBuZXdib3JuO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbl9jaGFtcGlvbnM7IGsrKykge2BgXG4gICAgY3dfY2FyU2NvcmVzW2tdLmNhcl9kZWYuaXNfZWxpdGUgPSB0cnVlO1xuICAgIGN3X2NhclNjb3Jlc1trXS5jYXJfZGVmLmluZGV4ID0gaztcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2goY3dfY2FyU2NvcmVzW2tdLmNhcl9kZWYpO1xuICB9XG4gIGZvciAoayA9IGdlbl9jaGFtcGlvbnM7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG4gICAgdmFyIHBhcmVudDEgPSBjd19nZXRQYXJlbnRzKCk7XG4gICAgdmFyIHBhcmVudDIgPSBwYXJlbnQxO1xuICAgIHdoaWxlIChwYXJlbnQyID09IHBhcmVudDEpIHtcbiAgICAgIHBhcmVudDIgPSBjd19nZXRQYXJlbnRzKCk7XG4gICAgfVxuICAgIG5ld2Jvcm4gPSBjd19tYWtlQ2hpbGQoXG4gICAgICBjd19jYXJTY29yZXNbcGFyZW50MV0uY2FyX2RlZixcbiAgICAgIGN3X2NhclNjb3Jlc1twYXJlbnQyXS5jYXJfZGVmXG4gICAgKTtcbiAgICBuZXdib3JuID0gY3dfbXV0YXRlKG5ld2Jvcm4pO1xuICAgIG5ld2Jvcm4uaXNfZWxpdGUgPSBmYWxzZTtcbiAgICBuZXdib3JuLmluZGV4ID0gaztcbiAgICBuZXdHZW5lcmF0aW9uLnB1c2gobmV3Ym9ybik7XG4gIH1cbiAgY3dfY2FyU2NvcmVzID0gbmV3IEFycmF5KCk7XG4gIGN3X2NhckdlbmVyYXRpb24gPSBuZXdHZW5lcmF0aW9uO1xuICBnZW5fY291bnRlcisrO1xufVxuXG5mdW5jdGlvbiBjd19nZXRQYXJlbnRzKCkge1xuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XG4gIGlmIChyID09IDApXG4gICAgcmV0dXJuIDA7XG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIGdlbmVyYXRpb25TaXplKSAlIGdlbmVyYXRpb25TaXplO1xufVxuXG5mdW5jdGlvbiBjd19tYWtlQ2hpbGQoY2FyX2RlZjEsIGNhcl9kZWYyKSB7XG4gIHZhciBjdXJwYXJlbnQgPSAwO1xuXG4gIHN3YXBQb2ludDEgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMgLSAxKSk7XG4gIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xuICB3aGlsZSAoc3dhcFBvaW50MiA9PSBzd2FwUG9pbnQxKSB7XG4gICAgc3dhcFBvaW50MiA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcyAtIDEpKTtcbiAgfVxuICB2YXIgaSA9IDA7XG4gIHJldHVybiBnZW5ldGljLmNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBbY2FyX2RlZjEsIGNhcl9kZWYyXSwgZnVuY3Rpb24oa2V5IC8qICwgcGFyZW50cyAqLyl7XG4gICAgaWYoW1wid2hlZWxfcmFkaXVzXCIsIFwid2hlZWxfdmVydGV4XCIsIFwid2hlZWxfZGVuc2l0eVwiXS5pbmRleE9mKGtleSkgPiAtMSl7XG4gICAgICBjdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoY3VycGFyZW50LCArK2kpO1xuICAgICAgcmV0dXJuIGN1cnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIGN3X2Nob29zZVBhcmVudChjdXJwYXJlbnQsICsraSk7XG4gIH0pXG59XG5cbmZ1bmN0aW9uIGN3X211dGF0ZShwYXJlbnQpe1xuICByZXR1cm4gZ2VuZXRpYy5jcmVhdGVNdXRhdGVkQ2xvbmUoc2NoZW1hLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBNYXRoLnJhbmRvbSgpXG4gIH0sIHBhcmVudCwgTWF0aC5tYXgobXV0YXRpb25fcmFuZ2UsIGdlbl9tdXRhdGlvbikpXG59XG5cblxuZnVuY3Rpb24gY3dfY2hvb3NlUGFyZW50KGN1cnBhcmVudCwgYXR0cmlidXRlSW5kZXgpIHtcbiAgdmFyIHJldDtcbiAgaWYgKChzd2FwUG9pbnQxID09IGF0dHJpYnV0ZUluZGV4KSB8fCAoc3dhcFBvaW50MiA9PSBhdHRyaWJ1dGVJbmRleCkpIHtcbiAgICBpZiAoY3VycGFyZW50ID09IDEpIHtcbiAgICAgIHJldCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldCA9IDE7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldCA9IGN1cnBhcmVudDtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKiA9PT09IEVORCBHZW5yYXRpb24gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8qID09PT0gRHJhd2luZyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cblxuZnVuY3Rpb24gY3dfZHJhd1NjcmVlbigpIHtcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xuICB2YXIgY2FtZXJhX3kgPSBjYW1lcmEucG9zLnk7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgY3R4LnNhdmUoKTtcbiAgY3dfc2V0Q2FtZXJhUG9zaXRpb24oKTtcbiAgY3R4LnRyYW5zbGF0ZSgyMDAgLSAoY2FtZXJhX3ggKiB6b29tKSwgMjAwICsgKGNhbWVyYV95ICogem9vbSkpO1xuICBjdHguc2NhbGUoem9vbSwgLXpvb20pO1xuICBjd19kcmF3Rmxvb3IoY3R4LCBjYW1lcmEsIGN1cnJlbnRTY2VuZS5mbG9vclRpbGVzKTtcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0LCBjYW1lcmEpO1xuICBjd19kcmF3Q2FycygpO1xuICBjdHgucmVzdG9yZSgpO1xufVxuXG5mdW5jdGlvbiBjd19taW5pbWFwQ2FtZXJhKC8qIHgsIHkqLykge1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLnhcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55XG4gIG1pbmltYXBjYW1lcmEubGVmdCA9IE1hdGgucm91bmQoKDIgKyBjYW1lcmFfeCkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xuICBtaW5pbWFwY2FtZXJhLnRvcCA9IE1hdGgucm91bmQoKDMxIC0gY2FtZXJhX3kpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcbn1cblxuZnVuY3Rpb24gY3dfc2V0Q2FtZXJhVGFyZ2V0KGspIHtcbiAgY2FtZXJhLnRhcmdldCA9IGs7XG59XG5cbmZ1bmN0aW9uIGN3X3NldENhbWVyYVBvc2l0aW9uKCkge1xuICB2YXIgY2FtZXJhVGFyZ2V0UG9zaXRpb25cbiAgaWYgKGNhbWVyYS50YXJnZXQgPj0gMCkge1xuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gY3dfY2FyQXJyYXlbY2FtZXJhLnRhcmdldF0uZ2V0UG9zaXRpb24oKTtcbiAgfSBlbHNlIHtcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGxlYWRlclBvc2l0aW9uO1xuICB9XG4gIHZhciBkaWZmX3kgPSBjYW1lcmEucG9zLnkgLSBjYW1lcmFUYXJnZXRQb3NpdGlvbi55O1xuICB2YXIgZGlmZl94ID0gY2FtZXJhLnBvcy54IC0gY2FtZXJhVGFyZ2V0UG9zaXRpb24ueDtcbiAgY2FtZXJhLnBvcy55IC09IGNhbWVyYS5zcGVlZCAqIGRpZmZfeTtcbiAgY2FtZXJhLnBvcy54IC09IGNhbWVyYS5zcGVlZCAqIGRpZmZfeDtcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XG59XG5cbmZ1bmN0aW9uIGN3X2RyYXdHaG9zdFJlcGxheSgpIHtcbiAgdmFyIGNhclBvc2l0aW9uID0gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KTtcbiAgY2FtZXJhLnBvcy54ID0gY2FyUG9zaXRpb24ueDtcbiAgY2FtZXJhLnBvcy55ID0gY2FyUG9zaXRpb24ueTtcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XG4gIHNob3dEaXN0YW5jZShNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLCBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnkgKiAxMDApIC8gMTAwKTtcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xuICBjdHguc2F2ZSgpO1xuICBjdHgudHJhbnNsYXRlKDIwMCAtIChjYXJQb3NpdGlvbi54ICogY2FtZXJhLnpvb20pLCAyMDAgKyAoY2FyUG9zaXRpb24ueSAqIGNhbWVyYS56b29tKSk7XG4gIGN0eC5zY2FsZShjYW1lcmEuem9vbSwgLWNhbWVyYS56b29tKTtcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0KTtcbiAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgY3VycmVudFNjZW5lLmZsb29yVGlsZXMpO1xuICBjdHgucmVzdG9yZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2RyYXdDYXJzKCkge1xuICBmb3IgKHZhciBrID0gKGN3X2NhckFycmF5Lmxlbmd0aCAtIDEpOyBrID49IDA7IGstLSkge1xuICAgIHZhciBteUNhciA9IGN3X2NhckFycmF5W2tdO1xuICAgIGRyYXdDYXIoY2FyQ29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gdG9nZ2xlRGlzcGxheSgpIHtcbiAgaWYgKGN3X3BhdXNlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjYW52YXMud2lkdGggPSBjYW52YXMud2lkdGg7XG4gIGlmIChkb0RyYXcpIHtcbiAgICBkb0RyYXcgPSBmYWxzZTtcbiAgICBjd19zdG9wU2ltdWxhdGlvbigpO1xuICAgIGN3X3J1bm5pbmdJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB0aW1lID0gcGVyZm9ybWFuY2Uubm93KCkgKyAoMTAwMCAvIHNjcmVlbmZwcyk7XG4gICAgICB3aGlsZSAodGltZSA+IHBlcmZvcm1hbmNlLm5vdygpKSB7XG4gICAgICAgIHNpbXVsYXRpb25TdGVwKCk7XG4gICAgICB9XG4gICAgfSwgMSk7XG4gIH0gZWxzZSB7XG4gICAgZG9EcmF3ID0gdHJ1ZTtcbiAgICBjbGVhckludGVydmFsKGN3X3J1bm5pbmdJbnRlcnZhbCk7XG4gICAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3dfZHJhd01pbmlNYXAoKSB7XG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xuICBtaW5pbWFwZm9nZGlzdGFuY2UgPSAwO1xuICBmb2dkaXN0YW5jZS53aWR0aCA9IFwiODAwcHhcIjtcbiAgbWluaW1hcGNhbnZhcy53aWR0aCA9IG1pbmltYXBjYW52YXMud2lkdGg7XG4gIG1pbmltYXBjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgbWluaW1hcGN0eC5iZWdpblBhdGgoKTtcbiAgbWluaW1hcGN0eC5tb3ZlVG8oMCwgMzUgKiBtaW5pbWFwc2NhbGUpO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGN1cnJlbnRTY2VuZS5mbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XG4gICAgbGFzdF90aWxlID0gY3VycmVudFNjZW5lLmZsb29yVGlsZXNba107XG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xuICAgIHZhciBsYXN0X3dvcmxkX2Nvb3JkcyA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xuICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3dvcmxkX2Nvb3JkcztcbiAgICBtaW5pbWFwY3R4LmxpbmVUbygodGlsZV9wb3NpdGlvbi54ICsgNSkgKiBtaW5pbWFwc2NhbGUsICgtdGlsZV9wb3NpdGlvbi55ICsgMzUpICogbWluaW1hcHNjYWxlKTtcbiAgfVxuICBtaW5pbWFwY3R4LnN0cm9rZSgpO1xufVxuXG4vKiA9PT09IEVORCBEcmF3aW5nID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjc2F2ZS1wcm9ncmVzc1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgc2F2ZVByb2dyZXNzKClcbn0pO1xuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3Jlc3RvcmUtcHJvZ3Jlc3NcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIHJlc3RvcmVQcm9ncmVzcygpXG59KTtcblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiN0b2dnbGUtZGlzcGxheVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcbiAgdG9nZ2xlRGlzcGxheSgpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI25ldy1wb3B1bGF0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xuICBjd19yZXNldFBvcHVsYXRpb24oKVxufSlcblxuZnVuY3Rpb24gc2F2ZVByb2dyZXNzKCkge1xuICBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID0gSlNPTi5zdHJpbmdpZnkoY3dfY2FyR2VuZXJhdGlvbik7XG4gIGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyID0gZ2VuX2NvdW50ZXI7XG4gIGxvY2FsU3RvcmFnZS5jd19naG9zdCA9IEpTT04uc3RyaW5naWZ5KGdob3N0KTtcbiAgbG9jYWxTdG9yYWdlLmN3X3RvcFNjb3JlcyA9IEpTT04uc3RyaW5naWZ5KGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzKTtcbiAgbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZCA9IHdvcmxkX2RlZi5mbG9vcnNlZWQ7XG59XG5cbmZ1bmN0aW9uIHJlc3RvcmVQcm9ncmVzcygpIHtcbiAgaWYgKHR5cGVvZiBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID09ICd1bmRlZmluZWQnIHx8IGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPT0gbnVsbCkge1xuICAgIGFsZXJ0KFwiTm8gc2F2ZWQgcHJvZ3Jlc3MgZm91bmRcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XG4gIGN3X2NhckdlbmVyYXRpb24gPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24pO1xuICBnZW5fY291bnRlciA9IGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyO1xuICBnaG9zdCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X2dob3N0KTtcbiAgZ3JhcGhTdGF0ZS5jd190b3BTY29yZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5jd190b3BTY29yZXMpO1xuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZDtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlID0gd29ybGRfZGVmLmZsb29yc2VlZDtcblxuICBjdXJyZW50U2NlbmUgPSBzZXR1cFNjZW5lKHdvcmxkX2RlZik7XG4gIGN3X2RyYXdNaW5pTWFwKCk7XG4gIE1hdGguc2VlZHJhbmRvbSgpO1xuXG4gIGN3X21hdGVyaWFsaXplR2VuZXJhdGlvbigpO1xuICByZXNldENhclVJKCk7XG4gIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xufVxuXG5cbmZ1bmN0aW9uIHNpbXVsYXRpb25TdGVwKCkge1xuICB2YXIgd29ybGQgPSBjdXJyZW50U2NlbmUud29ybGRcbiAgd29ybGQuU3RlcCgxIC8gYm94MmRmcHMsIDIwLCAyMCk7XG4gIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xuICBmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcbiAgICB2YXIgY2FyID0gY3dfY2FyQXJyYXlba107XG4gICAgaWYgKCFjYXIuYWxpdmUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjYXIuZnJhbWVzKys7XG4gICAgY2FyLnVwZGF0ZVN0YXRlKCk7XG4gICAgdXBkYXRlQ2FyVUkoY2FyLCBrKTtcbiAgICB2YXIgc3RhdHVzID0gY2FyLmdldFN0YXR1cygpO1xuICAgIGlmKHN0YXR1cyA9PT0gMCl7XG4gICAgICBjYXIua2lsbCgpO1xuICAgICAgY3dfZGVhZENhcnMrKztcbiAgICAgIGlmIChjd19kZWFkQ2FycyA+PSBnZW5lcmF0aW9uU2l6ZSkge1xuICAgICAgICBjbGVhbnVwUm91bmQoKTtcbiAgICAgICAgcmV0dXJuIGN3X25ld1JvdW5kKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHNob3dEaXN0YW5jZShcbiAgICBNYXRoLnJvdW5kKGxlYWRlclBvc2l0aW9uLnggKiAxMDApIC8gMTAwLFxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcbiAgKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlQ2FyVUkoY2FyLCBrKXtcbiAgdmFyIHBvc2l0aW9uID0gY2FyLmdldFBvc2l0aW9uKCk7XG5cbiAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShjYXIucmVwbGF5LCBjYXIuY29uc3RydWN0ZWRDYXIpO1xuICBjYXIubWluaW1hcG1hcmtlci5zdHlsZS5sZWZ0ID0gTWF0aC5yb3VuZCgocG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcbiAgY2FyLmhlYWx0aEJhci53aWR0aCA9IE1hdGgucm91bmQoKGNhci5zdGF0ZS5oZWFsdGggLyBtYXhfY2FyX2hlYWx0aCkgKiAxMDApICsgXCIlXCI7XG4gIHZhciBzdGF0dXMgPSBjYXIuZ2V0U3RhdHVzKCk7XG4gIGlmKHN0YXR1cyA9PT0gMCl7XG4gICAgaWYgKHBvc2l0aW9uLnggPiBsZWFkZXJQb3NpdGlvbi54KSB7XG4gICAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xuICAgICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wdWxhdGlvblwiKS5pbm5lckhUTUwgPSAoZ2VuZXJhdGlvblNpemUgLSBjd19kZWFkQ2FycykudG9TdHJpbmcoKTtcbiAgY3dfY2FyQXJyYXlba10ubWluaW1hcG1hcmtlci5zdHlsZS5ib3JkZXJMZWZ0ID0gXCIxcHggc29saWQgIzNGNzJBRlwiO1xuICBpZiAobGVhZGVyUG9zaXRpb24ubGVhZGVyID09IGspIHtcbiAgICAvLyBsZWFkZXIgaXMgZGVhZCwgZmluZCBuZXcgbGVhZGVyXG4gICAgY3dfZmluZExlYWRlcigpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGN3X2ZpbmRMZWFkZXIoKSB7XG4gIHZhciBsZWFkID0gMDtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBjd19jYXJBcnJheS5sZW5ndGg7IGsrKykge1xuICAgIGlmICghY3dfY2FyQXJyYXlba10uYWxpdmUpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICB2YXIgcG9zaXRpb24gPSBjd19jYXJBcnJheVtrXS5nZXRQb3NpdGlvbigpO1xuICAgIGlmIChwb3NpdGlvbi54ID4gbGVhZCkge1xuICAgICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFudXBSb3VuZCgpe1xuXG4gIGN3X2NhclNjb3Jlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgaWYgKGEudiA+IGIudikge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAxXG4gICAgfVxuICB9KVxuICBncmFwaFN0YXRlID0gcGxvdF9ncmFwaHMoXG4gICAgZ3JhcGhTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZVxuICApO1xufVxuXG5mdW5jdGlvbiBjd19uZXdSb3VuZCgpIHtcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XG4gICAgLy8gR0hPU1QgRElTQUJMRURcbiAgICBnaG9zdCA9IG51bGw7XG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xuICAgIGN1cnJlbnRTY2VuZSA9IHNldHVwU2NlbmUod29ybGRfZGVmKTtcbiAgICBjd19kcmF3TWluaU1hcCgpO1xuICB9IGVsc2Uge1xuICAgIC8vIFJFLUVOQUJMRSBHSE9TVFxuICAgIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcbiAgfVxuXG4gIGNhbWVyYS5wb3MueCA9IGNhbWVyYS5wb3MueSA9IDA7XG4gIGN3X3NldENhbWVyYVRhcmdldCgtMSk7XG5cbiAgY3dfbmV4dEdlbmVyYXRpb24oKTtcbiAgY3dfbWF0ZXJpYWxpemVHZW5lcmF0aW9uKCk7XG4gIHJlc2V0Q2FyVUkoKTtcbn1cblxuZnVuY3Rpb24gY3dfc3RhcnRTaW11bGF0aW9uKCkge1xuICBjd19ydW5uaW5nSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChzaW11bGF0aW9uU3RlcCwgTWF0aC5yb3VuZCgxMDAwIC8gYm94MmRmcHMpKTtcbiAgY3dfZHJhd0ludGVydmFsID0gc2V0SW50ZXJ2YWwoY3dfZHJhd1NjcmVlbiwgTWF0aC5yb3VuZCgxMDAwIC8gc2NyZWVuZnBzKSk7XG59XG5cbmZ1bmN0aW9uIGN3X3N0b3BTaW11bGF0aW9uKCkge1xuICBjbGVhckludGVydmFsKGN3X3J1bm5pbmdJbnRlcnZhbCk7XG4gIGNsZWFySW50ZXJ2YWwoY3dfZHJhd0ludGVydmFsKTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uKCkge1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdlbmVyYXRpb25cIikuaW5uZXJIVE1MID0gXCJcIjtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYXJzXCIpLmlubmVySFRNTCA9IFwiXCI7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLmlubmVySFRNTCA9IFwiXCI7XG4gIGN3X2NsZWFyR3JhcGhpY3MoKTtcbiAgY3dfY2FyQXJyYXkgPSBuZXcgQXJyYXkoKTtcbiAgY3dfY2FyR2VuZXJhdGlvbiA9IG5ldyBBcnJheSgpO1xuICBjd19jYXJTY29yZXMgPSBuZXcgQXJyYXkoKTtcbiAgcmVzZXRHcmFwaFN0YXRlKCk7XG4gIHN3YXBQb2ludDEgPSAwO1xuICBzd2FwUG9pbnQyID0gMDtcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzZXRXb3JsZCgpIHtcbiAgZG9EcmF3ID0gdHJ1ZTtcbiAgY3dfc3RvcFNpbXVsYXRpb24oKTtcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV3c2VlZFwiKS52YWx1ZTtcbiAgY3VycmVudFNjZW5lID0gc2V0dXBTY2VuZSh3b3JsZF9kZWYpO1xuICBjd19kcmF3TWluaU1hcCgpO1xuICBNYXRoLnNlZWRyYW5kb20oKTtcbiAgY3dfcmVzZXRQb3B1bGF0aW9uKCk7XG4gIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xufVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NvbmZpcm0tcmVzZXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XG4gIGN3X2NvbmZpcm1SZXNldFdvcmxkKClcbn0pXG5cbmZ1bmN0aW9uIGN3X2NvbmZpcm1SZXNldFdvcmxkKCkge1xuICBpZiAoY29uZmlybSgnUmVhbGx5IHJlc2V0IHdvcmxkPycpKSB7XG4gICAgY3dfcmVzZXRXb3JsZCgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vLyBnaG9zdCByZXBsYXkgc3R1ZmZcblxudmFyIG9sZF9sYXN0X2RyYXduX3RpbGU7XG5cbmZ1bmN0aW9uIGN3X3BhdXNlU2ltdWxhdGlvbigpIHtcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcbiAgY2xlYXJJbnRlcnZhbChjd19ydW5uaW5nSW50ZXJ2YWwpO1xuICBjbGVhckludGVydmFsKGN3X2RyYXdJbnRlcnZhbCk7XG4gIG9sZF9sYXN0X2RyYXduX3RpbGUgPSBsYXN0X2RyYXduX3RpbGU7XG4gIGxhc3RfZHJhd25fdGlsZSA9IDA7XG4gIGdob3N0X3BhdXNlKGdob3N0KTtcbn1cblxuZnVuY3Rpb24gY3dfcmVzdW1lU2ltdWxhdGlvbigpIHtcbiAgY3dfcGF1c2VkID0gZmFsc2U7XG4gIGdob3N0X3Jlc3VtZShnaG9zdCk7XG4gIGxhc3RfZHJhd25fdGlsZSA9IG9sZF9sYXN0X2RyYXduX3RpbGU7XG4gIGN3X3J1bm5pbmdJbnRlcnZhbCA9IHNldEludGVydmFsKHNpbXVsYXRpb25TdGVwLCBNYXRoLnJvdW5kKDEwMDAgLyBib3gyZGZwcykpO1xuICBjd19kcmF3SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChjd19kcmF3U2NyZWVuLCBNYXRoLnJvdW5kKDEwMDAgLyBzY3JlZW5mcHMpKTtcbn1cblxuZnVuY3Rpb24gY3dfc3RhcnRHaG9zdFJlcGxheSgpIHtcbiAgaWYgKCFkb0RyYXcpIHtcbiAgICB0b2dnbGVEaXNwbGF5KCk7XG4gIH1cbiAgY3dfcGF1c2VTaW11bGF0aW9uKCk7XG4gIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChjd19kcmF3R2hvc3RSZXBsYXksIE1hdGgucm91bmQoMTAwMCAvIHNjcmVlbmZwcykpO1xufVxuXG5mdW5jdGlvbiBjd19zdG9wR2hvc3RSZXBsYXkoKSB7XG4gIGNsZWFySW50ZXJ2YWwoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCk7XG4gIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBudWxsO1xuICBjd19maW5kTGVhZGVyKCk7XG4gIGNhbWVyYS5wb3MueCA9IGxlYWRlclBvc2l0aW9uLng7XG4gIGNhbWVyYS5wb3MueSA9IGxlYWRlclBvc2l0aW9uLnk7XG4gIGN3X3Jlc3VtZVNpbXVsYXRpb24oKTtcbn1cblxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiN0b2dnbGUtZ2hvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGUpe1xuICBjd190b2dnbGVHaG9zdFJlcGxheShlLnRhcmdldClcbn0pXG5cbmZ1bmN0aW9uIGN3X3RvZ2dsZUdob3N0UmVwbGF5KGJ1dHRvbikge1xuICBpZiAoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9PSBudWxsKSB7XG4gICAgY3dfc3RhcnRHaG9zdFJlcGxheSgpO1xuICAgIGJ1dHRvbi52YWx1ZSA9IFwiUmVzdW1lIHNpbXVsYXRpb25cIjtcbiAgfSBlbHNlIHtcbiAgICBjd19zdG9wR2hvc3RSZXBsYXkoKTtcbiAgICBidXR0b24udmFsdWUgPSBcIlZpZXcgdG9wIHJlcGxheVwiO1xuICB9XG59XG4vLyBnaG9zdCByZXBsYXkgc3R1ZmYgRU5EXG5cbi8vIGluaXRpYWwgc3R1ZmYsIG9ubHkgY2FsbGVkIG9uY2UgKGhvcGVmdWxseSlcbmZ1bmN0aW9uIGN3X2luaXQoKSB7XG4gIC8vIGNsb25lIHNpbHZlciBkb3QgYW5kIGhlYWx0aCBiYXJcbiAgdmFyIG1tbSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdtaW5pbWFwbWFya2VyJylbMF07XG4gIHZhciBoYmFyID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ2hlYWx0aGJhcicpWzBdO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xuXG4gICAgLy8gbWluaW1hcCBtYXJrZXJzXG4gICAgdmFyIG5ld2JhciA9IG1tbS5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgbmV3YmFyLmlkID0gXCJiYXJcIiArIGs7XG4gICAgbmV3YmFyLnN0eWxlLnBhZGRpbmdUb3AgPSBrICogOSArIFwicHhcIjtcbiAgICBtaW5pbWFwaG9sZGVyLmFwcGVuZENoaWxkKG5ld2Jhcik7XG5cbiAgICAvLyBoZWFsdGggYmFyc1xuICAgIHZhciBuZXdoZWFsdGggPSBoYmFyLmNsb25lTm9kZSh0cnVlKTtcbiAgICBuZXdoZWFsdGguZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJESVZcIilbMF0uaWQgPSBcImhlYWx0aFwiICsgaztcbiAgICBuZXdoZWFsdGguY2FyX2luZGV4ID0gaztcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiKS5hcHBlbmRDaGlsZChuZXdoZWFsdGgpO1xuICB9XG4gIG1tbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG1tbSk7XG4gIGhiYXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChoYmFyKTtcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xuICBjdXJyZW50U2NlbmUgPSBzZXR1cFNjZW5lKHdvcmxkX2RlZik7XG4gIGN3X2RyYXdNaW5pTWFwKCk7XG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XG4gIGN3X3J1bm5pbmdJbnRlcnZhbCA9IHNldEludGVydmFsKHNpbXVsYXRpb25TdGVwLCBNYXRoLnJvdW5kKDEwMDAgLyBib3gyZGZwcykpO1xuICBjd19kcmF3SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChjd19kcmF3U2NyZWVuLCBNYXRoLnJvdW5kKDEwMDAgLyBzY3JlZW5mcHMpKTtcbn1cblxuZnVuY3Rpb24gcmVsTW91c2VDb29yZHMoZXZlbnQpIHtcbiAgdmFyIHRvdGFsT2Zmc2V0WCA9IDA7XG4gIHZhciB0b3RhbE9mZnNldFkgPSAwO1xuICB2YXIgY2FudmFzWCA9IDA7XG4gIHZhciBjYW52YXNZID0gMDtcbiAgdmFyIGN1cnJlbnRFbGVtZW50ID0gdGhpcztcblxuICBkbyB7XG4gICAgdG90YWxPZmZzZXRYICs9IGN1cnJlbnRFbGVtZW50Lm9mZnNldExlZnQgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xuICAgIHRvdGFsT2Zmc2V0WSArPSBjdXJyZW50RWxlbWVudC5vZmZzZXRUb3AgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxUb3A7XG4gICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5vZmZzZXRQYXJlbnRcbiAgfVxuICB3aGlsZSAoY3VycmVudEVsZW1lbnQpO1xuXG4gIGNhbnZhc1ggPSBldmVudC5wYWdlWCAtIHRvdGFsT2Zmc2V0WDtcbiAgY2FudmFzWSA9IGV2ZW50LnBhZ2VZIC0gdG90YWxPZmZzZXRZO1xuXG4gIHJldHVybiB7eDogY2FudmFzWCwgeTogY2FudmFzWX1cbn1cbkhUTUxEaXZFbGVtZW50LnByb3RvdHlwZS5yZWxNb3VzZUNvb3JkcyA9IHJlbE1vdXNlQ29vcmRzO1xubWluaW1hcGhvbGRlci5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIHZhciBjb29yZHMgPSBtaW5pbWFwaG9sZGVyLnJlbE1vdXNlQ29vcmRzKGV2ZW50KTtcbiAgdmFyIGNsb3Nlc3QgPSB7XG4gICAgaW5kZXg6IDAsXG4gICAgZGlzdDogTWF0aC5hYnMoKChjd19jYXJBcnJheVswXS5nZXRQb3NpdGlvbigpLnggKyA2KSAqIG1pbmltYXBzY2FsZSkgLSBjb29yZHMueCksXG4gICAgeDogY3dfY2FyQXJyYXlbMF0uZ2V0UG9zaXRpb24oKS54XG4gIH1cblxuICB2YXIgbWF4WCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY3dfY2FyQXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoIWN3X2NhckFycmF5W2ldLmFsaXZlKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdmFyIHBvcyA9IGN3X2NhckFycmF5W2ldLmdldFBvc2l0aW9uKCk7XG4gICAgdmFyIGRpc3QgPSBNYXRoLmFicygoKHBvcy54ICsgNikgKiBtaW5pbWFwc2NhbGUpIC0gY29vcmRzLngpO1xuICAgIGlmIChkaXN0IDwgY2xvc2VzdC5kaXN0KSB7XG4gICAgICBjbG9zZXN0LmluZGV4ID0gaTtcbiAgICAgIGNsb3Nlc3QuZGlzdCA9IGRpc3Q7XG4gICAgICBjbG9zZXN0LnggPSBwb3MueDtcbiAgICB9XG4gICAgbWF4WCA9IE1hdGgubWF4KHBvcy54LCBtYXhYKTtcbiAgfVxuXG4gIGlmIChjbG9zZXN0LnggPT0gbWF4WCkgeyAvLyBmb2N1cyBvbiBsZWFkZXIgYWdhaW5cbiAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xuICB9IGVsc2Uge1xuICAgIGN3X3NldENhbWVyYVRhcmdldChjbG9zZXN0LmluZGV4KTtcbiAgfVxufVxuXG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25yYXRlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0TXV0YXRpb24oZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9uc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldE11dGF0aW9uUmFuZ2UoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zsb29yXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XG4gIHZhciBlbGVtID0gZS50YXJnZXRcbiAgY3dfc2V0TXV0YWJsZUZsb29yKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxufSk7XG5cbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZ3Jhdml0eVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldEdyYXZpdHkoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXG59KVxuXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2VsaXRlc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xuICB2YXIgZWxlbSA9IGUudGFyZ2V0XG4gIGN3X3NldEVsaXRlU2l6ZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcbn0pXG5cbmZ1bmN0aW9uIGN3X3NldE11dGF0aW9uKG11dGF0aW9uKSB7XG4gIGdlbl9tdXRhdGlvbiA9IHBhcnNlRmxvYXQobXV0YXRpb24pO1xufVxuXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvblJhbmdlKHJhbmdlKSB7XG4gIG11dGF0aW9uX3JhbmdlID0gcGFyc2VGbG9hdChyYW5nZSk7XG59XG5cbmZ1bmN0aW9uIGN3X3NldE11dGFibGVGbG9vcihjaG9pY2UpIHtcbiAgd29ybGRfZGVmLm11dGFibGVfZmxvb3IgPSAoY2hvaWNlID09IDEpO1xufVxuXG5mdW5jdGlvbiBjd19zZXRHcmF2aXR5KGNob2ljZSkge1xuICB3b3JsZF9kZWYuZ3Jhdml0eSA9IG5ldyBiMlZlYzIoMC4wLCAtcGFyc2VGbG9hdChjaG9pY2UpKTtcbiAgdmFyIHdvcmxkID0gY3VycmVudFNjZW5lLndvcmxkXG4gIC8vIENIRUNLIEdSQVZJVFkgQ0hBTkdFU1xuICBpZiAod29ybGQuR2V0R3Jhdml0eSgpLnkgIT0gd29ybGRfZGVmLmdyYXZpdHkueSkge1xuICAgIHdvcmxkLlNldEdyYXZpdHkod29ybGRfZGVmLmdyYXZpdHkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGN3X3NldEVsaXRlU2l6ZShjbG9uZXMpIHtcbiAgZ2VuX2NoYW1waW9ucyA9IHBhcnNlSW50KGNsb25lcywgMTApO1xufVxuXG5jd19pbml0KCk7XG4iLCJcblxuY29uc3QgcmFuZG9tID0ge1xuICBzaHVmZmxlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICB2YXIgb2Zmc2V0ID0gcHJvcC5vZmZzZXQgfHwgMDtcbiAgICB2YXIgbWF4ID0gcHJvcC5tYXggfHwgMTA7XG4gICAgdmFyIGwgPSBwcm9wLmxlbmd0aCB8fCBtYXg7XG4gICAgdmFyIHZhbHVlcyA9IFswXTtcbiAgICBpZihsID09PSAxKSByZXR1cm4gdmFsdWVzO1xuICAgIGZvcih2YXIgaSA9IDE7IGkgPCBtYXg7IGkrKyl7XG4gICAgICB2YXIgcGxhY2VtZW50ID0gcmFuZG9tLmNyZWF0ZUludGVnZXJzKFxuICAgICAgICB7IGxlbmd0aDogMSwgbWluOiAwLCByYW5nZTogaSB9LCBnZW5lcmF0b3JcbiAgICAgIClbMF07XG4gICAgICBpZihwbGFjZW1lbnQgPT09IDApe1xuICAgICAgICB2YWx1ZXMudW5zaGlmdChpKTtcbiAgICAgIH0gZWxzZSBpZihwbGFjZW1lbnQgPT09IGkpe1xuICAgICAgICB2YWx1ZXMucHVzaChpKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWVzLnNwbGljZShwbGFjZW1lbnQsIDAsIGkpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXMuc2xpY2UoMCwgbCkubWFwKGZ1bmN0aW9uKG51bSl7XG4gICAgICByZXR1cm4gb2Zmc2V0ICsgbnVtO1xuICAgIH0pO1xuICB9LFxuICBjcmVhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20uY3JlYXRlRmxvYXRzKHtcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEwLFxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aFxuICAgIH0sIGdlbmVyYXRvcikubWFwKGZ1bmN0aW9uKGZsb2F0KXtcbiAgICAgIHJldHVybiBNYXRoLnJvdW5kKGZsb2F0KTtcbiAgICB9KTtcbiAgfSxcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgdmFyIGwgPSBwcm9wLmxlbmd0aDtcbiAgICBwcm9wID0ge1xuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMSxcbiAgICB9XG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xuICAgICAgdmFsdWVzLnB1c2goXG4gICAgICAgIGNyZWF0ZUZsb2F0KHByb3AsIGdlbmVyYXRvcilcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH0sXG4gIG11dGF0ZVNodWZmbGUocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2Upe1xuICAgIHZhciBsID0gcHJvcC5sZW5ndGggfHwgMTtcbiAgICB2YXIgbWF4ID0gcHJvcC5tYXggfHwgMTA7XG4gICAgdmFyIGZhY3RvciA9IChwcm9wLmZhY3RvciB8fCAxKSAqIG11dGF0aW9uX3JhbmdlXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xuICAgICAgdmFyIG5leHRWYWw7XG4gICAgICBkbyB7XG4gICAgICAgIG5leHRWYWwgPSByYW5kb20ubXV0YXRlSW50ZWdlcnMoXG4gICAgICAgICAgeyBtaW46IDAsIHJhbmdlOiBtYXggfSxcbiAgICAgICAgICBnZW5lcmF0b3IsXG4gICAgICAgICAgW29yaWdpbmFsVmFsdWVzW2ldXSxcbiAgICAgICAgICBmYWN0b3JcbiAgICAgICAgKVswXTtcbiAgICAgIH0gd2hpbGUodmFsdWVzLmluZGV4T2YobmV4dFZhbCkgPiAtMSk7XG4gICAgICB2YWx1ZXMucHVzaChuZXh0VmFsKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9LFxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSl7XG4gICAgdmFyIGZhY3RvciA9IChwcm9wLmZhY3RvciB8fCAxKSAqIG11dGF0aW9uX3JhbmdlXG4gICAgcHJvcCA9IHtcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEwXG4gICAgfVxuICAgIHJldHVybiByYW5kb20ubXV0YXRlRmxvYXRzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgZmFjdG9yXG4gICAgKS5tYXAoZnVuY3Rpb24oZmxvYXQpe1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xuICAgIH0pXG4gIH0sXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSl7XG4gICAgdmFyIGZhY3RvciA9IChwcm9wLmZhY3RvciB8fCAxKSAqIG11dGF0aW9uX3JhbmdlXG4gICAgcHJvcCA9IHtcbiAgICAgIG1pbjogcHJvcC5taW4gfHwgMCxcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDFcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coYXJndW1lbnRzKTtcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xuICAgICAgcmV0dXJuIG11dGF0ZUZsb2F0KFxuICAgICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIGZhY3RvclxuICAgICAgKTtcbiAgICB9KTtcbiAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xuXG5mdW5jdGlvbiBjcmVhdGVGbG9hdChwcm9wLCBnZW5lcmF0b3Ipe1xuICB2YXIgbWluID0gcHJvcC5taW47XG4gIHZhciByYW5nZSA9IHByb3AucmFuZ2U7XG4gIHJldHVybiBtaW4gKyBjcmVhdGVSYW5kb20oe2luY2x1c2l2ZTogdHJ1ZX0sIGdlbmVyYXRvcikgKiByYW5nZVxufVxuXG5mdW5jdGlvbiBtdXRhdGVGbG9hdChwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWUsIG11dGF0aW9uX3JhbmdlKXtcbiAgdmFyIG9sZE1pbiA9IHByb3AubWluO1xuICB2YXIgb2xkUmFuZ2UgPSBwcm9wLnJhbmdlO1xuICB2YXIgbmV3UmFuZ2UgPSBvbGRSYW5nZSAqIG11dGF0aW9uX3JhbmdlO1xuICBpZihuZXdSYW5nZSA+IG9sZFJhbmdlKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJtdXRhdGlvbiBzaG91bGQgc2NhbGUgdG8gemVyb1wiKTtcbiAgfVxuICB2YXIgbmV3TWluID0gb3JpZ2luYWxWYWx1ZSAtIDAuNSAqIG5ld1JhbmdlO1xuICBpZiAobmV3TWluIDwgb2xkTWluKSBuZXdNaW4gPSBvbGRNaW47XG4gIGlmIChuZXdNaW4gKyBuZXdSYW5nZSAgPiBvbGRNaW4gKyBvbGRSYW5nZSlcbiAgICBuZXdNaW4gPSAob2xkTWluICsgb2xkUmFuZ2UpIC0gbmV3UmFuZ2U7XG4gIHJldHVybiBjcmVhdGVGbG9hdCh7XG4gICAgbWluOiBuZXdNaW4sXG4gICAgcmFuZ2U6IG5ld1JhbmdlXG4gIH0sIGdlbmVyYXRvcik7XG5cbn1cblxuZnVuY3Rpb24gY3JlYXRlUmFuZG9tKHByb3AsIGdlbmVyYXRvcil7XG4gIGlmKCFwcm9wLmluY2x1c2l2ZSl7XG4gICAgcmV0dXJuIGdlbmVyYXRvcigpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBnZW5lcmF0b3IoKSA8IDAuNSA/XG4gICAgZ2VuZXJhdG9yKCkgOlxuICAgIDEgLSBnZW5lcmF0b3IoKTtcbiAgfVxufVxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXG5cbi8qXG5cbndvcmxkX2RlZiA9IHtcbiAgZ3Jhdml0eToge3gsIHl9LFxuICBkb1NsZWVwOiBib29sZWFuLFxuICBmbG9vcnNlZWQ6IHN0cmluZyxcbiAgdGlsZURpbWVuc2lvbnMsXG4gIG1heEZsb29yVGlsZXMsXG4gIG11dGFibGVfZmxvb3I6IGJvb2xlYW5cbn1cblxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3b3JsZF9kZWYpe1xuXG4gIHZhciB3b3JsZCA9IG5ldyBiMldvcmxkKHdvcmxkX2RlZi5ncmF2aXR5LCB3b3JsZF9kZWYuZG9TbGVlcCk7XG4gIHZhciBmbG9vclRpbGVzID0gY3dfY3JlYXRlRmxvb3IoXG4gICAgd29ybGQsXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCxcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXG4gICAgd29ybGRfZGVmLm1heEZsb29yVGlsZXMsXG4gICAgd29ybGRfZGVmLm11dGFibGVfZmxvb3JcbiAgKTtcblxuICB2YXIgbGFzdF90aWxlID0gZmxvb3JUaWxlc1tcbiAgICBmbG9vclRpbGVzLmxlbmd0aCAtIDFcbiAgXTtcbiAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxuICAgIGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM11cbiAgKTtcbiAgd29ybGQuZmluaXNoTGluZSA9IHRpbGVfcG9zaXRpb24ueDtcbiAgcmV0dXJuIHtcbiAgICB3b3JsZDogd29ybGQsXG4gICAgZmxvb3JUaWxlczogZmxvb3JUaWxlcyxcbiAgICBmaW5pc2hMaW5lOiB0aWxlX3Bvc2l0aW9uLnhcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3Iod29ybGQsIGZsb29yc2VlZCwgZGltZW5zaW9ucywgbWF4Rmxvb3JUaWxlcywgbXV0YWJsZV9mbG9vcikge1xuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcbiAgdmFyIGN3X2Zsb29yVGlsZXMgPSBbXTtcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgbWF4Rmxvb3JUaWxlczsgaysrKSB7XG4gICAgaWYgKCFtdXRhYmxlX2Zsb29yKSB7XG4gICAgICAvLyBrZWVwIG9sZCBpbXBvc3NpYmxlIHRyYWNrcyBpZiBub3QgdXNpbmcgbXV0YWJsZSBmbG9vcnNcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjUgKiBrIC8gbWF4Rmxvb3JUaWxlc1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaWYgcGF0aCBpcyBtdXRhYmxlIG92ZXIgcmFjZXMsIGNyZWF0ZSBzbW9vdGhlciB0cmFja3NcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjIgKiBrIC8gbWF4Rmxvb3JUaWxlc1xuICAgICk7XG4gICAgfVxuICAgIGN3X2Zsb29yVGlsZXMucHVzaChsYXN0X3RpbGUpO1xuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcbiAgICB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQobGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXSk7XG4gIH1cbiAgcmV0dXJuIGN3X2Zsb29yVGlsZXM7XG59XG5cblxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3JUaWxlKHdvcmxkLCBkaW0sIHBvc2l0aW9uLCBhbmdsZSkge1xuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XG5cbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KHBvc2l0aW9uLngsIHBvc2l0aW9uLnkpO1xuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xuICBmaXhfZGVmLmZyaWN0aW9uID0gMC41O1xuXG4gIHZhciBjb29yZHMgPSBuZXcgQXJyYXkoKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAwKSk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgLWRpbS55KSk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoZGltLngsIC1kaW0ueSkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAwKSk7XG5cbiAgdmFyIGNlbnRlciA9IG5ldyBiMlZlYzIoMCwgMCk7XG5cbiAgdmFyIG5ld2Nvb3JkcyA9IGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpO1xuXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheShuZXdjb29yZHMpO1xuXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcbiAgcmV0dXJuIGJvZHk7XG59XG5cbmZ1bmN0aW9uIGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpIHtcbiAgcmV0dXJuIGNvb3Jkcy5tYXAoZnVuY3Rpb24oY29vcmQpe1xuICAgIHJldHVybiB7XG4gICAgICB4OiBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSAtIE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLngsXG4gICAgICB5OiBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSArIE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLnksXG4gICAgfTtcbiAgfSk7XG59XG4iXX0=
