export interface Citation {
    readonly sourceId: string;
    readonly source: string;
    readonly fileName: string;
    readonly headingPath: readonly string[];
    readonly score: number;
}

export interface RagResponse {
    readonly answer: string;
    readonly citations: readonly Citation[];
}

export interface UploadResponse {
    readonly ingested: boolean;
    readonly fileName: string;
    readonly chunks: number;
}

function apiBaseUrl(): string {
    const configured = document.documentElement.dataset.apiBaseUrl;
    return (configured || 'http://localhost:3000').replace(/\/$/, '');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${apiBaseUrl()}${path}`, init);
    } catch {
        throw new Error('The policy service is unavailable. Please check that the API is running.');
    }

    const body = (await response.json().catch(() => undefined)) as { error?: unknown } | T | undefined;
    if (!response.ok) {
        const message =
            typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : undefined;
        throw new Error(message || 'The policy service returned an error.');
    }
    return body as T;
}

export function checkHealth(): Promise<{ status: string }> {
    return request('/health');
}

export function uploadPolicy(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return request('/documents', { method: 'POST', body: formData });
}

export function askPolicy(question: string): Promise<RagResponse> {
    return request('/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: question }),
    });
}
