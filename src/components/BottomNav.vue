<template>
  <div class="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
    <nav class="max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-gray-200 pointer-events-auto pb-[env(safe-area-inset-bottom)]">
      <div class="grid grid-cols-3 h-14 px-2">
        <button
          @click="go('/')"
          class="flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0"
          :class="active === 'explore' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <span class="text-[11px] font-medium leading-none">{{ t('nav.explore') }}</span>
        </button>

        <button
          @click="go('/create')"
          class="flex flex-col items-center justify-center min-w-0"
        >
          <div
            class="w-11 h-11 -mt-3 rounded-full flex items-center justify-center shadow-lg transition-all"
            :class="active === 'create' ? 'bg-blue-600 scale-105' : 'bg-blue-500 hover:bg-blue-600'"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v12m6-6H6" />
            </svg>
          </div>
          <span class="text-[11px] mt-0.5 font-medium leading-none" :class="active === 'create' ? 'text-blue-600' : 'text-gray-500'">{{ t('nav.create') }}</span>
        </button>

        <button
          @click="go('/my')"
          class="flex flex-col items-center justify-center gap-0.5 transition-colors min-w-0"
          :class="active === 'my' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="text-[11px] font-medium leading-none">{{ t('nav.my') }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLocale } from '../i18n'

const route = useRoute()
const router = useRouter()
const { t } = useLocale()

const active = computed(() => {
  if (route.path.startsWith('/create')) return 'create'
  if (route.path.startsWith('/my')) return 'my'
  return 'explore'
})

function go(path) {
  if (route.path === path) return
  router.push(path)
}
</script>
