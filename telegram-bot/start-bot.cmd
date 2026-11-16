@echo off
rem Starts the Telegram bot from this folder and appends its output to bot.log.
rem Register once with Task Scheduler to have it start at login:
rem   schtasks /Create /TN "Haulway Telegram bot" /SC ONLOGON /TR "\"%CD%\start-bot.cmd\"" /F
cd /d "%~dp0"
node src/index.js >> bot.log 2>&1
