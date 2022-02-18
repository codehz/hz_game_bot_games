import { makePureSystem, makeSystem, OurEntity } from "./types.js";

export const sprite = makeSystem(
  ["position", "atlas", "rotate", "scale", "opacity", "-tag_bullet"],
  function (view, ctx: CanvasRenderingContext2D, image: ImageBitmap) {
    for (const {
      atlas,
      position: { x, y },
      rotate,
      scale,
      opacity,
    } of view) {
      const { width, height } = atlas;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = opacity;
      atlas.blit(ctx, image);
      ctx.restore();
    }
  }
);

export const bullet = makeSystem(
  ["position", "velocity", "atlas", "scale", "opacity", "tag_bullet"],
  function (view, ctx: CanvasRenderingContext2D, image: ImageBitmap) {
    for (const {
      atlas,
      position: { x, y },
      velocity,
      scale,
      opacity,
    } of view) {
      const rotate = Math.atan2(velocity.x, -velocity.y);
      const { width, height } = atlas;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = opacity;
      atlas.blit(ctx, image);
      ctx.restore();
    }
  }
);

export const overlay = makeSystem(
  ["position", "overlay", "rotate", "scale"],
  function (view, ctx: CanvasRenderingContext2D, image: ImageBitmap) {
    for (const {
      overlay: { atlas, mode },
      position: { x, y },
      rotate,
      scale,
    } of view) {
      const { width, height } = atlas;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalCompositeOperation = mode;
      atlas.blit(ctx, image);
      ctx.restore();
    }
  }
);

export const debug_hitbox = makeSystem(
  ["position", "hitbox", "team"],
  function (view, ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const {
      position: { x, y },
      hitbox: { halfwidth, halfheight },
      team,
    } of view) {
      const x_min = x - halfwidth;
      const y_min = y - halfheight;
      ctx.fillStyle =
        team == "FRIENDLY" ? "#0f07" : team == "HOSTILE" ? "#f007" : "#00f7";
      ctx.fillRect(x_min, y_min, halfwidth * 2, halfheight * 2);
    }
    ctx.restore();
  }
);

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  return ctx;
}

function outlineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
) {
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

export const draw_health = makePureSystem(function (
  ctx: CanvasRenderingContext2D,
  player: OurEntity
) {
  let life = player.life!;
  life = life < 0 ? 0 : life;
  const max_life = player.max_life!;
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 0.5;
  roundedRect(ctx, 15, 5, 40, 4, 1).stroke();
  ctx.fillStyle = "#fff";
  roundedRect(ctx, 15.5, 5.5, (life / max_life) * 39, 3, 0.5).fill();
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 0.8;
  ctx.fillStyle = "white";
  ctx.font = "4px 'kenvector future'";
  ctx.textBaseline = "hanging";
  outlineText(ctx, "HP:", 5, 5);
  outlineText(ctx, "" + life, 57, 5);
  ctx.restore();
});

export const debug_entities = makeSystem(
  ["dying"],
  function (view, ctx: CanvasRenderingContext2D) {
    const count = this.entitiesCount;
    ctx.save();
    ctx.strokeStyle = "#777";
    ctx.fillStyle = "white";
    ctx.font = "4px 'kenvector future'";
    ctx.textBaseline = "hanging";
    outlineText(ctx, `ENTITIES: ${count}`, 5, 10);
    outlineText(ctx, `DYING: ${view.size}`, 5, 15);
    ctx.restore();
  }
);
