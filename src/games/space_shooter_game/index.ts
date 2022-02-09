import AssLoader from "/js/assloader.js";
import { splitImportURL } from "/js/utils.js";

export const assets = await AssLoader.load("/assets/space_shooter_game/assets.zip");

const kind = splitImportURL(import.meta.url);

if (kind.ver == "atlas") {
  await import("./atlas.js");
}
