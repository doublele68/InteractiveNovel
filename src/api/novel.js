import axios from 'axios'
import { useLocale } from '../i18n'

const MAX_RETRIES = 2
const TIMEOUT = 90000
const { t } = useLocale()

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function generateNext(theme, style, summaries, lastChoice, endingCount = -1, chapterNumber = 1, characterSetting = '', worldSetting = '', narrativePerspective = '', retryCount = 0, rewriteInstruction = '', model = 'qwen-plus', totalChapters = 0, wordCountPerChapter = 1000) {
  try {
    const response = await axios.post(
      '/api/generate-next',
      {
        theme,
        style,
        summaries,
        lastChoice,
        endingCount,
        chapterNumber,
        characterSetting,
        worldSetting,
        narrativePerspective,
        rewriteInstruction,
        model,
        totalChapters,
        wordCountPerChapter
      },
      {
        timeout: TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const result = response.data
    if (!result.success) {
      throw new Error(result.error || t('api.generateFailed'))
    }

    return result.data
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await sleep(1500 * (retryCount + 1))
      return generateNext(theme, style, summaries, lastChoice, endingCount, chapterNumber, characterSetting, worldSetting, narrativePerspective, retryCount + 1, rewriteInstruction, model, totalChapters, wordCountPerChapter)
    }

    throw new Error(
      error.response?.data?.error ||
      error.message ||
      t('api.networkFailed')
    )
  }
}

export async function pregenerateBranches(theme, style, summaries, choices, endingCount = -1, chapterNumber = 1, characterSetting = '', worldSetting = '', narrativePerspective = '', model = 'qwen-plus', totalChapters = 0, wordCountPerChapter = 1000) {
  try {
    const response = await axios.post(
      '/api/pregenerate-branches',
      {
        theme,
        style,
        summaries,
        choices,
        endingCount,
        chapterNumber,
        characterSetting,
        worldSetting,
        narrativePerspective,
        model,
        totalChapters,
        wordCountPerChapter
      },
      {
        timeout: TIMEOUT,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const result = response.data
    if (!result.success) {
      console.warn('预生成分支失败:', result.error)
      return null
    }

    return result.data.choices
  } catch (error) {
    console.warn('预生成分支请求失败:', error.message)
    return null
  }
}

// ===== 小说广场 API =====

export async function publishNovel(data) {
  const response = await axios.post('/api/publish', data)
  const result = response.data
  if (!result.success) {
    throw new Error(result.error || t('api.publishFailed'))
  }
  return result
}

export async function getPublishedList() {
  try {
    const response = await axios.get('/api/published')
    return response.data.success ? response.data.data : []
  } catch (e) {
    console.warn('获取广场列表失败:', e.message)
    return []
  }
}

export async function getPublishedNovel(id) {
  const response = await axios.get(`/api/published/${id}`)
  const result = response.data
  if (!result.success) {
    throw new Error(result.error || t('api.fetchFailed'))
  }
  return result.data
}
