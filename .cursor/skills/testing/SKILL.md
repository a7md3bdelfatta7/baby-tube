---
name: testing
description: >-
  Testing principles and validation for this project. Use when adding or
  updating tests, fixing bugs that need regression coverage, or reporting
  what validation was run before finishing work.
---

# Testing Skill

## Principles

Tests should validate behavior rather than implementation details.

Prefer tests that answer:

> Does the system behave correctly for the user/business requirement?

Avoid tests that tightly couple to internal implementation unless necessary.

## New Features

For new behavior:

- Add tests for the main success path.
- Add tests for important failure paths.
- Add tests for meaningful edge cases.
- Update existing tests when behavior changes.

## Bug Fixes

Every meaningful bug fix should have a regression test when practical.

The test should fail against the old behavior and pass against the fix.

## React

Prefer testing:

- User interactions.
- Visible behavior.
- Loading states.
- Error states.
- Empty states.
- Accessibility behavior.
- Important conditional behavior.

Avoid excessive snapshot testing.

## API

Test:

- Valid input.
- Invalid input.
- Authentication.
- Authorization.
- Expected errors.
- Important edge cases.

## Test Scope

Prefer the smallest test suite that gives confidence.

Run:

1. Targeted tests first.
2. Relevant broader tests next.
3. Full suite when appropriate or required.

## Test Quality

Avoid:

- Flaky tests.
- Arbitrary timeouts.
- Excessive mocking.
- Testing implementation details.
- Duplicated test setup.

## Completion

Do not claim a task is complete without reporting what validation actually ran.

Never claim tests passed if they were not executed.

For this project, when no test suite exists yet, report `pnpm run lint` and `pnpm run build` results explicitly.
