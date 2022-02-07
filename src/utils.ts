export async function reqeust<R>(method: string, body: string) {
  const res = await fetch("/", { method, body });
  if (res.status != 200) throw new Error("request failed");
  return (await res.json()) as R;
}

export function parseJWT<T = {}>(token: string): T & { exp: number } {
  return JSON.parse(atob(token.split(".")[1]));
}

export function getData<T>() {
  const data = new URL(location.href).searchParams.get("data");
  if (!data) {
    throw new String("no token found");
  }
  return parseJWT<T>(data);
}

export function debounce<T extends Function>(cb: T, wait = 100) {
  let h = 0;
  return ((...args: any) => {
    clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  }) as unknown as T;
}
