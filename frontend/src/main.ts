import { askPolicy, checkHealth, uploadPolicy, type Citation, type RagResponse } from './api.js';

const supportedExtensions = new Set(['.md', '.markdown', '.txt']);
const refusalAnswer = 'The information is not available in the provided documents.';

const fileInput = required<HTMLInputElement>('policy-file');
const uploadStatus = required<HTMLDivElement>('upload-status');
const questionForm = required<HTMLFormElement>('question-form');
const questionInput = required<HTMLTextAreaElement>('question-input');
const askButton = required<HTMLButtonElement>('ask-button');
const queryStatus = required<HTMLDivElement>('query-status');
const answerPanel = required<HTMLElement>('answer-panel');
const answerText = required<HTMLParagraphElement>('answer-text');
const answerKind = required<HTMLSpanElement>('answer-kind');
const sourcesSection = required<HTMLElement>('sources-section');
const sourcesList = required<HTMLDivElement>('sources-list');
const sourceCount = required<HTMLSpanElement>('source-count');
const healthStatus = required<HTMLDivElement>('health-status');

void checkHealth()
    .then(() => {
        healthStatus.textContent = 'API connected';
        healthStatus.classList.add('is-online');
    })
    .catch(() => {
        healthStatus.textContent = 'API unavailable';
        healthStatus.classList.add('is-offline');
    });

fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!isSupportedFile(file.name)) {
        fileInput.value = '';
        setStatus(uploadStatus, 'error', 'Unsupported file. Choose a .md, .markdown, or .txt policy.');
        return;
    }

    setStatus(uploadStatus, 'loading', 'Uploading…');
    fileInput.disabled = true;
    void uploadPolicy(file)
        .then((result) => {
            setStatus(
                uploadStatus,
                'success',
                `✓ ${result.fileName} uploaded · ${result.chunks} chunk${result.chunks === 1 ? '' : 's'} indexed`,
            );
        })
        .catch((error: unknown) => {
            setStatus(uploadStatus, 'error', errorMessage(error, 'Unable to upload the policy. Please try again.'));
            fileInput.value = '';
        })
        .finally(() => {
            fileInput.disabled = false;
        });
});

questionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = questionInput.value.trim();
    if (!question) {
        setStatus(queryStatus, 'error', 'Enter a question about your policies first.');
        questionInput.focus();
        return;
    }

    setStatus(queryStatus, 'loading', 'Searching policies…');
    setAnswerLoading(true);
    void askPolicy(question)
        .then(renderAnswer)
        .catch((error: unknown) => {
            setStatus(queryStatus, 'error', errorMessage(error, 'Unable to get an answer. Please try again.'));
        })
        .finally(() => {
            setAnswerLoading(false);
        });
});

questionInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        questionForm.requestSubmit();
    }
});

function renderAnswer(response: RagResponse): void {
    if (!response || typeof response.answer !== 'string' || !response.answer.trim()) {
        setStatus(queryStatus, 'error', 'The policy service returned an empty answer. Please try again.');
        return;
    }

    answerPanel.classList.remove('is-hidden');
    answerText.textContent = response.answer;
    const isRefusal = response.answer.trim() === refusalAnswer;
    answerKind.textContent = isRefusal ? 'Not enough policy information' : 'From your policies';
    answerKind.classList.toggle('is-refusal', isRefusal);
    renderCitations(Array.isArray(response.citations) ? response.citations : []);
    setStatus(queryStatus, 'success', 'Answer ready');
}

function renderCitations(citations: readonly Citation[]): void {
    sourcesList.replaceChildren();
    if (citations.length === 0) {
        sourcesSection.classList.add('is-hidden');
        return;
    }

    sourceCount.textContent = `${citations.length} source${citations.length === 1 ? '' : 's'}`;
    citations.forEach((citation) => {
        const card = document.createElement('article');
        card.className = 'source-card';

        const fileName = document.createElement('strong');
        fileName.textContent = citation.fileName || citation.source || 'Policy document';
        card.append(fileName);

        const heading = document.createElement('span');
        heading.textContent = citation.headingPath?.length ? citation.headingPath.join(' → ') : 'Policy document';
        card.append(heading);
        sourcesList.append(card);
    });
    sourcesSection.classList.remove('is-hidden');
}

function setAnswerLoading(isLoading: boolean): void {
    askButton.disabled = isLoading;
    questionInput.disabled = isLoading;
    askButton.innerHTML = isLoading ? 'Searching…' : 'Ask <span aria-hidden="true">→</span>';
}

function setStatus(element: HTMLElement, type: 'loading' | 'success' | 'error', message: string): void {
    element.textContent = message;
    element.className = `status-message ${type}`;
}

function isSupportedFile(fileName: string): boolean {
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    return supportedExtensions.has(extension);
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
}

function required<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing frontend element: ${id}`);
    return element as T;
}
