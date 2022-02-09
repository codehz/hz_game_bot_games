const game = new URL(location.href).searchParams.get("game") ?? "";
const [id, ver] = game.split(/_game_?/, 2);
import(`./games/${id}_game/index.js?${ver ?? ""}`);
