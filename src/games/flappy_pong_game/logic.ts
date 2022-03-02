import {
  makeSystem,
  makeSystems,
  OurEntity,
  OurWorld,
  processTrigger,
  Trigger,
  Vec2,
} from "./types.js";

export const floating = makeSystem(
  ["floating_deg", "position"],
  function (view) {
    for (const o of view) {
      const x = 75 + Math.cos(o.floating_deg) * 5;
      const y = 50 + Math.sin(o.floating_deg) * 5;
      o.position = { x, y };
      o.floating_deg += 0.07;
    }
  }
);

export const gravity = makeSystem(["tag_gravity", "velocity"], function (view) {
  const constants = this.resource.gravity;
  for (const o of view) o.velocity.y += constants;
});

export const moving = makeSystem(["position", "velocity"], function (view) {
  for (const o of view) {
    o.position.x += o.velocity.x;
    o.position.y += o.velocity.y;
  }
});

export const relocate_wall = makeSystem(
  ["location", "event_relocate_wall"],
  function (view) {
    for (const o of view) {
      this.defer_update(o, {
        event_relocate_wall: undefined,
        animate: {
          step: 50 + 150 * Math.random(),
          target: { location: Math.random() },
        },
      });
    }
  }
);

export const hit_wall = makeSystems(
  {
    balls: ["position", "velocity", "radius"],
    walls: ["side", "location", "length"],
  },
  function ({ balls, walls }) {
    const threshold = (this.resource.wall_width * 3) / 2;
    for (const ball of balls) {
      const { x, y } = ball.position!;
      const dx = ball.velocity!.x;
      const target =
        x < threshold + ball.radius && dx < 0
          ? "left"
          : x > 150 - threshold - ball.radius && dx > 0
          ? "right"
          : undefined;
      if (target == undefined) return;
      for (const wall of walls) {
        const { side, location, length } = wall;
        if (side == target) {
          const min = location * (100 - length) - ball.radius;
          const max = min + length + ball.radius;
          if (y > min && y < max) {
            this.emit("score", 1);
            this.defer_update_by(ball, {
              velocity({ x, y }) {
                return { x: -x, y };
              },
            });
            this.defer_update(wall, { event_relocate_wall: true });
          } else this.defer_update(ball, { dying: "hit edge" });
        }
      }
    }
  }
);

export const hit_edge = makeSystem(
  ["tag_ball", "position", "radius"],
  function (view) {
    for (const ball of view) {
      const {
        position: { y },
        radius,
      } = ball;
      if (y < -radius || y > 100 + radius)
        this.defer_update(ball, { dying: "out of range" });
    }
  }
);

export const dying_ghost = makeSystem(
  ["tag_ball", "dying", "position", "radius"],
  function (view) {
    for (const o of view) spawn_ghost(this, o, { step: 200, scale: 10 });
  }
);

export const cleanup_dying = makeSystem(["dying"], function (view) {
  for (const o of view) this.defer_remove(o);
});

function spawn_ghost(
  world: OurWorld,
  { position, radius }: { position: Vec2; radius: number },
  { step = 20, scale = 2 }: { step?: number; scale?: number } = {}
) {
  world.defer_add({
    tag_ghost: true,
    position: { ...position },
    radius: radius,
    opacity: 1,
    animate: {
      step,
      target: {
        radius: radius * scale,
        opacity: 0,
      },
      *on_end() {
        yield Trigger.update({ dying: "disappear" });
      },
    },
  });
}

export const ball_trigger = makeSystem(
  ["tag_ball", "position", "radius"],
  function (view) {
    if (!this.resource.event_trigger) return;

    for (const o of view) {
      if (o.floating_deg || !o.tag_gravity)
        this.defer_update(o, {
          floating_deg: undefined,
          tag_gravity: true,
        });
      this.defer_update_by(o, {
        velocity({ x }) {
          return { x: x || 1.2, y: -2 };
        },
      });
      spawn_ghost(this, o);
    }
  }
);

export const hide_start = makeSystem(["tag_start"], function (view) {
  if (!this.resource.event_trigger) return;

  for (const o of view) {
    this.defer_update(o, {
      tag_start: undefined,
      animate: {
        step: 20,
        target: {
          opacity: 0,
        },
        *on_end() {
          yield Trigger.update({ dying: "done" });
        },
      },
    });
  }
});

export const detect_gameover = makeSystem(["tag_ball"], function (view) {
  if (view.size == 0) this.emit("gameover");
});

export const animate = makeSystem(["animate"], function (view) {
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
