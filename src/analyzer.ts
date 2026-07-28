import type { GitHubData } from "./github.js";

export interface LanguageStatistics {
  name: string;
  repositoryCount: number;
  percentage: number;
}

export interface ProfileStatistics {
  username: string;
  repositoryCount: number;
  starCount: number;
  languages: LanguageStatistics[];
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

  return {
    username: profile.login,
    repositoryCount: profile.public_repos,
    starCount,
    languages,
  };
}
