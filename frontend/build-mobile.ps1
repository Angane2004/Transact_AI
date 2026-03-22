# Complete Mobile Build Process
Write-Host "🚀 Starting complete mobile build process..." -ForegroundColor Blue

# Step 1: Build web assets
Write-Host "📦 Step 1: Building web assets..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Web assets built successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to build web assets" -ForegroundColor Red
    Write-Host "💡 Check the error messages above" -ForegroundColor Yellow
    exit 1
}

# Step 2: Sync with Capacitor
Write-Host "🔄 Step 2: Syncing with Capacitor..." -ForegroundColor Yellow
try {
    npx cap sync android
    Write-Host "✅ Capacitor sync completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Capacitor sync failed" -ForegroundColor Red
    Write-Host "💡 Check the error messages above" -ForegroundColor Yellow
    exit 1
}

# Step 3: Build APK
Write-Host "🔨 Step 3: Building APK..." -ForegroundColor Yellow
Set-Location android

try {
    .\gradlew.bat assembleDebug
    Write-Host "✅ APK built successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ APK build failed" -ForegroundColor Red
    Write-Host "💡 Check the error messages above" -ForegroundColor Yellow
    Set-Location ..
    exit 1
}

# Check APK location
$debugApk = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $debugApk) {
    $apkPath = Resolve-Path $debugApk
    Write-Host "📱 APK Location: $apkPath" -ForegroundColor Cyan
    
    $apkSize = (Get-Item $debugApk).Length / 1MB
    Write-Host "📊 APK Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "🎉 Mobile build completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Transfer the APK to your Android device" -ForegroundColor White
    Write-Host "2. Enable 'Install from unknown sources' in settings" -ForegroundColor White
    Write-Host "3. Install the APK and test SMS & biometric features" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 To build release APK, run:" -ForegroundColor Cyan
    Write-Host "   cd android && .\gradlew.bat assembleRelease" -ForegroundColor Gray
} else {
    Write-Host "❌ APK file not found after build" -ForegroundColor Red
}

# Return to frontend directory
Set-Location ..
Write-Host "📍 Returned to frontend directory" -ForegroundColor Cyan
