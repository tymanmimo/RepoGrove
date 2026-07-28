import type {
  HistoryStore,
  SearchHistoryEntry,
} from "../../src/storage/history-store.js";
import type { TokenStore } from "../../src/storage/token-store.js";

export function createTokenStore(initialToken: string | null = null) {
  const state = {
    token: initialToken,
    deleteCount: 0,
  };
  const store: TokenStore = {
    async getToken() {
      return state.token;
    },
    async saveToken(token) {
      state.token = token;
    },
    async deleteToken() {
      state.token = null;
      state.deleteCount += 1;
    },
  };

  return { state, store };
}

export function createHistoryStore(initialEntries: SearchHistoryEntry[] = []) {
  const state = {
    entries: [...initialEntries],
    clearCount: 0,
  };
  const store: HistoryStore = {
    async load() {
      return state.entries;
    },
    async add(username) {
      state.entries = [
        {
          username,
          searchedAt: "2026-07-28T12:00:00.000Z",
        },
        ...state.entries,
      ].slice(0, 10);
      return state.entries;
    },
    async clear() {
      state.entries = [];
      state.clearCount += 1;
    },
  };

  return { state, store };
}
