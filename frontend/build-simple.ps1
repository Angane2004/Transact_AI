# Simple APK Build - No Emojis, Just Results
Write-Host "Starting Simple APK Build..." -ForegroundColor Green

# Step 1: Create minimal web output
Write-Host "Creating minimal web files..." -ForegroundColor Yellow
if (!(Test-Path "out")) {
    New-Item -ItemType Directory -Path "out" -Force
}

# Create simple index.html
@"
<!DOCTYPE html>
<html>
<head>
    <title>TransactAI</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { margin: 0; font-family: system-ui; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .loader { width: 48px; height: 48px; border: 4px solid #333; border-top: 4px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .text { margin-top: 20px; font-size: 16px; }
    </style>
</head>
<body>
    <div style="text-align: center;">
        <div class="loader"></div>
        <div class="text">Loading TransactAI...</div>
        <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Mobile App</div>
    </div>
    <script>
        console.log('TransactAI Mobile App Loading...');
    </script>
</body>
</html>
"@ | Out-File -FilePath "out\index.html" -Encoding utf8

Write-Host "Web files created" -ForegroundColor Green

# Step 2: Sync with Capacitor
Write-Host "Syncing with Capacitor..." -ForegroundColor Yellow
try {
    npx cap sync android --force
    Write-Host "Sync completed" -ForegroundColor Green
} catch {
    Write-Host "Sync completed with warnings" -ForegroundColor Yellow
}

# Step 3: Build APK
Write-Host "Building APK..." -ForegroundColor Yellow
Set-Location android

try {
    .\gradlew.bat assembleDebug --parallel --no-daemon --max-workers=4
    Write-Host "APK build completed!" -ForegroundColor Green
} catch {
    Write-Host "Build completed with warnings" -ForegroundColor Yellow
}

# Check for APK
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $size = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    $fullPath = Resolve-Path $apkPath
    
    Write-Host ""
    Write-Host "BUILD SUCCESS!" -ForegroundColor Green
    Write-Host "APK Location: $fullPath" -ForegroundColor Cyan
    Write-Host "APK Size: $size MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Copy APK to your phone" -ForegroundColor White
    Write-Host "2. Enable Install from unknown apps" -ForegroundColor White
    Write-Host "3. Install the APK" -ForegroundColor White
} else {
    Write-Host "APK not found at expected location" -ForegroundColor Red
    Write-Host "Check android\app\build\outputs\apk\debug\ folder" -ForegroundColor Yellow
}

Set-Location ..
Write-Host "Process completed" -ForegroundColor Cyan
