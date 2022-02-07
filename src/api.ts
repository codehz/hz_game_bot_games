export type LogInfo = {
  session_id: number;
  time: number;
  user_id: number;
  score: number;
};

function api(
  endpoint: `log/${number}`,
  opt: { query?: string }
): Promise<LogInfo[]>;
async function api<R>(
  endpoint: string,
  {
    body,
    method,
    query,
  }: {
    body?: string;
    method?: "GET" | "PUT" | "DELETE";
    query?: URLSearchParams | string;
  } = {}
) {
  let path = `/api/${endpoint}`;
  if (query) path += "?" + query;
  const res = await fetch(
    path,
    body ? { method: method ?? "PUT", body } : { method }
  );
  if (res.status != 200) throw new Error("request failed");
  return (await res.json()) as R;
}

export default api;
