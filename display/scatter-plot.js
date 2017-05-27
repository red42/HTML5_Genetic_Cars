/* globals vis document */

var data = null;
var graph = null;

// Called when the Visualization API is loaded.
module.exports = function(defs, scores, propertyMap) {

  // Create and populate a data table.
  data = new vis.DataSet();
  defs.forEach(function(def, i){
    data.add({
      x: def[propertyMap.x],
      y: def[propertyMap.y],
      z: def[propertyMap.z],
      style: scores[i],
      extra: def.ancestry
    });
  });

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
      return 'value: <b>' + point.z + '</b><br>' + point.data.extra;
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
  var container = document.getElementById('mygraph');
  graph = new vis.Graph3d(container, data, options);

  if (camera) graph.setCameraPosition(camera); // restore camera position
}
