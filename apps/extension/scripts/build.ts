import { copyFile } from 'node:fs/promises';

import env from './env';
import loadIntoDia from './loadIntoDia';

const result = await Bun.build({
  entrypoints: ['src/content.ts', 'src/background.ts'],
  outdir: 'dist',
  format: 'iife',
  define: {
    'process.env.INBOX_URL': JSON.stringify(
      `http://127.0.0.1:${env.INBOX_PORT}/events`
    ),
    'process.env.INBOX_TOKEN': JSON.stringify(env.INBOX_TOKEN)
  }
});

if (!result.success) {
  throw new AggregateError(result.logs, 'Extension build failed');
}

await copyFile('manifest.json', 'dist/manifest.json');

try {
  console.log(`Reloaded in Dia: ${await loadIntoDia()}`);
} catch (error) {
  console.warn(`Not reloaded in Dia. ${String(error)}`);
}
