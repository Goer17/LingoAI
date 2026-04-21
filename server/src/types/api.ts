export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
