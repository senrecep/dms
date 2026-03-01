#!/usr/bin/env python3
import json
import sys
import re

try:
    input_data = json.load(sys.stdin)
except json.JSONDecodeError as e:
    print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
    sys.exit(1)

tool_name = input_data.get("tool_name", "")
tool_input = input_data.get("tool_input", {})
command = tool_input.get("command", "")

if tool_name != "Bash" or "git commit" not in command:
    sys.exit(0)

match = re.search(r'git commit.*?-m\s+["\']([^"\']+)["\']', command)
if not match:
    heredoc_match = re.search(r'git commit.*?-m\s+"?\$\(cat\s+<<["\']?EOF["\']?\s*\n(.+?)\nEOF', command, re.DOTALL)
    if heredoc_match:
        commit_msg = heredoc_match.group(1).strip()
    else:
        sys.exit(0)
else:
    commit_msg = match.group(1)

conventional_pattern = r'^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?:\s.+'

if not re.match(conventional_pattern, commit_msg):
    reason = f"""❌ Invalid commit message format

Your message: {commit_msg}

Commit messages must follow Conventional Commits:
  type(scope): description

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert"""

    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason
        }
    }
    print(json.dumps(output))
    sys.exit(0)

sys.exit(0)
