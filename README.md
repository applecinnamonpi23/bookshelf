# Bookshelf

A personal bookshelf app for tracking completed books. The original product
requirements and MVP decisions live in [PRD.md](PRD.md).

## Development

```bash
npm install
npm run dev
```

The app uses IndexedDB for local persistence and Open Library for book search.

## Shared Database Setup

For phone and desktop sync, the app can use a private Google Sheet through the
Apps Script endpoint in `scripts/google-apps-script/Code.gs`.

1. Create a Google Sheet for the bookshelf.
2. Open **Extensions > Apps Script**.
3. Replace the starter code with `scripts/google-apps-script/Code.gs`.
4. In Apps Script, open **Project Settings > Script properties** and add
  `BOOKSHELF_TOKEN` with a long random value.
5. Choose **Deploy > New deployment**, select **Web app**, execute as yourself,
  and allow access to anyone with the link.
6. Copy the deployment URL into a local `.env` file using `.env.example`.
7. In GitHub, add repository secrets named `BOOKSHELF_API_URL` and
  `BOOKSHELF_API_TOKEN` under **Settings > Secrets and variables > Actions**.
8. Push or rerun the Pages workflow. GitHub Pages will then use the shared sheet.

The token is included in the browser request because this is a static personal
site. It is an access password, not a fully private server secret. Do not use
this endpoint for sensitive data or share the deployment URL publicly. The
Google Sheet itself remains the source of truth, and each device will load the
same books after the environment variables are deployed.

## Hosting

GitHub Pages deployment is configured in `.github/workflows/deploy.yml`. Pushes
to `master` build and publish the app at:

`https://applecinnamonpi23.github.io/bookshelf/`

To use a custom domain later, add it under the repository's **Settings > Pages**
custom domain field and follow GitHub's DNS instructions.

## Vite Reference

The sections below are the default Vite setup notes.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
