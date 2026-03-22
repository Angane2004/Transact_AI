# Build APK without Android Studio
Write-Host "🔨 Building TransactAI APK without Android Studio..." -ForegroundColor Blue

# Check if Java is installed
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✅ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java not found. Please install Java JDK (11 or later)" -ForegroundColor Red
    Write-Host "Download from: https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

# Navigate to Android directory
Set-Location android
Write-Host "📍 Changed to android directory" -ForegroundColor Cyan

# Make gradlew executable (for future use on other platforms)
if ($IsLinux -or $IsMacOS) {
    chmod +x gradlew
}

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
.\gradlew clean

# Build debug APK
Write-Host "🔨 Building debug APK..." -ForegroundColor Blue
.\gradlew assembleDebug

# Check if build was successful
$debugApk = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $debugApk) {
    $apkPath = Resolve-Path $debugApk
    Write-Host "✅ Debug APK built successfully!" -ForegroundColor Green
    Write-Host "📱 APK Location: $apkPath" -ForegroundColor Cyan
    
    # Get APK size
    $apkSize = (Get-Item $debugApk).Length / 1MB
    Write-Host "📊 APK Size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
    
    # Ask if user wants to build release APK
    $choice = Read-Host "Do you want to build release APK? (y/n)"
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Write-Host "🔨 Building release APK..." -ForegroundColor Blue
        .\gradlew assembleRelease
        
        $releaseApk = "app\build\outputs\apk\release\app-release.apk"
        if (Test-Path $releaseApk) {
            $releaseApkPath = Resolve-Path $releaseApk
            Write-Host "✅ Release APK built successfully!" -ForegroundColor Green
            Write-Host "📱 Release APK Location: $releaseApkPath" -ForegroundColor Cyan
            
            $releaseApkSize = (Get-Item $releaseApk).Length / 1MB
            Write-Host "📊 Release APK Size: $([math]::Round($releaseApkSize, 2)) MB" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Release APK build failed" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "🎉 Build process completed!" -ForegroundColor Green
    Write-Host "💡 To install APK on your device:" -ForegroundColor Yellow
    Write-Host "   1. Transfer APK to your Android device" -ForegroundColor White
    Write-Host "   2. Enable 'Install from unknown sources' in device settings" -ForegroundColor White
    Write-Host "   3. Tap on the APK file to install" -ForegroundColor White
    
} else {
    Write-Host "❌ Debug APK build failed" -ForegroundColor Red
    Write-Host "💡 Check the error messages above for troubleshooting" -ForegroundColor Yellow
    exit 1
}

# Return to original directory
Set-Location ..
Write-Host "📍 Returned to frontend directory" -ForegroundColor Cyan
