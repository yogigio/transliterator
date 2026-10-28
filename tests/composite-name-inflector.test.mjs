import test from "node:test";
import assert from "node:assert/strict";
import { inflectGeorgianStem, GEORGIAN_INFLECTION_CASES } from "../src/georgian-inflector.js";
import {
  COMPOSITE_INFLECTION_POLICIES,
  CompositeInflectionError,
  DEFAULT_COMPOSITE_INFLECTION_POLICY,
  componentTakesEndings,
  inflectCompositeName,
  normalizeCompositePolicy,
} from "../src/composite-name-inflector.js";

const steveJobs = [
  { key: "given", stem: "სტივ", declensionClass: "consonant", inflects: false },
  { key: "surname", stem: "ჯობს", declensionClass: "consonant", inflects: true },
];
const display = (result) => Object.fromEntries(GEORGIAN_INFLECTION_CASES.map((name) => [name, result.cases[name].display]));

test("the default rule is that only the last component takes endings", () => {
  assert.equal(DEFAULT_COMPOSITE_INFLECTION_POLICY, COMPOSITE_INFLECTION_POLICIES.LAST);
  const result = inflectCompositeName({ components: steveJobs });
  assert.equal(result.policy, "last");
  assert.deepEqual(result.components.map((item) => item.takesEndings), [false, true]);
  assert.equal(result.cases.nominative.display, "სტივ ჯობსი");
  assert.equal(result.cases.ergative.display, "სტივ ჯობსმა");
  assert.deepEqual(result.cases.ergative.parts, ["სტივ", "ჯობსმა"]);
});

test("the default reproduces the single-stem whole-name paradigm already in use", () => {
  // Existing entries store "სტივ ჯობს" as one stem. Composing from components
  // under the default rule must not change a single form of them.
  const single = inflectGeorgianStem({ stem: "სტივ ჯობს", declensionClass: "consonant" });
  const composed = inflectCompositeName({ components: steveJobs });
  for (const name of GEORGIAN_INFLECTION_CASES) {
    assert.equal(composed.cases[name].display, single.cases[name].display, name);
  }
});

test("'all' puts every component through its own paradigm", () => {
  const result = inflectCompositeName({ components: steveJobs, policy: "all" });
  assert.equal(result.cases.nominative.display, "სტივი ჯობსი");
  assert.equal(result.cases.ergative.display, "სტივმა ჯობსმა");
  assert.deepEqual(result.components.map((item) => item.takesEndings), [true, true]);
});

test("'flagged' follows each component's own flag", () => {
  const onlySurname = inflectCompositeName({ components: steveJobs, policy: "flagged" });
  assert.equal(onlySurname.cases.ergative.display, "სტივ ჯობსმა");

  const both = steveJobs.map((component) => ({ ...component, inflects: true }));
  assert.equal(inflectCompositeName({ components: both, policy: "flagged" }).cases.ergative.display, "სტივმა ჯობსმა");

  const onlyGiven = [{ ...steveJobs[0], inflects: true }, { ...steveJobs[1], inflects: false }];
  assert.equal(inflectCompositeName({ components: onlyGiven, policy: "flagged" }).cases.ergative.display, "სტივმა ჯობს");
});

test("each inflecting component uses its own declension class", () => {
  const components = [
    { key: "given", stem: "ნინო", declensionClass: "vowel_o_u" },
    { key: "surname", stem: "გიორგი", declensionClass: "vowel_i" },
  ];
  const result = inflectCompositeName({ components, policy: "all" });
  assert.equal(result.cases.ergative.display, "ნინომ გიორგიმ");
  assert.equal(result.cases.instrumental.display, "ნინოთი გიორგით");
});

test("a component that does not inflect needs no declension class", () => {
  const result = inflectCompositeName({
    components: [{ key: "given", stem: "სტივ" }, { key: "surname", stem: "ჯობს", declensionClass: "consonant" }],
  });
  assert.equal(result.cases.genitive.display, "სტივ ჯობსის");
});

test("components are joined by a single space and never a hyphen", () => {
  const result = inflectCompositeName({ components: steveJobs, policy: "all" });
  for (const name of GEORGIAN_INFLECTION_CASES) assert.doesNotMatch(result.cases[name].display, /-/u);
  assert.equal(result.cases.vocative.display.split(" ").length, 2);
});

test("a single-component name behaves like the plain engine", () => {
  const result = inflectCompositeName({ components: [{ key: "whole", stem: "მაიკროსოფტ", declensionClass: "consonant" }] });
  assert.deepEqual(display(result), display(inflectGeorgianStem({ stem: "მაიკროსოფტ", declensionClass: "consonant" })));
});

test("results use the engine's forms/display shape and are immutable", () => {
  const result = inflectCompositeName({ components: steveJobs });
  assert.deepEqual(result.cases.nominative.forms, ["სტივ ჯობსი"]);
  assert.equal(result.cases.ergative.ruleId, "georgian.composite.last.ergative");
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.cases) && Object.isFrozen(result.cases.nominative));
});

test("an unknown rule is refused rather than guessed", () => {
  assert.throws(() => inflectCompositeName({ components: steveJobs, policy: "lats" }),
    (error) => error instanceof CompositeInflectionError && error.code === "INVALID_POLICY");
});

test("untrusted input is normalised to the default rule", () => {
  assert.equal(normalizeCompositePolicy("all"), "all");
  assert.equal(normalizeCompositePolicy("lats"), DEFAULT_COMPOSITE_INFLECTION_POLICY);
  assert.equal(normalizeCompositePolicy(undefined), DEFAULT_COMPOSITE_INFLECTION_POLICY);
  assert.equal(normalizeCompositePolicy(null), DEFAULT_COMPOSITE_INFLECTION_POLICY);
});

test("input that cannot produce a name is refused with a stable code", () => {
  const code = (input) => {
    try { inflectCompositeName(input); } catch (error) { return error.code; }
    return null;
  };
  assert.equal(code({}), "NO_COMPONENTS");
  assert.equal(code({ components: [] }), "NO_COMPONENTS");
  assert.equal(code({ components: [{ stem: "სტივ" }, { stem: "ჯობს" }], policy: "flagged" }), "NO_INFLECTING_COMPONENT");
  assert.equal(code({ components: [{ key: "given", stem: " სტივ " }, { key: "surname", stem: "ჯობს", declensionClass: "consonant" }] }), "INVALID_COMPONENT_STEM");
  assert.equal(code({ components: [{ key: "surname", stem: "ჯობს" }] }), "COMPONENT_INVALID_DECLENSION_CLASS");
  assert.equal(code({ components: [{ key: "surname", stem: "Jobs", declensionClass: "consonant" }] }), "COMPONENT_NON_GEORGIAN_STEM");
});

test("an error names the component that caused it", () => {
  try {
    inflectCompositeName({ components: [{ key: "given", stem: "სტივ" }, { key: "surname", stem: "ჯობს" }] });
    assert.fail("expected an error");
  } catch (error) {
    assert.equal(error.component, "surname");
    assert.match(error.message, /surname/);
  }
});

test("componentTakesEndings mirrors the rule used by the engine", () => {
  const parts = [{ inflects: true }, { inflects: false }, { inflects: false }];
  assert.deepEqual(parts.map((part, index) => componentTakesEndings("last", part, index, parts.length)), [false, false, true]);
  assert.deepEqual(parts.map((part, index) => componentTakesEndings("flagged", part, index, parts.length)), [true, false, false]);
  assert.deepEqual(parts.map((part, index) => componentTakesEndings("all", part, index, parts.length)), [true, true, true]);
});
