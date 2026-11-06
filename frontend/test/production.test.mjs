// Unit tests for production hardening: Redis rate limiter and Gemini timeouts (run with --experimental-strip-types).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimitRedis, getRedisConfig } from "../src/lib/rate-limit.ts";

const CONFIG = { url: "https://eu1-example.upstash.io", token: "test-token" };

/** Minimal in-memory Upstash REST /pipeline stand-in. */
function fakeUpstash() {
  const store = new Map();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const commands = JSON.parse(init.body);
    const results = commands.map(([cmd, key, arg, flag]) => {
      const entry = store.get(key);
      if (cmd === "INCR") {
        const value = (entry?.value ?? 0) + 1;
        store.set(key, { value, ttl: entry?.ttl ?? -1 });
        return { result: value };
      }
      if (cmd === "PEXPIRE") {
        if (flag === "NX" && entry && entry.ttl >= 0) return { result: 0 };
        store.get(key).ttl = Number(arg);
        return { result: 1 };
      }
      if (cmd === "PTTL") return { result: store.get(key)?.ttl ?? -2 };
      return { error: `unknown ${cmd}` };
    });
    return new Response(JSON.stringify(results), { status: 200 });
  };
  return { fetchImpl, calls, store };
}

describe("getRedisConfig", () => {
  test("reads Upstash or Vercel KV variable names and trims the URL", () => {
    assert.equal(getRedisConfig({}), null);
    assert.equal(getRedisConfig({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io" }), null);
    assert.deepEqual(getRedisConfig({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io/", UPSTASH_REDIS_REST_TOKEN: "t" }), {
      url: "https://x.upstash.io",
      token: "t",
    });
    assert.deepEqual(getRedisConfig({ KV_REST_API_URL: "https://kv.upstash.io", KV_REST_API_TOKEN: "k" }), {
      url: "https://kv.upstash.io",
      token: "k",
    });
  });
});

describe("checkRateLimitRedis", () => {
  test("allows up to the limit, then blocks with Retry-After from the TTL", async () => {
    const { fetchImpl, calls } = fakeUpstash();
    for (let i = 0; i < 3; i++) {
      assert.deepEqual(await checkRateLimitRedis(CONFIG, "chat:1.2.3.4", 3, 60_000, fetchImpl), {
        allowed: true,
        retryAfterSeconds: 0,
      });
    }
    const blocked = await checkRateLimitRedis(CONFIG, "chat:1.2.3.4", 3, 60_000, fetchImpl);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 60);

    const { url, init } = calls[0];
    assert.equal(url, "https://eu1-example.upstash.io/pipeline");
    assert.equal(init.headers.Authorization, "Bearer test-token");
    assert.deepEqual(JSON.parse(init.body)[0], ["INCR", "rl:chat:1.2.3.4"]);
  });

  test("sets the window only on the first hit (PEXPIRE NX)", async () => {
    const { fetchImpl, store } = fakeUpstash();
    await checkRateLimitRedis(CONFIG, "k", 5, 10_000, fetchImpl);
    store.get("rl:k").ttl = 4_000; // time passes
    await checkRateLimitRedis(CONFIG, "k", 5, 10_000, fetchImpl);
    assert.equal(store.get("rl:k").ttl, 4_000);
  });

  test("tracks keys independently", async () => {
    const { fetchImpl } = fakeUpstash();
    await checkRateLimitRedis(CONFIG, "a", 1, 1_000, fetchImpl);
    assert.equal((await checkRateLimitRedis(CONFIG, "a", 1, 1_000, fetchImpl)).allowed, false);
    assert.equal((await checkRateLimitRedis(CONFIG, "b", 1, 1_000, fetchImpl)).allowed, true);
  });

  test("throws on HTTP or command errors so the caller can fall back", async () => {
    const httpError = async () => new Response("nope", { status: 401 });
    await assert.rejects(checkRateLimitRedis(CONFIG, "k", 1, 1_000, httpError), /Upstash 401/);
    const cmdError = async () => new Response(JSON.stringify([{ error: "WRONGTYPE" }, {}, {}]), { status: 200 });
    await assert.rejects(checkRateLimitRedis(CONFIG, "k", 1, 1_000, cmdError), /WRONGTYPE/);
  });
});

describe("withGeminiTimeout", async () => {
  const { withGeminiTimeout, withGeminiRetry, GeminiTimeoutError } = await import("../src/lib/gemini.ts");

  test("passes results through and times out hanging calls with status 504", async () => {
    assert.equal(await withGeminiTimeout(Promise.resolve("ok"), 50), "ok");
    const hanging = new Promise(() => {});
    await assert.rejects(withGeminiTimeout(hanging, 20), (e) => e instanceof GeminiTimeoutError && e.status === 504);
  });

  test("timeouts are not retried (they would exceed the 25 s edge budget)", async () => {
    let calls = 0;
    await assert.rejects(
      withGeminiRetry(() => {
        calls++;
        return withGeminiTimeout(new Promise(() => {}), 10);
      }, [1, 1]),
      GeminiTimeoutError,
    );
    assert.equal(calls, 1);
  });
});
