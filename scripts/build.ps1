<#
Build script for the Task Manager capstone app.
Runs the backend unit/API test suite (the build stops if any test fails),
then packages backend + frontend into a deployable zip artifact under dist/.
#>
param(
    [string]$Version = "1.1.0"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# $ErrorActionPreference does not catch a failing native command, so check the
# exit code explicitly; otherwise a red test run would still produce an artifact.
function Assert-LastExit([string]$what) {
    if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" }
}

Write-Host "==> Installing backend dependencies"
Push-Location "$root\backend"
try {
    npm install --no-audit --no-fund
    Assert-LastExit "npm install"
    Write-Host "==> Running backend unit/API tests"
    npm test
    Assert-LastExit "backend tests"
}
finally {
    Pop-Location
}

$distDir = "$root\dist"
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

# Only the staging folder is recreated; zips from earlier versions are kept.
$stagingDir = "$distDir\staging"
if (Test-Path $stagingDir) { Remove-Item -Recurse -Force $stagingDir }
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

Write-Host "==> Staging deployable artifact"
# Copy-Item -Exclude does not skip nested directories (e.g. node_modules) on
# a recursive copy, so use robocopy with /XD for reliable directory exclusion.
# robocopy exit codes below 8 mean success. This copies db/schema.sql and
# db/migrations/ (SCRUM-12/13, SCRUM-7/8) but never a local *.db file.
robocopy "$root\backend" "$stagingDir\backend" /E /XD node_modules /XF *.db | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy backend failed (exit code $LASTEXITCODE)" }
robocopy "$root\frontend" "$stagingDir\frontend" /E | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy frontend failed (exit code $LASTEXITCODE)" }
Copy-Item "$root\README.md" "$stagingDir\README.md"

$zipPath = "$distDir\task-manager-build-v$Version.zip"
Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipPath -Force
Remove-Item -Recurse -Force $stagingDir

Write-Host "==> Build artifact created: $zipPath"
# robocopy leaves $LASTEXITCODE at 1 ("files copied") on success; do not leak that
# as the script exit code.
exit 0
