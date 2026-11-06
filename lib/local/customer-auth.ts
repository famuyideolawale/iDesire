import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { Brand, StoreDatabase } from "./types";

export const customerCookie = (brand: Brand) => "shop-account-" + brand;
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function customerToken(brand: Brand) {
  return (await cookies()).get(customerCookie(brand))?.value ?? "";
}
export function signedInCustomer(db: StoreDatabase, brand: Brand, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return undefined;
  const hash = tokenHash(token);
  return db.customerAccounts?.[brand].find(account => account.sessions.some(s => s.hash === hash && s.expiresAt > Date.now()));
}
