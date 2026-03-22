#!/bin/bash

# Build APK without Android Studio
echo "🔨 Building TransactAI APK without Android Studio..."

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install Java JDK (11 or later)"
    echo "Download from: https://adoptium.net/"
    exit 1
fi

echo "✅ Java found: $(java -version 2>&1 | head -n 1)"

# Navigate to Android directory
cd android
echo "📍 Changed to android directory"

# Make gradlew executable
chmod +x gradlew

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build debug APK
echo "🔨 Building debug APK..."
./gradlew assembleDebug

# Check if build was successful
debug_apk="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$debug_apk" ]; then
    echo "✅ Debug APK built successfully!"
    echo "📱 APK Location: $(pwd)/$debug_apk"
    
    # Get APK size
    apk_size=$(du -h "$debug_apk" | cut -f1)
    echo "📊 APK Size: $apk_size"
    
    # Ask if user wants to build release APK
    read -p "Do you want to build release APK? (y/n): " choice
    if [[ $choice == "y" || $choice == "Y" ]]; then
        echo "🔨 Building release APK..."
        ./gradlew assembleRelease
        
        release_apk="app/build/outputs/apk/release/app-release.apk"
        if [ -f "$release_apk" ]; then
            echo "✅ Release APK built successfully!"
            echo "📱 Release APK Location: $(pwd)/$release_apk"
            
            release_apk_size=$(du -h "$release_apk" | cut -f1)
            echo "📊 Release APK Size: $release_apk_size"
        else
            echo "❌ Release APK build failed"
        fi
    fi
    
    echo ""
    echo "🎉 Build process completed!"
    echo "💡 To install APK on your device:"
    echo "   1. Transfer APK to your Android device"
    echo "   2. Enable 'Install from unknown sources' in device settings"
    echo "   3. Tap on the APK file to install"
    
else
    echo "❌ Debug APK build failed"
    echo "💡 Check the error messages above for troubleshooting"
    exit 1
fi

# Return to original directory
cd ..
echo "📍 Returned to frontend directory"
