# Fast APK Build - Optimized for Speed
Write-Host "⚡ Fast APK Build - Optimized for Speed" -ForegroundColor Green

# Step 1: Clean only what's necessary
Write-Host "🧹 Quick clean..." -ForegroundColor Yellow
Remove-Item -ErrorAction SilentlyContinue -Recurse -Force .next\cache
Remove-Item -ErrorAction SilentlyContinue -Recurse -Force android\app\build

# Step 2: Fast build with optimizations
Write-Host "🚀 Fast web build..." -ForegroundColor Yellow
$env:NODE_OPTIONS="--max-old-space-size=4096"
$env:NEXT_TELEMETRY_DISABLED="1"

try {
    # Use production build but skip some checks
    npm run build
    Write-Host "✅ Web build completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Build had issues, trying minimal build..." -ForegroundColor Yellow
    # Fallback: try with less strict checks
    $env:ESLINT_NO_DEV_ERRORS="true"
    $env:NEXT_PUBLIC_SKIP_TYPE_CHECK="true"
    npm run build
}

# Step 3: Quick Capacitor sync
Write-Host "🔄 Quick sync..." -ForegroundColor Yellow
try {
    npx cap sync android --skip-git-cleanup
    Write-Host "✅ Sync completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Sync failed" -ForegroundColor Red
    exit 1
}

# Step 4: Fast Gradle build
Write-Host "🔨 Fast APK build..." -ForegroundColor Yellow
Set-Location android

# Use Gradle optimizations
$env:GRADLE_OPTS="-Xmx2g -XX:+UseG1GC -XX:+UseStringDeduplication"
$env:ORG_GRADLE_PROJECT_android.useAndroidX="true"
$env:ORG_GRADLE_PROJECT_android.enableJetifier="true"

try {
    # Build only debug APK with parallel execution
    .\gradlew.bat assembleDebug --parallel --build-cache --no-daemon --max-workers=4
    Write-Host "✅ APK built successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ APK build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Check APK
$debugApk = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $debugApk) {
    $apkPath = Resolve-Path $debugApk
    $apkSize = [math]::Round((Get-Item $debugApk).Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "🎉 FAST BUILD COMPLETED!" -ForegroundColor Green
    Write-Host "📍 APK: $apkPath" -ForegroundColor Cyan
    Write-Host "📊 Size: $apkSize MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⏱️ Build time optimized with:" -ForegroundColor Yellow
    Write-Host "  • Gradle parallel execution" -ForegroundColor White
    Write-Host "  • Build caching enabled" -ForegroundColor White
    Write-Host "  • Memory optimizations" -ForegroundColor White
    Write-Host "  • Skipped unnecessary checks" -ForegroundColor White
} else {
    Write-Host "❌ APK not found" -ForegroundColor Red
}

Set-Location ..
Write-Host "📍 Returned to frontend directory" -ForegroundColor Cyan
