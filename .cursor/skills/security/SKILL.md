---
name: security
description: >-
  Security review for auth, APIs, user input, secrets, and data exposure. Use
  when changes touch authentication, authorization, APIs, database queries,
  file handling, or sensitive user data.
---

# Security Review Skill

Apply this skill whenever a change involves:

- Authentication.
- Authorization.
- User input.
- APIs.
- Database queries.
- File uploads/downloads.
- External services.
- Secrets.
- Payments.
- User-specific data.
- Administrative functionality.

## Secrets

Never:

- Hardcode credentials.
- Commit secrets.
- Log secrets.
- Expose server secrets to the client.
- Include access tokens in URLs.

Use the project's established secret/configuration mechanism.

In this project, server-only env vars include `ADMIN_PASSWORD`, `YOUTUBE_API_KEY`, and `DATABASE_URL`. Never expose these to client code or `NEXT_PUBLIC_*` variables.

## Authentication

Verify authentication using trusted server-side mechanisms.

Do not trust client-provided identity information.

## Authorization

Verify authorization for every protected operation.

Do not rely on:

- UI visibility.
- Client-side route guards.
- Client-provided roles.
- Client-provided ownership claims.

## Input

Treat external input as untrusted.

Validate:

- Type.
- Format.
- Range.
- Length.
- Allowed values.
- Ownership/authorization where relevant.

## Injection

Use safe APIs and parameterized queries.

Be careful with:

- SQL injection.
- Command injection.
- XSS.
- Template injection.
- Path traversal.
- SSRF.
- Dynamic code execution.

Avoid dynamic execution unless explicitly required and safely constrained.

## XSS

When rendering user-controlled content:

- Prefer safe framework mechanisms.
- Avoid raw HTML rendering unless required.
- Sanitize content when raw HTML is genuinely necessary.

## Logging

Never log:

- Passwords.
- Access tokens.
- Refresh tokens.
- API keys.
- Authentication headers.
- Sensitive personal information.

## Data Exposure

Return only necessary data.

Review both:

- API responses.
- Client-side data passed through server/client boundaries.

## Files

For file handling:

- Validate type.
- Validate size.
- Avoid trusting filename extensions alone.
- Prevent path traversal.
- Store files using safe generated identifiers where appropriate.
- Enforce authorization for access.

## Dependencies

Do not add dependencies casually.

Prefer established, maintained project dependencies.

## Security Review

For security-sensitive changes, explicitly check:

1. Authentication.
2. Authorization.
3. Input validation.
4. Data exposure.
5. Injection risks.
6. Logging.
7. Secrets.
8. Dependency risks.
9. Error handling.
10. Client/server boundaries.
