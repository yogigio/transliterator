import "./src/transliterator-element.js?v=0.4.5";

const tool = document.querySelector("eng-transliterator");
const themeToggle = document.querySelector(".theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');
let suppressUrlUpdate = false;

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

themeToggle.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

tool.addEventListener("entrysearch", (event) => updateQuery(event.detail.query));
tool.addEventListener("entryselect", (event) => updateQuery(event.detail.entry.headword));

window.addEventListener("popstate", () => {
  suppressUrlUpdate = true;
  const query = new URL(window.location.href).searchParams.get("q") || "WordPress";
  tool.search(query);
  suppressUrlUpdate = false;
});

const savedTheme = localStorage.getItem("eng-transliterator-theme");
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(savedTheme || preferredTheme, false);

const initialQuery = new URL(window.location.href).searchParams.get("q");
if (initialQuery) {
  suppressUrlUpdate = true;
  tool.search(initialQuery);
  suppressUrlUpdate = false;
}
