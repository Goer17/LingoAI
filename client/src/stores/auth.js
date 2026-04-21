import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/services/api';
import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from '@/services/http';
export const useAuthStore = defineStore('auth', () => {
    const token = ref(getStoredAccessToken());
    const loading = ref(false);
    const isAuthenticated = computed(() => Boolean(token.value));
    async function login(input) {
        loading.value = true;
        try {
            const data = await api.login(input);
            token.value = data.token;
            setStoredAccessToken(data.token);
        }
        finally {
            loading.value = false;
        }
    }
    function logout() {
        token.value = '';
        clearStoredAccessToken();
    }
    return {
        token,
        loading,
        isAuthenticated,
        login,
        logout,
    };
});
