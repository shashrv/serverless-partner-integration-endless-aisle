// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { SQSEvent } from 'aws-lambda';
import { getParamFromSSM } from './utils/getParameter';
import { buildPartnerUrl, requestJson } from './utils/http';
import { isValidEmail } from './utils/validation';
import { ItemRequestSchema, OrderSchema, OrderStatus } from "./utils/schema";

const docClient = DynamoDBDocument.from(new DynamoDB({}));

const PARTNER_TABLE_NAME = process.env.PARTNER_TABLE_NAME || '';
const ORDER_TABLE_NAME = process.env.ORDER_TABLE_NAME || '';
const PARTNER_TABLE_PK = process.env.PARTNER_TABLE_PK || '';
const OrderTax = 8;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

interface PartnerOrderResponse {
    orderId?: string;
    message?: string;
}

/**
 * Consumes one order request from SQS (batch size 1), places it with the partner and
 * stores the result. Infrastructure failures throw, so SQS redrives the message to the
 * DLQ instead of dropping the order. Invalid messages are logged and discarded.
 */
export const handler = async (event: SQSEvent) => {
    const record = event?.Records?.[0];
    if (!record) {
        console.error('Empty SQS event');
        return;
    }

    let orderedItem: ItemRequestSchema;
    try {
        orderedItem = typeof record.body === 'object' ? record.body : JSON.parse(record.body);
    } catch {
        console.error(`Discarding message ${record.messageId}: body is not valid JSON`);
        return;
    }

    const { requestedItem, customer } = orderedItem ?? {};
    const quantity = Number(requestedItem?.quantity);
    const price = Number(requestedItem?.price);
    if (!requestedItem || !isValidEmail(customer?.email)
        || typeof requestedItem.partnerId !== 'string' || !ID_PATTERN.test(requestedItem.partnerId)
        || typeof requestedItem.itemId !== 'string' || !ID_PATTERN.test(requestedItem.itemId)
        || !Number.isInteger(quantity) || quantity < 1
        || !Number.isFinite(price) || price < 0) {
        console.error(`Discarding message ${record.messageId}: invalid order payload`);
        return;
    }

    const partnerInfo = await docClient.get({
        TableName: PARTNER_TABLE_NAME,
        Key: { [PARTNER_TABLE_PK]: requestedItem.partnerId }
    }).then((data) => data.Item);
    if (!partnerInfo) {
        console.error(`Discarding message ${record.messageId}: unknown partnerId ${requestedItem.partnerId}`);
        return;
    }

    if (!process.env.TOKEN_PATH) {
        throw new Error('TOKEN_PATH is not configured');
    }
    const authorizationToken = await getParamFromSSM(process.env.TOKEN_PATH);
    if (!authorizationToken) {
        throw new Error('Unable to read partner token');
    }

    const url = buildPartnerUrl(partnerInfo.webhook, 'inventory');
    // Send only the fields the partner API needs; customer PII stays in this account.
    const result = await requestJson<PartnerOrderResponse>(url, {
        method: 'POST',
        headers: { authorizationToken },
        body: {
            itemId: requestedItem.itemId,
            sku: requestedItem.sku,
            quantity,
            partner: requestedItem.partner,
            partnerId: requestedItem.partnerId
        }
    });

    const orderId = result.ok ? result.data?.orderId : undefined;
    if (!orderId) {
        console.warn(`Partner rejected order for item ${requestedItem.itemId} with status ${result.status}`);
        return;
    }

    const message = `Order Placed for order id ${orderId} with reference item ID : ${requestedItem.itemId}`;
    const item: OrderSchema = {
        orderId: `${orderId}`,
        partnerId: requestedItem.partnerId,
        product: {
            itemId: requestedItem.itemId,
            quantity,
            size: requestedItem.size
        },
        messageId: record.messageId,
        orderDate: Date.now(),
        price,
        subtotal: price + price * (OrderTax / 100),
        salestax: `${OrderTax}%`,
        orderStatus: OrderStatus.Completed,
        statusDescription: message,
        partner: requestedItem.partner,
        subscribers: [{
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            address: customer.address
        }]
    };

    await docClient.put({
        TableName: ORDER_TABLE_NAME,
        Item: item,
        // Never overwrite an existing order with the same id.
        ConditionExpression: 'attribute_not_exists(orderId)'
    });
    console.log(`Stored order ${orderId} for message ${record.messageId}`);
};
