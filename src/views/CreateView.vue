<template>
  <div class="min-h-screen flex flex-col items-center px-6 py-10 pb-24 bg-gradient-to-b from-blue-50 to-white">
    <div class="w-full max-w-sm">

      <!-- Loading Animation -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <!-- Animated Pen Icon -->
        <div class="relative w-24 h-24 mb-8">
          <div class="absolute inset-0 rounded-full bg-blue-100 animate-pulse"></div>
          <div class="absolute inset-2 rounded-full bg-blue-50 flex items-center justify-center">
            <svg class="w-10 h-10 text-blue-600 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <!-- Orbiting dots -->
          <div class="absolute inset-0 animate-spin-slow">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
          </div>
          <div class="absolute inset-0 animate-spin-slow-reverse">
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-300 rounded-full"></div>
          </div>
        </div>

        <!-- Loading Text -->
        <p class="text-lg font-medium text-gray-700 transition-all duration-500" :key="loadingText">
          {{ loadingText }}
        </p>

        <!-- Progress dots -->
        <div class="flex gap-1.5 mt-4">
          <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce-dot" style="animation-delay: 0s"></span>
          <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce-dot" style="animation-delay: 0.15s"></span>
          <span class="w-2 h-2 bg-blue-400 rounded-full animate-bounce-dot" style="animation-delay: 0.3s"></span>
        </div>

        <!-- Step indicator -->
        <div class="flex items-center gap-3 mt-8">
          <div v-for="(step, idx) in loadingSteps" :key="idx"
            :class="[
              'w-2.5 h-2.5 rounded-full transition-all duration-300',
              idx <= loadingStepIndex ? 'bg-blue-500 scale-110' : 'bg-gray-200'
            ]">
          </div>
        </div>
      </div>

      <!-- Logo -->
      <div v-if="!isLoading" class="text-center mb-8 animate-fade-in">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
          <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ t('create.title') }}</h1>
        <p class="mt-2 text-sm text-gray-500">{{ t('create.subtitle') }}</p>
      </div>

      <!-- Form -->
      <div v-if="!isLoading" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up">
        <div class="space-y-5">
          <!-- Theme -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              {{ t('create.theme') }} <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="themeInput"
              rows="2"
              maxlength="200"
              :placeholder="t('create.themePlaceholder')"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            ></textarea>
            <p class="mt-1 text-xs text-gray-400 text-right">{{ themeInput.length }}/200</p>
          </div>

          <!-- Style -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">
              {{ t('create.style') }} <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="s in styles"
                :key="s.value"
                type="button"
                @click="selectedStyle = s.value; customStyleInput = ''"
                :class="[
                  'px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                  selectedStyle === s.value && !customStyleInput
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                ]"
              >
                {{ s.label }}
              </button>
            </div>
            <div class="mt-2">
              <input
                v-model="customStyleInput"
                type="text"
                maxlength="10"
                :placeholder="t('create.customStylePlaceholder')"
                class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                @input="onCustomStyleInput"
              />
            </div>
          </div>

          <!-- Chapters -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('create.chapters') }}</label>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="c in chapterOptions"
                :key="c.value"
                type="button"
                @click="selectedChapters = c.value; customChaptersInput = ''"
                :class="[
                  'px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                  selectedChapters === c.value && !customChaptersInput
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                ]"
              >
                {{ c.label }}
              </button>
            </div>
            <div class="mt-2">
              <input
                v-model="customChaptersInput"
                type="number"
                min="1"
                max="100"
                :placeholder="t('create.customChaptersPlaceholder')"
                class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                @input="onCustomChaptersInput"
              />
            </div>
          </div>

          <!-- Advanced -->
          <div>
            <button
              @click="showAdvanced = !showAdvanced"
              type="button"
              class="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <svg class="w-4 h-4 transition-transform" :class="showAdvanced ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
              {{ t('create.advanced') }}
            </button>

            <div v-show="showAdvanced" class="mt-3 space-y-4 animate-fade-in">
              <!-- 每章字数 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('create.wordCount') }}</label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="w in wordCountOptions"
                    :key="w.value"
                    type="button"
                    @click="selectedWordCount = w.value; customWordCount = ''"
                    :class="[
                      'px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                      selectedWordCount === w.value && !customWordCount
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    ]"
                  >
                    {{ w.label }}
                  </button>
                </div>
                <div class="mt-2">
                  <input
                    v-model="customWordCount"
                    type="number"
                    min="300"
                    max="5000"
                    :placeholder="t('create.customWordPlaceholder')"
                    class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    @input="onCustomWordCountInput"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('create.character') }}</label>
                <textarea
                  v-model="characterInput"
                  rows="2"
                  maxlength="200"
                  :placeholder="t('create.characterPlaceholder')"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                ></textarea>
                <p class="mt-0.5 text-xs text-gray-400 text-right">{{ characterInput.length }}/200</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('create.world') }}</label>
                <textarea
                  v-model="worldInput"
                  rows="2"
                  maxlength="200"
                  :placeholder="t('create.worldPlaceholder')"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                ></textarea>
                <p class="mt-0.5 text-xs text-gray-400 text-right">{{ worldInput.length }}/200</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('create.perspective') }}</label>
                <div class="grid grid-cols-1 gap-2">
                  <button
                    v-for="p in perspectives"
                    :key="p.value"
                    type="button"
                    @click="selectedPerspective = p.value"
                    :class="[
                      'px-3 py-2 rounded-xl text-sm font-medium transition-all border text-left',
                      selectedPerspective === p.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    ]"
                  >
                    <span class="font-semibold">{{ p.label }}</span>
                    <span class="block text-xs opacity-80 mt-0.5">{{ p.desc }}</span>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">{{ t('create.model') }}</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="m in models"
                    :key="m.value"
                    type="button"
                    @click="selectedModel = m.value"
                    :class="[
                      'px-3 py-2 rounded-xl text-xs font-medium transition-all border text-left',
                      selectedModel === m.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    ]"
                  >
                    <span class="font-semibold text-sm">{{ m.label }}</span>
                    <span class="block opacity-75 mt-0.5">{{ m.desc }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            @click="handleStart"
            :disabled="!canSubmit || isLoading"
            :class="[
              'w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
              canSubmit && !isLoading
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            ]"
          >
            <span>{{ t('create.start') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Toast / Error -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
      <div v-if="toast" class="fixed top-4 left-1/2 -translate-x-1/2 max-w-[85vw] px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg z-50 flex items-center gap-3">
        <span class="flex-1">{{ toast }}</span>
        <button @click="toast = ''" class="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </transition>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNovelStore } from '../stores/novel.js'
import { generateNext, pregenerateBranches } from '../api/novel.js'
import { useLocale } from '../i18n'
import BottomNav from '../components/BottomNav.vue'

const router = useRouter()
const store = useNovelStore()
const { t } = useLocale()

const themeInput = ref('')
const selectedStyle = ref('')
const showAdvanced = ref(false)
const characterInput = ref('')
const worldInput = ref('')
const selectedPerspective = ref('')
const selectedModel = ref('qwen-plus')
const selectedChapters = ref(30)
const selectedWordCount = ref(1000)
const customWordCount = ref('')
const isLoading = ref(false)
const toast = ref('')
const customStyleInput = ref('')
const customChaptersInput = ref('')

// Loading animation text cycling
const loadingSteps = computed(() => [t('loading.step1'), t('loading.step2'), t('loading.step3')])
const loadingStepIndex = ref(0)
const loadingText = ref('')
let loadingTimer = null

function startLoadingAnimation() {
  loadingStepIndex.value = 0
  loadingText.value = loadingSteps.value[0]
  loadingTimer = setInterval(() => {
    if (loadingStepIndex.value < loadingSteps.value.length - 1) {
      loadingStepIndex.value++
      loadingText.value = loadingSteps.value[loadingStepIndex.value]
    }
  }, 10000)
}

function stopLoadingAnimation() {
  if (loadingTimer) {
    clearInterval(loadingTimer)
    loadingTimer = null
  }
}

onUnmounted(() => {
  stopLoadingAnimation()
})

const styles = computed(() => [
  { label: t('style.fantasy'), value: '玄幻' },
  { label: t('style.suspense'), value: '悬疑' },
  { label: t('style.romance'), value: '言情' },
  { label: t('style.xianxia'), value: '仙侠' },
  { label: t('style.urban'), value: '都市' },
  { label: t('style.isekai'), value: '穿越' },
  { label: t('style.history'), value: '历史' },
  { label: t('style.power'), value: '爽文' },
  { label: t('style.workplace'), value: '职场' },
  { label: t('style.scifi'), value: '科幻' },
  { label: t('style.comedy'), value: '轻喜剧' }
])

const models = computed(() => [
  { label: 'Qwen Plus', value: 'qwen-plus', desc: t('model.qwenPlusDesc') },
  { label: 'Qwen Max', value: 'qwen-max', desc: t('model.qwenMaxDesc') },
  { label: 'Qwen Turbo', value: 'qwen-turbo', desc: t('model.qwenTurboDesc') },
  { label: 'DeepSeek V3', value: 'deepseek-v3', desc: t('model.deepseekV3Desc') },
  { label: 'DeepSeek R1', value: 'deepseek-r1', desc: t('model.deepseekR1Desc') }
])

const perspectives = computed(() => [
  { label: t('perspective.first'), value: '第一人称', desc: t('perspective.firstDesc') },
  { label: t('perspective.thirdLimited'), value: '第三人称限知', desc: t('perspective.thirdLimitedDesc') },
  { label: t('perspective.thirdOmni'), value: '第三人称全知', desc: t('perspective.thirdOmniDesc') }
])

const chapterOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '30', value: 30 },
  { label: '40', value: 40 },
  { label: '50', value: 50 }
]

const wordCountOptions = [
  { label: '800', value: 800 },
  { label: '1000', value: 1000 },
  { label: '1500', value: 1500 },
  { label: '2000', value: 2000 }
]

const canSubmit = computed(() => themeInput.value.trim().length > 0 && (selectedStyle.value || customStyleInput.value.trim()))

async function handleStart() {
  if (!canSubmit.value || isLoading.value) return

  const theme = themeInput.value.trim()
  const style = customStyleInput.value.trim() || selectedStyle.value
  const character = characterInput.value.trim()
  const world = worldInput.value.trim()
  const perspective = selectedPerspective.value

  store.initSession(theme, style, character, world, perspective)
  const finalChapters = customChaptersInput.value ? Math.min(100, Math.max(1, parseInt(customChaptersInput.value) || 30)) : selectedChapters.value
  const finalWordCount = customWordCount.value ? Math.min(5000, Math.max(300, parseInt(customWordCount.value) || 1000)) : selectedWordCount.value
  store.totalChapters = finalChapters
  store.wordCountPerChapter = finalWordCount
  store.selectedModel = selectedModel.value
  // 如果预计章节数 <= 3，直接进入完结流程（第一章就开始收尾）
  if (finalChapters <= 3) {
    store.endingCount = finalChapters
  }
  store.saveSession()
  isLoading.value = true
  startLoadingAnimation()
  store.clearError()

  try {
    const data = await generateNext(theme, style, [], null, store.endingCount, 1, character, world, perspective, 0, '', selectedModel.value, finalChapters, finalWordCount)
    if (data.generatedSettings) {
      store.characterSetting = data.generatedSettings.characterSetting || ''
      store.worldSetting = data.generatedSettings.worldSetting || ''
      store.saveSession()
    }
    store.appendSegment(data.text, data.choices, data.summary, data.chapterTitle)
    // 如果第一章就是完结章（totalChapters=1），直接标记完结
    if (store.endingCount > 0) {
      store.decrementEnding()
    }
    try { sessionStorage.setItem('novel_from', '/') } catch (e) {}
    router.push('/novel')

    // 只有未完结时才预生成分支
    if (store.endingCount !== 0 && store.currentChoices.length > 0) {
      const currentSummaries = [...store.summaries]
      const currentChoices = store.currentChoices.map(c => ({ id: c.id, text: c.text }))
      pregenerateBranches(theme, style, currentSummaries, currentChoices, store.endingCount, 1, store.characterSetting, store.worldSetting, perspective, selectedModel.value, finalChapters, finalWordCount).then(enrichedChoices => {
        if (enrichedChoices) {
          store.currentChoices = enrichedChoices
          store.saveSession()
        }
      })
    }
  } catch (err) {
    store.setError(err.message)
    showToast(err.message)
    stopLoadingAnimation()
    isLoading.value = false
  }
}

let toastTimer = null
function showToast(msg) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  // Network Error 等严重错误不自动消失，需手动关闭
  if (/network|timeout|ECONNREFUSED/i.test(msg)) return
  toastTimer = setTimeout(() => { toast.value = '' }, 4000)
}

function onCustomChaptersInput() {
  if (customChaptersInput.value) {
    const val = parseInt(customChaptersInput.value)
    if (val > 100) customChaptersInput.value = '100'
    if (val < 1) customChaptersInput.value = '1'
    selectedChapters.value = 0
  }
}

function onCustomWordCountInput() {
  if (customWordCount.value) {
    const val = parseInt(customWordCount.value)
    if (val > 5000) customWordCount.value = '5000'
    if (val < 300) customWordCount.value = '300'
    selectedWordCount.value = 0
  }
}

function onCustomStyleInput() {
  if (customStyleInput.value) {
    selectedStyle.value = ''
  }
}
</script>
