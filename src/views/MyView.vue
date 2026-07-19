<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
    <!-- 顶部 -->
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <h1 class="text-base font-semibold text-gray-900">{{ t('my.title') }}</h1>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 cursor-pointer" @click="showEditName = true">
            <span class="text-xs text-gray-500">{{ userStore.userId || 'Genius' }}</span>
            <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <button @click="$router.push('/settings')" class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
      <!-- Tabs -->
      <div class="max-w-md mx-auto px-4 flex gap-6 border-t border-gray-100">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="relative py-3 text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'text-blue-600' : 'text-gray-500'"
        >
          {{ tab.label }}
          <span v-if="tab.value === 'creating'" class="ml-1 text-xs text-gray-400">{{ libraryList.length }}</span>
          <span v-else class="ml-1 text-xs text-gray-400">{{ myPublished.length }}</span>
          <span v-if="activeTab === tab.value" class="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
        </button>
      </div>
    </header>

    <div class="max-w-md mx-auto px-4 pt-4">
      <!-- 创作中 -->
      <div v-if="activeTab === 'creating'">
         <div v-if="!loaded" class="py-20 text-center text-gray-400 text-sm">
          <p>{{ t('my.loading') }}</p>
        </div>
        <div v-else-if="libraryList.length === 0" class="py-20 text-center text-gray-400 text-sm">
          <p>{{ t('my.emptyCreating1') }}</p>
          <p class="mt-1">{{ t('my.emptyCreating2') }}</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="novel in libraryList"
            :key="novel.id"
            class="relative overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100"
          >
            <div
              class="flex shrink-0 transition-transform duration-200 ease-out"
              :style="{ transform: `translateX(-${swipeStates[novel.id]?.offset || 0}px)`, width: 'calc(100% + 80px)' }"
              @touchstart="onTouchStart($event, novel.id)"
              @touchmove="onTouchMove($event, novel.id)"
              @touchend="onTouchEnd($event, novel.id)"
              @mousedown="onMouseDown($event, novel.id)"
            >
              <div class="flex-1 p-4 min-w-0" @click="handleLoadNovel(novel.id)">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="text-sm font-semibold text-gray-900 truncate">{{ novel.theme }}</h4>
                  <span class="shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500">{{ novel.style }}</span>
                </div>
                <p class="text-xs text-gray-400">
                  {{ t('my.chapterNum', { n: novel.segments?.length || 0 }) }}
                  <span v-if="novel.endingCount === 0">· {{ t('my.completed') }}</span>
                </p>
              </div>
              <div
                class="shrink-0 w-20 bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                @click="handleDeleteNovel(novel.id)"
              >
                {{ t('my.delete') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 已发表 -->
      <div v-else>
        <div v-if="myPublished.length === 0" class="py-20 text-center text-gray-400 text-sm">
          <p>{{ t('my.emptyPublished1') }}</p>
          <p class="mt-1">{{ t('my.emptyPublished2') }}</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="novel in myPublished"
            :key="novel.id"
            @click="handleReadPublished(novel.id)"
            class="rounded-xl bg-white shadow-sm border border-gray-100 p-4 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div class="flex items-center gap-2 mb-1">
              <h4 class="text-sm font-semibold text-gray-900 truncate">{{ novel.title }}</h4>
              <span class="shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-600">{{ novel.style }}</span>
            </div>
            <div class="flex items-center justify-between">
              <p class="text-xs text-gray-400">
                {{ t('my.chapterCount', { n: novel.chapterCount }) }} · {{ formatTime(novel.publishedAt) }}
              </p>
              <span
                v-if="novel.coverStatus !== 'ready'"
                class="text-[10px] px-1.5 py-0.5 rounded"
                :class="novel.coverStatus === 'failed' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'"
              >
                {{ novel.coverStatus === 'failed' ? t('my.coverFailed') : t('my.coverGenerating') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BottomNav />

    <!-- 修改用户名弹窗 -->
    <div v-if="showEditName" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showEditName = false">
      <div class="bg-white rounded-2xl shadow-xl p-6 w-[85vw] max-w-sm">
        <h3 class="text-base font-semibold text-gray-900 mb-4">{{ t('my.editName') }}</h3>
        <input
          v-model="editNameInput"
          type="text"
          maxlength="20"
          :placeholder="t('my.namePlaceholder')"
          class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          @keyup.enter="confirmEditName"
        />
        <div class="flex gap-3 mt-4">
          <button
            @click="showEditName = false"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >{{ t('my.cancel') }}</button>
          <button
            @click="confirmEditName"
            :disabled="!editNameInput.trim()"
            class="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >{{ t('my.confirm') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '../stores/novel.js'
import { useUserStore } from '../stores/user.js'
import { getPublishedList } from '../api/novel.js'
import { useLocale } from '../i18n'
import BottomNav from '../components/BottomNav.vue'

const router = useRouter()
const store = useNovelStore()
const userStore = useUserStore()
const { t } = useLocale()

const tabs = computed(() => [
  { label: t('my.creating'), value: 'creating' },
  { label: t('my.published'), value: 'published' }
])
const activeTab = ref('creating')
const showEditName = ref(false)
const editNameInput = ref('')

const allPublished = ref([])
const loaded = ref(false)
const myPublished = computed(() => {
  const me = userStore.userId
  if (!me) return []
  return allPublished.value.filter(n => n.author === me)
})

const libraryList = computed(() => {
  // 只通过 published 标志过滤，不再做 title|style 匹配
  // 只有用户手动发表或手动删除，才从创作列表中移除
  return store.getLibraryList()
})

const swipeStates = ref({})
const SWIPE_THRESHOLD = 80
const SWIPE_MAX = 80

async function refresh() {
  try {
    allPublished.value = await getPublishedList()
  } catch (e) {
    allPublished.value = []
  } finally {
    loaded.value = true
  }
}

onMounted(refresh)
onActivated(refresh)

function confirmEditName() {
  const newName = editNameInput.value.trim()
  if (!newName) return
  userStore.updateUsername(newName)
  showEditName.value = false
  editNameInput.value = ''
}

function handleLoadNovel(id) {
  // 若当前条目处于滑开状态，点击先收起而非打开小说
  if (swipeStates.value[id]?.offset > 0) {
    swipeStates.value[id].offset = 0
    return
  }
  try { sessionStorage.setItem('novel_from', '/my') } catch (e) {}
  store.loadNovel(id)
  router.push('/novel')
}

function handleDeleteNovel(id) {
  store.deleteNovel(id)
  delete swipeStates.value[id]
}

function handleReadPublished(id) {
  try { sessionStorage.setItem('novel_from', '/my') } catch (e) {}
  router.push(`/novel/read/${id}`)
}

function onTouchStart(event, id) {
  const touch = event.touches[0]
  swipeStates.value[id] = {
    startX: touch.clientX,
    startY: touch.clientY,
    offset: swipeStates.value[id]?.offset || 0,
    moved: false
  }
}

function onTouchMove(event, id) {
  const state = swipeStates.value[id]
  if (!state) return
  const touch = event.touches[0]
  const deltaX = state.startX - touch.clientX
  const deltaY = state.startY - touch.clientY
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
    state.moved = true
    event.preventDefault()
  }
  if (!state.moved) return
  state.offset = Math.min(SWIPE_MAX, Math.max(0, deltaX))
}

function onTouchEnd(event, id) {
  const state = swipeStates.value[id]
  if (!state) return
  if (state.offset >= SWIPE_THRESHOLD) {
    state.offset = SWIPE_MAX
  } else {
    state.offset = 0
  }
}

function onMouseDown(event, id) {
  swipeStates.value[id] = {
    startX: event.clientX,
    startY: event.clientY,
    offset: swipeStates.value[id]?.offset || 0,
    moved: false
  }

  const onMove = (e) => {
    const state = swipeStates.value[id]
    if (!state) return
    const deltaX = state.startX - e.clientX
    const deltaY = state.startY - e.clientY
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 10) {
      state.moved = true
    }
    if (!state.moved) return
    state.offset = Math.min(SWIPE_MAX, Math.max(0, deltaX))
  }

  const onUp = () => {
    const state = swipeStates.value[id]
    if (state) {
      state.offset = state.offset >= SWIPE_THRESHOLD ? SWIPE_MAX : 0
    }
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return t('time.justNow')
  if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) })
  if (diff < 86400 * 7) return t('time.daysAgo', { n: Math.floor(diff / 86400) })
  return t('time.date', { m: d.getMonth() + 1, d: d.getDate() })
}
</script>
