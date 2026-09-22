---
Phase: Deployment
Assistant: Deployment Assistant (CodeMie), human-reviewed
---

# Deployment (local)

## Prerequisites

- Node.js ≥ 22.5 (for the built-in `node:sqlite` module)

## Steps

```powershell
npm install --prefix backend
npm start
```

The app serves on `http://localhost:3000`. The frontend is served as static
files by the same Express process that exposes the `/api/tasks` REST API —
one process, one port.

## Building a deployable artifact

```powershell
.\scripts\build.ps1
```

Runs the backend test suite, then produces `dist/task-manager-build-v1.0.0.zip`
containing everything needed to run the app (backend + frontend, minus
`node_modules` and the runtime database file — run `npm install` again after
unzipping).

## Verification performed

The running app was exercised manually in a browser: create, edit, advance
status (To Do → In Progress → Done), reopen, search, filter, sort, and delete
all confirmed working against the real SQLite-backed API.
