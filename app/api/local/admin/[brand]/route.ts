import { publicAccount } from "../../../../../lib/local/accounts";
import { NextResponse } from "next/server";
import {
  readBusiness,
  parseBrand,
  mutate,
  record,
  database,
} from "../../../../../lib/local/store";
import { checkOrigin, requireUser } from "../../../../../lib/local/auth";
import { body, failure } from "../../../../../lib/local/http";
import { adminAction } from "../../../../../lib/local/actions";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    const brand = parseBrand((await params).brand),
      user = await requireUser(brand);
    const b = await readBusiness(brand);
    const users = (await database()).users;
    const brandAccounts = users
      .filter((u) => u.brands.includes(brand))
      .map(publicAccount);
    const staff = brandAccounts.filter((u) => u.status !== "Suspended");
    const accounts =
      user.role === "Developer" ? users.map(publicAccount) : brandAccounts;
    return NextResponse.json(
      {
        ...b,
        conversations: b.conversations.map(
          ({ visitorHash: _secret, ...c }) => c,
        ),
        user,
        staff,
        accounts,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ brand: string }> },
) {
  try {
    checkOrigin(request);
    const brand = parseBrand((await params).brand),
      user = await requireUser(brand),
      input = record(await body(request));
    const result = await mutate(
      brand,
      user.name,
      String(input.action),
      String(input.id || "workspace"),
      (b, db) => adminAction(b, brand, input, user, db),
    );
    return NextResponse.json({ result });
  } catch (e) {
    return failure(e);
  }
}
