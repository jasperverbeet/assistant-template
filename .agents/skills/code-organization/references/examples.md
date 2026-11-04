# Code Organization Examples

Use these examples when a boundary choice remains unclear. Adapt the names and
data source to the current project.

## Keep flow-specific loading visible

Prefer this shape when one flow owns the data need:

```ts
const updateAccountStatus = async () => {
  const account = await database.accounts.findById();
  const status = calculateAccountStatus(account);

  await database.accounts.update({ status });
};
```

Avoid a helper that hides both loading and the decision:

```ts
const updateAccountStatus = async () => {
  const status = await resolveAccountStatusWithDataLoading();

  await database.accounts.update({ status });
};
```

The second shape makes the caller's column needs and decision inputs harder to
inspect. It also couples a reusable name to one loading path.

## Keep a real data boundary

A shared data function is useful when it enforces one stable rule:

```ts
const listVisibleAccounts = async (actorId: string) =>
  database.accounts.findMany({
    where: buildAccountVisibilityFilter(actorId)
  });
```

Keep this boundary when multiple callers must use the same visibility rule. A
single caller can also justify it when bypassing the rule creates a security
risk.

## Allow a generic asynchronous utility

An asynchronous function can still be a good utility:

```ts
const withTransactionPolicy = async <T>(operation: () => Promise<T>) => {
  await applyTransactionPolicy();

  return await operation();
};
```

This function owns one reusable policy. It does not hide the query or business
decision that the caller supplies.

## Avoid layer chains without distinct ownership

Prefer one orchestrator that calls coherent leaves:

```text
request handler
  -> load required data
  -> apply domain rule
  -> store the result
```

Question a chain where each function only forwards to the next function:

```text
request handler
  -> service
    -> manager
      -> resolver
        -> data helper
```

Keep a deeper layer only when it owns a stable contract that the neighboring
layers do not own.

## Avoid file splitting by line count

Do not extract a helper only to shorten a file. First identify its contract,
owner, callers, and failure behavior. Keep the logic in the flow owner when no
independent boundary exists.
