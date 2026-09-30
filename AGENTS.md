# AGENTS

## Project context

This workspace is for a school management application ("SIAKAD SMA"). Treat it as a PHP/MySQL web app unless the existing repository shows otherwise. Keep changes aligned with the current architecture and do not introduce new frameworks, package managers, or project structure without evidence from the codebase.

## Working rules for AI coding agents

- Read the existing project files before making edits. Prefer the repository's real structure and naming patterns over generic Laravel/CodeIgniter/vanilla PHP assumptions.
- Keep changes small and targeted. Avoid broad refactors, file moves, or architecture changes unless the task explicitly requires them.
- Preserve existing database conventions, naming, and query patterns. If the app touches student, teacher, class, schedule, or grades data, verify the schema and migration files before altering fields or relations.
- Favor the project’s current patterns for validation, route registration, authentication, and rendering instead of inventing new conventions.
- If the workspace is empty or missing project files, do not scaffold a new application from scratch unless the user explicitly asks for it.

## Before making changes

1. Inspect the existing app structure and any README or setup docs.
2. Identify the correct feature boundary: controller, model, view, service, or database layer.
3. Check whether the app uses Composer, a framework, or plain PHP files before adding dependencies or config changes.
4. Confirm the smallest valid fix or feature addition.

## Validation

- Run the project’s existing validation commands before considering the change complete.
- For PHP files, use `php -l <file>` to catch syntax errors.
- If Composer or a framework test command exists, prefer that over ad hoc checks.
- For database-related changes, verify migration or SQL behavior carefully and keep queries compatible with the existing schema.

## Documentation and conventions

- Prefer project-local docs over generic guidance. If README, docs, or setup instructions exist, follow them first.
- Do not duplicate documentation that already exists. Link to existing files when relevant instead of re-explaining them.
- When uncertainty remains, ask for the intended framework or existing structure before making a large architectural change.

## Default expectations

- Respect security and data integrity rules for school data.
- Maintain backward compatibility unless the task explicitly involves a breaking change.
- Keep code readable, consistent with neighboring files, and easy to review.

## UI

- Validation
- API
- Authentication
- Authorization
- Business Logic
- Database
- Response
- UI State

DEVELOPER
GURU
MURID
