import AssLoader from "/js/assloader.js";
import { TextureAtlas } from "/js/atlas.js";

export default AssLoader.load("/assets/space_shooter_game/assets.zip").then(
  (assets) => {
    const sheet = assets.getImage("sheet")!;
    const atlas = new TextureAtlas(assets.getXml("sheet")!);

    const cursor = atlas.get("cursor")!;
    const canvas = document.createElement("canvas");
    canvas.width = cursor.width;
    canvas.height = cursor.height;
    const ctx = canvas.getContext("2d")!;
    cursor.blit(ctx, sheet);
    const uri = canvas.toDataURL("image/png");
    const css = document.createElement("style");
    css.innerHTML = `html{cursor: url('${uri}'), auto}`;
    document.head.append(css);

    return { assets, sheet, atlas };
  }
);