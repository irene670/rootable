import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Rootable product landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Rootable 森根/);
  assert.match(html, /一張 QR Code/);
  assert.match(html, /現金模式/);
  assert.match(html, /Rootable 代支付/);
  assert.match(html, /href="\/menu"/);
  assert.match(html, /href="\/merchant"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|SkeletonPreview/);
});

test("exposes the customer and merchant product routes", async () => {
  const [menuResponse, merchantResponse] = await Promise.all([render("/menu"), render("/merchant")]);
  assert.equal(menuResponse.status, 200);
  assert.equal(merchantResponse.status, 200);
  const [menu, merchant] = await Promise.all([menuResponse.text(), merchantResponse.text()]);
  assert.match(menu, /森日小館/);
  assert.match(menu, /手機點餐/);
  assert.match(menu, /<meta property="og:title" content="森日小館｜手機點餐">/);
  assert.match(menu, /<meta name="twitter:title" content="森日小館｜手機點餐">/);
  assert.doesNotMatch(menu, /og\.png/);
  assert.match(merchant, /店家接單/);
  assert.match(merchant, /<meta property="og:title" content="森日小館｜Rootable 店家接單">/);
  assert.match(merchant, /<meta name="twitter:title" content="森日小館｜Rootable 店家接單">/);
  assert.doesNotMatch(merchant, /og\.png/);
});

test("keeps production metadata, storage, and social assets wired", async () => {
  const [layout, packageJson, hosting] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Rootable 森根/);
  assert.match(layout, /\/og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(hosting, /"d1": "DB"/);
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
