<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-24">
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-md mx-auto px-4 h-14 flex items-center">
        <button @click="$router.back()" class="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors mr-2">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-base font-semibold text-gray-900">{{ t('settings.title') }}</h1>
      </div>
    </header>

    <div class="max-w-md mx-auto px-4 pt-6 space-y-6">
      <!-- API Key 配置 -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 class="text-sm font-semibold text-gray-900 mb-1">{{ t('settings.apiKeyTitle') }}</h2>
        <p class="text-xs text-gray-400 mb-4">{{ t('settings.apiKeyDesc') }}</p>

        <!-- 状态指示 -->
        <div class="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" :class="apiConfigured ? 'bg-green-50' : 'bg-amber-50'">
          <span v-if="apiConfigured" class="w-2 h-2 rounded-full bg-green-500"></span>
          <span v-else class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span class="text-xs" :class="apiConfigured ? 'text-green-700' : 'text-amber-700'">
            {{ apiConfigured ? `${t('settings.configured')}（${maskedKey}）` : t('settings.notConfigured') }}
          </span>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('settings.apiKeyLabel') }}</label>
            <input
              v-model="apiKeyInput"
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">
              {{ t('settings.endpointLabel') }}
              <span class="text-gray-400 font-normal">{{ t('settings.endpointOptional') }}</span>
            </label>
            <input
              v-model="endpointInput"
              type="text"
              placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
              class="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            @click="saveSettings"
            :disabled="!apiKeyInput.trim() || saving"
            class="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ saving ? t('settings.saving') : t('settings.save') }}
          </button>
        </div>
      </div>

      <!-- 获取 API Key 指引 -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 class="text-sm font-semibold text-gray-900 mb-3">{{ t('settings.howToGet') }}</h2>
        <ol class="space-y-2 text-xs text-gray-600">
          <li class="flex gap-2">
            <span class="shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
            <span>{{ t('settings.step1') }} <a href="https://bailian.console.aliyun.com/cn-beijing?tab=model#/api-key" target="_blank" class="text-blue-600 underline">{{ t('settings.step1Link') }}</a></span>
          </li>
          <li class="flex gap-2">
            <span class="shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
            <span>{{ t('settings.step2') }}</span>
          </li>
          <li class="flex gap-2">
            <span class="shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
            <span>{{ t('settings.step3') }}</span>
          </li>
          <li class="flex gap-2">
            <span class="shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
            <span>{{ t('settings.step4') }}</span>
          </li>
        </ol>
        <p class="mt-3 text-[11px] text-gray-400">
          {{ t('settings.tip') }}
        </p>
      </div>
    </div>

    <!-- Toast -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
      <div v-if="toast" class="fixed top-4 left-1/2 -translate-x-1/2 max-w-[85vw] px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg z-50">
        {{ toast }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useLocale } from '../i18n'

const { t } = useLocale()

const apiKeyInput = ref('')
const DEFAULT_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const endpointInput = ref(DEFAULT_ENDPOINT)
const apiConfigured = ref(false)
const maskedKey = ref('')
const saving = ref(false)
const toast = ref('')

async function loadSettings() {
  try {
    const res = await axios.get('/api/settings')
    if (res.data.success) {
      apiConfigured.value = res.data.data.apiKeyConfigured
      maskedKey.value = res.data.data.apiKeyMasked
      endpointInput.value = res.data.data.endpoint || DEFAULT_ENDPOINT
    }
  } catch (e) {
    console.warn('加载设置失败:', e)
  }
}

async function saveSettings() {
  if (!apiKeyInput.value.trim() || saving.value) return
  saving.value = true
  try {
    const res = await axios.post('/api/settings', {
      apiKey: apiKeyInput.value.trim(),
      endpoint: endpointInput.value.trim()
    })
    if (res.data.success) {
      showToast(t('settings.saveSuccess'))
      apiKeyInput.value = ''
      await loadSettings()
    } else {
      showToast(res.data.error || t('settings.saveFailed'))
    }
  } catch (e) {
    showToast(t('settings.saveFailed') + '：' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 3000)
}

onMounted(loadSettings)
</script>
