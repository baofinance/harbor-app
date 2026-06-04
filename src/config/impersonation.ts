/** Wallet impersonation (read-only preview). Enable on staging; keep false in production. */
export const IMPERSONATION_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_IMPERSONATION === "true";
