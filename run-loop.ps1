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
        [Parameter(Mandatory = $true)]
        [string]$Commit
    )

    $args = @(
        "--model", $ReviewModel,
        "--config", "model_reasoning_effort=`"$ReviewEffort`"",
        "review",
        "--commit", $Commit
    )

    Invoke-Native -Args ($args + @($Prompt))
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

    $tasks = Get-Content -LiteralPath "TASKS.md" -ErrorAction SilentlyContinue
    $remaining = $tasks | Where-Object { $_ -match "^\- \[ \]" }

    if (-not $remaining) {
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

If all tasks are done, output exactly: ALL COMPLETE
Only work on ONE task per run.
"@

    Write-Host $build

    if ($build -match "ALL COMPLETE") {
        Write-Host ">> Builder reports all complete." -ForegroundColor Green
        break
    }

    $headAfterBuild = git rev-parse HEAD

    if ($headBeforeBuild -eq $headAfterBuild) {
        throw "Builder finished without creating a commit. Stopping loop."
    }

    Write-Host ">> Reviewing last commit..." -ForegroundColor Magenta

    $review = Invoke-CodexReview -Commit $headAfterBuild -Prompt @"
Review the last git commit against PRD.md and TASKS.md.

Find the task most recently marked [x].
Check acceptance criteria.
Focus bugs, missed requirements, regressions, and test gaps.

Output PASS or FAIL.
If FAIL, give max 3 specific reasons with file paths and line numbers.
"@

    Write-Host $review

    if ($review -match "\bFAIL\b") {
        $turnCount++
        Write-Host ""
        Write-Host ">> Review FAILED (turn $turnCount/$MaxTurns). Retrying task..." -ForegroundColor Red
        continue
    }

    if ($review -notmatch "\bPASS\b") {
        throw "Reviewer did not output PASS or FAIL. Stopping loop."
    }

    $turnCount = 0
    Write-Host ">> PASSED. Moving to next task." -ForegroundColor Green
}

Write-Host ""
Write-Host ">> Loop complete." -ForegroundColor Cyan
