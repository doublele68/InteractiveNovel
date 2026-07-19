<template>
  <div
    class="flex flex-col relative overflow-hidden transition-colors duration-300"
    :class="store.themeMode === 'night' ? 'bg-[#0d0d0d] text-[#b0b0b0]' : 'bg-[#FFF9E6] text-gray-900'"
    style="min-height: 100dvh; height: 100dvh;"
  >
    <!-- Header -->
    <header
      ref="headerRef"
      class="flex-shrink-0 z-50 backdrop-blur-md border-b transition-colors duration-300"
      :class="store.themeMode === 'night' ? 'bg-[#0d0d0d]/90 border-gray-800' : 'bg-[#FFF9E6]/90 border-[#e8e0cc]'"
    >
      <div class="flex items-center px-4 py-3">
        <div class="flex-1 flex items-center justify-start">
          <button
            @click="goHome"
            class="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg class="w-5 h-5 transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-400' : 'text-gray-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <div class="flex-1 flex items-center justify-center">
          <div v-if="isReadOnly" class="inline-flex items-center">
            <span class="text-sm font-semibold truncate max-w-[180px] transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-200' : 'text-gray-900'">{{ readOnlyNovel?.title || store.theme }}</span>
          </div>
          <div v-else-if="!isEditingTitle" @click="startEditTitle" class="inline-flex items-center gap-1.5 cursor-pointer group">
            <span class="text-sm font-semibold truncate max-w-[180px] transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-200' : 'text-gray-900'">{{ store.theme }}</span>
            <svg class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <input
            v-else
            v-model="editingTheme"
            @blur="saveTitle"
            @keydown.enter="saveTitle"
            ref="titleInputRef"
            class="text-sm font-semibold text-center rounded-lg px-2 py-1 w-full max-w-[200px] outline-none focus:border-blue-400 transition-colors duration-300"
            :class="store.themeMode === 'night' ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900'"
            maxlength="50"
          />
        </div>

        <div class="flex-1 flex items-center justify-end">
          <button
            v-if="!isReadOnly"
            @click="handleUndo"
            :disabled="store.history.length === 0 || isTransitioning"
            class="p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :class="store.themeMode === 'night' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'"
            :title="t('novel.undoTitle')"
          >
            <svg class="w-5 h-5 transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-400' : 'text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 遮罩层：只覆盖 header 区域，文字区 touch 事件正常穿透 -->
    <div
      v-if="showActionBar"
      class="fixed left-0 right-0 top-0 z-[40] bg-transparent"
      :style="{ height: (headerRef?.offsetHeight || 56) + 'px' }"
      @click="showActionBar = false"
    ></div>

    <!-- 内容区域：文字区 + 按钮区 严格分离 -->
    <div ref="contentRef" class="flex-1 overflow-hidden relative min-h-0" :class="{ 'flex flex-col': store.pageMode === 'flip' }">
      <!-- 文字区域：flip 模式禁止滚动+单页显示；scroll 模式显示全文+可滚动，点击中间唤出控制栏 -->
      <div
        ref="textAreaRef"
        class="relative z-10 min-h-0 hide-scrollbar"
        :class="store.pageMode === 'scroll' ? 'overflow-y-auto h-full' : 'overflow-hidden px-5 py-5 flex-1'"
        :style="{ 
          touchAction: store.pageMode === 'flip' ? 'none' : undefined, 
          overscrollBehavior: store.pageMode === 'flip' ? 'none' : undefined
        }"
        @touchmove="onTouchMove"
        @wheel="onWheel"
        @click="handleTextAreaClick"
        @scroll="onScrollTrack"
      >
        <!-- 翻页模式：只显示当前 segment，分页 -->
        <template v-if="store.pageMode === 'flip'">
          <div v-if="currentSegment">
            <!-- 固定高度裁剪层：transform 移动内容，绝对定位内层精确裁剪当前页高度，避免跨页截断/重复 -->
            <div class="overflow-hidden relative" :style="{ height: textAreaHeight + 'px' }">
              <div class="absolute left-0 right-0 top-0 overflow-hidden" :style="{ height: currentPageContentHeight + 'px' }">
                <div :style="{
                  transform: `translate3d(0, -${innerOffset}px, 0)`
                }">
                <div
                  ref="textContentRef"
                  class="w-full"
                  :style="{ 
                    opacity: pageOpacity,
                    transition: 'opacity 0.1s ease-out'
                  }"
                >
              <!-- 当前段落 -->
              <div
                v-for="(textSeg, sIdx) in currentSegment.textSegments"
                :key="sIdx"
                :class="sIdx > 0 ? 'mt-4' : ''"
              >
                <p
                  class="leading-[1.6] transition-colors duration-300"
                  :class="store.themeMode === 'night' ? 'text-[#b0b0b0]' : 'text-gray-800'"
                  :style="{
                    fontSize: sIdx === 0 ? (store.fontSize + 2) + 'px' : store.fontSize + 'px',
                    textAlign: sIdx === 0 ? 'left' : 'inherit',
                    textIndent: sIdx === 0 ? '0' : '2em',
                    fontWeight: sIdx === 0 ? 'bold' : 'normal',
                    margin: 0
                  }"
                >{{ textSeg }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!store.isGenerating" class="absolute inset-0 flex items-center justify-center">
            <p class="text-sm transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ t('novel.emptyHint') }}</p>
          </div>
        </template>

        <!-- 滚动模式：显示所有 segment 全文 -->
        <template v-else>
          <div ref="textContentRef" class="px-5 pt-5 pb-5 space-y-6">
            <div
              v-for="(segment, segIdx) in store.segments"
              :key="segIdx"
              :id="'segment-' + segIdx"
              class="space-y-4"
            >
              <div
                v-for="(textSeg, sIdx) in segment.textSegments"
                :key="sIdx"
                :class="sIdx > 0 ? 'mt-4' : ''"
              >
                <p
                  class="leading-[1.6] transition-colors duration-300"
                  :class="store.themeMode === 'night' ? 'text-[#b0b0b0]' : 'text-gray-800'"
                  :style="{
                    fontSize: sIdx === 0 ? (store.fontSize + 2) + 'px' : store.fontSize + 'px',
                    textAlign: sIdx === 0 ? 'left' : 'inherit',
                    textIndent: sIdx === 0 ? '0' : '2em',
                    fontWeight: sIdx === 0 ? 'bold' : 'normal',
                    margin: 0
                  }"
                >{{ textSeg }}</p>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="store.segments.length === 0 && !store.isGenerating" class="flex items-center justify-center py-20">
              <p class="text-sm transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ t('novel.emptyHint') }}</p>
            </div>
          </div>

          <!-- 选项按钮区域：scroll 模式下在内容流末尾，随文字滚动 -->
          <Transition name="fade">
            <div
              v-if="showChoices"
              @click.stop
              class="border-t px-5 py-3 transition-colors duration-300"
              :class="store.themeMode === 'night' ? 'bg-[#0d0d0d] border-gray-800' : 'bg-[#FFF9E6] border-[#e8e0cc]'"
            >
              <p class="text-xs font-medium mb-2 transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ t('novel.chooseDirection') }}</p>
              <div class="space-y-2">
                <button
                  v-for="choice in store.currentChoices"
                  :key="choice.id"
                  @click="selectChoice(choice)"
                  :disabled="store.isGenerating || isTransitioning"
                  class="w-full text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-snug"
                  :class="store.themeMode === 'night'
                    ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-600 hover:text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'"
                >
                  {{ choice.text }}
                </button>
                <!-- 自定义剧情输入 -->
                <div v-if="!showCustomInput" class="pt-1">
                  <button
                    @click="showCustomInput = true"
                    :disabled="store.isGenerating || isTransitioning"
                    class="w-full text-center px-3.5 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-all disabled:opacity-50"
                    :class="store.themeMode === 'night'
                      ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                      : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600'"
                  >
                    {{ t('novel.customChoice') }}
                  </button>
                </div>
                <div v-else class="pt-1 space-y-2">
                  <textarea
                    v-model="customChoiceText"
                    rows="2"
                    maxlength="200"
                    placeholder=""
                    :placeholder="t('novel.customPlaceholder')"
                    class="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    :class="store.themeMode === 'night'
                      ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500'
                      : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'"
                  ></textarea>
                  <div class="flex gap-2">
                    <button
                      @click="showCustomInput = false; customChoiceText = ''"
                      class="flex-1 py-2 rounded-lg border text-sm font-medium transition-all"
                      :class="store.themeMode === 'night' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'"
                    >{{ t('novel.cancel') }}</button>
                    <button
                      @click="submitCustomChoice"
                      :disabled="!customChoiceText.trim() || store.isGenerating"
                      class="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
                    >{{ t('novel.confirm') }}</button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </template>
      </div>

      <!-- 选项按钮区域：flip 模式下作为 flex 子元素排在文字区下方，不再 absolute 覆盖 -->
      <Transition
        enter-active-class="transition ease-out duration-300 transform"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition ease-in duration-200 transform"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="showChoices && store.pageMode === 'flip' && choicesVisible && !choicesCollapsed"
          @click.stop
          class="absolute bottom-0 left-0 right-0 z-30 border-t px-5 py-3 transition-colors duration-300"
          :class="store.themeMode === 'night' ? 'bg-[#0d0d0d] border-gray-800' : 'bg-[#FFF9E6] border-[#e8e0cc]'"
        >
          <!-- 收起按钮 -->
          <button
            @click="choicesCollapsed = true"
            class="absolute top-2 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            :class="store.themeMode === 'night' ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <p class="text-xs font-medium mb-2 transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ t('novel.chooseDirection') }}</p>
          <div class="space-y-2">
            <button
              v-for="choice in store.currentChoices"
              :key="choice.id"
              @click="selectChoice(choice)"
              :disabled="store.isGenerating || isTransitioning"
              class="w-full text-left px-3.5 py-2.5 rounded-lg border text-sm font-medium active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-snug"
              :class="store.themeMode === 'night'
                ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:border-gray-600 hover:text-white'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'"
            >
              {{ choice.text }}
            </button>
            <!-- 自定义剧情输入 -->
            <div v-if="!showCustomInput" class="pt-1">
              <button
                @click="showCustomInput = true"
                :disabled="store.isGenerating || isTransitioning"
                class="w-full text-center px-3.5 py-2.5 rounded-lg border border-dashed text-sm font-medium transition-all disabled:opacity-50"
                :class="store.themeMode === 'night'
                  ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  : 'border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600'"
              >
                ✏️ {{ t('novel.customChoice').replace('✏️ ', '') }}
              </button>
            </div>
            <div v-else class="pt-1 space-y-2">
              <textarea
                v-model="customChoiceText"
                rows="2"
                maxlength="200"
                :placeholder="t('novel.customPlaceholder')"
                class="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                :class="store.themeMode === 'night'
                  ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500'
                  : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'"
              ></textarea>
              <div class="flex gap-2">
                <button
                  @click="showCustomInput = false; customChoiceText = ''"
                  class="flex-1 py-2 rounded-lg border text-sm font-medium transition-all"
                  :class="store.themeMode === 'night' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'"
                >{{ t('novel.cancel') }}</button>
                <button
                  @click="submitCustomChoice"
                  :disabled="!customChoiceText.trim() || store.isGenerating"
                  class="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
                >{{ t('novel.confirm') }}</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 收起状态下的展开按钮 -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <button
          v-if="showChoices && store.pageMode === 'flip' && choicesCollapsed"
          @click.stop="choicesCollapsed = false"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full border shadow-sm text-xs font-medium transition-all"
          :class="store.themeMode === 'night'
            ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
        >
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
            </svg>
            {{ t('novel.chooseDirection') }}
          </span>
        </button>
      </Transition>

      <!-- 加载状态（覆盖文字区+选项区） -->
      <div
        v-if="store.isGenerating || isRewriting"
        class="absolute inset-0 flex items-center justify-center z-[35]"
        :class="store.themeMode === 'night' ? 'bg-[#0d0d0d]/80' : 'bg-white/80'"
      >
        <div class="flex items-center gap-3">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
          </div>
          <span class="text-sm transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-400' : 'text-gray-500'">{{ isRewriting ? t('novel.rewriting') : t('novel.generating') }}</span>
        </div>
      </div>

      <!-- 过渡加载 -->
      <div
        v-if="isTransitioning"
        class="absolute inset-0 flex items-center justify-center z-20"
        :class="store.themeMode === 'night' ? 'bg-[#0d0d0d]/80' : 'bg-white/80'"
      >
        <div class="flex items-center gap-3">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
          </div>
          <span class="text-sm transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-400' : 'text-gray-500'">{{ t('novel.generating') }}</span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-if="store.error && !store.isGenerating" class="absolute inset-x-5 top-6 z-20">
        <div class="p-4 rounded-xl border transition-colors duration-300" :class="store.themeMode === 'night' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-100'">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" :class="store.themeMode === 'night' ? 'text-red-400' : 'text-red-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="flex-1">
              <p class="text-sm" :class="store.themeMode === 'night' ? 'text-red-300' : 'text-red-700'">{{ store.error }}</p>
              <button
                @click="handleRetry"
                class="mt-2 text-sm font-medium transition-colors" :class="store.themeMode === 'night' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800'"
              >
                {{ t('novel.retry') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 点击层：仅在 flip 模式下显示，scroll 模式下通过文字区点击唤出控制栏 -->
      <div
        v-if="store.pageMode === 'flip'"
        class="absolute left-0 right-0 top-0 z-10 flex pointer-events-none"
        :style="{ bottom: showChoices ? '0px' : '0px' }"
      >
        <div class="w-1/3 h-full pointer-events-auto" @click="flipPrev"></div>
        <div class="w-1/3 h-full pointer-events-auto" @click="toggleActionBar"></div>
        <div class="w-1/3 h-full pointer-events-auto" @click="flipNext"></div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="translate-y-full" enter-to-class="translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="translate-y-0" leave-to-class="translate-y-full">
      <div
        v-if="showActionBar"
        @click.stop
        class="absolute bottom-0 left-0 right-0 z-[45] border-t shadow-lg px-5 py-4 transition-colors duration-300"
        :class="store.themeMode === 'night' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100'"
      >
        <div class="flex items-center justify-around">
          <!-- 字号 -->
          <div class="flex flex-col items-center gap-1" @click="showFontSizeModal = true">
            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors" :class="store.themeMode === 'night' ? 'bg-gray-800' : 'bg-gray-100'">
              <span class="text-sm font-bold" :class="store.themeMode === 'night' ? 'text-gray-300' : 'text-gray-600'">A</span>
            </div>
            <span class="text-[10px] transition-colors" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ t('novel.fontSize') }}</span>
          </div>
          <!-- 主题 -->
          <div class="flex flex-col items-center gap-1" @click="toggleTheme">
            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors" :class="store.themeMode === 'night' ? 'bg-gray-800' : 'bg-gray-100'">
              <svg v-if="store.themeMode === 'day'" class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
              <svg v-else class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            </div>
            <span class="text-[10px] transition-colors" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ store.themeMode === 'day' ? t('novel.themeDay') : t('novel.themeNight') }}</span>
          </div>
          <!-- 翻页模式 -->
          <div class="flex flex-col items-center gap-1" @click="togglePageMode">
            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors" :class="store.themeMode === 'night' ? 'bg-gray-800' : 'bg-gray-100'">
              <svg v-if="store.pageMode === 'flip'" class="w-5 h-5" :class="store.themeMode === 'night' ? 'text-gray-300' : 'text-gray-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
              <svg v-else class="w-5 h-5" :class="store.themeMode === 'night' ? 'text-gray-300' : 'text-gray-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"/>
              </svg>
            </div>
            <span class="text-[10px] transition-colors" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ store.pageMode === 'flip' ? t('novel.pageFlip') : t('novel.pageScroll') }}</span>
          </div>
          <!-- 结束/发表：已进入倒计时（endingCount > 0）时隐藏提前结束按钮 -->
          <div v-if="!isReadOnly && store.endingCount <= 0" class="flex flex-col items-center gap-1" @click="store.endingCount === 0 ? openPublishModal() : handleEnding()">
            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors" :class="store.themeMode === 'night' ? 'bg-gray-800' : 'bg-gray-100'">
              <svg v-if="store.endingCount === 0" class="w-5 h-5" :class="store.themeMode === 'night' ? 'text-green-400' : 'text-green-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              <svg v-else class="w-5 h-5" :class="store.themeMode === 'night' ? 'text-gray-300' : 'text-gray-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span class="text-[10px] transition-colors" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ store.endingCount === 0 ? t('novel.publish') : t('novel.endEarly') }}</span>
          </div>
          <!-- 重写本章 -->
          <div v-if="!isReadOnly" class="flex flex-col items-center gap-1" @click="openRewritePanel">
            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors" :class="store.themeMode === 'night' ? 'bg-gray-800' : 'bg-gray-100'">
              <svg class="w-5 h-5" :class="store.themeMode === 'night' ? 'text-gray-300' : 'text-gray-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span class="text-[10px] transition-colors" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ t('novel.rewriteChapter') }}</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 字号调节弹窗 -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showFontSizeModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-6 pb-8" @click="showFontSizeModal = false">
        <div class="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl" @click.stop>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ t('novel.fontSizeTitle') }}</h3>
            <span class="text-sm text-gray-500">{{ store.fontSize }}px</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-xs text-gray-400">14</span>
            <input
              type="range"
              min="14"
              max="35"
              v-model.number="store.fontSize"
              @input="store.setFontSize(store.fontSize)"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span class="text-xs text-gray-400">35</span>
          </div>
          <div class="mt-5 text-center text-sm leading-relaxed transition-colors duration-300" :class="store.themeMode === 'night' ? 'text-gray-300' : 'text-gray-700'" :style="{ fontSize: store.fontSize + 'px' }">
            {{ t('novel.fontPreview') }}
          </div>
        </div>
      </div>
    </transition>

    <!-- Toast -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-2">
      <div v-if="toast || store.toastMessage" class="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-gray-900 text-white text-sm rounded-xl shadow-lg z-50 max-w-[80%] text-center">
        {{ toast || store.toastMessage }}
      </div>
    </transition>

    <!-- Reset Confirm Modal -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showResetConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-6">
        <div class="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ t('novel.resetTitle') }}</h3>
          <p class="text-sm text-gray-500 mb-5">{{ t('novel.resetDesc') }}</p>
          <div class="flex gap-3">
            <button
              @click="showResetConfirm = false"
              class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {{ t('novel.cancel') }}
            </button>
            <button
              @click="doReset"
              class="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              {{ t('novel.resetConfirm') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 重写面板 -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showRewritePanel" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6" @click="showRewritePanel = false">
        <div class="w-full max-w-sm rounded-2xl shadow-xl p-5" :class="store.themeMode === 'night' ? 'bg-[#1a1a1a]' : 'bg-white'" @click.stop>
          <h3 class="text-base font-semibold mb-1" :class="store.themeMode === 'night' ? 'text-gray-200' : 'text-gray-900'">{{ t('novel.rewriteTitle') }}</h3>
          <p class="text-xs mb-3" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ t('novel.rewriteDesc') }}</p>
          <textarea
            v-model="rewriteInstruction"
            rows="3"
            maxlength="300"
            :placeholder="t('novel.rewritePlaceholder')"
            class="w-full px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            :class="store.themeMode === 'night'
              ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500'
              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'"
          ></textarea>
          <div class="flex gap-3 mt-3">
            <button
              @click="showRewritePanel = false"
              class="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
              :class="store.themeMode === 'night' ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
            >{{ t('novel.cancel') }}</button>
            <button
              @click="rewriteCurrentSegment"
              :disabled="!rewriteInstruction.trim()"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
            >{{ t('novel.rewriteStart') }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 发表弹窗 -->
    <transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="showPublishModal" class="absolute inset-0 z-[60] flex items-center justify-center" :class="store.themeMode === 'night' ? 'bg-black/70' : 'bg-black/40'" @click.self="showPublishModal = false">
        <div class="mx-6 w-full max-w-sm rounded-2xl p-5 shadow-xl" :class="store.themeMode === 'night' ? 'bg-[#1a1a1a]' : 'bg-white'">
          <h3 class="text-base font-semibold mb-3" :class="store.themeMode === 'night' ? 'text-gray-200' : 'text-gray-900'">{{ t('novel.publishTitle') }}</h3>
          <p class="text-xs mb-3" :class="store.themeMode === 'night' ? 'text-gray-400' : 'text-gray-500'">{{ t('novel.publishDesc') }}</p>
          <input
            v-model="publishTitle"
            maxlength="30"
            :placeholder="t('novel.publishPlaceholder')"
            class="w-full px-3 py-2.5 rounded-xl border text-sm mb-1 transition-colors"
            :class="store.themeMode === 'night' ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'"
          />
          <p class="text-[10px] text-right mb-4" :class="store.themeMode === 'night' ? 'text-gray-500' : 'text-gray-400'">{{ publishTitle.length }}/30</p>
          <div class="flex gap-3">
            <button
              @click="showPublishModal = false"
              class="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
              :class="store.themeMode === 'night' ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
            >{{ t('novel.cancel') }}</button>
            <button
              @click="handlePublish"
              :disabled="!publishTitle.trim() || isPublishing"
              class="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 bg-green-600 hover:bg-green-700"
            >{{ isPublishing ? t('novel.publishing') : t('novel.publishConfirm') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useNovelStore } from '../stores/novel.js'
import { useUserStore } from '../stores/user.js'
import { generateNext, pregenerateBranches, publishNovel, getPublishedNovel } from '../api/novel.js'
import { useLocale } from '../i18n'

const { t } = useLocale()

const router = useRouter()
const route = useRoute()
const store = useNovelStore()
const userStore = useUserStore()

const contentRef = ref(null)
const headerRef = ref(null)
const textAreaRef = ref(null)
const textContentRef = ref(null)
const showResetConfirm = ref(false)
const toast = ref('')
const isTransitioning = ref(false)
const isEditingTitle = ref(false)
const editingTheme = ref('')
const titleInputRef = ref(null)
const showActionBar = ref(false)
const showFontSizeModal = ref(false)
// currentInnerPage 已迁移到 store，使用 store.currentInnerPage
const textTotalHeight = ref(0)
const paragraphOffsets = ref([])
const paragraphHeights = ref([])
const choicesReady = ref(true)
let choicesDelayTimer = null
let navigatingToLastPage = false
const pageOpacity = ref(1)
let opacityTimer = null

// 自定义剧情输入
const showCustomInput = ref(false)
const customChoiceText = ref('')

// 翻页模式下选项区收起/展开
const choicesCollapsed = ref(false)
const choicesVisible = ref(false)
let choicesShowTimer = null

// 剧情重写
const showRewritePanel = ref(false)
const rewriteInstruction = ref('')
const isRewriting = ref(false)

// 滚动模式下追踪当前阅读位置
let scrollTrackTimer = null
function onScrollTrack() {
  if (store.pageMode !== 'scroll' || !textAreaRef.value) return
  if (scrollTrackTimer) clearTimeout(scrollTrackTimer)
  scrollTrackTimer = setTimeout(() => {
    const scrollTop = textAreaRef.value?.scrollTop || 0
    let visibleSegment = 0
    for (let i = 0; i < store.segments.length; i++) {
      const el = document.getElementById('segment-' + i)
      if (el && el.offsetTop <= scrollTop + 100) {
        visibleSegment = i
      }
    }
    if (store.currentPage !== visibleSegment) {
      store.currentPage = visibleSegment
    }
    // 记录精确滚动位置（供恢复使用）
    store.scrollPosition = scrollTop
  }, 300)
}

// 发表功能
const showPublishModal = ref(false)
const publishTitle = ref('')
const isPublishing = ref(false)

// 只读模式（广场阅读）
const isReadOnly = computed(() => !!route.params.publishId)
const readOnlyNovel = ref(null)

// 广场作品阅读位置存储
const READ_POS_KEY = 'novel_read_positions'
function saveReadPosition() {
  if (!isReadOnly.value) return
  const id = route.params.publishId
  try {
    const positions = JSON.parse(localStorage.getItem(READ_POS_KEY) || '{}')
    positions[id] = {
      currentPage: store.currentPage,
      currentInnerPage: store.currentInnerPage,
      scrollPosition: textAreaRef.value?.scrollTop || store.scrollPosition || 0,
      ts: Date.now()
    }
    localStorage.setItem(READ_POS_KEY, JSON.stringify(positions))
  } catch (e) {}
}
function getReadPosition(id) {
  try {
    const positions = JSON.parse(localStorage.getItem(READ_POS_KEY) || '{}')
    return positions[id] || null
  } catch (e) { return null }
}

const isLastPage = computed(() => store.currentPage === store.segments.length - 1)
const currentSegment = computed(() => store.segments[store.currentPage] || null)

// 文字区域实际可用高度（从 DOM 实时测量，flip 模式下按钮区已作为 flex 子元素不重叠）
const textAreaHeight = ref(400)

function updateTextAreaHeight() {
  nextTick(() => {
    if (textAreaRef.value) {
      const raw = textAreaRef.value.clientHeight
      const style = window.getComputedStyle(textAreaRef.value)
      const pt = parseFloat(style.paddingTop) || 0
      const pb = parseFloat(style.paddingBottom) || 0
      textAreaHeight.value = Math.max(200, raw - pt - pb)
    }
  })
}

// 基于段落边界的分页：确保每页最后一个段落完全显示
const pageBreaks = computed(() => {
  const breaks = [0]
  if (paragraphOffsets.value.length === 0 || textAreaHeight.value <= 0) return breaks

  for (let i = 1; i < paragraphOffsets.value.length; i++) {
    const pageStartIdx = breaks[breaks.length - 1]
    const pageStartOffset = paragraphOffsets.value[pageStartIdx]
    const prevIdx = i - 1
    const prevBottom = paragraphOffsets.value[prevIdx] + paragraphHeights.value[prevIdx]

    // 当前页只有一个段落且它超过了一屏，单独成页（允许截断），从下一个段落开始新页
    if (prevIdx === pageStartIdx && prevBottom - pageStartOffset > textAreaHeight.value) {
      if (i < paragraphOffsets.value.length) {
        breaks.push(i)
      }
      continue
    }

    // 如果第 i-1 个段落底部超出视口，就从第 i-1 个段落开始新一页
    if (prevBottom - pageStartOffset > textAreaHeight.value) {
      breaks.push(prevIdx)
    }
  }

  // 检查最后一个段落是否超出
  const lastIdx = paragraphOffsets.value.length - 1
  const pageStartIdx = breaks[breaks.length - 1]
  const lastBottom = paragraphOffsets.value[lastIdx] + paragraphHeights.value[lastIdx]
  if (lastBottom - paragraphOffsets.value[pageStartIdx] > textAreaHeight.value && lastIdx > pageStartIdx) {
    breaks.push(lastIdx)
  }

  return breaks
})

// 文字总页数
const totalTextPages = computed(() => {
  return Math.max(1, pageBreaks.value.length)
})

// 当前页应该偏移多少像素（基于段落边界）
const innerOffset = computed(() => {
  if (store.pageMode !== 'flip') return 0
  if (pageBreaks.value.length === 0 || store.currentInnerPage >= pageBreaks.value.length) return 0
  const paragraphIdx = pageBreaks.value[store.currentInnerPage]
  const offset = paragraphOffsets.value[paragraphIdx] || 0

  // flip 模式下按钮区已作为 flex 子元素排在文字区下方，无需再向上偏移
  return offset
})

// 当前页实际内容高度（clip-path 精确裁剪到当前页最后一个段落底部）
const currentPageContentHeight = computed(() => {
  if (store.pageMode !== 'flip') return textAreaHeight.value
  if (pageBreaks.value.length === 0 || store.currentInnerPage >= pageBreaks.value.length) return textAreaHeight.value

  const startIdx = pageBreaks.value[store.currentInnerPage]
  const startOffset = paragraphOffsets.value[startIdx] || 0

  let endIdx
  if (store.currentInnerPage < pageBreaks.value.length - 1) {
    endIdx = pageBreaks.value[store.currentInnerPage + 1] - 1
  } else {
    endIdx = paragraphOffsets.value.length - 1
  }

  if (endIdx < startIdx) endIdx = startIdx
  if (endIdx >= paragraphOffsets.value.length) endIdx = paragraphOffsets.value.length - 1

  const endBottom = paragraphOffsets.value[endIdx] + paragraphHeights.value[endIdx]
  return Math.min(endBottom - startOffset, textAreaHeight.value)
})

// 是否到了文字最后一页（scroll 模式下始终视为翻完）
const isLastTextPage = computed(() => {
  if (store.pageMode === 'scroll') return true
  return store.currentInnerPage >= totalTextPages.value - 1
})

// 是否显示选项按钮（翻到最后一页时立即显示，无需延迟）
const showChoices = computed(() => {
  if (isReadOnly.value) return false
  return isLastPage.value &&
    isLastTextPage.value &&
    store.currentChoices.length > 0 &&
    !store.isGenerating &&
    !isTransitioning.value &&
    currentSegment.value &&
    store.endingCount !== 0
})

// 监听 showChoices 变化，翻页模式下延迟1秒滑入选项区
watch(showChoices, (val) => {
  if (choicesShowTimer) { clearTimeout(choicesShowTimer); choicesShowTimer = null }
  if (val && store.pageMode === 'flip') {
    choicesCollapsed.value = false
    choicesVisible.value = false
    choicesShowTimer = setTimeout(() => {
      choicesVisible.value = true
    }, 1000)
  } else if (!val) {
    choicesVisible.value = false
  } else {
    // scroll 模式立即显示
    choicesVisible.value = true
  }
})

onMounted(async () => {
  // 广场只读模式：加载发表小说数据
  if (isReadOnly.value) {
    try {
      const novel = await getPublishedNovel(route.params.publishId)
      readOnlyNovel.value = novel
      // 将数据注入 store 用于阅读
      store.segments = novel.segments || []
      // 恢复上次阅读位置
      const savedPos = getReadPosition(route.params.publishId)
      store.currentPage = savedPos ? Math.min(savedPos.currentPage, (novel.segments || []).length - 1) : 0
      store.currentInnerPage = savedPos ? savedPos.currentInnerPage : 0
      store.scrollPosition = savedPos ? (savedPos.scrollPosition || 0) : 0
      store.theme = novel.title
      store.style = novel.style
      store.currentChoices = []
      store.endingCount = 0
    } catch (e) {
      router.replace('/')
      return
    }
  } else if (!store.hasSession) {
    router.replace('/')
    return
  }

  calcPageHeight()
  window.addEventListener('resize', calcPageHeight)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  nextTick(() => {
    measureTextHeight()
    nextTick(() => {
      // 滚动模式下恢复阅读位置：优先使用精确 scrollPosition，后退到 segment offsetTop
      if (store.pageMode === 'scroll' && textAreaRef.value) {
        const targetScroll = store.scrollPosition || 0
        if (targetScroll > 0) {
          textAreaRef.value.scrollTop = targetScroll
        } else if (store.currentPage > 0) {
          const segmentEl = document.getElementById('segment-' + store.currentPage)
          if (segmentEl) {
            textAreaRef.value.scrollTop = segmentEl.offsetTop
          }
        }
      }
      if (showChoices.value && !choicesVisible.value) {
        if (store.pageMode === 'flip') {
          choicesCollapsed.value = false
          choicesShowTimer = setTimeout(() => {
            choicesVisible.value = true
          }, 1000)
        } else {
          choicesVisible.value = true
        }
      }
    })
  })
})

// 统一保存当前阅读位置到 store/localStorage（在 DOM 销毁前调用）
function persistReadingPosition() {
  try {
    if (store.pageMode === 'scroll' && textAreaRef.value) {
      store.scrollPosition = textAreaRef.value.scrollTop || 0
    }
  } catch (e) {}
  saveReadPosition()
  if (!isReadOnly.value) {
    try { store.saveSession() } catch (e) {}
  }
}

// 页面关闭/刷新时保证位置落盘
function handleBeforeUnload() {
  persistReadingPosition()
}

// 切换 tab/隐藏页面时保存
function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    persistReadingPosition()
  }
}

// SPA 路由跳转前保存（点击返回/底部导航等）
onBeforeRouteLeave(() => {
  persistReadingPosition()
})

// 组件销毁前（DOM 还可访问）保存
onBeforeUnmount(() => {
  persistReadingPosition()
})

onUnmounted(() => {
  window.removeEventListener('resize', calcPageHeight)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (choicesDelayTimer) clearTimeout(choicesDelayTimer)
  if (opacityTimer) clearTimeout(opacityTimer)
  if (choicesShowTimer) clearTimeout(choicesShowTimer)
  if (scrollTrackTimer) clearTimeout(scrollTrackTimer)
})

watch(() => store.currentPage, () => {
  if (navigatingToLastPage) {
    navigatingToLastPage = false
    nextTick(() => {
      nextTick(() => {
        // 等待 DOM 渲染新 segment 内容后同步测量
        if (textContentRef.value) {
          textTotalHeight.value = textContentRef.value.offsetHeight
          const containerRect = textContentRef.value.getBoundingClientRect()
          const paragraphs = textContentRef.value.querySelectorAll('p')
          paragraphOffsets.value = []
          paragraphHeights.value = []
          paragraphs.forEach(p => {
            const rect = p.getBoundingClientRect()
            paragraphOffsets.value.push(rect.top - containerRect.top)
            paragraphHeights.value.push(rect.height)
          })
        }
        nextTick(() => {
          store.currentInnerPage = Math.max(0, totalTextPages.value - 1)
        })
      })
    })
  } else {
    store.currentInnerPage = 0
    nextTick(measureTextHeight)
  }
})

watch(() => store.segments.length, () => {
  nextTick(() => {
    calcPageHeight()
    measureTextHeight()
  })
  // 新 segment 生成后延迟 1.5 秒才让选项按钮出现，给用户阅读时间
  choicesReady.value = false
  if (choicesDelayTimer) clearTimeout(choicesDelayTimer)
  choicesDelayTimer = setTimeout(() => {
    choicesReady.value = true
  }, 1500)
})

watch(() => store.fontSize, () => {
  nextTick(measureTextHeight)
})

function measureTextHeight() {
  nextTick(() => {
    if (textContentRef.value) {
      textTotalHeight.value = textContentRef.value.offsetHeight
      // 测量每个段落的位置和高度
      const containerRect = textContentRef.value.getBoundingClientRect()
      const paragraphs = textContentRef.value.querySelectorAll('p')
      paragraphOffsets.value = []
      paragraphHeights.value = []
      paragraphs.forEach(p => {
        const rect = p.getBoundingClientRect()
        paragraphOffsets.value.push(rect.top - containerRect.top)
        paragraphHeights.value.push(rect.height)
      })
    } else {
      textTotalHeight.value = 0
      paragraphOffsets.value = []
      paragraphHeights.value = []
    }
    updateTextAreaHeight()
  })
}

function calcPageHeight() {
  updateTextAreaHeight()
}

function flipPrev() {
  showActionBar.value = false
  // 重写中禁止翻页
  if (isRewriting.value) return
  // 动画进行中禁止重复点击
  if (pageOpacity.value !== 1) return
  // 翻页模式：先尝试在当前 segment 内往回翻页
  if (store.pageMode === 'flip' && store.currentInnerPage > 0) {
    pageOpacity.value = 0
    if (opacityTimer) clearTimeout(opacityTimer)
    opacityTimer = setTimeout(() => {
      store.currentInnerPage--
      pageOpacity.value = 1
    }, 100)
    return
  }
  // 切换到上一个 segment
  if (store.currentPage > 0) {
    pageOpacity.value = 0
    if (opacityTimer) clearTimeout(opacityTimer)
    opacityTimer = setTimeout(() => {
      navigatingToLastPage = true
      store.setPage(store.currentPage - 1)
      pageOpacity.value = 1
    }, 100)
    return
  }
  showToast(t('novel.atBeginning'))
}

function flipNext() {
  showActionBar.value = false
  // 重写中禁止翻页
  if (isRewriting.value) return
  // 动画进行中禁止重复点击
  if (pageOpacity.value !== 1) return
  // 翻页模式：先尝试在当前 segment 内往后翻页
  if (store.pageMode === 'flip' && !isLastTextPage.value) {
    pageOpacity.value = 0
    if (opacityTimer) clearTimeout(opacityTimer)
    opacityTimer = setTimeout(() => {
      store.currentInnerPage++
      pageOpacity.value = 1
    }, 100)
    return
  }
  // 当前 segment 文字已羻完
  if (isLastPage.value && isLastTextPage.value) {
    if (isReadOnly.value) {
      showToast(t('novel.atEnd'))
    } else {
      showToast(t('novel.chooseOne'))
    }
    return
  }
  // 切换到下一个 segment（仅当不是最后一页时）
  if (store.currentPage < store.segments.length - 1) {
    pageOpacity.value = 0
    if (opacityTimer) clearTimeout(opacityTimer)
    opacityTimer = setTimeout(() => {
      store.setPage(store.currentPage + 1)
      store.currentInnerPage = 0
      pageOpacity.value = 1
    }, 100)
    return
  }
  showToast(t('novel.atEnd'))
}

function toggleActionBar() {
  showActionBar.value = !showActionBar.value
}

function onTouchMove(e) {
  // 任何触摸操作都关闭控制栏
  showActionBar.value = false
  // flip 模式下阻止触摸滚动，scroll 模式下放行
  if (store.pageMode === 'flip') {
    e.stopPropagation()
    e.preventDefault()
  }
}

function onWheel(e) {
  // 任何滚动操作都关闭控制栏
  showActionBar.value = false
  // flip 模式下阻止滚轮滚动，scroll 模式下放行
  if (store.pageMode === 'flip') {
    e.stopPropagation()
    e.preventDefault()
  }
}

function handleTextAreaClick(e) {
  // scroll 模式下点击中间 1/3 区域唤出/关闭控制栏
  if (store.pageMode !== 'scroll') return
  const rect = textAreaRef.value?.getBoundingClientRect()
  if (!rect) return
  const x = e.clientX - rect.left
  const width = rect.width
  // 中间 1/3 区域
  if (x > width * 0.33 && x < width * 0.66) {
    toggleActionBar()
  }
}

async function selectChoice(choice) {
  if (store.isGenerating || isTransitioning.value) return

  store.makeChoice(choice.text)
  store.clearError()

  // 优先使用预生成内容，增加1秒过渡动画
  if (choice.pregenerated) {
    isTransitioning.value = true
    setTimeout(() => {
      store.appendSegment(
        choice.pregenerated.text,
        choice.pregenerated.choices,
        choice.pregenerated.summary,
        choice.pregenerated.chapterTitle
      )
      store.decrementEnding()
      isTransitioning.value = false

      // 后台异步预生成分支（不阻塞用户阅读）
      triggerPregenerate()
    }, 1000)
    return
  }

  // 兜底：正常 API 请求
  store.setGenerating(true)
  try {
    const nextChapterNumber = store.segments.length + 1
    const data = await generateNext(
      store.theme,
      store.style,
      store.summaries,
      choice.text,
      store.endingCount,
      nextChapterNumber,
      store.characterSetting,
      store.worldSetting,
      store.narrativePerspective,
      0, '', store.selectedModel, store.totalChapters, store.wordCountPerChapter
    )
    store.appendSegment(data.text, data.choices, data.summary, data.chapterTitle)
    store.decrementEnding()

    // 后台异步预生成分支（不阻塞用户阅读）
    triggerPregenerate()
  } catch (err) {
    store.setError(err.message)
  } finally {
    store.setGenerating(false)
  }
}

// 提交自定义剧情走向
async function submitCustomChoice() {
  const text = customChoiceText.value.trim()
  if (!text || store.isGenerating || isTransitioning.value) return

  showCustomInput.value = false
  customChoiceText.value = ''

  store.makeChoice(text)
  store.clearError()
  store.setGenerating(true)

  try {
    const nextChapterNumber = store.segments.length + 1
    const data = await generateNext(
      store.theme,
      store.style,
      store.summaries,
      text,
      store.endingCount,
      nextChapterNumber,
      store.characterSetting,
      store.worldSetting,
      store.narrativePerspective,
      0, '', store.selectedModel, store.totalChapters, store.wordCountPerChapter
    )
    store.appendSegment(data.text, data.choices, data.summary, data.chapterTitle)
    store.decrementEnding()
    triggerPregenerate()
  } catch (err) {
    store.setError(err.message)
  } finally {
    store.setGenerating(false)
  }
}

// 打开重写面板
function openRewritePanel() {
  showActionBar.value = false
  nextTick(() => {
    showRewritePanel.value = true
  })
}

// 重写当前段落
async function rewriteCurrentSegment() {
  const instruction = rewriteInstruction.value.trim()
  if (!instruction || isRewriting.value) return

  isRewriting.value = true
  showRewritePanel.value = false

  try {
    const segmentIndex = store.currentPage
    const segment = store.segments[segmentIndex]
    // 获取生成此段时的选择（从 history 中反推）
    const lastChoice = segmentIndex > 0 && store.history[segmentIndex - 1]
      ? store.history[segmentIndex - 1].chosenChoice
      : '自动承接上段'

    const data = await generateNext(
      store.theme,
      store.style,
      store.summaries.slice(0, segmentIndex),
      lastChoice,
      store.endingCount,
      segmentIndex + 1,
      store.characterSetting,
      store.worldSetting,
      store.narrativePerspective,
      0, // retryCount
      instruction, // rewriteInstruction
      store.selectedModel,
      store.totalChapters,
      store.wordCountPerChapter
    )

    // 替换当前段落
    const chapterNumber = segmentIndex + 1
    const displayTitle = data.chapterTitle ? `第${chapterNumber}章：${data.chapterTitle}` : `第${chapterNumber}章`
    store.segments[segmentIndex] = {
      text: data.text,
      choices: data.choices,
      summary: data.summary,
      chapterTitle: displayTitle,
      textSegments: [displayTitle, ...data.text.split('\n\n').filter(s => s.trim())]
    }
    store.currentChoices = data.choices
    if (store.summaries[segmentIndex] !== undefined) {
      store.summaries[segmentIndex] = data.summary
    }
    store.saveSession()
    store.showToast(t('novel.rewritten'))
    rewriteInstruction.value = ''
    // 重写后重新测量分页
    nextTick(measureTextHeight)
  } catch (err) {
    store.setError('重写失败：' + err.message)
  } finally {
    isRewriting.value = false
  }
}

function triggerPregenerate() {
  const isEnding = store.endingCount === 1 || store.endingCount === 0
  if (isEnding || store.currentChoices.length === 0) return

  const currentSummaries = [...store.summaries]
  const currentChoices = store.currentChoices.map(c => ({ id: c.id, text: c.text }))
  const currentChapterNumber = store.segments.length

  pregenerateBranches(store.theme, store.style, currentSummaries, currentChoices, store.endingCount, currentChapterNumber, store.characterSetting, store.worldSetting, store.narrativePerspective, store.selectedModel, store.totalChapters, store.wordCountPerChapter).then(enrichedChoices => {
    if (enrichedChoices) {
      store.currentChoices = enrichedChoices
      store.saveSession()
    }
  })
}

function handleRetry() {
  store.clearError()
  const lastHistory = store.history[store.history.length - 1]
  if (lastHistory) {
    selectChoice({ text: lastHistory.chosenChoice })
  } else {
    store.initSession(store.theme, store.style)
    selectChoice({ text: '自动承接上段' })
  }
}

function toggleTheme() {
  store.setThemeMode(store.themeMode === 'day' ? 'night' : 'day')
}

function togglePageMode() {
  const newMode = store.pageMode === 'flip' ? 'scroll' : 'flip'

  if (newMode === 'scroll') {
    // flip → scroll: 保存当前 flip 阅读位置，精确还原到相同位置
    const savedCurrentPage = store.currentPage
    const savedOffset = innerOffset.value
    store.setPageMode(newMode)
    pageOpacity.value = 1
    store.currentInnerPage = 0
    nextTick(() => {
      // 等待 scroll 模式 DOM 完全渲染后定位
      nextTick(() => {
        if (textAreaRef.value) {
          const segmentEl = document.getElementById('segment-' + savedCurrentPage)
          if (segmentEl) {
            // segment 在滚动容器中的 offsetTop + flip 模式中的段内偏移
            textAreaRef.value.scrollTop = segmentEl.offsetTop + savedOffset
          }
        }
        calcPageHeight()
        measureTextHeight()
      })
    })
  } else {
    // scroll → flip: 根据滚动位置找到最近的 segment 和 inner page
    const savedScrollTop = textAreaRef.value?.scrollTop || 0

    // 找到当前滚动位置对应的 segment 及段内偏移
    let targetSegment = 0
    let segmentOffset = 0
    for (let i = 0; i < store.segments.length; i++) {
      const el = document.getElementById('segment-' + i)
      if (el && textAreaRef.value) {
        const elTop = el.offsetTop
        if (savedScrollTop >= elTop - 10) {
          targetSegment = i
          segmentOffset = savedScrollTop - elTop
        }
      }
    }

    store.setPageMode(newMode)
    store.setPage(targetSegment)
    pageOpacity.value = 1
    store.currentInnerPage = 0

    // 等待 DOM 更新后重新测量，再找到最近的 inner page
    nextTick(() => {
      nextTick(() => {
        // 同步测量当前 segment 的段落信息
        if (textContentRef.value) {
          textTotalHeight.value = textContentRef.value.offsetHeight
          const containerRect = textContentRef.value.getBoundingClientRect()
          const paragraphs = textContentRef.value.querySelectorAll('p')
          paragraphOffsets.value = []
          paragraphHeights.value = []
          paragraphs.forEach(p => {
            const rect = p.getBoundingClientRect()
            paragraphOffsets.value.push(rect.top - containerRect.top)
            paragraphHeights.value.push(rect.height)
          })
        }
        updateTextAreaHeight()
        nextTick(() => {
          // 找到最接近 segmentOffset 的 inner page
          let nearestPage = 0
          let minDistance = Infinity
          for (let j = 0; j < pageBreaks.value.length; j++) {
            const offset = paragraphOffsets.value[pageBreaks.value[j]] || 0
            const distance = Math.abs(offset - segmentOffset)
            if (distance < minDistance) {
              minDistance = distance
              nearestPage = j
            }
          }
          store.currentInnerPage = nearestPage
        })
      })
    })
  }
}

function handleEnding() {
  store.startEnding()
}

function openPublishModal() {
  showActionBar.value = false
  publishTitle.value = store.theme
  showPublishModal.value = true
}

async function handlePublish() {
  if (!publishTitle.value.trim() || isPublishing.value) return
  isPublishing.value = true
  try {
    await publishNovel({
      title: publishTitle.value.trim(),
      author: userStore.userId,
      style: store.style,
      theme: store.theme,
      characterSetting: store.characterSetting,
      worldSetting: store.worldSetting,
      segments: store.segments,
      chapterCount: store.segments.length
    })
    store.markPublished()
    showPublishModal.value = false
    showToast(t('novel.publishSuccess'))
    // 发表成功后跳转到广场首页
    router.push('/')
  } catch (err) {
    showToast(t('novel.publishFailed') + '：' + err.message)
  } finally {
    isPublishing.value = false
  }
}

function startEditTitle() {
  editingTheme.value = store.theme
  isEditingTitle.value = true
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

function saveTitle() {
  const newTitle = editingTheme.value.trim()
  if (newTitle && newTitle !== store.theme) {
    store.setTheme(newTitle)
  }
  isEditingTitle.value = false
}

function handleUndo() {
  if (!store.history || store.history.length === 0) {
    showToast(t('novel.atBeginning'))
    return
  }
  const success = store.undo()
  if (success) {
    showToast(t('novel.undone'))
  } else {
    showToast(t('novel.undoFailed'))
  }
}

function goHome() {
  // 根据进入本页前的来源返回到对应页面（从“我的”进入则返回“我的”，其他默认探索页）
  let from = '/'
  try {
    from = sessionStorage.getItem('novel_from') || '/'
  } catch (e) {}
  router.push(from)
}

function copyText() {
  const text = store.fullText
  if (!text) return

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(t('novel.copied'))
    }).catch(() => {
      fallbackCopy(text)
    })
  } else {
    fallbackCopy(text)
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
  showToast(t('novel.copied'))
}

function doReset() {
  store.resetSession()
  showResetConfirm.value = false
  router.replace('/')
}

function showToast(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = '' }, 2500)
}
</script>

<style scoped>
/* 隐藏滚动条 */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* 翻页动画：opacity 淡入淡出 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease;
}

.page-enter-from {
  opacity: 0;
}

.page-leave-to {
  opacity: 0;
}

/* 选项按钮淡入 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
</style>
