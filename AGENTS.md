# Engineering Guidelines

Project-specific stack, paths, and operational notes live in `AGENT.md`. Architecture and API reference live in `docs/`. Specialized skills live in `.cursor/skills/` and are loaded when relevant.

## General

- Prefer simple, readable solutions over clever abstractions.
- Reuse existing utilities, components, hooks, services, and patterns before introducing new ones.
- Do not introduce a new dependency unless the existing project cannot reasonably solve the problem.
- Do not modify unrelated code.
- Keep changes focused and reviewable.
- Prefer the smallest change that completely satisfies the requirement.
- Preserve existing behavior unless the task explicitly requires changing it.

## Existing Patterns First

Before creating a new abstraction:

1. Search the repository for an existing implementation of similar behavior.
2. Prefer an existing shared utility/component/hook/service.
3. Follow the existing architectural pattern.
4. Create a new abstraction only when there is a clear reason.

Do not create duplicate abstractions with slightly different names or behavior.

## Architecture

- Follow the existing project architecture.
- Keep business logic out of presentation components.
- Keep API/data-access logic separate from presentation.
- Prefer composition over inheritance.
- Do not introduce a new architectural pattern without justification.
- Do not perform broad architectural refactoring as part of a focused feature unless required.

## TypeScript

- Use strict typing.
- Avoid `any`.
- Prefer existing shared types.
- Do not duplicate types when an existing type can be reused.
- Handle nullable/optional values explicitly.
- Avoid unsafe type assertions unless there is a documented reason.

## React

- Prefer functional components.
- Keep components focused on one responsibility.
- Avoid unnecessary state.
- Reuse existing hooks and components.
- Avoid unnecessary `useMemo` and `useCallback`; use them when there is a clear reason.
- Avoid putting business logic directly into UI components.

## Next.js

- Follow the existing App Router conventions.
- Prefer Server Components where appropriate.
- Use Client Components only when client-side behavior is required.
- Do not move server-only logic to the client unnecessarily.
- Never expose secrets or server-only environment variables to client-side code.
- Follow existing data-fetching and caching patterns.

## API

- Validate external input.
- Handle expected errors explicitly.
- Never trust client-provided authorization information.
- Verify authorization server-side.
- Do not expose sensitive information in API responses.
- Follow existing API response and error conventions.

## Security

- Never hardcode secrets, tokens, credentials, or API keys.
- Never log authentication tokens, passwords, or sensitive user data.
- Validate and sanitize untrusted input.
- Follow least-privilege principles.
- Do not weaken existing security controls.
- Never rely on client-side authorization for protected operations.

## Testing

- Add or update tests for behavioral changes.
- Prefer testing behavior over implementation details.
- Run relevant tests after implementation.
- Run type checking and linting when applicable.
- Add regression tests when fixing bugs.

## Change Scope

Do not:

- Refactor unrelated code.
- Rename unrelated symbols.
- Reorganize directories without a requirement.
- Upgrade dependencies unless required.
- Rewrite existing components unnecessarily.
- Change architecture without justification.

If the requested implementation requires a significantly larger change than expected, explain why before expanding scope.

## Performance

- Avoid unnecessary network requests.
- Avoid duplicate data fetching.
- Avoid unnecessary React renders.
- Avoid unnecessary client-side JavaScript.
- Avoid N+1 database queries.
- Avoid loading large datasets when pagination or selective queries are possible.
- Do not perform premature optimization; identify the likely bottleneck first.

## Before Finishing

Always:

1. Review the final diff.
2. Remove unused code and imports.
3. Verify no unrelated files were changed.
4. Run relevant tests.
5. Run type checking/linting when applicable.
6. Check for obvious security issues.
7. Check for unnecessary complexity.
8. Confirm the implementation matches the requirement.
9. Report what was changed and what was validated.

## Skills

Load specialized guidance only when relevant:

| Task type | Skills |
|-----------|--------|
| Any implementation | `.cursor/skills/implementation/` |
| UI / React / Next.js | `.cursor/skills/react-nextjs/` |
| API routes / server logic | `.cursor/skills/api/`, `.cursor/skills/security/` |
| Tests | `.cursor/skills/testing/` |
| Review | `.cursor/skills/code-review/`, `.cursor/skills/security/` |

## Validation Commands

```bash
pnpm run lint
pnpm run build
pnpm run db:push   # when schema changes
```
