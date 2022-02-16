import World from "./ecs.js";

const world = new World(
  {
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
  },
  {}
);

const pv = world.view("position");

const obj = world.add();

console.log("before", ...pv);

obj.$position.x = 1;

console.log("set $", ...pv);

delete obj.position;

console.log("delete", ...pv);
