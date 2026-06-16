// client/src/utils/downloadFile.ts

import apiClient from '../api/client';
import { parseApiError } from '../api/errorHandler';

export interface DownloadOptions {
  filename: string;
  contentType?: string;
}

/**
 * Download a file from an API endpoint
 * 
 * @param endpoint - The API endpoint to call (e.g., '/projects/123/export/excel')
 * @param options - Download options (filename, contentType)
 * @returns Promise that resolves when download starts
 */
export async function downloadFile(
  endpoint: string,
  options: DownloadOptions
): Promise<void> {
  try {
    // Request the file as a blob
    const response = await apiClient.get(endpoint, {
      responseType: 'blob',
    });

    // Get the blob from response data
    const blob = new Blob([response.data], {
      type: options.contentType || response.headers['content-type'],
    });

    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename;
    link.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    window.URL.revokeObjectURL(url);
  } catch (error) {
    // Parse and throw error for caller to handle
    const apiError = parseApiError(error);
    throw new Error(`Failed to download ${options.filename}: ${apiError.message}`);
  }
}

/**
 * Download file with retry logic
 */
export async function downloadFileWithRetry(
  endpoint: string,
  options: DownloadOptions,
  retries: number = 3
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await downloadFile(endpoint, options);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === retries) {
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError;
}
