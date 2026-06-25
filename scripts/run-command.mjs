import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/run-command.mjs <command> [...args]');
  process.exit(1);
}

const child = spawn(command, args, {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});

