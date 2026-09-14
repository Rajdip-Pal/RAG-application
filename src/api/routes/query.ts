import type { FastifyInstance } from 'fastify';

import type { RagService } from '../../application/rag/RagService.js';
import { ApiValidationError } from '../errors.js';

interface QueryBody {
    readonly query?: unknown;
}

export function registerQueryRoute(app: FastifyInstance, ragService: Pick<RagService, 'answer'>): void {
    app.post<{ Body: QueryBody }>(
        '/query',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['query'],
                    additionalProperties: false,
                    properties: { query: { type: 'string', minLength: 1 } },
                },
            },
        },
        async (request, reply) => {
            const query = request.body.query;
            if (typeof query !== 'string' || !query.trim()) {
                throw new ApiValidationError('Request query must be a non-empty string.');
            }
            return reply.send(await ragService.answer(query));
        },
    );
}
