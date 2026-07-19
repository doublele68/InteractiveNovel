import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const USER_KEY = 'novel_user_id'
const DEFAULT_USERNAME = 'Genius'

export const useUserStore = defineStore('user', () => {
  const userId = ref(localStorage.getItem(USER_KEY) || '')
  const isLoggedIn = computed(() => !!userId.value)

  // 直接登录（无需邀请码验证），使用给定用户名或默认值
  function login(username) {
    const name = (username || DEFAULT_USERNAME).trim() || DEFAULT_USERNAME
    userId.value = name
    localStorage.setItem(USER_KEY, name)
    return { success: true }
  }

  // 自动登录：如果没有登录过，使用默认用户名登录
  function autoLogin() {
    if (!userId.value) {
      login(DEFAULT_USERNAME)
    }
  }

  // 修改用户名
  function updateUsername(newName) {
    const name = (newName || '').trim()
    if (!name) return false
    const oldName = userId.value
    userId.value = name
    localStorage.setItem(USER_KEY, name)
    // 迁移服务器数据（后台异步）
    if (oldName && oldName !== name) {
      migrateUserData(oldName, name)
    }
    return true
  }

  // 迁移用户数据（从旧用户名到新用户名）
  async function migrateUserData(oldName, newName) {
    try {
      const res = await axios.get(`/api/user/${oldName}/data`)
      if (res.data.data) {
        await axios.post(`/api/user/${newName}/data`, res.data.data)
      }
    } catch (e) {
      console.warn('迁移用户数据失败:', e)
    }
  }

  function logout() {
    userId.value = ''
    localStorage.removeItem(USER_KEY)
  }

  // 从服务器加载用户数据
  async function loadUserData() {
    if (!userId.value) return null
    try {
      const res = await axios.get(`/api/user/${userId.value}/data`)
      return res.data.data
    } catch (e) {
      console.warn('加载用户数据失败:', e)
      return null
    }
  }

  // 保存用户数据到服务器
  async function saveUserData(data) {
    if (!userId.value) return
    try {
      await axios.post(`/api/user/${userId.value}/data`, data)
    } catch (e) {
      console.warn('保存用户数据失败:', e)
    }
  }

  return {
    userId,
    isLoggedIn,
    login,
    autoLogin,
    updateUsername,
    logout,
    loadUserData,
    saveUserData
  }
})
