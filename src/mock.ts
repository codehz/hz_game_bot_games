const game = new URL(location.href).searchParams.get("game");
import(`./games/${game}.js`);