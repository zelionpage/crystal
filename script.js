// =====================================
// CRYSTAL 2 - MAIN JAVASCRIPT
// =====================================

// LANGUAGE SYSTEM
function setLanguage(lang) {
  if (!["id", "en"].includes(lang)) return;

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-id][data-en]").forEach(element => {
    // Text-only replacement keeps nested markup and controls intact.
    if (element.children.length === 0) {
      element.textContent = element.dataset[lang];
    }
  });

  document.getElementById("idBtn")?.classList.toggle("active", lang === "id");
  document.getElementById("enBtn")?.classList.toggle("active", lang === "en");

  const search = document.getElementById("commandSearch");
  if (search) {
    search.placeholder = search.dataset[`placeholder${lang.toUpperCase()}`] || search.placeholder;
  }

  try {
    localStorage.setItem("crystal-language", lang);
  } catch (error) {
    // Language still works without local storage.
  }
}

// COPY COMMAND
async function copyCommand(value) {
  let copied = false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      copied = true;
    }
  } catch (error) {
    copied = false;
  }

  if (!copied) {
    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = value;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";
    document.body.appendChild(temporaryInput);
    temporaryInput.select();

    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    temporaryInput.remove();
  }

  showToast(copied ? "Command copied: " + value : "Copy unavailable. Please copy manually.");
}

function showToast(message) {
  const toast = document.getElementById("copyToast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// COMMAND FILTER + SEARCH
function filterCommands() {
  const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
  const searchValue = (document.getElementById("commandSearch")?.value || "").trim().toLowerCase();
  const cards = document.querySelectorAll(".command-card");
  let visibleCount = 0;

  cards.forEach(card => {
    const categoryMatches = activeFilter === "all" || card.dataset.category === activeFilter;
    const searchMatches = !searchValue ||
      (card.dataset.search + " " + card.textContent).toLowerCase().includes(searchValue);
    const visible = categoryMatches && searchMatches;

    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  const noResults = document.getElementById("noCommands");
  if (noResults) noResults.hidden = visibleCount !== 0;
}

// INITIALIZE
document.addEventListener("DOMContentLoaded", () => {
  let savedLanguage = "id";

  try {
    savedLanguage = localStorage.getItem("crystal-language") || "id";
  } catch (error) {
    // Use Indonesian as default.
  }
  setLanguage(savedLanguage);

  // MOBILE NAVIGATION
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  menuToggle?.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.textContent = isOpen ? "✕" : "☰";
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // CLOSE MENU AFTER CLICK
  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      navLinks?.classList.remove("open");
      if (menuToggle) {
        menuToggle.textContent = "☰";
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  // COPY BUTTONS
  document.querySelectorAll("[data-copy]").forEach(button => {
    button.addEventListener("click", () => copyCommand(button.dataset.copy));
  });

  // CATEGORY FILTERS
  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelector(".filter-btn.active")?.classList.remove("active");
      button.classList.add("active");
      filterCommands();
    });
  });

  // LIVE SEARCH
  document.getElementById("commandSearch")?.addEventListener("input", filterCommands);
  filterCommands();
});
