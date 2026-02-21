# Agents Guide — @raygun.io/aws-lambda

## Project Overview

Raygun Crash Reporting provider for AWS Lambda + Node.js, written in TypeScript.
Wraps AWS Lambda handlers to automatically capture uncaught errors and scope breadcrumbs per invocation.
Published on npm as `@raygun.io/aws-lambda`. Depends on the `raygun` Node.js client.

## Repository Structure

- `lib/` — TypeScript source (single file: `raygun.aws.ts`). Compiled to `build/` via `tsc`.
- `test/` — JavaScript tests using `tap`. Test utilities in `utils.js` spin up a mock Express server to capture Raygun payloads.
- `example/` — Example AWS Lambda project demonstrating usage.
- `.github/workflows/` — CI (Node 18/20/22 matrix: build, test, eslint, tseslint, prettier) and PR title linting (Conventional Commits).
- `build/` — Compiled output (gitignored). Entry point: `build/raygun.aws.js` + `build/raygun.aws.d.ts`.

## Build & Development

```bash
npm ci          # Install dependencies
npm run prepare # Compile TypeScript (tsc)
npm test        # Run tests: tap --disable-coverage test/*_test.js
npm run eslint  # Lint JS files (test/, example/)
npm run tseslint # Lint TS files (lib/)
npm run prettier # Format code
```

## Code Conventions

- **Language**: TypeScript in `lib/`, JavaScript in `test/` and `example/`.
- **Module system**: CommonJS (`module: "commonjs"`, `target: "es5"`).
- **Style**: Double quotes, semicolons required, 2-space indentation, "one true brace style", arrow parens always. Enforced by ESLint + Prettier.
- **Testing**: `tap` test framework. Tests require the TS source directly (`require("../lib/raygun.aws")`), not the compiled build. Each test creates an isolated mock server via `makeClientWithMockServer()`.
- **PR titles**: Must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (enforced by CI).

## Key Patterns

- The core export is `awsHandler(config, handler)` which wraps an AWS Lambda handler (async or callback-style) to capture errors and scope breadcrumbs.
- Callback-style handlers are converted to async via `createAsyncHandler`.
- Errors are sent to Raygun with the Lambda context as custom data and an `"AWS Handler"` tag, then rethrown to AWS.
- Breadcrumbs are scoped per invocation using `runWithBreadcrumbsAsync` from the `raygun` package.

## Core Dependency — raygun4node

This package is a lightweight wrapper around the `raygun` Node.js client (installed from npm as a runtime dependency).

### Key integration points

- **`Client`** (`raygun`): The main Raygun client class. Initialized externally and passed via `AwsHandlerConfig`. Used for `client.send()` and `client.addBreadcrumb()`.
- **`runWithBreadcrumbsAsync`** (`raygun/build/raygun.breadcrumbs`): Scopes breadcrumbs per Lambda invocation using `AsyncLocalStorage`. Ensures breadcrumbs from concurrent invocations don't leak across requests.
- **`SendParameters`** (`raygun` types): The `{ customData, tags }` shape passed to `client.send()`.
- **`BreadcrumbMessage`** (`raygun` types): The shape passed to `client.addBreadcrumb()` — includes `message`, `level`, `category`, and `customData`.

### raygun4node structure (for reference)

- `lib/raygun.ts` — Main `Client` class with `send()`, `addBreadcrumb()`, `init()`, `stop()`.
- `lib/raygun.breadcrumbs.ts` — `addBreadcrumb()`, `getBreadcrumbs()`, `runWithBreadcrumbsAsync()`, `clear()`.
- `lib/types.ts` — All shared TypeScript types (`Breadcrumb`, `SendParameters`, `CustomData`, etc.).

## Important Notes

- Do not add unnecessary dependencies; this is a lightweight wrapper around the `raygun` client.
- The `raygun` package is a runtime dependency; `@types/aws-lambda` provides Lambda type definitions.
- Releases follow semver. See `RELEASING.md` for the full release process.
- CI runs on Node 18, 20, and 22. Ensure compatibility with all LTS versions.
