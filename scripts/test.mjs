import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
  ['cargo', ['test', '--manifest-path', 'backend/Cargo.toml']],
  ['cargo', ['test', '--manifest-path', 'src-tauri/Cargo.toml']],
  ['npm', ['--workspace', 'frontend', 'run', 'build']]
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
