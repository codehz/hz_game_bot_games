import { splitImportURL } from "/js/utils.js";
import "./loader.js";

const kind = splitImportURL(import.meta.url);

if (kind.ver == "atlas") {
  await import("./atlas.js");
}
