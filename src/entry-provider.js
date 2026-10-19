export function createHttpEntryProvider({ endpoint, fetchImpl = globalThis.fetch } = {}) {
  if (!endpoint || typeof fetchImpl !== "function") throw new TypeError("An entry endpoint and fetch implementation are required.");
  return async (query) => {
    const url = new URL(endpoint, globalThis.location?.href ?? "http://localhost/");
    url.searchParams.set("q", String(query ?? "").trim());
    url.searchParams.set("limit", "6");
    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.entries) ? payload.entries : [];
  };
}
