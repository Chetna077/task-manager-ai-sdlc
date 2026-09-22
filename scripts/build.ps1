<#
Build script for the Task Manager capstone app.
Runs the backend unit/API test suite, then packages backend + frontend
into a deployable zip artifact under dist/.
#>
param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Installing backend dependencies"
Push-Location "$root\backend"
npm install --no-audit --no-fund
Write-Host "==> Running backend unit/API tests"
npm test
Pop-Location

$distDir = "$root\dist"
if (Test-Path $distDir) { Remove-Item -Recurse -Force $distDir }
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

$stagingDir = "$distDir\staging"
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

Write-Host "==> Staging deployable artifact"
# Copy-Item -Exclude does not skip nested directories (e.g. node_modules) on
# a recursive copy, so use robocopy with /XD for reliable directory exclusion.
robocopy "$root\backend" "$stagingDir\backend" /E /XD node_modules /XF *.db | Out-Null
robocopy "$root\frontend" "$stagingDir\frontend" /E | Out-Null
Copy-Item "$root\README.md" "$stagingDir\README.md"

$zipPath = "$distDir\task-manager-build-v$Version.zip"
Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipPath -Force
Remove-Item -Recurse -Force $stagingDir

Write-Host "==> Build artifact created: $zipPath"
