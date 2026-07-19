<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useNovelStore } from './stores/novel'
import { useUserStore } from './stores/user'

const novelStore = useNovelStore()
const userStore = useUserStore()

onMounted(async () => {
  // 自动登录：未登录时使用默认用户名
  userStore.autoLogin()
  if (userStore.isLoggedIn) {
    await novelStore.loadFromServer()
  }
})
</script>

<style scoped>
</style>
