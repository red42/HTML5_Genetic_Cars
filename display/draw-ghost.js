
module.exports.svg = function(container, frame){
  return `
    <svg viewBox="${[
      Math.round(frame.pos.x * 10)/10 - 2,
      Math.round(frame.pos.y * 10)/10 - 2,
      Math.round(frame.pos.x * 10)/10 + 2,
      Math.round(frame.pos.y * 10)/10 + 2,
    ]} ">
      ${renderWheels(frame.wheels)}
      ${renderChassis(frame.chassis)}
    </svg>
  `

  function renderWheels(wheels){
    return wheels.map(function(wheelList){
      return wheelList.map(function(wheel){
        var fillStyle = "#eee";
        var strokeStyle = "#aaa";
        var center = wheel.pos, radius = wheel.rad, angle = wheel.ang;
        return `
          <circle
            cx="${center.x}"
            cy="${center.y}"
            r="${radius}"
            stroke="${strokeStyle}"
            stroke-width="1"
            fill="${fillStyle}"
          />
          <line
            x1="${center.x}"
            y1="${center.y}"
            x2="${center.x + radius * Math.cos(angle)}"
            y2="${center.y + radius * Math.sin(angle)}"
            stroke="${strokeStyle}"
            stroke-width="2"
          />
        `;
      }).join("\n");
    }).join("\n")
  }

  function renderChassis(chassis){
    var strokeStyle = "#aaa";
    var fillStyle = "#eee";

    return chassis.map(function(polyList){
      return `
        <polygon
          points="${
            polyList.vtx.map(function(pos){
              return pos.x + "," +pos.y
            }).join(" ")
          }"
          stroke-width="1"
          stroke="${strokeStyle}"
          fill="${fillStyle}"
          style="fill:lime;stroke:purple;stroke-width:1"
        />
      `;
    }).join("\n");
  }

}

module.exports = function(ctx, zoom, frame){
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
