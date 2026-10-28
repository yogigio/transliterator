import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// A browser keys its module map on the full URL, query string included. The same
// file imported as `x.js` in one place and `x.js?v=1` in another is therefore two
// downloads and two module instances. Every module the page loads must be reached
// through exactly one URL, and every URL must carry a version so a deploy can
// invalidate it.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMPORT = /(?:^|\n)\s*(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?["']([^"']+)["']/g;
const asPath = (file) => relative(root, file).split(sep).join("/");

// The page's entry point, and the modules a host page imports on its own (the
// eng.ge editor loads the composite engine directly rather than through app.js).
const ENTRIES = ["app.js", "src/composite-name-inflector.js"];

function loadGraph(...entries) {
  const urls = new Map(); // module path -> Map(resolved url -> importers)
  const unversioned = [];
  const visited = new Set();
  const visit = (file) => {
    const from = asPath(file);
    if (visited.has(from)) return;
    visited.add(from);
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      const [pathname, query = ""] = specifier.split("?");
      const target = resolve(dirname(file), pathname);
      const module = asPath(target);
      const url = query ? `${module}?${query}` : module;
      if (!query) unversioned.push(`${from} imports ${specifier}`);
      if (!urls.has(module)) urls.set(module, new Map());
      const importers = urls.get(module);
      importers.set(url, [...(importers.get(url) || []), from]);
      visit(target);
    }
  };
  entries.forEach((entry) => visit(resolve(root, entry)));
  return { urls, unversioned, modules: visited.size };
}

test("every module the page loads is reached through a single URL", () => {
  const { urls } = loadGraph(...ENTRIES);
  const split = [...urls]
    .filter(([, importers]) => importers.size > 1)
    .map(([module, importers]) => `${module}: ${[...importers].map(([url, from]) => `${url} (from ${from.join(", ")})`).join(" vs ")}`);
  assert.deepEqual(split, []);
});

test("every relative import carries a version query", () => {
  assert.deepEqual(loadGraph(...ENTRIES).unversioned, []);
});

test("the import graph was actually walked", () => {
  assert.ok(loadGraph("app.js").modules >= 15);
  assert.ok(loadGraph("src/composite-name-inflector.js").modules >= 2);
});
