// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

const mockGetSecret = jest.fn();
jest.mock('../lib/lambda/utils/getParameter', () => ({
  getParamFromSSM: (...args: unknown[]) => mockGetSecret(...args),
}));

import { handler } from '../lib/lambda/partnerAuth';

const ARN = 'arn:aws:execute-api:us-east-1:123456789012:abc/prod/GET/inventory';

const event = (headers: Record<string, string> | null): APIGatewayRequestAuthorizerEvent =>
  ({ methodArn: ARN, headers } as unknown as APIGatewayRequestAuthorizerEvent);

const effectOf = (result: Awaited<ReturnType<typeof handler>>) =>
  (result.policyDocument.Statement[0] as { Effect: string }).Effect;

beforeEach(() => {
  process.env.TOKEN_PATH = 'partnerToken';
  mockGetSecret.mockReset();
});

test('allows a matching token', async () => {
  mockGetSecret.mockResolvedValue('s3cret-token');
  expect(effectOf(await handler(event({ authorizationToken: 's3cret-token' })))).toBe('Allow');
});

test('header lookup is case-insensitive', async () => {
  mockGetSecret.mockResolvedValue('s3cret-token');
  expect(effectOf(await handler(event({ AuthorizationToken: 's3cret-token' })))).toBe('Allow');
});

test('denies a wrong token', async () => {
  mockGetSecret.mockResolvedValue('s3cret-token');
  expect(effectOf(await handler(event({ authorizationToken: 'nope' })))).toBe('Deny');
});

test('denies a missing header', async () => {
  mockGetSecret.mockResolvedValue('s3cret-token');
  expect(effectOf(await handler(event({})))).toBe('Deny');
  expect(effectOf(await handler(event(null)))).toBe('Deny');
});

test('fails closed when the secret cannot be read (regression: error string accepted as token)', async () => {
  // Before the fix, getParamFromSSM returned the caught Error and the authorizer compared
  // the header against error.toString(), so sending the error text was accepted.
  mockGetSecret.mockResolvedValue(undefined);
  const forged = 'AccessDeniedException: User is not authorized';
  expect(effectOf(await handler(event({ authorizationToken: forged })))).toBe('Deny');
  expect(effectOf(await handler(event({ authorizationToken: 'undefined' })))).toBe('Deny');
});

test('denies when TOKEN_PATH is not configured', async () => {
  delete process.env.TOKEN_PATH;
  mockGetSecret.mockResolvedValue('s3cret-token');
  expect(effectOf(await handler(event({ authorizationToken: 's3cret-token' })))).toBe('Deny');
  expect(mockGetSecret).not.toHaveBeenCalled();
});
