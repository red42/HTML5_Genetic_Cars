/* globals d3 window */

module.exports = function(container, def){
  var graph = prepareGraph(container);
  return updateGraph(graph, def);
}
module.exports.prepareGraph = prepareGraph;
module.exports.updateGraph = updateGraph;


function prepareGraph(container){
  container.innerHTML = "";
  var style = window.getComputedStyle(container, null);
  var height = style.getPropertyValue("height");
  var width = style.getPropertyValue("width");

  // ************** Generate the tree diagram	 *****************

  return {
    tree: d3.layout.tree().size([height, width]),

    diagonal: d3.svg.diagonal()
      .projection(function(d) { return [d.y, d.x]; }),

    svg: d3.select(container).append("svg")
    	.attr("width", width)
    	.attr("height", height)
      .append("g"),
    height: height,
    width: width,
  }


}

function updateGraph(graphInfo, def){
  var tree = graphInfo.tree;
  var svg = graphInfo.svg;
  var diagonal = graphInfo.diagonal;
  var height = graphInfo.height;

  var i = 0, duration = 500;

  var treeData = defToAncestryTree(def);
  var root = treeData[0];

  root.x0 = height / 2;
  root.y0 = 0;

  update(root);

  function update(source) {

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
  	  links = tree.links(nodes);

    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = d.depth * 180; });

    // Update the nodes…
    var node = svg.selectAll("g.node")
  	  .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
  	  .attr("class", "node")
  	  .attr("transform", function(/* d */) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
      })
  	  .on("click", click);

    nodeEnter.append("circle")
  	  .attr("r", 1e-6)
  	  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

    nodeEnter.append("text")
  	  .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
  	  .attr("dy", ".35em")
  	  .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
  	  .text(function(d) { return d.name; })
  	  .style("fill-opacity", 1e-6);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
  	  .duration(duration)
  	  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    nodeUpdate.select("circle")
  	  .attr("r", 10)
  	  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

    nodeUpdate.select("text")
  	  .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
  	  .duration(duration)
  	  .attr("transform", function(/* d */) { return "translate(" + source.y + "," + source.x + ")"; })
  	  .remove();

    nodeExit.select("circle")
  	  .attr("r", 1e-6);

    nodeExit.select("text")
  	  .style("fill-opacity", 1e-6);

    // Update the links…
    var link = svg.selectAll("path.link")
  	  .data(links, function(d) { return d.target.id; });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
  	  .attr("class", "link")
  	  .attr("d", function(/* d */) {
  		var o = {x: source.x0, y: source.y0};
  		return diagonal({source: o, target: o});
  	  });

    // Transition links to their new position.
    link.transition()
  	  .duration(duration)
  	  .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
  	  .duration(duration)
  	  .attr("d", function(/* d */) {
  		var o = {x: source.x, y: source.y};
  		return diagonal({source: o, target: o});
  	  })
  	  .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
  	d.x0 = d.x;
  	d.y0 = d.y;
    });
  }

  // Toggle children on click.
  function click(d) {
    if (d.children) {
    	d._children = d.children;
    	d.children = null;
    } else {
    	d.children = d._children;
    	d._children = null;
    }
    update(d);
  }
}

function defToAncestryTree(def){
  return [
    {
      name: def.id,
      children:reduceAncestors(def.ancestry)
    }
  ];

  function reduceAncestors(ancestry){
    var init = [];
    ancestry.reduce(function(children, maybeAncestor){
      if(typeof maybeAncestor === "string"){
        var next = [];
        children.push({
          name: maybeAncestor,
          children: next,
        })
        return next;
      }
      if(Array.isArray(maybeAncestor)){
        maybeAncestor.forEach(function(ancestor){
          children.push({
            name: ancestor[0],
            children: reduceAncestors(ancestor.slice(1))
          });
        })
      }
    }, init);
    return init;
  }
}
