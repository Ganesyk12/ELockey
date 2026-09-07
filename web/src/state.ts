import { reactive } from "vue";

const TOKEN_KEY = "elockey.token";
const THEME_KEY = "elockey.theme";

type Theme = "dark" | "light";
export type DocsTab = "overview" | "features" | "workflow" | "security" | "faq" | "changelog";

const initialTheme: Theme =
  localStorage.getItem(THEME_KEY) === "light"
    ? "light"
    : "dark";

document.documentElement.classList.toggle("light", initialTheme === "light");

function getInitialTab(): DocsTab {
  if (typeof window !== "undefined" && window.location.hash === "#changelog") {
    return "changelog";
  }
  return "overview";
}

const initialShowDocs =
  typeof window !== "undefined" &&
  (window.location.hash === "#docs" || window.location.hash === "#changelog");

export const state = reactive({
  ready: false,
  setup: true,
  token: localStorage.getItem(TOKEN_KEY) as string | null,
  unlocked: false,
  notice: "",
  theme: initialTheme as Theme,
  showDocs: initialShowDocs,
  docsTab: getInitialTab() as DocsTab,
});

export function openDocs(tab: DocsTab = "overview"): void {
  state.docsTab = tab;
  state.showDocs = true;
  if (typeof window !== "undefined") {
    window.location.hash = tab === "changelog" ? "changelog" : "docs";
  }
}

export function closeDocs(): void {
  state.showDocs = false;
  if (typeof window !== "undefined" && (window.location.hash === "#docs" || window.location.hash === "#changelog")) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#changelog") {
      state.showDocs = true;
      state.docsTab = "changelog";
    } else if (window.location.hash === "#docs") {
      state.showDocs = true;
      if (state.docsTab === "changelog") state.docsTab = "overview";
    } else {
      state.showDocs = false;
    }
  });
}

export function toggleTheme(): void {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, state.theme);
  document.documentElement.classList.toggle("light", state.theme === "light");
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  state.token = token;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  state.token = null;
  state.unlocked = false;
}