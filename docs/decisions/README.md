# Architectural Decision Records

Record significant architectural decisions here as individual markdown files.

## Format

Use a short filename and this structure:

```md
# Title

## Status

Accepted | Superseded | Deprecated

## Context

What problem or constraint led to this decision?

## Decision

What was chosen?

## Consequences

What becomes easier or harder as a result?
```

## When to Add a Record

- Choosing a new data model or persistence approach.
- Changing auth or security boundaries.
- Introducing a new external service or dependency with architectural impact.
- Replacing a core pattern (e.g. data fetching, state management).

Do not record routine feature implementation details here.
