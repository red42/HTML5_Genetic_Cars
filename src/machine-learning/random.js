

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
  mutateShuffle(
    prop, generator, originalValues, mutation_range, chanceToMutate
  ){
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
          factor,
          chanceToMutate
        )[0];
      } while(values.indexOf(nextVal) > -1);
      values.push(nextVal)
    }
    return values;
  },
  mutateIntegers(prop, generator, originalValues, mutation_range, chanceToMutate){
    var factor = (prop.factor || 1) * mutation_range
    prop = {
      min: prop.min || 0,
      range: prop.range || 10
    }
    return random.mutateFloats(
      prop, generator, originalValues, factor, chanceToMutate
    ).map(function(float){
      return Math.round(float);
    })
  },
  mutateFloats(prop, generator, originalValues, mutation_range, chanceToMutate){
    var factor = (prop.factor || 1) * mutation_range
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    // console.log(arguments);
    return originalValues.map(function(originalValue){
      if(generator() > chanceToMutate){
        return originalValue;
      }
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
