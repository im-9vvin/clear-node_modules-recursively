#!/bin/bash
# node_modules 폴더 청소 스크립트

# 기본 경로 설정 (인자가 없으면 현재 디렉토리 사용)
ROOT_DIR="${1:-$(pwd)}"

# 색상 정의
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # 색상 리셋

# 시작 메시지 출력
echo -e "${CYAN}다음 위치에서 node_modules 검색 중: ${ROOT_DIR}${NC}"

# 삭제된 폴더 수와 총 크기를 저장할 변수
TOTAL_REMOVED=0
TOTAL_SIZE=0

# 디렉토리 크기를 계산하는 함수
get_directory_size() {
    local dir="$1"
    local size=0
    
    if [[ $(uname) == "Darwin" ]]; then
        # macOS
        size=$(du -sk "$dir" 2>/dev/null | cut -f1)
        size=$((size * 1024)) # KB to bytes
    else
        # Linux
        size=$(du -sb "$dir" 2>/dev/null | cut -f1)
    fi
    
    echo "$size"
}

# 바이트를 사람이 읽기 쉬운 형태로 변환하는 함수
format_size() {
    local bytes=$1
    local size=$bytes
    local units=("B" "KB" "MB" "GB" "TB")
    local unit_index=0
    
    while (( size >= 1024 && unit_index < 4 )); do
        size=$(echo "scale=2; $size / 1024" | bc)
        ((unit_index++))
    done
    
    printf "%.2f %s" $size "${units[$unit_index]}"
}

# node_modules 폴더를 재귀적으로 찾고 삭제하는 함수
find_and_remove_node_modules() {
    local dir="$1"
    local entries
    
    # 디렉토리가 존재하는지 확인
    if [[ ! -d "$dir" ]]; then
        return
    fi
    
    # 디렉토리의 모든 항목 확인
    entries=$(ls -A "$dir" 2>/dev/null)
    
    for entry in $entries; do
        # 숨김 디렉토리(.으로 시작) 건너뛰기
        if [[ "$entry" == .* ]]; then
            continue
        fi
        
        local full_path="${dir}/${entry}"
        
        # 디렉토리인 경우만 검사
        if [[ -d "$full_path" ]]; then
            if [[ "$entry" == "node_modules" ]]; then
                # node_modules 디렉토리인 경우 크기 계산 후 삭제
                size=$(get_directory_size "$full_path")
                TOTAL_SIZE=$((TOTAL_SIZE + size))
                
                # 읽기 쉬운 크기 형식으로 변환
                formatted_size=$(format_size $size)
                
                echo -e "${YELLOW}삭제 중: ${full_path} (${formatted_size})${NC}"
                
                # 디렉토리 삭제
                rm -rf "$full_path" 2>/dev/null
                
                if [[ $? -eq 0 ]]; then
                    echo -e "${GREEN}삭제됨: ${full_path} (${formatted_size})${NC}"
                    TOTAL_REMOVED=$((TOTAL_REMOVED + 1))
                else
                    echo -e "${RED}삭제 실패: ${full_path}${NC}"
                fi
            else
                # 다른 디렉토리는 재귀적으로 검색
                find_and_remove_node_modules "$full_path"
            fi
        fi
    done
}

# 스크립트 실행 시간 측정 시작
START_TIME=$(date +%s)

# 삭제 프로세스 시작
find_and_remove_node_modules "$ROOT_DIR"

# 실행 시간 계산
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# 결과 출력
echo -e "\n${GREEN}정리 완료!${NC}"
echo -e "${CYAN}총 삭제된 node_modules 디렉토리: ${TOTAL_REMOVED}개${NC}"
echo -e "${CYAN}총 확보된 공간: $(format_size $TOTAL_SIZE)${NC}"
echo -e "${CYAN}소요 시간: ${MINUTES}분 ${SECONDS}초${NC}"