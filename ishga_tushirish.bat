@echo off
chcp 65001 >nul
title Klinika 3D nazorati
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js o'rnatilmagan. https://nodejs.org saytidan LTS versiyasini o'rnating, 22.13 yoki undan yangi.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 (
  echo Node.js versiyasi eski. https://nodejs.org saytidan 22.13 yoki undan yangi versiyani o'rnating.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Birinchi ishga tushirish: kerakli kutubxonalar yuklanmoqda...
  call npm install
  if errorlevel 1 ( echo Kutubxonalarni yuklab bo'lmadi. & pause & exit /b 1 )
)

if not exist web\dist\index.html (
  echo Ekran qismi yig'ilmoqda...
  call npm run build
  if errorlevel 1 ( echo Yig'ib bo'lmadi. & pause & exit /b 1 )
)

start "" http://localhost:8080
call npm start
pause
