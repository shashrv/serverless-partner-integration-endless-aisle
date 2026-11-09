// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Builds a URL for a partner webhook path. The webhook base comes from the partner
 * table; it must be an https URL. Query values are encoded by URLSearchParams so
 * caller-supplied values cannot inject extra parameters or change the path.
 */
export const buildPartnerUrl = (
    webhook: unknown,
    path: string,
    query: Record<string, string> = {}
): URL => {
    if (typeof webhook !== 'string' || webhook.length === 0) {
        throw new Error('Partner webhook is not configured');
    }
    const base = new URL(webhook.endsWith('/') ? webhook : `${webhook}/`);
    if (base.protocol !== 'https:') {
        throw new Error('Partner webhook must use https');
    }
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
    }
    return url;
};

export interface JsonResponse<T = unknown> {
    ok: boolean;
    status: number;
    data: T | undefined;
}

/** Sends a request and parses a JSON body. Times out instead of hanging the Lambda. */
export const requestJson = async <T = unknown>(
    url: URL,
    init: { method: 'GET' | 'POST'; headers?: Record<string, string>; body?: unknown; timeoutMs?: number }
): Promise<JsonResponse<T>> => {
    const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers ?? {}) };
    let body: string | undefined;
    if (init.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(init.body);
    }
    const response = await fetch(url, {
        method: init.method,
        headers,
        body,
        redirect: 'error',
        signal: AbortSignal.timeout(init.timeoutMs ?? DEFAULT_TIMEOUT_MS)
    });
    const text = await response.text();
    let data: T | undefined;
    try {
        data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
        data = undefined;
    }
    return { ok: response.ok, status: response.status, data };
};
