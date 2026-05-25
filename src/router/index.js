import { createRouter, createWebHistory } from 'vue-router'

import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ChatView from '../views/ChatView.vue'
import ProfileView from '../views/ProfileView.vue'
import { userStore } from '@/store/user'

const routes = [
    {
        path: '/',
        redirect: '/chat',
    },

    {
        path: '/login',
        component: LoginView,
    },

    {
        path: '/register',
        component: RegisterView,
    },

    {
        path: '/chat',
        component: ChatView,
    },

    {
        path: '/profile',
        component: ProfileView,
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const publicPages = ['/login', '/register']

router.beforeEach(async (to, from, next) => {
    if (publicPages.includes(to.path)) {
        next()
        return
    }
    try {
        const res = await fetch('http://localhost:9090/api/me', {
            credentials: 'include',
        })
        if (res.ok) {
            const data = await res.json()
            userStore.id = data.id
            userStore.username = data.username
            userStore.avatar = data.avatar || ''
            next()
        } else {
            next('/login')
        }
    } catch {
        next('/login')
    }
})

export default router
