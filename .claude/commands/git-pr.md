---
name: git-pr
description: Commit, push, and create PR workflow
---
Execute these steps:
1. Check git status and diff
2. Create commit with conventional format: type(scope): description
   - Types: feat, fix, refactor, style, docs, test, chore
   - Scopes: auth, documents, approvals, notifications, db, ui, api, config
3. Push to remote
4. Create PR with auto-generated description including:
   - Summary of changes
   - Related tasks/issues
   - Testing checklist
