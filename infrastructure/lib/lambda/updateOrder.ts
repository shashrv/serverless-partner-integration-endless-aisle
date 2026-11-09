// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { ConditionalCheckFailedException, DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OrderStatus } from './utils/schema';

const docClient = DynamoDBDocument.from(new DynamoDB({}));

const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME || '';
const ORDER_TABLE_PK = process.env.ORDER_TABLE_PK || '';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ORDER_STATUSES: string[] = Object.values(OrderStatus);

const respond = (statusCode: number, message: unknown): APIGatewayProxyResult => ({
    isBase64Encoded: false,
    statusCode,
    body: JSON.stringify({ message }),
    headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
});

/**
 * Updates the status of an existing order.
 *
 * Only `orderStatus` can be changed. Attribute names are fixed (never taken from the
 * request body), so callers cannot overwrite price, subscribers or other fields, or
 * inject into the UpdateExpression. The update only applies when the order exists and
 * belongs to the supplied partnerId.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (!event) {
        return respond(400, 'Invalid request');
    }
    if (event.httpMethod !== 'PATCH') {
        return respond(405, 'Method Not Supported');
    }

    const orderId = event.pathParameters?.id;
    if (!orderId || !ID_PATTERN.test(orderId) || !event.body) {
        return respond(400, 'Invalid parameters');
    }

    let body: { partnerId?: unknown; orderStatus?: unknown };
    try {
        body = JSON.parse(event.body);
    } catch {
        return respond(400, 'Body must be valid JSON');
    }

    const { partnerId, orderStatus } = body ?? {};
    if (typeof partnerId !== 'string' || !ID_PATTERN.test(partnerId)
        || typeof orderStatus !== 'string' || !ORDER_STATUSES.includes(orderStatus)) {
        return respond(400, 'invalid request parameters');
    }

    const params: UpdateCommandInput = {
        TableName: ORDER_TABLE_NAME,
        Key: { [ORDER_TABLE_PK]: orderId },
        UpdateExpression: 'SET #status = :status',
        ConditionExpression: 'attribute_exists(#pk) AND #partnerId = :partnerId',
        ExpressionAttributeNames: {
            '#status': 'orderStatus',
            '#pk': ORDER_TABLE_PK,
            '#partnerId': 'partnerId'
        },
        ExpressionAttributeValues: {
            ':status': orderStatus,
            ':partnerId': partnerId
        },
        ReturnValues: 'UPDATED_NEW'
    };

    try {
        const result = await docClient.update(params);
        return respond(200, result.Attributes ?? {});
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) {
            return respond(404, 'Order Data not found');
        }
        throw err;
    }
};
