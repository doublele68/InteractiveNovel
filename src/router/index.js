import { createRouter, createWebHistory } from 'vue-router'
import ExploreView from '../views/ExploreView.vue'
import CreateView from '../views/CreateView.vue'
import MyView from '../views/MyView.vue'
import NovelView from '../views/NovelView.vue'
import LoginView from '../views/LoginView.vue'
import SettingsView from '../views/SettingsView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/',
    name: 'explore',
    component: ExploreView
  },
  {
    path: '/create',
    name: 'create',
    component: CreateView
  },
  {
    path: '/my',
    name: 'my',
    component: MyView
  },
  {
    path: '/novel',
    name: 'novel',
    component: NovelView
  },
  {
    path: '/novel/read/:publishId',
    name: 'novel-read',
    component: NovelView
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：未登录时自动以默认用户名登录
router.beforeEach((to, from, next) => {
  const userId = localStorage.getItem('novel_user_id')
  if (!to.meta.public && !userId) {
    // 自动使用默认用户名登录，无需跳转到登录页
    localStorage.setItem('novel_user_id', 'Genius')
    next()
  } else if (to.path === '/login' && userId) {
    next('/')
  } else {
    next()
  }
})

export default router
