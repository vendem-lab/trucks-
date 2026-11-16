@echo off
rem Runs the Telegram bot from this folder and restarts it if it ever exits.
rem Start it hidden with start-bot.vbs, or register that in Task Scheduler.
cd /d "%~dp0"

:loop
node src\index.js >> bot.log 2>&1
timeout /t 10 /nobreak > nul
goto loop
