import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("builds the Netlify SPA with multi-merchant routes and persistent functions", async () => {
  const html = await readFile(new URL("../netlify-dist/index.html", import.meta.url), "utf8");
  assert.match(html, /Rootable 森根/);
  assert.match(html, /src="\/assets\/[^"]+\.js"/);
  await Promise.all([
    access(new URL("../netlify-dist/menu/chicken.jpg", import.meta.url)),
    access(new URL("../netlify/functions/orders.ts", import.meta.url)),
    access(new URL("../netlify/functions/stores.ts", import.meta.url)),
    access(new URL("../netlify/functions/reservations.ts", import.meta.url)),
    access(new URL("../netlify/functions/reviews.ts", import.meta.url)),
  ]);
});
