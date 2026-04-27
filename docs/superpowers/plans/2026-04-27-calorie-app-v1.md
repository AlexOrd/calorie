# Calorie App v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Local-First mobile-first PWA + Telegram WebApp for daily food-quota tracking, deployed to GitHub Pages, in a single iteration.

**Architecture:** Vite + Svelte 5 (runes) + TypeScript SPA. State lives in `.svelte.ts` modules. Storage abstracted behind a driver interface (Telegram CloudStorage in-Telegram, localforage everywhere else). No backend, no auth, no tests in v1.

**Tech Stack:** Vite, Svelte 5, TypeScript, Tailwind CSS, Melt UI, Lucide, svelte-frappe-charts, motion (Motion One), localforage, vite-plugin-pwa, ESLint flat + Prettier + svelte-check, husky + lint-staged, pnpm.

**Spec:** `docs/superpowers/specs/2026-04-27-calorie-app-design.md` (commit `c508082`).

**Hard rule:** Use **pnpm** for everything — never `npm` or `yarn`. Never commit `package-lock.json`.

**Tests in v1:** None (per spec). Verification at each step uses `pnpm check`, `pnpm lint`, `pnpm build`, and manual browser smoke checks via `pnpm dev`.

**Branch:** Work directly on `master`. Each task ends with a commit; `--no-verify` is forbidden once hooks exist (Task 5).

---

## Phase 1 — Scaffolding & tooling (Tasks 1–6)

### Task 1: Initialize package.json + base dev dependencies

**Files:**

- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

Run: `pnpm init`
Expected: creates `package.json` with default fields.

- [ ] **Step 2: Replace package.json with the v1 shape**

Overwrite `package.json` with:

```json
{
  "name": "calorie",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```gitignore
node_modules
dist
dev-dist
.DS_Store
.vite
*.log
.env
.env.*
!.env.example
```

- [ ] **Step 4: Install Vite + Svelte 5 + TS toolchain**

Run:

```bash
pnpm add -D vite @sveltejs/vite-plugin-svelte svelte typescript svelte-check @tsconfig/svelte
```

Expected: `pnpm-lock.yaml` is created. `svelte` resolves to a 5.x version. No `package-lock.json` exists.

- [ ] **Step 5: Verify**

Run: `cat package.json | grep '"svelte"'`
Expected: `"svelte"` major version 5.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore: initialize pnpm workspace with Vite + Svelte 5 + TS"
```

---

### Task 2: TypeScript + Svelte + Vite configs

**Files:**

- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `svelte.config.js`
- Create: `vite.config.ts`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Create `tsconfig.json`**

```jsonc
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "types": ["svelte", "vite/client"],
    "baseUrl": ".",
    "paths": {
      "$lib/*": ["./src/lib/*"],
      "$state/*": ["./src/state/*"],
      "$types/*": ["./src/types/*"],
    },
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "src/**/*.svelte.ts"],
  "references": [{ "path": "./tsconfig.node.json" }],
}
```

- [ ] **Step 2: Create `tsconfig.node.json`** (for Vite config TS)

```jsonc
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "types": ["node"],
  },
  "include": ["vite.config.ts", "svelte.config.js"],
}
```

- [ ] **Step 3: Create `svelte.config.js`**

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
  },
};
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $state: resolve(__dirname, 'src/state'),
      $types: resolve(__dirname, 'src/types'),
    },
  },
  server: { port: 5173, host: true },
});
```

- [ ] **Step 5: Add Node typings + create `src/vite-env.d.ts`**

```bash
pnpm add -D @types/node
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

- [ ] **Step 6: Commit**

```bash
git add tsconfig.json tsconfig.node.json svelte.config.js vite.config.ts src/vite-env.d.ts package.json pnpm-lock.yaml
git commit -m "chore: add TypeScript, Svelte, and Vite configs"
```

---

### Task 3: Hello-world bootstrap (`index.html`, `main.ts`, `App.svelte`)

**Files:**

- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.svelte`
- Create: `src/app.css`

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f1115" />
    <title>Calorie</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/main.ts`**

```ts
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element in index.html');

mount(App, { target });
```

- [ ] **Step 3: Create `src/App.svelte` (placeholder)**

```svelte
<script lang="ts">
  let greeting = $state('Calorie скоро тут.');
</script>

<main>
  <h1>{greeting}</h1>
</main>

<style>
  main {
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }
</style>
```

- [ ] **Step 4: Create `src/app.css` (placeholder, will be replaced in Task 4)**

```css
:root {
  color-scheme: light dark;
}
body {
  margin: 0;
}
```

- [ ] **Step 5: Verify dev server starts**

Run: `pnpm dev`
Expected: Vite logs `Local: http://localhost:5173/`. Open it; the page shows "Calorie скоро тут." Stop the server with Ctrl-C.

- [ ] **Step 6: Verify type check passes**

Run: `pnpm check`
Expected: `0 errors and 0 warnings`.

- [ ] **Step 7: Commit**

```bash
git add index.html src/
git commit -m "feat: bootstrap Svelte 5 app shell"
```

---

### Task 4: Add Tailwind CSS v4

**Files:**

- Modify: `vite.config.ts`
- Modify: `src/app.css`
- Modify: `src/App.svelte`

- [ ] **Step 1: Install Tailwind v4 + Vite plugin**

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Update `vite.config.ts` to include the Tailwind plugin**

Replace `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $state: resolve(__dirname, 'src/state'),
      $types: resolve(__dirname, 'src/types'),
    },
  },
  server: { port: 5173, host: true },
});
```

- [ ] **Step 3: Replace `src/app.css` with Tailwind imports + Telegram theme variables**

```css
@import 'tailwindcss';

@theme {
  --color-bg: var(--tg-bg, #0f1115);
  --color-fg: var(--tg-fg, #e7e9ee);
  --color-muted: var(--tg-hint, #8a8f99);
  --color-accent: var(--tg-link, #4caf50);
  --color-danger: #ef4444;
  --color-warn: #f59e0b;
  --color-ok: #4caf50;
}

:root {
  color-scheme: light dark;
}

html,
body {
  height: 100%;
}
body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    sans-serif;
}
```

- [ ] **Step 4: Replace `src/App.svelte` to use a Tailwind class for smoke test**

```svelte
<script lang="ts">
  let greeting = $state('Calorie скоро тут.');
</script>

<main class="text-accent p-4 text-2xl">
  <h1>{greeting}</h1>
</main>
```

- [ ] **Step 5: Verify**

Run: `pnpm dev`
Open `http://localhost:5173/`. The heading is green and has padding. Stop the server.

Run: `pnpm check`
Expected: `0 errors and 0 warnings`.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/app.css src/App.svelte package.json pnpm-lock.yaml
git commit -m "feat: add Tailwind CSS v4 with Telegram theme variables"
```

---

### Task 5: Lint, format, and pre-commit hooks

**Files:**

- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `.prettierignore`
- Create: `.editorconfig`
- Create: `.husky/pre-commit`
- Modify: `package.json`

- [ ] **Step 1: Install ESLint + plugins**

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-svelte svelte-eslint-parser eslint-config-prettier globals
```

- [ ] **Step 2: Install Prettier + plugins**

```bash
pnpm add -D prettier prettier-plugin-svelte prettier-plugin-tailwindcss
```

- [ ] **Step 3: Install husky + lint-staged**

```bash
pnpm add -D husky lint-staged
```

- [ ] **Step 4: Create `eslint.config.js`**

```js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';

export default [
  {
    ignores: ['dist', 'dev-dist', 'node_modules', 'pnpm-lock.yaml', 'public/icons'],
  },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        // projectService auto-discovers tsconfigs and traverses project
        // references. allowDefaultProject catches eslint.config.js itself,
        // which isn't a member of any tsconfig.
        projectService: {
          allowDefaultProject: ['*.config.js'],
        },
        extraFileExtensions: ['.svelte'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: ts.parser },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'svelte/no-at-html-tags': 'error',
      'svelte/valid-compile': 'error',
    },
  },
  {
    files: ['vite.config.ts', 'svelte.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Config files sit outside the typed project, so the unsafe-* rules
    // can't reason about them — relax those for *.config.js only.
    files: ['*.config.js'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  prettier,
];
```

- [ ] **Step 5: Create `.prettierrc`**

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte", "prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

- [ ] **Step 6: Create `.prettierignore`**

```
dist
dev-dist
node_modules
pnpm-lock.yaml
public/icons
```

- [ ] **Step 7: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

- [ ] **Step 8: Update `package.json` scripts and add lint-staged config**

Replace the `scripts` block and add `lint-staged`:

```json
{
  "name": "calorie",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,svelte,svelte.ts}": ["eslint --fix", "prettier --write"],
    "*.{js,cjs,mjs,json,jsonc,css,md,yml,yaml,html}": ["prettier --write"]
  }
}
```

- [ ] **Step 9: Initialize husky and create the pre-commit hook**

Run:

```bash
pnpm dlx husky init
```

Replace `.husky/pre-commit` content with:

```sh
pnpm lint-staged
pnpm check
```

Make sure it's executable:

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 10: Format the existing source so the first hook run is clean**

Run: `pnpm format`
Run: `pnpm lint --fix`

- [ ] **Step 11: Verify each command works standalone**

```bash
pnpm lint        # exit 0
pnpm format:check # exit 0
pnpm check       # exit 0
```

- [ ] **Step 12: Verify pre-commit hook runs**

```bash
git add .
git commit -m "chore: add ESLint, Prettier, husky, lint-staged"
```

Expected: hook output shows `lint-staged` running, then `svelte-check` running, then commit succeeds. If any check fails, the commit aborts — fix the underlying issue (do **not** use `--no-verify`).

---

### Task 6: Project directory skeleton

**Files:**

- Create: `src/data/.gitkeep`
- Create: `src/types/.gitkeep`
- Create: `src/lib/.gitkeep`
- Create: `src/lib/storage/.gitkeep`
- Create: `src/state/.gitkeep`
- Create: `src/routes/.gitkeep`
- Create: `src/components/.gitkeep`
- Create: `public/icons/.gitkeep`

- [ ] **Step 1: Create the directory tree**

```bash
mkdir -p src/data src/types src/lib/storage src/state src/routes src/components public/icons
touch src/data/.gitkeep src/types/.gitkeep src/lib/.gitkeep src/lib/storage/.gitkeep src/state/.gitkeep src/routes/.gitkeep src/components/.gitkeep public/icons/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add src/ public/
git commit -m "chore: scaffold project directory skeleton"
```

---

## Phase 2 — Data layer (Tasks 7–10)

### Task 7: TypeScript types

**Files:**

- Create: `src/types/food.ts`
- Create: `src/types/log.ts`
- Create: `src/types/profile.ts`
- Delete: `src/types/.gitkeep`

- [ ] **Step 1: Create `src/types/food.ts`**

```ts
export type CategoryKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface FoodItem {
  name: string;
  max_g: number;
  unit?: string; // defaults to 'г' when absent
}

export interface FoodCategory {
  title: string;
  color: string;
  items: Record<string, FoodItem>;
}

export type FoodDb = Record<CategoryKey, FoodCategory>;

export const CATEGORY_KEYS: readonly CategoryKey[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
] as const;
```

- [ ] **Step 2: Create `src/types/log.ts`**

```ts
import type { CategoryKey } from './food';

export interface LogEntry {
  id: string; // foodDb item id (e.g. "a1")
  cat: CategoryKey;
  pct: number; // 0..N — soft cap, can exceed 100
  ts: number; // Date.now() at creation
}
```

- [ ] **Step 3: Create `src/types/profile.ts`**

```ts
export type Gender = 'male' | 'female';

export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725;

export interface ProfileInput {
  height: number; // cm
  weight: number; // kg
  gender: Gender;
  age: number;
  activity: ActivityLevel;
}

export interface UserProfile extends ProfileInput {
  k_factor: number; // computed; never user-edited directly
  last_updated: string; // ISO timestamp
}
```

- [ ] **Step 4: Remove the placeholder**

```bash
git rm src/types/.gitkeep
```

- [ ] **Step 5: Verify**

Run: `pnpm check`
Expected: `0 errors and 0 warnings`.

- [ ] **Step 6: Commit**

```bash
git add src/types/
git commit -m "feat(types): add FoodDb, LogEntry, and UserProfile types"
```

---

### Task 8: Static food database

**Files:**

- Create: `src/data/foodDb.json`
- Delete: `src/data/.gitkeep`

- [ ] **Step 1: Create `src/data/foodDb.json`**

```json
{
  "A": {
    "title": "Бобові, картопля, крупи",
    "color": "#4CAF50",
    "items": {
      "a1": { "name": "Бобові", "max_g": 80 },
      "a2": { "name": "Картопля", "max_g": 325 },
      "a3": { "name": "Кукурудза свіжа", "max_g": 290 },
      "a4": { "name": "Рис (нешліфований)", "max_g": 75 },
      "a5": { "name": "Будь-яка крупа", "max_g": 75 },
      "a6": { "name": "Цільнозернове борошно", "max_g": 75 },
      "a7": { "name": "Хлібці", "max_g": 75 },
      "a8": { "name": "Цільнозерновий хліб", "max_g": 100 },
      "a9": { "name": "Макарони т.с.", "max_g": 70 },
      "a10": { "name": "Лаваш", "max_g": 100 }
    }
  },
  "B": {
    "title": "М'ясо, риба, яйця",
    "color": "#F44336",
    "items": {
      "b1": { "name": "Телятина", "max_g": 250 },
      "b2": { "name": "Печінка", "max_g": 330 },
      "b3": { "name": "Куряче або індиче філе", "max_g": 390 },
      "b4": { "name": "Риба (до 5% жиру)", "max_g": 390 },
      "b5": { "name": "Риба (від 5% жиру)", "max_g": 250 },
      "b6": { "name": "Яйця", "max_g": 6, "unit": "шт" },
      "b7": { "name": "Морепродукти", "max_g": 430 }
    }
  },
  "C": {
    "title": "Овочі та гриби",
    "color": "#8BC34A",
    "items": {
      "c1": { "name": "Овочі (вкл. зелень/квашені) та гриби", "max_g": 600 }
    }
  },
  "D": {
    "title": "Жири та соуси",
    "color": "#FFC107",
    "items": {
      "d1": { "name": "Олія (рек. лляну)", "max_g": 17 },
      "d2": { "name": "Майонез", "max_g": 25 },
      "d3": { "name": "Авокадо", "max_g": 100 },
      "d4": { "name": "Оливки", "max_g": 140 },
      "d5": { "name": "Гірчиця", "max_g": 120 },
      "d6": { "name": "Кетчуп", "max_g": 80 }
    }
  },
  "E": {
    "title": "Молочні продукти",
    "color": "#03A9F4",
    "items": {
      "e1": { "name": "Сир кисломолочний нежирний (0,2%)", "max_g": 280 },
      "e2": { "name": "Сири м'які, тверді, плавлені", "max_g": 60 },
      "e3": { "name": "Сметана 15%", "max_g": 150 },
      "e4": { "name": "Кефір 1%", "max_g": 510 },
      "e5": { "name": "Несолодкий йогурт 1%", "max_g": 510 },
      "e6": { "name": "Молоко 1%", "max_g": 510 }
    }
  },
  "F": {
    "title": "Фрукти та ягоди",
    "color": "#E91E63",
    "items": {
      "f1": { "name": "Фрукти та ягоди", "max_g": 440 },
      "f2": { "name": "Банани, виноград, хурма", "max_g": 230 }
    }
  },
  "G": {
    "title": "Горіхи та насіння",
    "color": "#795548",
    "items": {
      "g1": { "name": "Будь-які горіхи або насіння", "max_g": 10 }
    }
  },
  "H": {
    "title": "Будь-що (смаколики)",
    "color": "#9C27B0",
    "items": {
      "h1": { "name": "Будь-що (солодощі, снеки, ковбаса тощо)", "max_g": 90 },
      "h2": { "name": "Фрукти", "max_g": 900 },
      "h3": { "name": "Банани", "max_g": 475 }
    }
  }
}
```

- [ ] **Step 2: Remove placeholder**

```bash
git rm src/data/.gitkeep
```

- [ ] **Step 3: Verify**

Run: `pnpm check`
Expected: passes (the JSON shape matches `FoodDb` because of `resolveJsonModule`).

- [ ] **Step 4: Commit**

```bash
git add src/data/foodDb.json
git commit -m "feat(data): add static foodDb with 8 categories from spec"
```

---

### Task 9: Storage adapter — interface + localforage driver

**Files:**

- Create: `src/lib/storage/local.ts`
- Create: `src/lib/storage/index.ts`
- Delete: `src/lib/storage/.gitkeep`, `src/lib/.gitkeep`

- [ ] **Step 1: Install localforage**

```bash
pnpm add localforage
```

- [ ] **Step 2: Create `src/lib/storage/local.ts`**

```ts
import localforage from 'localforage';
import type { StorageDriver } from './index';

localforage.config({
  name: 'calorie',
  storeName: 'state',
  description: 'Calorie local-first store',
});

export class LocalforageDriver implements StorageDriver {
  async save<T>(key: string, value: T): Promise<void> {
    await localforage.setItem(key, JSON.stringify(value));
  }

  async load<T>(key: string, fallback: T): Promise<T> {
    const raw = await localforage.getItem<string>(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  async remove(key: string): Promise<void> {
    await localforage.removeItem(key);
  }

  async keys(): Promise<string[]> {
    return localforage.keys();
  }
}
```

- [ ] **Step 3: Create `src/lib/storage/index.ts` (driver picker)**

```ts
import { LocalforageDriver } from './local';

export interface StorageDriver {
  save<T>(key: string, value: T): Promise<void>;
  load<T>(key: string, fallback: T): Promise<T>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

function pickDriver(): StorageDriver {
  // Telegram driver added in Task 10. For now, always use localforage.
  return new LocalforageDriver();
}

export const storage: StorageDriver = pickDriver();
```

- [ ] **Step 4: Remove placeholders**

```bash
git rm src/lib/storage/.gitkeep src/lib/.gitkeep
```

- [ ] **Step 5: Verify type check**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 6: Smoke test in browser**

Run: `pnpm dev`. Open the page and the browser DevTools console. Run:

```js
const m = await import('/src/lib/storage/index.ts');
await m.storage.save('smoke', { a: 1 });
console.log(await m.storage.load('smoke', null)); // -> { a: 1 }
await m.storage.remove('smoke');
```

Expected: object logged. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ package.json pnpm-lock.yaml
git commit -m "feat(storage): add StorageDriver interface and localforage driver"
```

---

### Task 10: Telegram CloudStorage driver + runtime selection

**Files:**

- Create: `src/lib/storage/telegram.ts`
- Modify: `src/lib/storage/index.ts`

- [ ] **Step 1: Add Telegram WebApp typings (ambient declaration)**

Modify `src/vite-env.d.ts`:

```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />

declare global {
  interface TelegramCloudStorage {
    setItem(key: string, value: string, callback?: (err: Error | null, ok: boolean) => void): void;
    getItem(key: string, callback: (err: Error | null, value: string | null) => void): void;
    removeItem(key: string, callback?: (err: Error | null, ok: boolean) => void): void;
    getKeys(callback: (err: Error | null, keys: string[]) => void): void;
  }

  interface TelegramThemeParams {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  }

  interface TelegramWebApp {
    initData: string;
    ready(): void;
    expand(): void;
    themeParams: TelegramThemeParams;
    CloudStorage: TelegramCloudStorage;
  }

  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export {};
```

- [ ] **Step 2: Create `src/lib/storage/telegram.ts`**

```ts
import type { StorageDriver } from './index';

export class TelegramDriver implements StorageDriver {
  constructor(private readonly cs: TelegramCloudStorage) {}

  save<T>(key: string, value: T): Promise<void> {
    const payload = JSON.stringify(value);
    return new Promise((resolve, reject) => {
      this.cs.setItem(key, payload, (err) => (err ? reject(err) : resolve()));
    });
  }

  load<T>(key: string, fallback: T): Promise<T> {
    return new Promise((resolve, reject) => {
      this.cs.getItem(key, (err, value) => {
        if (err) return reject(err);
        if (value === null || value === undefined || value === '') return resolve(fallback);
        try {
          resolve(JSON.parse(value) as T);
        } catch {
          resolve(fallback);
        }
      });
    });
  }

  remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cs.removeItem(key, (err) => (err ? reject(err) : resolve()));
    });
  }

  keys(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.cs.getKeys((err, keys) => (err ? reject(err) : resolve(keys)));
    });
  }
}
```

- [ ] **Step 3: Replace `src/lib/storage/index.ts` with runtime driver selection**

```ts
import { LocalforageDriver } from './local';
import { TelegramDriver } from './telegram';

export interface StorageDriver {
  save<T>(key: string, value: T): Promise<void>;
  load<T>(key: string, fallback: T): Promise<T>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

function pickDriver(): StorageDriver {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  if (tg && tg.initData && tg.CloudStorage) {
    return new TelegramDriver(tg.CloudStorage);
  }
  return new LocalforageDriver();
}

export const storage: StorageDriver = pickDriver();
```

- [ ] **Step 4: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/telegram.ts src/lib/storage/index.ts src/vite-env.d.ts
git commit -m "feat(storage): add Telegram CloudStorage driver and runtime selection"
```

---

## Phase 3 — Business logic (Tasks 11–14)

### Task 11: Mifflin-St Jeor scaling math

**Files:**

- Create: `src/lib/scaling.ts`

- [ ] **Step 1: Create `src/lib/scaling.ts`**

```ts
import type { FoodDb } from '$types/food';
import type { ProfileInput } from '$types/profile';

const BASELINE: ProfileInput = {
  height: 168,
  weight: 74,
  gender: 'female',
  age: 30,
  activity: 1.2,
};

const K_MIN = 0.6;
const K_MAX = 1.6;

function bmr(p: ProfileInput): number {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  return p.gender === 'male' ? base + 5 : base - 161;
}

function tdee(p: ProfileInput): number {
  return bmr(p) * p.activity;
}

export function computeKFactor(p: ProfileInput): number {
  const ratio = tdee(p) / tdee(BASELINE);
  const clamped = Math.max(K_MIN, Math.min(K_MAX, ratio));
  return Math.round(clamped * 100) / 100;
}

export function scaleFoodDb(db: FoodDb, k: number): FoodDb {
  if (k === 1.0) return db;
  const out = structuredClone(db);
  for (const cat of Object.values(out)) {
    for (const item of Object.values(cat.items)) {
      // Pieces (e.g. eggs) are not scaled by body size.
      if ((item.unit ?? 'г') === 'г') {
        item.max_g = Math.round(item.max_g * k);
      }
    }
  }
  return out;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 3: Sanity-check the math in a Node REPL**

Run:

```bash
node --input-type=module -e "
import('./src/lib/scaling.ts').then(({ computeKFactor }) => {
  // Baseline → exactly 1.0
  console.log(computeKFactor({ height: 168, weight: 74, gender: 'female', age: 30, activity: 1.2 }));
  // Bigger user → > 1
  console.log(computeKFactor({ height: 185, weight: 90, gender: 'male', age: 28, activity: 1.55 }));
  // Smaller user → < 1
  console.log(computeKFactor({ height: 155, weight: 50, gender: 'female', age: 45, activity: 1.2 }));
}).catch(e => { console.error(e); process.exit(1); });
"
```

(If TS-on-the-fly fails in your local Node, skip — `pnpm check` is the authoritative gate.)

Expected: 1.0, > 1.2, < 0.9.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scaling.ts
git commit -m "feat(scaling): add Mifflin-St Jeor TDEE-based k-factor and scaleFoodDb"
```

---

### Task 12: Date and debounce helpers

**Files:**

- Create: `src/lib/date.ts`
- Create: `src/lib/debounce.ts`

- [ ] **Step 1: Create `src/lib/date.ts`**

```ts
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

export function startOfWeek(key: string): string {
  // ISO week starting Monday.
  const d = dateFromKey(key);
  const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - dow);
  return todayKey(d);
}

export function rangeDays(fromKey: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(addDays(fromKey, i));
  return out;
}

export function isLogKey(key: string): boolean {
  return /^log_\d{4}-\d{2}-\d{2}$/.test(key);
}

export function dateFromLogKey(key: string): string | null {
  const m = key.match(/^log_(\d{4}-\d{2}-\d{2})$/);
  return m && m[1] ? m[1] : null;
}
```

- [ ] **Step 2: Create `src/lib/debounce.ts`**

```ts
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = undefined;
      fn(...args);
    }, ms);
  };
}
```

- [ ] **Step 3: Verify**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/date.ts src/lib/debounce.ts
git commit -m "feat(lib): add date helpers and debounce utility"
```

---

### Task 13: State modules — profile + activeDate + dailyLog

**Files:**

- Create: `src/state/profile.svelte.ts`
- Create: `src/state/activeDate.svelte.ts`
- Create: `src/state/dailyLog.svelte.ts`
- Delete: `src/state/.gitkeep`

- [ ] **Step 1: Create `src/state/profile.svelte.ts`**

```ts
import { storage } from '$lib/storage';
import { computeKFactor } from '$lib/scaling';
import type { ProfileInput, UserProfile } from '$types/profile';

const KEY = 'user_profile';

let _profile = $state<UserProfile | null>(null);
let _loaded = $state(false);

export const profile = {
  get value(): UserProfile | null {
    return _profile;
  },
  get loaded(): boolean {
    return _loaded;
  },
  get hasProfile(): boolean {
    return _profile !== null;
  },

  async load(): Promise<void> {
    _profile = await storage.load<UserProfile | null>(KEY, null);
    _loaded = true;
  },

  async save(input: ProfileInput): Promise<void> {
    const k_factor = computeKFactor(input);
    const next: UserProfile = {
      ...input,
      k_factor,
      last_updated: new Date().toISOString(),
    };
    _profile = next;
    await storage.save(KEY, next);
  },

  async clear(): Promise<void> {
    _profile = null;
    await storage.remove(KEY);
  },
};
```

- [ ] **Step 2: Create `src/state/activeDate.svelte.ts`**

```ts
import { todayKey } from '$lib/date';

let _date = $state<string>(todayKey());

export const activeDate = {
  get value(): string {
    return _date;
  },
  set(date: string): void {
    _date = date;
  },
};
```

- [ ] **Step 3: Create `src/state/dailyLog.svelte.ts`**

```ts
import { storage } from '$lib/storage';
import { debounce } from '$lib/debounce';
import type { CategoryKey } from '$types/food';
import { CATEGORY_KEYS } from '$types/food';
import type { LogEntry } from '$types/log';

const QUOTA_BYTES = 3800; // soft warning threshold; Telegram caps at 4096

let _entries = $state<LogEntry[]>([]);
let _date = $state<string>('');
let _quotaWarning = $state(false);

const persist = debounce(() => {
  void storage.save(`log_${_date}`, _entries);
}, 500);

function checkQuota(): void {
  _quotaWarning = JSON.stringify(_entries).length > QUOTA_BYTES;
}

export const dailyLog = {
  get entries(): LogEntry[] {
    return _entries;
  },
  get date(): string {
    return _date;
  },
  get quotaWarning(): boolean {
    return _quotaWarning;
  },

  async load(date: string): Promise<void> {
    _date = date;
    _entries = await storage.load<LogEntry[]>(`log_${date}`, []);
    checkQuota();
  },

  add(entry: Omit<LogEntry, 'ts'>): void {
    _entries = [..._entries, { ...entry, ts: Date.now() }];
    checkQuota();
    persist();
  },

  remove(ts: number): void {
    _entries = _entries.filter((e) => e.ts !== ts);
    checkQuota();
    persist();
  },
};

export const categoryConsumed = $derived.by<Record<CategoryKey, number>>(() => {
  const sums: Record<CategoryKey, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
    G: 0,
    H: 0,
  };
  for (const e of dailyLog.entries) sums[e.cat] += e.pct;
  return sums;
});

export { CATEGORY_KEYS };
```

- [ ] **Step 4: Remove placeholder**

```bash
git rm src/state/.gitkeep
```

- [ ] **Step 5: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/state/
git commit -m "feat(state): add profile, activeDate, and dailyLog rune modules"
```

---

### Task 14: personalizedDb derived module

**Files:**

- Create: `src/state/personalizedDb.svelte.ts`

- [ ] **Step 1: Create `src/state/personalizedDb.svelte.ts`**

```ts
import baseFoodDb from '../data/foodDb.json';
import { profile } from './profile.svelte';
import { scaleFoodDb } from '$lib/scaling';
import type { FoodDb } from '$types/food';

const BASE = baseFoodDb as FoodDb;

export const personalizedDb = $derived.by<FoodDb>(() => {
  const k = profile.value?.k_factor ?? 1.0;
  return scaleFoodDb(BASE, k);
});
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/state/personalizedDb.svelte.ts
git commit -m "feat(state): add personalizedDb derived module (scales foodDb by k-factor)"
```

---

## Phase 4 — Animations & shell (Tasks 15–18)

### Task 15: Motion One animation helpers

**Files:**

- Create: `src/lib/anim.ts`

- [ ] **Step 1: Install `motion`**

```bash
pnpm add motion
```

- [ ] **Step 2: Create `src/lib/anim.ts`**

```ts
import { animate } from 'motion';

export function pulseSuccess(el: HTMLElement): void {
  void animate(
    el,
    { transform: ['scale(1)', 'scale(1.04)', 'scale(1)'] },
    { duration: 0.35, easing: 'ease-out' },
  );
}

export function pulseWarning(el: HTMLElement): void {
  void animate(
    el,
    {
      transform: ['scale(1)', 'scale(1.03)', 'scale(1)'],
      boxShadow: [
        '0 0 0 0 rgba(239,68,68,0)',
        '0 0 0 6px rgba(239,68,68,0.35)',
        '0 0 0 0 rgba(239,68,68,0)',
      ],
    },
    { duration: 0.5, easing: 'ease-out' },
  );
}

export function celebrate(el: HTMLElement): void {
  void animate(
    el,
    {
      transform: ['scale(1)', 'scale(1.06)', 'scale(1)'],
      boxShadow: [
        '0 0 0 0 rgba(76,175,80,0)',
        '0 0 0 12px rgba(76,175,80,0.35)',
        '0 0 0 0 rgba(76,175,80,0)',
      ],
    },
    { duration: 0.7, easing: 'ease-out' },
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/anim.ts package.json pnpm-lock.yaml
git commit -m "feat(anim): add Motion One helpers (pulseSuccess, pulseWarning, celebrate)"
```

---

### Task 16: Bottom + side navigation components

**Files:**

- Create: `src/components/BottomNav.svelte`
- Create: `src/components/SideNav.svelte`
- Create: `src/lib/nav.ts`
- Delete: `src/components/.gitkeep`

- [ ] **Step 1: Install Lucide for Svelte**

```bash
pnpm add @lucide/svelte
```

- [ ] **Step 2: Create `src/lib/nav.ts`** (shared item list)

```ts
import { LayoutDashboard, NotebookPen, BarChart3, type Icon as LucideIcon } from '@lucide/svelte';

export type TabKey = 'dashboard' | 'journal' | 'stats';

export interface NavItem {
  key: TabKey;
  label: string;
  icon: typeof LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Раціон', icon: LayoutDashboard },
  { key: 'journal', label: 'Журнал', icon: NotebookPen },
  { key: 'stats', label: 'Статистика', icon: BarChart3 },
] as const;
```

- [ ] **Step 3: Create `src/components/BottomNav.svelte`**

```svelte
<script lang="ts">
  import { NAV_ITEMS, type TabKey } from '$lib/nav';

  let { current = $bindable<TabKey>() } = $props<{ current: TabKey }>();
</script>

<nav
  class="bg-bg fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 md:hidden"
  aria-label="Головна навігація"
>
  {#each NAV_ITEMS as item (item.key)}
    {@const Icon = item.icon}
    <button
      type="button"
      class={[
        'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
        current === item.key ? 'text-accent' : 'text-muted',
      ]}
      aria-current={current === item.key ? 'page' : undefined}
      onclick={() => (current = item.key)}
    >
      <Icon size={22} />
      {item.label}
    </button>
  {/each}
</nav>
```

- [ ] **Step 4: Create `src/components/SideNav.svelte`**

```svelte
<script lang="ts">
  import { NAV_ITEMS, type TabKey } from '$lib/nav';

  let { current = $bindable<TabKey>() } = $props<{ current: TabKey }>();
</script>

<nav
  class="hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-white/10 p-4 md:flex"
  aria-label="Головна навігація"
>
  <h1 class="text-accent mb-4 px-2 text-lg font-semibold">Calorie</h1>
  {#each NAV_ITEMS as item (item.key)}
    {@const Icon = item.icon}
    <button
      type="button"
      class={[
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        current === item.key ? 'text-fg bg-white/5' : 'text-muted hover:bg-white/5',
      ]}
      aria-current={current === item.key ? 'page' : undefined}
      onclick={() => (current = item.key)}
    >
      <Icon size={18} />
      {item.label}
    </button>
  {/each}
</nav>
```

- [ ] **Step 5: Remove placeholder**

```bash
git rm src/components/.gitkeep
```

- [ ] **Step 6: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/BottomNav.svelte src/components/SideNav.svelte src/lib/nav.ts package.json pnpm-lock.yaml
git commit -m "feat(nav): add responsive BottomNav + SideNav with shared NAV_ITEMS"
```

---

### Task 17: DateStrip component

**Files:**

- Create: `src/components/DateStrip.svelte`

- [ ] **Step 1: Create `src/components/DateStrip.svelte`**

```svelte
<script lang="ts">
  import { activeDate } from '$state/activeDate.svelte';
  import { addDays, dateFromKey, todayKey } from '$lib/date';

  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

  let anchor = $state(activeDate.value);

  // Build a 7-day strip centered on `anchor`.
  let days = $derived(Array.from({ length: 7 }, (_, i) => addDays(anchor, i - 3)));

  function shift(days: number): void {
    anchor = addDays(anchor, days);
  }

  function dayLabel(key: string): string {
    const d = dateFromKey(key);
    const dow = (d.getDay() + 6) % 7;
    return WEEKDAYS[dow] ?? '';
  }

  function dayNum(key: string): number {
    return dateFromKey(key).getDate();
  }

  const today = todayKey();
</script>

<div class="flex items-center gap-1 border-b border-white/10 px-2 py-2 md:px-4">
  <button
    type="button"
    class="text-muted rounded px-2 py-1 text-sm hover:bg-white/5"
    onclick={() => shift(-7)}
    aria-label="Попередній тиждень"
  >
    ‹
  </button>

  <div class="flex flex-1 justify-between">
    {#each days as key (key)}
      <button
        type="button"
        class={[
          'flex flex-col items-center rounded-md px-2 py-1 text-xs',
          activeDate.value === key
            ? 'bg-accent text-white'
            : key === today
              ? 'text-fg font-bold'
              : 'text-muted',
        ]}
        onclick={() => activeDate.set(key)}
      >
        <span>{dayLabel(key)}</span>
        <span class="text-base font-semibold">{dayNum(key)}</span>
      </button>
    {/each}
  </div>

  <button
    type="button"
    class="text-muted rounded px-2 py-1 text-sm hover:bg-white/5"
    onclick={() => shift(7)}
    aria-label="Наступний тиждень"
  >
    ›
  </button>
</div>
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/DateStrip.svelte
git commit -m "feat(ui): add DateStrip component"
```

---

### Task 18: App shell with onboarding gate

**Files:**

- Modify: `src/App.svelte`
- Create: `src/routes/Dashboard.svelte` (placeholder)
- Create: `src/routes/Journal.svelte` (placeholder)
- Create: `src/routes/Stats.svelte` (placeholder)
- Create: `src/routes/Onboarding.svelte` (placeholder)
- Delete: `src/routes/.gitkeep`

- [ ] **Step 1: Create placeholder routes**

`src/routes/Dashboard.svelte`:

```svelte
<section class="p-4"><h2 class="text-xl font-semibold">Раціон</h2></section>
```

`src/routes/Journal.svelte`:

```svelte
<section class="p-4"><h2 class="text-xl font-semibold">Журнал</h2></section>
```

`src/routes/Stats.svelte`:

```svelte
<section class="p-4"><h2 class="text-xl font-semibold">Статистика</h2></section>
```

`src/routes/Onboarding.svelte`:

```svelte
<script lang="ts">
  import { profile } from '$state/profile.svelte';

  async function bootstrap(): Promise<void> {
    // Temporary: save baseline profile so the rest of the shell renders.
    // Replaced by the real wizard in Task 23.
    await profile.save({
      height: 168,
      weight: 74,
      gender: 'female',
      age: 30,
      activity: 1.2,
    });
  }
</script>

<section class="mx-auto max-w-md p-6">
  <h1 class="mb-4 text-2xl font-bold">Calorie</h1>
  <p class="text-muted mb-6">
    Тимчасовий екран онбордингу. Натисніть, щоб створити дефолтний профіль.
  </p>
  <button type="button" class="bg-accent rounded-md px-4 py-2 text-white" onclick={bootstrap}>
    Почати
  </button>
</section>
```

- [ ] **Step 2: Replace `src/App.svelte` with the full shell**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { profile } from '$state/profile.svelte';
  import { activeDate } from '$state/activeDate.svelte';
  import { dailyLog } from '$state/dailyLog.svelte';
  import BottomNav from './components/BottomNav.svelte';
  import SideNav from './components/SideNav.svelte';
  import DateStrip from './components/DateStrip.svelte';
  import Dashboard from './routes/Dashboard.svelte';
  import Journal from './routes/Journal.svelte';
  import Stats from './routes/Stats.svelte';
  import Onboarding from './routes/Onboarding.svelte';
  import type { TabKey } from '$lib/nav';

  let currentTab = $state<TabKey>('dashboard');

  onMount(async () => {
    await profile.load();
    if (profile.hasProfile) {
      await dailyLog.load(activeDate.value);
    }
  });

  // Reload the daily log whenever the active date changes (after onboarding).
  $effect(() => {
    if (!profile.hasProfile) return;
    void dailyLog.load(activeDate.value);
  });
</script>

{#if !profile.loaded}
  <div class="text-muted flex h-screen items-center justify-center">Завантаження…</div>
{:else if !profile.hasProfile}
  <Onboarding />
{:else}
  <div class="flex min-h-screen">
    <SideNav bind:current={currentTab} />
    <div class="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
      <DateStrip />
      <main class="mx-auto w-full max-w-5xl flex-1 px-2 md:px-6">
        <div class:hidden={currentTab !== 'dashboard'}><Dashboard /></div>
        <div class:hidden={currentTab !== 'journal'}><Journal /></div>
        <div class:hidden={currentTab !== 'stats'}><Stats /></div>
      </main>
    </div>
    <BottomNav bind:current={currentTab} />
  </div>
{/if}
```

- [ ] **Step 3: Remove placeholder**

```bash
git rm src/routes/.gitkeep
```

- [ ] **Step 4: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

Run: `pnpm dev`. Open the page:

1. The onboarding placeholder should appear ("Тимчасовий екран онбордингу").
2. Click "Почати" — the shell renders, DateStrip shows the current week, the three tab placeholders are reachable from BottomNav (mobile) or SideNav (desktop ≥768px).
3. Resize the window across 768px — nav swaps location.
4. Open DevTools → Application → IndexedDB → `calorie` → `state` — `user_profile` is persisted.

Stop the server.

- [ ] **Step 5: Commit**

```bash
git add src/App.svelte src/routes/
git commit -m "feat(shell): app skeleton with onboarding gate, tab swap, responsive nav"
```

---

## Phase 5 — Onboarding wizard (Tasks 19–21)

### Task 19: Onboarding step 1 — welcome

**Files:**

- Create: `src/components/onboarding/StepWelcome.svelte`

- [ ] **Step 1: Create directory**

```bash
mkdir -p src/components/onboarding
```

- [ ] **Step 2: Create `src/components/onboarding/StepWelcome.svelte`**

```svelte
<script lang="ts">
  let { onNext } = $props<{ onNext: () => void }>();
</script>

<div class="flex flex-col gap-6 text-center">
  <h1 class="text-accent text-3xl font-bold">Calorie</h1>
  <p class="text-fg">
    Персональний щоденник раціону за категоріями. Дані залишаються на вашому пристрої.
  </p>
  <p class="text-muted text-sm">Спершу — кілька параметрів, щоб налаштувати норми під вас.</p>
  <button
    type="button"
    class="bg-accent mt-4 self-center rounded-md px-6 py-2 text-white"
    onclick={onNext}
  >
    Почати
  </button>
</div>
```

- [ ] **Step 3: Verify**

Run: `pnpm check`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/StepWelcome.svelte
git commit -m "feat(onboarding): add welcome step"
```

---

### Task 20: Onboarding step 2 — measurements

**Files:**

- Create: `src/components/onboarding/StepMeasurements.svelte`

- [ ] **Step 1: Create `src/components/onboarding/StepMeasurements.svelte`**

```svelte
<script lang="ts">
  import type { ProfileInput, ActivityLevel } from '$types/profile';

  let { onSubmit } = $props<{ onSubmit: (input: ProfileInput) => void }>();

  let height = $state(168);
  let weight = $state(74);
  let age = $state(30);
  let gender = $state<'male' | 'female'>('female');
  let activity = $state<ActivityLevel>(1.2);

  const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
    { value: 1.2, label: 'Сидячий' },
    { value: 1.375, label: 'Легка активність' },
    { value: 1.55, label: 'Помірна активність' },
    { value: 1.725, label: 'Висока активність' },
  ];

  let valid = $derived(
    height >= 120 && height <= 230 && weight >= 30 && weight <= 250 && age >= 12 && age <= 100,
  );

  function submit(): void {
    if (!valid) return;
    onSubmit({ height, weight, gender, age, activity });
  }
</script>

<form
  class="flex flex-col gap-5"
  onsubmit={(e) => {
    e.preventDefault();
    submit();
  }}
>
  <h2 class="text-xl font-semibold">Параметри</h2>

  <label class="flex flex-col gap-1 text-sm">
    Зріст, см
    <input
      type="number"
      class="rounded-md border border-white/10 bg-transparent px-3 py-2"
      min="120"
      max="230"
      bind:value={height}
    />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Вага, кг
    <input
      type="number"
      class="rounded-md border border-white/10 bg-transparent px-3 py-2"
      min="30"
      max="250"
      step="0.1"
      bind:value={weight}
    />
  </label>

  <label class="flex flex-col gap-1 text-sm">
    Вік
    <input
      type="number"
      class="rounded-md border border-white/10 bg-transparent px-3 py-2"
      min="12"
      max="100"
      bind:value={age}
    />
  </label>

  <fieldset class="flex flex-col gap-2 text-sm">
    <legend>Стать</legend>
    <div class="flex gap-2">
      <label
        class={[
          'flex flex-1 items-center justify-center rounded-md border border-white/10 px-3 py-2',
          gender === 'female' && 'bg-accent text-white',
        ]}
      >
        <input type="radio" class="sr-only" bind:group={gender} value="female" /> Жін
      </label>
      <label
        class={[
          'flex flex-1 items-center justify-center rounded-md border border-white/10 px-3 py-2',
          gender === 'male' && 'bg-accent text-white',
        ]}
      >
        <input type="radio" class="sr-only" bind:group={gender} value="male" /> Чол
      </label>
    </div>
  </fieldset>

  <fieldset class="flex flex-col gap-2 text-sm">
    <legend>Рівень активності</legend>
    <div class="grid grid-cols-2 gap-2">
      {#each ACTIVITY_OPTIONS as opt (opt.value)}
        <label
          class={[
            'flex items-center justify-center rounded-md border border-white/10 px-3 py-2 text-center',
            activity === opt.value && 'bg-accent text-white',
          ]}
        >
          <input type="radio" class="sr-only" bind:group={activity} value={opt.value} />
          {opt.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <button
    type="submit"
    class="bg-accent mt-4 rounded-md px-4 py-2 text-white disabled:opacity-50"
    disabled={!valid}
  >
    Продовжити
  </button>
</form>
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/StepMeasurements.svelte
git commit -m "feat(onboarding): add measurements step"
```

---

### Task 21: Onboarding step 3 + wire up Onboarding route

**Files:**

- Create: `src/components/onboarding/StepConfirm.svelte`
- Modify: `src/routes/Onboarding.svelte`

- [ ] **Step 1: Create `src/components/onboarding/StepConfirm.svelte`**

```svelte
<script lang="ts">
  import type { ProfileInput } from '$types/profile';
  import { computeKFactor, scaleFoodDb } from '$lib/scaling';
  import baseFoodDb from '../../data/foodDb.json';
  import type { FoodDb } from '$types/food';

  let { input, onConfirm, onBack } = $props<{
    input: ProfileInput;
    onConfirm: () => void;
    onBack: () => void;
  }>();

  const k = $derived(computeKFactor(input));
  const sample = $derived.by(() => {
    const scaled = scaleFoodDb(baseFoodDb as FoodDb, k);
    const item = scaled.A.items.a2; // Картопля
    return item ? `${item.name}: 100% = ${item.max_g} г` : '';
  });
</script>

<div class="flex flex-col gap-5">
  <h2 class="text-xl font-semibold">Готово</h2>
  <p class="text-muted">
    Ваш персональний коефіцієнт:
    <span class="text-accent text-2xl font-bold">{k.toFixed(2)}</span>
  </p>
  <p class="rounded-md border border-white/10 p-3 text-sm">
    Приклад: {sample}
  </p>
  <div class="flex justify-between gap-3">
    <button type="button" class="rounded-md border border-white/10 px-4 py-2" onclick={onBack}>
      Назад
    </button>
    <button
      type="button"
      class="bg-accent flex-1 rounded-md px-4 py-2 text-white"
      onclick={onConfirm}
    >
      Готово
    </button>
  </div>
</div>
```

- [ ] **Step 2: Replace `src/routes/Onboarding.svelte` with the full wizard**

```svelte
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { profile } from '$state/profile.svelte';
  import StepWelcome from '../components/onboarding/StepWelcome.svelte';
  import StepMeasurements from '../components/onboarding/StepMeasurements.svelte';
  import StepConfirm from '../components/onboarding/StepConfirm.svelte';
  import type { ProfileInput } from '$types/profile';

  type Step = 0 | 1 | 2;
  let step = $state<Step>(0);
  let input = $state<ProfileInput | null>(null);

  function next(): void {
    if (step < 2) step = (step + 1) as Step;
  }

  function back(): void {
    if (step > 0) step = (step - 1) as Step;
  }

  function setInput(value: ProfileInput): void {
    input = value;
    next();
  }

  async function confirm(): Promise<void> {
    if (!input) return;
    await profile.save(input);
  }
</script>

<section class="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
  {#if step === 0}
    <div in:fly={{ x: 24, duration: 250 }}>
      <StepWelcome onNext={next} />
    </div>
  {:else if step === 1}
    <div in:fly={{ x: 24, duration: 250 }}>
      <StepMeasurements onSubmit={setInput} />
    </div>
  {:else if step === 2 && input}
    <div in:fly={{ x: 24, duration: 250 }}>
      <StepConfirm {input} onConfirm={confirm} onBack={back} />
    </div>
  {/if}
</section>
```

- [ ] **Step 3: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

Run: `pnpm dev`. Clear `user_profile` from IndexedDB (DevTools → Application → IndexedDB → calorie → state → delete `user_profile`), reload. Walk through Welcome → Measurements → Confirm. Submitting saves the profile and the shell renders the empty Dashboard placeholder.

Stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/StepConfirm.svelte src/routes/Onboarding.svelte
git commit -m "feat(onboarding): wire up 3-step wizard with profile save"
```

---

## Phase 6 — Dashboard, entry sheet, journal (Tasks 22–28)

### Task 22: CategoryCard component

**Files:**

- Create: `src/components/CategoryCard.svelte`

- [ ] **Step 1: Create `src/components/CategoryCard.svelte`**

```svelte
<script lang="ts">
  import { Spring } from 'svelte/motion';
  import { pulseWarning } from '$lib/anim';
  import type { CategoryKey } from '$types/food';

  let { categoryKey, title, color, consumed, onClick } = $props<{
    categoryKey: CategoryKey;
    title: string;
    color: string;
    consumed: number;
    onClick: (key: CategoryKey) => void;
  }>();

  const fill = new Spring(0, { stiffness: 0.15, damping: 0.8 });

  let cardEl = $state<HTMLButtonElement | undefined>(undefined);
  let prevOver = false; // plain variable — read+write inside $effect without a self-trigger

  $effect(() => {
    fill.target = Math.min(consumed, 150);
  });

  $effect(() => {
    const over = consumed > 100;
    if (over && !prevOver && cardEl) {
      pulseWarning(cardEl);
    }
    prevOver = over;
  });

  let displayPct = $derived(fill.current);
  let over = $derived(consumed > 100);
  let remaining = $derived(Math.max(0, 100 - Math.round(consumed)));
  let overshoot = $derived(Math.max(0, Math.round(consumed - 100)));
</script>

<button
  bind:this={cardEl}
  type="button"
  class="flex w-full flex-col items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.05]"
  onclick={() => onClick(categoryKey)}
>
  <div class="flex w-full items-center justify-between">
    <span class="text-base font-semibold">{categoryKey} — {title}</span>
    <span class="text-muted text-xs">
      {#if over}<span class="text-danger">+{overshoot}%</span>
      {:else}{remaining}% залишилось{/if}
    </span>
  </div>

  <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
    <div
      class="h-full rounded-full"
      style="width: {Math.min(displayPct, 100)}%; background: {over
        ? 'var(--color-danger)'
        : color};"
    ></div>
  </div>
</button>
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/CategoryCard.svelte
git commit -m "feat(ui): add CategoryCard with animated progress and warning pulse"
```

---

### Task 23: AmountInput (2-way binding)

**Files:**

- Create: `src/components/AmountInput.svelte`

- [ ] **Step 1: Create `src/components/AmountInput.svelte`**

```svelte
<script lang="ts">
  import type { FoodItem } from '$types/food';

  let { item, pct = $bindable(0) } = $props<{
    item: FoodItem;
    pct: number;
  }>();

  const unit = $derived(item.unit ?? 'г');
  const isPieces = $derived(unit === 'шт');
  const step = $derived(isPieces ? 1 : 5);

  let amount = $state(0);
  let lastEdited = $state<'pct' | 'amount'>('pct');

  $effect(() => {
    if (lastEdited === 'pct') {
      const a = (item.max_g * pct) / 100;
      amount = isPieces ? Math.round(a) : Math.round(a / step) * step;
    }
  });

  $effect(() => {
    if (lastEdited === 'amount' && item.max_g > 0) {
      pct = (amount / item.max_g) * 100;
    }
  });

  function onPctInput(): void {
    lastEdited = 'pct';
  }

  function onAmountInput(): void {
    lastEdited = 'amount';
  }
</script>

<div class="flex flex-col gap-3">
  <input
    type="range"
    min="0"
    max="150"
    step="1"
    bind:value={pct}
    oninput={onPctInput}
    class="w-full"
  />

  <div class="flex items-center gap-2">
    <input
      type="number"
      min="0"
      {step}
      bind:value={amount}
      oninput={onAmountInput}
      class="w-24 rounded-md border border-white/10 bg-transparent px-2 py-1"
    />
    <span class="text-muted text-sm">{unit}</span>
    <span class="ml-auto text-sm tabular-nums">{Math.round(pct)}%</span>
  </div>
</div>
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/AmountInput.svelte
git commit -m "feat(ui): add AmountInput with 2-way percent ↔ grams/pieces binding"
```

---

### Task 24: EntrySheet (Melt UI Dialog, responsive)

**Files:**

- Create: `src/components/EntrySheet.svelte`

- [ ] **Step 1: Install Melt UI**

```bash
pnpm add @melt-ui/svelte
```

- [ ] **Step 2: Create `src/components/EntrySheet.svelte`**

```svelte
<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import { fly, scale } from 'svelte/transition';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import { pulseSuccess } from '$lib/anim';
  import AmountInput from './AmountInput.svelte';
  import type { CategoryKey } from '$types/food';

  let { open = $bindable(false), categoryKey } = $props<{
    open: boolean;
    categoryKey: CategoryKey | null;
  }>();

  const {
    elements: { overlay, content, close, portalled },
    states: { open: meltOpen },
  } = createDialog({ forceVisible: true });

  $effect(() => {
    meltOpen.set(open);
  });

  $effect(() => {
    open = $meltOpen;
  });

  let category = $derived(categoryKey ? personalizedDb()[categoryKey] : null);

  let expandedItem = $state<string | null>(null);
  let pct = $state(0);
  let cardElById = $state<Record<string, HTMLDivElement | undefined>>({});

  function expand(itemId: string): void {
    expandedItem = expandedItem === itemId ? null : itemId;
    pct = 0;
  }

  function commit(itemId: string): void {
    if (!categoryKey || pct <= 0) return;
    dailyLog.add({ id: itemId, cat: categoryKey, pct: Math.round(pct) });
    const el = cardElById[itemId];
    if (el) pulseSuccess(el);
    expandedItem = null;
    open = false;
  }
</script>

{#if $meltOpen && category}
  <div use:melt={$portalled}>
    <div
      use:melt={$overlay}
      class="fixed inset-0 z-40 bg-black/50"
      transition:scale={{ start: 0.98, duration: 150 }}
    ></div>

    <div
      use:melt={$content}
      class="bg-bg fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-auto rounded-t-2xl border-t border-white/10 p-4
             md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border"
      transition:fly={{ y: 80, duration: 250 }}
      role="dialog"
      aria-modal="true"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">{categoryKey} — {category.title}</h2>
        <button type="button" use:melt={$close} class="text-muted" aria-label="Закрити"> ✕ </button>
      </div>

      <ul class="flex flex-col gap-2">
        {#each Object.entries(category.items) as [id, item] (id)}
          <li bind:this={cardElById[id]} class="rounded-md border border-white/10 p-3">
            <button
              type="button"
              class="flex w-full items-center justify-between text-left"
              onclick={() => expand(id)}
            >
              <span>{item.name}</span>
              <span class="text-muted text-xs">
                100% = {item.max_g}
                {item.unit ?? 'г'}
              </span>
            </button>

            {#if expandedItem === id}
              <div class="mt-3 flex flex-col gap-3" transition:fly={{ y: -8, duration: 150 }}>
                <AmountInput {item} bind:pct />
                <button
                  type="button"
                  class="bg-accent self-end rounded-md px-3 py-1 text-sm text-white disabled:opacity-50"
                  disabled={pct <= 0}
                  onclick={() => commit(id)}
                >
                  Додати
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
```

- [ ] **Step 3: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/EntrySheet.svelte package.json pnpm-lock.yaml
git commit -m "feat(ui): add EntrySheet (Melt UI Dialog, responsive bottom sheet ↔ modal)"
```

---

### Task 25: Dashboard route

**Files:**

- Modify: `src/routes/Dashboard.svelte`

- [ ] **Step 1: Replace `src/routes/Dashboard.svelte`**

```svelte
<script lang="ts">
  import { personalizedDb } from '$state/personalizedDb';
  import { categoryConsumed } from '$state/dailyLog.svelte';
  import { CATEGORY_KEYS } from '$types/food';
  import CategoryCard from '../components/CategoryCard.svelte';
  import EntrySheet from '../components/EntrySheet.svelte';
  import type { CategoryKey } from '$types/food';

  let sheetOpen = $state(false);
  let activeCat = $state<CategoryKey | null>(null);

  function openSheet(key: CategoryKey): void {
    activeCat = key;
    sheetOpen = true;
  }
</script>

<section class="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2 md:p-4 lg:grid-cols-4">
  {#each CATEGORY_KEYS as key (key)}
    <CategoryCard
      categoryKey={key}
      title={personalizedDb()[key].title}
      color={personalizedDb()[key].color}
      consumed={categoryConsumed()[key]}
      onClick={openSheet}
    />
  {/each}
</section>

<EntrySheet bind:open={sheetOpen} categoryKey={activeCat} />
```

- [ ] **Step 2: Verify end-to-end**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

Run: `pnpm dev`. Open at any width. Walk through:

1. Onboarding (or skip if already onboarded).
2. Dashboard renders 8 cards. Tap one — sheet opens (bottom on mobile, centered modal on desktop).
3. Tap an item, drag the slider, click "Додати". Card progress animates up; if pct > 100% the card flashes red.

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Dashboard.svelte
git commit -m "feat(ui): wire up Dashboard with CategoryCard grid and EntrySheet"
```

---

### Task 26: JournalRow with responsive delete

**Files:**

- Create: `src/components/JournalRow.svelte`

- [ ] **Step 1: Create `src/components/JournalRow.svelte`**

```svelte
<script lang="ts">
  import { Spring } from 'svelte/motion';
  import { Trash2 } from '@lucide/svelte';
  import type { LogEntry } from '$types/log';
  import type { FoodItem } from '$types/food';

  let { entry, item, onDelete } = $props<{
    entry: LogEntry;
    item: FoodItem;
    onDelete: (ts: number) => void;
  }>();

  const offset = new Spring(0, { stiffness: 0.18, damping: 0.85 });
  let confirming = $state(false);
  let dragging = $state(false);
  let startX = 0;

  const REVEAL = 88;

  function onPointerDown(e: PointerEvent): void {
    if (window.matchMedia('(min-width: 768px)').matches) return; // desktop uses hover button
    dragging = true;
    startX = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragging) return;
    const dx = Math.min(0, Math.max(-REVEAL, e.clientX - startX));
    offset.target = dx;
    offset.set(dx, { hard: true });
  }

  function onPointerUp(e: PointerEvent): void {
    if (!dragging) return;
    dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (offset.current < -REVEAL / 2) {
      offset.target = -REVEAL;
    } else {
      offset.target = 0;
    }
  }

  function unit(): string {
    return item.unit ?? 'г';
  }

  function amount(): number {
    return Math.round((item.max_g * entry.pct) / 100);
  }

  function time(): string {
    const d = new Date(entry.ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function commitDelete(): void {
    onDelete(entry.ts);
  }
</script>

<li class="relative overflow-hidden border-b border-white/5">
  <button
    type="button"
    class="bg-danger absolute inset-y-0 right-0 flex w-[88px] items-center justify-center text-white"
    onclick={commitDelete}
    aria-label="Видалити запис"
  >
    <Trash2 size={18} />
  </button>

  <div
    class="group bg-bg relative flex items-center justify-between px-3 py-3"
    style="transform: translateX({offset.current}px);"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <div class="flex flex-col gap-0.5">
      <span class="text-sm">{item.name}</span>
      <span class="text-muted text-xs">
        {amount()}
        {unit()} · {Math.round(entry.pct)}% · {time()}
      </span>
    </div>

    <!-- Desktop: hover-revealed delete with inline confirm -->
    <div class="hidden items-center gap-2 md:flex">
      {#if confirming}
        <button
          type="button"
          class="bg-danger rounded-md px-2 py-1 text-xs text-white"
          onclick={commitDelete}
        >
          Видалити?
        </button>
        <button type="button" class="text-muted text-xs" onclick={() => (confirming = false)}>
          Ні
        </button>
      {:else}
        <button
          type="button"
          class="text-muted opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          onclick={() => (confirming = true)}
          aria-label="Видалити запис"
        >
          <Trash2 size={16} />
        </button>
      {/if}
    </div>
  </div>
</li>
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/JournalRow.svelte
git commit -m "feat(ui): add JournalRow with mobile swipe + desktop hover delete"
```

---

### Task 27: Journal route

**Files:**

- Modify: `src/routes/Journal.svelte`

- [ ] **Step 1: Replace `src/routes/Journal.svelte`**

```svelte
<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';
  import { dailyLog } from '$state/dailyLog.svelte';
  import { personalizedDb } from '$state/personalizedDb';
  import JournalRow from '../components/JournalRow.svelte';
  import type { CategoryKey, FoodItem } from '$types/food';

  function lookup(catKey: CategoryKey, itemId: string): FoodItem | null {
    return personalizedDb()[catKey]?.items[itemId] ?? null;
  }

  let sorted = $derived([...dailyLog.entries].sort((a, b) => b.ts - a.ts));
</script>

<section class="p-2 md:p-4">
  <h2 class="mb-3 text-xl font-semibold">Журнал</h2>

  {#if sorted.length === 0}
    <p class="text-muted text-sm">Поки що нічого не додано.</p>
  {:else}
    <ul class="flex flex-col rounded-md border border-white/10 bg-white/[0.02]">
      {#each sorted as entry (entry.ts)}
        {@const item = lookup(entry.cat, entry.id)}
        {#if item}
          <div
            animate:flip={{ duration: 200 }}
            in:fly={{ y: 8, duration: 200 }}
            out:fly={{ x: -32, duration: 150 }}
          >
            <JournalRow {entry} {item} onDelete={(ts) => dailyLog.remove(ts)} />
          </div>
        {/if}
      {/each}
    </ul>
  {/if}
</section>
```

- [ ] **Step 2: Verify end-to-end**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

Run: `pnpm dev`. Add a few entries from Dashboard, switch to Journal:

- Entries appear newest-first.
- Mobile (<768px): swipe a row left, tap red delete.
- Desktop (≥768px): hover a row, click trash, confirm.
- Both paths remove the entry; the corresponding category card on Dashboard updates.

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Journal.svelte
git commit -m "feat(ui): wire up Journal route with flip + fly animations"
```

---

## Phase 7 — Stats (Tasks 28–30)

### Task 28: Heatmap component

**Files:**

- Create: `src/components/Heatmap.svelte`

- [ ] **Step 1: Install svelte-frappe-charts**

```bash
pnpm add svelte-frappe-charts
```

- [ ] **Step 2: Create `src/components/Heatmap.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'svelte-frappe-charts';
  import { storage } from '$lib/storage';
  import { dateFromKey, dateFromLogKey, isLogKey } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import type { CategoryKey } from '$types/food';

  type DayVerdict = 0 | 1 | 2 | 3; // 0 = no data, 1 = clean, 2 = some over, 3 = many over

  let dataPoints = $state<Record<string, number>>({});
  let loaded = $state(false);

  function dayVerdict(entries: LogEntry[]): DayVerdict {
    if (entries.length === 0) return 0;
    const sums: Record<CategoryKey, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      E: 0,
      F: 0,
      G: 0,
      H: 0,
    };
    for (const e of entries) sums[e.cat] += e.pct;
    const overCount = Object.values(sums).filter((v) => v > 100).length;
    if (overCount === 0) return 1;
    if (overCount <= 2) return 2;
    return 3;
  }

  onMount(async () => {
    const keys = (await storage.keys()).filter(isLogKey);
    const points: Record<string, number> = {};
    await Promise.all(
      keys.map(async (k) => {
        const date = dateFromLogKey(k);
        if (!date) return;
        const entries = await storage.load<LogEntry[]>(k, []);
        const ts = Math.floor(new Date(date).getTime() / 1000);
        points[String(ts)] = dayVerdict(entries);
      }),
    );
    dataPoints = points;
    loaded = true;
  });

  // svelte-frappe-charts heatmap expects: { dataPoints, start, end }
  let chartData = $derived({
    dataPoints,
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
</script>

<div class="rounded-md border border-white/10 p-3">
  <h3 class="mb-2 text-sm font-semibold">Останні 90 днів</h3>
  {#if loaded}
    <Chart
      type="heatmap"
      data={chartData}
      countLabel="перевищень"
      discreteDomains={1}
      colors={['#1f2937', '#86efac', '#fbbf24', '#ef4444']}
    />
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>
```

- [ ] **Step 3: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/Heatmap.svelte package.json pnpm-lock.yaml
git commit -m "feat(stats): add Heatmap (90-day verdict view via svelte-frappe-charts)"
```

---

### Task 29: CategoryBarChart component

**Files:**

- Create: `src/components/CategoryBarChart.svelte`

- [ ] **Step 1: Create `src/components/CategoryBarChart.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from 'svelte-frappe-charts';
  import { storage } from '$lib/storage';
  import { addDays, todayKey } from '$lib/date';
  import type { LogEntry } from '$types/log';
  import { CATEGORY_KEYS } from '$types/food';
  import type { CategoryKey } from '$types/food';

  let selected = $state<CategoryKey>('A');
  let labels = $state<string[]>([]);
  let series = $state<number[]>([]);
  let loaded = $state(false);

  async function load(): Promise<void> {
    const today = todayKey();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const totals: number[] = [];
    for (const d of days) {
      const entries = await storage.load<LogEntry[]>(`log_${d}`, []);
      const sum = entries.filter((e) => e.cat === selected).reduce((acc, e) => acc + e.pct, 0);
      totals.push(Math.round(sum));
    }
    labels = days.map((d) => d.slice(5)); // MM-DD
    series = totals;
    loaded = true;
  }

  onMount(load);
  $effect(() => {
    void selected;
    void load();
  });

  let chartData = $derived({
    labels,
    datasets: [{ name: 'Споживання, %', values: series }],
    yMarkers: [{ label: '100%', value: 100, options: { labelPos: 'left' } }],
  });
</script>

<div class="rounded-md border border-white/10 p-3">
  <div class="mb-3 flex flex-wrap gap-1">
    {#each CATEGORY_KEYS as key (key)}
      <button
        type="button"
        class={[
          'rounded-md border border-white/10 px-2 py-1 text-xs',
          selected === key && 'bg-accent text-white',
        ]}
        onclick={() => (selected = key)}
      >
        {key}
      </button>
    {/each}
  </div>
  {#if loaded}
    <Chart type="bar" data={chartData} height={220} colors={['#4caf50']} />
  {:else}
    <p class="text-muted text-xs">Завантаження…</p>
  {/if}
</div>
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/CategoryBarChart.svelte
git commit -m "feat(stats): add CategoryBarChart (7-day per-category consumption)"
```

---

### Task 30: Stats route

**Files:**

- Modify: `src/routes/Stats.svelte`

- [ ] **Step 1: Replace `src/routes/Stats.svelte`**

```svelte
<script lang="ts">
  import Heatmap from '../components/Heatmap.svelte';
  import CategoryBarChart from '../components/CategoryBarChart.svelte';
</script>

<section class="grid grid-cols-1 gap-4 p-2 md:p-4 lg:grid-cols-2">
  <Heatmap />
  <CategoryBarChart />
</section>
```

- [ ] **Step 2: Verify end-to-end**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

Run: `pnpm dev`. Switch to the Stats tab:

- Heatmap shows recent days colored per verdict.
- Bar chart shows the last 7 days for the selected category.
- Click another category — bars update.
- At ≥1024px the two charts sit side-by-side.

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Stats.svelte
git commit -m "feat(stats): wire up Stats route with Heatmap + CategoryBarChart"
```

---

## Phase 8 — PWA, Telegram, deploy (Tasks 31–34)

### Task 31: Wire Telegram WebApp init

**Files:**

- Modify: `src/main.ts`

- [ ] **Step 1: Replace `src/main.ts`**

```ts
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

function applyTelegramTheme(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  const t = tg.themeParams;
  const root = document.documentElement.style;
  if (t.bg_color) root.setProperty('--tg-bg', t.bg_color);
  if (t.text_color) root.setProperty('--tg-fg', t.text_color);
  if (t.hint_color) root.setProperty('--tg-hint', t.hint_color);
  if (t.link_color) root.setProperty('--tg-link', t.link_color);
}

applyTelegramTheme();

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app element in index.html');

mount(App, { target });
```

- [ ] **Step 2: Verify**

Run: `pnpm check`
Run: `pnpm lint`
Expected: both pass.

Run: `pnpm dev`. Open in a normal browser; Telegram object is undefined; theme falls back to the defaults defined in `src/app.css` and the app still renders.

Stop the server.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(telegram): wire WebApp ready/expand and theme variables in main.ts"
```

---

### Task 32: vite-plugin-pwa with manifest + icons + CNAME

**Files:**

- Modify: `vite.config.ts`
- Create: `public/icons/192.png`
- Create: `public/icons/512.png`
- Create: `public/icons/maskable-512.png`
- Create: `public/CNAME`
- Delete: `public/icons/.gitkeep`

- [ ] **Step 1: Install vite-plugin-pwa + re-add the type reference**

```bash
command pnpm add -D vite-plugin-pwa
```

Then add `vite-plugin-pwa/client` back to `tsconfig.json`'s `types` array (it was removed in Task 2 because the package wasn't installed yet — re-adding now that it is). Final `types` line:

```jsonc
"types": ["svelte", "vite/client", "vite-plugin-pwa/client"],
```

- [ ] **Step 2: Add icon assets + CNAME**

The product needs three PNG icons in `public/icons/`:

- `192.png` (192×192)
- `512.png` (512×512)
- `maskable-512.png` (512×512, with safe-zone padding for Android adaptive)

If you don't have artwork yet, generate temporary green-square placeholders with any tool you use. They can be replaced later without code changes.

Create `public/CNAME` so GitHub Pages keeps the custom domain across deploys (the file is required for any custom-domain Pages site; deleting/overwriting it will cause Pages to drop the custom-domain mapping):

```
calorie.ordynski.com
```

(no trailing newline matters; just one line)

- [ ] **Step 3: Replace `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  plugins: [
    svelte(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/192.png', 'icons/512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Calorie',
        short_name: 'Calorie',
        lang: 'uk',
        theme_color: '#4caf50',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      $state: resolve(__dirname, 'src/state'),
      $types: resolve(__dirname, 'src/types'),
    },
  },
  server: { port: 5173, host: true },
});
```

- [ ] **Step 4: Remove placeholder**

```bash
git rm public/icons/.gitkeep
```

- [ ] **Step 5: Verify production build**

Run: `pnpm build`
Expected: `dist/` contains `manifest.webmanifest`, `sw.js`, `workbox-*.js`, the icons, and the bundled assets.

Run: `pnpm preview`. Open `http://localhost:4173/` in Chrome:

- DevTools → Application → Manifest — name "Calorie", icons listed.
- DevTools → Application → Service Workers — `sw.js` activated.

Stop the server.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts public/icons/ public/CNAME package.json pnpm-lock.yaml
git commit -m "feat(pwa): add vite-plugin-pwa with manifest, icons, CNAME, and workbox precache"
```

---

### Task 33: GitHub Actions deploy workflow

**Files:**

- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm check
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify**

Run: `pnpm install --frozen-lockfile`
Run: `pnpm lint && pnpm format:check && pnpm check && pnpm build`
Expected: all pass with the same commands CI will run.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deploy workflow with lint, format, check, build"
```

---

### Task 34: Push + verify deploy + finalize README

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Replace `README.md`**

````markdown
# Calorie

Local-First persona food-quota diary as a PWA + Telegram WebApp.

- **Stack:** Vite + Svelte 5 (runes) + TypeScript + Tailwind v4 + Melt UI + Lucide + svelte-frappe-charts + Motion One + localforage + vite-plugin-pwa.
- **Storage:** Telegram CloudStorage when opened inside Telegram; IndexedDB (via localforage) everywhere else.
- **Live:** https://calorie.ordynski.com/

## Local development

```bash
pnpm install
pnpm dev          # Vite dev server on http://localhost:5173/
pnpm check        # svelte-check (TypeScript + Svelte)
pnpm lint         # ESLint
pnpm format       # Prettier (writes)
pnpm format:check # Prettier (CI mode)
pnpm build        # Production build to dist/
pnpm preview      # Serve dist/ locally
```
````

## Deploy

Pushing to `master` triggers `.github/workflows/deploy.yml` which lints,
type-checks, format-checks, builds, and deploys `dist/` to GitHub Pages.

## Telegram

After the GitHub Pages deploy is live, create a bot via @BotFather and run
`/newapp` against the deployed URL — no code changes needed.

````

- [ ] **Step 2: Configure GitHub Pages**

In the GitHub repo (`https://github.com/AlexOrd/calorie`):
- Settings → Pages → Source: **GitHub Actions**.

(This is a one-time UI step; if Pages isn't enabled, the deploy job will fail.)

- [ ] **Step 3: Push + watch the deploy**

```bash
git add README.md
git commit -m "docs: add README with stack, scripts, and deploy notes"
git push origin master
````

Open the **Actions** tab in GitHub. The "Deploy" workflow runs `build` → `deploy`. When green, open `https://calorie.ordynski.com/`.

- [ ] **Step 4: Smoke test the live site**

On a phone (or DevTools mobile emulation):

1. Onboarding wizard runs end-to-end and saves the profile.
2. Dashboard, Journal, Stats render and round-trip data through IndexedDB.
3. "Add to Home Screen" / "Install" works (PWA installable).
4. Reload offline (Network tab → Offline) — the app still loads.

On desktop:

1. Layout switches to sidebar nav.
2. Dashboard shows 8 cards in 2×4 grid at lg+.
3. Stats sit side-by-side at lg+.
4. Hover trash + inline confirm in Journal.

- [ ] **Step 5: (Optional) create the Telegram bot**

In Telegram, talk to @BotFather:

- `/newbot` — name + handle (e.g. `calorie_bot`).
- `/newapp` — pick the bot, set Web App URL to `https://calorie.ordynski.com/`.
- Open the bot in any Telegram client and tap the Web App button.

Verify storage uses Telegram CloudStorage (DevTools won't help here; just add an entry, kill the app, re-open — the entry persists).

---

## Self-review checklist (do this before declaring done)

After Task 34 the v1 is shipping. Walk this list once:

1. **Spec coverage** — every section of `2026-04-27-calorie-app-design.md` is implemented:
   - §3 layout ✅ (Tasks 1–6, scattered)
   - §4 data model ✅ (Tasks 7, 8)
   - §5 state modules ✅ (Tasks 13, 14)
   - §6 storage adapter ✅ (Tasks 9, 10)
   - §7 scaling math ✅ (Task 11)
   - §8 UI ✅ (Tasks 16–30)
   - §9 animations ✅ (Tasks 15, 22, 24, 27)
   - §10 PWA & deploy ✅ (Tasks 31–34)
   - §13 lint/format/typecheck/hooks ✅ (Task 5)
2. **Out of scope items are out** — no profile-edit screen, no item search, no edit-in-place, no automated tests, no i18n.
3. **Soft cap behavior** — verify in the running app: log >100% of one category, the card stays clickable, indicator turns red, you can keep adding entries.
4. **Eggs special case** — open EntrySheet for category B, expand "Яйця": slider step is 1 шт, max display is "6 шт".
5. **Telegram parity** — DevTools console: `window.Telegram` is undefined in browser (driver = localforage). Inside Telegram WebApp it's defined (driver = TelegramDriver) and the same interactions persist round-trip.
