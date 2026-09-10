@echo off
setlocal enabledelayedexpansion
title CSE4204 - Houses from Outside - Step 1 - Download Three.js
cd /d "%~dp0"

echo ============================================================
echo  CSE 4204 - Houses from Outside - Group 07 (Section C2)
echo  STEP 1 of 2 : Three.js library download (need internet)
echo ============================================================
echo.
echo  This step only needs to be run **ONCE**.
echo  Once this is done, the project will work **offline** as well.
echo.

if not exist "vendor" mkdir "vendor"

if exist "vendor\three.module.js" (
    for %%A in ("vendor\three.module.js") do set SIZE=%%~zA
    if !SIZE! GTR 300000 (
        echo  [SKIP] vendor\three.module.js already ache ^(!SIZE! bytes^).
        echo         There is no need to download it again.
        echo.
        echo  Now run **2-START-PROJECT.bat**.
        echo.
        pause
        exit /b 0
    )
    echo  [WARN] The old file seems to be corrupted. It will be downloaded again.
    del /q "vendor\three.module.js"
)

where curl >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] curl was not found.
    echo          curl is included in Windows 10/11. Please update Windows,
    echo          Or manually download it from the link provided below:
    echo.
    echo          https://unpkg.com/three@0.169.0/build/three.module.js
    echo.
    echo          Place the file in this folder:  %CD%\vendor\three.module.js
    echo.
    pause
    exit /b 1
)

echo  [1/2] Trying the unpkg CDN ...
curl -L --fail --silent --show-error -o "vendor\three.module.js" "https://unpkg.com/three@0.169.0/build/three.module.js"
if not errorlevel 1 goto :verify

echo  [2/2] unpkg failed. Trying the jsDelivr CDN ...
curl -L --fail --silent --show-error -o "vendor\three.module.js" "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js"
if not errorlevel 1 goto :verify

echo.
echo  [ERROR] Download failed. Please check your internet connection.
echo          Or manually download the file and place it here:
echo          %CD%\vendor\three.module.js
echo.
pause
exit /b 1

:verify
for %%A in ("vendor\three.module.js") do set SIZE=%%~zA
if !SIZE! LSS 300000 (
    echo.
    echo  [ERROR] The file size is too small ^(!SIZE! bytes^). The file is invalid.
    del /q "vendor\three.module.js"
    echo          Please try again.
    echo.
    pause
    exit /b 1
)

echo.
echo  [OK] Download complete: vendor\three.module.js ^(!SIZE! bytes^)
echo.
echo  ============================================================
echo   Now double-click the 2-START-PROJECT.bat file.
echo  ============================================================
echo.
pause
exit /b 0