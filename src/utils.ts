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

export function splitImportURL(urlstr: string) {
  const url = new URL(urlstr);
  const matched = url.pathname.match(/\/js\/games\/(?<name>[^\/]+)\/.*\.js/);
  const name = matched?.groups?.name;
  if (name == null) throw new Error("invalid url");
  const ver = url.search.slice(1);
  return { name, ver };
}

export class Timer {
  #init: number;

  constructor(init: number, public value: number = init) {
    this.#init = init;
  }

  next() {
    if (this.value-- <= 0) {
      this.value = this.#init;
      return true;
    } else {
      return false;
    }
  }
}

export function* range(to: number, from: number = 0) {
  for (let i = from; i < to; i++) yield i;
}

export function randomSelect<T>(arr: readonly T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

export function vibRange(to: number) {
  const orig = [...range(to)];
  const reversed: number[] = [];
  while (orig.length) {
    orig.reverse();
    reversed.push(orig.shift()!);
  }
  reversed.reverse();
  return reversed;
}

export function minmax(value: number, min: number, max: number) {
  return Math.max(Math.min(value, max), min);
}
