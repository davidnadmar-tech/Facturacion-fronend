import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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
    {
      path: '/dashboard/facturas',
      name: 'dashboard-facturas',
      component: () => import('../views/DashboardFacturas.vue'),
      meta: { layout: 'dashboard', title: 'Facturas' },
    },
    {
      path: '/dashboard/facturas/nueva',
      name: 'dashboard-facturas-nueva',
      component: () => import('../views/DashboardFacturaNueva.vue'),
      meta: { layout: 'dashboard', title: 'Nueva Factura' },
    },
    {
      path: '/dashboard/productos',
      name: 'dashboard-productos',
      component: () => import('../views/DashboardInventarioItems.vue'),
      meta: { layout: 'dashboard', title: 'Productos' },
    },
    {
      path: '/dashboard/inventario-items',
      name: 'dashboard-inventario-items',
      component: () => import('../views/DashboardInventarioItems.vue'),
      meta: { layout: 'dashboard', title: 'Inventario Items' },
    },
  ],
})

// Guard global básico
router.beforeEach((to) => {
  const auth = useAuthStore()
  auth.cargarLocal()
  const isPublic = to.meta?.public === true
  const requiresAuth = to.meta?.layout === 'dashboard' && !isPublic
  if (requiresAuth && !auth.isAuthenticated && to.name !== 'login') {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard-home' }
  }
})

export default router
