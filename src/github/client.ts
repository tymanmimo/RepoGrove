import { Octokit } from "octokit";

function createGitHubClient(token?: string | null) {
  const normalizedToken = token?.trim();
  return new Octokit(normalizedToken ? { auth: normalizedToken } : {});
}

export async function validateGitHubToken(token: string): Promise<void> {
  const octokit = createGitHubClient(token);
  await octokit.rest.users.getAuthenticated();
}

export async function fetchGitHubData(username: string, token?: string | null) {
  const octokit = createGitHubClient(token);
  const [profileResponse, repositories] = await Promise.all([
    octokit.rest.users.getByUsername({ username }),
    octokit.paginate(octokit.rest.repos.listForUser, {
      username,
      type: "owner",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    }),
  ]);

  return {
    profile: profileResponse.data,
    repositories,
  };
}
