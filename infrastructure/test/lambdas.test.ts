// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { APIGatewayProxyEvent } from 'aws-lambda';

const mockUpdate = jest.fn();
const mockGet = jest.fn();
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocument: { from: () => ({ update: mockUpdate, get: mockGet }) },
}));

const mockGetSecret = jest.fn();
jest.mock('../lib/lambda/utils/getParameter', () => ({
  getParamFromSSM: (...args: unknown[]) => mockGetSecret(...args),
}));

process.env.ORDER_TABLE_NAME = 'orders-table';
process.env.ORDER_TABLE_PK = 'orderId';
process.env.PARTNER_TABLE_NAME = 'partners-table';
process.env.PARTNER_TABLE_PK = 'partnerId';
process.env.TOKEN_PATH = 'partnerToken';

import { handler as getItem } from '../lib/lambda/getItem';
import { handler as updateOrder } from '../lib/lambda/updateOrder';
import { buildPartnerUrl } from '../lib/lambda/utils/http';

const apiEvent = (overrides: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent =>
  ({ httpMethod: 'GET', headers: {}, pathParameters: null, queryStringParameters: null, body: null, ...overrides } as APIGatewayProxyEvent);

beforeEach(() => {
  mockUpdate.mockReset();
  mockGet.mockReset();
  mockGetSecret.mockReset();
});

describe('updateOrder', () => {
  test('only updates orderStatus with fixed attribute names and an ownership condition', async () => {
    mockUpdate.mockResolvedValue({ Attributes: { orderStatus: 'Delivered' } });
    const res = await updateOrder(apiEvent({
      httpMethod: 'PATCH',
      pathParameters: { id: 'order-1' },
      // Extra attacker-controlled fields must be ignored.
      body: JSON.stringify({ partnerId: '1', orderStatus: 'Delivered', price: 0, 'a = :a, #b': 'x' }),
    }));
    expect(res.statusCode).toBe(200);
    const params = mockUpdate.mock.calls[0][0];
    expect(params.UpdateExpression).toBe('SET #status = :status');
    expect(params.ConditionExpression).toBe('attribute_exists(#pk) AND #partnerId = :partnerId');
    expect(params.ExpressionAttributeValues).toEqual({ ':status': 'Delivered', ':partnerId': '1' });
    expect(JSON.stringify(params)).not.toContain('price');
  });

  test('rejects unknown order statuses', async () => {
    const res = await updateOrder(apiEvent({
      httpMethod: 'PATCH',
      pathParameters: { id: 'order-1' },
      body: JSON.stringify({ partnerId: '1', orderStatus: 'Refunded-to-me' }),
    }));
    expect(res.statusCode).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('rejects malformed JSON', async () => {
    const res = await updateOrder(apiEvent({ httpMethod: 'PATCH', pathParameters: { id: 'order-1' }, body: '{' }));
    expect(res.statusCode).toBe(400);
  });
});

describe('getItem', () => {
  test('rejects query values that would inject into the partner URL', async () => {
    const res = await getItem(apiEvent({
      pathParameters: { id: '1' },
      queryStringParameters: { partner: 'Partner1', partnerId: '1&admin=true', quantity: '1' },
    }));
    expect(res.statusCode).toBe(400);
    expect(mockGet).not.toHaveBeenCalled();
  });

  test('rejects partners outside the allowed list', async () => {
    const res = await getItem(apiEvent({
      pathParameters: { id: '1' },
      queryStringParameters: { partner: 'Evil', partnerId: '1', quantity: '1' },
    }));
    expect(res.statusCode).toBe(400);
  });

  test('calls the partner with encoded query parameters', async () => {
    mockGet.mockResolvedValue({ Item: { partnerId: '1', webhook: 'https://partner.example.com/prod/' } });
    mockGetSecret.mockResolvedValue('tok');
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'available' }), { status: 200 }),
    );
    const res = await getItem(apiEvent({
      pathParameters: { id: '7' },
      queryStringParameters: { partner: 'Partner1', partnerId: '1', quantity: '2' },
    }));
    expect(res.statusCode).toBe(200);
    const [url, init] = fetchSpy.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://partner.example.com/prod/inventory?itemId=7&partner=Partner1&partnerId=1&quantity=2');
    expect((init.headers as Record<string, string>).authorizationToken).toBe('tok');
    expect(init.redirect).toBe('error');
    fetchSpy.mockRestore();
  });
});

describe('buildPartnerUrl', () => {
  test('rejects non-https webhooks', () => {
    expect(() => buildPartnerUrl('http://partner.example.com/', 'inventory')).toThrow('https');
    expect(() => buildPartnerUrl(undefined, 'inventory')).toThrow();
  });

  test('keeps the webhook path and encodes values', () => {
    const url = buildPartnerUrl('https://p.example.com/prod', 'inventory', { q: 'a&b=c' });
    expect(url.toString()).toBe('https://p.example.com/prod/inventory?q=a%26b%3Dc');
  });
});

describe('isValidEmail', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isValidEmail } = require('../lib/lambda/utils/validation');
  test.each(['a@example.com', 'first.last+tag@sub.example.co.uk'])('accepts %s', (v) => {
    expect(isValidEmail(v)).toBe(true);
  });
  test.each(['', 'anything', 'a@b', 'a@b.c', 'a b@example.com', '@example.com', 'a@@example.com', 42, null])(
    'rejects %p', (v) => {
      expect(isValidEmail(v)).toBe(false);
    });
});
