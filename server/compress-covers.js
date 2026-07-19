// 一次性批量脚本：将 server/covers/*.jpg 压缩为 .webp，并更新 published.json 中的 coverUrl
// 用法：cd /opt/novel-h5/server && node compress-covers.js
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const COVERS_DIR = join(__dirname, 'covers')
const PUBLISHED_FILE = join(__dirname, 'published.json')

async function main() {
  if (!fs.existsSync(COVERS_DIR)) {
    console.log('covers 目录不存在，跳过')
    return
  }
  const files = fs.readdirSync(COVERS_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  console.log(`发现 ${files.length} 个待压缩封面文件`)

  let totalBefore = 0
  let totalAfter = 0
  const renameMap = {}

  for (const f of files) {
    const srcPath = join(COVERS_DIR, f)
    const baseName = f.replace(/\.(jpg|jpeg|png)$/i, '')
    const outName = `${baseName}.webp`
    const outPath = join(COVERS_DIR, outName)

    // 如已存在压缩版本则跳过
    if (fs.existsSync(outPath)) {
      console.log(`  - ${f} 已有 webp 版本，跳过`)
      continue
    }

    try {
      const beforeSize = fs.statSync(srcPath).size
      await sharp(srcPath)
        .rotate()
        .resize({ width: 800, height: 1066, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toFile(outPath)
      const afterSize = fs.statSync(outPath).size
      totalBefore += beforeSize
      totalAfter += afterSize
      renameMap[`/api/covers/${f}`] = `/api/covers/${outName}`
      console.log(`  ✓ ${f} (${(beforeSize / 1024).toFixed(0)}KB) → ${outName} (${(afterSize / 1024).toFixed(0)}KB)`)
      // 删除原 jpg 文件以释放空间
      fs.unlinkSync(srcPath)
    } catch (e) {
      console.error(`  ✗ ${f} 压缩失败:`, e.message)
    }
  }

  // 更新 published.json 中的 coverUrl
  if (fs.existsSync(PUBLISHED_FILE) && Object.keys(renameMap).length > 0) {
    try {
      const list = JSON.parse(fs.readFileSync(PUBLISHED_FILE, 'utf8'))
      let changed = 0
      for (const item of list) {
        if (item.coverUrl && renameMap[item.coverUrl]) {
          item.coverUrl = renameMap[item.coverUrl]
          changed++
        }
      }
      if (changed > 0) {
        fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(list, null, 2))
        console.log(`已更新 published.json 中 ${changed} 条记录的 coverUrl`)
      }
    } catch (e) {
      console.error('更新 published.json 失败:', e.message)
    }
  }

  console.log(`\n压缩完成：${(totalBefore / 1024 / 1024).toFixed(2)}MB → ${(totalAfter / 1024 / 1024).toFixed(2)}MB（节省 ${totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : 0}%）`)
}

main().catch(e => { console.error(e); process.exit(1) })
