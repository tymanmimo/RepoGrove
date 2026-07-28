import { Octokit } from "octokit";

function createGitHubClient(token?: string | null) {
  const normalizedToken = token?.trim();
  return new Octokit({
    ...(normalizedToken ? { auth: normalizedToken } : {}),
    request: {
      timeout: 15_000,
    },
  });
}

export async function validateGitHubToken(
  token: string,
  signal?: AbortSignal,
): Promise<void> {
  const octokit = createGitHubClient(token);
  await octokit.rest.users.getAuthenticated(
    signal ? { request: { signal } } : {},
  );
}

export async function fetchGitHubData(
  username: string,
  token?: string | null,
  signal?: AbortSignal,
) {
  const octokit = createGitHubClient(token);
  const requestOptions = signal ? { request: { signal } } : {};
  const [profileResponse, repositories] = await Promise.all([
    octokit.rest.users.getByUsername({ username, ...requestOptions }),
    octokit.paginate(octokit.rest.repos.listForUser, {
      username,
      type: "owner",
      sort: "updated",
      direction: "desc",
      per_page: 100,
      ...requestOptions,
    }),
  ]);

  return {
    profile: profileResponse.data,
    repositories,
  };
}
