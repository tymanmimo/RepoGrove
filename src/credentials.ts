const service = "github-analyzer";
const account = "github-token";

export interface TokenStore {
  getToken(): Promise<string | null>;
  saveToken(token: string): Promise<void>;
  deleteToken(): Promise<void>;
}

async function createEntry() {
  const { AsyncEntry } = await import("@napi-rs/keyring");
  return new AsyncEntry(service, account);
}

export const systemTokenStore: TokenStore = {
  async getToken() {
    const entry = await createEntry();
    return (await entry.getPassword()) ?? null;
  },
  async saveToken(token) {
    const entry = await createEntry();
    await entry.setPassword(token);
  },
  async deleteToken() {
    const entry = await createEntry();
    await entry.deleteCredential();
  },
};
