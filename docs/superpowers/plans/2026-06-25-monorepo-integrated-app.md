# Monorepo Integrated App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a single-repository Rust + React + Ant Design application where Rust serves API routes and production frontend assets.

**Architecture:** The project keeps `backend` and `frontend` as separate toolchain directories while root scripts coordinate development, testing, and builds. Development uses Vite hot reload with an `/api` proxy; production builds `frontend/dist`, then Axum serves the SPA and API from one process.

**Tech Stack:** Rust, Axum, Tokio, Tower HTTP, React, TypeScript, Vite, Ant Design, npm workspaces.

---

### Task 1: Root Workspace

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `package.json`

- [x] Add npm workspace scripts for dev, build, start, and test.
- [x] Ignore generated frontend, Rust, environment, and package-manager artifacts.
- [x] Document install, development, production-style run, and verification commands.

### Task 2: Rust Backend

**Files:**
- Create: `backend/Cargo.toml`
- Create: `backend/src/lib.rs`
- Create: `backend/src/main.rs`

- [x] Add an Axum application with `/api/health`.
- [x] Add static frontend serving from `frontend/dist` with SPA fallback.
- [x] Add an async backend test for the health endpoint.

### Task 3: React Frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/vite-env.d.ts`

- [x] Add Vite + React + TypeScript wiring.
- [x] Add Ant Design layout components.
- [x] Fetch `/api/health` and render API status.
- [x] Configure Vite dev proxy to the Rust backend.

### Task 4: Verification

**Files:**
- Modify: `package-lock.json`
- Modify: `frontend/package-lock.json` if npm creates one.
- Modify: `backend/Cargo.lock`

- [x] Run `npm install`.
- [x] Run `cargo test --manifest-path backend/Cargo.toml`.
- [x] Run `npm --workspace frontend run build`.
- [x] Run `cargo build --manifest-path backend/Cargo.toml`.
