// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { InfrastructureStack } from '../lib/infrastructure-stack';

let template: Template;

beforeAll(() => {
  const app = new App();
  const stack = new InfrastructureStack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  template = Template.fromStack(stack);
});

test('no application Lambda uses an end-of-life Node.js runtime', () => {
  const functions = template.findResources('AWS::Lambda::Function');
  const appFunctions = Object.values(functions).filter(
    (fn: any) => typeof fn.Properties.FunctionName === 'string',
  );
  expect(appFunctions.length).toBeGreaterThanOrEqual(7);
  for (const fn of appFunctions as any[]) {
    expect(fn.Properties.Runtime).toBe('nodejs24.x');
  }
});

test('Cognito client does not enable the OAuth implicit grant', () => {
  template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
    AllowedOAuthFlows: Match.arrayWith(['code']),
    PreventUserExistenceErrors: 'ENABLED',
  });
  const clients = template.findResources('AWS::Cognito::UserPoolClient');
  for (const client of Object.values(clients) as any[]) {
    expect(client.Properties.AllowedOAuthFlows ?? []).not.toContain('implicit');
  }
});

test('user pool disables self sign-up and enables optional TOTP MFA', () => {
  template.hasResourceProperties('AWS::Cognito::UserPool', {
    AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
    MfaConfiguration: 'OPTIONAL',
    EnabledMfas: ['SOFTWARE_TOKEN_MFA'],
  });
});

test('CloudFront uses Origin Access Control, HTTPS redirect and security headers', () => {
  template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: Match.objectLike({
      DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: 'redirect-to-https' }),
    }),
  });
  template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
    ResponseHeadersPolicyConfig: Match.objectLike({
      SecurityHeadersConfig: Match.objectLike({
        ContentSecurityPolicy: Match.objectLike({ ContentSecurityPolicy: Match.stringLikeRegexp("frame-ancestors 'none'") }),
        StrictTransportSecurity: Match.anyValue(),
      }),
    }),
  });
});

test('orders CORS preflight does not allow credentials', () => {
  const methods = template.findResources('AWS::ApiGateway::Method', { Properties: { HttpMethod: 'OPTIONS' } });
  const json = JSON.stringify(methods);
  expect(json).not.toContain("'Access-Control-Allow-Credentials':'true'");
  expect(json).not.toContain("method.response.header.Access-Control-Allow-Credentials\":\"'true'");
});

test('S3 buckets block public access and enforce TLS', () => {
  const buckets = template.findResources('AWS::S3::Bucket');
  for (const bucket of Object.values(buckets) as any[]) {
    expect(bucket.Properties.PublicAccessBlockConfiguration).toEqual({
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    });
  }
  template.hasResourceProperties('AWS::S3::BucketPolicy', {
    PolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([
        Match.objectLike({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } }),
      ]),
    }),
  });
});
