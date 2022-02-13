import { makeSystem } from "./types.js";

export const sprite = makeSystem(
  ["position", "atlas", "rotate", "scale", "opacity"],
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