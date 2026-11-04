---
name: asd-ste100
description: 'Write and rewrite English into ASD-STE100 Simplified Technical English — one meaning per word, active voice, simple tense, short sentences. Load this whenever writing or refactoring TSDoc, code comments, README or docs prose, commit and PR text, or any repository documentation. Also use when tightening text a model, translation pipeline, or non-native reader must parse: tool descriptions, system and agent prompts, inter-agent instructions, and log or status messages.'
---

# Simplified Technical English (ASD-STE100)

ASD-STE100 is a controlled-language standard from the aerospace and defense
industry. It removes the two largest sources of misreading: words that carry
more than one meaning, and sentences that allow more than one structure.

Apply that discipline to text a machine or a non-native reader must parse
without a back-channel. A model reading a tool description has the same problem
as a technician reading a manual on a tarmac: no author to ask.

## When to use

This is the writing standard for all repository documentation. Load it before
you write or refactor:

- TSDoc blocks and code comments.
- Skill files, `AGENTS.md`, plan documents, and other Markdown in the
  repository.
- Commit messages, pull request bodies, and issue text.
- Tool descriptions, system and agent prompts, and inter-agent instructions.
- Log, status, and job messages.

Also use it on demand when a caller asks for a before/after table that names
the rule each sentence broke.

Do not apply this to creative, marketing, or persuasive copy — STE is
deliberately flat and literal.

## Rules

| Rule                     | Do                                                      | Don't                                                          |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------------------- |
| One word, one meaning    | Reuse one verb for one action ("check" everywhere)      | Rotate synonyms — check, verify, confirm — for the same action |
| One part of speech       | "Apply oil to the valve" (oil as noun)                  | "Oil the valve" (oil as verb)                                  |
| Active voice             | "The agent deletes the file."                           | "The file is deleted." — unless the actor is genuinely unknown |
| Simple tenses            | "We received the report."                               | "We have received the report."                                 |
| One instruction per line | "Open the file. Read line 3."                           | "Open the file and read line 3, then check it matches."        |
| Sentence length          | 20 words or fewer for instructions, 25 for descriptions | Long compound or subordinate-clause sentences                  |
| Noun clusters            | 3 words at most ("fuel pump valve")                     | "high pressure fuel pump inlet valve assembly"                 |
| No ellipsis              | Keep subject, verb, and article explicit                | Drop words to save space — it adds ambiguity, not clarity      |
| Paragraphs               | One topic, 6 sentences at most                          | Multi-topic paragraphs                                         |
| Lists                    | Use a list for 3 or more steps or conditions            | Bury a sequence inside one prose sentence                      |
| Domain terms             | Keep necessary technical terms and define each one once | Use jargon that the text never defines                         |

## TSDoc and code comments

`house-style` sets the structure: `/** */` blocks only, never `//`, with
`@param` and `@returns` on every exported non-React function. This skill sets
the prose inside that structure.

- Open a description with a simple-present verb that states what the function
  does: "Resolves the loaded group relations into one access object."
- Write one fact per sentence. Split a comment that carries both a behaviour and
  its reason.
- Name the actor. Write "The caller must load the relations" instead of "The
  relations must be loaded".
- Keep `@param` and `@returns` text to one sentence each. Move the reasoning
  into the description above them.
- Comment the intent or the constraint, not the line below it. A comment that
  restates the code adds a second thing to keep correct.
- Use the same verb for the same action across a file. Do not alternate between
  "checks", "verifies", and "validates" for one behaviour.

Apply the same rules to Markdown in the repository: one topic per paragraph, a
list for three or more steps, and no noun stack longer than three words.

## Process

1. Read the input once for meaning. Do not rewrite before you know what the
   text must still say.
2. Walk it sentence by sentence. Flag every rule the sentence breaks.
3. Rewrite each flagged sentence. Preserve the meaning exactly.
4. Produce the before/after table below.
5. If the input already complies, say so. Do not force changes onto compliant
   text.

Keep the longer phrasing when a rewrite would drop a safety condition, a scope
qualifier, or a number. Flag the trade-off instead of simplifying it away.

## Output format

```markdown
| Rule violated           | Original                                | Simplified                                  |
| ----------------------- | --------------------------------------- | ------------------------------------------- |
| Present perfect tense   | "We have received your request."        | "We received your request."                 |
| Noun cluster (4+ words) | "the agent task queue priority handler" | "the handler that sets task-queue priority" |
```

After the table, add one line on anything you deliberately did not simplify,
and why.

## Boundaries

This skill applies the principle behind ASD-STE100 — pick the plainest word and
use it the same way every time. It does not reproduce ASD's approved dictionary
of roughly 900 words. Treat the official download at https://www.asd-ste100.org/
as the source of truth when exact approved wording matters. This is a clarity
tool, not a certified STE authoring tool.

Never drop a safety condition, an exception, or a scope qualifier to shorten a
sentence.

## References

- [references/writing-rules.md](references/writing-rules.md) — the 9 rule
  sections and dictionary structure, with citations. Read it when you need the
  rule behind an edit, or when citing the standard.
- [references/before-after.md](references/before-after.md) — worked examples for
  tool descriptions, error strings, and inter-agent instructions. Read it before
  a large rewrite.

Adapted from https://github.com/danyuchn/asd-ste100-skill (MIT, see `LICENSE`).
