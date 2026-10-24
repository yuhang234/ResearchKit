#!/usr/bin/env node
/**
 * ResearchKit probe — detect which research backends are usable right now.
 *
 * Usage:
 *   node scripts/probe.mjs            # fast: PATH + version checks (~3-6s)
 *   node scripts/probe.mjs --deep     # adds opencli bridge / notebooklm auth / exa
 *   node scripts/probe.mjs --table    # human-readable summary
 *   node scripts/probe.mjs --json     # machine-readable (default)
 *
 * Exit code is always 0 unless the script itself crashes, so callers can
 * treat the JSON as the source of truth.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const WIN = process.platform === 'win32';

// npm/nvm shims are extension-less on Windows, so execFile needs a shell there.
function runCmd(bin, args, opts = {}) {
  if (!WIN) return run(bin, args, opts);
  const quoted = args
    .map((a) => (/[\s"&|<>^]/.test(a) ? `"${String(a).replace(/"/g, '""')}"` : a))
    .join(' ');
  return run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${bin} ${quoted}`], opts);
}
const args = process.argv.slice(2);
const DEEP = args.includes('--deep');
const TABLE = args.includes('--table');

const env = { ...process.env, PYTHONIOENCODING: 'utf-8', NO_COLOR: '1' };

async function which(bin) {
  try {
    const cmd = WIN ? 'where' : 'which';
    const { stdout } = await run(cmd, [bin], { timeout: 8000, windowsHide: true });
    return stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0] || null;
  } catch {
    return null;
  }
}

async function version(bin, flag = '--version') {
  try {
    const opts = { timeout: 12000, env, windowsHide: true };
    const { stdout, stderr } = await runCmd(bin, [flag], opts);
    const line = `${stdout}\n${stderr}`.split(/\r?\n/).find((l) => l.trim());
    return line ? line.trim().slice(0, 120) : null;
  } catch {
    return null;
  }
}

function firstJson(text) {
  const candidates = [];
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) candidates.push([objStart, objEnd]);
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) candidates.push([arrStart, arrEnd]);
  candidates.sort((a, b) => a[0] - b[0]);
  for (const [start, end] of candidates) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const TOOLS = [
  { id: 'opencli', bin: 'opencli', role: '多站点 CLI：google / scholar / bilibili / zhihu / notebooklm …（需浏览器桥）' },
  { id: 'bili', bin: 'bili', role: 'B站搜索、视频详情、字幕、评论（无需登录）' },
  { id: 'notebooklm', bin: 'notebooklm', role: 'NotebookLM 深调研、来源管理、带引用问答' },
  { id: 'agent-reach', bin: 'agent-reach', role: '平台路由器 + doctor + 转录' },
  { id: 'gh', bin: 'gh', role: 'GitHub 仓库/代码/Issue 搜索' },
  { id: 'mcporter', bin: 'mcporter', role: 'MCP 网关：exa 网页搜索' },
  { id: 'codex', bin: 'codex', role: 'CLI agent（codex exec 只读调研）' },
  { id: 'claude', bin: 'claude', role: 'CLI agent（claude -p 只读调研）' },
  { id: 'gemini', bin: 'gemini', role: 'CLI agent（本机已失效，见 troubleshooting）' },
  { id: 'oracle', bin: 'oracle', role: '第二模型复核（GPT 系 + 联网搜索）' },
  { id: 'grok', bin: 'grok', role: 'CLI agent（自带 web search，适合 X/最新动态）' },
  { id: 'yt-dlp', bin: 'yt-dlp', role: 'YouTube / 通用视频字幕与音频' },
  { id: 'curl', bin: 'curl', role: '公开 API / Jina Reader 兜底' },
  { id: 'node', bin: 'node', role: '运行本 skill 的脚本' },
];

const EXTRA_PATHS = [
  {
    id: 'tabbit-cli',
    role: 'Tabbit 浏览器自动化（Playwright 代码）',
    candidates: [
      path.join(process.env.LOCALAPPDATA || '', 'Tabbit', 'LocalAgent', 'bin', 'tabbit-cli.exe'),
      path.join(process.env.HOME || '', '.local', 'bin', 'tabbit-cli'),
    ],
  },
];

const VERSION_FLAG = {
  opencli: '--version',
  bili: '--version',
  notebooklm: '--version',
  'agent-reach': '--version',
  gh: '--version',
  mcporter: '--version',
  codex: '--version',
  claude: '--version',
  gemini: '--version',
  oracle: '--version',
  grok: '--version',
  'yt-dlp': '--version',
  curl: '--version',
  node: '--version',
};

async function main() {
  const tools = {};

  await Promise.all(
    TOOLS.map(async (t) => {
      const binPath = await which(t.bin);
      const available = Boolean(binPath);
      tools[t.id] = {
        available,
        path: binPath,
        role: t.role,
        version: available && VERSION_FLAG[t.id] ? await version(t.bin, VERSION_FLAG[t.id]) : null,
      };
    }),
  );

  for (const extra of EXTRA_PATHS) {
    const hit = extra.candidates.find((p) => p && existsSync(p)) || null;
    tools[extra.id] = { available: Boolean(hit), path: hit, role: extra.role, version: null };
  }

  const checks = {};
  const warnings = [];

  if (DEEP) {
    await Promise.all([
      (async () => {
        if (!tools.opencli.available) {
          checks.opencli_bridge = { ok: false, reason: 'opencli not installed' };
          return;
        }
        try {
          const { stdout, stderr } = await runCmd('opencli', ['doctor'], {
            timeout: 25000,
            env,
            windowsHide: true,
          });
          const text = `${stdout}\n${stderr}`;
          const daemon = /\[OK\]\s+Daemon/i.test(text);
          const extension = /Extension:\s*connected/i.test(text) && !/Extension:\s*not connected/i.test(text);
          checks.opencli_bridge = {
            ok: daemon && extension,
            daemon,
            extension,
            reason: daemon && extension ? null : 'Chrome/Chromium 未加载 OpenCLI 扩展，浏览器类适配器不可用',
          };
          if (!extension) {
            warnings.push('opencli 浏览器桥未连接：google / scholar / zhihu / xiaohongshu / notebooklm 适配器会返回 BROWSER_CONNECT(69)。用 exa / jina / bili / notebooklm-py 兜底，或让用户加载扩展。');
          }
        } catch (e) {
          checks.opencli_bridge = { ok: false, reason: String(e.message || e).slice(0, 200) };
        }
      })(),
      (async () => {
        if (!tools.notebooklm.available) {
          checks.notebooklm_auth = { ok: false, reason: 'notebooklm not installed' };
          return;
        }
        try {
          const { stdout, stderr } = await runCmd('notebooklm', ['list', '--json'], {
            timeout: 30000,
            env,
            windowsHide: true,
          });
          const data = firstJson(`${stdout}\n${stderr}`);
          const authError = !Array.isArray(data) && (data?.error === true || data?.code === 'AUTH_ERROR');
          checks.notebooklm_auth = {
            ok: data !== null && !authError,
            status: authError ? 'AUTH_ERROR' : Array.isArray(data) ? 'ok' : null,
            notebooks: Array.isArray(data) ? data.length : null,
            reason: authError
              ? '登录失效：运行 notebooklm login'
              : data === null
                ? '无法解析 notebooklm list 输出'
                : null,
          };
          if (!checks.notebooklm_auth.ok) {
            warnings.push('notebooklm 登录已失效：运行 `notebooklm login` 后重试。');
          }
        } catch (e) {
          const data = firstJson(`${e.stdout || ''}\n${e.stderr || ''}`);
          const authError = data?.error === true || data?.code === 'AUTH_ERROR';
          checks.notebooklm_auth = {
            ok: false,
            status: authError ? 'AUTH_ERROR' : null,
            reason: authError
              ? '登录失效：运行 notebooklm login'
              : String(e.message || e).slice(0, 200),
          };
          if (authError) {
            warnings.push('notebooklm 登录已失效：运行 `notebooklm login` 后重试。');
          }
        }
      })(),
      (async () => {
        if (!tools.mcporter.available) {
          checks.exa = { ok: false, reason: 'mcporter not installed' };
          return;
        }
        try {
          const { stdout, stderr } = await runCmd('mcporter', ['list'], {
            timeout: 40000,
            env,
            windowsHide: true,
          });
          const text = `${stdout}\n${stderr}`;
          const ok = /-\s*exa\s*\(\d+\s*tools?/i.test(text);
          checks.exa = { ok, reason: ok ? null : 'mcporter 未列出健康的 exa server' };
          if (!ok) warnings.push('exa 不可用：网页搜索需退回 Jina / opencli（若桥可用）/ notebooklm research。');
        } catch (e) {
          checks.exa = { ok: false, reason: String(e.message || e).slice(0, 200) };
        }
      })(),
    ]);
  }

  const webSearch = DEEP
    ? checks.exa?.ok
      ? 'exa (mcporter)'
      : checks.opencli_bridge?.ok
        ? 'opencli google'
        : 'jina / notebooklm research'
    : null;

  const result = {
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    skillDir: path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..'),
    deep: DEEP,
    tools,
    checks,
    warnings,
    recommended: {
      web_search: webSearch,
      bilibili: tools.bili.available ? 'bili (bili-cli)' : 'opencli bilibili（需桥）',
      notebooklm: tools.notebooklm.available && checks.notebooklm_auth?.ok
        ? 'notebooklm-py CLI'
        : 'opencli notebooklm（需桥）/ 普通网页检索',
      code: tools.gh.available ? 'gh search' : 'opencli github（需桥）',
      cli_agent: [
        tools.codex.available ? 'codex exec' : null,
        tools.claude.available ? 'claude -p' : null,
        tools.oracle.available ? 'oracle' : null,
        tools.grok?.available ? 'grok -p（自带联网）' : null,
      ].filter(Boolean),
    },
  };

  if (TABLE) {
    const rows = Object.entries(tools).map(([id, t]) => ({
      tool: id,
      ok: t.available ? 'yes' : 'NO',
      version: t.version || '',
      path: t.path || '',
    }));
    console.table(rows);
    for (const [k, v] of Object.entries(checks)) console.log(`${k}:`, v);
    for (const w of warnings) console.log('WARN:', w);
    console.log('recommended:', result.recommended);
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`probe failed: ${err?.stack || err}\n`);
  process.exit(1);
});
