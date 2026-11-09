// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const secretsManager = new SecretsManagerClient({
    region: process.env.AWS_REGION
});

/**
 * Reads a secret string from AWS Secrets Manager.
 *
 * Fails closed: any error, or a missing/empty secret, returns `undefined`.
 * Callers MUST treat `undefined` as "no credential available". Never return the
 * caught error itself, because a caller comparing against `String(result)` would
 * then accept the error message as a valid token.
 */
export const getParamFromSSM = async (path: string): Promise<string | undefined> => {
    try {
        const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: path }));
        const value = result.SecretString?.trim();
        return value ? value : undefined;
    } catch (error) {
        // Log only the error name, not the message, to avoid leaking resource details.
        console.error(`Failed to read secret: ${(error as Error)?.name ?? 'UnknownError'}`);
        return undefined;
    }
};
