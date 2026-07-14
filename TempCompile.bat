@echo off
setlocal enabledelayedexpansion

for /d %%i in (".\.java\extracted\*") do set "JAVA_HOME=%%~fi"
set "PATH=%JAVA_HOME%\bin;%PATH%"

call .\.maven\apache-maven-3.9.6\bin\mvn.cmd compile -DskipTests
