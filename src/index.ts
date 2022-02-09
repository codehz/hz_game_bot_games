import { reqeust, getData } from "./utils.js";

export type User = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};
export type GameHighScore = {
  position: number;
  user: User;
  score: number;
};
export let score: (score: number) => Promise<GameHighScore[]>;

declare global {
  const TelegramGameProxy: {
    shareScore(): void;
  };
}

if (location.pathname.includes("mock")) {
  score = async () => [];
} else {
  score = (score: number) => reqeust("SCORE", score + "");
  const { game } = getData<{ game: string }>();
  const [name, ver] = game.split(/_game_?/, 2);
  import(`./games/${name}_game/index.js?${ver ?? ""}`);
}
