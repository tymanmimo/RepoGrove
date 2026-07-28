import type { ProfileStatistics } from "../../src/core/profile-analyzer.js";

export const profileStatistics: ProfileStatistics = {
  username: "octocat",
  repositoryCount: 8,
  starCount: 21_868,
  languages: [
    {
      name: "TypeScript",
      repositoryCount: 4,
      percentage: 80,
    },
    {
      name: "JavaScript",
      repositoryCount: 1,
      percentage: 20,
    },
  ],
  activeProjects: [
    {
      name: "hello-world",
      language: "TypeScript",
      starCount: 42,
      url: "https://github.com/octocat/hello-world",
      updatedAt: "2026-07-28T00:00:00Z",
    },
  ],
};
