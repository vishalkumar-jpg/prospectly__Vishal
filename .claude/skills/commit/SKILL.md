---
name: commit
description: Stage changes, fix lint errors, and create a conventional commit
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

Create a git commit following the project's conventional commit standards. Steps:

1. Run `git status` and `git diff --staged` to see what's changed (staged and unstaged)
2. If there are unstaged changes, stage the relevant files (prefer specific files over `git add .`)
3. Run `cd server && npx eslint --fix` on any changed `.ts`/`.tsx` files in server/ to auto-fix lint issues
4. Run `cd client && npx eslint --fix` on any changed `.ts`/`.tsx` files in client/ to auto-fix lint issues
5. Re-stage any files that were modified by eslint --fix
6. Analyze the diff and generate a commit message in conventional commits format:

```
type(scope): subject
```

Rules:
- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`
- **scope**: area of codebase (e.g., `auth`, `contacts`, `emails`, `credits`, `marketplace`, `ui`)
- **subject**: lowercase, imperative mood, no period, max 100 chars
- Add a blank line then a body with details if the change is non-trivial

7. Create the commit. Use a HEREDOC for the message:
```bash
git commit -m "$(cat <<'EOF'
type(scope): subject

Body details here if needed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

8. If the commit fails due to pre-commit hooks (lint-staged/commitlint), fix the issues and retry.

If $ARGUMENTS is provided, use it as guidance for the commit message.
