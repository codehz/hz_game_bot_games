import { makeSystem } from "./types.js";

export const ball = makeSystem(
  ["tag_ball", "position", "radius"],
  function (view, ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = "white";
    for (const {
      position: { x, y },
      radius,
    } of view)
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }
);

export const wall = makeSystem(
  ["tag_wall", "length", "location", "side"],
  function (view, ctx: CanvasRenderingContext2D) {
    const width = this.resource.wall_width;
    ctx.save();
    ctx.fillStyle = "white";
    for (const { length, location, side } of view) {
      const x = side == "left" ? width : 150 - width;
      ctx.fillRect(x - width / 2, location * (100 - length), width, length);
    }
    ctx.restore();
  }
);

export const ghost = makeSystem(
  ["tag_ghost", "position", "radius", "opacity"],
  function (view, ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = "white";
    for (const {
      position: { x, y },
      radius,
      opacity,
    } of view) {
      ctx.globalAlpha = opacity;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }
);

export const text = makeSystem(
  ["text", "font", "position", "opacity", "style", "scale", "-tag_hidden"],
  function (view, ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const {
      text,
      font,
      position: { x, y },
      opacity,
      style,
      scale,
    } of view) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.font = font;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = style;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
);
