import assert from "node:assert/strict";
import { test } from "node:test";
import { accentTextColor, answerKeys, getOptions, getRizzConfig, parseRizzAnswers, sanitizeThemeCustomizations, validateRizzAnswers } from "../src/lib/rizz";
import { sunshineMessages } from "../src/lib/secret-pages";
import { publicSiteContent } from "../src/lib/public-site-content";
import { defaultSiteContent } from "../src/lib/site-content";

const valid = { name: "Test rival", phone: "+1 202 555 0142", nickname: "", dateIdeas: ["pokemon-card-night"], vibes: ["chill-and-cozy"], activities: ["pokemon-rematch"], winOvers: ["making-me-laugh"], customAnswers: { dateIdeas: "", vibes: "", activities: "", winOvers: "" } };

test("public content excludes invitation settings without changing the stored configuration", () => {
  const content = { ...defaultSiteContent, rizzTargetName: "Private recipient", rizzEnabled: true, rizzThemeCustomizations: { pokemon: { title: "Private invitation" } }, secretPages: { rivalCard: true, sunshineNotes: ["Private note"] } };
  const published = publicSiteContent(content);
  assert.ok(!Object.keys(published).some(key => key.startsWith("rizz") || key === "secretPages"));
  assert.equal(published.homeHero, content.homeHero);
  assert.equal(content.rizzTargetName, "Private recipient");
  assert.equal(content.secretPages.sunshineNotes[0], "Private note");
});

test("Pokémon and Monster Hunter prioritize their own game without hiding the other", () => {
  const pokemon = getRizzConfig({ rizzTheme: "pokemon" });
  const hunter = getRizzConfig({ rizzTheme: "monster-hunter" });
  assert.equal(getOptions("activities", pokemon)[0].value, "pokemon-rematch");
  assert.equal(getOptions("activities", hunter)[0].value, "monster-hunter");
  assert.ok(getOptions("activities", pokemon).some(option => option.value === "monster-hunter"));
});

test("theme wording and answer labels stay separate and blank text restores defaults", () => {
  const customizations = {
    pokemon: { title: "  A card challenge  ", card: "Custom card", accent: "#112233", optionLabels: { "activities:pokemon-rematch": "Play a practice match" } },
    cozy: { title: "Movie club" },
  };
  const pokemon = getRizzConfig({ rizzTheme: "pokemon", rizzThemeCustomizations: customizations });
  const cozy = getRizzConfig({ rizzTheme: "cozy", rizzThemeCustomizations: customizations });
  assert.equal(pokemon.appearance.title, "A card challenge");
  assert.equal(pokemon.appearance.card, "Custom card");
  assert.equal(cozy.appearance.title, "Movie club");
  assert.equal(getOptions("activities", pokemon)[0].label, "Play a practice match");
  assert.equal(getOptions("activities", cozy).find(option => option.value === "pokemon-rematch")?.label, "Pokémon TCG rematch");
  assert.equal(getRizzConfig({ rizzTheme: "pokemon", rizzThemeCustomizations: { pokemon: { title: "  " } } }).appearance.title, getRizzConfig({ rizzTheme: "pokemon" }).appearance.title);
  assert.equal(validateRizzAnswers(valid, pokemon), null);
});

test("theme customization rejects unknown properties, invalid colors and excessive lengths", () => {
  const clean = sanitizeThemeCustomizations({ pokemon: { title: "x".repeat(500), accent: "url(https://example.com)", optionLabels: { "activities:unknown": "Unknown", "activities:pokemon-rematch": "y".repeat(200) } } });
  assert.equal(clean.pokemon?.title?.length, 160);
  assert.equal(clean.pokemon?.accent, undefined);
  assert.equal(clean.pokemon?.optionLabels?.["activities:unknown"], undefined);
  assert.equal(clean.pokemon?.optionLabels?.["activities:pokemon-rematch"].length, 100);
  assert.equal(accentTextColor("#000000"), "#ffffff");
  assert.equal(accentTextColor("#ffffff"), "#101014");
});
test("indoor-only and outdoor-only plans filter both date and activity suggestions", () => {
  for (const setting of ["indoors", "outdoors"] as const) {
    const config = getRizzConfig({ rizzSetting: setting });
    for (const key of ["dateIdeas", "activities"] as const) {
      assert.ok(getOptions(key, config).length > 1);
      assert.ok(getOptions(key, config).every(option => !option.setting || option.setting === setting));
    }
  }
  assert.match(validateRizzAnswers(valid, getRizzConfig({ rizzSetting: "outdoors" }))!, /choices have changed/);
});
test("all questions accept custom-only answers when enabled", () => {
  const answers = structuredClone(valid);
  for (const key of answerKeys) { answers[key] = []; answers.customAnswers[key] = "My own idea"; }
  assert.equal(validateRizzAnswers(answers, getRizzConfig({})), null);
});
test("tap-only is enforced by validation and hides the other option", () => {
  const config = getRizzConfig({ rizzAllowCustomAnswers: { winOvers: false } });
  assert.ok(!getOptions("winOvers", config).some(option => option.value === "other"));
  assert.equal(validateRizzAnswers(valid, config), null);
  const answers = structuredClone(valid); answers.customAnswers.winOvers = "A sneaky custom value";
  assert.match(validateRizzAnswers(answers, config)!, /turned off/);
});
test("malformed, missing, oversized and invented answers are rejected", () => {
  assert.equal(parseRizzAnswers({ ...valid, dateIdeas: [{}] }), null);
  assert.equal(parseRizzAnswers({ ...valid, name: {} }), null);
  assert.equal(parseRizzAnswers({ ...valid, customAnswers: [] }), null);
  assert.equal(parseRizzAnswers(null), null);
  const config = getRizzConfig({});
  assert.ok(validateRizzAnswers({ ...valid, phone: "1111111111" }, config));
  assert.ok(validateRizzAnswers({ ...valid, dateIdeas: [] }, config));
  assert.ok(validateRizzAnswers({ ...valid, activities: ["invented-choice"] }, config));
  assert.ok(validateRizzAnswers({ ...valid, customAnswers: { ...valid.customAnswers, vibes: "x".repeat(301) } }, config));
  assert.ok(validateRizzAnswers({ ...valid, winOvers: ["other"] }, config));
});
test("legacy single selections and other answers remain compatible", () => {
  const parsed = parseRizzAnswers({ name: valid.name, phone: valid.phone, dateIdea: "coffee-and-talking", vibe: "chill-and-cozy", activity: "movie-night", winOver: "other", winOverOther: "  A handwritten note  " });
  assert.ok(parsed);
  assert.equal(parsed.customAnswers.winOvers, "A handwritten note");
  assert.equal(validateRizzAnswers(parsed, getRizzConfig({})), null);
});
test("sunshine uses custom notes, filters adventures and bounds note lengths", () => {
  const indoor = sunshineMessages("indoors", ["  You're lovely  ", "", "x".repeat(350)]);
  assert.equal(indoor[0], "You're lovely");
  assert.equal(indoor[1].length, 300);
  assert.ok(!indoor.some(note => note.includes("picnic") || note.includes("slow walk")));
  const outdoor = sunshineMessages("outdoors");
  assert.ok(outdoor.some(note => note.includes("picnic")));
  assert.ok(!outdoor.some(note => note.includes("movie") || note.includes("blanket")));
});
