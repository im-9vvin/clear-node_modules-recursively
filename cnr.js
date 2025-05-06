#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));

// 검색할 디렉토리
const rootDir = process.argv[2] || process.cwd();

console.log(`다음 위치에서 node_modules 검색 중: ${rootDir}`);

// node_modules를 재귀적으로 검색하고 삭제하는 함수
async function findAndRemoveNodeModules(dir) {
  let totalRemoved = 0;
  let totalSize = 0;

  async function scan(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') {
          try {
            // 삭제 전 크기 확인
            const stats = await getDirectorySize(fullPath);
            totalSize += stats.size;

            // 디렉토리 삭제
            await rimraf(fullPath);
            totalRemoved++;
            console.log(`삭제됨: ${fullPath} (${formatSize(stats.size)})`);
          } catch (err) {
            console.error(`${fullPath} 삭제 중 오류:`, err);
          }
        } else {
          // .git 및 유사한 디렉토리 제외
          if (!entry.name.startsWith('.')) {
            await scan(fullPath);
          }
        }
      }
    }
  }

  await scan(dir);
  return { totalRemoved, totalSize };
}

// 디렉토리 크기를 가져오는 헬퍼 함수
async function getDirectorySize(directory) {
  let size = 0;
  let fileCount = 0;

  async function scanSize(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanSize(fullPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          size += stats.size;
          fileCount++;
        }
      }
    } catch (err) {
      // 권한 오류 또는 기타 문제 무시
    }
  }

  await scanSize(directory);
  return { size, fileCount };
}

// 바이트를 읽기 쉬운 크기로 변환
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// 정리 프로세스 시작
findAndRemoveNodeModules(rootDir)
  .then(({ totalRemoved, totalSize }) => {
    console.log(`\n정리 완료!`);
    console.log(`총 삭제된 node_modules 디렉토리: ${totalRemoved}개`);
    console.log(`총 확보된 공간: ${formatSize(totalSize)}`);
  })
  .catch((err) => {
    console.error('오류 발생:', err);
  });
