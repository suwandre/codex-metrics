param(
    [int]$MaxIterations = 30,
    [int]$MaxTurns = 5,
    [string]$BuildModel = "gpt-5.5",
    [string]$BuildEffort = "medium",
    [string]$ReviewModel = "gpt-5.5",
    [string]$ReviewEffort = "high"
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    $output = & codex @Args 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-Host $output
        throw "codex exited with code $exitCode"
    }

    return $output
}

function Test-WorkingTreeChanges {
    $status = git status --porcelain --untracked-files=all
    return [bool]$status
}

function Get-RemainingTaskCount {
    $tasks = Get-Content -LiteralPath "TASKS.md" -ErrorAction SilentlyContinue
    $remaining = $tasks | Where-Object { $_ -match "^\- \[ \]" }
    return $remaining.Count
}

function Reset-CurrentTaskForRetry {
    $lines = @(Get-Content -LiteralPath "TASKS.md")
    $firstIncompleteIndex = -1

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\- \[ \]") {
            $firstIncompleteIndex = $i
            break
        }
    }

    $startIndex = $lines.Count - 1

    if ($firstIncompleteIndex -gt 0) {
        $startIndex = $firstIncompleteIndex - 1
    }

    for ($i = $startIndex; $i -ge 0; $i--) {
        if ($lines[$i] -match "^\- \[x\] (.+)$") {
            $task = $Matches[1] -replace " \[REVIEW FAILED\]$", ""
            $lines[$i] = "- [ ] $task [REVIEW FAILED]"
            Set-Content -LiteralPath "TASKS.md" -Value $lines
            return
        }
    }

    throw "Could not find completed task to reset after review failure."
}

function Write-AgentOutput {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Output,
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $Output | Set-Content -LiteralPath $Path

    $lineCount = $Output.Count
    if ($lineCount -le 80) {
        Write-Host $Output
        return
    }

    Write-Host ">> Output is $lineCount lines. Full log: $Path" -ForegroundColor DarkGray
    Write-Host ">> Last 80 lines:" -ForegroundColor DarkGray
    $Output | Select-Object -Last 80 | Write-Host
}

function Invoke-CodexBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt
    )

    $args = @(
        "--model", $BuildModel,
        "--config", "model_reasoning_effort=`"$BuildEffort`"",
        "--sandbox", "workspace-write",
        "--ask-for-approval", "never",
        "exec"
    )

    Invoke-Native -Args ($args + @($Prompt))
}

function Invoke-CodexReview {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Prompt,
        [string]$Commit = ""
    )

    $args = @(
        "--model", $ReviewModel,
        "--config", "model_reasoning_effort=`"$ReviewEffort`"",
        "review"
    )

    if ($Commit) {
        $args += @("--commit", $Commit)
        Invoke-Native -Args ($args + @($Prompt))
    }
    else {
        $args = @(
            "--model", $ReviewModel,
            "--config", "model_reasoning_effort=`"$ReviewEffort`"",
            "--sandbox", "read-only",
            "--ask-for-approval", "never",
            "exec"
        )

        $uncommittedPrompt = @"
$Prompt

Review the current uncommitted working tree changes. Do not edit files. Do not run destructive commands.
"@

        Invoke-Native -Args ($args + @($uncommittedPrompt))
    }
}

if (-not (Test-Path -LiteralPath "PRD.md")) {
    Write-Host ">> No PRD.md found. Generating..." -ForegroundColor Cyan

    Invoke-CodexBuild @"
Read the codebase. Ask no questions. Infer the project goal.

Create PRD.md with:
- Project goal
- Scope
- Task list as checkboxes [ ]
- Acceptance criteria per task
- Out of scope

Do not implement anything.
"@

    Write-Host ">> PRD.md generated. Review it, then rerun this script." -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path -LiteralPath "TASKS.md")) {
    Write-Host ">> No TASKS.md found. Generating from PRD.md..." -ForegroundColor Cyan

    Invoke-CodexBuild @"
Read PRD.md. Extract all work into TASKS.md.

Format:
- [ ] task description

Keep tasks small.
Include acceptance notes under each task if useful.
Do not implement anything.
"@

    Write-Host ">> TASKS.md generated." -ForegroundColor Green
}

Write-Host ">> Starting Codex build loop (max $MaxIterations iterations, max $MaxTurns turns per task)..." -ForegroundColor Cyan

$turnCount = 0

for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-Host ""
    Write-Host "-- Iteration $i ------------------------------" -ForegroundColor DarkGray

    if ((Get-RemainingTaskCount) -eq 0) {
        Write-Host ">> All tasks complete." -ForegroundColor Green
        break
    }

    if ($turnCount -ge $MaxTurns) {
        Write-Host ">> Max turns ($MaxTurns) reached without PASS. Marking task for human review." -ForegroundColor Yellow

        (Get-Content -LiteralPath "TASKS.md") -replace "^\- \[x\] (.+)$", "- [?] `$1 [NEEDS HUMAN REVIEW]" |
            Set-Content -LiteralPath "TASKS.md"

        $turnCount = 0
        continue
    }

    Write-Host ">> Building... (turn $($turnCount + 1)/$MaxTurns)" -ForegroundColor Blue
    $headBeforeBuild = git rev-parse HEAD

    $build = Invoke-CodexBuild @"
Read PRD.md and TASKS.md.

Find the next incomplete task marked [ ].
Implement only that task.
Run relevant checks.
Commit with a conventional commit message.
Mark the task complete [x] in TASKS.md only if acceptance criteria pass.

Only work on ONE task per run.
"@

    Write-AgentOutput -Output $build -Path ".codex-build-$i.log"

    $headAfterBuild = git rev-parse HEAD
    $reviewCommit = ""

    if ($headBeforeBuild -ne $headAfterBuild) {
        $reviewCommit = $headAfterBuild
        Write-Host ">> Reviewing commit $reviewCommit..." -ForegroundColor Magenta
    }
    elseif (Test-WorkingTreeChanges) {
        Write-Host ">> No commit created. Reviewing uncommitted changes..." -ForegroundColor Magenta
    }
    else {
        throw "Builder finished without a commit or working-tree changes. Stopping loop."
    }

    $review = Invoke-CodexReview -Commit $reviewCommit -Prompt @"
Review the latest task changes against PRD.md and TASKS.md.

Find the task most recently marked [x].
Check acceptance criteria.
Focus bugs, missed requirements, regressions, and test gaps.

First line must be exactly PASS or FAIL.
If FAIL, give max 3 specific reasons with file paths and line numbers.
"@

    Write-AgentOutput -Output $review -Path ".codex-review-$i.log"

    if ($review -match "(?m)^\s*FAIL\s*$") {
        $turnCount++
        Reset-CurrentTaskForRetry
        Write-Host ""
        Write-Host ">> Review FAILED (turn $turnCount/$MaxTurns). Retrying task..." -ForegroundColor Red
        continue
    }

    if ($review -notmatch "(?m)^\s*PASS\s*$") {
        throw "Reviewer did not output PASS or FAIL. Stopping loop."
    }

    $turnCount = 0
    Write-Host ">> PASSED. Moving to next task." -ForegroundColor Green
}

Write-Host ""
Write-Host ">> Loop complete." -ForegroundColor Cyan
