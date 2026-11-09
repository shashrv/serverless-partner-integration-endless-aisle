#!/usr/bin/env sh
# Installs dependencies, compiles the CDK app and Lambda handlers, runs tests and
# synthesizes the CloudFormation template (including cdk-nag checks).
# The website is built during deployment by CodeBuild (@cdklabs/deploy-time-build).
set -eu

cd "$(dirname "$0")/infrastructure"
npm ci
npm run build
npm test
npx cdk synth InfrastructureStack
