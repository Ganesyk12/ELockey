import { reactive } from "vue";

const TOKEN_KEY = "elockey.token";
const THEME_KEY = "elockey.theme";

type Theme = "dark" | "light";

const initialTheme: Theme =
  localStorage.getItem(THEME_KEY) === "light"
    ? "light"
    : "dark";

document.documentElement.classList.toggle("light", initialTheme === "light");

export const state = reactive({
  ready: false,
  setup: true,
  token: localStorage.getItem(TOKEN_KEY) as string | null,
  unlocked: false,
  notice: "",
  theme: initialTheme as Theme,
});

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