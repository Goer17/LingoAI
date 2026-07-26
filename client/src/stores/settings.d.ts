export declare const useSettingsStore: import("pinia").StoreDefinition<"settings", Pick<{
    form: {
        models: {
            language: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
            audio: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
            image: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
        };
        updatedAt: string | null;
    };
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    fetchSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}, "loading" | "saving" | "form">, Pick<{
    form: {
        models: {
            language: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
            audio: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
            image: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
        };
        updatedAt: string | null;
    };
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    fetchSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}, never>, Pick<{
    form: {
        models: {
            language: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
            audio: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
            image: {
                entries: {
                    id: string;
                    baseUrl: string;
                    apiKey: string;
                    model: string;
                    extraBody: string;
                }[];
                activeId: string | null;
            };
        };
        updatedAt: string | null;
    };
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    fetchSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}, "fetchSettings" | "saveSettings">>;
