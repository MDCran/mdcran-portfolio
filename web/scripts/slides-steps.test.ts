import assert from "node:assert/strict";
import test from "node:test";
import { createSlideStepController } from "../src/app/slides/theanywherecompany/PresentationSteps";

function manualSequence(slideId: string, count: number, initial = 0) {
  const controller = createSlideStepController();
  let index = initial;
  const update = () => controller.register("gallery", {
    slideId, count, index, nextLabel: "Next image", previousLabel: "Previous image",
    select(next) { index = next; update(); },
  });
  update();
  return { controller, index: () => index };
}

test("clicker Next consumes each manual image and releases at the final image", () => {
  const gallery = manualSequence("photo-album", 5);
  for (let index = 1; index < 5; index++) {
    assert.equal(gallery.controller.move("photo-album", 1), true);
    assert.equal(gallery.index(), index);
  }
  assert.equal(gallery.controller.move("photo-album", 1), false);
  assert.equal(gallery.index(), 4);
});

test("clicker Previous walks backward and releases at the first image", () => {
  const gallery = manualSequence("smart-home", 7, 6);
  for (let index = 5; index >= 0; index--) {
    assert.equal(gallery.controller.move("smart-home", -1), true);
    assert.equal(gallery.index(), index);
  }
  assert.equal(gallery.controller.move("smart-home", -1), false);
  assert.equal(gallery.index(), 0);
});

test("single-image and automatic slides do not trap slide advancement", () => {
  const gallery = manualSequence("single", 1);
  assert.equal(gallery.controller.move("single", 1), false);
  assert.equal(gallery.controller.move("single", -1), false);
  assert.equal(gallery.controller.move("automatic-gallery", 1), false);
});

test("an outgoing slide cannot consume a new slide's clicker input", () => {
  const old = manualSequence("old-slide", 5);
  let selected = -1;
  old.controller.register("new-owner", { slideId: "new-slide", index: 0, count: 3, nextLabel: "Next", previousLabel: "Back", select: (index) => { selected = index; } });
  assert.equal(old.controller.move("new-slide", 1), true);
  assert.equal(selected, 1);
  assert.equal(old.index(), 0);
  old.controller.unregister("gallery");
  assert.equal(old.controller.getSnapshot().length, 1);
  assert.equal(old.controller.move("old-slide", 1), false);
  assert.equal(old.controller.move("new-slide", 1), true);
});

test("updating a callback keeps the stable progress snapshot and uses the latest handler", () => {
  const controller = createSlideStepController();
  const info = { slideId: "creators", index: 0, count: 5, nextLabel: "Next creator group", previousLabel: "Previous creator group" };
  let oldCalled = false, newCalled = false;
  controller.register("owner", { ...info, select: () => { oldCalled = true; } });
  const snapshot = controller.getSnapshot();
  controller.register("owner", { ...info, select: () => { newCalled = true; } });
  assert.equal(controller.getSnapshot(), snapshot);
  controller.move("creators", 1);
  assert.equal(newCalled, true);
  assert.equal(oldCalled, false);
});

test("switching a gallery to automatic removes its manual steps and notifies the toolbar", () => {
  const controller = createSlideStepController();
  let notifications = 0;
  const stop = controller.subscribe(() => { notifications++; });
  controller.register("owner", { slideId: "chicago", index: 1, count: 4, nextLabel: "Next", previousLabel: "Back", select() {} });
  controller.unregister("owner");
  assert.equal(controller.move("chicago", 1), false);
  assert.deepEqual(controller.getSnapshot(), []);
  assert.equal(notifications, 2);
  stop();
});
