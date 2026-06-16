// server/src/utils/responseFormatter.ts
// Standard API response formatting

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    count: number;
  };
}

export interface ApiSingleResponse<T> {
  data: T;
}

export interface ApiSuccessResponse {
  success: boolean;
}

export const formatListResponse = <T>(
  data: T[],
  total: number,
  limit: number = 100,
  offset: number = 0
): ApiListResponse<T> => {
  return {
    data,
    meta: {
      total,
      limit,
      offset,
      count: data.length,
    },
  };
};

export const formatSingleResponse = <T>(data: T): ApiSingleResponse<T> => {
  return { data };
};

export const formatSuccessResponse = (): ApiSuccessResponse => {
  return { success: true };
};

export const formatErrorResponse = (message: string, code?: string) => {
  return {
    error: message,
    code: code || 'ERROR',
  };
};
