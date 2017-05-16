const Constants = {
  wheelCount: 2
};

module.export = {
  generateSchema: function(values){
    return {
      wheel_radius: {
        type: "float",
        length: values.wheelCount,
        min: values.wheelMinRadius,
        range: values.wheelRadiusRange,
      },
      wheel_radius: {
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
        max: 8,
        length: 2
      },
    };
  },
  createCar: function(world, car_def){
    var instance = {};
    instance.chassis = cw_createChassis(world, car_def.vertex_list, car_def.chassis_density);

    instance.wheels = [];
    for (var i = 0; i < car_def.wheelCount; i++) {
      instance.wheels[i] = cw_createWheel(world, car_def.wheel_radius[i], car_def.wheel_density[i]);
    }

    var carmass = instance.chassis.GetMass();
    for (var i = 0; i < car_def.wheelCount; i++) {
      carmass += instance.wheels[i].GetMass();
    }
    var torque = [];
    for (var i = 0; i < car_def.wheelCount; i++) {
      torque[i] = carmass * -gravity.y / car_def.wheel_radius[i];
    }

    var joint_def = new b2RevoluteJointDef();

    for (var i = 0; i < car_def.wheelCount; i++) {
      var randvertex = instance.chassis.vertex_list[car_def.wheel_vertex[i]];
      joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
      joint_def.localAnchorB.Set(0, 0);
      joint_def.maxMotorTorque = torque[i];
      joint_def.motorSpeed = -motorSpeed;
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
  vertex_list.push(new b2Vec2(vertexs[10], -vertexs[11]);

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
