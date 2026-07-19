import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useUserStore } from './user'
import { useLocale } from '../i18n'

const STORAGE_KEY = 'novel_session'
const LIBRARY_KEY = 'novel_library'
const CURRENT_ID_KEY = 'novel_current_id'

function getLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.warn('library 读取失败:', e)
    return []
  }
}

function saveLibrary(library) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
  } catch (e) {
    console.warn('library 写入失败:', e)
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        theme: parsed.theme || '',
        style: parsed.style || '',
        summaries: parsed.summaries || [],
        fullText: parsed.fullText || '',
        segments: parsed.segments || [],
        currentChoices: parsed.currentChoices || [],
        history: (parsed.history || []).map(h => ({
          segmentIndex: h.segmentIndex ?? 0,
          chosenChoice: h.chosenChoice || '',
          summary: h.summary || '',
          previousChoices: h.previousChoices || [],
          previousFullText: h.previousFullText || ''
        })),
        isGenerating: false,
        error: null,
        generationCount: parsed.generationCount || 0,
        currentPage: parsed.currentPage || 0,
        currentInnerPage: parsed.currentInnerPage || 0,
        scrollPosition: parsed.scrollPosition || 0,
        fontSize: parsed.fontSize || 18,
        themeMode: parsed.themeMode || 'day',
        pageMode: parsed.pageMode || 'flip',
        endingCount: parsed.endingCount ?? -1,
        characterSetting: parsed.characterSetting || '',
        worldSetting: parsed.worldSetting || '',
        narrativePerspective: parsed.narrativePerspective || '',
        selectedModel: parsed.selectedModel || 'qwen-plus'
      }
    }
  } catch (e) {
    console.warn('localStorage 读取失败:', e)
  }
  return null
}

// 有效模型列表，不在此列表中的历史值会被重置为默认 qwen-plus
const VALID_MODELS = ['qwen-plus', 'qwen-max', 'qwen-turbo', 'deepseek-v3', 'deepseek-r1']
function normalizeModel(m) {
  return VALID_MODELS.includes(m) ? m : 'qwen-plus'
}

export const useNovelStore = defineStore('novel', () => {
  const { t } = useLocale()

  // State
  const theme = ref('')
  const style = ref('')
  const summaries = ref([])
  const fullText = ref('')
  const segments = ref([])
  const currentChoices = ref([])
  const history = ref([])
  const isGenerating = ref(false)
  const error = ref(null)
  const generationCount = ref(0)
  const toastMessage = ref('')
  const currentPage = ref(0)
  const currentInnerPage = ref(0)
  const scrollPosition = ref(0)
  const fontSize = ref(18)
  const themeMode = ref('day')
  const pageMode = ref('scroll')
  const endingCount = ref(-1)
  const totalChapters = ref(0)
  const wordCountPerChapter = ref(1000)
  const characterSetting = ref('')
  const worldSetting = ref('')
  const narrativePerspective = ref('')
  const currentNovelId = ref('')
  const selectedModel = ref('qwen-plus')
  // 响应式版本号，每次 library 变化时递增，确保 computed 能感知到变化
  const libraryVersion = ref(0)

  // Load from localStorage on init
  const saved = loadSession()
  try {
    const savedId = localStorage.getItem(CURRENT_ID_KEY)
    if (savedId) currentNovelId.value = savedId
  } catch (e) {}
  if (saved) {
    theme.value = saved.theme
    style.value = saved.style
    summaries.value = saved.summaries
    fullText.value = saved.fullText
    segments.value = saved.segments
    currentChoices.value = saved.currentChoices
    history.value = saved.history
    generationCount.value = saved.generationCount
    currentPage.value = saved.currentPage
    currentInnerPage.value = saved.currentInnerPage || 0
    scrollPosition.value = saved.scrollPosition || 0
    fontSize.value = saved.fontSize
    themeMode.value = saved.themeMode
    pageMode.value = saved.pageMode
    endingCount.value = saved.endingCount
    totalChapters.value = saved.totalChapters || 0
    wordCountPerChapter.value = saved.wordCountPerChapter || 1000
    characterSetting.value = saved.characterSetting
    worldSetting.value = saved.worldSetting
    narrativePerspective.value = saved.narrativePerspective
    selectedModel.value = normalizeModel(saved.selectedModel)
  }

  // Computed
  const hasSession = computed(() => !!theme.value && !!style.value)
  const canContinue = computed(() => hasSession.value && currentChoices.value.length > 0)
  const totalPages = computed(() => segments.value.length)

  // Actions
  function initSession(newTheme, newStyle, newCharacter = '', newWorld = '', newPerspective = '') {
    // 如果有正在创作的小说，先归档到 library
    if (theme.value && currentNovelId.value) {
      archiveCurrentToLibrary()
    }
    theme.value = newTheme.trim()
    style.value = newStyle
    characterSetting.value = newCharacter.trim()
    worldSetting.value = newWorld.trim()
    narrativePerspective.value = newPerspective
    summaries.value = []
    fullText.value = ''
    segments.value = []
    currentChoices.value = []
    history.value = []
    generationCount.value = 0
    currentPage.value = 0
    currentInnerPage.value = 0
    scrollPosition.value = 0
    error.value = null
    endingCount.value = -1
    // totalChapters 在 initSession 中不重置，由 CreateView 在调用前设置
    currentNovelId.value = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    try { localStorage.setItem(CURRENT_ID_KEY, currentNovelId.value) } catch (e) {}
    saveSession()
  }

  function archiveCurrentToLibrary() {
    if (!theme.value || !currentNovelId.value) return
    const library = getLibrary()
    const payload = {
      id: currentNovelId.value,
      theme: theme.value,
      style: style.value,
      summaries: summaries.value,
      fullText: fullText.value,
      segments: segments.value,
      currentChoices: currentChoices.value,
      history: history.value,
      generationCount: generationCount.value,
      currentPage: currentPage.value,
      currentInnerPage: currentInnerPage.value,
      scrollPosition: scrollPosition.value,
      fontSize: fontSize.value,
      themeMode: themeMode.value,
      pageMode: pageMode.value,
      endingCount: endingCount.value,
      totalChapters: totalChapters.value,
      wordCountPerChapter: wordCountPerChapter.value,
      characterSetting: characterSetting.value,
      worldSetting: worldSetting.value,
      narrativePerspective: narrativePerspective.value,
      updatedAt: Date.now()
    }
    const idx = library.findIndex(n => n.id === currentNovelId.value)
    if (idx >= 0) {
      library[idx] = payload
    } else {
      library.push(payload)
    }
    saveLibrary(library)
    libraryVersion.value++
  }

  function appendSegment(text, choices, summary, chapterTitle) {
    const chapterNumber = segments.value.length + 1
    const displayTitle = chapterTitle ? t('store.chapterTitle', { n: chapterNumber, title: chapterTitle }) : t('store.chapterTitleShort', { n: chapterNumber })
    const segmentText = displayTitle + '\n\n' + text

    fullText.value += (fullText.value ? '\n\n' : '') + segmentText
    segments.value.push({
      text,
      choices,
      summary,
      chapterTitle: displayTitle,
      textSegments: [displayTitle, ...text.split('\n\n').filter(s => s.trim())]
    })
    currentChoices.value = choices
    summaries.value.push(summary)
    generationCount.value++
    currentPage.value = segments.value.length - 1

    // 滑动窗口摘要池
    if (summaries.value.length > 12) {
      summaries.value = summaries.value.slice(-8)
      showToast(t('store.contextOptimized'))
    }

    saveSession()
  }

  function makeChoice(choiceText) {
    history.value.push({
      segmentIndex: generationCount.value,
      chosenChoice: choiceText,
      summary: summaries.value[summaries.value.length - 1] || '',
      previousChoices: JSON.parse(JSON.stringify(currentChoices.value)),
      previousFullText: fullText.value
    })
    saveSession()
  }

  function undo() {
    if (history.value.length === 0) return false

    const last = history.value[history.value.length - 1]

    // 旧数据兼容性
    const hasOldData = (!last.previousChoices || last.previousChoices.length === 0) && !last.previousFullText
    if (hasOldData) {
      console.warn('[undo] 检测到旧 session 数据，无法正确撤销，建议重新开始')
      return false
    }

    fullText.value = last.previousFullText || ''
    summaries.value.pop()
    currentChoices.value = last.previousChoices || []
    generationCount.value = last.segmentIndex
    segments.value.pop()
    currentPage.value = Math.max(0, segments.value.length - 1)
    currentInnerPage.value = 0

    // 如果小说已完结（endingCount === 0），撤销时恢复为 1（回到完结前一步的状态）
    if (endingCount.value === 0) {
      endingCount.value = 1
    }

    history.value.pop()
    saveSession()
    return true
  }

  function setPage(page) {
    currentPage.value = Math.max(0, Math.min(page, segments.value.length - 1))
    currentInnerPage.value = 0
    saveSession()
  }

  function setTheme(newTheme) {
    theme.value = newTheme.trim()
    saveSession()
  }

  function setGenerating(val) {
    isGenerating.value = val
  }

  function setError(msg) {
    error.value = msg
  }

  function clearError() {
    error.value = null
  }

  function resetSession() {
    theme.value = ''
    style.value = ''
    characterSetting.value = ''
    worldSetting.value = ''
    narrativePerspective.value = ''
    summaries.value = []
    fullText.value = ''
    segments.value = []
    currentChoices.value = []
    history.value = []
    generationCount.value = 0
    currentPage.value = 0
    currentInnerPage.value = 0
    scrollPosition.value = 0
    fontSize.value = 18
    themeMode.value = 'day'
    pageMode.value = 'flip'
    endingCount.value = -1
    error.value = null
    currentNovelId.value = ''
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CURRENT_ID_KEY)
  }

  function setFontSize(size) {
    fontSize.value = Math.max(14, Math.min(35, size))
    saveSession()
  }

  function setThemeMode(mode) {
    themeMode.value = mode
    saveSession()
  }

  function setPageMode(mode) {
    pageMode.value = mode
    saveSession()
  }

  function startEnding() {
    if (endingCount.value === -1) {
      endingCount.value = 3
      showToast(t('store.endingIn3'))
    } else if (endingCount.value > 0) {
      showToast(t('store.endingInN', { n: endingCount.value }))
    } else {
      showToast(t('store.alreadyEnded'))
    }
    saveSession()
  }

  function checkAutoEnding() {
    // 当设置了预计章节数，且到达倒数第3章时自动触发结束流程
    if (totalChapters.value > 0 && endingCount.value === -1) {
      const remaining = totalChapters.value - generationCount.value
      if (remaining <= 0) {
        // 已超过预计章节数，立即完结
        endingCount.value = 1
        showToast(t('store.endNextChapter'))
        saveSession()
      } else if (remaining <= 3) {
        endingCount.value = remaining
        showToast(t('store.remainingChapters', { n: remaining }))
        saveSession()
      }
    }
  }

  function decrementEnding() {
    if (endingCount.value > 0) {
      endingCount.value--
      if (endingCount.value > 0) {
        showToast(t('store.remainingWrites', { n: endingCount.value }))
      } else {
        showToast(t('store.alreadyEnded'))
      }
      saveSession()
    } else {
      // 未手动触发结束时，检查是否到达预计章节数的倒数第3章
      checkAutoEnding()
    }
  }

  function showToast(msg) {
    toastMessage.value = msg
    setTimeout(() => {
      toastMessage.value = ''
    }, 3000)
  }

  function saveSession() {
    try {
      const payload = {
        theme: theme.value,
        style: style.value,
        summaries: summaries.value,
        fullText: fullText.value,
        segments: segments.value,
        currentChoices: currentChoices.value,
        history: history.value,
        generationCount: generationCount.value,
        currentPage: currentPage.value,
        currentInnerPage: currentInnerPage.value,
        scrollPosition: scrollPosition.value,
        fontSize: fontSize.value,
        themeMode: themeMode.value,
        pageMode: pageMode.value,
        endingCount: endingCount.value,
        totalChapters: totalChapters.value,
        wordCountPerChapter: wordCountPerChapter.value,
        characterSetting: characterSetting.value,
        worldSetting: worldSetting.value,
        narrativePerspective: narrativePerspective.value,
        selectedModel: selectedModel.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      // 同时更新 library 中的当前小说
      if (currentNovelId.value && theme.value) {
        archiveCurrentToLibrary()
      }
      // 同步到服务器（防抖）
      syncToServer()
    } catch (e) {
      console.warn('localStorage 写入失败:', e)
    }
  }

  // 防抖同步到服务器
  let syncTimer = null
  function syncToServer() {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      const userStore = useUserStore()
      if (!userStore.isLoggedIn) return
      const data = {
        session: {
          theme: theme.value,
          style: style.value,
          summaries: summaries.value,
          fullText: fullText.value,
          segments: segments.value,
          currentChoices: currentChoices.value,
          history: history.value,
          generationCount: generationCount.value,
          currentPage: currentPage.value,
          currentInnerPage: currentInnerPage.value,
          fontSize: fontSize.value,
          themeMode: themeMode.value,
          pageMode: pageMode.value,
          endingCount: endingCount.value,
          totalChapters: totalChapters.value,
          wordCountPerChapter: wordCountPerChapter.value,
          characterSetting: characterSetting.value,
          worldSetting: worldSetting.value,
          narrativePerspective: narrativePerspective.value,
          selectedModel: selectedModel.value
        },
        library: getLibrary(),
        currentNovelId: currentNovelId.value
      }
      userStore.saveUserData(data)
    }, 2000)
  }

  // 从服务器加载数据
  async function loadFromServer() {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return false
    const data = await userStore.loadUserData()
    if (!data) return false

    // 恢复 library
    if (data.library) {
      saveLibrary(data.library)
      libraryVersion.value++
    }
    // 恢复 currentNovelId
    if (data.currentNovelId) {
      currentNovelId.value = data.currentNovelId
      try { localStorage.setItem(CURRENT_ID_KEY, data.currentNovelId) } catch (e) {}
    }
    // 恢复 session
    if (data.session) {
      const s = data.session
      theme.value = s.theme || ''
      style.value = s.style || ''
      summaries.value = s.summaries || []
      fullText.value = s.fullText || ''
      segments.value = s.segments || []
      currentChoices.value = s.currentChoices || []
      history.value = (s.history || []).map(h => ({
        segmentIndex: h.segmentIndex ?? 0,
        chosenChoice: h.chosenChoice || '',
        summary: h.summary || '',
        previousChoices: h.previousChoices || [],
        previousFullText: h.previousFullText || ''
      }))
      generationCount.value = s.generationCount || 0
      currentPage.value = s.currentPage || 0
      currentInnerPage.value = s.currentInnerPage || 0
      fontSize.value = s.fontSize || 18
      themeMode.value = s.themeMode || 'day'
      pageMode.value = s.pageMode || 'flip'
      endingCount.value = s.endingCount ?? -1
      totalChapters.value = s.totalChapters || 0
      wordCountPerChapter.value = s.wordCountPerChapter || 1000
      characterSetting.value = s.characterSetting || ''
      worldSetting.value = s.worldSetting || ''
      narrativePerspective.value = s.narrativePerspective || ''
      selectedModel.value = normalizeModel(s.selectedModel)
      // 同步写入 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    }
    return true
  }

  function getLibraryList() {
    // 访问 libraryVersion 使 Vue 的 computed 能追踪 library 变化
    void libraryVersion.value
    return getLibrary().filter(n => !n.published).sort((a, b) => a.theme.localeCompare(b.theme, 'zh-CN'))
  }

  function markPublished(id) {
    const targetId = id || currentNovelId.value
    if (!targetId) return
    const library = getLibrary()
    const idx = library.findIndex(n => n.id === targetId)
    if (idx >= 0) {
      library[idx].published = true
      library[idx].publishedAt = Date.now()
      saveLibrary(library)
      libraryVersion.value++
      syncToServer()
    }
  }

  function loadNovel(id) {
    const library = getLibrary()
    const novel = library.find(n => n.id === id)
    if (!novel) return false
    // 先归档当前小说
    if (theme.value && currentNovelId.value) {
      archiveCurrentToLibrary()
    }
    // 加载新小说
    currentNovelId.value = novel.id
    theme.value = novel.theme || ''
    style.value = novel.style || ''
    summaries.value = novel.summaries || []
    fullText.value = novel.fullText || ''
    segments.value = novel.segments || []
    currentChoices.value = novel.currentChoices || []
    history.value = (novel.history || []).map(h => ({
      segmentIndex: h.segmentIndex ?? 0,
      chosenChoice: h.chosenChoice || '',
      summary: h.summary || '',
      previousChoices: h.previousChoices || [],
      previousFullText: h.previousFullText || ''
    }))
    generationCount.value = novel.generationCount || 0
    currentPage.value = novel.currentPage || 0
    currentInnerPage.value = novel.currentInnerPage || 0
    scrollPosition.value = novel.scrollPosition || 0
    fontSize.value = novel.fontSize || 18
    themeMode.value = novel.themeMode || 'day'
    pageMode.value = novel.pageMode || 'flip'
    endingCount.value = novel.endingCount ?? -1
    totalChapters.value = novel.totalChapters || 0
    wordCountPerChapter.value = novel.wordCountPerChapter || 1000
    characterSetting.value = novel.characterSetting || ''
    worldSetting.value = novel.worldSetting || ''
    narrativePerspective.value = novel.narrativePerspective || ''
    try { localStorage.setItem(CURRENT_ID_KEY, currentNovelId.value) } catch (e) {}
    saveSession()
    return true
  }

  function deleteNovel(id) {
    const library = getLibrary()
    const filtered = library.filter(n => n.id !== id)
    saveLibrary(filtered)
    libraryVersion.value++
    // 如果删除的是当前正在创作的小说，清空当前 session
    if (id === currentNovelId.value) {
      resetSession()
    }
    // 同步删除操作到服务器
    syncToServer()
  }

  // Auto-save watcher
  watch(
    [theme, style, summaries, fullText, segments, currentChoices, history, generationCount, currentPage, currentInnerPage, scrollPosition, fontSize, themeMode, pageMode, endingCount, characterSetting, worldSetting, narrativePerspective],
    saveSession,
    { deep: true }
  )

  return {
    theme,
    style,
    summaries,
    fullText,
    segments,
    currentChoices,
    history,
    isGenerating,
    error,
    toastMessage,
    generationCount,
    currentPage,
    currentInnerPage,
    scrollPosition,
    fontSize,
    themeMode,
    pageMode,
    endingCount,
    totalChapters,
    wordCountPerChapter,
    checkAutoEnding,
    characterSetting,
    worldSetting,
    narrativePerspective,
    currentNovelId,
    selectedModel,
    libraryVersion,
    hasSession,
    canContinue,
    totalPages,
    initSession,
    appendSegment,
    makeChoice,
    undo,
    setPage,
    setTheme,
    setGenerating,
    setError,
    clearError,
    resetSession,
    showToast,
    saveSession,
    setFontSize,
    setThemeMode,
    setPageMode,
    startEnding,
    decrementEnding,
    getLibraryList,
    markPublished,
    loadNovel,
    deleteNovel,
    loadFromServer
  }
})
