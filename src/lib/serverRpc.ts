// Server-only calls to Supabase RPCs that require the server-held ADMIN_TOKEN.
const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const serverRpcReady = () => !!(URL_() && KEY() && (process.env.ADMIN_TOKEN ?? "").length >= 16);
export async function serverRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${URL_()}/rest/v1/rpc/${fn}`, {
    method: "POST", cache: "no-store",
    headers: { apikey: KEY()!, Authorization: `Bearer ${KEY()}`, "content-type": "application/json" },
    body: JSON.stringify({ p_token: process.env.ADMIN_TOKEN ?? "", ...args }),
  });
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}`);
  return (await r.json()) as T;
}
