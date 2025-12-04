// CI/CD Fix Prompt Generator
// Generates prompts for Claude Code to fix CI/CD issues

export interface CicdIssue {
  id: string
  issue_type: string
  severity: string
  file_path: string | null
  line_number: number | null
  message: string
  code: string | null
  details?: Record<string, unknown> | null
  auto_fixable: boolean
  first_seen_at: string
  last_seen_at: string
  occurrence_count: number
}

const issueTypeLabels: Record<string, string> = {
  typescript_error: 'TypeScript Error',
  test_failure: 'Test Failure',
  lint_error: 'Lint Error',
  build_error: 'Build Error',
  health_check: 'Health Check Issue',
}

function formatFileLocation(issue: CicdIssue): string {
  if (!issue.file_path) return 'Unknown location'
  return issue.line_number
    ? `${issue.file_path}:${issue.line_number}`
    : issue.file_path
}

function getFixInstructions(issueType: string): string {
  switch (issueType) {
    case 'typescript_error':
      return `1. Read the file and understand the type error context
2. Identify the root cause (missing types, incorrect types, null checks, etc.)
3. Apply the minimal fix that resolves the type error
4. Run \`npx tsc --noEmit\` to verify the fix
5. Check for related type errors in the same file`

    case 'test_failure':
      return `1. Read the failing test file
2. Run the specific test to reproduce the failure: \`npm test -- --grep "test name"\`
3. Identify if it's a test bug or actual code bug
4. Fix the code or update the test as appropriate
5. Re-run the full test suite to ensure no regressions`

    case 'lint_error':
      return `1. Read the file with the lint error
2. Apply the lint fix (often auto-fixable with \`npm run lint -- --fix\`)
3. If manual fix needed, apply consistent formatting
4. Run \`npm run lint\` to verify the fix`

    case 'build_error':
      return `1. Read the file causing the build error
2. Check imports, exports, and dependencies
3. Fix the build issue
4. Run \`npm run build\` to verify the fix`

    default:
      return `1. Read the relevant file(s)
2. Understand the issue context
3. Apply an appropriate fix
4. Verify the fix resolves the issue`
  }
}

export function generateSingleIssuePrompt(issue: CicdIssue): string {
  const issueLabel = issueTypeLabels[issue.issue_type] || issue.issue_type

  return `## CI/CD Fix Request

**Issue Type**: ${issueLabel}
**Severity**: ${issue.severity}
**Location**: ${formatFileLocation(issue)}
**Error Code**: ${issue.code || 'N/A'}
**Occurrences**: ${issue.occurrence_count}

### Error Message
\`\`\`
${issue.message}
\`\`\`

${issue.details ? `### Additional Details
\`\`\`json
${JSON.stringify(issue.details, null, 2)}
\`\`\`
` : ''}
---

### Fix Instructions

${getFixInstructions(issue.issue_type)}

---

### After Fixing

1. Verify the issue is resolved by running the appropriate check command
2. Mark the issue as resolved in the CI/CD dashboard
3. If this fix reveals related issues, note them for follow-up

**Dashboard Link**: https://ops.growthcohq.com/home/cicd
`
}

export function generateBatchFixPrompt(issues: CicdIssue[], batchNumber?: number, totalBatches?: number): string {
  const batchInfo = batchNumber && totalBatches
    ? `(Batch ${batchNumber} of ${totalBatches})`
    : ''

  // Group issues by file for efficient fixing
  const byFile: Record<string, CicdIssue[]> = {}
  for (const issue of issues) {
    const key = issue.file_path || 'unknown'
    if (!byFile[key]) byFile[key] = []
    byFile[key].push(issue)
  }

  // Group by type for summary
  const byType: Record<string, number> = {}
  for (const issue of issues) {
    byType[issue.issue_type] = (byType[issue.issue_type] || 0) + 1
  }

  const typeSummary = Object.entries(byType)
    .map(([type, count]) => `- ${issueTypeLabels[type] || type}: ${count}`)
    .join('\n')

  const issuesList = issues.map((issue, i) => {
    return `### Issue ${i + 1}: ${issueTypeLabels[issue.issue_type] || issue.issue_type}

**Location**: ${formatFileLocation(issue)}
**Code**: ${issue.code || 'N/A'}

\`\`\`
${issue.message}
\`\`\`
`
  }).join('\n---\n\n')

  return `## CI/CD Batch Fix Request ${batchInfo}

**Total Issues**: ${issues.length}
**Files Affected**: ${Object.keys(byFile).length}

### Issue Summary
${typeSummary}

---

## Issues to Fix

${issuesList}

---

### Fix Strategy

1. **Group by File**: Fix all issues in each file before moving to the next
2. **Type Priority**: TypeScript errors > Build errors > Lint errors > Test failures
3. **Verify Each**: After fixing each file, run the appropriate check
4. **Mark Resolved**: Mark issues as resolved as you fix them

### Verification Commands

\`\`\`bash
# TypeScript
npx tsc --noEmit

# Build
npm run build

# Lint
npm run lint

# Tests
npm test
\`\`\`

### Files to Edit (in order)

${Object.entries(byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([file, fileIssues]) => `- \`${file}\` (${fileIssues.length} issues)`)
  .join('\n')}

---

### After Completing This Batch

1. Run \`npx tsc --noEmit && npm run build && npm run lint\` to verify all fixes
2. Report: How many issues fixed, any that couldn't be fixed, any new issues discovered
3. If more batches remain, proceed to the next batch

**Dashboard Link**: https://ops.growthcohq.com/home/cicd
`
}
