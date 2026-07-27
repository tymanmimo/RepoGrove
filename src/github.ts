import { Octokit } from "octokit";

const token = process.env.GITHUB_TOKEN?.trim();
const octokit = new Octokit(token ? { auth: token } : {});

export async function fetchGitHubData(username: string) {
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

export type GitHubData = Awaited<ReturnType<typeof fetchGitHubData>>;
