# ============================================================================
# Dolios installer (Windows)
#   irm https://raw.githubusercontent.com/DoliosAgent/dolios/main/install-dolios.ps1 | iex
#
# Dolios is a distribution of Hermes Agent (Nous Research, MIT). This wrapper runs the
# Hermes installer against the Dolios repository into its own home (%LOCALAPPDATA%\dolios),
# installs GMGN's gmgn-cli, and adds a `dolios` command next to the launcher.
# Overrides: $env:DOLIOS_REPO (owner/name), $env:DOLIOS_BRANCH, $env:DOLIOS_HOME.
# ============================================================================
$ErrorActionPreference = 'Stop'
$Repo   = if ($env:DOLIOS_REPO)   { $env:DOLIOS_REPO }   else { 'DoliosAgent/dolios' }
$Branch = if ($env:DOLIOS_BRANCH) { $env:DOLIOS_BRANCH } else { 'main' }
$DHome  = if ($env:DOLIOS_HOME)   { $env:DOLIOS_HOME }   else { Join-Path $env:LOCALAPPDATA 'dolios' }

Write-Host ''
Write-Host '  ██████╗  ██████╗ ██╗     ██╗ ██████╗ ███████╗' -ForegroundColor Cyan
Write-Host '  ██╔══██╗██╔═══██╗██║     ██║██╔═══██╗██╔════╝' -ForegroundColor Green
Write-Host '  ██║  ██║██║   ██║██║     ██║██║   ██║███████╗' -ForegroundColor Yellow
Write-Host '  ██████╔╝╚██████╔╝███████╗██║╚██████╔╝███████║' -ForegroundColor DarkYellow
Write-Host '  ╚═════╝  ╚═════╝ ╚══════╝╚═╝ ╚═════╝ ╚══════╝' -ForegroundColor Red
Write-Host '  The cunning trading agent for GMGN  ·  built on Hermes Agent' -ForegroundColor DarkGray
Write-Host ''

$env:HERMES_REPO_URL = "https://github.com/$Repo.git"
$installer = Join-Path ([IO.Path]::GetTempPath()) ("dolios-install-" + [guid]::NewGuid().ToString('n') + '.ps1')
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/$Repo/$Branch/scripts/install.ps1" -OutFile $installer
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -Branch $Branch -HermesHome $DHome -InstallDir (Join-Path $DHome 'dolios')
    if ($LASTEXITCODE -ne 0) { throw "Hermes installer failed (exit $LASTEXITCODE)" }
} finally { Remove-Item $installer -ErrorAction SilentlyContinue }

# GMGN CLI: prefer the Node.js the Hermes package manager just installed (its global prefix is on
# the agent's PATH), fall back to a system npm.
$npm = Get-ChildItem -Path $DHome, (Join-Path $HOME '.hermes\tools') -Filter npm.cmd -Recurse -Depth 3 -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $npm) { $npm = (Get-Command npm -ErrorAction SilentlyContinue).Source }
if ($npm) {
    Write-Host 'Installing gmgn-cli...' -ForegroundColor Cyan
    & $npm install -g gmgn-cli
} else {
    Write-Warning 'npm not found. Dolios will offer to install gmgn-cli on first use, or install Node 18+ and run: npm install -g gmgn-cli'
}

# `dolios` command next to the Hermes launcher
$bin = Join-Path $DHome 'bin'
$target = @('hermes.exe', 'hermes.cmd') | ForEach-Object { Join-Path $bin $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($target) {
    Set-Content -Encoding ASCII -Path (Join-Path $bin 'dolios.cmd') -Value "@echo off`r`n`"$target`" %*"
    Write-Host "dolios command installed at $bin" -ForegroundColor Green
} else {
    Write-Warning "Launcher not found in $bin - use 'hermes' instead of 'dolios'."
}

Write-Host ''
Write-Host 'Done. Open a new terminal and run:  dolios' -ForegroundColor Green
Write-Host 'First chat: say "connect my GMGN account" and Dolios walks you through it.' -ForegroundColor DarkGray
