import { Components, makeSystem } from "./types.js";

export const player_move = makeSystem(
  ["tag_player", "x", "y"],
  function (view) {
    const { event_move, grid_size } = this.resource;
    if (!event_move) return;
    const limit = (grid_size - 1) / 2;
    for (const o of view) {
      let x = o.animate?.target?.x ?? o.x;
      let y = o.animate?.target?.y ?? o.y;
      x += event_move.x;
      y += event_move.y;
      let shake = false;
      if (x < -limit) {
        x = -limit;
        shake = true;
      } else if (x > limit) {
        x = limit;
        shake = true;
      }
      if (y < -limit) {
        y = -limit;
        shake = true;
      } else if (y > limit) {
        y = limit;
        shake = true;
      }
      let updates: Partial<Components> | undefined;
      if (o.x != x || o.y != y) {
        updates = {};
        updates.animate = { step: 5, target: { x, y } };
      }
      if (updates?.animate == null) {
        if (shake) {
          updates ??= {};
          updates.shake = { direction: event_move, step: 5 };
        }
      } else if (o.shake) {
        updates ??= {};
        updates.shake = undefined;
      }
      if (updates) this.defer_update(o, updates);
    }
  }
);

export const player_track = makeSystem(
  ["tag_player", "x", "y"],
  function (view) {
    this.resource.playermap.clear();
    for (let { x, y } of view) {
      x = Math.round(x);
      y = Math.round(y);
      this.resource.playermap.put(x, y);
      if (this.resource.bonusmap.get(x, y)) {
        this.resource.bonusmap.clear();
        this.emit("bonus");
      }
      if (this.resource.ballmap.get(x, y)) {
        this.emit("crash");
      }
    }
  }
);

export const ball_move = makeSystem(["position", "speed"], function (view) {
  for (const o of view) {
    o.position += o.speed;
    if (Math.abs(o.position) > 55) this.defer_remove(o);
  }
});

export const ball_track = makeSystem(
  ["axis", "track", "position"],
  function (view) {
    const cell = this.resource.cell_size;
    const limit = (this.resource.grid_size - 1) / 2;
    this.resource.ballmap.clear();
    for (const o of view) {
      const { axis, track, position } = o;
      let x: number;
      let y: number;
      if (axis == "x") {
        x = Math.round(position / cell);
        y = track;
        if (Math.abs(x) > limit) continue;
      } else {
        y = Math.round(position / cell);
        x = track;
        if (Math.abs(y) > limit) continue;
      }
      if (this.resource.playermap.get(x, y)) {
        // TODO: animation
        this.defer_remove(o);
      }
      this.resource.ballmap.put(x, y);
    }
  }
);

export const animate = makeSystem(["animate"], function (view) {
  for (const obj of view) {
    const { target, step } = obj.animate;
    if (step <= 0) {
      Object.assign(obj, target);
      this.defer_remove_component(obj, "animate");
      // processTrigger(this, obj, on_end?.(obj));
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
