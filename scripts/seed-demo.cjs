/* Add missing demonstration records to a stopped local workspace. Existing records win. */
const fs = require("node:fs");
const ts = require("typescript");
const path = require("node:path");

if (process.env.RENDER || process.env.DATABASE_URL) throw Error("This script is for local files only.");
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
const { seedBusiness } = require("../lib/local/seed.ts");
const target = path.resolve(process.argv[2] || ".local/store.json");
if (path.basename(target) !== "store.json" || path.basename(path.dirname(target)) !== ".local")
  throw Error("Choose a .local/store.json file.");
const original = fs.readFileSync(target, "utf8");
const database = JSON.parse(original);
for (const brand of ["idesire", "kokies"]) {
  const current = database.businesses[brand];
  const seed = seedBusiness(brand);
  const productIds = new Set(current.products.map(p => p.id));
  const existingSlugs = new Set(current.products.map(p => p.slug));
  const products = seed.products.filter(p => !productIds.has(p.id) && !existingSlugs.has(p.slug));
  current.products.push(...products);
  for (const product of products) {
    const record = seed.inventory.find(i => i.productId === product.id);
    if (record) current.inventory.push(record);
  }
  const pageIds = new Set(current.pages.map(page => page.id));
  current.pages.push(...seed.pages.filter(page => !pageIds.has(page.id)));
  const existingOrders = new Set(current.orders.map(o => o.id));
  const customerIds = new Set(current.customers.map(c => c.id));
  current.customers.push(...seed.customers.filter(c => !customerIds.has(c.id)));
  const orders = seed.orders.filter(o => !existingOrders.has(o.id) && o.items.every(i => current.products.some(p => p.id === i.productId)));
  // A demonstration backfill must not reserve existing operational stock.
  current.orders.push(...orders.map(o => ({...o, reserved: false})));
  current.revision++;
  console.log(brand + ": added " + products.length + " products and " + orders.length + " demo orders.");
}
const backup = target + ".before-demo-" + Date.now();
fs.copyFileSync(target, backup, fs.constants.COPYFILE_EXCL);
const temporary = target + ".demo-" + process.pid + ".tmp";
fs.writeFileSync(temporary, JSON.stringify(database, null, 2), {flag:"wx"});
fs.renameSync(temporary, target);
