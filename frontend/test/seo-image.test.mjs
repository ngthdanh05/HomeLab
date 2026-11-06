// Unit tests for the next/image IPFS loader and SEO helpers (run with --experimental-strip-types).
import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ipfsImageLoader, isPinataDedicatedGateway, remoteImageProps } from "../src/lib/image-loader.ts";
import { getSiteUrl, pageMetadata, PUBLIC_ROUTES } from "../src/lib/seo.ts";

describe("ipfs image loader", () => {
  const cid = "https://my-app.mypinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

  test("only dedicated Pinata gateways resize (the public one ignores img-* params)", () => {
    assert.equal(isPinataDedicatedGateway(cid), true);
    assert.equal(isPinataDedicatedGateway("https://gateway.pinata.cloud/ipfs/abc"), false);
    assert.equal(isPinataDedicatedGateway("https://ipfs.io/ipfs/abc"), false);
    assert.equal(isPinataDedicatedGateway("data:image/png;base64,AAAA"), false);
    assert.equal(isPinataDedicatedGateway("not a url"), false);
  });

  test("requests the rendered width as WebP", () => {
    const url = new URL(ipfsImageLoader({ src: cid, width: 640 }));
    assert.equal(url.searchParams.get("img-width"), "640");
    assert.equal(url.searchParams.get("img-format"), "webp");
    assert.equal(url.searchParams.get("img-quality"), "75");
    assert.equal(url.pathname, new URL(cid).pathname);
    assert.equal(new URL(ipfsImageLoader({ src: cid, width: 64, quality: 50 })).searchParams.get("img-quality"), "50");
  });

  test("keeps existing query params", () => {
    const url = new URL(ipfsImageLoader({ src: `${cid}?filename=a.png`, width: 256 }));
    assert.equal(url.searchParams.get("filename"), "a.png");
    assert.equal(url.searchParams.get("img-width"), "256");
  });

  test("non-Pinata sources are served unoptimized", () => {
    assert.ok("loader" in remoteImageProps(cid));
    assert.deepEqual(remoteImageProps("https://ipfs.io/ipfs/abc"), { unoptimized: true });
    assert.deepEqual(remoteImageProps("https://gateway.pinata.cloud/ipfs/abc"), { unoptimized: true });
    assert.deepEqual(remoteImageProps("data:image/png;base64,AAAA"), { unoptimized: true });
  });
});

describe("seo", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  test("site URL: explicit env, then Vercel production domain, then localhost", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    assert.equal(getSiteUrl().origin, "http://localhost:3000");
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "myhomelab.vercel.app";
    assert.equal(getSiteUrl().origin, "https://myhomelab.vercel.app");
    process.env.NEXT_PUBLIC_SITE_URL = "https://myhomelab.vn";
    assert.equal(getSiteUrl().origin, "https://myhomelab.vn");
    process.env.NEXT_PUBLIC_SITE_URL = "::not a url::";
    assert.equal(getSiteUrl().origin, "http://localhost:3000");
  });

  test("pageMetadata sets canonical, OpenGraph and Twitter consistently", () => {
    const m = pageMetadata({ title: "Community DAO", description: "Mô tả", path: "/governance" });
    assert.equal(m.title, "Community DAO");
    assert.deepEqual(m.alternates, { canonical: "/governance" });
    assert.equal(m.openGraph.title, "Community DAO — MyHomeLab");
    assert.equal(m.openGraph.url, "/governance");
    assert.equal(m.openGraph.locale, "vi_VN");
    assert.equal(m.twitter.card, "summary_large_image");
    assert.equal(m.twitter.description, "Mô tả");
  });

  test("sitemap routes are unique, absolute paths with valid priorities", () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    assert.equal(new Set(paths).size, paths.length);
    for (const r of PUBLIC_ROUTES) {
      assert.match(r.path, /^\//);
      assert.ok(r.priority > 0 && r.priority <= 1);
    }
  });
});
