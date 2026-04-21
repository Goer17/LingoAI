import type { ApiResponse } from '@/types/api';
export declare function getStoredAccessToken(): string;
export declare function setStoredAccessToken(token: string): void;
export declare function clearStoredAccessToken(): void;
export declare const http: import("axios").AxiosInstance;
export declare function unwrap<T>(promise: Promise<{
    data: ApiResponse<T>;
}>): Promise<T>;
