# CNR (Clear `node_modules` Recursively)

[en](./README.md) | [ko](./README_ko.md)

![The heaviest object in the universe; node_modules](./the_object_node_modules.png)

재귀적으로 node_modules 디렉토리를 찾아 삭제하는 유틸리티입니다. 디스크 공간을 확보하고 개발 환경을 정리하는 데 유용합니다.

## 설치

```bash
# 글로벌 설치
npm install -g @9vvin/cnr

# 또는 npx로 실행 (설치 없이)
npx @9vvin/cnr
```

## 사용 방법

### 명령줄에서 사용

다양한 방법으로 사용할 수 있습니다:

#### Node.js 스크립트 (cnr.js)

```bash
# 현재 디렉토리에서 실행
node cnr.js

# 특정 디렉토리 지정
node cnr.js /path/to/directory
```

#### Bash 쉘 스크립트 (cnr.sh) - macOS/Linux

```bash
# 실행 권한 부여
chmod +x cnr.sh

# 현재 디렉토리에서 실행
./cnr.sh

# 특정 디렉토리 지정
./cnr.sh /path/to/directory
```

#### PowerShell 스크립트 (cnr.ps1) - Windows

```powershell
# 현재 디렉토리에서 실행
.\cnr.ps1

# 특정 디렉토리 지정
.\cnr.ps1 -RootPath C:\path\to\directory
```

#### Windows 배치 스크립트 (cnr.cmd)

```cmd
# 현재 디렉토리에서 실행
cnr

# 특정 디렉토리 지정
cnr C:\path\to\directory
```

### npm 패키지로 사용

패키지를 설치한 후 사용할 수 있습니다:

```bash
# 글로벌 설치 후 실행
npm install -g @9vvin/cnr
cnr [directory]

# npx로 실행 (설치 없이)
npx @9vvin/cnr [directory]
```

## 기능

- 재귀적으로 node_modules 디렉토리 검색
- 각 디렉토리의 크기 계산 및 표시
- 삭제된 디렉토리와 확보된 공간 통계 제공
- 다양한 플랫폼 지원 (Windows, macOS, Linux)
- 다양한 스크립트 지원 (Node.js, Bash, PowerShell, Windows 배치)

## 개발

```bash
# 저장소 클론
git clone https://github.com/im-9vvin/clear-node-modules-recursively.git
cd clear-node-modules-recursively

# 의존성 설치
npm install

# 로컬에서 테스트
node cnr.js
```

## 라이선스

MIT

## 기여

이슈 및 풀 리퀘스트는 환영합니다. 큰 변경사항이 있는 경우 먼저 이슈를 열어 논의해주세요.

## 제작자

- [@im-9vvin](https://github.com/im-9vvin)
