import { CASES, featuredEntries, sampleEntries, searchEntries } from "./sample-provider.js?v=0.10.2";
import { ENTRY_FILTER_GROUPS, filterEntries, hasActiveEntryFilters, normalizeEntryFilters } from "./entry-filters.js?v=0.10.2";
import { styles } from "./transliterator-styles.js?v=0.10.11";
import { inflectLatinStem } from "./latin-inflector.js?v=0.8.3";

const icon = (name) => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    table: '<path d="M4 5h16v14H4zM4 10h16M10 5v14"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  };
  return `<span class="icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths[name]}</svg></span>`;
};

/** Only same-site paths and https links may become an href; anything else (javascript:, data:, //host) is dropped. */
const safeHref = (value) => {
  const text = String(value ?? "").trim();
  if (/^\/(?![/\\])/u.test(text)) return text;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

/** Pause in typing before the hosted entry search is asked; keeps requests to one per burst. */
const SUGGEST_DEBOUNCE_MS = 250;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const confidenceBadge = (band, explanation) => {
  const label = `${String(band ?? "").toLowerCase()} confidence`;
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return `<div class="confidence" role="note" tabindex="0" aria-label="${escapeHtml(displayLabel)}. ${escapeHtml(explanation)}"><strong>${escapeHtml(displayLabel)}</strong><span class="confidence-info" aria-hidden="true">i</span><span class="confidence-tooltip" role="tooltip" aria-hidden="true">${escapeHtml(explanation)}</span></div>`;
};

/**
 * An editorially approved entry shows this instead of a confidence label.
 * Confidence is the evidence an editor documents BEFORE approving; once the
 * entry is approved, a confidence band beside it would read as the editors
 * doubting their own decision. Candidates keep the confidence label.
 */
const approvedBadge = (reviewed) => {
  const date = /^\d{4}-\d{2}-\d{2}$/u.test(String(reviewed ?? "")) ? ` Last reviewed ${reviewed}.` : "";
  const explanation = `Reviewed and approved by eng.ge editors.${date}`;
  return `<div class="confidence approved" role="note" tabindex="0" aria-label="Editorially approved. ${escapeHtml(explanation)}"><strong>Editorially approved</strong><span class="confidence-info" aria-hidden="true">i</span><span class="confidence-tooltip" role="tooltip" aria-hidden="true">${escapeHtml(explanation)}</span></div>`;
};

const humanize = (value) => {
  const text = String(value ?? "").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const inflectionStateGuide = `
  <details class="form-guide">
    <summary><span>What do these linguistic fields mean?</span><span class="guide-action">Open field guide</span></summary>
    <div class="guide-grid">
      <div><strong>Inflection state</strong><p>Describes whether and how the Georgian form changes when it is used in different grammatical cases.</p></div>
      <div><strong>Regular</strong><p>Case forms follow the standard pattern and can be generated reliably from the stem.</p></div>
      <div><strong>Invariable</strong><p>The form stays exactly the same in every grammatical case; no case ending is added.</p></div>
      <div><strong>Irregular</strong><p>One or more case forms do not follow the standard pattern and must be reviewed or entered individually.</p></div>
      <div><strong>Pending review</strong><p>The inflection pattern has not been confirmed yet. Editors should not treat generated forms as approved.</p></div>
      <div><strong>Stem</strong><p>The base used to build case forms. For consonant-final words, it usually omits nominative -ი.</p></div>
      <div><strong>Final ი role</strong><p>Clarifies whether final ი is a removable case marker or an inseparable part of the original root.</p></div>
      <div><strong>Transcription basis</strong><p>The pronunciation or established usage used to choose the Georgian spelling—not the person’s nationality.</p></div>
    </div>
  </details>`;

const filterControls = ENTRY_FILTER_GROUPS.map((group) => `
  <fieldset class="filter-group">
    <legend>${escapeHtml(group.label)}</legend>
    ${group.options.map((option) => `<label><input type="checkbox" data-filter-group="${group.key}" value="${escapeHtml(option.value)}" /><span>${escapeHtml(option.label)}</span></label>`).join("")}
  </fieldset>`).join("");

const template = document.createElement("template");
template.innerHTML = `
  <style>${styles}</style>
  <section class="tool">
    <div class="hero">
      <div class="mode-switch" role="group" aria-label="Tool mode">
        <button type="button" data-mode="search" aria-pressed="true">Dictionary search</button>
        <button type="button" data-mode="generator" aria-pressed="false">Transliteration generator</button>
      </div>
      <h1 class="hero-title">Write international names and terms in Georgian</h1>
      <p class="hero-description">Find reviewed Georgian spellings with pronunciation, source-language context, morphology, and inflection.</p>
      <form class="search">
        <div class="filter-menu">
          <button class="filter-toggle" type="button" aria-expanded="false" aria-controls="entry-filter-panel">
            ${icon("filter")}<span>Filter</span><span class="filter-count" hidden></span>
          </button>
          <div class="filter-panel" id="entry-filter-panel" hidden>
            <div class="filter-panel-head"><strong>Filter entries</strong><button class="filter-clear" type="button">Clear all</button></div>
            ${filterControls}
            <p>Selections use OR within a group and AND between groups.</p>
          </div>
        </div>
        <div class="search-input-wrap">
          <label class="search-field">
            ${icon("search")}
            <span class="sr-only">Search for a name, place, brand, or term</span>
            <input autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="term-suggestions" aria-expanded="false" aria-label="Search for a name, place, brand, or term" />
          </label>
          <button class="search-clear" type="button" aria-label="Clear search" title="Clear search" hidden>×</button>
          <div class="suggestions" id="term-suggestions" role="listbox" aria-label="Matching terms" hidden></div>
        </div>
        <button class="search-submit" type="submit">Search</button>
      </form>
      <form class="generator-form" hidden>
        <div class="form-progress" aria-label="New transcription steps"><span class="is-current">1 <b>Classify</b></span><i></i><span>2 <b>Generate</b></span><i></i><span>3 <b>Review</b></span></div>
        <div class="generator-fields">
          <label class="generator-field generator-term"><span>English term</span><input name="term" autocomplete="off" required /></label>
          <label class="generator-field"><span>Term class</span><select name="lexicalClass" required><option value="">Select a class</option><option value="ordinary_word">Ordinary word</option><option value="proper_noun">Proper noun</option><option value="abbreviation">Abbreviation</option></select></label>
          <label class="generator-field generator-entity" hidden><span>Proper-noun type</span><select name="entityType"><option value="">Select a type</option><option value="personal_name">Personal name</option><option value="geographic_name">Geographic name</option><option value="organization">Organization</option><option value="brand_product">Brand or product</option><option value="work_publication">Work or publication</option><option value="other">Other</option></select></label>
          <label class="generator-field generator-reading" hidden><span>Reading type</span><select name="readingType"><option value="">Select a reading</option><option value="initialism">Initialism (PHP, CNN)</option><option value="acronym">Acronym (NATO)</option></select></label>
          <button class="generator-submit" type="submit">Generate candidate</button>
        </div>
        <p class="generator-help">Generation requires a reliable English IPA record. Orthographic guesses remain editor-only.</p>
        ${inflectionStateGuide}
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
    this.entryFilters = normalizeEntryFilters();
    this.candidateResolver = null;
    this.entryResolver = null;
    this.entryRequest = 0;
    this.candidateRequest = 0;
    this.mode = "search";
  }

  setCandidateResolver(resolver) {
    if (resolver !== null && typeof resolver !== "function") {
      throw new TypeError("Candidate resolver must be a function or null.");
    }
    this.candidateResolver = resolver;
  }

  setEntryResolver(resolver) {
    if (resolver !== null && typeof resolver !== "function") throw new TypeError("Entry resolver must be a function or null.");
    this.entryResolver = resolver;
  }

  setMode(mode, { term = "", emitEvent = true, render = true } = {}) {
    if (mode !== "search" && mode !== "generator") throw new TypeError("Unknown tool mode.");
    this.candidateRequest += 1;
    this.mode = mode;
    const isGenerator = mode === "generator";
    this.shadowRoot.querySelectorAll("[data-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
    });
    this.shadowRoot.querySelector(".search").hidden = isGenerator;
    this.shadowRoot.querySelector(".examples").hidden = isGenerator;
    this.shadowRoot.querySelector(".generator-form").hidden = !isGenerator;
    this.shadowRoot.querySelector(".hero-title").textContent = isGenerator
      ? "Generate an English-to-Georgian candidate"
      : "Write international names and terms in Georgian";
    this.shadowRoot.querySelector(".hero-description").textContent = isGenerator
      ? "Classify the term first, then generate an auditable candidate from reliable English pronunciation data."
      : "Find reviewed Georgian spellings with pronunciation, source-language context, morphology, and inflection.";

    if (isGenerator) {
      const generatorTerm = this.shadowRoot.querySelector('.generator-form [name="term"]');
      generatorTerm.value = String(term || generatorTerm.value || this.shadowRoot.querySelector(".search-field input").value).trim();
      this.syncGeneratorFields();
      if (render) this.renderGeneratorLanding(generatorTerm.value);
    } else if (render) {
      this.render();
    }
    if (emitEvent) {
      this.dispatchEvent(new CustomEvent("modechange", { bubbles: true, composed: true, detail: { mode, term: String(term ?? "").trim() } }));
    }
  }

  connectedCallback() {
    this.shadowRoot.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => this.setMode(button.dataset.mode, {
        term: this.shadowRoot.querySelector(".search-field input").value,
      }));
    });
    const form = this.shadowRoot.querySelector(".search");
    const input = form.querySelector(".search-field input");
    const clearLabel = this.getAttribute("clear-search-label") || "Clear search";
    form.querySelector(".search-clear").setAttribute("aria-label", clearLabel);
    form.querySelector(".search-clear").title = clearLabel;
    input.value = this.currentEntry.headword;
    input.defaultValue = this.currentEntry.headword;
    this.syncSearchClear();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.hideSuggestions();
      this.search(input.value);
    });
    input.addEventListener("input", () => { this.syncSearchClear(); this.updateSuggestions(input.value); });
    input.addEventListener("focus", () => this.updateSuggestions(input.value));
    input.addEventListener("keydown", (event) => this.handleSuggestionKeydown(event));
    form.querySelector(".search-clear").addEventListener("click", () => this.clearSearch());
    form.addEventListener("focusout", () => window.setTimeout(() => {
      if (!form.contains(this.shadowRoot.activeElement)) {
        this.hideSuggestions();
        this.closeFilterPanel();
      }
    }, 0));

    const filterToggle = form.querySelector(".filter-toggle");
    filterToggle.addEventListener("click", () => {
      const panel = form.querySelector(".filter-panel");
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      filterToggle.setAttribute("aria-expanded", String(willOpen));
    });
    form.querySelector(".filter-panel").addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeFilterPanel();
        filterToggle.focus();
      }
    });
    form.querySelectorAll("[data-filter-group]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => this.syncFiltersFromControls());
    });
    form.querySelector(".filter-clear").addEventListener("click", () => {
      form.querySelectorAll("[data-filter-group]").forEach((checkbox) => { checkbox.checked = false; });
      this.syncFiltersFromControls();
    });

    const generatorForm = this.shadowRoot.querySelector(".generator-form");
    generatorForm.querySelector('[name="lexicalClass"]').addEventListener("change", () => this.syncGeneratorFields());
    generatorForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.generateFromForm();
    });

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
    this.setMode("search", { emitEvent: false, render: false });
    this.render();
  }

  async search(query) {
    const normalizedQuery = String(query ?? "").trim();
    this.candidateRequest += 1;
    const input = this.shadowRoot.querySelector(".search-field input");
    input.value = normalizedQuery;
    input.defaultValue = normalizedQuery;
    this.syncSearchClear();
    const requestId = ++this.entryRequest;
    let remote = [];
    if (this.entryResolver && normalizedQuery) {
      try { remote = await this.entryResolver(normalizedQuery, this.entryFilters); } catch (_) { remote = []; }
    }
    if (requestId !== this.entryRequest) return;
    const [entry] = [...filterEntries(remote, this.entryFilters), ...searchEntries(normalizedQuery, this.entryFilters)]
      .filter((item, index, entries) => entries.findIndex((candidate) => candidate.headword.toLocaleLowerCase() === item.headword.toLocaleLowerCase()) === index);
    const filtered = hasActiveEntryFilters(this.entryFilters);
    if (entry) this.selectEntry(entry, false);
    else this.renderEmpty(normalizedQuery, "", filtered);
    this.closeFilterPanel();
    this.dispatchEvent(new CustomEvent("entrysearch", { bubbles: true, composed: true, detail: { query: normalizedQuery, filters: this.entryFilters } }));
  }

  syncGeneratorFields() {
    const form = this.shadowRoot.querySelector(".generator-form");
    const lexicalClass = form.elements.lexicalClass.value;
    const entityField = form.querySelector(".generator-entity");
    const readingField = form.querySelector(".generator-reading");
    entityField.hidden = lexicalClass !== "proper_noun";
    readingField.hidden = lexicalClass !== "abbreviation";
    form.elements.entityType.required = lexicalClass === "proper_noun";
    form.elements.readingType.required = lexicalClass === "abbreviation";
    if (entityField.hidden) form.elements.entityType.value = "";
    if (readingField.hidden) form.elements.readingType.value = "";
  }

  openGenerator(term) {
    this.setMode("generator", { term });
    this.shadowRoot.querySelector('.generator-form [name="term"]').focus();
  }

  generateFromForm() {
    const form = this.shadowRoot.querySelector(".generator-form");
    if (!form.reportValidity()) return;
    const request = {
      term: form.elements.term.value,
      lexicalClass: form.elements.lexicalClass.value,
      entityType: form.elements.entityType.value,
      readingType: form.elements.readingType.value,
    };
    const requestId = ++this.candidateRequest;
    this.renderAutomaticPending(request.term);
    this.resolveAutomaticCandidate(request, requestId);
    this.dispatchEvent(new CustomEvent("generatorrequest", { bubbles: true, composed: true, detail: { request } }));
  }

  async updateSuggestions(query) {
    const input = this.shadowRoot.querySelector(".search-field input");
    const list = this.shadowRoot.querySelector(".suggestions");
    const value = String(query ?? "").trim();
    const shouldSearch = Boolean(value) || hasActiveEntryFilters(this.entryFilters);
    const requestId = ++this.entryRequest;
    let remote = [];
    if (shouldSearch && value && this.entryResolver) {
      // Wait for a pause in typing: one request per burst of keystrokes, not one per key.
      await new Promise((resolve) => {
        window.clearTimeout(this.suggestTimer);
        this.suggestResolve?.();
        this.suggestResolve = resolve;
        this.suggestTimer = window.setTimeout(resolve, SUGGEST_DEBOUNCE_MS);
      });
      if (requestId !== this.entryRequest) return;
      try { remote = await this.entryResolver(value, this.entryFilters); } catch (_) { remote = []; }
    }
    if (requestId !== this.entryRequest) return;
    const matches = shouldSearch ? [...filterEntries(remote, this.entryFilters), ...searchEntries(value, this.entryFilters)]
      .filter((item, index, entries) => entries.findIndex((candidate) => candidate.headword.toLocaleLowerCase() === item.headword.toLocaleLowerCase()) === index)
      .slice(0, 6) : [];
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
    if (event.key === "Escape") {
      event.preventDefault();
      this.clearSearch();
      return;
    }
    const list = this.shadowRoot.querySelector(".suggestions");
    const options = [...list.querySelectorAll('[role="option"]')];
    if (!options.length || list.hidden) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      this.suggestionIndex = (this.suggestionIndex + offset + options.length) % options.length;
      options.forEach((option, index) => option.setAttribute("aria-selected", String(index === this.suggestionIndex)));
      this.shadowRoot.querySelector(".search-field input").setAttribute("aria-activedescendant", options[this.suggestionIndex].id);
    } else if (event.key === "Enter" && this.suggestionIndex >= 0) {
      event.preventDefault();
      options[this.suggestionIndex].click();
    }
  }

  clearSearch() {
    this.entryRequest += 1;
    const input = this.shadowRoot.querySelector(".search-field input");
    input.value = "";
    input.defaultValue = "";
    this.hideSuggestions();
    this.syncSearchClear();
    input.focus();
    this.dispatchEvent(new CustomEvent("entrysearch", { bubbles: true, composed: true, detail: { query: "", filters: this.entryFilters } }));
  }

  syncSearchClear() {
    const input = this.shadowRoot.querySelector(".search-field input");
    const button = this.shadowRoot.querySelector(".search-clear");
    if (input && button) button.hidden = input.value.length === 0;
  }

  hideSuggestions() {
    const input = this.shadowRoot.querySelector(".search-field input");
    const list = this.shadowRoot.querySelector(".suggestions");
    list.hidden = true;
    list.replaceChildren();
    this.suggestionIndex = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  closeFilterPanel() {
    const panel = this.shadowRoot.querySelector(".filter-panel");
    const toggle = this.shadowRoot.querySelector(".filter-toggle");
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  syncFiltersFromControls() {
    const filters = {};
    ENTRY_FILTER_GROUPS.forEach((group) => {
      filters[group.key] = [...this.shadowRoot.querySelectorAll(`[data-filter-group="${group.key}"]:checked`)]
        .map((checkbox) => checkbox.value);
    });
    this.entryFilters = normalizeEntryFilters(filters);
    this.renderFilterState();
    this.updateSuggestions(this.shadowRoot.querySelector(".search-field input").value);
  }

  renderFilterState() {
    const count = ENTRY_FILTER_GROUPS.reduce((total, group) => total + this.entryFilters[group.key].length, 0);
    const badge = this.shadowRoot.querySelector(".filter-count");
    const toggle = this.shadowRoot.querySelector(".filter-toggle");
    badge.textContent = String(count);
    badge.hidden = count === 0;
    toggle.classList.toggle("is-active", count > 0);
    toggle.setAttribute("aria-label", count ? `Filter entries, ${count} selected` : "Filter entries");
  }

  sourceDisplay(entry) {
    return `${entry.sourceLanguage}${entry.sourceRegion ? ` (${entry.sourceRegion})` : ""}`;
  }

  selectEntry(entry, emitEvent = true) {
    this.candidateRequest += 1;
    this.currentEntry = entry;
    this.dialect = Object.keys(entry.pronunciations)[0];
    this.activeTab = "overview";
    this.inflectionScope = "whole";
    const input = this.shadowRoot.querySelector(".search-field input");
    input.value = entry.headword;
    input.defaultValue = entry.headword;
    this.syncSearchClear();
    this.hideSuggestions();
    this.render();
    if (emitEvent) this.dispatchEvent(new CustomEvent("entryselect", { bubbles: true, composed: true, detail: { entry } }));
  }

  async resolveAutomaticCandidate(request, requestId) {
    const query = String(request.term ?? "").trim();
    try {
      if (!this.candidateResolver) throw new Error("Generator service is unavailable.");
      const result = await this.candidateResolver(request);
      if (requestId !== this.candidateRequest) return;
      if (["candidate", "machine_candidate"].includes(result?.status) && result.suggestions?.length) {
        this.renderAutomaticCandidate(query, result);
      } else if (result?.status === "editor_review") {
        this.renderAutomaticReviewRequired(query, result);
      } else {
        this.renderGeneratorUnavailable(query, result);
      }
    } catch (error) {
      if (requestId === this.candidateRequest) {
        const providerUnavailable = ["PROVIDER_UNAVAILABLE", "PROVIDER_RESPONSE_ERROR"].includes(error?.code);
        const message = providerUnavailable
          ? "The pronunciation service is temporarily unavailable. No spelling was guessed; please try again later."
          : "The generator could not validate this request. Check its classification and try again.";
        this.renderGeneratorLanding(query, message);
      }
    }
  }

  renderGeneratorLanding(term = "", message = "") {
    const safeTerm = escapeHtml(String(term ?? "").trim());
    this.shadowRoot.querySelector(".result-slot").innerHTML = `<section class="empty generator-intro"><span class="status">Generator</span><h2>${safeTerm ? `Ready for ${safeTerm}` : "Create an auditable candidate"}</h2><p>Select the term class${safeTerm ? "" : " and enter an English term"}. Proper nouns and abbreviations reveal the metadata needed for their specific rules.</p>${message ? `<div class="notice" role="status"><strong>${escapeHtml(message)}</strong></div>` : ""}</section>`;
  }

  renderAutomaticPending(query) {
    this.pendingQuery = query;
    this.shadowRoot.querySelector(".result-slot").innerHTML = `<section class="empty" aria-busy="true"><span class="status">Checking pronunciation</span><h2>${escapeHtml(query)}</h2><p>Looking for a reliable English IPA pronunciation before generating a Georgian candidate.</p></section>`;
  }

  renderAutomaticReviewRequired(query, result = {}) {
    this.pendingQuery = query;
    const mismatch = result.reason === "reading_type_mismatch";
    const explanation = mismatch
      ? "The selected abbreviation reading conflicts with the authoritative pronunciation record. No candidate was generated."
      : "A pronunciation record was found, but it contains unresolved or unverified evidence. No public Georgian candidate was generated.";
    this.shadowRoot.querySelector(".result-slot").innerHTML = `<section class="empty"><span class="status">Editorial review required</span><h2>${escapeHtml(query)}</h2><p>${explanation}</p>${this.generatorWarnings(result.warnings)}<button class="action action-primary" type="button" data-submit>${icon("edit")} Submit term for review</button></section>`;
    this.shadowRoot.querySelector("[data-submit]").addEventListener("click", () => this.openNewEntryDialog(query));
  }

  renderGeneratorUnavailable(query, result = {}) {
    this.pendingQuery = query;
    this.shadowRoot.querySelector(".result-slot").innerHTML = `<section class="empty"><span class="status">No reliable pronunciation</span><h2>${escapeHtml(query)}</h2><p>The public generator requires a reliable English IPA record. It will not expose an orthographic guess.</p>${this.generatorWarnings(result.warnings)}<button class="action action-primary" type="button" data-submit>${icon("edit")} Submit term for review</button></section>`;
    this.shadowRoot.querySelector("[data-submit]").addEventListener("click", () => this.openNewEntryDialog(query));
  }

  generatorWarnings(warnings = []) {
    return warnings.length ? `<div class="generator-warnings"><strong>Checks before publication</strong><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></div>` : "";
  }

  renderAutomaticCandidate(query, result) {
    const generated = result.suggestions[0];
    const candidate = generated.candidate;
    const machineGenerated = result.status === "machine_candidate";
    const sourceLabel = generated.pronunciationSource?.label ?? (generated.reviewReasons.length
      ? "Pronunciation requires review"
      : "Reliable IPA pronunciation");
    const ending = candidate.declensionClass === "consonant" ? candidate.georgianForm.slice(-1) : "";
    const displayStem = ending ? candidate.georgianForm.slice(0, -1) : candidate.georgianForm;
    const alternatives = [...new Set(result.suggestions.slice(1).map((item) => item.candidate.georgianForm))];
    const caseLabels = Object.fromEntries(CASES);
    const request = result.request ?? {};
    const classificationParts = [request.lexicalClass, request.entityType]
      .filter((value) => value && value !== "not_applicable")
      .map(humanize);
    if (request.readingType && request.readingType !== "ordinary_word") classificationParts.push(humanize(request.readingType));
    const classification = classificationParts.join(" · ");
    this.pendingQuery = query;
    this.shadowRoot.querySelector(".result-slot").innerHTML = `
      <article class="result generated-result">
        <div class="result-head"><div><span class="status">${machineGenerated ? "Machine estimate" : "Generated candidate"}</span><h2>${escapeHtml(query)}</h2><div class="category">${escapeHtml(classification || humanize(result.readingType))} · ${machineGenerated ? "Estimated pronunciation" : "Generated from English IPA"}</div></div><button class="copy" type="button" data-copy-generated>${icon("copy")}<span class="copy-label">Copy Georgian</span></button></div>
        <div class="pronunciation"><strong>${escapeHtml(generated.variety)}</strong><span class="ipa">${escapeHtml(generated.ipaOriginal)}</span><span class="source">${escapeHtml(sourceLabel)}</span></div>
        <section class="panel generated-panel">
          <div class="overview-grid"><div><div class="label">Generated Georgian spelling</div><div class="georgian"><span>${escapeHtml(displayStem)}</span>${ending ? `<span class="ending">${escapeHtml(ending)}</span>` : ""}</div><p class="morph-note">${machineGenerated ? "Generated from a machine-estimated pronunciation because no open or reviewed record was available. Treat this as a last-resort draft requiring editorial review." : "Generated from a reliable IPA record. This is an unreviewed candidate, not an approved dictionary entry."}</p></div><div class="facts"><div class="fact"><span>Generation policy</span><strong>${escapeHtml(result.policy?.label ?? "English IPA")}</strong></div><div class="fact"><span>Strategy</span><strong>${escapeHtml(result.policy?.strategy?.label ?? "IPA transcription")}</strong></div><div class="fact"><span>Stem</span><strong>${escapeHtml(candidate.georgianStem)}-</strong></div><div class="fact"><span>Declension class</span><strong>${escapeHtml(humanize(candidate.declensionClass))}</strong></div><div class="fact"><span>Final root vowel</span><strong>${escapeHtml(humanize(candidate.finalRootVowel))}</strong></div></div></div>
          ${alternatives.length ? `<p class="generated-alternatives"><strong>Pronunciation alternatives:</strong> ${alternatives.map(escapeHtml).join(", ")}</p>` : ""}
          ${this.generatorWarnings(result.warnings)}
          <details class="generated-inflection"><summary>Show generated inflections</summary>${this.generatedInflectionTable(query, candidate, caseLabels)}</details>
          <div class="generated-footer">
            <div class="actions"><button class="action action-primary" type="button" data-submit>${icon("edit")} Submit for editorial review</button></div>
            ${confidenceBadge(machineGenerated ? "low" : candidate.confidence, machineGenerated ? "Low confidence because the pronunciation itself was machine-generated. Editorial review is required." : "Confidence describes rule coverage, not editorial approval.")}
          </div>
        </section>
      </article>`;
    this.shadowRoot.querySelector("[data-copy-generated]").addEventListener("click", async (event) => {
      const copied = await this.copyText(candidate.georgianForm);
      event.currentTarget.querySelector(".copy-label").textContent = copied ? "Copied" : "Copy unavailable";
    });
    this.shadowRoot.querySelector("[data-submit]").addEventListener("click", () => this.openNewEntryDialog(query));
  }

  /** Georgian forms from the candidate, plus the Latin-script term inflected from the typed spelling. */
  generatedInflectionTable(query, candidate, caseLabels) {
    let latin = null;
    try {
      if (candidate.latinFinalSound) latin = inflectLatinStem({ stem: String(query).trim(), ...candidate.latinFinalSound });
    } catch {
      latin = null; // a term with no Latin letters has no Latin-script paradigm
    }
    const rows = Object.entries(candidate.inflection).map(([caseName, form]) => (
      `<tr><td>${escapeHtml(caseLabels[caseName] ?? caseName)}</td><td lang="ka">${escapeHtml(form)}</td>${latin ? `<td>${escapeHtml(latin.cases[caseName]?.display ?? "")}</td>` : ""}</tr>`
    )).join("");
    return `<div class="table-wrap"><table><thead><tr><th>Case</th><th>Georgian form</th>${latin ? "<th>Latin-script term</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  render(message = "") {
    const entry = this.currentEntry;
    const pronunciation = entry.pronunciations[this.dialect] ?? Object.values(entry.pronunciations)[0];
    const slot = this.shadowRoot.querySelector(".result-slot");
    slot.innerHTML = `
      <article class="result">
        <div class="result-head">
          <div>
            ${entry.status === "candidate" ? '<span class="status">Unreviewed candidate</span>' : ""}
            <h2>${escapeHtml(entry.headword)}</h2>
            <div class="category">${escapeHtml(entry.lexicalClass)} · ${escapeHtml(entry.entityType)}</div>
            <div class="source-context">Source: ${escapeHtml(this.sourceDisplay(entry))}</div>
            ${entry.fullForm ? `<div class="expanded-form"><span>Full form:</span> ${escapeHtml(entry.fullForm)}</div>` : ""}
          </div>
          <button class="copy" type="button" aria-label="Copy Georgian spelling">${icon("copy")}<span class="copy-label">Copy Georgian</span></button>
        </div>
        <div class="pronunciation">
          <div class="segments" aria-label="Pronunciation variety">
            ${Object.entries(entry.pronunciations).map(([key, item]) => `<button type="button" data-dialect="${escapeHtml(key)}" aria-pressed="${this.dialect === key}">${escapeHtml(item.label)}</button>`).join("")}
          </div>
          <span class="ipa">${escapeHtml(pronunciation.ipa)}</span>
          <span class="source">${escapeHtml(pronunciation.source)}</span>
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
          <div class="georgian" aria-label="${escapeHtml(georgian.spelling)}"><span>${escapeHtml(stemDisplay)}</span>${georgian.ending ? `<span class="ending">${escapeHtml(georgian.ending)}</span>` : ""}</div>
          <p class="morph-note">${escapeHtml(georgian.explanation)}</p>
        </div>
        <div class="facts">
          <div class="fact"><span>Stem</span><strong>${escapeHtml(georgian.stem)}-</strong></div>
          <div class="fact"><span>Ending type</span><strong>${escapeHtml(georgian.endingClass)}</strong></div>
          <div class="fact"><span>Final ი</span><strong>${escapeHtml(georgian.finalIRole)}</strong></div>
        </div>
      </div>
      ${entry.rejectedForms?.length ? this.rejectedForms(entry.rejectedForms) : ""}
      <div class="actions">
        <button class="action action-primary" type="button" data-open-tab="inflection">${icon("table")} Show inflections</button>
        <button class="action" type="button" data-correct>${icon("edit")} ${entry.status === "candidate" ? "Propose another spelling" : "Suggest a correction"}</button>
      </div>
      ${entry.status === "approved" ? approvedBadge(entry.details?.reviewed) : (entry.confidence ? confidenceBadge(entry.confidence.band, entry.confidence.explanation) : "")}
      ${message ? `<div class="notice" role="status"><strong>${escapeHtml(message)}</strong></div>` : ""}`;
  }

  rejectedForms(forms) {
    return `<section class="rejected-forms" aria-labelledby="rejected-forms-title">
      <div><div class="label" id="rejected-forms-title">Forms to avoid</div><p>These recorded spellings are incorrect for this entry.</p></div>
      <ul>${forms.map((form) => `<li><s>${escapeHtml(form)}</s></li>`).join("")}</ul>
    </section>`;
  }

  inflection(entry) {
    const hasComponents = entry.inflection.scopes.includes("components");
    const showComponents = hasComponents && this.inflectionScope === "components";
    const showLatin = entry.inflection.latinScript !== "not_applicable";
    return `
      ${hasComponents ? `<div class="scope-controls" aria-label="Inflection scope"><button class="scope-button" data-scope="whole" aria-pressed="${!showComponents}">Together</button><button class="scope-button" data-scope="components" aria-pressed="${showComponents}">By component</button></div>` : ""}
      ${showComponents ? this.componentView(entry) : this.paradigmTable(entry.inflection.whole, showLatin ? entry.inflection.latin : null)}
      <p class="footnote">Case forms are generated from the stored Georgian stem and the recorded final pronounced sound of the Latin-script term.</p>`;
  }

  paradigmTable(paradigm, latinInflection) {
    const showLatin = Boolean(latinInflection);
    const rows = CASES.map(([key, label]) => {
      const georgianForm = paradigm[key];
      const latinForm = latinInflection?.paradigm[key];
      return `<tr><td>${label}</td><td class="${georgianForm ? "" : "pending"}">${georgianForm ? escapeHtml(georgianForm) : "Awaiting confirmed rule"}</td>${showLatin ? `<td class="${latinForm ? "" : "pending"}">${latinForm ? escapeHtml(latinForm) : "Awaiting confirmed rule"}</td>` : ""}</tr>`;
    }).join("");
    return `<div class="table-wrap"><table><thead><tr><th>Case</th><th>Georgian script</th>${showLatin ? "<th>Latin-script term</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  componentView(entry) {
    return `<div class="component-list">${entry.components.map((component) => `<div class="component"><span><strong>${escapeHtml(component.georgian)}</strong><br><small>${escapeHtml(component.source)}</small></span><span>${escapeHtml(component.role)}</span><small>Paradigm awaiting confirmed rule</small></div>`).join("")}</div>`;
  }

  details(entry) {
    const statusLabel = entry.status === "approved" ? "Editorially approved" : "Unreviewed candidate";
    return `<dl class="details">
      <dt>Editorial status</dt><dd>${statusLabel}</dd>
      <dt>Classification</dt><dd>${escapeHtml(entry.lexicalClass)} · ${escapeHtml(entry.entityType)}</dd>
      ${entry.fullForm ? `<dt>Full form</dt><dd>${escapeHtml(entry.fullForm)}</dd>` : ""}
      ${entry.abbreviationType ? `<dt>Abbreviation type</dt><dd>${escapeHtml(entry.abbreviationType)}</dd>` : ""}
      <dt>Source language</dt><dd>${escapeHtml(this.sourceDisplay(entry))}${entry.sourceVariety ? ` · ${escapeHtml(entry.sourceVariety)}` : ""}</dd>
      <dt>Transcription basis</dt><dd>${escapeHtml(entry.transcriptionBasis)}</dd>
      <dt>Method</dt><dd>${escapeHtml(entry.details.method)}</dd>
      <dt>Pronunciations</dt><dd>${Object.values(entry.pronunciations).map((item) => escapeHtml(item.label)).join(", ")}</dd>
      <dt>Rule or data version</dt><dd>${escapeHtml(entry.details.version)}</dd>
      <dt>Last reviewed</dt><dd>${escapeHtml(entry.details.reviewed)}</dd>
      <dt>Entry identifier</dt><dd><code>${escapeHtml(entry.id)}</code></dd>
      ${safeHref(entry.details.dictionaryUrl) ? `<dt>Related resource</dt><dd><a href="${escapeHtml(safeHref(entry.details.dictionaryUrl))}" target="_blank" rel="noopener noreferrer">Open eng.ge Dictionary <span class="sr-only">(opens in a new tab)</span></a></dd>` : ""}
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
    const isAlternative = this.currentEntry.status === "candidate";
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

  renderEmpty(query, message = "", filtered = false) {
    const rawQuery = String(query ?? "").trim();
    const safeQuery = escapeHtml(rawQuery) || "No search term";
    this.pendingQuery = rawQuery;
    const explanation = filtered
      ? "No entry matching the active filters was found. Clear or change the filters, or submit this term for editorial review."
      : "We do not have a reviewed Georgian spelling for this term yet. You can intentionally generate an unreviewed candidate or submit the term directly for editorial review.";
    this.shadowRoot.querySelector(".result-slot").innerHTML = `<section class="empty"><span class="status">${filtered ? "No filtered match" : "No reviewed entry"}</span><h2>${safeQuery}</h2><p>${explanation}</p>${message ? `<div class="notice" role="status"><strong>${escapeHtml(message)}</strong></div>` : ""}<div class="empty-actions"><button class="action action-primary" type="button" data-generate>Open generator</button><button class="action" type="button" data-submit>${icon("edit")} Submit term for review</button></div></section>`;
    this.shadowRoot.querySelector("[data-generate]").addEventListener("click", () => this.openGenerator(rawQuery));
    this.shadowRoot.querySelector("[data-submit]").addEventListener("click", () => this.openNewEntryDialog(rawQuery));
  }
}

if (!customElements.get("eng-transliterator")) customElements.define("eng-transliterator", EngTransliterator);
