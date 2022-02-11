// preload hint
import "/deps/jszip.js";
import "/js/ce.js";
import "/js/assloader.js";
import "/js/atlas.js";
import "/js/jsx.js";
import "/js/canvas.js";

import { splitImportURL } from "/js/utils.js";
import "./loader.js";

const kind = splitImportURL(import.meta.url);

if (kind.ver == "atlas") {
  await import("./atlas.js");
} else {
  await import("./game.js?" + kind.ver);
}
