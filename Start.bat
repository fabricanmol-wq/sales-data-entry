@echo off
TITLE Sales Data Entry Manager
setlocal enabledelayedexpansion

echo =========================================
echo Sales Data Entry Management System
echo =========================================
echo.

set JAVA_DIR=%~dp0.java
if not exist "%JAVA_DIR%\extracted" (
    echo [1/2] Java 21 is not found locally. Downloading Portable Java 21...
    if not exist "%JAVA_DIR%" mkdir "%JAVA_DIR%"
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://aka.ms/download-jdk/microsoft-jdk-21.0.3-windows-x64.zip' -OutFile '%JAVA_DIR%\java.zip'"
    echo Extracting Java...
    powershell -Command "Expand-Archive -Path '%JAVA_DIR%\java.zip' -DestinationPath '%JAVA_DIR%\extracted' -Force"
    del "%JAVA_DIR%\java.zip"
    echo Java downloaded successfully.
    echo.
)

for /d %%i in ("%JAVA_DIR%\extracted\*") do set "JAVA_HOME=%%~fi"
set "PATH=%JAVA_HOME%\bin;%PATH%"

set MAVEN_VERSION=3.9.6
set MAVEN_DIR=%~dp0.maven
set MAVEN_CMD=%MAVEN_DIR%\apache-maven-%MAVEN_VERSION%\bin\mvn.cmd

if not exist "%MAVEN_CMD%" (
    echo [2/2] Maven is not found locally. Downloading Apache Maven %MAVEN_VERSION%...
    if not exist "%MAVEN_DIR%" mkdir "%MAVEN_DIR%"
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip' -OutFile '%MAVEN_DIR%\maven.zip'"
    echo Extracting Maven...
    powershell -Command "Expand-Archive -Path '%MAVEN_DIR%\maven.zip' -DestinationPath '%MAVEN_DIR%' -Force"
    del "%MAVEN_DIR%\maven.zip"
    echo Maven downloaded successfully.
    echo.
)

echo Building the project...
call "%MAVEN_CMD%" clean package -DskipTests

if %errorlevel% neq 0 (
    echo.
    echo Build failed! 
    pause
    exit /b %errorlevel%
)

echo.
echo Starting the Application Server...
start "Sales Data Entry Server" cmd /c "set JAVA_HOME=!JAVA_HOME!& set PATH=!JAVA_HOME!\bin;!PATH!& java -jar target\sales-data-entry-0.0.1-SNAPSHOT.jar & pause"

echo.
echo Waiting for server to initialize...
timeout /t 10 /nobreak > NUL

echo.
echo Opening Localhost in default browser...
start http://localhost:8080

echo.
echo Finding Network IP Address...
set "IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    set "IP=%%a"
    goto :found_ip
)
:found_ip
if not "!IP!"=="" (
    set "IP=!IP: =!"
    echo Opening Network URL: http://!IP!:8080
    start http://!IP!:8080
) else (
    echo Could not determine Network IP.
)

echo.
echo =========================================
echo Server is running in a separate window.
echo Keep the server window open to use the app.
echo =========================================
pause
