import { makePureSystem, makeSystem } from "./types.js";

export const playground = makePureSystem(function (
  ctx: CanvasRenderingContext2D
) {
  let size = this.resource.cell_size * this.resource.grid_size + 1;
  if (this.resource.expand_step > 0) {
    size *= 1 + (this.resource.expand_step-- / 10) * 0.2;
  }
  ctx.save();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  const m = 50 - size / 2;
  ctx.strokeRect(m, m, size, size);
  ctx.restore();
});

export const debug_maps = makePureSystem(function (
  ctx: CanvasRenderingContext2D
) {
  const cell = this.resource.cell_size;
  ctx.save();
  ctx.fillStyle = "rgba(255 255 255 / 0.2)";
  for (const { x, y } of this.resource.ballmap) {
    let px = 50 + x * cell - cell / 2;
    let py = 50 + y * cell - cell / 2;
    ctx.fillRect(px, py, cell, cell);
  }
  ctx.fillStyle = "rgba(255 255 255 / 0.1)";
  for (const { x, y } of this.resource.playermap) {
    let px = 50 + x * cell - cell / 2;
    let py = 50 + y * cell - cell / 2;
    ctx.fillRect(px, py, cell, cell);
  }
  ctx.restore();
});

export const player = makeSystem(
  ["tag_player", "x", "y"],
  function (view, ctx: CanvasRenderingContext2D) {
    const shakes = [0.2, 0.5, 1, 0.4, 0.1];
    const cell = this.resource.cell_size;
    const innercell = cell * 0.7;
    ctx.save();
    ctx.fillStyle = "white";
    for (const o of view) {
      const { x, y, shake } = o;
      let px = 50 + x * cell - innercell / 2;
      let py = 50 + y * cell - innercell / 2;
      if (shake) {
        shake.step--;
        if (shake.step >= 0) {
          const offset = shakes[shake.step];
          px += shake.direction.x * offset;
          py += shake.direction.y * offset;
        } else {
          this.defer_remove_component(o, "shake");
        }
      }
      ctx.fillRect(px, py, innercell, innercell);
    }
    ctx.restore();
  }
);

export const bonus = makePureSystem(function (ctx: CanvasRenderingContext2D) {
  const cell = this.resource.cell_size;
  if (this.resource.bonus_step > 0) {
    this.resource.bonus_step--;
  }
  const innercell = (cell * 0.4 * (10 - this.resource.bonus_step)) / 10;
  ctx.save();
  ctx.fillStyle = "lime";
  for (const { x, y } of this.resource.bonusmap) {
    const px = 50 + x * cell - innercell / 2;
    const py = 50 + y * cell - innercell / 2;
    ctx.fillRect(px, py, innercell, innercell);
  }
  ctx.restore();
});

export const ball = makeSystem(
  ["axis", "track", "position"],
  function (view, ctx: CanvasRenderingContext2D) {
    const cell = this.resource.cell_size;
    const innercell = cell * 0.4;
    ctx.save();
    ctx.fillStyle = "#b71c1c";
    for (const o of view) {
      ctx.save();
      const { axis, track, position } = o;
      let cellsize = innercell;

      if (o.explode_step != undefined) {
        cellsize *= 1.2 ** (20 - o.explode_step);
        ctx.globalAlpha = (o.explode_step / 20) ** 0.5;
        if (--o.explode_step <= 0) {
          this.defer_remove(o);
        }
      }

      let x: number;
      let y: number;
      if (axis == "x") {
        x = position;
        y = track * cell;
      } else {
        y = position;
        x = track * cell;
      }
      const px = 50 + x - cellsize / 2;
      const py = 50 + y - cellsize / 2;
      ctx.fillRect(px, py, cellsize, cellsize);
      ctx.restore();
    }
    ctx.restore();
  }
);

export const score = makePureSystem(function (ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "16px monospace";
  ctx.fillStyle = "white";
  ctx.globalAlpha = 0.2;
  const text = this.resource.score + "";
  ctx.fillText(text, 50, 50);

  if (this.resource.max_score > 0) {
    const text = "best: " + this.resource.max_score;
    ctx.textBaseline = "top";
    ctx.font = "8px monospace";
    ctx.fillText(text, 50, 10);
  }

  ctx.restore();
});

export const pause = makePureSystem(function (ctx: CanvasRenderingContext2D) {
  const txt = "方向键或者滑动屏幕控制";
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "6px monospace";
  ctx.fillStyle = "black";
  ctx.globalAlpha = 0.7;
  const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } =
    ctx.measureText(txt);
  ctx.fillRect(
    50 - width / 2 - 2,
    80 - actualBoundingBoxAscent - 1,
    width + 4,
    actualBoundingBoxAscent + actualBoundingBoxDescent + 2
  );
  ctx.fillStyle = "white";
  ctx.fillText(txt, 50, 80);
  ctx.restore();
});
