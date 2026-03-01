---
name: git-fix-issue
description: Fix a specific issue from the issue tracker
arguments:
  - name: issue
    description: Issue number or description
    required: true
---

Fix the issue described: $ARGUMENTS

## Steps
1. Understand the issue fully
2. Find relevant code using project structure
3. Implement the fix following project conventions
4. Run type check: `npx tsc --noEmit`
5. Run lint: `npx biome check .`
6. Test the fix
7. Create a conventional commit
