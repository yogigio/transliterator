import "./src/transliterator-element.js?v=0.10.1";
import { createAutomaticCandidateService } from "./src/automatic-candidate-service.js?v=0.10.1";
import {
  createFallbackPronunciationProvider,
  createHttpPronunciationProvider,
} from "./src/pronunciation-provider.js?v=0.10.1";
import { regressionPronunciationProvider } from "./src/regression-pronunciations.js?v=0.10.1";
import { createTransliterationGenerator } from "./src/transliteration-generator.js?v=0.10.1";

const tool = document.querySelector("eng-transliterator");
const themeToggle = document.querySelector(".theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');
let suppressUrlUpdate = false;
const pronunciationEndpoint = document.querySelector('meta[name="eng-ge-pronunciation-endpoint"]')?.content.trim();
const pronunciationFallback = document.querySelector('meta[name="eng-ge-pronunciation-fallback"]')?.content.trim();
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

function applyTheme(theme, persist = true) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  if (dark) tool.setAttribute("theme", "dark");
  else tool.removeAttribute("theme");
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.textContent = dark ? "Light mode" : "Dark mode";
  themeColor.content = dark ? "#171813" : "#f7f7f2";
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

themeToggle.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

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

const savedTheme = localStorage.getItem("eng-transliterator-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(savedTheme || preferredTheme, false);

const initialUrl = new URL(window.location.href);
const initialQuery = initialUrl.searchParams.get("q");
const initialMode = initialUrl.searchParams.get("mode") === "generator" ? "generator" : "search";
if (initialMode === "generator") {
  tool.setMode("generator", { term: initialQuery || "", emitEvent: false });
} else if (initialQuery) {
  const restoreInitialQuery = () => {
    suppressUrlUpdate = true;
    tool.setMode("search", { emitEvent: false, render: false });
    tool.search(initialQuery);
    suppressUrlUpdate = false;
  };
  restoreInitialQuery();
  window.addEventListener("pageshow", () => {
    // Browsers may restore a form control after modules initialize. Reapply the
    // URL-backed query after that restoration pass so the input and result agree.
    window.requestAnimationFrame(() => window.requestAnimationFrame(restoreInitialQuery));
  }, { once: true });
}
