import AssLoader from "/js/assloader.js";
import { TextureAtlas } from "/js/atlas.js";
import { css } from "/js/html.js";

export const assets = await AssLoader.load(
  "/assets/space_shooter_game/assets.zip"
);

export const sheet = assets.getImage("sheet")!;
export const atlas = new TextureAtlas(assets.getXml("sheet")!);

const cursor = atlas.get("cursor");
if (cursor) {
  const canvas = document.createElement("canvas");
  canvas.width = cursor.width;
  canvas.height = cursor.height;
  const ctx = canvas.getContext("2d")!;
  cursor.blit(ctx, sheet);
  const uri = canvas.toDataURL("image/png");
  document.head.append(css`
    html {
      cursor: '${uri}'), aut;
    }
  `);
}
