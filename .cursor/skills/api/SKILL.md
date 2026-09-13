---
name: api
description: >-
  API route engineering for Next.js handlers. Use when creating or changing
  app/api routes, request validation, auth checks, or server-side data access.
---

# API Engineering Skill

## Before Implementation

Inspect:

- Existing endpoint patterns.
- Authentication middleware.
- Authorization mechanisms.
- Validation utilities.
- Error handling conventions.
- Response formats.
- Logging conventions.
- Existing tests.

Reuse existing mechanisms.

In this project:

- Route handlers live under `app/api/`.
- Admin auth uses `isAuthorized` / `unauthorized` from `lib/auth.ts` with the `x-admin-password` header.
- Zod schemas live in `lib/validation.ts`.
- Client API wrappers live in `lib/api.ts`.

## Input Validation

Treat all external input as untrusted.

Validate:

- Request body.
- Query parameters.
- Path parameters.
- Headers where relevant.
- Uploaded files.
- External service responses when required.

Do not rely on client-side validation for security.

## Authentication

Authentication answers:

> Who is the caller?

Use the existing authentication mechanism.

Do not implement a parallel authentication mechanism unless explicitly required.

## Authorization

Authorization answers:

> Is this caller allowed to perform this operation?

Always enforce authorization server-side.

Do not trust:

- Client-side permissions.
- Hidden UI elements.
- Client-provided roles.
- Client-provided user IDs without verification.

## Data Exposure

Return only the data required by the client.

Do not expose:

- Passwords.
- Tokens.
- Internal credentials.
- Sensitive fields.
- Internal implementation details.
- Excessive database records.

## Errors

Follow existing error conventions.

Do not expose stack traces or internal details to clients in production responses.

Errors should be:

- Predictable.
- Safe.
- Useful to the caller.
- Useful for server-side debugging through appropriate logs.

## Database

Avoid:

- N+1 queries.
- Unbounded queries.
- Selecting unnecessary columns.
- Dynamic SQL without safe parameterization.

Use existing repositories/services/data-access patterns. In this project, use Drizzle via `db/index.ts` and schema in `db/schema.ts`.

## Compatibility

Before changing an API:

- Search for all consumers.
- Consider backwards compatibility.
- Update types/contracts where necessary.
- Update tests.

## Testing

Test:

- Happy path.
- Invalid input.
- Unauthorized access.
- Forbidden access.
- Not-found behavior where relevant.
- Important edge cases.
- Error handling.
