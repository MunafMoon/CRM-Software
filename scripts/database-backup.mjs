import { spawn } from 'node:child_process';
import { mkdir, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(resolve(root, '.backups'), { recursive: true });
const target = resolve(
  root,
  '.backups',
  `folio-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`,
);
const file = await open(target, 'wx', 0o600);
try {
  const child = spawn(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'db',
      'sh',
      '-c',
      'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner',
    ],
    { cwd: root, stdio: ['ignore', file.fd, 'inherit'] },
  );
  await new Promise((res, rej) => {
    child.on('error', rej);
    child.on('close', (code) =>
      code === 0
        ? res()
        : rej(
            new Error(
              `pg_dump failed (${code}); do not use this incomplete backup`,
            ),
          ),
    );
  });
  console.log(`Backup created: ${target}`);
} finally {
  await file.close();
}
