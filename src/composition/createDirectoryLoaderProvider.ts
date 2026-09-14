import type { DocumentLoaderProvider } from '../core/interfaces/DocumentLoaderProvider.js';
import { DirectoryLoaderProvider } from '../providers/document-loader/DirectoryLoaderProvider.js';

export function createDirectoryLoaderProvider(): DocumentLoaderProvider {
    return new DirectoryLoaderProvider();
}
