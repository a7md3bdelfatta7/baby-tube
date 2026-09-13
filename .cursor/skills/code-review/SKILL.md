---
name: code-review
description: >-
  Structured code review for correctness, security, performance, and
  maintainability. Use when reviewing diffs, PRs, or before marking work
  complete.
---

# Code Review Skill

The purpose of review is to find actionable problems, not to rewrite code unnecessarily.

## Review Order

Review in this order:

1. Correctness.
2. Security.
3. Data integrity.
4. Error handling.
5. Performance.
6. Maintainability.
7. Testing.
8. Readability.

## Correctness

Look for:

- Incorrect logic.
- Missing edge cases.
- Incorrect state transitions.
- Race conditions.
- Broken error paths.
- Incorrect assumptions.
- Backwards compatibility problems.

## Security

Look for:

- Missing authorization.
- Trusting client input.
- Sensitive data exposure.
- Injection vulnerabilities.
- Unsafe redirects.
- Secret leakage.
- Unsafe file handling.

## Performance

Look for:

- Duplicate requests.
- Request waterfalls.
- N+1 queries.
- Unnecessary renders.
- Large unnecessary payloads.
- Unbounded queries.
- Expensive work in hot paths.

Do not recommend optimization without a reasonable basis.

## Maintainability

Look for:

- Duplicated logic.
- Unnecessary abstractions.
- Excessive complexity.
- Poor separation of concerns.
- Confusing naming.
- Violations of established project patterns.

## Testing

Check whether important behavior is covered.

Do not require tests for trivial implementation details when they provide little value.

## Review Output

Only report actionable findings.

For each finding include:

- Severity.
- Location.
- Problem.
- Why it matters.
- Recommended fix.

If no meaningful issues are found, say so concisely.

Do not invent hypothetical problems without evidence from the code.

## `/review` Command Template

Review the current changes. Try to find real problems.

Check:

- correctness
- security
- authorization
- data integrity
- error handling
- performance
- maintainability
- test coverage
- backwards compatibility

Only report actionable findings.

For each finding provide: severity, location, problem, why it matters, recommended fix.

Do not rewrite unrelated code.
