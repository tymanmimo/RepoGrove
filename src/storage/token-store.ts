const service = "github-analyzer";
const account = "github-token";

export interface TokenStore {
  getToken(signal?: AbortSignal): Promise<string | null>;
  saveToken(token: string, signal?: AbortSignal): Promise<void>;
  deleteToken(signal?: AbortSignal): Promise<void>;
}

async function createEntry() {
  const { AsyncEntry } = await import("@napi-rs/keyring");
  return new AsyncEntry(service, account);
}

export const systemTokenStore: TokenStore = {
  async getToken(signal) {
    const entry = await createEntry();
    return (await entry.getPassword(signal))?.trim() || null;
  },
  async saveToken(token, signal) {
    const entry = await createEntry();
    await entry.setPassword(token.trim(), signal);
  },
  async deleteToken(signal) {
    const entry = await createEntry();
    await entry.deleteCredential(signal);
  },
};
