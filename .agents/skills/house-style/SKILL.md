---
name: house-style
description: Apply the TypeScript, Bun, Zod, and monorepo conventions of the assistant repository. Use before you write, review, or refactor TypeScript in apps/ or packages/ of this repository, or when you choose names, file placement, or package boundaries here. Do not use it in other repositories. Load the skills of that repository instead.
---

# House Style

These rules apply only to this repository. In another repository, read its
`AGENTS.md` and load its own skills.

## Stack

- pnpm workspaces and Turborepo. Apps live in `apps/`, shared code lives in
  `packages/`.
- Bun runs the apps and the tests. TypeScript is strict with isolated modules
  and no emitted output.
- Zod validates every external boundary.
- Prettier uses single quotes, no trailing commas, two spaces, and 80
  columns.

## Lint enforcement

`pnpm lint` fails on a violation of these rules. The rules live in
`packages/eslint-config` (`base.mjs` and the local plugin in `rules/`).

| Rule                              | Check                                                          |
| --------------------------------- | -------------------------------------------------------------- |
| `assistant/one-function-per-file` | One top-level function in each file. None in a test or script. |
| `assistant/default-export-name`   | The function is the default export, named after the file.      |
| `assistant/no-line-comments`      | No `//` comments.                                              |
| `assistant/file-placement`        | Only `index.ts` and `env.ts` directly in `src/` of an app.     |
| `no-restricted-imports`           | No import from a `scripts/` folder.                            |
| Knip (`knip.json`)                | No unused file, export, or dependency.                         |
| `jsdoc/require-*`                 | TSDoc with `@param` and `@returns` on each exported function.  |
| `no-restricted-syntax`            | No barrel re-exports, classes, return types, or `process.env`. |
| `func-style`, `curly`, `eqeqeq`   | Arrow functions, braces on every `if`, strict equality.        |
| `import/order`, `sort-imports`    | Import groups and order.                                       |

- Do not disable a rule to make lint pass. Change the code.
- A disable comment needs a `/* */` reason above it. The only one now is
  the Bun build define in `apps/extension/src/background.ts`.
- `pnpm lint` runs ESLint in each workspace and Knip on the repository in
  one Turbo run.
  Knip finds a file that nothing imports, an export that nothing uses, and a
  dependency that no file needs. Delete the dead code. Add an entry to
  `knip.json` only for a new entry file.

File kinds:

- A function file has one top-level function. It default-exports that
  function under the name of the file: `readInboxState.ts` has
  `export default readInboxState;`. It can also export types, interfaces,
  and constants by name. It never exports a function by name.
- A schema or constant file has no function. It uses named exports, for
  example `inboxEntrySchema.ts` exports `inboxEntrySchema` and the inferred
  type. A value module can default-export a value named after the file, for
  example `env.ts` exports `env`.
- An entry script (`index.ts`, `build.ts`, a content script, a CLI script)
  has no top-level function. It holds only wiring.
- A test file has no top-level function. Put test helpers inside the
  `describe` callback.

## Naming and exports

- Use PascalCase for types, camelCase for functions and variables, and
  UPPER_SNAKE_CASE for constants.
- Match the filename to its primary export: `readInboxState.ts` exports
  `readInboxState`.
- Write functions as arrows assigned to `const`. Default-export the primary
  function. Use named exports for schemas, inferred types, and shared
  constants.
- Let TypeScript infer return types. Do not add return annotations.
- Keep one top-level function per file. Do not put a private helper below the
  main export. A closure inside the main function is permitted.
- Keep only top-level wiring in an entry script (`index.ts`, `build.ts`, a
  content script, or a CLI script). Put each function in its own file.
- Do not create barrel files.
- Do not use vague names such as `data`, `item`, `handle`, or `process` when
  the context does not make the meaning clear.
- Start an unused parameter with `_`.
- Do not use classes unless an external API requires one.

## Imports and types

- Order imports as built-in, external, internal, then relative. Put a blank
  line between groups. Sort each group alphabetically. ESLint enforces this.
- Use `import type` for imports that only give types.
- Import from a package by its subpath, for example
  `@assistant/protocol/whatsappMessageSchema`.
- Derive types from Zod with `z.infer`. Do not write the same shape twice.
- Do not use `any` or ambient globals.
- Use `interface` for option objects and `type` for unions and inferred data.
- Type a lookup table as `Record<Key, Value>`. Use `as const` with
  `satisfies` to keep literal types.

## Control flow and async work

- Await every promise that has a side effect. Do not leave a floating promise.
- Use guard clauses. Do not nest `if` statements.
- Put braces on every `if`.
- Put a blank line after an `if` block, a loop, or an awaited step, before
  the next independent step.
- Give a threshold or a limit a named constant. Do not use magic numbers.
- Pass configuration in or read it from the Zod-validated `env` module. Do not
  read `process.env` anywhere else.

## Validation and boundaries

- Validate with Zod: HTTP requests, CLI output, files on disk, environment
  variables, and model output.
- Fail fast on invalid data. Do not add a fallback branch for data that must
  be valid.
- Write state files atomically: write a temporary file, then rename it.
- Bind local servers to `127.0.0.1` and require a token.

## File placement

Group code by feature first, then by kind. Lint enforces the first three
rules.

```text
apps/<app>/src/
  index.ts        entry
  env.ts          the Zod-validated environment
  <feature>/      for example inbox/, github/, schedule/
  scripts/        CLI entry scripts
```

- Only `index.ts` and `env.ts` go directly in `src/` of an app. The extension
  permits its entries `background.ts` and `content.ts` there. A package in
  `packages/` exports its files from a flat `src/`.
- A CLI script goes in `src/scripts/` of its app. It has no function. It
  holds only wiring. No file imports from `scripts/`.
- Each CLI script has a command in the root `package.json`, for example
  `pnpm inbox:set-status`. The playbook, the skills, and `scripts/` call the
  command, not the file path.
- A test file stays next to its source file: `name.test.ts`.
- A schema stays in the feature that validates it, as `<name>Schema.ts`. It
  goes to `packages/protocol` only when two or more workspaces import it.
- Add a kind folder (`data/`, `schemas/`) inside a feature only when the
  feature has more than about 8 files.
- A folder name is a noun in camelCase or lowercase. Do not use `utils/`,
  `helpers/`, `common/`, or `misc/`.
- Each workspace that holds TypeScript (also `jobs/`) has `lint` and
  `typecheck` scripts. Add `test` when it has tests. Turbo runs these
  scripts. A new repo-wide check is a task in `turbo.json`, not a shell
  chain in the root `package.json`.
- Build tooling of an app that is not app code, such as the extension build,
  goes in `apps/<app>/scripts/`.

## Extraction

- Extract a function only when one of these conditions is true:
  - Two or more callers use it now.
  - It holds one rule that must not drift between two places.
  - It holds an external boundary, for example a CDP call or a page script.
- Do not extract:
  - A wrapper or a factory with one caller.
  - A helper that loads data that the caller already has.
  - A strategy object with one method. Pass an inline callback.
  - A helper that only removes nesting. Use guard clauses in place.
- Keep the call chain short. A reader must understand one flow in about two
  hops.
- Pass shared state as a parameter, or keep it in one state object. Do not
  read module-level state from another file.
- Put code at the narrowest common scope. Code for one app stays in that app.
  Code for two or more apps goes into a package in `packages/`.
- Keep types next to the code that builds them. Do not make type-only files.
- Build the concrete thing that the task asks for. Do not add options or
  layers for a future caller.

## Refactoring

- Keep the behavior, the side effects, and the public contracts the same.
- Do not add a feature in a refactor commit.
- Make small steps. After each move, check the imports, the exports, and the
  types.
- Keep exported names stable when you split a file.

## Documentation

- Use `/** */` comments only. Do not use `//` comments.
- Write comments on functions only. Do not comment a variable, a constant, a
  property, or a schema field.
- Add TSDoc with `@param` and `@returns` to every exported function.
- Mark a deliberate shortcut with a `Ponytail:` line in the TSDoc. Name the
  limit and the upgrade path.
- Load the `asd-ste100` skill before you write a comment, a document, or a
  commit message.

## Verification

- Add tests only for deterministic helper functions. Put `name.test.ts` next
  to `name.ts` and use `bun:test`.
- Do not add tests only to increase coverage.
- Before you finish, run `pnpm format && pnpm check`. `pnpm check` runs the
  Prettier check, lint, Knip, typecheck, and test in one Turbo run. Report a
  failure. Do not hide it.
- Use Conventional Commits.

## Review checklist

- Zod validates each external boundary.
- Types come from Zod. No shape is written twice.
- Imports follow the order. Type imports use `import type`.
- Functions are arrows with inferred returns and no nested `if` statements.
- Every promise is awaited.
- Each abstraction has a current caller and sits at the narrowest scope.
- Each file has one top-level function. Entry scripts hold only wiring.
- No secret, debug statement, dead code, or `//` comment is left.
