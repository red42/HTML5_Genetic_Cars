

const random = {
  shuffleIntegers(prop, generator){
    var l = prop.length || 1;
    var max = prop.max || 10;
    var values = [0];
    if(l === 1) return values;
    for(var i = 1; i < max; i++){
      var placement = createIntegers({ length: 1, min: 0, range: i }, generator)[0];
      if(placement === 0){
        values.unshift(i);
      } else if(placement === i){
        values.push(i)
      } else {
        values.splice(placement, 0, i)
      }
    }
    return values.slice(l);
  },
  createIntegers(prop, generator){
    return random.createFloats({
      min: prop.min || 0,
      range: prop.range || 10,
    }, generator).map(function(float){
      return Math.round(float);
    });
  },
  createFloats(prop, generator){
    prop = {
      min: prop.min || 0,
      range: prop.range || 1,
    }
    var values = [];
    for(var i = 0, l = prop.length; i < l; i++){
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
        nextVal = mutateIntegers(
          { length: 1, min: 0, range: max },
          generator,
          originalValues[i],
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
    return mutateFloats(
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
    return originalValues.map(function(originalValue){
      return mutateFloat(prop, generator, originalValue, mutation_range)
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
  if (newMin < min) newMin = oldMin;
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
