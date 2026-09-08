import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
if (!process.argv[2])
  throw new Error('Usage: npm run db:restore-check -- path/to/backup.dump');
const file = await open(resolve(process.argv[2]), 'r');
const database = `folio_restore_check_${randomBytes(8).toString('hex')}`;
if (!/^folio_restore_check_[a-f0-9]{16}$/.test(database))
  throw new Error('Invalid temporary database name');
function run(command, input = 'ignore') {
  return new Promise((res, rej) => {
    const child = spawn(
      'docker',
      ['compose', 'exec', '-T', 'db', 'sh', '-c', command, 'sh', database],
      { cwd: root, stdio: [input, 'inherit', 'inherit'] },
    );
    child.on('error', rej);
    child.on('close', (code) =>
      code === 0
        ? res()
        : rej(new Error(`Restore verification step failed (${code})`)),
    );
  });
}
let created = false;
try {
  await run('createdb -U "$POSTGRES_USER" "$1"');
  created = true;
  await run(
    'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --exit-on-error',
    file.fd,
  );
  await run(
    'psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -c \'SELECT (SELECT count(*) FROM "User") AS users, (SELECT count(*) FROM "Prospect") AS prospects, (SELECT count(*) FROM "Deal") AS deals;\'',
  );
  console.log(
    'Backup restored and queried successfully in an isolated temporary database.',
  );
} finally {
  await file.close();
  if (created) await run('dropdb -U "$POSTGRES_USER" "$1"');
}
