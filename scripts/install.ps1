# ResearchKit — 安装到 agent 技能目录（Windows Junction，无需管理员权限）
#
# 用法:
#   pwsh -File .\scripts\install.ps1
#   pwsh -File .\scripts\install.ps1 -Dest "$HOME\.claude\skills\researchkit"
#   pwsh -File .\scripts\install.ps1 -OutDir "D:\Notes\research"   # 同时写 config.json
#   pwsh -File .\scripts\install.ps1 -Force                        # 覆盖已存在的实体目录
#
# 说明: 使用 Junction 而不是复制，git pull 后技能立即生效。

param(
    [string]$Dest = (Join-Path $HOME '.agents\skills\researchkit'),
    [string]$OutDir,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$src = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$parent = Split-Path -Parent $Dest

if ($src -eq $Dest) {
    throw "源目录与目标目录相同: $Dest"
}

New-Item -ItemType Directory -Force -Path $parent | Out-Null

if (Test-Path $Dest) {
    $item = Get-Item $Dest -Force
    $isLink = ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
    if ($isLink -or $Force) {
        Remove-Item $Dest -Force -Recurse
        Write-Host "removed existing: $Dest"
    } else {
        throw "$Dest 已存在且不是链接。请先手动移走，或加 -Force 覆盖。"
    }
}

New-Item -ItemType Junction -Path $Dest -Target $src | Out-Null
Write-Host "linked: $Dest -> $src"

# 可选：写入报告输出目录（config.json 已被 .gitignore 忽略）
if ($OutDir) {
    $cfgPath = Join-Path $src 'config.json'
    $outFull = [IO.Path]::GetFullPath($OutDir)
    New-Item -ItemType Directory -Force -Path $outFull | Out-Null
    $json = @{ outDir = ($outFull -replace '\\', '/') } | ConvertTo-Json
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($cfgPath, $json, $utf8NoBom)
    Write-Host "config: $cfgPath (outDir = $outFull)"
}

Write-Host ""
Write-Host "验证: node `"$src\scripts\probe.mjs`" --table"
Write-Host "在 agent 里说：调研一下 <主题>"
