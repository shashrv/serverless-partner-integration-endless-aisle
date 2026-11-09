// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getParamFromSSM } from './utils/getParameter';
import { buildPartnerUrl, requestJson } from './utils/http';
import { Partner } from './utils/schema';

const docClient = DynamoDBDocument.from(new DynamoDB({}));
const PARTNER_TABLE_NAME = process.env.PARTNER_TABLE_NAME || '';
const PARTNER_TABLE_PK = process.env.PARTNER_TABLE_PK || '';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const QUANTITY_PATTERN = /^[1-9][0-9]{0,3}$/;
const PARTNERS: string[] = Object.values(Partner);

const respond = (statusCode: number, message: unknown): APIGatewayProxyResult => ({
    isBase64Encoded: false,
    statusCode,
    body: JSON.stringify({ message }),
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (!event) {
        return respond(400, 'Invalid request');
    }
    if (event.httpMethod !== 'GET') {
        return respond(405, 'Method Not Supported');
    }

    const itemId = event.pathParameters?.id;
    const partner = event.queryStringParameters?.partner;
    const partnerId = event.queryStringParameters?.partnerId;
    const quantity = event.queryStringParameters?.quantity;

    // Validate every value that is forwarded to the partner API or used as a DynamoDB key.
    if (!itemId || !ID_PATTERN.test(itemId)
        || !partnerId || !ID_PATTERN.test(partnerId)
        || !partner || !PARTNERS.includes(partner)
        || !quantity || !QUANTITY_PATTERN.test(quantity)) {
        return respond(400, 'invalid request parameters');
    }

    const partnerInfo = await docClient.get({
        TableName: PARTNER_TABLE_NAME,
        Key: { [PARTNER_TABLE_PK]: partnerId }
    }).then((data) => data.Item);
    if (!partnerInfo) {
        return respond(400, 'invalid partner configuration');
    }

    if (!process.env.TOKEN_PATH) {
        return respond(500, 'Token path not configured');
    }
    const authorizationToken = await getParamFromSSM(process.env.TOKEN_PATH);
    if (!authorizationToken) {
        return respond(500, 'Error getting partner token');
    }

    let url: URL;
    try {
        url = buildPartnerUrl(partnerInfo.webhook, 'inventory', { itemId, partner, partnerId, quantity });
    } catch (err) {
        console.error(`Invalid partner webhook for partnerId ${partnerId}: ${(err as Error).message}`);
        return respond(500, 'invalid partner configuration');
    }

    try {
        const result = await requestJson(url, {
            method: 'GET',
            headers: { authorizationToken }
        });
        if (!result.ok) {
            return respond(result.status === 404 ? 404 : 502, 'Item Not found');
        }
        return respond(200, JSON.stringify(result.data));
    } catch (err) {
        console.error(`Partner inventory request failed: ${(err as Error).name}`);
        return respond(502, 'Request Failed');
    }
};
