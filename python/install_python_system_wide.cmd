@echo off
echo ========================================
echo Python 3.14 System-wide Installer for OBS
echo ========================================
echo.

set PYTHON_URL=https://www.python.org/ftp/python/3.14.6/python-3.14.6-amd64.exe
set INSTALLER_PATH=%TEMP%\python-3.14.6-installer.exe

echo Downloading Python 3.14.6 (64-bit)...
curl -L -o "%INSTALLER_PATH%" "%PYTHON_URL%"

if not exist "%INSTALLER_PATH%" (
    echo ERROR: Download failed!
    pause
    exit /b 1
)

echo.
echo Installing Python for ALL USERS...
echo This requires administrator privileges.
echo.

REM ติดตั้งแบบ silent สำหรับ all users
"%INSTALLER_PATH%" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0 TargetDir=C:\Python314

echo.
echo Waiting for installation to complete...
timeout /t 30 /nobreak

echo.
echo Installing obsws-python...
C:\Python314\python.exe -m pip install --upgrade pip
C:\Python314\python.exe -m pip install obsws-python

echo.
echo ========================================
echo Installation complete!
echo.
echo Python Path for OBS: C:\Python314
echo.
echo Next steps:
echo 1. Restart OBS
echo 2. Tools ^> Scripts ^> Python Settings
echo 3. Set path to: C:\Python314
echo ========================================
pause
