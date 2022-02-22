import {
  Effect,
  makePureSystem,
  makeSystem,
  OurEntity,
  OurWorld,
  processTrigger,
  processTriggerResult,
  Team,
  Trigger,
  withTriggerState,
} from "./types.js";
import { excludeEntity } from "/js/ecs.js";
import { TextureAtlas } from "/js/atlas.js";
import { minmax, range, Timer, vibRange } from "/js/utils.js";
import * as spawner from "./spawner.js";
import AssLoader from "/js/assloader.js";

export const spawn_children = makeSystem(["spawn_children"], function (view) {
  for (const o of view) {
    const { spawn_children: children } = o;
    Promise.all(
      children.map((child) => this.defer_add({ ...child, parent: o }))
    ).then((children) => this.defer_push_array(o, "children", ...children));
    this.defer_remove_component(o, "spawn_children");
  }
});

export const run_parent_trigger = makeSystem(
  ["parent_trigger", "parent"],
  function (view) {
    for (const { parent, parent_trigger } of view)
      processTrigger(this, parent, parent_trigger(parent));
  }
);

export const cleanup_parent = makeSystem(["dying", "parent"], function (view) {
  for (const o of view) {
    this.defer_remove_component(o, "parent");
    this.defer_filter_array(o.parent, "children", excludeEntity(o));
    if (o.die_trigger_on_parent != null)
      processTrigger(this, o.parent, o.die_trigger_on_parent(o));
  }
});

export const cleanup_children = makeSystem(
  ["dying", "children"],
  function (view) {
    for (const o of view) {
      this.defer_remove_component(o, "children");
      for (const child of o.children) {
        this.defer_remove_component(child, "parent");
        this.defer_update(child, {
          dying: o.dying,
          position: o.position,
          rotate: o.rotate,
        });
      }
    }
  }
);

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

export const play_animate = makeSystem(["animate"], function (view) {
  for (const obj of view) {
    const { target, step, on_end } = obj.animate;
    if (step <= 0) {
      Object.assign(obj, target);
      this.defer_remove_component(obj, "animate");
      processTrigger(this, obj, on_end?.(obj));
      continue;
    }
    obj.animate.step--;
    for (const key of Object.keys(target)) {
      // @ts-ignore
      const orig = obj[key] as number;
      console.assert(typeof orig == "number");
      // @ts-ignore
      const tgtv = target[key] as number;
      const diff = tgtv - orig;
      const chge = diff - (diff * step) / (step + 1);
      // @ts-ignore
      obj[key] += chge;
    }
  }
});

export const start_crash_animate = makeSystem(
  ["dying", "tag_crashable"],
  function (view) {
    for (const obj of view) {
      const { dying } = obj;
      this.defer_remove_components(obj, "dying", "tag_crashable", "hitbox");
      this.defer_add_component(obj, "tag_crashing", true);
      this.defer_add_component(obj, "animate", {
        target: {
          scale: 0,
          rotate: 10,
        },
        step: 50,
        *on_end() {
          yield Trigger.update({ dying });
        },
      });
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

export const calc_rotate = makeSystem(
  ["-rotate", "velocity", "-tag_bullet"],
  function (view) {
    for (const o of view) {
      const { x, y } = o.velocity;
      const rotate = Math.atan2(x, -y);
      this.defer_update(o, { rotate });
    }
  }
);

export const auto_rotate = makeSystem(
  ["auto_rotate", "rotate", "-dying"],
  (view) => {
    for (const o of view) {
      o.rotate += o.auto_rotate;
    }
  }
);

export const clean_dying = makeSystem(
  ["dying", "position", "-tag_crashable"],
  function (view) {
    for (const item of view) {
      this.defer_remove(item);
      processTrigger(this, item, item.die_trigger?.(item));
    }
  }
);

export const clean_lowlife = makeSystem(
  ["life", "-tag_crashing"],
  function (view) {
    view
      .iter()
      .filter((o) => o.life <= 0)
      .forEach((o) => this.defer_add_component(o, "dying", "low life"));
  }
);

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
      .forEach((o) => {
        this.defer_remove_components(o, "velocity", "tag_crashable");
        this.defer_add_component(o, "dying", "out of range");
      });
  }
);

function general_collision_detection(
  world: OurWorld,
  receive_team: Team,
  send_teams: Team[]
) {
  const receiver = world.view(
    "position",
    "hitbox",
    "team",
    "tag_collision_receiver",
    ({ team }) => team == receive_team
  );
  const sender = world.view(
    "position",
    "hitbox",
    "team",
    "collision_effects",
    ({ team }) => send_teams.includes(team)
  );
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
        if (b.collision_filter?.(a) === false) continue;
        const [x_min2, x_max2] = [x - halfwidth, x + halfwidth];
        const [y_min2, y_max2] = [y - halfheight, y + halfheight];
        if (x_max < x_min2 || x_min > x_max2) continue;
        if (y_max < y_min2 || y_min > y_max2) continue;
        if (typeof b.collision_effects == "function") {
          world.defer_push_array(a, "effects", ...b.collision_effects(a));
        } else {
          world.defer_push_array(a, "effects", ...b.collision_effects);
        }
        world.get(b)!.dying = "self destructure";
      }
    }
  };
}

export const collision_detection = (world: OurWorld) => {
  const player_side = general_collision_detection(world, "FRIENDLY", [
    "HOSTILE",
    "NATURAL",
  ]);
  const hostile_side = general_collision_detection(world, "HOSTILE", [
    "FRIENDLY",
  ]);
  return () => {
    player_side();
    hostile_side();
  };
};

export const keep_alive = makeSystem(["keep_alive"], function (view) {
  view
    .iter()
    .filter((obj) => obj.keep_alive-- <= 0)
    .forEach((obj) => {
      this.defer_remove_component(obj, "keep_alive");
      this.defer_add_component(obj, "dying", "timeout");
    });
});

export const moving = makeSystem(["position", "velocity", "-dying"], (view) => {
  for (const { position, velocity } of view) {
    position.x += velocity.x;
    position.y += velocity.y;
  }
});

export const tracking_player = makeSystem(
  ["tracking_player", "position", "velocity", "-dying"],
  (view, _: void, player: OurEntity) => {
    const target = player.position!;
    if (player.life! <= 0) return;
    for (const o of view) {
      const { range, rate } = o.tracking_player;
      const source = o.position;
      const diff = { x: target.x - source.x, y: target.y - source.y };
      const dis2 = diff.x ** 2 + diff.y ** 2;
      const range2 = range ** 2;
      const dx = diff.x;
      const adj =
        dis2 < range2 && dis2 > (rate * 2) ** 2 && diff.y > 0
          ? Math.sign(dx) * rate
          : 0;
      o.velocity.x = (o.velocity.x * 9 + adj) / 10;
    }
  }
);

export const random_walking = makeSystem(
  ["random_walking", "velocity", "position"],
  (view) => {
    for (const o of view) {
      const {
        random_walking: { timeout_initial, rate, edge },
        position: { x },
      } = o;
      if (x < edge) {
        o.velocity.x = (Math.random() * rate) / 2;
        o.random_walking.timeout = timeout_initial;
      } else if (x > 100 - edge) {
        o.velocity.x = (-Math.random() * rate) / 2;
        o.random_walking.timeout = timeout_initial;
      } else if (o.random_walking.timeout-- <= 0) {
        o.random_walking.timeout = timeout_initial;
        o.velocity.x = Math.random() * rate - rate / 2;
      }
    }
  }
);

export const apply_effects = makeSystem(
  ["effects"],
  function (view, _: void, assets: AssLoader) {
    for (const o of view) {
      if (o.effects.length == 0) continue;
      const effect = o.effects.shift()!;
      if (effect.type == "damage") {
        if (!o.tag_godmode && !o.tag_has_shield)
          this.defer_update_by(o, {
            life(old) {
              return old - effect.value;
            },
          });
      } else if (effect.type == "sound") {
        const audio = assets.getAudio(`sfx_${effect.name}`)!;
        const source = assets.audioctx.createBufferSource();
        source.buffer = audio;
        source.loop = false;
        source.connect(assets.audioctx.destination);
        source.start(0);
      } else if (effect.type == "trigger")
        processTriggerResult(this, o, effect.trigger);
    }
  }
);

export const sync_player_weapon = makeSystem(
  ["player_weapon", "event_player_upgrade_weapon", "player_model"],
  function (view, _: void, atlas: TextureAtlas) {
    for (const o of view) {
      this.defer_remove_component(o, "event_player_upgrade_weapon");
      const method = o.event_player_upgrade_weapon;
      const weapon = o.player_weapon;
      if (method != "reset") weapon[method]++;
      const { color } = o.player_model;
      const colorStr = color[0].toUpperCase() + color.slice(1);
      let { damage, count, spread, stability } = weapon;
      console.assert(count > 0);
      console.assert(spread > 0);
      console.assert(stability > 0);
      const stability2 = Math.log2(stability);
      let timeout = (20 * spread ** 1.7) | 0;
      const limit = (10 * spread ** Math.max(0.1, 0.7 - stability2 / 20)) | 0;
      while (--count > 0 && timeout > limit)
        timeout = Math.max(limit, timeout * 0.9) | 0;
      damage *= 10;
      damage += 40;
      damage /= spread ** Math.max(0.9, 1.2 - stability2 / 20);
      damage += count;
      this.defer_update(o, {
        player_stats: { damage, time: timeout, time_limit: limit },
      });
      this.defer_push_array(
        o,
        "effects",
        Effect.trigger(
          Trigger.filter_children(({ tag_weapon }) => !tag_weapon)
        ),
        Effect.trigger(
          Trigger.spawn_children(
            ...[...range(spread)].map(
              (i) =>
                ({
                  tag_weapon: true,
                  parent_trigger: withTriggerState(
                    new Timer(timeout, ((i / spread) * timeout) | 0),
                    function* ({ position }) {
                      if (!this.next()) return;
                      yield Trigger.spawn(
                        spawner.bullet(
                          {
                            position: { ...position! },
                            velocity: {
                              x:
                                spread > 1
                                  ? (Math.random() - 0.5) *
                                    Math.max(0, Math.log10(spread))
                                  : 0,
                              y: -2,
                            },
                            scale: 0.2,
                            atlas: atlas.get(`laser${colorStr}01`)!,
                            collision_effects: [
                              Effect.sound("laser2"),
                              Effect.damage(damage),
                            ],
                            team: "FRIENDLY",
                            hitbox: { halfwidth: 0.5, halfheight: 3 },
                          },
                          {
                            atlas: atlas.get(`laser${colorStr}08`)!,
                            scale: 0.2,
                            keep_alive: 20,
                          }
                        )
                      );
                    }
                  ),
                } as const)
            )
          )
        )
      );
    }
  }
);

export const sync_player_shield = makeSystem(
  ["player_shield", "event_player_upgrade_shield"],
  function (view, _: void) {
    for (const o of view) {
      this.defer_remove_component(o, "event_player_upgrade_shield");
      const method = o.event_player_upgrade_shield;
      const shield = o.player_shield;
      shield[method]++;
    }
  }
);

export const shield_regeneration = makeSystem(
  ["player_shield", "shield_regeneration"],
  function (view) {
    for (const o of view) {
      const {
        shield_regeneration,
        player_shield: { regeneration, capacity },
        tag_has_shield,
      } = o;
      const max = capacity - (!!tag_has_shield ? 1 : 0);
      if (shield_regeneration >= max || regeneration == 1) continue;
      o.shield_regeneration = Math.min(
        shield_regeneration + Math.log2(regeneration) / 2000,
        max
      );
    }
  }
);

export const shield_cooldown = makeSystem(
  ["shield_cooldown", "player_shield", "-tag_has_shield"],
  function (view) {
    for (const o of view) {
      if (o.shield_cooldown > 1) {
        this.defer_remove_component(o, "shield_cooldown");
        continue;
      }
      const { cooldown } = o.player_shield;
      o.shield_cooldown += Math.log2(cooldown + 1) / 1000;
    }
  }
);

export const shield_spawner = makeSystem(
  [
    "player_shield",
    "shield_regeneration",
    "-tag_has_shield",
    "-shield_cooldown",
  ],
  function (view, _: void, atlas: TextureAtlas) {
    for (const o of view) {
      if (o.shield_regeneration < 1) continue;
      o.shield_regeneration--;
      const { strengh } = o.player_shield;
      const level = minmax(Math.log10(strengh) | 0, 0, 2) + 1;
      this.defer_update(o, { tag_has_shield: true, shield_cooldown: 0 });
      this.defer_push_array(
        o,
        "effects",
        Effect.trigger(
          Trigger.spawn_children({
            tag_collision_receiver: true,
            tag_shield: true,
            team: "FRIENDLY",
            life: strengh,
            hitbox: { halfwidth: 10, halfheight: 10 },
            atlas: atlas.get(`shield${level}`),
            rotate: 0,
            opacity: 1,
            scale: 0.2,
            *die_trigger_on_parent() {
              yield Trigger.remove("tag_has_shield");
            },
          })
        )
      );
    }
  }
);

export const shield_tracking = makeSystem(
  ["parent", "tag_shield"],
  function (view) {
    for (const o of view) {
      this.defer_update(o, { position: { ...o.parent.position! } });
    }
  }
);
