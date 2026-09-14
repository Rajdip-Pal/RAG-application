import 'dotenv/config';
import { createLLMConfig } from './config/llm.config.js';
import { createDirectoryLoaderProvider } from './composition/createDirectoryLoaderProvider.js';
import { createLLMProvider } from './composition/createLLMProvider.js';

import { performance } from 'node:perf_hooks';
import type { LLMProvider } from './core/interfaces/LLMProvider.js';
import type { LLMConfig } from './core/types/LLMConfig.js';

const documentLoaderProvider = createDirectoryLoaderProvider();
const documents = await documentLoaderProvider.load(process.cwd() + '/documents');

console.log(`Loaded ${documents.length} Markdown document(s).`);
documents.forEach((doc) => console.log(`Metadata:\n\n ${JSON.stringify(doc.metadata)}\n\nContent:\n\n ${doc.pageContent}`));

const start: number = performance.now();

const config: LLMConfig = createLLMConfig();
const provider: LLMProvider = createLLMProvider(config);

const response = await provider.invoke([
    [
        'system',
        'You are a concise technical assistant. Who helps and give basic knowledge about technologies based on the proper official documentations over the inernet.',
    ],
    ['human', 'Explain Go Lang features and advantages in simple language. In 5-10 lines.'],
]);

const elapsed: number = (performance.now() - start) / 1000;

console.log(`Response :\n${JSON.stringify(response.content)}\n\nElapsed in ${elapsed} s.`);
