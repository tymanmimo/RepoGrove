import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeGitHubData } from "../src/analyzer.js";
import type { GitHubData } from "../src/github.js";

type Repository = GitHubData["repositories"][number];

function createRepository(
  name: string,
  overrides: Partial<Repository> = {},
): Repository {
  return {
    name,
    language: null,
    stargazers_count: 0,
    fork: false,
    archived: false,
    html_url: `https://github.com/test-user/${name}`,
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Repository;
}

function createGitHubData(
  repositories: Repository[],
  publicRepos = repositories.length,
): GitHubData {
  return {
    profile: {
      login: "test-user",
      public_repos: publicRepos,
    } as GitHubData["profile"],
    repositories,
  };
}

describe("analyzeGitHubData", () => {
  it("calculates repository, star, and language statistics", () => {
    const data = createGitHubData([
      createRepository("typescript-one", {
        language: "TypeScript",
        stargazers_count: 5,
      }),
      createRepository("javascript", {
        language: "JavaScript",
        stargazers_count: 2,
      }),
      createRepository("typescript-two", {
        language: "TypeScript",
        stargazers_count: 3,
      }),
      createRepository("unknown", {
        stargazers_count: 1,
      }),
    ]);

    const statistics = analyzeGitHubData(data);

    assert.equal(statistics.username, "test-user");
    assert.equal(statistics.repositoryCount, 4);
    assert.equal(statistics.starCount, 11);
    assert.deepEqual(statistics.languages, [
      {
        name: "TypeScript",
        repositoryCount: 2,
        percentage: 66.7,
      },
      {
        name: "JavaScript",
        repositoryCount: 1,
        percentage: 33.3,
      },
    ]);
  });

  it("filters, sorts, and limits active projects", () => {
    const data = createGitHubData([
      createRepository("sixth", {
        updated_at: "2026-01-01T00:00:00Z",
      }),
      createRepository("fourth", {
        updated_at: "2026-03-01T00:00:00Z",
      }),
      createRepository("second", {
        updated_at: "2026-05-01T00:00:00Z",
      }),
      createRepository("fifth", {
        updated_at: "2026-02-01T00:00:00Z",
      }),
      createRepository("first", {
        updated_at: "2026-06-01T00:00:00Z",
      }),
      createRepository("third", {
        updated_at: "2026-04-01T00:00:00Z",
      }),
      createRepository("fork", {
        fork: true,
        updated_at: "2026-08-01T00:00:00Z",
      }),
      createRepository("archived", {
        archived: true,
        updated_at: "2026-07-01T00:00:00Z",
      }),
    ]);

    const statistics = analyzeGitHubData(data);

    assert.deepEqual(
      statistics.activeProjects.map((project) => project.name),
      ["first", "second", "third", "fourth", "fifth"],
    );
  });

  it("handles empty data and missing optional fields", () => {
    const emptyStatistics = analyzeGitHubData(createGitHubData([]));
    const repository = {
      name: "minimal",
      fork: false,
      archived: false,
      html_url: "https://github.com/test-user/minimal",
    } as Repository;
    const minimalStatistics = analyzeGitHubData(createGitHubData([repository]));

    assert.equal(emptyStatistics.starCount, 0);
    assert.deepEqual(emptyStatistics.languages, []);
    assert.deepEqual(emptyStatistics.activeProjects, []);
    assert.deepEqual(minimalStatistics.activeProjects, [
      {
        name: "minimal",
        language: null,
        starCount: 0,
        url: "https://github.com/test-user/minimal",
        updatedAt: null,
      },
    ]);
  });
});
