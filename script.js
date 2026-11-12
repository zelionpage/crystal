
// =====================================
// CRYSTAL 2 - MAIN JAVASCRIPT
// =====================================


// LANGUAGE SYSTEM

function setLanguage(lang) {
  if (!["id", "en"].includes(lang)) return;

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-id][data-en]")
    .forEach(element => {
      element.innerHTML = element.dataset[lang];
    });

  document.getElementById("idBtn")
    .classList.toggle("active", lang === "id");

  document.getElementById("enBtn")
    .classList.toggle("active", lang === "en");

  try {
    localStorage.setItem("crystal-language", lang);
  } catch (error) {
    // Language still works without local storage.
  }
}


// RESTORE LANGUAGE PREFERENCE

document.addEventListener("DOMContentLoaded", () => {
  let savedLanguage = "id";

  try {
    savedLanguage =
      localStorage.getItem("crystal-language") || "id";
  } catch (error) {
    // Use Indonesian as default.
  }

  setLanguage(savedLanguage);
});


// MOBILE NAVIGATION

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");

  menuToggle.textContent = isOpen ? "✕" : "☰";
});


// CLOSE MENU AFTER CLICK

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.textContent = "☰";
  });
});
