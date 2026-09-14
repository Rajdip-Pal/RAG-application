import type { CitationParser } from '../../core/interfaces/CitationParser.js';
import type { Citation } from '../../core/types/Citation.js';
import type { Context } from '../../core/types/context.js';

export class SourceCitationParser implements CitationParser {
    public parse(answer: string, context: Context): Citation[] {
        const citations: Citation[] = [];
        const seen = new Set<string>();
        const sourceById = new Map(context.sources.map((source) => [source.sourceId, source]));
        const markerPattern = /\[S(\d+)\]/g;
        let match: RegExpExecArray | null;

        while ((match = markerPattern.exec(answer)) !== null) {
            const sourceId = `S${match[1]}`;
            const source = sourceById.get(sourceId);
            if (!source || seen.has(sourceId)) continue;
            seen.add(sourceId);
            citations.push({
                sourceId,
                source: source.chunk.metadata.source,
                fileName: source.chunk.metadata.fileName,
                documentId: source.chunk.documentId,
                headingPath: [...source.chunk.metadata.headingPath],
                chunkId: source.chunk.id,
                chunkIndex: source.chunk.metadata.chunkIndex,
                sourceSpans: [...source.chunk.metadata.sourceSpans],
                score: source.score,
            });
        }
        return citations;
    }
}
