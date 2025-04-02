@echo off
cls
color f0
title Sorry!
echo Starting Sorry
:a
node --stack-size=1200 sorry.js
cls
echo Unexpected crash, rebooting server
goto a