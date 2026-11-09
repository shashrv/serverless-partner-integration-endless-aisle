// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Function to send a message to SNS topic

import { DynamoDBStreamEvent } from 'aws-lambda';

import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { SES } from "@aws-sdk/client-ses";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const SES_EMAIL_FROM = process.env.STORE_EMAIL || "";

export const handler = async (event: DynamoDBStreamEvent) => {
    if (!event.Records) {
        return Promise.resolve(event).then(() => {
            return { statusCode: 400, body: 'invalid request, missing the parameters in body' };
        });
    }
    else {
        // Read event from dynamoDB stream and send email using SES service to email field in event record body
        const record = event.Records[0];
        if (record.dynamodb) {
            if (!record.dynamodb || !record.dynamodb.NewImage) {
                return Promise.resolve(event).then(() => {
                    return { statusCode: 400, body: 'invalid request, missing the parameters in body' };
                });
            } else {
                const newImage = unmarshall(
                    record.dynamodb.NewImage as { [key: string]: AttributeValue }
                );
                try {

                    const orderId = newImage.orderId;
                    const statusDescription = newImage.statusDescription;
                    const email = newImage.subscribers?.[0]?.email;
                    const partner = newImage.partner;
                    // Do not log customer name, email or address (PII).
                    console.log(`Notifying store about order ${orderId}`);

                    if (!orderId || !email || !statusDescription || !partner)
                        throw new Error('Properties orderId, email, partner and message are required');

                    return await sendEmail(orderId, email, partner, statusDescription);
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        return JSON.stringify({ body: { error: error.message }, statusCode: 400 });
                    }
                    return JSON.stringify({
                        body: { error: JSON.stringify(error) },
                        statusCode: 400,
                    });
                }
            }

        } else {
            return Promise.resolve(event).then(() => {
                return { statusCode: 400, body: 'invalid request, missing the parameters in body' };
            });
        }
    }
}


export type ContactDetails = {
    orderId: string;
    email: string;
    orderStatus: string;
};

async function sendEmail(orderId: string, email: string, partner: string, orderStatus: string) {
    const subject = `${partner} order ${orderId} status updated`;

    const ses = new SES({ apiVersion: '2010-12-01', region: process.env.AWS_REGION });

    const template = `Hi ${partner}, \n\n Your customer with the email ${email} has placed an order with order id ${orderId} \n \n The status of the order has been updated to ${orderStatus}. \n \n Please connect with customer for further processings. \n \n Thanks, \n AnyCompany Team`;

    const toAddresses = SES_EMAIL_FROM.split(',');
    const emailParams = {
        Destination: {
            ToAddresses: toAddresses,
        },
        Message: {
            Body: {
                Text: { Data: template },
            },
            Subject: { Data: subject },
        },
        Source: toAddresses[0],
    };

    try {
        const result = await ses.sendEmail(emailParams);
        console.log(`Order notification sent, messageId ${result.MessageId}`);
    } catch (e) {
        console.error(`Failed to send order notification: ${(e as Error)?.name}`);
    }
    return;
}