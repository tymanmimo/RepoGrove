import type { GitHubData } from "./github.js";

export interface LanguageStatistics {
  name: string;
  repositoryCount: number;
  percentage: number;
}

export interface ActiveProject {
  name: string;
  language: string | null;
  starCount: number;
  url: string;
  updatedAt: string | null;
}

export interface ProfileStatistics {
  username: string;
  repositoryCount: number;
  starCount: number;
  languages: LanguageStatistics[];
  activeProjects: ActiveProject[];
}

export function analyzeGitHubData({
  profile,
  repositories,
}: GitHubData): ProfileStatistics {
  const languageCounts = new Map<string, number>();
  let starCount = 0;

  for (const repository of repositories) {
    starCount += repository.stargazers_count ?? 0;

    if (repository.language) {
      const currentCount = languageCounts.get(repository.language) ?? 0;
      languageCounts.set(repository.language, currentCount + 1);
    }
  }

  const repositoriesWithLanguage = [...languageCounts.values()].reduce(
    (total, count) => total + count,
    0,
  );
  const languages = [...languageCounts.entries()]
    .map(([name, repositoryCount]) => ({
      name,
      repositoryCount,
      percentage: Number(
        ((repositoryCount / repositoriesWithLanguage) * 100).toFixed(1),
      ),
    }))
    .sort(
      (first, second) =>
        second.repositoryCount - first.repositoryCount ||
        first.name.localeCompare(second.name),
    );
  const activeProjects = repositories
    .filter((repository) => !repository.fork && !repository.archived)
    .sort((first, second) =>
      (second.updated_at ?? "").localeCompare(first.updated_at ?? ""),
    )
    .slice(0, 5)
    .map((repository) => ({
      name: repository.name,
      language: repository.language ?? null,
      starCount: repository.stargazers_count ?? 0,
      url: repository.html_url,
      updatedAt: repository.updated_at ?? null,
    }));

  return {
    username: profile.login,
    repositoryCount: profile.public_repos,
    starCount,
    languages,
    activeProjects,
  };
}
