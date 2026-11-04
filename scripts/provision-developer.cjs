// Local-only provisioning: the API requires this one-use filesystem token.
const { randomBytes } = require("node:crypto");
const { writeFile, unlink, mkdir } = require("node:fs/promises");
const path = require("node:path");
(async () => {
  const base = process.env.LOCAL_BASE_URL || "http://localhost:2030";
  const login = await fetch(base + "/api/local/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "owner@local.test",
      password: process.env.LOCAL_OWNER_PASSWORD || "LocalDemo!2026",
    }),
  });
  if (!login.ok)
    throw Error(
      "Local owner sign-in failed. Set LOCAL_OWNER_PASSWORD if the local owner password was changed.",
    );
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const token = randomBytes(32).toString("hex");
  const file = path.join(process.cwd(), ".local", "account-provision.token");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, token, { flag: "wx", mode: 0o600 });
  try {
    const r = await fetch(base + "/api/local/admin/idesire", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        action: "createStaff",
        name: "Developer",
        username: "Developer",
        email: "",
        role: "Developer",
        brands: ["idesire", "kokies"],
        provisionToken: token,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    console.log(
      JSON.stringify({
        username: data.result.username,
        password: data.result.password,
        id: data.result.account.id,
      }),
    );
  } finally {
    await unlink(file).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
