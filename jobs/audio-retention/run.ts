import { $ } from 'bun';

console.log((await $`pnpm -s audio:clean`.text()).trim());
