import World from "./ecs.js";

const world = new World<
  {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
  },
  {}
>({});

const pv = world.view("position");

const obj = world.add();

console.log("before", ...pv);

world.defer_add_component(obj, "position", { x: 1, y: 1 });
world.sync();

console.log("set $", ...pv);

delete obj.position;

console.log("delete", ...pv);
