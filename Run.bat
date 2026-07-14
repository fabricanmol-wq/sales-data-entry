@echo off
setlocal enabledelayedexpansion

for /d %%i in (".\.java\extracted\*") do set "JAVA_HOME=%%~fi"
set "PATH=%JAVA_HOME%\bin;%PATH%"

java -jar target\sales-data-entry-0.0.1-SNAPSHOT.jar
