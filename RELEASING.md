# Releasing @raygun.io/aws-lambda

Raygun for AWS Lambda is published on https://www.npmjs.com/ as [`@raygun.io/aws-lambda`](https://www.npmjs.com/package/@raygun.io/aws-lambda).

## Semantic versioning

This NPM package follows semantic versioning,

Given a version number MAJOR.MINOR.PATCH (x.y.z), increment the:

- MAJOR version when you make incompatible changes
- MINOR version when you add functionality in a backward compatible manner
- PATCH version when you make backward compatible bug fixes

To learn more about semantic versioning check: https://semver.org/

## Preparing for release

### Release branch

Create a new branch named `release/x.y.z` 
where `x.y.z` is the Major, Minor and Patch release numbers.

### Update version

Update the `version` in the `package.json` file.

### Update and review the lockfile

Update lockfile metadata without installing packages or running lifecycle scripts:

```bash copy Copy Lockfile Update
npm install --package-lock-only --ignore-scripts
git diff -- package.json package-lock.json
```

For a version-only release change, expect only the package version metadata to change.
Investigate any unexpected dependency version, source URL, integrity hash, or install-script change before continuing.

### Install, build, and verify

Use the committed lockfiles and disable dependency lifecycle scripts, as CI does.
Run the project build explicitly because `--ignore-scripts` also skips its `prepare` hook.
The commands stop at the first failure; resolve it before continuing.

```bash copy Copy Release Checks
npm ci --ignore-scripts &&
npm run prepare &&
npm test &&
npm run eslint &&
npm run tseslint &&
npm run prettier:check &&
npm audit --include=dev &&
npm audit signatures &&
npm --prefix example ci --ignore-scripts &&
npm --prefix example audit --include=dev &&
npm --prefix example audit signatures &&
npm run test:example
```

Confirm the PR's supply-chain check passes before publishing. It also rejects known malicious package versions in both lockfiles.
Valid registry signatures and provenance do not establish that a package is free of malware.

### Update CHANGELOG.md

Add a new entry in the `CHANGELOG.md` file.

Obtain a list of changes using the following git command:

```
git log --pretty=format:"- %s (%as)"
```

### Run publish dry-run

After the explicit build and verification above, run a publish dry-run.
Confirm the package includes `build/raygun.aws.js` and `build/raygun.aws.d.ts`:

```bash copy Copy Publish Dry Run
npm publish --dry-run --ignore-scripts
```

Some npm versions still invoke the project's `prepare` hook during packaging despite `--ignore-scripts`.
This project's hook runs `tsc`; do not rely on publishing to perform the explicit build and verification above.

### Commit and open a PR

Commit all the changes into a commit with the message `chore: Release x.y.z`
where `x.y.z` is the Major, Minor and Patch release numbers.

Then push the branch and open a new PR, ask the team to review it.

## Publishing

### PR approval

Once the PR has been approved, you can publish the provider.

### Publish to npmjs.com

Run the publish command without `dry-run`.
You will need npmjs.com credentials to publish, 
as well as being part of the [Raygun organization](https://www.npmjs.com/~raygunowner).

If the checkout or dependencies changed since verification, repeat the install, build, verification, and dry-run steps first.

```bash copy Copy Publish Command
npm publish --ignore-scripts
```

Now the package is available for customers.

### Merge PR to main

With the PR approved and the package published, 
squash and merge the PR into `main`.

### Tag and create Github Release

Go to https://github.com/MindscapeHQ/raygun4node-aws-lambda/releases and create a new Release.

GitHub will create a tag for you, you don't need to create the tag manually.

You can also generate the release notes automatically.
