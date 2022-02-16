import { makePureSystem, makeSystem, OurEntity, OurWorld } from "./types.js";
import { TextureAtlas } from "/js/atlas.js";

export const attach_player_atlas = makeSystem(
  ["-atlas", "player_model"],
  function (view, atlas: TextureAtlas) {
    for (const obj of view) {
      const { shape, color } = obj.player_model;
      this.defer_add_component(
        obj,
        "atlas",
        atlas.get(`playerShip${shape}_${color}`)!
      );
    }
  }
);

export const attach_player_overlay = makeSystem(
  ["event_player_set_overlay", "player_model"],
  function (view, atlas: TextureAtlas) {
    for (const obj of view) {
      const damage = obj.event_player_set_overlay;
      this.defer_add_component(obj, "player_overlay", damage);
      if (damage === 0) {
        this.defer_remove_component(obj, "overlay");
        continue;
      }
      const { shape } = obj.player_model;
      this.defer_add_component(obj, "overlay", {
        atlas: atlas.get(`playerShip${shape}_damage${damage}`)!,
        mode: "darken",
      });
      this.defer_remove_component(obj, "event_player_set_overlay");
    }
  }
);

export const set_player_overlay_based_on_health = makeSystem(
  ["life", "max_life", "player_overlay"],
  function (view) {
    for (const obj of view) {
      const { life, max_life, player_overlay } = obj;
      let level = 3 - Math.floor((life / max_life) * 3);
      level = level < 0 ? 0 : level > 3 ? 3 : level;
      if (player_overlay == level) return;
      this.defer_add_component(obj, "event_player_set_overlay", level);
    }
  }
);

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
    .forEach((o) => this.defer_add_component(o, "dying", "low life"));
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
    .forEach((obj) => this.defer_add_component(obj, "dying", "timeout"));
});

export const moving = makeSystem(["position", "velocity"], (view) => {
  for (const { position, velocity } of view) {
    position.x += velocity.x;
    position.y += velocity.y;
  }
});
