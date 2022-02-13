// preload hint
import "/deps/jszip.js";
import "/js/atlas.js";
import "/js/assloader.js";

import { splitImportURL } from "/js/utils.js";
import "./loader.js";

import("/js/canvas.js");

const kind = splitImportURL(import.meta.url);

if (kind.ver == "atlas") {
  await import("./atlas.js");
} else if (kind.ver == "probe") {
  await import("./probe.js");
} else {
  await import("./game.js?" + kind.ver);
}
