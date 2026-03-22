# Build Android APK Without Android Studio

Since Android Studio is too heavy for your laptop, you can build the APK using command-line tools only.

## Prerequisites

1. **Java JDK** (version 11 or later)
   - Download from: https://adoptium.net/
   - Install and add to PATH

2. **Android SDK** (already included in your project)
   - Your project already has the necessary Android build tools

## Quick Build Steps

### Option 1: PowerShell (Windows)
```powershell
# Navigate to frontend directory
cd d:\ghci\TransactAI\frontend

# Run the build script
.\build-apk.ps1
```

### Option 2: Command Line
```bash
# Navigate to frontend directory
cd d:\ghci\TransactAI\frontend

# Navigate to android directory
cd android

# Build debug APK
.\gradlew.bat assembleDebug

# APK will be at:
# android\app\build\outputs\apk\debug\app-debug.apk
```

## What These Scripts Do

1. **Check Java installation**
2. **Clean previous builds**
3. **Build debug APK** (for testing)
4. **Optionally build release APK** (for production)
5. **Show APK location and size**

## APK Locations

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`

## Installing APK on Your Device

1. **Transfer APK** to your Android device (USB, email, cloud, etc.)
2. **Enable installation** from unknown sources:
   - Go to Settings → Security → Install unknown apps
   - Allow for your file manager/app
3. **Install APK** by tapping on the file
4. **Grant permissions** when prompted (SMS, Biometrics, etc.)

## Troubleshooting

### Java Not Found
- Install Java JDK from https://adoptium.net/
- Make sure it's added to your system PATH

### Build Fails
- Check error messages in the terminal
- Make sure you have enough disk space
- Try running `./gradlew clean` first

### APK Won't Install
- Make sure "Install unknown apps" is enabled
- Check if you have enough storage space
- Try uninstalling the previous version first

## Testing SMS & Biometrics

After installation:
1. **SMS Permissions**: App will automatically request SMS permissions on first launch
2. **Biometric Setup**: Go to app settings to enable biometric authentication
3. **Test SMS**: Send a test bank SMS to verify real-time detection

## Next Steps

Once you verify the debug APK works, you can:
1. Build the release APK for production use
2. Upload to Google Play Store (if needed)
3. Share the APK with others for testing
