import { NextResponse } from "next/server";
import { ipHash } from "./spam";
import { serverRpc, serverRpcReady } from "./serverRpc";

export const ADMIN_MAX_FAILS = 10, ADMIN_WINDOW_MIN = 15;

/**
 * Wraps an admin route: blocks an IP hash after 10 failed token attempts in 15 minutes (counted in the DB),
 * and records a failure whenever the handler answers 401. Fails open on DB errors so admin is never bricked.
 */
export async function withAdmin(req: Request, handler: () => Promise<Response>): Promise<Response> {
  const token = req.headers.get("x-admin-token") ?? "";
  const ready = serverRpcReady(), ih = ipHash(req);
  if (ready) {
    try {
      const n = await serverRpc<number>("server_admin_throttle", { p_ip_hash: ih, p_fail: false, p_window_min: ADMIN_WINDOW_MIN });
      if (n >= ADMIN_MAX_FAILS) return NextResponse.json({ error: "Too many wrong attempts. Try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900" } });
    } catch { /* fail open */ }
  }
  const res = token ? await handler() : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (res.status === 401 && ready) {
    try { await serverRpc<number>("server_admin_throttle", { p_ip_hash: ih, p_fail: true, p_window_min: ADMIN_WINDOW_MIN }); } catch { /* ignore */ }
  }
  return res;
}
