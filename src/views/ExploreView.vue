<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
    <!-- 顶部 -->
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 class="text-base font-semibold text-gray-900">{{ t('explore.title') }}</h1>
        </div>
        <!-- 语言切换按钮 -->
        <button
          @click="toggleLocale"
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <span class="text-xs font-medium text-gray-600">{{ locale === 'zh' ? 'EN' : '中文' }}</span>
        </button>
      </div>
    </header>

    <!-- 卡片网格 -->
    <div class="max-w-md mx-auto px-3 pt-3">
      <div v-if="loading && list.length === 0" class="grid grid-cols-2 gap-3">
        <div v-for="i in 6" :key="i" class="rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
          <div class="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"></div>
          <div class="p-2.5 space-y-1.5">
            <div class="h-3 bg-gray-200 rounded animate-pulse"></div>
            <div class="h-2.5 w-2/3 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      <div v-else-if="list.length === 0" class="py-20 text-center text-gray-400 text-sm">
        <p>{{ t('explore.empty1') }}</p>
        <p class="mt-1">{{ t('explore.empty2') }}</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="novel in list"
          :key="novel.id"
          @click="goRead(novel.id)"
          class="group rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
        >
          <!-- 封面 3:4 -->
          <div class="aspect-[3/4] relative overflow-hidden">
            <img
              v-if="novel.coverUrl"
              :src="novel.coverUrl"
              :alt="novel.title"
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center bg-gradient-to-br"
              :class="placeholderGradient(novel)"
            >
              <div class="text-center px-3">
                <div class="text-white/90 text-xs font-medium mb-1">{{ novel.style || t('explore.novelFallback') }}</div>
                <div class="text-white text-sm font-bold leading-tight line-clamp-3">{{ novel.title }}</div>
                <div v-if="novel.coverStatus === 'generating' || novel.coverStatus === 'pending'" class="mt-3 inline-flex items-center gap-1 text-[10px] text-white/80">
                  <span class="w-1 h-1 bg-white rounded-full animate-pulse"></span>
                  {{ t('explore.coverGenerating') }}
                </div>
              </div>
            </div>
            <div v-if="novel.style" class="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] bg-black/40 backdrop-blur-sm text-white rounded-md">
              {{ novel.style }}
            </div>
          </div>
          <!-- 文案 -->
          <div class="p-2.5">
            <h3 class="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-1">{{ novel.title }}</h3>
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span class="truncate">{{ novel.author }}</span>
              <span class="shrink-0 ml-1">{{ novel.chapterCount }}{{ t('explore.chapters') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { getPublishedList } from '../api/novel.js'
import { useLocale } from '../i18n'
import BottomNav from '../components/BottomNav.vue'

const router = useRouter()
const { t, locale, toggleLocale } = useLocale()
const list = ref([])
const loading = ref(false)

async function refresh() {
  loading.value = true
  try {
    list.value = await getPublishedList()
  } finally {
    loading.value = false
  }
}

function goRead(id) {
  try { sessionStorage.setItem('novel_from', '/') } catch (e) {}
  router.push(`/novel/read/${id}`)
}

function placeholderGradient(novel) {
  // 根据 id 生成稳定的颜色组合
  const palettes = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-amber-500 to-rose-500',
    'from-emerald-500 to-teal-500',
    'from-indigo-500 to-purple-500',
    'from-orange-500 to-red-500',
    'from-sky-500 to-indigo-500',
    'from-fuchsia-500 to-pink-500'
  ]
  let hash = 0
  const id = String(novel.id || '')
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return palettes[Math.abs(hash) % palettes.length]
}

onMounted(refresh)
onActivated(refresh)
</script>

<style scoped>
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
</style>
