import { makePureSystem, makeSystem, OurEntity, OurWorld } from "./types.js";

export const limit_player = makePureSystem(function (
  _: void,
  player: OurEntity
) {
  const { x, y } = player.position!;
  if (x < 10) {
    player.velocity!.x += 1;
  } else if (x > 90) {
    player.velocity!.x -= 1;
  }
  if (y < 10) {
    player.velocity!.y += 1;
  } else if (y > this.resource.height_limit - 10) {
    player.velocity!.y -= 1;
  }
});

export const move_player = makePureSystem(function (
  _: void,
  player: OurEntity,
  ghost: OurEntity
) {
  const [gdx, gdy] = [
    ghost.position!.x - player.position!.x,
    ghost.position!.y - player.position!.y,
  ];
  const glen = (gdx ** 2 + gdy ** 2) ** 0.5;
  if (glen > 0) {
    const maxspeed = glen > 10 ? 10 : glen;
    const df = glen < 50 ? 0.5 + (glen / 50) * 4.5 : 5;
    const x = player.velocity!.x + (gdx / glen) * df;
    const y = player.velocity!.y + (gdy / glen) * df;
    const speed = (x ** 2 + y ** 2) ** 0.5;
    const base = speed > maxspeed ? maxspeed / speed : 0.9;
    player.velocity = {
      x: x * base,
      y: y * base,
    };
  } else {
    this.emit("player_stopped");
  }
});

export const move_ghost = makePureSystem(function (_: void, ghost: OurEntity) {
  if (this.resource.ghost_target) {
    let { x, y } = this.resource.ghost_target;
    ghost.position!.x = Math.min(Math.max(x, 10), 90);
    ghost.position!.y = Math.min(
      Math.max(y, 10),
      this.resource.height_limit - 10
    );
  }
});

export const auto_rotate = makeSystem(["auto_rotate", "rotate"], (view) => {
  for (const o of view) {
    o.rotate += o.auto_rotate;
  }
});

export const clean_dying = makeSystem(["dying", "position"], function (view) {
  for (const item of view) {
    this.defer_remove(item);
    const spawnned = item.die_spawn?.(item);
    if (spawnned) {
      this.defer_add(spawnned);
    }
  }
});

export const clean_lowlife = makeSystem(["life"], function (view) {
  view
    .iter()
    .filter((o) => o.life <= 0)
    .forEach((o) => (this.get(o)!.dying = "low life"));
});

export const clean_range = makeSystem(
  ["position", "velocity", "-tag_player"],
  function (view) {
    view
      .iter()
      .filter(
        ({ position: { x, y }, velocity: { x: vx, y: vy } }) =>
          (x < -10 && vx <= 0) ||
          (x > 110 && vx >= 0) ||
          (y < -10 && vy <= 0) ||
          (y >= this.resource.height_limit + 10 && vy > 0)
      )
      .forEach((o) => this.defer_remove(o));
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
      .forEach((item) => this.defer_add(item));
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
