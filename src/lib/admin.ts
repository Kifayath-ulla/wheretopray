// Simple shared-secret admin check. Set ADMIN_TOKEN in .env.local (defaults to "changeme" in dev).
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "changeme";
export const isAdmin = (token: string | null | undefined) => !!token && token === ADMIN_TOKEN;
