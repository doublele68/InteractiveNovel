// 一次性批量脚本：清空所有已发表小说封面，触发服务端按新提示词（日系动漫风格）重新生成
// 用法：cd /opt/novel-h5/server && node regenerate-covers.js
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const COVERS_DIR = join(__dirname, 'covers')
const PUBLISHED_FILE = join(__dirname, 'published.json')

const SERVER_URL = process.env.REGEN_URL || 'http://127.0.0.1:3000'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  if (!fs.existsSync(PUBLISHED_FILE)) {
    console.log('published.json 不存在，跳过')
    return
  }
  const list = JSON.parse(fs.readFileSync(PUBLISHED_FILE, 'utf8'))
  console.log(`发现 ${list.length} 部已发表小说`)
  if (list.length === 0) return

  // 1) 删除所有旧封面文件
  for (const item of list) {
    if (item.coverUrl) {
      const filename = item.coverUrl.split('/').pop()
      const filePath = join(COVERS_DIR, filename)
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
          console.log(`  - 已删除旧封面 ${filename}`)
        }
      } catch (e) {
        console.warn(`  ! 删除 ${filename} 失败：${e.message}`)
      }
    }
  }

  // 2) 通过 HTTP 接口逐个触发重新生成（接口内部会清空 coverUrl 并异步生成）
  console.log('\n开始触发重新生成...')
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    console.log(`\n[${i + 1}/${list.length}] 触发：《${item.title}》(id=${item.id})`)
    try {
      const resp = await axios.post(`${SERVER_URL}/api/published/${item.id}/regenerate-cover`, {}, { timeout: 30000 })
      if (resp.data?.success) {
        console.log(`  ✓ 已入队`)
      } else {
        console.error(`  ✗ 入队失败：${JSON.stringify(resp.data)}`)
      }
    } catch (e) {
      console.error(`  ✗ 请求失败：${e.message}`)
    }
    if (i < list.length - 1) await sleep(1500)
  }

  // 3) 等待异步生成完成（每张约 30-60s）
  const waitSec = Math.max(60, list.length * 45)
  console.log(`\n所有任务已入队，等待 ${waitSec} 秒让后台生成完成...`)
  await sleep(waitSec * 1000)

  // 4) 检查生成结果
  const after = JSON.parse(fs.readFileSync(PUBLISHED_FILE, 'utf8'))
  let ready = 0, failed = 0, pending = 0
  console.log('\n===== 重生成结果 =====')
  for (const item of after) {
    const st = item.coverStatus || 'unknown'
    if (st === 'ready') ready++
    else if (st === 'failed') failed++
    else pending++
    console.log(`  [${st}] 《${item.title}》 ${item.coverUrl || ''} ${item.coverError ? '错误:' + item.coverError : ''}`)
  }
  console.log(`\n汇总：ready=${ready}, failed=${failed}, pending=${pending}`)
}

main().catch(e => { console.error(e); process.exit(1) })
