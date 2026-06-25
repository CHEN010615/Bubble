import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const processes = [
  {
    name: 'backend',
    command: 'cargo',
    args: ['run', '--manifest-path', 'backend/Cargo.toml']
  },
  {
    name: 'frontend',
    command: 'npm',
    args: ['--workspace', 'frontend', 'run', 'dev']
  }
];

let shuttingDown = false;
const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: process.platform === 'win32'
  });

  child.stdout.on('data', (chunk) => writeLines(name, chunk));
  child.stderr.on('data', (chunk) => writeLines(name, chunk));
  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    stopChildren();

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });

  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`);
    if (!shuttingDown) {
      shuttingDown = true;
      stopChildren();
      process.exit(1);
    }
  });

  return child;
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopChildren(signal);
}

function stopChildren(signal = 'SIGTERM') {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function writeLines(name, chunk) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (line.length > 0) {
      console.log(`[${name}] ${line}`);
    }
  }
}

