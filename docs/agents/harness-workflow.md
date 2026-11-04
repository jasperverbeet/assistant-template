# Harness Workflow

This document defines the orchestration layer that sits on top of the repo
docs. Do not repeat architecture, coding standards, or project-specific rules
here. Those stay in root `AGENTS.md`, the skills under `.agents/skills/`, and the
repository docs those sources reference.

## When To Use This

Use this workflow for non-trivial work. In this repo that usually means
multi-file changes, architecture-sensitive changes, long-running work, or
anything likely to need review and repair loops.

## Required Pattern

### 1. Planner Step

Require an ExecPlan for non-trivial work. Follow `docs/plans/README.md` exactly.
The plan is the execution contract and restart artifact.
Every checked-in ExecPlan must include a brief near-top reference to this
file as the working protocol for the plan.

### 2. Implementer Agent

The implementer agent is allowed to code only against the current ExecPlan and
the repo docs. If the approach changes, the plan must change first.
The implementer must use semantic atomic commits and small incremental changes.

### 3. Independent Review

Independent agent review is not a completion requirement. Do not add a reviewer
step unless the user explicitly requests one.

### 4. Capability Gap Rule

If work stalls because the agent is missing required context, tooling, repro
steps, or observability, the next task is to close that gap instead of simply
retrying the prompt.

If the gap can be closed by reasonable agent work, do that work first and
record it in the ExecPlan, repo docs, or harness artifacts as appropriate.

If the gap cannot be closed without human help, raise it explicitly. The agent
must state what is missing, why it is blocking progress, what it already tried,
and the exact human action needed to unblock the task. Do not hide the blocker
behind vague failure language or repeated retries.

### 5. Mechanical Gates

Work is not done because the code looks right. It is done when the relevant
mechanical gates pass.

Follow the [shared diagnostics policy](../AGENTS.md#diagnostics) for local
checks, output handling, result reuse, and completion. Keep plan-specific
checks and their results in the ExecPlan.

Additional gates where relevant:

- CI
- architecture checks
- doc freshness checks
- task-specific assertions

## Minimal Loop

1. Human defines intent and constraints.
2. Planner step produces or updates the ExecPlan.
3. Implementer agent executes against that plan.
4. Implementer updates the plan with decisions and validation evidence.
5. Mechanical gates pass.

## Evidence

For harnessed work, leave behind enough evidence for another agent to continue:

- the current ExecPlan state
- the checks that were run
- any unresolved risks or skipped validation
