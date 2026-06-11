const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;

// 自动检测便携 Node.js 并加入 PATH
const PORTABLE_NODE = path.join(
  process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp',
  'node-v22.14.0-win-x64',
);
if (fs.existsSync(PORTABLE_NODE)) {
  process.env.PATH = PORTABLE_NODE + path.delimiter + (process.env.PATH || '');
  console.log('🔧 Portable Node detected, added to PATH\n');
}

console.log('🚀 Starting MC Mod Hub...\n');

// 清理占用端口 3000 的残留进程
const { execSync } = require('child_process');
try {
  const output = execSync('netstat -ano | findstr :3000', { encoding: 'utf8' });
  const pids = [...new Set(output.match(/LISTENING\s+(\d+)/g)?.map((s) => s.replace('LISTENING', '').trim()) || [])];
  if (pids.length > 0) {
    console.log(`🧹 Cleaning up port 3000 (PID: ${pids.join(', ')})`);
    pids.forEach((pid) => {
      try { execSync(`taskkill /PID ${pid} /F 2>nul`); } catch {}
    });
  }
} catch {
  // 端口空闲，无需清理
}

// 启动 Next.js dev server
const devServer = spawn('npm', ['run', 'dev'], {
  cwd: ROOT,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let ready = false;

devServer.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);

  // 检测到 Ready 后启动 Electron
  if (!ready && text.includes('Ready in')) {
    ready = true;
    console.log('🟢 Next.js ready, launching Electron...\n');

    const electron = spawn('npm', ['run', 'electron:dev'], {
      cwd: ROOT,
      shell: true,
      stdio: 'inherit',
    });

    electron.on('close', (code) => {
      console.log(`\n👋 Electron closed (exit ${code || 0})`);
      devServer.kill();
      process.exit(code || 0);
    });
  }
});

devServer.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Ctrl+C 优雅退出
process.on('SIGINT', () => {
  devServer.kill();
  process.exit(0);
});
