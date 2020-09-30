HTML5 Genetic Cars
==================

A genetic algorithm car evolver in HTML5 canvas.

This is inspired by BoxCar2D, and uses the same physics engine, Box2D, but it's written from scratch.

This is the code as published on http://rednuht.org/genetic_cars_2/

The current module-based format required npm and browserify.

Build with:

npm run-script build
This game is connected to the world, all players are sharing their best cars each game round. Only the dominant cars win.
 The TOP car from each player in the world is added to your car list each game cycle.
  This car is therefore added to your gene pool and is then genetically spliced and paired with your other cars.
   Top cars are transmitted around the world from other players who are online RIGHT NOW using WebSockets style technology for data streaming ( PubNub ).
