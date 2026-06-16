// client/src/api/errorHandler.ts

import { AxiosError } from 'axios';
import { ApiError } from './types';

/**
 * Normalize Axios errors into consistent ApiError format
 */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    return {
      status: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'An error occurred',
      details: error.response?.data?.details || error.response?.data,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: String(error) || 'An unknown error occurred',
  };
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: ApiError): boolean {
  return error.status >= 400 && error.status < 500;
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: ApiError): boolean {
  return error.status >= 500;
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthError(error: ApiError): boolean {
  return error.status === 401;
}

/**
 * Check if error is a forbidden error (403)
 */
export function isForbiddenError(error: ApiError): boolean {
  return error.status === 403;
}

/**
 * Check if error is a not found error (404)
 */
export function isNotFoundError(error: ApiError): boolean {
  return error.status === 404;
}

/**
 * Check if error is a validation error (422 or 400)
 */
export function isValidationError(error: ApiError): boolean {
  return error.status === 422 || error.status === 400;
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: ApiError): string {
  if (isAuthError(error)) {
    return 'Your session has expired. Please log in again.';
  }

  if (isForbiddenError(error)) {
    return 'You do not have permission to perform this action.';
  }

  if (isNotFoundError(error)) {
    return 'The requested resource was not found.';
  }

  if (isValidationError(error)) {
    if (error.details && typeof error.details === 'object') {
      const messages = Object.values(error.details)
        .filter((v) => typeof v === 'string')
        .slice(0, 2);
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }
    return error.message || 'Please check your input and try again.';
  }

  if (isServerError(error)) {
    return 'A server error occurred. Please try again later.';
  }

  return error.message || 'An error occurred. Please try again.';
}

/**
 * Get user-friendly error title
 */
export function getErrorTitle(error: ApiError): string {
  if (isAuthError(error)) {
    return 'Authentication Error';
  }

  if (isForbiddenError(error)) {
    return 'Access Denied';
  }

  if (isNotFoundError(error)) {
    return 'Not Found';
  }

  if (isValidationError(error)) {
    return 'Validation Error';
  }

  if (isServerError(error)) {
    return 'Server Error';
  }

  return 'Error';
}

/**
 * Helper to create error alert object
 */
export function createErrorAlert(error: ApiError) {
  return {
    title: getErrorTitle(error),
    message: formatErrorMessage(error),
    severity: isServerError(error) ? ('error' as const) : ('warning' as const),
    code: error.code,
  };
}
