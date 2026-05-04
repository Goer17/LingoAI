export declare const useSettingsStore: import("pinia").StoreDefinition<"settings", Pick<{
    form: {
        baseUrl: string;
        apiKey: string;
        languageModel: string;
        audioModel: string;
        updatedAt: string | null;
    };
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    fetchSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}, "loading" | "form" | "saving">, Pick<{
    form: {
        baseUrl: string;
        apiKey: string;
        languageModel: string;
        audioModel: string;
        updatedAt: string | null;
    };
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    fetchSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}, never>, Pick<{
    form: {
        baseUrl: string;
        apiKey: string;
        languageModel: string;
        audioModel: string;
        updatedAt: string | null;
    };
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    fetchSettings: () => Promise<void>;
    saveSettings: () => Promise<void>;
}, "fetchSettings" | "saveSettings">>;
