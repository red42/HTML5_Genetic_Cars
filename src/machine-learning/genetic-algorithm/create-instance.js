var random = require("../random.js");

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
