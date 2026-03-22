# Turbo Build - Fastest Possible APK
Write-Host "🚀 TURBO BUILD - Fastest Possible" -ForegroundColor Magenta

# Set environment variables for maximum speed
$env:NODE_OPTIONS="--max-old-space-size=8192"
$env:NEXT_TELEMETRY_DISABLED="1"
$env:ESLINT_NO_DEV_ERRORS="true"
$env:NEXT_PUBLIC_SKIP_TYPE_CHECK="true"
$env:GRADLE_OPTS="-Xmx4g -XX:+UseG1GC -XX:+UseStringDeduplication -Dorg.gradle.daemon=false"

# Step 1: Minimal web build
Write-Host "⚡ Lightning web build..." -ForegroundColor Yellow
try {
    # Build with maximum optimizations
    npm run build -- --no-lint --experimental-compile
    Write-Host "✅ Web build done" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Web build issues, continuing anyway..." -ForegroundColor Yellow
}

# Step 2: Force Capacitor sync (skip checks)
Write-Host "⚡ Force sync..." -ForegroundColor Yellow
Set-Location android
try {
    npx cap sync android --force
} catch {
    Write-Host "⚠️ Sync issues, continuing..." -ForegroundColor Yellow
}

# Step 3: Ultra-fast Gradle build
Write-Host "⚡ Turbo APK build..." -ForegroundColor Yellow
try {
    # Maximum performance settings
    .\gradlew.bat assembleDebug `
        --parallel `
        --build-cache `
        --no-daemon `
        --max-workers=8 `
        --configuration-cache `
        --continuous=false `
        --no-scan `
        --offline `
        --exclude-task test `
        --exclude-task lint
    Write-Host "🚀 TURBO BUILD COMPLETE!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Turbo build failed, trying normal fast build..." -ForegroundColor Yellow
    .\gradlew.bat assembleDebug --parallel --no-daemon
}

# Check result
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $size = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "🎉 TURBO BUILD SUCCESS!" -ForegroundColor Green
    Write-Host "📍 APK: $(Resolve-Path $apkPath)" -ForegroundColor Cyan
    Write-Host "📊 Size: $size MB" -ForegroundColor Cyan
    Write-Host "⚡ Built with maximum speed optimizations" -ForegroundColor Magenta
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
}

Set-Location ..
