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
  }
}

if (location.pathname.includes("mock")) {
  score = async () => [];
} else {
  score = async (score: number) => {
    const res = await fetch("/", { method: "SCORE", body: "" + score });
    if (res.status != 200) throw new Error("invalid score");
    return await res.json();
  };
  const data = new URL(location.href).searchParams.get("data");
  if (!data) {
    throw new String("invalid");
  }
  function parseJwt(token: string) {
    return JSON.parse(atob(token.split(".")[1]));
  }
  const { game } = parseJwt(data) as { game: string };
  import(`./games/${game}.js`);
}