import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { slides } from "../src/app/slides/theanywherecompany/slides";
import { createImagePreloader, slideImages } from "../src/app/slides/theanywherecompany/slideMedia";

test("every slide has a media manifest and every declared image exists", async () => {
  assert.deepEqual(Object.keys(slideImages).sort(), slides.map(({ id }) => id).sort());
  await Promise.all([...new Set(Object.values(slideImages).flat())].map((name) =>
    access(new URL(`../public/slides/theanywherecompany/${name}.webp`, import.meta.url))));
});

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("a pending preload is shared and stays pending until the image is decoded", async () => {
  const decoding = deferred();
  let requests = 0;
  const preload = createImagePreloader(() => {
    requests += 1;
    return { src: "", decoding: "async", decode: () => decoding.promise };
  });
  let ready = false;
  const first = preload("photo.webp");
  assert.equal(preload("photo.webp"), first);
  const completion = first.then(() => { ready = true; });
  await Promise.resolve();
  assert.equal(ready, false);
  assert.equal(requests, 1);
  decoding.resolve();
  await completion;
  assert.equal(ready, true);
  assert.equal(preload("photo.webp"), first);
});

test("one decoded photo cannot release a composition while another is still loading", async () => {
  const images = [deferred(), deferred()];
  let created = 0;
  const preload = createImagePreloader(() => {
    const pending = images[created++];
    return { src: "", decoding: "async", decode: () => pending.promise };
  });
  let ready = false;
  const composition = Promise.all([preload("first.webp"), preload("second.webp")]).then(() => { ready = true; });
  images[0].resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(ready, false);
  images[1].resolve();
  await composition;
  assert.equal(ready, true);
});

test("a failed image can be retried instead of permanently caching the failure", async () => {
  let attempts = 0;
  const preload = createImagePreloader(() => ({
    src: "", decoding: "async", decode: () => ++attempts === 1 ? Promise.reject(new Error("offline")) : Promise.resolve(),
  }));
  await assert.rejects(preload("retry.webp"), /offline/);
  await preload("retry.webp");
  assert.equal(attempts, 2);
});

test("the decoded-image cache is bounded and retains recently used images", async () => {
  let requests = 0;
  const preload = createImagePreloader(() => {
    requests += 1;
    return { src: "", decoding: "async", decode: () => Promise.resolve() };
  }, 2);
  await preload("first.webp");
  await preload("second.webp");
  await preload("first.webp");
  await preload("third.webp");
  await preload("first.webp");
  assert.equal(requests, 3);
  await preload("second.webp");
  assert.equal(requests, 4);
});
