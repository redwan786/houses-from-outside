@echo off
setlocal enabledelayedexpansion
title CSE4204 - Houses from Outside - Step 2 - Start Project
cd /d "%~dp0"

set PORT=8204
set URL=http://localhost:%PORT%/index.html

echo ============================================================
echo  CSE 4204 - Houses from Outside - Group 07 (Section C2)
echo  STEP 2 of 2 : Local server start + browser open
echo ============================================================
echo.

if not exist "vendor\three.module.js" (
    echo  [WARN] vendor\three.module.js is missing.
    echo         First run 1-DOWNLOAD-LIBS.bat ^(internet required^).
    echo         If internet is available, the project may also work from the CDN,
    echo         but without internet in the lab, the scene will not load.
    echo.
    choice /c YN /m "Continue anyway"
    if errorlevel 2 exit /b 1
    echo.
)

rem ---- An HTTP server is required. ES modules cannot run using file://. ----
set SERVER_CMD=

where python >nul 2>nul
if not errorlevel 1 (
    set SERVER_CMD=python -m http.server %PORT%
    set SERVER_NAME=python
    goto :haveserver
)

where py >nul 2>nul
if not errorlevel 1 (
    set SERVER_CMD=py -3 -m http.server %PORT%
    set SERVER_NAME=py -3
    goto :haveserver
)

where node >nul 2>nul
if not errorlevel 1 (
    set SERVER_CMD=node server.js %PORT%
    set SERVER_NAME=node
    goto :haveserver
)

echo  [ERROR] Neither Python nor Node.js was found.
echo.
echo   Install one of the following ^(either one will work^):
echo     Python : https://www.python.org/downloads/
echo              Make sure to tick "Add python.exe to PATH" during installation
echo     Node.js: https://nodejs.org/
echo.
echo   After installation, double-click this file again.
echo.
pause
exit /b 1

:haveserver
echo  [OK] Server: !SERVER_NAME!
echo  [OK] Port  : %PORT%
echo.
echo  The server will run in a new window. DO NOT CLOSE that window
echo  while you are using the project.
echo.

start "CSE4204 Local Server - DO NOT CLOSE" cmd /k "cd /d "%~dp0" && echo Server running on %URL% && echo Press Ctrl+C in this window to stop the server. && echo. && !SERVER_CMD!"

rem Wait a little for the server to start
timeout /t 3 /nobreak >nul

echo  Opening browser: %URL%
start "" "%URL%"

echo.
echo ============================================================
echo  Keyboard : W S = move closer/farther   A D = look around
echo             Q E = move up/down          1..5 = camera preset
echo             Space = auto tour            G = full help list
echo             C = change cottage texture   P = save snapshot
echo  Mouse    : CLICK on a cottage to change its texture
echo             Left drag = orbit, Right drag = pan, Wheel = zoom
echo ============================================================
echo.
echo  For the report snapshot: press 1..5, then press P.
echo  The PNG file will be saved in the Downloads folder.
echo.
echo  If the scene does not load, check SNAPSHOT-GUIDE.md and README.md.
echo.
pause
exit /b 0