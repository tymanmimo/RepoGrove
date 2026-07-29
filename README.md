# RepoGrove

```text
       ██
    ██ ██ ██
  ████████████
     ██████
       ██
    REPOGROVE
```

**Explore public GitHub profiles without leaving your terminal.**

[![CI](https://github.com/tymanmimo/repogrove/actions/workflows/ci.yml/badge.svg)](https://github.com/tymanmimo/repogrove/actions/workflows/ci.yml)
![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-6F9B72)

RepoGrove is a forest-themed interactive terminal UI for inspecting public
GitHub profiles. It combines repository statistics, language distribution,
active projects, recent searches, and optional authenticated API access in a
responsive workspace.

## Features

- Search any public GitHub account from an interactive terminal workspace.
- Review repository totals, accumulated stars, and primary-language distribution.
- Discover recently updated projects while filtering out forks and archived repositories.
- Repeat or clear up to ten recent searches from the history sidebar.
- Use GitHub anonymously, through `GITHUB_TOKEN`, or with a token saved in the
  operating system credential store.
- Replace or delete saved credentials without leaving the application.
- Cancel in-flight searches and recover from API, network, history, and
  credential-store failures.
- Adapt the interface to compact, stacked, and wide terminal layouts.

## Requirements

- [Node.js](https://nodejs.org/) 22 or newer
- npm
- An interactive terminal

## Getting Started

Clone the repository and install the exact dependency versions from the lockfile:

```bash
git clone https://github.com/tymanmimo/repogrove.git
cd repogrove
npm ci
npm run dev
```

To build and run the compiled application:

```bash
npm run build
npm start
```

To expose the `repogrove` command from a local checkout:

```bash
npm link
repogrove
```

RepoGrove requires both stdin and stdout to be attached to a TTY. It cannot
render through a pipe or redirected output.

## Authentication

Authentication is optional. Anonymous requests work immediately but are
subject to GitHub's unauthenticated API limits.

On startup, RepoGrove lets you:

- use a token already saved in the operating system credential store;
- use the current `GITHUB_TOKEN` environment variable;
- enter, validate, and securely save a new token;
- continue without a token.

Use a least-privilege token intended for public data. Tokens entered in the
application are masked, validated against GitHub, and stored through
[`@napi-rs/keyring`](https://github.com/Brooooooklyn/keyring-node). RepoGrove
does not write tokens to its history file.

You can also provide a token for the current shell session.

macOS and Linux:

```bash
GITHUB_TOKEN=github_pat_your_token npm run dev
```

Windows PowerShell:

```powershell
$env:GITHUB_TOKEN = "github_pat_your_token"
npm run dev
```

## Controls

| Key | Action |
| --- | --- |
| `Enter` | Submit a search or activate the selected item |
| `Tab` | Switch focus between search and history |
| `Up` / `Down` | Move through a selection list |
| `k` / `j` | Move through a selection list |
| `1`-`9` | Select a numbered menu item |
| `Ctrl+T` | Open token settings |
| `Esc` | Cancel the current operation or return from token settings |
| `Ctrl+C` | Exit RepoGrove |

## Profile Metrics

| Metric | Meaning |
| --- | --- |
| Public repositories | Count reported by the GitHub profile |
| Total stars | Stars across all fetched repositories owned by the account |
| Languages | Share of repositories grouped by their GitHub primary language |
| Active projects | Up to five recent non-fork, non-archived repositories |

Language percentages describe repository counts, not source-code bytes. Active
projects are selected by recency rather than an activity score.

## Local Data

Saved tokens are delegated to the operating system credential store. Search
history is a local JSON file containing usernames and timestamps; it does not
contain profile responses or credentials.

History behavior:

- stores at most ten unique usernames;
- keeps the newest search first;
- treats username casing as equivalent;
- writes updates through a temporary file and atomic rename;
- remains optional when local storage is unavailable or corrupted.

GitHub requests and credential operations use timeouts. Active searches can be
cancelled with `Esc`, and user-facing errors avoid exposing raw API responses or
credentials.

## Responsive Layout

RepoGrove adjusts its workspace to the available terminal size:

- narrow terminals stack history above search results;
- short terminals reduce history and result detail;
- wide terminals show more languages, projects, and repository URLs;
- the full pixel logo falls back to a compact wordmark when space is limited.

The UI is tested at representative `30x12`, `50x20`, and `100x40` terminal sizes.

## Architecture

```text
src/
├── cli.ts                 TTY entry point and Ink lifecycle
├── core/                  Pure profile statistics
├── github/                Octokit requests and safe errors
├── storage/               Credential and history persistence
└── ui/
    ├── app.tsx            State, navigation, and cancellation
    ├── screens/            Welcome and token setup
    └── workspace/         Search, history, and results panels
```

RepoGrove is built with TypeScript, React,
[Ink](https://github.com/vadimdemedes/ink),
[Octokit](https://github.com/octokit/octokit.js), and Commander.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the TypeScript entry point |
| `npm run build` | Clean and compile the project |
| `npm start` | Run the compiled application |
| `npm run lint` | Check source and tests with ESLint |
| `npm run typecheck` | Type-check application and test configurations |
| `npm test` | Run the Node and Ink test suites |
| `npm run check` | Run lint, type-checking, tests, and build |

## Continuous Integration

GitHub Actions validates every push and pull request to `main` with:

- linting and type-checking on Ubuntu;
- tests on Ubuntu, Windows, and macOS;
- a production build on Ubuntu;
- an audit that blocks high and critical dependency vulnerabilities.

## Limitations

- RepoGrove analyzes public profiles and owned public repositories only.
- It does not analyze contributions, commits, pull requests, issues, followers,
  or source-code quality.
- GitHub API rate limits still apply to authenticated requests.
- The application requires an interactive terminal and does not accept a
  username as a CLI argument.
- RepoGrove is currently installed from source and is not published to npm.
