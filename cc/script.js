(() => {
  "use strict";

  const DATA_URL = "./commandsSheet.json";
  const PAGE_SIZE = 9;

  const list = document.getElementById("command-grid");
  const template = document.getElementById("command-row-template");
  const state = document.getElementById("catalog-state");
  const emptyState = document.getElementById("empty-state");
  const searchInput = document.getElementById("command-search");
  const filters = document.getElementById("category-filters");
  const count = document.getElementById("visible-count");
  const total = document.getElementById("command-count");
  const version = document.getElementById("bot-version");
  const pagination = document.getElementById("pagination");
  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");
  const pageIndicator = document.getElementById("page-indicator");

  let commands = [];
  let activeCategory = "all";
  let searchTerm = "";
  let currentPage = 1;
  let expandedId = null;

  const hasValue = value => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const pretty = value => String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (hasValue(text)) element.textContent = String(text);
    return element;
  };

  function addDetailLine(parent, label, value) {
    if (!hasValue(value)) return;
    const line = makeElement("div", "detail-line");
    line.append(makeElement("span", "detail-label", label));
    line.append(makeElement("span", "detail-value", value));
    parent.append(line);
  }

  function buildDetail(command) {
    const detail = makeElement("div", "detail-content");

    if (hasValue(command.description)) {
      detail.append(makeElement("p", "command-description", command.description));
    }

    const metadata = makeElement("div", "detail-grid");
    addDetailLine(metadata, "TYPE", hasValue(command.type) ? pretty(command.type) : null);
    addDetailLine(metadata, "ACCESS", hasValue(command.access) ? pretty(command.access) : null);
    addDetailLine(metadata, "VERSION", command.version);
    addDetailLine(metadata, "RELEASE DATE", command.releaseDate);
    if (metadata.children.length) detail.append(metadata);

    if (Array.isArray(command.aliases) && command.aliases.some(hasValue)) {
      const aliases = makeElement("div", "detail-extra");
      aliases.append(makeElement("span", "detail-label", "ALIASES"));
      aliases.append(makeElement("span", "detail-value", command.aliases.filter(hasValue).join(", ")));
      detail.append(aliases);
    }

    if (Array.isArray(command.tags) && command.tags.some(hasValue)) {
      const tags = makeElement("div", "detail-tags");
      command.tags.filter(hasValue).forEach(tag => tags.append(makeElement("span", "tag", `#${tag}`)));
      detail.append(tags);
    }

    if (!detail.children.length) {
      detail.append(makeElement("p", "detail-empty", "No additional information available."));
    }
    return detail;
  }

  function makeRow(command) {
    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector(".command-row");
    const expand = row.querySelector(".expand-button");
    const name = row.querySelector(".command-name");
    const category = row.querySelector(".command-category");
    const status = row.querySelector(".command-status");
    const copy = row.querySelector(".copy-button");

    row.dataset.commandId = String(command.id ?? command.name ?? "");
    expand.dataset.action = "expand";
    copy.dataset.action = "copy";
    name.textContent = hasValue(command.name) ? command.name : "Unnamed command";
    category.textContent = hasValue(command.category) ? pretty(command.category) : "UNCATEGORIZED";
    if (hasValue(command.status)) {
      status.textContent = pretty(command.status);
      status.classList.add(String(command.status).toLowerCase().replace(/[^a-z0-9_-]/g, ""));
    } else {
      status.hidden = true;
    }

    if (expandedId !== null && String(expandedId) === row.dataset.commandId) {
      expand.setAttribute("aria-expanded", "true");
      row.classList.add("is-expanded");
      const detail = row.querySelector(".command-detail");
      detail.hidden = false;
      detail.append(buildDetail(command));
    }
    return fragment;
  }

  function buildFilters() {
    const categories = [...new Set(commands.map(item => item.category).filter(hasValue))]
      .sort((a, b) => String(a).localeCompare(String(b)));

    const fragment = document.createDocumentFragment();
    const all = makeElement("button", "filter-chip selected", "All commands");
    all.type = "button";
    all.dataset.category = "all";
    fragment.append(all);

    categories.forEach(category => {
      const button = makeElement("button", "filter-chip", pretty(category));
      button.type = "button";
      button.dataset.category = category;
      fragment.append(button);
    });
    filters.replaceChildren(fragment);
  }

  function getFilteredCommands() {
    const normalized = searchTerm.toLowerCase();
    return commands.filter(command => {
      const matchesCategory = activeCategory === "all" || command.category === activeCategory;
      const haystack = [
        command.name, command.id, command.type, command.category,
        command.access, command.status, command.description,
        ...(Array.isArray(command.tags) ? command.tags : []),
        ...(Array.isArray(command.aliases) ? command.aliases : [])
      ].filter(hasValue).join(" ").toLowerCase();
      return matchesCategory && haystack.includes(normalized);
    });
  }

  function render() {
    const filtered = getFilteredCommands();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);
    const fragment = document.createDocumentFragment();

    pageItems.forEach(command => fragment.append(makeRow(command)));
    list.replaceChildren(fragment);

    count.textContent = String(filtered.length);
    emptyState.hidden = filtered.length !== 0;
    pagination.hidden = filtered.length <= PAGE_SIZE;
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  function goToPage(page) {
    currentPage = page;
    expandedId = null;
    render();
    document.getElementById("commands").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyCommand(button, command) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(command.name || "");
      button.textContent = "COPIED";
      button.classList.add("copied");
    } catch {
      button.textContent = "FAILED";
    }
    window.setTimeout(() => {
      if (!button.isConnected) return;
      button.textContent = original;
      button.classList.remove("copied");
    }, 1100);
  }

  list.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const row = actionButton.closest(".command-row");
    if (!row) return;
    const command = commands.find(item =>
      String(item.id ?? item.name ?? "") === row.dataset.commandId
    );
    if (!command) return;

    if (actionButton.dataset.action === "copy") {
      copyCommand(actionButton, command);
      return;
    }

    if (actionButton.dataset.action === "expand") {
      const detail = row.querySelector(".command-detail");
      const isOpen = actionButton.getAttribute("aria-expanded") === "true";

      // Keep only one expanded detail mounted at a time.
      if (expandedId !== null && String(expandedId) !== row.dataset.commandId) {
        const previous = list.querySelector(".command-row.is-expanded");
        if (previous) {
          previous.classList.remove("is-expanded");
          previous.querySelector(".expand-button").setAttribute("aria-expanded", "false");
          previous.querySelector(".command-detail").replaceChildren();
          previous.querySelector(".command-detail").hidden = true;
        }
      }

      if (isOpen) {
        expandedId = null;
        actionButton.setAttribute("aria-expanded", "false");
        row.classList.remove("is-expanded");
        detail.replaceChildren();
        detail.hidden = true;
      } else {
        expandedId = row.dataset.commandId;
        actionButton.setAttribute("aria-expanded", "true");
        row.classList.add("is-expanded");
        detail.replaceChildren(buildDetail(command));
        detail.hidden = false;
      }
    }
  });

  async function init() {
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || !Array.isArray(data.commands)) throw new Error("Invalid JSON schema");

      commands = data.commands.filter(item => item && typeof item === "object");
      if (hasValue(data.botVersion)) version.textContent = data.botVersion;
      total.textContent = String(commands.length);
      buildFilters();
      render();
      state.hidden = true;
    } catch (error) {
      console.error("Crystal command index:", error);
      state.textContent = "Unable to load commandsSheet.json. Check the file path and JSON format.";
      state.classList.add("error");
      total.textContent = "--";
    }
  }

  searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim();
    currentPage = 1;
    expandedId = null;
    render();
  });

  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    currentPage = 1;
    expandedId = null;
    filters.querySelectorAll(".filter-chip").forEach(chip => {
      chip.classList.toggle("selected", chip === button);
    });
    render();
  });

  prevButton.addEventListener("click", () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  });

  nextButton.addEventListener("click", () => {
    const totalPages = Math.ceil(getFilteredCommands().length / PAGE_SIZE);
    if (currentPage < totalPages) goToPage(currentPage + 1);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape" && document.activeElement === searchInput) {
      searchInput.value = "";
      searchTerm = "";
      currentPage = 1;
      expandedId = null;
      searchInput.blur();
      render();
    }
  });

  init();
})();
