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

### Run npm install

Run `npm install` to update the version in the `package-lock.json`.

### Update CHANGELOG.md

Add a new entry in the `CHANGELOG.md` file.

Obtain a list of changes using the following git command:

```
git log --pretty=format:"- %s (%as)"
```

### Run publish dry-run

Run a publish dry-run to ensure no errors appear:

```
npm publish --dry-run
```

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

```
npm publish
```

Now the package is available for customers.

### Merge PR to main

With the PR approved and the package published, 
squash and merge the PR into `main`.

### Tag and create Github Release

Go to https://github.com/MindscapeHQ/raygun4node-aws-lambda/releases and create a new Release.

GitHub will create a tag for you, you don't need to create the tag manually.

You can also generate the release notes automatically.

