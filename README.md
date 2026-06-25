# Bubble

Rust + React + Ant Design monorepo application.

## Structure

- `backend/` - Rust API server built with Axum. It serves `/api/*` routes and, after a frontend build, the React static assets.
- `frontend/` - Vite + React + TypeScript + Ant Design application.
- `docs/superpowers/` - project planning notes.

## Requirements

- Node.js 20+
- npm 10+
- Rust stable

## Development

Install JavaScript dependencies:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api` to the Rust server at `http://localhost:3000`.

The root npm scripts are implemented with Node.js process runners so the same commands work on macOS and Windows.

## Desktop Floating Window

Run the desktop floating window in development mode:

```bash
npm run desktop:dev
```

This starts the Rust API, Vite frontend, and Tauri shell. The desktop window is configured as a compact always-on-top floating window with a transparent rounded background and draggable header.

Build the desktop app:

```bash
npm run desktop:build
```

The desktop shell lives in `src-tauri/`. The React UI detects the Tauri runtime and uses a local Tauri command for desktop health status; in a normal browser it still calls `/api/health`.

Run only the desktop Rust tests:

```bash
npm run desktop:test
```

## Production-style Run

Build the frontend and backend:

```bash
npm run build
```

Run the Rust server:

```bash
npm start
```

Open `http://localhost:3000`.

The Rust server resolves `frontend/dist` from the project root instead of the current terminal directory. If you need to serve a custom frontend build directory, set `BUBBLE_FRONTEND_DIST` to an absolute or relative path before starting the server.

macOS or Linux:

```bash
BUBBLE_FRONTEND_DIST=/path/to/dist npm start
```

Windows PowerShell:

```powershell
$env:BUBBLE_FRONTEND_DIST="C:\path\to\dist"; npm start
```

## Verification

```bash
npm test
```
