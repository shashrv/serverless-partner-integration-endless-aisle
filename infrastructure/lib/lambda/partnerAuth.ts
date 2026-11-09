// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { APIGatewayAuthorizerResult, APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import { createHash, timingSafeEqual } from "crypto";
import { getParamFromSSM } from "./utils/getParameter";

const buildPolicy = (effect: "Allow" | "Deny", methodArn: string): APIGatewayAuthorizerResult => ({
    principalId: "PartnerCognito",
    policyDocument: {
        Version: "2012-10-17",
        Statement: [{ Action: "execute-api:Invoke", Resource: methodArn, Effect: effect }]
    }
});

/**
 * Constant-time string comparison. Hashing both sides first gives equal-length
 * buffers, so timingSafeEqual never throws and the length of the secret is not leaked.
 */
const safeEquals = (a: string, b: string): boolean => {
    const ha = createHash("sha256").update(a, "utf8").digest();
    const hb = createHash("sha256").update(b, "utf8").digest();
    return timingSafeEqual(ha, hb);
};

const getHeader = (headers: APIGatewayRequestAuthorizerEvent["headers"], name: string): string | undefined => {
    if (!headers) return undefined;
    const key = Object.keys(headers).find((h) => h.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : undefined;
};

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    const methodArn = event.methodArn;
    const authToken = getHeader(event.headers, "authorizationToken")?.trim();
    const tokenPath = process.env.TOKEN_PATH;

    // Fail closed on every missing input.
    if (!authToken || !tokenPath) {
        return buildPolicy("Deny", methodArn);
    }

    const expected = await getParamFromSSM(tokenPath);
    if (!expected) {
        return buildPolicy("Deny", methodArn);
    }

    return buildPolicy(safeEquals(authToken, expected) ? "Allow" : "Deny", methodArn);
};
