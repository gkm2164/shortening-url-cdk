# Welcome to Shortening URL CDK TypeScript project!

This is a shortening URL project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Prerequisite
- Node version is 16.x
- Install CDK CLI.

## How to build?

1. build lambda
```npm run build-lambda```
2. synthesize stack
```npx cdk synth```
3. deploy!
```npx cdk deploy```

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Directory structure
- src: lambda
- bin: scaffolding of the project, maybe entry
- lib: infrastructure codes, perhaps stacks