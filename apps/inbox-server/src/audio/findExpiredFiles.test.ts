import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, test } from 'bun:test';

import findExpiredFiles from './findExpiredFiles';

describe('findExpiredFiles', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const created: string[] = [];

  afterAll(async () => {
    await Promise.all(
      created.map((dir) => rm(dir, { recursive: true, force: true }))
    );
  });

  test('lists only files older than the maximum age, also in subfolders', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'expired-'));
    created.push(dir);
    await mkdir(join(dir, 'session'));
    const old = join(dir, 'session', 'old.opus');
    const fresh = join(dir, 'session', 'fresh.opus');
    await writeFile(old, '');
    await writeFile(fresh, '');
    await utimes(old, now, new Date('2026-11-12T11:00:00Z'));
    await utimes(fresh, now, new Date('2026-11-13T13:00:00Z'));

    expect(await findExpiredFiles({ dir, maxAgeDays: 7, now })).toEqual([old]);
  });

  test('gives an empty list for a missing folder', async () => {
    expect(
      await findExpiredFiles({
        dir: join(tmpdir(), 'no-such-folder-for-test'),
        maxAgeDays: 7,
        now
      })
    ).toEqual([]);
  });
});
