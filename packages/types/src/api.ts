// packages/types/src/api.ts
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
