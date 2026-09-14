import { z } from 'zod';
import { InvalidLLMConfigurationError } from '../errors/LLMErrors.js';

const optionalEnvironmentString = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1).optional(),
);

const optionalEnvironmentUrl = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().url().optional(),
);

const optionalEnvironmentPort = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.coerce.number().int().min(1).max(65_535).optional(),
);

const environmentSchema = z.object({
    LLM_PROVIDER: z.string().trim().min(1),
    LLM_TEMPERATURE: z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
        z.coerce.number().finite().min(0).max(2).optional(),
    ),
    OLLAMA_MODEL: optionalEnvironmentString,
    OLLAMA_EMBEDDING_MODEL: optionalEnvironmentString,
    OLLAMA_BASE_URL: optionalEnvironmentUrl,
    DATABASE_URL: optionalEnvironmentUrl,
    HOST: optionalEnvironmentString,
    PORT: optionalEnvironmentPort,
    OPENAI_API_KEY: optionalEnvironmentString,
    OPENAI_MODEL: optionalEnvironmentString,
    ANTHROPIC_API_KEY: optionalEnvironmentString,
    ANTHROPIC_MODEL: optionalEnvironmentString,
    GOOGLE_API_KEY: optionalEnvironmentString,
    GEMINI_MODEL: optionalEnvironmentString,
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(environment: NodeJS.ProcessEnv = process.env): Environment {
    const result = environmentSchema.safeParse(environment);

    if (!result.success) {
        throw new InvalidLLMConfigurationError(`Invalid environment configuration: ${result.error.message}`, result.error);
    }

    return result.data;
}
