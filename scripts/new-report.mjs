#!/usr/bin/env node
/**
 * ResearchKit report scaffold.
 *
 * Creates the report file with the required structure:
 *   frontmatter  →  one H1 per tool  →  (optional) H1 汇总
 *
 * Usage:
 *   node scripts/new-report.mjs --topic "Agent 记忆方案" --tools google,bilibili,notebooklm \
 *        [--query "…"] [--out "D:/Notes/research"] [--force]
 *
 * Output dir resolution order:
 *   --out  >  $RESEARCHKIT_OUT_DIR  >  <repo>/config.json { outDir }  >  ~/researchkit-reports
 *
 * Prints the absolute path (or JSON with --json).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);

function arg(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = argv[i + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}

const topic = arg('topic');
if (!topic || topic === true) {
  console.error('missing --topic "<核心主题>"');
  process.exit(2);
}

const toolsRaw = arg('tools', '');
const tools = String(toolsRaw === true ? '' : toolsRaw)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const query = String(arg('query', topic) === true ? topic : arg('query', topic));

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readConfigOutDir() {
  try {
    const cfgPath = path.join(SKILL_DIR, 'config.json');
    if (!fs.existsSync(cfgPath)) return null;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8').replace(/^\uFEFF/, ''));
    return typeof cfg?.outDir === 'string' && cfg.outDir.trim() ? cfg.outDir.trim() : null;
  } catch {
    return null;
  }
}

function resolveOutDir() {
  const explicit = arg('out');
  if (explicit && explicit !== true) return String(explicit);
  if (process.env.RESEARCHKIT_OUT_DIR) return process.env.RESEARCHKIT_OUT_DIR;
  return readConfigOutDir() || path.join(os.homedir(), 'researchkit-reports');
}

const outDir = resolveOutDir();
const force = Boolean(arg('force', false));
const asJson = Boolean(arg('json', false));

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
const offMin = -now.getTimezoneOffset();
const sign = offMin >= 0 ? '+' : '-';
const created =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
  `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` +
  `${sign}${pad(Math.floor(Math.abs(offMin) / 60))}:${pad(Math.abs(offMin) % 60)}`;

const slug = String(topic)
  .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '-')
  .replace(/\s+/g, '_')
  .replace(/-+/g, '-')
  .trim()
  .slice(0, 60);

fs.mkdirSync(outDir, { recursive: true });

let file = path.join(outDir, `${date}_${slug}.md`);
if (fs.existsSync(file) && !force) {
  let n = 2;
  while (fs.existsSync(path.join(outDir, `${date}_${slug}_${n}.md`))) n += 1;
  file = path.join(outDir, `${date}_${slug}_${n}.md`);
}

const yamlList = (items) =>
  items.length ? `\n${items.map((t) => `  - ${t}`).join('\n')}` : ' []';

const body = [
  '---',
  `title: "${slug.replace(/"/g, '\\"')}"`,
  `query: "${query.replace(/"/g, '\\"')}"`,
  `created: ${created}`,
  `tools:${yamlList(tools)}`,
  'status: draft',
  '---',
  '',
  `> 调研问题：${query}`,
  '> 说明：每个一级标题对应一个实际执行过并返回结果的工具；未取到的工具不要保留标题，改在「汇总 → 缺口」中说明。',
  '',
  ...(tools.length
    ? tools.flatMap((t) => [
        `# ${t}`,
        '',
        '## 查询与参数',
        '',
        '- 命令：``',
        '- 参数：',
        '- 执行时间：',
        '',
        '## 结果',
        '',
        '### 要点',
        '',
        '- ',
        '',
        '### 证据',
        '',
        '| 序号 | 标题 | 来源/链接 | 时间 | 关键信息 |',
        '| --- | --- | --- | --- | --- |',
        '| 1 |  |  |  |  |',
        '',
        '### 观察',
        '',
        '- ',
        '',
      ])
    : []),
  '# 汇总',
  '',
  '## 一致结论',
  '',
  '- ',
  '',
  '## 分歧与不确定性',
  '',
  '- ',
  '',
  '## 缺口与后续',
  '',
  '- ',
  '',
  '## 参考来源',
  '',
  '- ',
  '',
].join('\n');

fs.writeFileSync(file, body, 'utf8');

if (asJson) {
  process.stdout.write(`${JSON.stringify({ path: file, tools, created }, null, 2)}\n`);
} else {
  process.stdout.write(`${file}\n`);
}
