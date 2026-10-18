import { CASES, featuredEntries, sampleEntries, searchEntries } from "./sample-provider.js?v=0.4.5";
import { styles } from "./transliterator-styles.js?v=0.4.5";

const icon = (name) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    table: '<path d="M4 5h16v14H4zM4 10h16M10 5v14"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  };
  return `<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name]}</svg></span>`;
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const template = document.createElement("template");
template.innerHTML = `
  <style>${styles}</style>
  <section class="tool">
    <div class="hero">
      <div class="eyebrow">International names and terms → Georgian</div>
      <h1>Write international names and terms in Georgian</h1>
      <p>Find Georgian spellings with pronunciation, source-language context, morphology, and inflection.</p>
      <form class="search">
        <label class="search-field">
          ${icon("search")}
          <span class="sr-only">Search for a name, place, brand, or term</span>
          <input value="WordPress" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="term-suggestions" aria-expanded="false" aria-label="Search for a name, place, brand, or term" />
        </label>
        <button type="submit">Search</button>
        <div class="suggestions" id="term-suggestions" role="listbox" aria-label="Matching terms" hidden></div>
      </form>
      <div class="examples"><span>Try:</span></div>
    </div>
    <div class="content">
      <div class="result-slot" aria-live="polite"></div>
    </div>
  </section>
  <dialog>
    <div class="dialog-head">
      <div><h3>Suggest a correction</h3><p class="dialog-context"></p></div>
      <button class="close" type="button" aria-label="Close">×</button>
    </div>
    <form class="dialog-body" method="dialog">
      <label class="field term-field" hidden><span>Original term or name</span><input name="term" autocomplete="off" /><small>Use the spelling from its source language.</small></label>
      <label class="field category-field" hidden><span>Type</span><select name="category"><option value="unknown">Not sure</option><option value="personal_name">Person</option><option value="place_name">Place</option><option value="organization">Organization</option><option value="software_project">Software or project</option><option value="brand_product">Brand or product</option><option value="abbreviation">Abbreviation</option><option value="other_term">Other term</option></select></label>
      <label class="field"><span class="spelling-label">Georgian spelling</span><input name="spelling" lang="ka" spellcheck="false" autocomplete="off" /><small class="spelling-help"></small></label>
      <details class="linguistic-details">
        <summary>Add stem (optional)</summary>
        <label class="field"><span>Georgian stem</span><input name="stem" lang="ka" spellcheck="false" autocomplete="off" /><small class="stem-help">Enter the form without an inflectional ending. Editors will verify it.</small></label>
      </details>
      <label class="field"><span class="reason-label">Evidence or context</span><textarea name="reason"></textarea><small class="reason-help"></small></label>
      <div class="dialog-actions"><span>Reviewed before publication</span><button class="cancel" value="cancel">Cancel</button><button class="submit" value="submit">Submit for review</button></div>
    </form>
  </dialog>
`;

export class EngTransliterator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.currentEntry = sampleEntries[0];
    this.dialect = Object.keys(this.currentEntry.pronunciations)[0];
    this.activeTab = "overview";
    this.inflectionScope = "whole";
    this.dialogMode = "correction";
    this.pendingQuery = "";
    this.suggestionIndex = -1;
  }

  connectedCallback() {
    const form = this.shadowRoot.querySelector(".search");
    const input = form.querySelector("input");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.hideSuggestions();
      this.search(input.value);
    });
    input.addEventListener("input", () => this.updateSuggestions(input.value));
    input.addEventListener("focus", () => this.updateSuggestions(input.value));
    input.addEventListener("keydown", (event) => this.handleSuggestionKeydown(event));
    form.addEventListener("focusout", () => window.setTimeout(() => {
      if (!form.contains(this.shadowRoot.activeElement)) this.hideSuggestions();
    }, 0));

    const examples = this.shadowRoot.querySelector(".examples");
    featuredEntries.forEach((entry) => {
      const button = document.createElement("button");
      button.className = "example";
      button.type = "button";
      button.textContent = entry.headword;
      button.addEventListener("click", () => this.selectEntry(entry));
      examples.append(button);
    });

    const dialog = this.shadowRoot.querySelector("dialog");
    this.shadowRoot.querySelector(".close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => this.handleDialogClose(dialog));
    this.render();
  }

  search(query) {
    const normalizedQuery = String(query ?? "").trim();
    this.shadowRoot.querySelector(".search input").value = normalizedQuery;
    const [entry] = searchEntries(normalizedQuery);
    if (entry) this.selectEntry(entry, false);
    else this.renderEmpty(normalizedQuery);
    this.dispatchEvent(new CustomEvent("entrysearch", { bubbles: true, composed: true, detail: { query: normalizedQuery } }));
  }

  updateSuggestions(query) {
    const input = this.shadowRoot.querySelector(".search input");
    const list = this.shadowRoot.querySelector(".suggestions");
    const value = String(query ?? "").trim();
    const matches = value ? searchEntries(value).slice(0, 6) : [];
    list.replaceChildren();
    this.suggestionIndex = -1;

    matches.forEach((entry, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `term-suggestion-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.innerHTML = `<strong>${escapeHtml(entry.headword)}</strong><span>${escapeHtml(entry.entityType)} · ${escapeHtml(this.sourceDisplay(entry))}</span>`;
      option.addEventListener("mousedown", (event) => event.preventDefault());
      option.addEventListener("click", () => {
        this.selectEntry(entry);
        this.hideSuggestions();
        input.focus();
      });
      list.append(option);
    });

    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", String(matches.length > 0));
    input.removeAttribute("aria-activedescendant");
  }

  handleSuggestionKeydown(event) {
    const list = this.shadowRoot.querySelector(".suggestions");
    const options = [...list.querySelectorAll('[role="option"]')];
    if (!options.length || list.hidden) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      this.suggestionIndex = (this.suggestionIndex + offset + options.length) % options.length;
      options.forEach((option, index) => option.setAttribute("aria-selected", String(index === this.suggestionIndex)));
      this.shadowRoot.querySelector(".search input").setAttribute("aria-activedescendant", options[this.suggestionIndex].id);
    } else if (event.key === "Enter" && this.suggestionIndex >= 0) {
      event.preventDefault();
      options[this.suggestionIndex].click();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.hideSuggestions();
    }
  }

  hideSuggestions() {
    const input = this.shadowRoot.querySelector(".search input");
    const list = this.shadowRoot.querySelector(".suggestions");
    list.hidden = true;
    list.replaceChildren();
    this.suggestionIndex = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  sourceDisplay(entry) {
    return `${entry.sourceLanguage}${entry.sourceRegion ? ` (${entry.sourceRegion})` : ""}`;
  }

  selectEntry(entry, emitEvent = true) {
    this.currentEntry = entry;
    this.dialect = Object.keys(entry.pronunciations)[0];
    this.activeTab = "overview";
    this.inflectionScope = "whole";
    this.shadowRoot.querySelector(".search input").value = entry.headword;
    this.hideSuggestions();
    this.render();
    if (emitEvent) this.dispatchEvent(new CustomEvent("entryselect", { bubbles: true, composed: true, detail: { entry } }));
  }

  render(message = "") {
    const entry = this.currentEntry;
    const pronunciation = entry.pronunciations[this.dialect] ?? Object.values(entry.pronunciations)[0];
    const slot = this.shadowRoot.querySelector(".result-slot");
    slot.innerHTML = `
      <article class="result">
        <div class="result-head">
          <div>
            ${entry.status === "automatic" ? '<span class="status">Automatic suggestion</span>' : ""}
            <h2>${entry.headword}</h2>
            <div class="category">${entry.lexicalClass} · ${entry.entityType}</div>
            <div class="source-context">Source: ${this.sourceDisplay(entry)}</div>
            ${entry.fullForm ? `<div class="expanded-form"><span>Full form:</span> ${escapeHtml(entry.fullForm)}</div>` : ""}
          </div>
          <button class="copy" type="button" aria-label="Copy Georgian spelling">${icon("copy")}<span class="copy-label">Copy Georgian</span></button>
        </div>
        <div class="pronunciation">
          <div class="segments" aria-label="Pronunciation variety">
            ${Object.entries(entry.pronunciations).map(([key, item]) => `<button type="button" data-dialect="${key}" aria-pressed="${this.dialect === key}">${item.label}</button>`).join("")}
          </div>
          <span class="ipa">${pronunciation.ipa}</span>
          <span class="source">${pronunciation.source}</span>
        </div>
        <div class="tabs" role="tablist" aria-label="Entry sections">
          ${[["overview", "Overview"], ["inflection", "Inflection"], ["details", "Entry details"]].map(([key, label]) => `<button class="tab" type="button" role="tab" data-tab="${key}" aria-selected="${this.activeTab === key}">${label}</button>`).join("")}
        </div>
        <section class="panel" data-panel="overview" ${this.activeTab === "overview" ? "" : "hidden"}>${this.overview(entry, message)}</section>
        <section class="panel" data-panel="inflection" ${this.activeTab === "inflection" ? "" : "hidden"}>${this.inflection(entry)}</section>
        <section class="panel" data-panel="details" ${this.activeTab === "details" ? "" : "hidden"}>${this.details(entry)}</section>
      </article>`;
    this.bindResultEvents();
  }

  overview(entry, message) {
    const georgian = entry.georgian;
    const stemDisplay = georgian.ending && georgian.spelling.endsWith(georgian.ending)
      ? georgian.spelling.slice(0, -georgian.ending.length)
      : georgian.spelling;
    return `
      <div class="overview-grid">
        <div>
          <div class="label">Georgian spelling</div>
          <div class="georgian" aria-label="${georgian.spelling}"><span>${stemDisplay}</span>${georgian.ending ? `<span class="ending">${georgian.ending}</span>` : ""}</div>
          <p class="morph-note">${georgian.explanation}</p>
        </div>
        <div class="facts">
          <div class="fact"><span>Stem</span><strong>${georgian.stem}-</strong></div>
          <div class="fact"><span>Ending type</span><strong>${georgian.endingClass}</strong></div>
          <div class="fact"><span>Final ი</span><strong>${georgian.finalIRole}</strong></div>
        </div>
      </div>
      ${entry.rejectedForms?.length ? this.rejectedForms(entry.rejectedForms) : ""}
      <div class="actions">
        <button class="action action-primary" type="button" data-open-tab="inflection">${icon("table")} Show inflections</button>
        <button class="action" type="button" data-correct>${icon("edit")} ${entry.status === "automatic" ? "Propose another spelling" : "Suggest a correction"}</button>
      </div>
      ${entry.confidence ? `<div class="confidence" role="note" tabindex="0" aria-label="${escapeHtml(entry.confidence.band)} confidence. ${escapeHtml(entry.confidence.explanation)}"><strong>${escapeHtml(entry.confidence.band)} confidence</strong><span class="confidence-info" aria-hidden="true">i</span><span class="confidence-tooltip" aria-hidden="true">${escapeHtml(entry.confidence.explanation)}</span></div>` : ""}
      ${message ? `<div class="notice" role="status"><strong>${message}</strong></div>` : ""}`;
  }

  rejectedForms(forms) {
    return `<section class="rejected-forms" aria-labelledby="rejected-forms-title">
      <div><div class="label" id="rejected-forms-title">Forms to avoid</div><p>These recorded spellings are incorrect for this entry.</p></div>
      <ul>${forms.map((form) => `<li><s>${form}</s></li>`).join("")}</ul>
    </section>`;
  }

  inflection(entry) {
    const hasComponents = entry.inflection.scopes.includes("components");
    const showComponents = hasComponents && this.inflectionScope === "components";
    const showLatin = entry.inflection.latinScript !== "not_applicable";
    return `
      ${hasComponents ? `<div class="scope-controls" aria-label="Inflection scope"><button class="scope-button" data-scope="whole" aria-pressed="${!showComponents}">Together</button><button class="scope-button" data-scope="components" aria-pressed="${showComponents}">By component</button></div>` : ""}
      ${showComponents ? this.componentView(entry) : this.paradigmTable(entry.inflection.whole, showLatin)}
      <p class="footnote">Case forms appear only after their inflection rules and examples have been reviewed.</p>`;
  }

  paradigmTable(paradigm, showLatin) {
    const rows = CASES.map(([key, label]) => `<tr><td>${label}</td><td class="${paradigm[key] ? "" : "pending"}">${paradigm[key] ?? "Awaiting confirmed rule"}</td>${showLatin ? '<td class="pending">Awaiting confirmed rule</td>' : ""}</tr>`).join("");
    return `<div class="table-wrap"><table><thead><tr><th>Case</th><th>Georgian script</th>${showLatin ? "<th>Latin-script term</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  componentView(entry) {
    return `<div class="component-list">${entry.components.map((component) => `<div class="component"><span><strong>${component.georgian}</strong><br><small>${component.source}</small></span><span>${component.role}</span><small>Paradigm awaiting confirmed rule</small></div>`).join("")}</div>`;
  }

  details(entry) {
    const statusLabel = entry.status === "approved" ? "Approved entry (unmarked default)" : "Automatic suggestion";
    return `<dl class="details">
      <dt>Editorial status</dt><dd>${statusLabel}</dd>
      <dt>Classification</dt><dd>${entry.lexicalClass} · ${entry.entityType}</dd>
      ${entry.fullForm ? `<dt>Full form</dt><dd>${escapeHtml(entry.fullForm)}</dd>` : ""}
      ${entry.abbreviationType ? `<dt>Abbreviation type</dt><dd>${escapeHtml(entry.abbreviationType)}</dd>` : ""}
      <dt>Source language</dt><dd>${this.sourceDisplay(entry)}${entry.sourceVariety ? ` · ${entry.sourceVariety}` : ""}</dd>
      <dt>Transcription basis</dt><dd>${entry.transcriptionBasis}</dd>
      <dt>Method</dt><dd>${entry.details.method}</dd>
      <dt>Pronunciations</dt><dd>${Object.values(entry.pronunciations).map((item) => item.label).join(", ")}</dd>
      <dt>Rule or data version</dt><dd>${entry.details.version}</dd>
      <dt>Last reviewed</dt><dd>${entry.details.reviewed}</dd>
      <dt>Entry identifier</dt><dd><code>${entry.id}</code></dd>
      ${entry.details.dictionaryUrl ? `<dt>Related resource</dt><dd><a href="${entry.details.dictionaryUrl}" target="_blank" rel="noopener noreferrer">Open eng.ge Dictionary <span class="sr-only">(opens in a new tab)</span></a></dd>` : ""}
    </dl>`;
  }

  bindResultEvents() {
    this.shadowRoot.querySelectorAll("[data-dialect]").forEach((button) => button.addEventListener("click", () => {
      this.dialect = button.dataset.dialect;
      this.render();
    }));
    this.shadowRoot.querySelectorAll("[data-tab], [data-open-tab]").forEach((button) => button.addEventListener("click", () => {
      this.activeTab = button.dataset.tab || button.dataset.openTab;
      this.render();
    }));
    this.shadowRoot.querySelectorAll("[data-scope]").forEach((button) => button.addEventListener("click", () => {
      this.inflectionScope = button.dataset.scope;
      this.render();
    }));
    this.shadowRoot.querySelector(".copy").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const label = button.querySelector(".copy-label");
      const originalLabel = label.textContent;
      const copied = await this.copyText(this.currentEntry.georgian.spelling);
      label.textContent = copied ? "Copied" : "Copy unavailable";
      window.setTimeout(() => { label.textContent = originalLabel; }, 1400);
    });
    this.shadowRoot.querySelector("[data-correct]").addEventListener("click", () => this.openCorrectionDialog());
  }

  async copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Use the selection-based fallback below when clipboard permission is unavailable.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed;inset:-9999px auto auto -9999px;opacity:0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }

  openCorrectionDialog() {
    this.dialogMode = "correction";
    const dialog = this.shadowRoot.querySelector("dialog");
    const form = dialog.querySelector("form");
    form.reset();
    const isAlternative = this.currentEntry.status === "automatic";
    dialog.querySelector("h3").textContent = isAlternative ? "Propose another spelling" : "Suggest a correction";
    dialog.querySelector(".dialog-context").textContent = `${this.currentEntry.headword} → ${this.currentEntry.georgian.spelling}`;
    dialog.querySelector(".term-field").hidden = true;
    dialog.querySelector(".category-field").hidden = true;
    dialog.querySelector('[name="term"]').required = false;
    dialog.querySelector(".spelling-label").textContent = isAlternative ? "Proposed Georgian spelling" : "Corrected Georgian spelling";
    dialog.querySelector(".spelling-help").textContent = "Edit the current form to show exactly what you propose.";
    dialog.querySelector(".reason-label").textContent = "Why should this change?";
    dialog.querySelector(".reason-help").textContent = "Add a pronunciation source, usage example, or a short explanation.";
    dialog.querySelector('[name="spelling"]').required = true;
    dialog.querySelector('[name="reason"]').required = true;
    dialog.querySelector('[name="spelling"]').value = this.currentEntry.georgian.spelling;
    dialog.querySelector('[name="stem"]').value = "";
    dialog.querySelector(".stem-help").textContent = `Current stem: ${this.currentEntry.georgian.stem}-. Enter a replacement only if it also needs correction.`;
    dialog.querySelector(".linguistic-details").open = false;
    dialog.querySelector(".submit").textContent = "Submit correction";
    dialog.showModal();
  }

  openNewEntryDialog(query) {
    this.dialogMode = "new-entry";
    this.pendingQuery = String(query ?? "").trim();
    const dialog = this.shadowRoot.querySelector("dialog");
    const form = dialog.querySelector("form");
    form.reset();
    dialog.querySelector("h3").textContent = "Submit term for review";
    dialog.querySelector(".dialog-context").textContent = "Request a Georgian entry for a name or term that is not listed.";
    dialog.querySelector(".term-field").hidden = false;
    dialog.querySelector(".category-field").hidden = false;
    dialog.querySelector(".spelling-label").textContent = "Proposed Georgian spelling (optional)";
    dialog.querySelector(".spelling-help").textContent = "Leave blank if you want the editors to determine it.";
    dialog.querySelector(".reason-label").textContent = "Evidence or context (optional)";
    dialog.querySelector(".reason-help").textContent = "A pronunciation link, source language, or usage example is helpful.";
    dialog.querySelector('[name="term"]').value = this.pendingQuery;
    dialog.querySelector('[name="term"]').required = true;
    dialog.querySelector('[name="spelling"]').value = "";
    dialog.querySelector('[name="stem"]').value = "";
    dialog.querySelector(".stem-help").textContent = "Enter the form without an inflectional ending. Editors will verify it.";
    dialog.querySelector(".linguistic-details").open = false;
    dialog.querySelector('[name="spelling"]').required = false;
    dialog.querySelector('[name="reason"]').required = false;
    dialog.querySelector(".submit").textContent = "Submit term";
    dialog.showModal();
  }

  handleDialogClose(dialog) {
    if (dialog.returnValue !== "submit") return;
    const data = new FormData(dialog.querySelector("form"));
    const isNewEntry = this.dialogMode === "new-entry";
    const detail = isNewEntry
      ? {
          type: "new-entry",
          entryId: null,
          englishTerm: String(data.get("term") ?? "").trim(),
          category: data.get("category"),
          spelling: String(data.get("spelling") ?? "").trim(),
          stem: String(data.get("stem") ?? "").trim(),
          note: String(data.get("reason") ?? "").trim(),
        }
      : {
          type: "correction",
          entryId: this.currentEntry.id,
          englishTerm: this.currentEntry.headword,
          spelling: String(data.get("spelling") ?? "").trim(),
          stem: String(data.get("stem") ?? "").trim(),
          note: String(data.get("reason") ?? "").trim(),
        };
    this.dispatchEvent(new CustomEvent("submissionrequest", {
      bubbles: true,
      composed: true,
      detail,
    }));
    if (isNewEntry) this.renderEmpty(detail.englishTerm, "Thank you — this term is ready for editorial review.");
    else this.render("Thank you — this correction is ready for editorial review.");
    dialog.querySelector("form").reset();
    dialog.returnValue = "";
  }

  renderEmpty(query, message = "") {
    const rawQuery = String(query ?? "").trim();
    const safeQuery = escapeHtml(rawQuery) || "No search term";
    this.pendingQuery = rawQuery;
    this.shadowRoot.querySelector(".result-slot").innerHTML = `<section class="empty"><span class="status">No reviewed entry</span><h2>${safeQuery}</h2><p>We do not have a reviewed Georgian spelling for this term yet. Submit it for editorial review, with a proposed spelling or source if you have one.</p>${message ? `<div class="notice" role="status"><strong>${escapeHtml(message)}</strong></div>` : ""}<button class="action action-primary" type="button" data-submit>${icon("edit")} Submit term for review</button></section>`;
    this.shadowRoot.querySelector("[data-submit]").addEventListener("click", () => this.openNewEntryDialog(rawQuery));
  }
}

if (!customElements.get("eng-transliterator")) customElements.define("eng-transliterator", EngTransliterator);
