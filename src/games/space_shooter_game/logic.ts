import { makeSystem, OurWorld } from "./types.js";

export const auto_rotate = makeSystem(["auto_rotate", "rotate"], (view) => {
  for (const o of view) {
    o.rotate += o.auto_rotate;
  }
});

export const clean_dying = makeSystem(["dying", "position"], function (view) {
  const list = [...view];
  list
    .map((o) => o.die_spawn?.(o as any)!)
    .filter((o) => !!o)
    .forEach((o) => this.add(o));
  list.forEach((o) => this.remove(o));
});

export const clean_range = makeSystem(
  ["position", "velocity", "-tag_player"],
  function (view, range: number) {
    view
      .iter()
      .filter(
        ({ position: { x, y }, velocity: { x: vx, y: vy } }) =>
          (x < -10 && vx <= 0) ||
          (x > 110 && vx >= 0) ||
          (y < -10 && vy <= 0) ||
          (y >= range + 10 && vy > 0)
      )
      .toArray()
      .forEach((o) => this.remove(o));
  }
);

export const spawn_bullets = makeSystem(
  ["position", "velocity", "spawn_bullets"],
  function (view) {
    view
      .iter()
      .flatMap((o) =>
        o.spawn_bullets.map((info) => info(o)!).filter((x) => x != null)
      )
      .toArray()
      .forEach((item) => this.add(item));
  }
);

export const collision_detection = (world: OurWorld) => {
  const receiver = world.view("position", "hitbox", "team", "life");
  const sender = world.view("position", "hitbox", "team", "damage");
  return () => {
    for (const a of receiver) {
      const {
        position: { x, y },
        hitbox: { halfwidth, halfheight },
      } = a;
      const [x_min, x_max] = [x - halfwidth, x + halfwidth];
      const [y_min, y_max] = [y - halfheight, y + halfheight];
      for (const b of sender) {
        const {
          position: { x, y },
          hitbox: { halfwidth, halfheight },
        } = b;
        if (a.team == b.team) continue;
        const [x_min2, x_max2] = [x - halfwidth, x + halfwidth];
        const [y_min2, y_max2] = [y - halfheight, y + halfheight];
        if (x_max < x_min2 || x_min > x_max2) continue;
        if (y_max < y_min2 || y_min > y_max2) continue;
        a.life -= b.damage;
        world.get(b)!.dying = "self destructure";
      }
    }
  };
};

export const keep_alive = makeSystem(["keep_alive"], function (view) {
  view
    .iter()
    .filter((obj) => obj.keep_alive-- <= 0)
    .forEach((obj) => (this.get(obj)!.dying = "timeout"));
});

export const moving = makeSystem(["position", "velocity"], (view) => {
  for (const { position, velocity } of view) {
    position.x += velocity.x;
    position.y += velocity.y;
  }
});
