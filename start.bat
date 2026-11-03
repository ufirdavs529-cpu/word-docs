@echo off
title Microsoft Word Web Server
echo ========================================================
echo           MICROSOFT WORD WEB SERVER ISHGA TUSHMOQDA
echo ========================================================
echo.

set AGY_NODE="%APPDATA%\Antigravity\bin\agy-node.cmd"

if exist %AGY_NODE% (
    echo [INFO] agy-node topildi. Server ishga tushirilmoqda...
    start http://localhost:3000
    call %AGY_NODE% server.js
    goto :end
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Node.js topildi. Server ishga tushirilmoqda...
    start http://localhost:3000
    node server.js
    goto :end
)

where agy-node >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] agy-node topildi. Server ishga tushirilmoqda...
    start http://localhost:3000
    agy-node server.js
    goto :end
)

echo [OGOHLANTIRISH] Node.js topilmadi. Brauzerda index.html ochilmoqda...
start "" "%~dp0index.html"
pause

:end
