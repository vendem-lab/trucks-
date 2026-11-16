' Starts the Telegram bot with no visible console window.
' Register this file in Task Scheduler at logon so the bot survives reboots.
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
shell.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run "cmd /c start-bot.cmd", 0, False
