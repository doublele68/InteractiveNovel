import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// sharp 用于封面压缩，若未安装则降级为原图下载
let sharp = null
try {
  sharp = (await import('sharp')).default
} catch (e) {
  console.warn('[封面] sharp 未安装，封面将不进行压缩。请在 server 目录执行 npm install sharp')
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const PORT = process.env.PORT || 3000
let QWEN_API_KEY = process.env.QWEN_API_KEY
let QWEN_ENDPOINT = process.env.QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

// 配置文件路径（支持通过网页设置）
const ENV_FILE = join(__dirname, '..', '.env')

// 邮请码与用户数据目录
const USER_DATA_DIR = join(__dirname, 'userdata')
if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true })

function getUserDataPath(userId) {
  // 安全处理：只允许字母数字和中文字符，移除路径分隔符等危险字符
  const safe = userId.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '')
  return join(USER_DATA_DIR, `${safe}.json`)
}

function buildPrompt(theme, style, summaries, lastChoice, endingCount, chapterNumber, characterSetting = '', worldSetting = '', narrativePerspective = '', totalChapters = 0, wordCountPerChapter = 1000) {
  const summariesText = summaries.length > 0 ? summaries.join('\n') : '（故事刚开始）'
  const choiceText = lastChoice || '自动承接上段'

  let endingHint = ''
  if (endingCount === 1) {
    endingHint = `\n【重要提示：这是小说的最后一次续写，请在本段中为故事画上圆满句号，所有主要情节线索需收束，不要再留悬念。注意：即使是最终章，正文字数仍然必须不少于 ${Math.floor(wordCountPerChapter * 0.6)} 字，请用充分的篇幅完成故事收束，不得草草了事。】`
  } else if (endingCount > 1) {
    endingHint = `\n【重要提示：小说将在 ${endingCount} 次续写后完结，请开始为故事收尾做铺垫，逐步收束主要情节线索。】`
  }

  const choicesRule = endingCount === 1 || endingCount === 0
    ? '3. 本次为小说完结段，不需要生成剧情走向选择题，choices 设为空数组 []。'
    : '3. 在正文末尾，严格生成 3 个剧情走向选择题（选项需具有明确差异性，避免重复）。注意：选项必须只放在 choices 数组中，绝对禁止把选项内容写入 text 字段。text 字段只能包含小说正文。'

  const jsonExample = endingCount === 1 || endingCount === 0
    ? `{
  "chapterTitle": "本章标题（不含序号）",
  "text": "正文内容...",
  "choices": [],
  "summary": "本段1-2句摘要"
}`
    : `{
  "chapterTitle": "本章标题（不含序号）",
  "text": "正文内容...",
  "choices": [
    {"id": 1, "text": "选项A"},
    {"id": 2, "text": "选项B"},
    {"id": 3, "text": "选项C"}
  ],
  "summary": "本段1-2句摘要"
}`

  const characterSection = characterSetting ? `\n【角色设定】：${characterSetting}` : ''
  const worldSection = worldSetting ? `\n【世界观】：${worldSetting}` : ''
  const perspectiveSection = narrativePerspective ? `\n【叙事视角】：${narrativePerspective}` : ''

  return `你正在续写小说。请严格遵循以下规则：
【小说主题】：${theme}
【小说风格】：${style}
【角色设定】：${characterSection}
【世界观】：${worldSection}
【叙事视角】：${perspectiveSection}
【前文摘要】：
${summariesText}
【本章信息】：第 ${chapterNumber} 章${totalChapters > 0 ? `（全书预计 ${totalChapters} 章）` : ''}，情节走向：${choiceText}${endingHint}
【创作原则，必须严格遵守】：
1、拒绝“AI式总结”： 禁止在章节末尾或段落中总结主题（如“这让他明白了友情的真谛...”）。故事的意蕴应当通过行动展现，而非作者说教。
2、动态节奏控制： 避免匀速叙事。文戏要精巧（侧重心理与对话的潜台词），武戏/爆发戏要简洁（短句、强动词），拉开叙事张力。全文呈现松紧相见的波浪式情绪曲线。不允许长时间平铺同一种情绪强度。通过场景功能（推进、转折、舒缓）的有序穿插，制造阅读的呼吸感。
3、单一笔触连贯性： 你不是在生成文本，你是在“扮演”一位职业小说作家。保持全书语感统一，严禁出现说明文式的词汇（如“综上所述”、“不仅如此”）。
4、角色动机驱动： 所有的剧情推进必须源于角色的性格和需求，而不是为了强行凑剧本。拒绝“降智”情节，反派也需有其逻辑。
5、风格一体化：严格遵循用户指定的体裁风格、角色设定、世界观、人称视角和叙事腔调。让整部作品读起来如同出自一人之手，杜绝AI式的平均化表达。
【生成规则】：
1. 基于小说的续写规则，续写第 ${chapterNumber} 章小说正文。【字数硬性要求：正文 text 字段必须不少于 ${Math.floor(wordCountPerChapter * 0.6)} 字，目标 ${wordCountPerChapter} 字左右，绝对禁止只写一两句话就结束】。保持文风统一，人物行为符合前文逻辑。正文分段要频繁，遵循“每出现一个完整的对话、动作或情节转折就另起一段”的原则，让段落短小精炼，不要出现大段连续文字。段落之间用两个换行符（\n\n）分隔。
2. 基于续写的章节内容，为第 ${chapterNumber} 章拟定一个简洁有力的章节标题（不含序号），控制在 10 个字以内。
${choicesRule}
3.【高级设定强制要求】：如果上方提供了【角色设定】【世界观】【叙事视角】中的任何一项，续写内容必须严格遵循这些设定，不得违背或忽略。
4. 最后生成 1-2 句本段情节摘要，仅记录核心状态变化与关键线索。
5. 【输出格式必须严格为 JSON】，不得包含任何额外解释，不得在任何字段内嵌套 JSON 键名：
${jsonExample}`
}

// 修复大模型返回的畸形 JSON：将重复的 "text" 键合并为单个（用 \n\n 连接）
// 部分模型会把每个自然段落输出为独立的 "text": "..." 键，JSON.parse 仅保留最后一个导致正文丢失
// 仅合并“连续”的顶层 text 键（仅由逗号/空白分隔），避免误伤 choices 数组内 {"id":N,"text":...} 的嵌套 text
function repairDuplicateTextKeys(jsonStr) {
  const singleText = '"text"\\s*:\\s*"(?:[^"\\\\]|\\\\.)*"'
  const runPattern = new RegExp('(' + singleText + ')(\\s*,\\s*' + singleText + ')+', 'g')
  const valuePattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g

  return jsonStr.replace(runPattern, (run) => {
    const values = [...run.matchAll(valuePattern)].map(m => m[1])
    if (values.length <= 1) return run
    return `"text": "${values.join('\\n\\n')}"`
  })
}

function extractJSON(text) {
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim()
    // 先修复重复 text 键（重复键 JSON 语法合法，必须在解析前处理）
    try { return JSON.parse(repairDuplicateTextKeys(inner)) } catch (e) {}
    try { return JSON.parse(inner) } catch (e) {}
  }
  const braceMatch = text.match(/(\{[\s\S]*\})/)
  if (braceMatch) {
    const inner = braceMatch[1].trim()
    try { return JSON.parse(repairDuplicateTextKeys(inner)) } catch (e) {}
    try { return JSON.parse(inner) } catch (e) {}
  }
  const raw = text.trim()
  try { return JSON.parse(repairDuplicateTextKeys(raw)) } catch (e) {}
  try { return JSON.parse(raw) } catch (e) { return null }
}

function fallbackParse(text) {
  const lines = text.split('\n').filter(line => line.trim())
  const choices = []
  let textContent = []
  let summary = ''
  let chapterTitle = ''
  let inChoices = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.includes('选项') || /^[\d一二三四五]/.test(trimmed)) {
      inChoices = true
      const match = trimmed.match(/[：:]\s*(.+)$/) || trimmed.match(/\d+\.\s*(.+)$/) || trimmed.match(/[一二三四五]、(.+)$/)
      if (match) choices.push({ id: choices.length + 1, text: match[1].trim() })
    } else if (trimmed.includes('摘要') || trimmed.startsWith('summary')) {
      const match = trimmed.match(/[：:]\s*(.+)$/) || trimmed.match(/"summary"\s*[:：]\s*"(.+?)"/)
      if (match) summary = match[1].trim()
    } else if (trimmed.includes('标题') || trimmed.startsWith('chapterTitle')) {
      const match = trimmed.match(/[：:]\s*(.+)$/) || trimmed.match(/"chapterTitle"\s*[:：]\s*"(.+?)"/)
      if (match) chapterTitle = match[1].trim()
    } else if (!inChoices && !trimmed.startsWith('{') && !trimmed.startsWith('}')) {
      textContent.push(trimmed)
    }
  }

  if (choices.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (/^\d+\./.test(line) || /^[A-E][.．]/.test(line)) {
        choices.push({ id: choices.length + 1, text: line.replace(/^\d+\.|^[A-E][.．]/, '').trim() })
      }
    }
  }

  return {
    chapterTitle: chapterTitle || '新篇章',
    text: textContent.join('\n') || lines.slice(0, Math.max(1, lines.length - 2)).join('\n'),
    choices: choices.length >= 2 ? choices : [
      { id: 1, text: '继续探索' },
      { id: 2, text: '换个方向' }
    ],
    summary: summary || '剧情继续发展'
  }
}

function normalizeData(data) {
  if (!data.chapterTitle) data.chapterTitle = '新篇章'
  if (!data.choices || !Array.isArray(data.choices)) {
    data.choices = []
  }
  if (data.choices.length > 3) {
    data.choices = data.choices.slice(0, 3)
  }
  data.choices = data.choices.map((c, idx) => ({ id: idx + 1, text: c.text || c.content || `选项 ${idx + 1}` }))
  if (!data.text) data.text = '（AI 生成内容异常，请重试）'
  // 清理 text 中混入的选项部分（大模型偶尔会把选项附在正文末尾）
  const NL = '\n'
  data.text = data.text
    .replace(new RegExp('[【\\[]\\s*选择[题支]|选项\\s*[】\\]]', 'g'), '【选择题】')
    .replace(new RegExp('【选择题】[\\s\\S]*$'), '')
    .replace(new RegExp('(?:^|' + NL + ')\\s*(?:选择[题支]|选项)\\s*[:：]\\s*[\\s\\S]*$'), '')
    .replace(new RegExp('(?:^|' + NL + ')\\s*选择[ABC][：:]\\s*[^' + NL + ']+(?:' + NL + '\\s*选择[ABC][：:]\\s*[^' + NL + ']+){0,5}\\s*$'), '')
    .replace(new RegExp('(?:^|' + NL + ')\\s*[ABC][.．、]\\s*[^' + NL + ']+(?:' + NL + '\\s*[ABC][.．、]\\s*[^' + NL + ']+){0,5}\\s*$'), '')
    .replace(new RegExp('(?:^|' + NL + ')\\s*选项\\s*[123一二三]\\s*[:：]\\s*[^' + NL + ']+(?:' + NL + '\\s*选项\\s*[123一二三]\\s*[:：]\\s*[^' + NL + ']+){0,5}\\s*$'), '')
    .trim()
  // 兜底：如果 choices 的文本仍然混在正文中，直接移除
  if (data.choices && data.choices.length > 0) {
    data.choices.forEach(choice => {
      const choiceText = choice.text || ''
      if (choiceText && choiceText.length > 3) {
        const escaped = choiceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        data.text = data.text
          .replace(new RegExp('\\n?' + escaped + '\\n?', 'g'), '\n')
          .replace(new RegExp('【[^】]*】\\s*' + escaped, 'g'), '')
          .replace(new RegExp('[ABC][.．、]\\s*' + escaped, 'g'), '')
      }
    })
    data.text = data.text.replace(/\n{3,}/g, '\n\n').trim()
  }

  if (!data.summary) data.summary = '剧情继续发展'
  return data
}

async function callQwen(prompt, timeout = 60000, model = 'qwen-plus') {
  const start = Date.now()
  // deepseek-r1 推理模型需要更多 token 给思维链，否则正文被截断
  const maxTokens = (model === 'deepseek-r1') ? 8192 : 4000
  const response = await axios.post(
    QWEN_ENDPOINT,
    {
      model: model,
      messages: [
        { role: 'system', content: '你是一个专业的小说续写助手，严格按 JSON 格式输出。注意：text 字段正文必须达到用户指定的字数要求。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout
    }
  )
  const networkEnd = Date.now()

  const content = response.data.choices?.[0]?.message?.content || ''
  console.log('[Qwen Raw]', content.substring(0, 500))

  let data = extractJSON(content)
  const parseEnd = Date.now()
  if (!data) {
    console.log('[Qwen] JSON parse failed, using fallback')
    data = fallbackParse(content)
  }
  const fallbackEnd = Date.now()

  const result = normalizeData(data)
  const normalizeEnd = Date.now()

  console.log(`[Qwen Timing] 模型返回耗时: ${networkEnd - start}ms | JSON解析: ${parseEnd - networkEnd}ms | 兜底解析: ${fallbackEnd - parseEnd}ms | 数据清洗: ${normalizeEnd - fallbackEnd}ms | 总耗时: ${normalizeEnd - start}ms`)
  console.log('[Qwen Parsed] text length:', (result.text || '').length, 'chapterTitle:', result.chapterTitle, 'choices:', (result.choices || []).length)
  return result
}

// 自动生成角色设定和世界观
async function generateSettings(theme, style, narrativePerspective, model) {
  const settingsPrompt = `你是一位资深小说策划。用户要创作一部小说，以下是已知信息：
【主题】：${theme}
【风格】：${style}
${narrativePerspective ? '【叙事视角】：' + narrativePerspective : ''}

请根据以上信息，为这部小说生成：
1. 主角设定（包括姓名、性别、年龄、身份、性格特征、外貌特征、内心驱动力）
2. 2-3个重要配角（姓名、与主角的关系、核心特征）
3. 世界观设定（时代背景、地点设定、氛围基调、特殊规则或设定）

要求：
- 角色名字要符合风格和世界观（古代背景用古风名字，现代背景用现代名字）
- 设定要简洁但具体，为后续创作提供明确约束
- 严格输出 JSON 格式：
{
  "characterSetting": "主角和配角的完整设定描述（纯文本，100-200字）",
  "worldSetting": "世界观设定描述（纯文本，80-150字）"
}`

  try {
    const response = await axios.post(
      QWEN_ENDPOINT,
      {
        model: model,
        messages: [
          { role: 'system', content: '你是一个专业的小说策划助手，严格按 JSON 格式输出。' },
          { role: 'user', content: settingsPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    const content = response.data.choices?.[0]?.message?.content || ''
    console.log('[自动设定 Raw]', content.substring(0, 300))
    let parsed = extractJSON(content)
    if (!parsed) {
      parsed = { characterSetting: '', worldSetting: '' }
    }
    return {
      characterSetting: parsed.characterSetting || '',
      worldSetting: parsed.worldSetting || ''
    }
  } catch (err) {
    console.error('[自动设定] 生成失败:', err.message)
    return { characterSetting: '', worldSetting: '' }
  }
}

app.post('/api/generate-next', async (req, res) => {
  try {
    let { theme, style, summaries = [], lastChoice, endingCount, chapterNumber = 1, characterSetting = '', worldSetting = '', narrativePerspective = '', rewriteInstruction = '', model = 'qwen-plus', totalChapters = 0, wordCountPerChapter = 1000 } = req.body

    console.log('[API /generate-next] 接收参数:', { theme, style, chapterNumber, model, rewriteInstruction: rewriteInstruction || '(无)' })

    if (!theme || !style) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的参数：theme 或 style'
      })
    }

    if (!QWEN_API_KEY || !QWEN_ENDPOINT) {
      return res.status(500).json({
        success: false,
        error: '服务器未配置 QWEN_API_KEY 或 QWEN_ENDPOINT'
      })
    }

    let generatedSettings = null
    if (chapterNumber === 1 && !characterSetting && !worldSetting) {
      console.log('[自动设定] 用户未提供角色/世界观，自动生成中...')
      generatedSettings = await generateSettings(theme, style, narrativePerspective, model)
      characterSetting = generatedSettings.characterSetting
      worldSetting = generatedSettings.worldSetting
      console.log('[自动设定] 完成:', { characterSetting: characterSetting.substring(0, 50) + '...', worldSetting: worldSetting.substring(0, 50) + '...' })
    }

    const isEnding = endingCount === 1 || endingCount === 0

    let prompt = buildPrompt(theme, style, summaries, lastChoice, endingCount, chapterNumber, characterSetting, worldSetting, narrativePerspective, totalChapters, wordCountPerChapter)

    if (rewriteInstruction) {
      prompt += `\n\n【用户重写要求】：${rewriteInstruction}`
    }

    let mainData = await callQwen(prompt, 60000, model)
    const MIN_TEXT_LEN = Math.floor(wordCountPerChapter * 0.4)
    const needRetry = mainData.text.length < MIN_TEXT_LEN || (!isEnding && mainData.choices.length !== 3)
    if (needRetry) {
      console.log(`主内容质量不达标（text: ${mainData.text.length}字, choices: ${mainData.choices.length}个），重试中...`)
      mainData = await callQwen(prompt, 60000, model)
      if (mainData.text.length < MIN_TEXT_LEN) {
        console.log(`二次重试仍不达标（text: ${mainData.text.length}字），第三次重试...`)
        mainData = await callQwen(prompt, 60000, model)
        if (mainData.text.length < MIN_TEXT_LEN) {
          console.log(`三次重试仍不达标（text: ${mainData.text.length}字），第四次最终重试...`)
          mainData = await callQwen(prompt, 60000, model)
        }
      }
    }

    res.json({
      success: true,
      data: {
        text: mainData.text,
        choices: mainData.choices,
        summary: mainData.summary,
        chapterTitle: mainData.chapterTitle,
        generatedSettings: generatedSettings || null
      }
    })
  } catch (error) {
    console.error('API 调用失败:', error.message)
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || '服务器内部错误'
    })
  }
})

app.post('/api/pregenerate-branches', async (req, res) => {
  try {
    const { theme, style, summaries = [], choices = [], endingCount, chapterNumber = 1, characterSetting = '', worldSetting = '', narrativePerspective = '', model = 'qwen-plus', totalChapters = 0, wordCountPerChapter = 1000 } = req.body

    console.log('[API /pregenerate-branches] 接收参数:', { theme, style, chapterNumber, model })

    if (!theme || !style || !Array.isArray(choices) || choices.length === 0) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的参数：theme、style 或 choices'
      })
    }

    if (!QWEN_API_KEY || !QWEN_ENDPOINT) {
      return res.status(500).json({
        success: false,
        error: '服务器未配置 QWEN_API_KEY 或 QWEN_ENDPOINT'
      })
    }

    const isEnding = endingCount === 1 || endingCount === 0
    if (isEnding) {
      return res.json({ success: true, data: { choices: [] } })
    }

    const nextEndingCount = endingCount > 1 ? endingCount - 1 : endingCount
    const nextChapterNumber = chapterNumber + 1

    const enrichedChoices = await Promise.all(
      choices.map(async (choice) => {
        try {
          const branchPrompt = buildPrompt(theme, style, summaries, choice.text, nextEndingCount, nextChapterNumber, characterSetting, worldSetting, narrativePerspective, totalChapters, wordCountPerChapter)
          let branchData = await callQwen(branchPrompt, 35000, model)
          if (branchData.choices.length !== 3) {
            console.log(`分支选项数量不符（${branchData.choices.length} 个），重试中...`)
            branchData = await callQwen(branchPrompt, 35000, model)
          }
          return {
            ...choice,
            pregenerated: {
              text: branchData.text,
              choices: branchData.choices,
              summary: branchData.summary,
              chapterTitle: branchData.chapterTitle
            }
          }
        } catch (err) {
          console.error(`预生成分支 ${choice.id} 失败:`, err.message)
          return choice
        }
      })
    )

    const pregenCount = enrichedChoices.filter(c => c.pregenerated).length
    console.log(`后台预生成分支完成: ${pregenCount}/${choices.length}`)

    res.json({
      success: true,
      data: { choices: enrichedChoices }
    })
  } catch (error) {
    console.error('预生成 API 调用失败:', error.message)
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || '服务器内部错误'
    })
  }
})

// ===== 系统配置 API =====
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      apiKeyConfigured: !!(QWEN_API_KEY && QWEN_API_KEY !== 'your_api_key_here'),
      endpoint: QWEN_ENDPOINT || '',
      // 只返回 key 的前4后4位，不暴露完整 key
      apiKeyMasked: QWEN_API_KEY && QWEN_API_KEY !== 'your_api_key_here'
        ? QWEN_API_KEY.substring(0, 4) + '****' + QWEN_API_KEY.slice(-4)
        : ''
    }
  })
})

app.post('/api/settings', (req, res) => {
  const { apiKey, endpoint } = req.body
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ success: false, error: 'API Key 不能为空' })
  }

  const newKey = apiKey.trim()
  const newEndpoint = (endpoint || '').trim() || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

  // 更新运行时变量
  QWEN_API_KEY = newKey
  QWEN_ENDPOINT = newEndpoint

  // 写入 .env 文件持久化
  try {
    const envContent = `# AI 互动小说 - 环境变量配置\nQWEN_API_KEY=${newKey}\nQWEN_ENDPOINT=${newEndpoint}\nPORT=${PORT}\n`
    fs.writeFileSync(ENV_FILE, envContent)
    console.log('[Settings] API Key 已更新并保存到 .env')
  } catch (e) {
    console.warn('[Settings] .env 文件写入失败:', e.message)
  }

  res.json({ success: true, message: 'API Key 配置成功' })
})

// ===== API Key 状态检查 =====
app.get('/api/settings/status', (req, res) => {
  res.json({
    success: true,
    configured: !!(QWEN_API_KEY && QWEN_API_KEY !== 'your_api_key_here')
  })
})

// ===== 用户数据存取 =====
app.get('/api/user/:userId/data', (req, res) => {
  const filePath = getUserDataPath(req.params.userId)
  if (!fs.existsSync(filePath)) {
    return res.json({ success: true, data: null })
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    res.json({ success: true, data })
  } catch (e) {
    res.json({ success: true, data: null })
  }
})

app.post('/api/user/:userId/data', (req, res) => {
  const filePath = getUserDataPath(req.params.userId)
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2))
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: '数据保存失败' })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ===== 小说广场：发表与阅读 =====
const PUBLISHED_FILE = join(__dirname, 'published.json')
const COVERS_DIR = join(__dirname, 'covers')
if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true })

// DashScope 文生图：异步任务模式
const DASHSCOPE_BASE = 'https://dashscope.aliyuncs.com/api/v1'
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'wan2.7-image'
const IMAGE_FALLBACK_MODEL = 'wanx2.1-t2i-plus'

function getPublished() {
  try { return JSON.parse(fs.readFileSync(PUBLISHED_FILE, 'utf8')) } catch (e) { return [] }
}

function savePublished(data) {
  fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(data, null, 2))
}

// 提供已生成封面图的静态访问
app.use('/api/covers', express.static(COVERS_DIR, { maxAge: '7d' }))

// 调用 qwen 生成绘画提示词（统一日系动漫风格）
async function generateImagePrompt({ title, style, characterSetting, worldSetting, theme }) {
  const userPrompt = `你是一位资深日系动漫插画师。请基于下面的小说设定，撰写一段适合中文文生图模型（如通义万相）的【小说封面绘画提示词】，必须严格采用【日系动漫/Japanese anime】风格，不要出现文字、标题或水印，不要出现写实摄影或真人面孔。\n\n【小说标题】：${title || ''}\n【小说题材风格】：${style || ''}\n【主题】：${theme || ''}\n【主角/角色】：${characterSetting || '（未设定，请根据风格设计一位主角）'}\n【世界观】：${worldSetting || '（未设定，请根据风格设计世界观）'}\n\n要求：\n1. 一段中文描述，不超过 130 字。\n2. 必须包含：主角形象（年龄、气质、服饰、头发、眼睛）、环境氛围、光影色调、构图视角。\n3. 风格关键词必须包含以下词汇：日系动漫、anime style、Japanese anime、cel shading、鲜艳色彩、精美二次元插画、ufotable画风或京阿画风或新海诚画风。\n4. 不要出现：写实、photorealistic、真人、摄影、油画、中国风水墨。\n5. 严格输出 JSON：{"prompt": "..."}`

  const response = await axios.post(
    QWEN_ENDPOINT,
    {
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: '你是专业的日系动漫封面美术指导，所有输出必须为日系二次元插画风格，严禁写实/真人/水墨画风。输出 JSON。' },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    },
    {
      headers: { 'Authorization': `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30000
    }
  )
  const content = response.data.choices?.[0]?.message?.content || ''
  const parsed = extractJSON(content) || {}
  let prompt = (parsed.prompt || '').trim()
  if (!prompt) {
    prompt = `${style || ''}题材小说封面，${characterSetting ? characterSetting.slice(0, 60) : '神秘主角'}，${worldSetting ? worldSetting.slice(0, 60) : '宏大世界观'}，日系动漫插画风格，精美二次元，鲜艳色彩，ufotable画风`
  }
  // 强制追加日系动漫样式后缀，防止模型偏向写实
  const animeSuffix = ', anime style, Japanese anime, cel shading, 2D illustration, vibrant colors, masterpiece, best quality, ufotable, no photorealistic, no realistic'
  if (!/anime|动漫|二次元/i.test(prompt)) {
    prompt = prompt + animeSuffix
  } else if (!/no photorealistic/i.test(prompt)) {
    prompt = prompt + ', no photorealistic, no realistic'
  }
  return prompt
}

// 调用 DashScope 文生图，返回图片 URL
// 主模型 wan2.7-image 使用同步调用 multimodal-generation/generation 端点，支持 size: "2K"
// 回退模型 wanx2.1-t2i-plus 使用异步 text2image/image-synthesis 端点
async function generateCoverImage(prompt, modelId = IMAGE_MODEL) {
  if (modelId === 'wan2.7-image' || modelId === 'wan2.7-image-pro' || modelId === 'wan2.6-image' || modelId === 'wan2.6-t2i') {
    // 同步调用
    const resp = await axios.post(
      `${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`,
      {
        model: modelId,
        input: {
          messages: [
            { role: 'user', content: [{ text: prompt }] }
          ]
        },
        parameters: {
          size: '1K',
          n: 1,
          watermark: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${QWEN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5 * 60 * 1000
      }
    )
    // 响应结构：output.choices[0].message.content[0].image
    const choices = resp.data?.output?.choices || []
    const content = choices[0]?.message?.content || []
    const imgItem = Array.isArray(content) ? content.find(c => c.image) : null
    const url = imgItem?.image
    if (!url) {
      // 可能其他返回形式
      const altUrl = resp.data?.output?.results?.[0]?.url || resp.data?.output?.url
      if (altUrl) return altUrl
      throw new Error('同步文生图返回空 URL')
    }
    return url
  }

  // 异步调用（wanx2.1-t2i-plus 等旧模型）
  const fallbackSize = '768*1024'
  const createResp = await axios.post(
    `${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`,
    {
      model: modelId,
      input: { prompt },
      parameters: {
        size: fallbackSize,
        n: 1,
        prompt_extend: true
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      timeout: 30000
    }
  )
  const taskId = createResp.data?.output?.task_id
  if (!taskId) throw new Error('创建文生图任务失败')

  const start = Date.now()
  const TIMEOUT_MS = 5 * 60 * 1000
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, 4000))
    const pollResp = await axios.get(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${QWEN_API_KEY}` },
      timeout: 20000
    })
    const out = pollResp.data?.output
    const status = out?.task_status
    if (status === 'SUCCEEDED') {
      const url = out?.results?.[0]?.url
      if (!url) throw new Error('文生图返回空 URL')
      return url
    }
    if (status === 'FAILED' || status === 'UNKNOWN') {
      throw new Error(out?.message || '文生图任务失败')
    }
  }
  throw new Error('文生图任务超时')
}

async function downloadImage(url, novelId) {
  const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })
  const buf = Buffer.from(resp.data)
  // 使用 sharp 压缩为 WebP，缩放到最大宽 800px，质量 80
  // 广场卡片实际展示尺寸 ~200x267，考虑 2x 高分辨率屏留 ~600足够
  if (sharp) {
    try {
      const filename = `${novelId}.webp`
      const filePath = join(COVERS_DIR, filename)
      await sharp(buf)
        .rotate()
        .resize({ width: 800, height: 1066, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(filePath)
      const sizeKB = Math.round(fs.statSync(filePath).size / 1024)
      console.log(`[封面] 已压缩为 WebP: ${filename} (${sizeKB}KB)`)
      return `/api/covers/${filename}`
    } catch (e) {
      console.warn('[封面] sharp 压缩失败，回退原图:', e.message)
    }
  }
  // Fallback：不压缩直接保存原图
  const filename = `${novelId}.jpg`
  const filePath = join(COVERS_DIR, filename)
  fs.writeFileSync(filePath, buf)
  return `/api/covers/${filename}`
}

async function generateAndSaveCover(novelId) {
  try {
    const list = getPublished()
    const idx = list.findIndex(n => n.id === novelId)
    if (idx < 0) return
    const novel = list[idx]
    if (novel.coverUrl) return

    list[idx].coverStatus = 'generating'
    savePublished(list)

    console.log(`[封面] 开始为《${novel.title}》生成封面...`)
    const prompt = await generateImagePrompt({
      title: novel.title,
      style: novel.style,
      theme: novel.theme || novel.title,
      characterSetting: novel.characterSetting || '',
      worldSetting: novel.worldSetting || ''
    })
    console.log(`[封面] 提示词: ${prompt}`)

    let imageUrl
    try {
      imageUrl = await generateCoverImage(prompt, IMAGE_MODEL)
    } catch (e) {
      console.warn(`[封面] 主模型 ${IMAGE_MODEL} 失败 (${e.message})，回退 ${IMAGE_FALLBACK_MODEL}`)
      imageUrl = await generateCoverImage(prompt, IMAGE_FALLBACK_MODEL)
    }

    const localUrl = await downloadImage(imageUrl, novelId)

    const list2 = getPublished()
    const idx2 = list2.findIndex(n => n.id === novelId)
    if (idx2 >= 0) {
      list2[idx2].coverUrl = localUrl
      list2[idx2].coverPrompt = prompt
      list2[idx2].coverStatus = 'ready'
      savePublished(list2)
      console.log(`[封面] 《${novel.title}》封面已生成: ${localUrl}`)
    }
  } catch (e) {
    console.error('[封面] 生成失败:', e.message)
    const list = getPublished()
    const idx = list.findIndex(n => n.id === novelId)
    if (idx >= 0) {
      list[idx].coverStatus = 'failed'
      list[idx].coverError = e.message
      savePublished(list)
    }
  }
}

app.post('/api/publish', (req, res) => {
  try {
    const { title, author, style, segments, chapterCount, characterSetting = '', worldSetting = '', theme = '' } = req.body
    if (!title || !author || !segments || segments.length === 0) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }
    const published = getPublished()
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    published.push({
      id,
      title: title.slice(0, 30),
      author,
      style: style || '',
      theme,
      characterSetting,
      worldSetting,
      chapterCount: chapterCount || segments.length,
      segments,
      publishedAt: Date.now(),
      coverStatus: 'pending'
    })
    savePublished(published)
    console.log(`[发表] ${author} 发表了《${title}》，${segments.length}章`)
    setImmediate(() => generateAndSaveCover(id))
    res.json({ success: true, id })
  } catch (e) {
    console.error('发表失败:', e.message)
    res.status(500).json({ success: false, error: '发表失败' })
  }
})

app.post('/api/published/:id/regenerate-cover', (req, res) => {
  const id = req.params.id
  const list = getPublished()
  const novel = list.find(n => n.id === id)
  if (!novel) return res.status(404).json({ success: false, error: '小说不存在' })
  const idx = list.findIndex(n => n.id === id)
  list[idx].coverUrl = ''
  list[idx].coverStatus = 'pending'
  savePublished(list)
  setImmediate(() => generateAndSaveCover(id))
  res.json({ success: true })
})

app.get('/api/published', (req, res) => {
  try {
    const published = getPublished()
    const list = published.map(({ id, title, author, style, chapterCount, publishedAt, coverUrl, coverStatus }) => ({
      id, title, author, style, chapterCount, publishedAt,
      coverUrl: coverUrl || '',
      coverStatus: coverStatus || (coverUrl ? 'ready' : 'pending')
    }))
    list.sort((a, b) => b.publishedAt - a.publishedAt)
    res.json({ success: true, data: list })
  } catch (e) {
    res.status(500).json({ success: false, error: '获取列表失败' })
  }
})

app.get('/api/published/:id', (req, res) => {
  try {
    const published = getPublished()
    const novel = published.find(n => n.id === req.params.id)
    if (!novel) {
      return res.status(404).json({ success: false, error: '小说不存在' })
    }
    res.json({ success: true, data: novel })
  } catch (e) {
    res.status(500).json({ success: false, error: '获取小说失败' })
  }
})

// 启动时为缺封面的旧数据后台补生成（错开避免拥塞）
setTimeout(() => {
  try {
    const list = getPublished()
    const pending = list.filter(n => !n.coverUrl)
    if (pending.length > 0) console.log(`[封面] 启动补生成: ${pending.length} 部历史小说`)
    pending.forEach((n, i) => setTimeout(() => generateAndSaveCover(n.id), i * 8000))
  } catch (e) {}
}, 5000)

// ===== 生产环境：托管前端静态文件 =====
const distPath = join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'))
    }
  })
}

app.listen(PORT, () => {
  console.log(`\n┌──────────────────────────────────────────┐`)
  console.log(`│  📚 AI 互动小说 服务已启动                   │`)
  console.log(`│  地址： http://localhost:${PORT}              │`)
  console.log(`├──────────────────────────────────────────┤`)
  if (!QWEN_API_KEY || QWEN_API_KEY === 'your_api_key_here') {
    console.log(`│  ⚠️  API Key 未配置！                        │`)
    console.log(`│  请通过以下任一方式配置：                     │`)
    console.log(`│  1. 网页设置: 访问 /settings 页面           │`)
    console.log(`│  2. 编辑文件: 修改项目根目录 .env 文件     │`)
  } else {
    console.log(`│  ✅ API Key 已配置                           │`)
    console.log(`│  ✅ 端点: ${QWEN_ENDPOINT.substring(0, 30)}...  │`)
  }
  console.log(`└──────────────────────────────────────────┘\n`)
})
