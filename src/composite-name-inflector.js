import { GEORGIAN_INFLECTION_CASES, inflectGeorgianStem } from "./georgian-inflector.js?v=0.8.3";

/**
 * Which components of a multi-word name take case endings when the WHOLE name
 * is inflected ("Steve Jobs" in the ergative).
 *
 * This is a linguistic decision, not an engineering one, and it has not been
 * confirmed by the project owner. So it is a parameter rather than a constant:
 *
 *   last     only the final component ("სტივ ჯობსმა")
 *   flagged  the components whose `inflects` flag is set
 *   all      every component ("სტივმა ჯობსმა")
 *
 * `last` is the default because it is what the bundled entries and the
 * single-stem whole-name generator already produce. Changing the default is a
 * one-line edit here; nothing else assumes it.
 */
export const COMPOSITE_INFLECTION_POLICIES = Object.freeze({
  LAST: "last",
  FLAGGED: "flagged",
  ALL: "all",
});

export const DEFAULT_COMPOSITE_INFLECTION_POLICY = COMPOSITE_INFLECTION_POLICIES.LAST;

const POLICY_VALUES = new Set(Object.values(COMPOSITE_INFLECTION_POLICIES));

export class CompositeInflectionError extends TypeError {
  constructor(code, message, component = null) {
    super(message);
    this.name = "CompositeInflectionError";
    this.code = code;
    this.component = component;
  }
}

/**
 * For input that arrives from outside (a saved setting, a form field): an
 * unknown value becomes the default instead of an error, so a stale page does
 * not break the editor. {@link inflectCompositeName} itself stays strict.
 */
export function normalizeCompositePolicy(policy) {
  return POLICY_VALUES.has(policy) ? policy : DEFAULT_COMPOSITE_INFLECTION_POLICY;
}

/** Whether the component at `index` of `count` takes endings under `policy`. */
export function componentTakesEndings(policy, component, index, count) {
  if (policy === COMPOSITE_INFLECTION_POLICIES.ALL) return true;
  if (policy === COMPOSITE_INFLECTION_POLICIES.LAST) return index === count - 1;
  return Boolean(component?.inflects);
}

function label(component, index) {
  return component?.key ? String(component.key) : `#${index + 1}`;
}

function validateInvariableStem(stem, component, index) {
  if (typeof stem !== "string" || stem.length === 0 || stem !== stem.trim() || /[\r\n\t]/u.test(stem)) {
    throw new CompositeInflectionError(
      "INVALID_COMPONENT_STEM",
      `Component ${label(component, index)} needs a trimmed, single-line stem.`,
      component?.key ?? null,
    );
  }
}

/**
 * Inflect a multi-component Georgian name as one expression.
 *
 * Each component is `{ key?, stem, declensionClass?, inflects? }`. A component
 * that takes endings under the policy needs a `declensionClass`; one that does
 * not is written as its stem in every case. Components are joined by a single
 * space, never a hyphen.
 *
 * The result has the same `cases[caseName].forms/display` shape as
 * {@link inflectGeorgianStem}, so a caller can treat both alike, plus `parts`
 * (the form each component contributed) for explaining a composed form.
 */
export function inflectCompositeName({ components, policy = DEFAULT_COMPOSITE_INFLECTION_POLICY } = {}) {
  if (!POLICY_VALUES.has(policy)) {
    throw new CompositeInflectionError("INVALID_POLICY", `Unknown composite inflection policy: ${String(policy)}.`);
  }
  if (!Array.isArray(components) || components.length === 0) {
    throw new CompositeInflectionError("NO_COMPONENTS", "A composite name needs at least one component.");
  }

  const count = components.length;
  const plan = components.map((component, index) => ({
    component,
    index,
    takesEndings: componentTakesEndings(policy, component, index, count),
  }));
  if (!plan.some((item) => item.takesEndings)) {
    throw new CompositeInflectionError(
      "NO_INFLECTING_COMPONENT",
      "No component takes case endings under this rule; mark at least one component as inflecting.",
    );
  }

  const inflected = new Map();
  for (const { component, index, takesEndings } of plan) {
    if (!takesEndings) {
      validateInvariableStem(component?.stem, component, index);
      continue;
    }
    try {
      inflected.set(index, inflectGeorgianStem({ stem: component?.stem, declensionClass: component?.declensionClass }));
    } catch (error) {
      throw new CompositeInflectionError(
        `COMPONENT_${error.code ?? "INVALID"}`,
        `Component ${label(component, index)}: ${error.message}`,
        component?.key ?? null,
      );
    }
  }

  const cases = Object.fromEntries(
    GEORGIAN_INFLECTION_CASES.map((caseName) => {
      const parts = plan.map(({ component, index }) => (
        inflected.has(index) ? inflected.get(index).cases[caseName].display : component.stem
      ));
      const display = parts.join(" ");
      return [caseName, Object.freeze({
        forms: Object.freeze([display]),
        display,
        parts: Object.freeze(parts),
        ruleId: `georgian.composite.${policy}.${caseName}`,
      })];
    }),
  );

  return Object.freeze({
    policy,
    components: Object.freeze(plan.map(({ component, index, takesEndings }) => Object.freeze({
      key: component?.key ?? null,
      stem: component.stem,
      takesEndings,
    }))),
    cases: Object.freeze(cases),
  });
}
