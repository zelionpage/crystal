(() => {
  "use strict";

  const DATA_URL = "./commandsSheet.json";
  const PAGE_SIZE = 9;

  const grid = document.getElementById("command-grid");
  const template = document.getElementById("command-card-template");
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

  const hasValue = value => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const pretty = value => String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());

  function addPill(parent, value, className = "") {
    if (!hasValue(value)) return;
    const pill = document.createElement("span");
    pill.className = `meta-pill ${className}`.trim();
    pill.textContent = pretty(value);
    parent.appendChild(pill);
  }

  function makeCard(command) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".command-card");
    const category = card.querySelector(".command-category");
    const status = card.querySelector(".command-status");
    const name = card.querySelector(".command-name");
    const copy = card.querySelector(".copy-button");
    const meta = card.querySelector(".command-meta");
    const description = card.querySelector(".command-description");
    const aliases = card.querySelector(".command-aliases");
    const tags = card.querySelector(".command-tags");
    const date = card.querySelector(".command-date");

    if (hasValue(command.category)) category.textContent = pretty(command.category);
    else category.hidden = true;

    if (hasValue(command.status)) {
      status.textContent = pretty(command.status);
      status.classList.add(String(command.status).toLowerCase());
    } else status.hidden = true;

    name.textContent = hasValue(command.name) ? command.name : "Unnamed command";
    copy.addEventListener("click", async () => {
      const original = copy.textContent;
      try {
        await navigator.clipboard.writeText(command.name || "");
        copy.textContent = "COPIED";
      } catch {
        copy.textContent = "FAILED";
      }
      window.setTimeout(() => { copy.textContent = original; }, 1100);
    });

    addPill(meta, command.type);
    addPill(meta, command.access, String(command.access || "").toLowerCase());
    addPill(meta, command.version);

    if (hasValue(command.description)) {
      description.textContent = command.description;
      description.hidden = false;
    }

    if (Array.isArray(command.aliases) && command.aliases.some(hasValue)) {
      aliases.textContent = `ALIASES  ·  ${command.aliases.filter(hasValue).join(", ")}`;
      aliases.hidden = false;
    }

    if (Array.isArray(command.tags) && command.tags.some(hasValue)) {
      command.tags.filter(hasValue).forEach(tag => {
        const el = document.createElement("span");
        el.className = "tag";
        el.textContent = `#${tag}`;
        tags.appendChild(el);
      });
      tags.hidden = false;
    }

    if (hasValue(command.releaseDate)) {
      date.textContent = `RELEASED  ·  ${command.releaseDate}`;
      date.hidden = false;
    }

    if (!meta.children.length) meta.hidden = true;
    return fragment;
  }

  function buildFilters() {
    const categories = [...new Set(commands
      .map(item => item.category)
      .filter(hasValue))].sort((a, b) => a.localeCompare(b));

    filters.replaceChildren();
    const all = document.createElement("button");
    all.type = "button";
    all.className = "filter-chip selected";
    all.dataset.category = "all";
    all.textContent = "All commands";
    filters.appendChild(all);

    categories.forEach(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.dataset.category = category;
      button.textContent = pretty(category);
      filters.appendChild(button);
    });
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

    // Only the current page is turned into DOM cards.
    const fragment = document.createDocumentFragment();
    pageItems.forEach(command => fragment.appendChild(makeCard(command)));
    grid.replaceChildren(fragment);

    count.textContent = String(filtered.length);
    emptyState.hidden = filtered.length !== 0;
    pagination.hidden = filtered.length <= PAGE_SIZE;

    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  function goToPage(page) {
    currentPage = page;
    render();
    document.getElementById("commands").scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
    render();
  });

  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    currentPage = 1;
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
      searchInput.blur();
      render();
    }
  });

  init();
})();
