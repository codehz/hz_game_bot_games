const game = new URL(location.href).searchParams.get("game") ?? "";
const [id, ver] = game.split("__", 2);
import(`./games/${id}.js?${ver}`);
