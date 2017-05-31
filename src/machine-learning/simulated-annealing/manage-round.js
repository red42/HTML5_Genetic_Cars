var create = require("../create-instance");

module.exports = {
  createGenerator(config, runStructure){
    var curTemp = 1;
    var oldStructure = create.createGenerationZero(
      config.schema, config.generateRandom
    );
    var oldScore = runStructure(oldStructure);
    var k = 0;
    var maxIterations = 1000;
    var min_precision = Math.pow(10, -5);

    return run;

    function run(){
      if(k === maxIterations){
        curTemp = curTemp - min_precision;
        k = 0;
        if(curTemp === min_precision){
          return {
            temp: curTemp,
            end: true,
            def: oldStructure,
            score: oldScore,
          };
        }
      }
      k++;
      var newStructure = createStructure(config, curTemp, oldStructure);
      var newScore = runStructure(newStructure);

      var scoreDiff = newScore - oldScore;
      if(scoreDiff > 0){
        oldStructure = newStructure;
        oldScore = newScore;
      } else if(Math.random() > Math.exp(-scoreDiff/(k * curTemp))){
        oldStructure = newStructure;
        oldScore = newScore;
      }
      return {
        temp: curTemp,
        def: oldStructure,
        score: oldScore
      }
    }
  }
}

function createStructure(config, mutation_range, parent){
  var schema = config.schema,
    gen_mutation = 1,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    mutation_range,
    gen_mutation
  )

}
