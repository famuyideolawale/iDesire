import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { checkOrigin, AuthError } from "../../../../../lib/local/auth";
import { customerCookie, customerToken, signedInCustomer, tokenHash } from "../../../../../lib/local/customer-auth";
import { body, failure } from "../../../../../lib/local/http";
import { limitRequest } from "../../../../../lib/local/rate-limit";
import { database, mutate, parseBrand, record, required } from "../../../../../lib/local/store";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ brand: string }> };

export async function GET(_request: Request, {params}: Context) {
  try {
    const brand = parseBrand((await params).brand);
    const token = await customerToken(brand);
    if (!token) return NextResponse.json({account:null}, {headers:{"Cache-Control":"no-store"}});
    const db = await database();
    const account = signedInCustomer(db, brand, token);
    return NextResponse.json({ account: account ? { name: account.name, email: account.email } : null,
      orders: account ? db.businesses[brand].orders.filter(o => o.customerAccountId === account.id)
        .map(o => ({ reference: o.id, status: o.status, total: o.total, createdAt: o.createdAt })) : []
    }, {headers:{"Cache-Control":"no-store"}});
  } catch(error) { return failure(error); }
}

export async function POST(request: Request, {params}: Context) {
  try {
    checkOrigin(request);
    const brand = parseBrand((await params).brand);
    limitRequest(request, "customer-account-" + brand, 12, 5 * 60_000);
    const input = record(await body(request));
    const action = input.action;
    const current = await customerToken(brand);
    if (action !== "register" && action !== "login" && action !== "logout") throw new Error("Unknown account action.");
    const token = randomBytes(32).toString("hex");
    await mutate(brand, "Storefront account", String(action), "Customer account", (_,db) => {
      db.customerAccounts ??= { idesire: [], kokies: [] };
      if (action === "logout") {
        const account = signedInCustomer(db,brand,current);
        if (account) account.sessions = account.sessions.filter(s => s.hash !== tokenHash(current));
        return;
      }
      const email = required(input.email,"Email",200).toLowerCase();
      const password = typeof input.password === "string" ? input.password : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 200)
        throw new Error("Use a valid email and a password of 10–200 characters.");
      let account = db.customerAccounts[brand].find(a => a.email === email);
      if (action === "register") {
        if (account) throw new AuthError("This email already has an account for this shop.",409);
        const salt = randomBytes(16).toString("hex");
        account = {id:randomUUID(),name:required(input.name,"Name",100),email,salt,passwordHash:scryptSync(password,salt,64).toString("hex"),sessions:[]};
        db.customerAccounts[brand].push(account);
      } else {
        const candidate = scryptSync(password, account?.salt ?? "customer-auth-placeholder", 64);
        if (!account || !timingSafeEqual(candidate,Buffer.from(account.passwordHash,"hex")))
          throw new AuthError("Email or password is incorrect.",401);
      }
      account.sessions = account.sessions.filter(s => s.expiresAt > Date.now()).slice(-7);
      account.sessions.push({hash:tokenHash(token),expiresAt:Date.now()+7*86400_000});
    });
    const response = NextResponse.json({ok:true}, {headers:{"Cache-Control":"no-store"}});
    response.cookies.set(customerCookie(brand),action === "logout" ? "" : token,{
      httpOnly:true,sameSite:"lax",secure:process.env.RENDER === "true" || new URL(request.url).protocol === "https:",
      path:"/",maxAge:action === "logout" ? 0 : 7*86400,
    });
    return response;
  } catch(error) { return failure(error); }
}
