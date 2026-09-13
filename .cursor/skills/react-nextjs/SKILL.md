---
name: react-nextjs
description: >-
  React and Next.js engineering for this project. Use when building or changing
  UI components, pages, hooks, client/server boundaries, or data fetching in
  the App Router.
---

# React / Next.js Engineering Skill

## General

- Follow the existing React/Next.js architecture.
- Search for similar components/hooks before creating new ones.
- Prefer simple component composition.
- Keep components focused.

## React Components

Before creating a component:

1. Search for an existing component with similar behavior.
2. Reuse existing shared UI components where possible.
3. Follow existing naming and folder conventions.

Avoid:

- Giant components.
- Duplicated business logic.
- Unnecessary state.
- Unnecessary effects.
- Premature memoization.
- Deeply nested conditional rendering when a simpler structure is possible.

## State

Use the smallest appropriate state scope.

Prefer:

1. Local component state when appropriate.
2. Existing shared state mechanisms when required.
3. Server state/data-fetching mechanisms for remote data.
4. Global state only when truly global.

Do not introduce global state to solve a local problem.

## Effects

Before adding `useEffect`:

- Determine whether the behavior can be expressed directly during render.
- Determine whether an event handler is more appropriate.
- Determine whether existing data-fetching mechanisms already solve the problem.

Avoid effects used only to derive state from existing state/props.

## Memoization

Do not automatically add:

- `useMemo`
- `useCallback`
- `React.memo`

Use them when there is a clear performance or referential-stability reason.

## Next.js

Follow the App Router architecture already present in the project.

Prefer Server Components by default when appropriate.

Use Client Components only when necessary for:

- Browser APIs.
- Interactive state.
- Event handlers.
- Client-only libraries.
- Other genuinely client-side behavior.

Avoid moving server-side logic to the browser unnecessarily.

## Data Fetching

- Reuse existing data-fetching patterns.
- Avoid duplicate requests.
- Avoid request waterfalls where possible.
- Use existing caching mechanisms.
- Fetch only the data required by the UI.

In this project, TanStack Query handles client-side fetching and mutation cache invalidation. Admin mutations use helpers in `lib/api.ts`.

## Client/Server Boundary

Be deliberate about what crosses the client/server boundary.

Do not send:

- Secrets.
- Server-only configuration.
- Unnecessary large objects.
- Sensitive internal data.

## Accessibility

When changing UI:

- Preserve existing accessibility behavior.
- Use semantic HTML.
- Ensure interactive elements are keyboard accessible.
- Provide appropriate labels and accessible names.
- Do not rely only on visual indicators.

## Validation

For UI changes:

- Run relevant tests.
- Check loading, success, empty, and error states.
- Consider responsive behavior.
- Consider accessibility.
- Check unnecessary renders/network requests when relevant.
