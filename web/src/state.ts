import { reactive } from "vue";

const TOKEN_KEY = "elockey.token";

export const state = reactive({
  ready: false,
  setup: true,
  token: localStorage.getItem(TOKEN_KEY) as string | null,
  unlocked: false,
  notice: "",
});

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  state.token = token;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  state.token = null;
  state.unlocked = false;
}