import "./src/transliterator-element.js?v=0.10.17";
import { createAutomaticCandidateService } from "./src/automatic-candidate-service.js?v=0.10.12";
import {
  createFallbackPronunciationProvider,
  createHttpPronunciationProvider,
} from "./src/pronunciation-provider.js?v=0.10.2";
import { regressionPronunciationProvider } from "./src/regression-pronunciations.js?v=0.10.12";
import { createTransliterationGenerator } from "./src/transliteration-generator.js?v=0.10.12";
import { createHttpEntryProvider } from "./src/entry-provider.js?v=0.10.3";

const tool = document.querySelector("eng-transliterator");
const themeToggle = document.querySelector(".theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');
let suppressUrlUpdate = false;
const revealTool = () => tool.classList.remove("transliterator-pending");
const pronunciationEndpoint = document.querySelector('meta[name="eng-ge-pronunciation-endpoint"]')?.content.trim();
const pronunciationFallback = document.querySelector('meta[name="eng-ge-pronunciation-fallback"]')?.content.trim();
const entrySearchEndpoint = document.querySelector('meta[name="eng-ge-entry-search-endpoint"]')?.content.trim();
const pronunciationProviders = [];
if (pronunciationEndpoint) {
  pronunciationProviders.push(createHttpPronunciationProvider({ endpoint: pronunciationEndpoint }));
}
if (pronunciationFallback === "regression") {
  pronunciationProviders.push(regressionPronunciationProvider);
}
const pronunciationProvider = pronunciationProviders.length === 1
  ? pronunciationProviders[0]
  : createFallbackPronunciationProvider(pronunciationProviders);
const automaticCandidateService = createAutomaticCandidateService({
  pronunciationProvider,
});
const transliterationGenerator = createTransliterationGenerator({ candidateService: automaticCandidateService });
tool.setCandidateResolver((request) => transliterationGenerator.generate(request));
if (entrySearchEndpoint) tool.setEntryResolver(createHttpEntryProvider({ endpoint: entrySearchEndpoint }));

function applyTheme(theme, persist = true) {
  const dark = theme === "dark";
  if (themeToggle) document.body.classList.toggle("dark", dark);
  if (dark) tool.setAttribute("theme", "dark");
  else tool.removeAttribute("theme");
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(dark));
    themeToggle.textContent = dark ? "Light mode" : "Dark mode";
  }
  if (themeColor) themeColor.content = dark ? "#171813" : "#f7f7f2";
  if (persist) localStorage.setItem("eng-transliterator-theme", theme);
}

function updateQuery(query, replace = false) {
  if (suppressUrlUpdate) return;
  const url = new URL(window.location.href);
  const normalized = String(query ?? "").trim();
  if (normalized) url.searchParams.set("q", normalized);
  else url.searchParams.delete("q");
  url.hash = "";
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function updateMode(mode, term = "", replace = false) {
  if (suppressUrlUpdate) return;
  const url = new URL(window.location.href);
  if (mode === "generator") url.searchParams.set("mode", "generator");
  else url.searchParams.delete("mode");
  const normalizedTerm = String(term ?? "").trim();
  if (normalizedTerm) url.searchParams.set("q", normalizedTerm);
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
  });
} else {
  const syncHostTheme = () => applyTheme(document.body.classList.contains("dark-mode") ? "dark" : "light", false);
  syncHostTheme();
  new MutationObserver(syncHostTheme).observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

tool.addEventListener("entrysearch", (event) => updateQuery(event.detail.query));
tool.addEventListener("entryselect", (event) => updateQuery(event.detail.entry.headword));
tool.addEventListener("modechange", (event) => updateMode(event.detail.mode, event.detail.term));
tool.addEventListener("generatorrequest", (event) => updateMode("generator", event.detail.request.term, true));

window.addEventListener("popstate", () => {
  suppressUrlUpdate = true;
  const url = new URL(window.location.href);
  const query = url.searchParams.get("q") || "WordPress";
  const mode = url.searchParams.get("mode") === "generator" ? "generator" : "search";
  tool.setMode(mode, { term: query, emitEvent: false });
  if (mode === "search") tool.search(query);
  suppressUrlUpdate = false;
});

if (themeToggle) {
  const savedTheme = localStorage.getItem("eng-transliterator-theme");
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(savedTheme || preferredTheme, false);
}

const initialUrl = new URL(window.location.href);
const initialQuery = initialUrl.searchParams.get("q");
const initialMode = initialUrl.searchParams.get("mode") === "generator" ? "generator" : "search";
if (initialMode === "generator") {
  tool.setMode("generator", { term: initialQuery || "", emitEvent: false });
  revealTool();
} else if (initialQuery) {
  const restoreInitialQuery = async () => {
    suppressUrlUpdate = true;
    tool.setMode("search", { emitEvent: false, render: false });
    try {
      await tool.search(initialQuery);
    } finally {
      suppressUrlUpdate = false;
      revealTool();
    }
  };
  restoreInitialQuery();
  window.addEventListener("pageshow", () => {
    // Browsers may restore a form control after modules initialize. Reapply the
    // URL-backed query after that restoration pass so the input and result agree.
    window.requestAnimationFrame(() => window.requestAnimationFrame(restoreInitialQuery));
  }, { once: true });
} else {
  revealTool();
}
