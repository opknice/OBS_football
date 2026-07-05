@echo off
echo ========================================
echo Python 3.12 Installer for OBS Studio
echo (OBS supports Python 3.6 - 3.12 only)
echo ========================================
echo.

set PYTHON_URL=https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe
set INSTALLER_PATH=%TEMP%\python-3.12.8-installer.exe

echo Downloading Python 3.12.8 (64-bit)...
curl -L -o "%INSTALLER_PATH%" "%PYTHON_URL%"

if not exist "%INSTALLER_PATH%" (
    echo ERROR: Download failed!
    echo Please download manually from:
    echo https://www.python.org/downloads/release/python-3128/
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installing Python 3.12.8 for ALL USERS...
echo This requires administrator privileges.
echo ========================================
echo.

REM ติดตั้งแบบ silent สำหรับ all users
"%INSTALLER_PATH%" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0 TargetDir=C:\Python312

echo.
echo Waiting for installation to complete...
timeout /t 30 /nobreak

echo.
echo Installing obsws-python...
C:\Python312\python.exe -m pip install --upgrade pip
C:\Python312\python.exe -m pip install obsws-python

echo.
echo ========================================
echo Installation complete!
echo.
echo Python Version: 3.12.8
echo Python Path for OBS: C:\Python312
echo.
echo Next steps:
echo 1. Restart OBS completely
echo 2. Tools ^> Scripts ^> Python Settings
echo 3. Set path to: C:\Python312
echo 4. You should see "Python 3.12.8 64bit"
echo ========================================
pause
