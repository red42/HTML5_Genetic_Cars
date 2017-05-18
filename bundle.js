require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


const random = {
  shuffleIntegers(prop, generator){
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
    return values.slice(0, l);
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
    var values = [];
    for(var i = 0; i < l; i++){
      var nextVal;
      do {
        nextVal = random.mutateIntegers(
          { min: 0, range: max },
          generator,
          [originalValues[i]],
          mutation_range
        )[0];
      } while(values.indexOf(nextVal) > -1);
      values.push(nextVal)
    }
    return values;
  },
  mutateIntegers(prop, generator, originalValues, mutation_range){
    prop = {
      min: prop.min || 0,
      range: prop.range || 10
    }
    return random.mutateFloats(
      prop, generator, originalValues, mutation_range
    ).map(function(float){
      return Math.round(float);
    })
  },
  mutateFloats(prop, generator, originalValues, mutation_range){
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    console.log(arguments);
    return originalValues.map(function(originalValue){
      return mutateFloat(
        prop, generator, originalValue, mutation_range
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

},{}],"/src/car-schema.js":[function(require,module,exports){

module.exports = {
  generateSchema: function(values){
    return {
      wheel_radius: {
        type: "float",
        length: values.wheelCount,
        min: values.wheelMinRadius,
        range: values.wheelRadiusRange,
      },
      wheel_density: {
        type: "float",
        length: values.wheelCount,
        min: values.wheelMinDensity,
        range: values.wheelDensityRange,
      },
      chassis_density: {
        type: "float",
        length: 1,
        min: values.chassisDensityRange,
        range: values.chassisMinDensity,
      },
      vertex_list: {
        type: "float",
        length: 12,
        min: values.chassisMinAxis,
        range: values.chassisAxisRange
      },
      wheel_vertex: {
        type: "shuffle",
        max: 7,
        length: 2
      },
    };
  },
  createCar: function(world, car_def, constants){
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
      var joint = world.CreateJoint(joint_def);
    }

    return instance;
  }
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

},{}],"/src/genetic-algorithm.js":[function(require,module,exports){
var random = require("./random.js");

module.exports = {
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
    }, {});
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
    }, {});
  },
  createMutatedClone(schema, generator, parent, factor){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var values;
      console.log(key, parent[key]);
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
    }, {});
  }
}

},{"./random.js":1}]},{},[]);
