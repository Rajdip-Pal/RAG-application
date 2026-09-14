# HR Policy Assistant

HR Policy Assistant is a TypeScript RAG application for asking questions about uploaded HR policy documents. It ingests Markdown and plain-text policies, retrieves relevant chunks from PostgreSQL/pgvector, and returns an answer with validated citations. When retrieval produces no context, the API returns a controlled refusal instead of calling the LLM.

## Features

- Markdown (`.md`, `.markdown`) and UTF-8 text (`.txt`) ingestion
- Paragraph-first chunking with Markdown heading and source-span provenance
- BGE-M3 embeddings through Ollama
- PostgreSQL + pgvector cosine-similarity retrieval
- Grounded answers through configurable Ollama, OpenAI, Anthropic, or Gemini providers
- Structured `{ answer, citations }` responses and citation validation
- Minimal static browser UI for upload, questions, answers, citations, loading, and errors

## Architecture overview

```mermaid
flowchart TD
    A[Browser upload] --> B[Fastify POST /documents]
    B --> C[Markdown or TXT loader]
    C --> D[Document and MarkdownChunker]
    D --> E[Ollama BGE-M3 embeddings]
    E --> F[(PostgreSQL + pgvector)]
    G[Browser question] --> H[Fastify POST /query]
    H --> I[Query embedding]
    I --> F
    F --> J[Top-K chunks]
    J --> K[Context and prompt builders]
    K --> L[Configured LLM]
    L --> M[Citation validation]
    M --> N[RagResponse]
```

## Tech stack

| Component       | Technology                                                         |
| --------------- | ------------------------------------------------------------------ |
| Language        | TypeScript, ESM                                                    |
| Frontend        | Browser TypeScript with HTML/CSS; no frontend framework is present |
| API             | Fastify 5                                                          |
| Runtime         | Node.js; version not pinned by the repository                      |
| Package manager | pnpm 11.x recommended by `devEngines`                              |
| Database        | PostgreSQL 16 with `pgvector/pgvector:pg16`                        |
| Vector search   | pgvector exact cosine-distance search                              |
| Embeddings      | Ollama `bge-m3`, 1,024 dimensions                                  |
| LLM             | Ollama, OpenAI, Anthropic, or Gemini adapters                      |

## Prerequisites

- Node.js and pnpm 11.x
- Docker and Docker Compose for the included PostgreSQL/pgvector service
- Ollama with `bge-m3` pulled locally
- Credentials or a local chat model for the selected LLM provider

## Environment configuration

```bash
cp .env.example .env
```

| Variable                                            | Required       | Description                                  | Example                                   |
| --------------------------------------------------- | -------------- | -------------------------------------------- | ----------------------------------------- |
| `LLM_PROVIDER`                                      | Yes            | `ollama`, `openai`, `anthropic`, or `gemini` | `ollama`                                  |
| `LLM_TEMPERATURE`                                   | Yes            | LLM temperature from 0 to 2                  | `1`                                       |
| `OLLAMA_BASE_URL`                                   | For Ollama LLM | Ollama URL for the chat provider             | `http://localhost:11434`                  |
| `OLLAMA_MODEL`                                      | For Ollama LLM | Chat model                                   | `qwen3:8b`                                |
| `OLLAMA_EMBEDDING_MODEL`                            | No             | Must be `bge-m3` currently                   | `bge-m3`                                  |
| `OLLAMA_EMBEDDING_MODEL_BASE_URL`                   | No             | Ollama URL for the embedding provider        | `http://localhost:11434`                  |
| `OPENAI_API_KEY`, `OPENAI_MODEL`                    | For OpenAI     | Hosted provider credentials/model            | `...`, `gpt-5.6-luna`                     |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`              | For Anthropic  | Hosted provider credentials/model            | `...`, `claude-haiku-4-5-20251001`        |
| `GOOGLE_API_KEY`, `GEMINI_MODEL`                    | For Gemini     | Hosted provider credentials/model            | `...`, `gemini-3.6-flash`                 |
| `DATABASE_URL`                                      | Yes            | PostgreSQL connection URL                    | `postgresql://rag:rag@localhost:5432/rag` |
| `HOST`                                              | No             | API bind host; defaults to `0.0.0.0`         | `0.0.0.0`                                 |
| `PORT`                                              | No             | API port; defaults to `3000`                 | `3000`                                    |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Compose        | Database container settings                  | `rag`, `rag`, `rag`                       |
| `POSTGRES_PORT`                                     | Compose        | Host port for PostgreSQL                     | `5432`                                    |

The current `.env.example` defaults to Gemini. For a fully local run, set `LLM_PROVIDER=ollama`, configure `OLLAMA_MODEL`, and pull that model. Never commit `.env` or real keys.

## Models

Document and query embeddings use Ollama BGE-M3 (`bge-m3`) with 1,024 dimensions. The example LLM configuration uses Gemini `gemini-3.6-flash`; the implementation also supports Ollama, OpenAI, and Anthropic through environment-selected adapters.

## Local setup

```bash
git clone <repository-url>
cd RAG-application
pnpm install
cp .env.example .env
docker compose up -d
ollama pull bge-m3
ollama pull qwen3:8b                 # if using the example local Ollama chat model
pnpm server
```

If using Gemini (the example default), provide `GOOGLE_API_KEY` and keep `GEMINI_MODEL` configured. If using Ollama for chat, update the LLM variables as described above. PostgreSQL is initialized from `database/init.sql` when the container starts.

Build and serve the static frontend separately:

```bash
pnpm frontend:build
python3 -m http.server 4173 -d frontend
```

The API is `http://localhost:3000`; the frontend is `http://localhost:4173`. The frontend API URL is configured in `frontend/index.html` with `data-api-base-url`.

## Running the application

Open the frontend, upload a policy, wait for the indexed chunk count, and ask a question. The sample documents are [`documents/leave-policy.md`](documents/leave-policy.md), [`documents/benefits-policy.md`](documents/benefits-policy.md), and [`documents/it-security-policy.md`](documents/it-security-policy.md). The answer panel displays the backend answer and returned sources.

For example, the leave policy states that a maximum of 8 unused casual-leave days may be carried forward. When retrieval produces no context, the API returns `The information is not available in the provided documents.`. The frontend renders this backend refusal and does not invent its own retrieval decision.

## API

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /documents`

Send `multipart/form-data` with one field named `file`. `.md`, `.markdown`, and `.txt` are accepted; other extensions return `400`.

```json
{ "ingested": true, "fileName": "leave-policy.md", "chunks": 12 }
```

### `POST /query`

Send a non-empty JSON query:

```json
{ "query": "How many casual leave days can be carried forward?" }
```

The response is structured JSON:

```json
{
    "answer": "... [S1]",
    "citations": [
        {
            "sourceId": "S1",
            "source": "leave-policy.md",
            "fileName": "leave-policy.md",
            "documentId": "...",
            "headingPath": ["Leave Policy", "Carry-forward and encashment"],
            "chunkId": "...",
            "chunkIndex": 0,
            "sourceSpans": [{ "paragraph": 1, "startOffset": 0, "endOffset": 100 }],
            "score": 0.91
        }
    ]
}
```

Validation errors return `400`; embedding/vector-store failures return `503`; other unhandled failures return `500` with a generic message.

## Project structure

```text
src/api/                         Fastify app and routes
src/application/                 ingestion, retrieval, context, prompt, RAG, citations
src/chunking/                    chunker interfaces and Markdown chunker
src/config/ and src/constants/   environment and application configuration
src/core/                        domain interfaces and types
src/providers/                   loaders, Ollama, LLM, and pgvector adapters
frontend/                        static HTML, browser TypeScript, and CSS
database/init.sql                pgvector extension and chunks table
documents/                       sample policies
test/                            Node test-runner tests
```

## Development commands

| Command                    | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `pnpm server` / `pnpm api` | Start Fastify                                  |
| `pnpm frontend:build`      | Compile frontend TypeScript to `frontend/dist` |
| `pnpm build`               | Compile backend TypeScript to `dist`           |
| `pnpm exec tsc --noEmit`   | Backend type-check                             |
| `pnpm test`                | Run the Node test suite                        |
| `pnpm lint`                | Run Oxlint                                     |
| `pnpm ingest [path]`       | Ingest a file or `documents/` directory        |
| `pnpm search "question"`   | Run vector retrieval                           |
| `pnpm answer "question"`   | Run the full CLI RAG flow                      |

No browser E2E suite or formal evaluation harness is implemented.

## Grounding behavior

The application embeds each question, retrieves up to five chunks, builds bounded context, and instructs the selected LLM to use only that context. No retrieved context produces the fixed refusal without an LLM call. Valid `[S1]` markers are mapped to retrieved chunks; unknown or duplicate markers are omitted from `citations`.

## Limitations

- PDF ingestion, authentication, multi-tenancy, policy versioning, and production deployment are not implemented.
- Retrieval is exact cosine search without hybrid retrieval, reranking, or a default score threshold.
- Ingestion is synchronous and has no separate document registry or job queue.
- The frontend is static browser TypeScript with no automated browser tests.
- LLM quality and latency depend on the selected provider and local hardware.
