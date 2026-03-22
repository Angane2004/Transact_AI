@echo off
echo Starting APK Build...

REM Create minimal web output
echo Creating web files...
if not exist "out" mkdir "out"

echo ^<!DOCTYPE html^> > "out\index.html"
echo ^<html^> >> "out\index.html"
echo ^<head^> >> "out\index.html"
echo ^<title^>TransactAI^</title^> >> "out\index.html"
echo ^<meta charset="utf-8"^> >> "out\index.html"
echo ^<meta name="viewport" content="width=device-width, initial-scale=1"^> >> "out\index.html"
echo ^</head^> >> "out\index.html"
echo ^<body^> >> "out\index.html"
echo ^<h1^>TransactAI Mobile^</h1^> >> "out\index.html"
echo ^<p^>Loading...^</p^> >> "out\index.html"
echo ^</body^> >> "out\index.html"
echo ^</html^> >> "out\index.html"

echo Web files created

REM Sync with Capacitor
echo Syncing with Capacitor...
call npx cap sync android --force

REM Build APK
echo Building APK...
cd android
call gradlew.bat assembleDebug --parallel --no-daemon

REM Check if APK was created
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo BUILD SUCCESS!
    echo APK Location: %cd%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Next steps:
    echo 1. Copy APK to your phone
    echo 2. Enable Install from unknown apps
    echo 3. Install the APK
) else (
    echo APK not found
    echo Check android\app\build\outputs\apk\debug\ folder
)

cd ..
echo Process completed
pause
