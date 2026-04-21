import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoginCard from '@/components/LoginCard.vue';
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const tokenInput = ref('');
const error = ref('');
async function submit() {
    error.value = '';
    try {
        await auth.login(tokenInput.value.trim());
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/vocabulary';
        await router.push(redirect);
    }
    catch (err) {
        error.value = err instanceof Error ? err.message : 'Login failed.';
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-page" },
});
/** @type {[typeof LoginCard, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(LoginCard, new LoginCard({
    ...{ 'onSubmit': {} },
    modelValue: (__VLS_ctx.tokenInput),
    loading: (__VLS_ctx.auth.loading),
    error: (__VLS_ctx.error),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onSubmit': {} },
    modelValue: (__VLS_ctx.tokenInput),
    loading: (__VLS_ctx.auth.loading),
    error: (__VLS_ctx.error),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onSubmit: (__VLS_ctx.submit)
};
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['login-page']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            LoginCard: LoginCard,
            auth: auth,
            tokenInput: tokenInput,
            error: error,
            submit: submit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
