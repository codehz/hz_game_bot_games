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

function draw_bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  value: number
) {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 0.5;
  roundedRect(ctx, x, y, width, 4, 1).stroke();
  ctx.fillStyle = "#fff";
  roundedRect(ctx, x + 0.5, y + 0.5, value * (width - 1), 3, 0.5).fill();
  ctx.restore();
}

export const draw_health = makePureSystem(function (
  ctx: CanvasRenderingContext2D,
  player: OurEntity
) {
  let life = player.life!;
  life = life < 0 ? 0 : life;
  const max_life = player.max_life!;
  ctx.save();
  draw_bar(ctx, 15, 5, 40, life / max_life);
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 0.8;
  ctx.fillStyle = "white";
  ctx.font = "4px 'kenvector future'";
  ctx.textBaseline = "hanging";
  outlineText(ctx, "HP:", 5, 5);
  outlineText(ctx, "" + life, 57, 5);
  const {
    damage = NaN,
    time = NaN,
    time_limit = NaN,
  } = player.player_stats ?? {};
  const { spread = NaN } = player.player_weapon ?? {};
  const dps = (spread / time) * 60 * damage;
  const reg = player.shield_regeneration ?? 0;
  const cool = player.shield_cooldown ?? 0;
  draw_bar(ctx, 15, 10, 30, reg - (reg | 0));
  outlineText(ctx, "SP:", 5, 10);
  outlineText(ctx, `${reg.toFixed(2)}(CD:${(1 - cool).toFixed(2)})`, 47, 10);
  outlineText(
    ctx,
    `DMG:${damage.toFixed(1)} TIM:${time}/${time_limit}(${dps.toFixed(1)})`,
    5,
    15
  );
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
    outlineText(ctx, `ENTITIES: ${count}`, 5, 20);
    outlineText(ctx, `DYING: ${view.size}`, 5, 25);
    ctx.restore();
  }
);
