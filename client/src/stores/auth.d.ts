export declare const useAuthStore: import("pinia").StoreDefinition<"auth", Pick<{
    token: import("vue").Ref<string, string>;
    loading: import("vue").Ref<boolean, boolean>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    login: (input: string) => Promise<void>;
    logout: () => void;
}, "token" | "loading">, Pick<{
    token: import("vue").Ref<string, string>;
    loading: import("vue").Ref<boolean, boolean>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    login: (input: string) => Promise<void>;
    logout: () => void;
}, "isAuthenticated">, Pick<{
    token: import("vue").Ref<string, string>;
    loading: import("vue").Ref<boolean, boolean>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    login: (input: string) => Promise<void>;
    logout: () => void;
}, "login" | "logout">>;
