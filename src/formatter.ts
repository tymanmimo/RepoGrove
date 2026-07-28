import chalk from "chalk";
import Table from "cli-table3";

import type { ProfileStatistics } from "./analyzer.js";

function createTable(head: string[]): Table.Table {
  return new Table({
    head: head.map((value) => chalk.bold.magenta(value)),
    style: {
      border: [],
      head: [],
    },
  });
}

export function formatStatistics(statistics: ProfileStatistics): string {
  const summaryTable = createTable(["Metric", "Value"]);
  summaryTable.push(
    ["Public repositories", chalk.cyan(statistics.repositoryCount)],
    ["Total stars", chalk.yellow(statistics.starCount)],
  );

  const sections = [
    `${chalk.bold.blueBright("GitHub Profile")} ${chalk.bold.magenta(`@${statistics.username}`)}`,
    summaryTable.toString(),
  ];

  if (statistics.languages.length === 0) {
    sections.push(
      `${chalk.bold.blueBright("Languages")}\n${chalk.dim("No language data available.")}`,
    );
  } else {
    const languageTable = createTable(["Language", "Repositories", "Share"]);

    for (const language of statistics.languages) {
      languageTable.push([
        chalk.blueBright(language.name),
        language.repositoryCount,
        chalk.magenta(`${language.percentage}%`),
      ]);
    }

    sections.push(
      `${chalk.bold.blueBright("Languages")}\n${languageTable.toString()}`,
    );
  }

  if (statistics.activeProjects.length === 0) {
    sections.push(
      `${chalk.bold.blueBright("Active Projects")}\n${chalk.dim("No active projects available.")}`,
    );
  } else {
    const projectTable = createTable(["Project", "Language", "Stars", "Updated"]);

    for (const project of statistics.activeProjects) {
      projectTable.push([
        chalk.blueBright(project.name),
        project.language ?? chalk.dim("Unknown"),
        chalk.yellow(project.starCount),
        project.updatedAt?.slice(0, 10) ?? chalk.dim("Unknown"),
      ]);
    }

    const links = statistics.activeProjects
      .map(
        (project) =>
          `${chalk.magenta(project.name)} ${chalk.dim(project.url)}`,
      )
      .join("\n");

    sections.push(
      `${chalk.bold.blueBright("Active Projects")}\n${projectTable.toString()}\n${chalk.bold.blueBright("Links")}\n${links}`,
    );
  }

  return sections.join("\n\n");
}
