import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/layouts/AppLayout.vue';
import LoginPage from '@/pages/LoginPage.vue';
import SettingPage from '@/pages/SettingPage.vue';
import VocabularyPage from '@/pages/VocabularyPage.vue';
import QuizPage from '@/pages/QuizPage.vue';
const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: LoginPage,
        },
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '',
                    redirect: '/vocabulary',
                },
                {
                    path: 'vocabulary',
                    name: 'vocabulary',
                    component: VocabularyPage,
                },
                {
                    path: 'setting',
                    name: 'setting',
                    component: SettingPage,
                },
            ],
        },
        {
            path: '/quiz/:id',
            name: 'quiz',
            component: QuizPage,
            meta: { requiresAuth: true, hideLayout: true },
        },
    ],
});
router.beforeEach((to) => {
    const auth = useAuthStore();
    const requiresAuth = to.name !== 'login';
    if (requiresAuth && !auth.isAuthenticated) {
        return { name: 'login', query: { redirect: to.fullPath } };
    }
    if (to.name === 'login' && auth.isAuthenticated) {
        return { name: 'vocabulary' };
    }
    return true;
});
export default router;
