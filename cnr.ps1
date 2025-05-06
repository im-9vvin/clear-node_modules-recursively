# node_modules 폴더 청소 스크립트
param (
    [string]$RootPath = (Get-Location)
)

# 시작 메시지 출력
Write-Host "다음 위치에서 node_modules 검색 중: $RootPath" -ForegroundColor Cyan

# 삭제된 폴더 수와 총 크기를 저장할 변수
$totalRemoved = 0
$totalSize = 0

# 디렉토리 크기를 계산하는 함수
function Get-DirectorySize {
    param (
        [string]$Path
    )
    
    $size = 0
    $fileCount = 0
    
    try {
        # 모든 파일과 하위 디렉토리의 크기 계산
        $items = Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue
        
        foreach ($item in $items) {
            if (!$item.PSIsContainer) {
                $size += $item.Length
                $fileCount++
            }
        }
    }
    catch {
        # 권한 오류나 기타 이슈 무시
        Write-Host "크기 계산 중 오류: $_" -ForegroundColor Yellow
    }
    
    return @{
        Size = $size
        FileCount = $fileCount
    }
}

# 바이트를 사람이 읽기 쉬운 형태로 변환하는 함수
function Format-Size {
    param (
        [int64]$Bytes
    )
    
    $units = @('B', 'KB', 'MB', 'GB', 'TB')
    $size = $Bytes
    $unitIndex = 0
    
    while ($size -ge 1024 -and $unitIndex -lt ($units.Length - 1)) {
        $size /= 1024
        $unitIndex++
    }
    
    return "{0:N2} {1}" -f $size, $units[$unitIndex]
}

# node_modules 폴더를 재귀적으로 찾고 삭제하는 함수
function Find-And-Remove-NodeModules {
    param (
        [string]$Directory
    )
    
    # 현재 디렉토리의 모든 항목 가져오기
    $items = Get-ChildItem -Path $Directory -Force -ErrorAction SilentlyContinue
    
    foreach ($item in $items) {
        # 디렉토리인 경우만 검사
        if ($item.PSIsContainer) {
            $fullPath = $item.FullName
            
            # node_modules 디렉토리인 경우 삭제
            if ($item.Name -eq "node_modules") {
                try {
                    # 삭제 전 디렉토리 크기 계산
                    $stats = Get-DirectorySize -Path $fullPath
                    $script:totalSize += $stats.Size
                    
                    # 삭제 진행
                    $formattedSize = Format-Size -Bytes $stats.Size
                    Write-Host "삭제 중: $fullPath ($formattedSize)" -ForegroundColor Yellow
                    
                    # 디렉토리 삭제 (모든 내용 포함)
                    Remove-Item -Path $fullPath -Recurse -Force
                    $script:totalRemoved++
                    
                    Write-Host "삭제됨: $fullPath ($formattedSize)" -ForegroundColor Green
                }
                catch {
                    Write-Host "삭제 중 오류 발생: $fullPath - $_" -ForegroundColor Red
                }
            }
            else {
                # .으로 시작하는 숨김 디렉토리는 제외 (예: .git, .vscode)
                if (-not $item.Name.StartsWith(".")) {
                    # 재귀적으로 하위 디렉토리 검색
                    Find-And-Remove-NodeModules -Directory $fullPath
                }
            }
        }
    }
}

# 스크립트 실행 시간 측정 시작
$startTime = Get-Date

# 삭제 프로세스 시작
try {
    Find-And-Remove-NodeModules -Directory $RootPath
    
    # 실행 시간 계산
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    # 결과 출력
    Write-Host "`n정리 완료!" -ForegroundColor Green
    Write-Host "총 삭제된 node_modules 디렉토리: $totalRemoved 개" -ForegroundColor Cyan
    Write-Host "총 확보된 공간: $(Format-Size -Bytes $totalSize)" -ForegroundColor Cyan
    Write-Host "소요 시간: $($duration.Minutes)분 $($duration.Seconds)초" -ForegroundColor Cyan
}
catch {
    Write-Host "오류 발생: $_" -ForegroundColor Red
}