import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/loginView.vue'),
      meta: { layout: 'blank', public: true, title: 'Acceso' },
    },
    {
      path: '/dashboard',
      name: 'dashboard-home',
      component: () => import('../views/DashboardHome.vue'),
      meta: { layout: 'dashboard', title: 'Panel' },
    },
    {
      path: '/dashboard/clientes',
      name: 'dashboard-clientes',
      component: () => import('../views/DashboardClientes.vue'),
      meta: { layout: 'dashboard', title: 'Clientes' },
    },
  ],
})

export default router
