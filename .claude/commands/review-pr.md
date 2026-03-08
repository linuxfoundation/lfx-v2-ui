Fetch and triage all automated review comments on the current branch's open PR.

## Steps

### 1. Identify the PR

Run: `gh pr view --json number,url,title,headRefName --jq '{number, url, title, branch: .headRefName}'`

If no PR is found, stop and tell me to create one first.

### 2. Fetch all automated comments

Run these three commands in parallel:

```
gh pr view <number> --comments
gh api repos/linuxfoundation/lfx-v2-ui/pulls/<number>/reviews
gh api repos/linuxfoundation/lfx-v2-ui/pulls/<number>/comments --jq '.[] | {user: .user.login, path: .path, line: .line, body: .body}'
```

Filter to only comments from: `Copilot`, `copilot-pull-request-reviewer`, `coderabbitai`, `github-actions[bot]`

### 3. Classify each comment by severity

**HIGH** (fix immediately):
- Security vulnerabilities (auth bypass, data exposure, injection)
- Bugs that will cause runtime errors or data corruption
- Missing error handling that swallows critical failures (auth, permissions)
- Exposed private/internal data on public endpoints
- Any comment explicitly marked as blocking or critical

**MEDIUM** (show for decision):
- Code quality issues (dead code, unused imports, missing validation)
- Performance concerns (N+1 queries, unnecessary API calls)
- Architectural suggestions (better patterns, refactoring)
- Missing edge case handling for non-critical paths
- Test coverage gaps

**LOW** (show for decision):
- Style/formatting preferences
- Documentation suggestions
- Naming conventions
- Minor refactoring opportunities

### 4. Present the triage report

Display a summary table:

```
## PR #<number>: <title>

### HIGH - Fixing automatically (<count>)
| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| 1 | path:line | description | what I will do |

### MEDIUM - Needs your decision (<count>)
| # | File:Line | Issue | Suggestion |
|---|-----------|-------|------------|

### LOW - Needs your decision (<count>)
| # | File:Line | Issue | Suggestion |
|---|-----------|-------|------------|
```

### 5. Fix all HIGH issues

For each HIGH issue:
1. Read the affected file
2. Apply the fix
3. Run `yarn lint` after all fixes
4. Run `yarn build` to verify compilation

### 6. Commit and push fixes (if any HIGH issues were fixed)

```
git add <affected files>
git commit -m "fix(<scope>): address automated review feedback LFXV2-XXXX

Signed-off-by: Manish Dixit <mdixit@linuxfoundation.org>"
git push origin <branch>
```

Use the JIRA ticket from the branch name or most recent commit.

### 7. Ask about MEDIUM/LOW

After fixing HIGH issues and pushing, ask:
"<count> MEDIUM and <count> LOW issues remain. Which ones should I fix?"

If there are zero automated comments, report: "No open automated review comments. PR is ready for human review."
