const ALWAYS_ADMIN_ADDRESSES = new Set<string>([
  "0xae7dbb17bc40d53a6363409c6b1ed88d3cfdc31e",
]);

export function isAlwaysAdminAddress(address?: string | null): boolean {
  if (!address) return false;
  return ALWAYS_ADMIN_ADDRESSES.has(address.toLowerCase());
}

