---
name: code-organization
description: Use this skill when designing or reviewing non-trivial application flows, extracting helpers, changing data-access boundaries, or simplifying layered code. It helps choose a small, coherent call graph with explicit responsibilities. Do not use it for type-only, formatting-only, generated, or trivial local edits.
---

# Organize Application Code

Design code around explicit responsibilities and evidence from the current
project. Treat these rules as defaults unless repository instructions make one
of them a requirement.

Read [references/examples.md](references/examples.md) when data-loading helpers,
call depth, or extraction choices remain unclear after the first design pass.

## Define the change contract

For a non-trivial flow, record these items in the plan or working notes:

1. State the required behavior.
2. Name the entry point that owns the flow.
3. List the data access and external effects.
4. Name the stable boundaries that the change must preserve.
5. State nearby behavior that the change will not support.

Inspect the nearest maintained implementation and all current callers. Existing
code provides evidence. It does not make every local pattern correct.

## Shape the call graph

Use one orchestration function to sequence the flow. It can coordinate data
access, external calls, transactions, retries, and error translation.

Use leaf functions for coherent rules, transformations, or boundary operations.
A leaf returns its result to the orchestrator instead of continuing the same
flow through another feature helper.

Keep the application call graph shallow by default. Add another layer only when
it owns a stable boundary, such as:

- A domain policy that has multiple callers.
- A persistence or external-service adapter.
- A transaction or authorization invariant.
- A reusable algorithm with an independent contract.
- A boundary that the project architecture requires.

Framework callbacks and general library utilities do not add an application
layer.

Apply the deletion test to each new abstraction. Keep the abstraction when its
removal would spread required complexity across callers. Remove it when its
removal makes the complexity disappear.

## Keep data needs explicit

Keep flow-specific data needs visible at the orchestration boundary. Pass loaded
values to synchronous decision logic when that structure stays clear.

Do not extract a function only because a database call is asynchronous. A data
access boundary is useful when at least one condition applies:

- Multiple callers share the same query semantics.
- The boundary enforces authorization, tenancy, or transaction rules.
- The query has a stable contract and independent tests.
- The project uses a repository or adapter architecture.

Avoid functions that combine hidden data loading with one flow-specific
decision. Prefer a small repeated query over a single-use wrapper when the
wrapper hides each caller's data needs.

## Justify helper extraction

Extract a helper when its contract meaningfully simplifies the caller. Look for
at least one supporting reason:

- Multiple current callers use the same operation.
- A pure operation has a stable, generic contract.
- One shared rule prevents behavior from drifting across callers.
- An external boundary needs focused error or resource handling.
- Direct tests protect an independent contract that simplifies the caller.

Treat one caller as a warning, not an automatic rejection. A single caller can
still justify a boundary through ownership or risk. Direct tests support that
decision but do not justify extraction alone.

Compare the complete flow before and after extraction. Check whether the caller
still coordinates the same details through several return fields and state
updates. Prefer keeping the operation together when extraction only moves those
details elsewhere.

Do not extract a helper only to rename a code block, wrap one query, hide nested
conditions, or discard useful return data. Use an assertion name when the
function validates a condition and throws.

Keep one primary implementation per file by default. Split a second function
into its own file only when the extraction passes the helper test.

## Keep related state together

Prefer one owner and representation for values that describe the same entity's
state and change together. Separate collections add synchronization work at each
transition. Keep them separate only when that separation provides a clear benefit.

Make each state understandable. Fewer collections alone do not justify an obscure
sentinel value or a more complex representation.

## Keep failure policy at the correct boundary

Let atomic operations fail quickly. Put retry, backoff, and user-facing fallback
policy in the orchestrator or workflow framework.

Catch an error inside a leaf only to add context, release a resource, or restore
required state. Rethrow the error after that work. Forward cancellation signals
to external operations when the caller provides one.

## Place code with its owner

Put shared code at the nearest common owner of its current callers. Keep
single-feature code inside that feature until another real caller needs it.

Keep schemas near the boundary that validates them. Keep constants with the
domain or feature that owns their meaning. Do not use a global `utils` folder as
the default destination for unrelated code.

## Check effectiveness

Before handoff or review, answer these questions with code evidence:

- Can a reader identify one owner for the flow?
- Does every layer own a stable responsibility?
- Does each new helper simplify its caller and pass the deletion test?
- Do related state transitions avoid unnecessary synchronized updates?
- Are data needs visible to the caller that owns the decision?
- Does one boundary own retry and fallback policy?
- Did the change reuse the nearest suitable implementation path?
- Did the change avoid support for unrequested neighboring cases?

When this skill changes the design, report the result in this form:

```text
Structure decision:
- Flow owner:
- Data and effects:
- Retained boundaries:
- Rejected abstractions:
- Maximum application depth:
```
