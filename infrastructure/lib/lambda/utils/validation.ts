// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * Email rule shared by the API Gateway request model and the createOrder Lambda.
 * The website uses the same expression (website/src/components/Customer.jsx).
 */
export const EMAIL_PATTERN_SOURCE = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$';
const EMAIL_PATTERN = new RegExp(EMAIL_PATTERN_SOURCE);

export const isValidEmail = (value: unknown): value is string =>
    typeof value === 'string' && value.length <= 254 && EMAIL_PATTERN.test(value);
