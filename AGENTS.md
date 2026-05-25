# AI Development Guide

This file is the default project prompt for teammates using Codex, Claude Code, Cursor, or similar AI coding tools. Read it before making code changes.

## Project Context

- This repository is a lightweight intelligent-agent demo portal.
- Backend entrypoint: `main.py`
  - FastAPI API
  - SQLite persistence
  - JWT auth
  - RBAC product visibility
  - Product modules are seeded in `PRODUCTS_SEED`
- Frontend entrypoints:
  - `login.html`
  - `index.html`
  - `detail.html`
  - `portal-demos.js`
  - `portal-brand.js`
- Product/module names must follow the object names in `main.py` `PRODUCTS_SEED`.

## Command Environment

- When a command requires installed Python packages, run it through the `lg` conda environment.
- Preferred format:

```bash
conda run -n lg python -m compileall main.py
```

- Do not install dependencies globally.
- Do not change dependency files unless the task specifically requires it.

## Git And PR Rules

- Do not push directly to `main`.
- Do not force push shared branches.
- Create a feature branch from the latest `main` for each task.
- Open a pull request for every change that should enter `main`.
- Keep each PR focused on one logical task.
- Before editing, check:

```bash
git status -sb
git branch --show-current
```

- Do not overwrite or revert files changed by another teammate unless the teammate explicitly agrees.
- If there are unrelated local changes, leave them untouched.

## Module Ownership And Conflict Avoidance

- Treat each `PRODUCTS_SEED` entry in `main.py` as a separate module.
- Do not rename product names casually. They are used as stable module identifiers by the frontend demo registry.
- If a module name, URL, badge, role, industry, or tech stack changes in `main.py`, check whether matching display/demo logic in `portal-demos.js`, `index.html`, or `detail.html` also needs an update.
- Prefer editing only the module assigned to your task.
- Avoid broad formatting or refactoring of shared files, especially:
  - `main.py`
  - `portal-demos.js`
  - `index.html`
  - `detail.html`
- If multiple teammates need the same shared file, split work by product/module section and merge through PR review.

## Backend Guidelines

- Keep seed and migration logic idempotent.
- Preserve existing RBAC behavior unless the task is explicitly about permissions.
- When adding product fields, update:
  - database schema setup
  - seed insertion
  - backfill logic
  - API response models
  - frontend consumers
- Keep API responses backward-compatible when possible.

## Frontend Guidelines

- Match existing static HTML/CSS/JS patterns.
- Do not introduce a frontend framework unless the task explicitly requires it.
- Keep module-specific demo behavior in `portal-demos.js`.
- Keep navigation, filtering, role visibility, and detail pages consistent.
- Avoid unrelated visual redesigns in feature PRs.

## Validation Checklist

Before opening a PR, run the checks that match your change:

```bash
conda run -n lg python -m compileall main.py
```

- For backend changes, also start the FastAPI app if practical and verify the edited API path.
- For frontend changes, open the relevant HTML page or run the local server and verify the changed screen.
- For documentation-only changes, inspect the rendered Markdown or review the diff.

## PR Description Checklist

Each PR should state:

- What changed
- Why it changed
- Which module or shared file was touched
- What validation was run
- Any known follow-up or risk
