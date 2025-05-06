@echo off
setlocal enabledelayedexpansion

:: node_modules 청소 배치 스크립트
:: 작성자: 동일 프로젝트에서 cnr.js 참조하여 작성

:: 색상 정의
set "CYAN=[36m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "RED=[31m"
set "NC=[0m"

:: 인자 확인 및 기본 디렉토리 설정
if "%~1"=="" (
  set "ROOT_DIR=%CD%"
) else (
  set "ROOT_DIR=%~1"
)

echo %CYAN%다음 위치에서 node_modules 검색 중: !ROOT_DIR!%NC%
echo.

:: 변수 초기화
set "TOTAL_REMOVED=0"
set "TOTAL_SIZE=0"
set "TOTAL_SIZE_FORMATTED=0 B"

:: 시작 시간 기록
set "START_TIME=%time%"
for /f "tokens=1-4 delims=:.," %%a in ("!START_TIME!") do (
  set /a "START_SECONDS=(((%%a*60)+1%%b %% 100)*60+1%%c %% 100)*100+1%%d %% 100"
)

:: 메인 함수 호출
call :FindAndRemoveNodeModules "!ROOT_DIR!"

:: 종료 시간 기록 및 소요 시간 계산
set "END_TIME=%time%"
for /f "tokens=1-4 delims=:.," %%a in ("!END_TIME!") do (
  set /a "END_SECONDS=(((%%a*60)+1%%b %% 100)*60+1%%c %% 100)*100+1%%d %% 100"
)
set /a "DURATION=END_SECONDS-START_SECONDS"
if %DURATION% lss 0 set /a "DURATION+=24*60*60*100"
set /a "DURATION_MINUTES=DURATION/6000"
set /a "DURATION_SECONDS=(DURATION-DURATION_MINUTES*6000)/100"

:: 결과 출력
echo.
echo %GREEN%정리 완료!%NC%
echo %CYAN%총 삭제된 node_modules 디렉토리: !TOTAL_REMOVED!개%NC%
echo %CYAN%총 확보된 공간: !TOTAL_SIZE_FORMATTED!%NC%
echo %CYAN%소요 시간: !DURATION_MINUTES!분 !DURATION_SECONDS!초%NC%

goto :EOF

:: 재귀적으로 node_modules 검색 및 삭제하는 함수
:FindAndRemoveNodeModules
set "DIR=%~1"

:: 디렉토리가 존재하는지 확인
if not exist "!DIR!\*" goto :EOF

:: 디렉토리의 모든 항목 처리
for /f "delims=" %%d in ('dir /b /a:d "!DIR!" 2^>nul') do (
  set "ENTRY=%%d"
  set "FULL_PATH=!DIR!\!ENTRY!"
  
  :: node_modules인 경우 삭제
  if "!ENTRY!"=="node_modules" (
    :: 디렉토리 크기 계산
    call :GetDirectorySize "!FULL_PATH!"
    
    :: 크기 형식화
    call :FormatSize !SIZE!
    
    echo %YELLOW%삭제 중: !FULL_PATH! (!SIZE_FORMATTED!)%NC%
    
    :: 디렉토리 삭제
    rmdir /s /q "!FULL_PATH!" 2>nul
    
    if not exist "!FULL_PATH!" (
      echo %GREEN%삭제됨: !FULL_PATH! (!SIZE_FORMATTED!)%NC%
      set /a "TOTAL_REMOVED+=1"
      set /a "TOTAL_SIZE+=SIZE"
      
      :: 총 크기 형식화
      call :FormatSize !TOTAL_SIZE!
      set "TOTAL_SIZE_FORMATTED=!SIZE_FORMATTED!"
    ) else (
      echo %RED%삭제 실패: !FULL_PATH!%NC%
    )
  ) else (
    :: 숨김 디렉토리가 아닌 경우 재귀 호출
    if not "!ENTRY:~0,1!"=="." (
      call :FindAndRemoveNodeModules "!FULL_PATH!"
    )
  )
)

goto :EOF

:: 디렉토리 크기를 계산하는 함수
:GetDirectorySize
set "TARGET_DIR=%~1"
set "SIZE=0"

:: 간단한 방법으로 디렉토리 크기 계산 (빠르지만 덜 정확할 수 있음)
for /f "tokens=3" %%s in ('dir /s /a /-c "!TARGET_DIR!" 2^>nul ^| findstr /c:"File(s)"') do (
  set "SIZE=%%s"
  :: 쉼표 제거
  set "SIZE=!SIZE:,=!"
)

goto :EOF

:: 바이트를 읽기 쉬운 크기로 변환하는 함수
:FormatSize
set "BYTES=%~1"
set "SIZE=!BYTES!"
set "UNIT_INDEX=0"
set "UNITS=B KB MB GB TB"

:: 단위 변환
for %%u in (!UNITS!) do (
  if !UNIT_INDEX! gtr 0 (
    set /a "SIZE=SIZE/1024"
  )
  
  if !SIZE! lss 1024 (
    :: 소수점 두 자리까지 계산하는 방식은 제한적임
    :: 간단한 방식으로 표시
    for /f "tokens=%UNIT_INDEX% delims= " %%a in ("!UNITS!") do (
      set "SIZE_FORMATTED=!SIZE! %%a"
    )
    goto :FormatSizeExit
  )
  
  set /a "UNIT_INDEX+=1"
)

:: 마지막 단위에 도달했을 때
for /f "tokens=%UNIT_INDEX% delims= " %%a in ("!UNITS!") do (
  set "SIZE_FORMATTED=!SIZE! %%a"
)

:FormatSizeExit
goto :EOF
