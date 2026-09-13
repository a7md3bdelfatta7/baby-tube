---
name: implementation
description: >-
  Implementation workflow for feature work, bug fixes, and refactors. Use when
  implementing tasks, debugging, refactoring, or investigating issues. Covers
  plan → implement → test → self-review → report.
---

# Implementation Workflow

For every implementation task:

## 1. Understand

Before changing code:

- Read the task carefully.
- Inspect the relevant existing implementation.
- Identify the architecture and patterns already in use.
- Search for similar functionality elsewhere in the repository.
- Identify relevant tests.
- Identify constraints and edge cases.

Do not start coding based only on the ticket description if the existing code can clarify the intended behavior.

## 2. Plan

Create a concise implementation plan.

The plan should identify:

- Files likely to change.
- Existing code/patterns to reuse.
- Main implementation steps.
- Testing strategy.
- Important edge cases.

Do not produce a long speculative plan.

## 3. Implement

- Make the smallest maintainable change that satisfies the requirement.
- Reuse existing code where possible.
- Follow project architecture.
- Do not refactor unrelated code.
- Do not introduce unnecessary abstractions.
- Do not add dependencies without justification.

## 4. Test

After implementation:

- Run relevant unit/integration/E2E tests.
- Add tests for new behavior.
- Add regression tests for bug fixes.
- Run type checking.
- Run linting when applicable.

## 5. Self-Review

Review the implementation as a senior engineer.

Check:

- Correctness.
- Edge cases.
- Security.
- Performance.
- Maintainability.
- Test coverage.
- Unnecessary complexity.
- Unrelated changes.

Fix issues found during the review.

## 6. Final Validation

Before finishing:

- Inspect the final diff.
- Verify only relevant files changed.
- Remove unused imports and code.
- Confirm no debugging code remains.
- Confirm no secrets or sensitive information were introduced.
- Run final validation.

## 7. Report

Return a concise summary:

- What changed.
- Important implementation decisions.
- Tests/validation performed.
- Any remaining concerns or limitations.

## Task Command Templates

Use these as focused prompts when the tooling supports slash commands:

### `/implement`

Implement the requested task.

1. Read repository instructions.
2. Inspect the relevant implementation.
3. Search for existing patterns to reuse.
4. Create a concise plan.
5. Implement the smallest appropriate change.
6. Add/update tests.
7. Run relevant validation.
8. Review the final diff.
9. Fix issues found during review.
10. Report changes and validation.

### `/debug`

Debug the reported issue.

1. Understand the expected behavior.
2. Reproduce or trace the failure.
3. Identify the root cause before changing code.
4. Inspect existing patterns and related code.
5. Implement the smallest fix.
6. Add a regression test where practical.
7. Run relevant validation.
8. Review the diff.
9. Report root cause, fix, and validation.

Do not make unrelated refactors.

### `/refactor`

Refactor the requested area.

1. Establish current behavior.
2. Identify constraints.
3. Search for existing patterns.
4. Make the requested structural improvement.
5. Preserve behavior unless explicitly changing it.
6. Add/update tests where needed.
7. Run validation.
8. Review the diff.
9. Check that complexity actually decreased or maintainability improved.

Do not expand scope unnecessarily.

### `/investigate`

Investigate the requested problem. Do not modify code.

1. Inspect relevant code and configuration.
2. Trace the behavior.
3. Identify likely root causes.
4. Search for related implementations/issues in the repository.
5. Identify evidence supporting each conclusion.
6. Recommend the smallest appropriate fix.

Return a concise investigation report.
