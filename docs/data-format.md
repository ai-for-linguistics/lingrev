# Review data, version 1

The assistant writes `data/review.json`. `bin/lingrev.py check` checks its structure and `report` renders it. Neither command reviews the paper or validates the science.

The complete empty shape is in [templates/review.json](../templates/review.json). A populated example is in [examples/review.json](../examples/review.json).

All top-level fields are required:

| Field | Value |
| --- | --- |
| schema_version | The integer 1 |
| title, stage, manuscript, date, goals, summary | Strings; identify the actual manuscript version and review date |
| strengths, sources, coverage, checks, gaps | Arrays of strings. Record only inspected sources and performed checks in the corresponding lists |
| plan | Array of strings: ordered revision notes for the assistant and companion review; not displayed as a second Overview summary |
| findings | Array of findings, described below |

Each finding requires these string fields: `id`, `category`, `title`, `priority`, `status`, `resolution`, `location`, `evidence`, `why`, `action`, `effort`, `current`, `proposed`, `rewrite_note`, and `prompt`.

- `id` is stored as `F01`, `F02`, ... for compatibility and must be unique and stable across revisions. Display it as #01, #02, ... with a small # prefix. Copied instructions use the displayed numeric references; the assistant should resolve #01 to the stored F01. Never rename an existing comment just to change its appearance.
- `category` is freely chosen to suit the review. The default categories appear in METHOD.md.
- `priority` is `high`, `medium`, or `low`.
- `status` is `observed`, `concern`, `suggestion`, or `not checked`.
- `resolution` is `open`, `resolved`, or `retracted`. A resolution does not rewrite the historical evidence status. Record the reason in `action` and in `changes.md`.
- `location` and `evidence` identify inspected material and support the issue precisely.
- `effort` is an approximate author effort, including dependencies, or explicitly unknown.
- `current` and `proposed` hold brief original and suggested wording, or empty strings when a rewrite is inappropriate. `rewrite_note` explains any substantive change.
- `prompt` is a follow-up request the user can copy into the chat, including the finding ID.

The renderer escapes review data before embedding it and uses text nodes in the browser. It produces a single offline HTML file. The source template's three insertion markers must remain present exactly once each. Keep the data in JSON and let the renderer embed it. Never interpolate manuscript strings directly into HTML.

The HTML template contract is version 2, declared by `<meta name="lingrev-template" content="2">`; the JSON data schema remains version 1. To migrate an older `custom/report.html`, preserve the old file, start from the current kit template, and merge its custom preferences into that template. Do not simply add the new metadata to old markup. Preserve the project, review data, and comment IDs.

Scientific evidence, meaningful locators, review coverage, and appropriate interpretation still need inspection by the assistant and author.

## Richer scientific feedback and generation offers

These optional finding fields extend version 1 without invalidating existing reviews:

- `evidence_kind`: `paper`, `calculation`, `tool check`, `llm judgment`, `author judgment`, `proposal`, or `not checked`. This describes how the evidence was obtained, independently of priority, status, or resolution.
- `validation`: a string explaining what remains to be tested and how to test it. Required for `llm judgment`. An LLM judgment must have a provisional status (`concern`, `suggestion`, or `not checked`), never `observed`. The dashboard displays the basis and proposed validation inside the expanded row.
- `rewrites`: an array of objects with nonempty `label`, `current`, and `proposed` strings, and a `note` string (which may be empty). Use this for several aligned passage pairs or a current/proposed outline. Current and proposed text appear side by side. When this array has entries, it replaces the legacy single `current`/`proposed` display. Preserve the legacy required fields, using empty strings if needed.
- `figures`: an array of objects with `label`, `current`, `proposed`, and `note` strings. `current` and `proposed` are local PNG paths relative to the review project root; either may be empty, but at least one must identify an image. Paths must stay inside the project. Keep these source paths in `review.json`; the renderer embeds the PNGs as `data:image/png;base64` images in the portable report. Use this for actual current/proposed plots or table images, including a proposed-only additional plot. Explain the source data and changes in `note`; a new visualization does not by itself supply new statistical evidence.
- `offers`: an array of objects with `title`, `focus` (a nonempty array of bullet-point strings), and `prompt`. These are proposed next tasks, such as one abstract emphasizing theory, another emphasizing evidence, or five versions to compare. Offers do not claim that the versions already exist. The author copies a request into the chat to generate them.

Use categories that distinguish the scientific or editorial issue, for example Counterevidence, Candidate fact, Cross-linguistic extension, Principle clarification, Principle improvement, Local comment, Local rewrite, Paper structure, Terminology, New argument, New experiment, Future direction, or Alternative versions. Categories remain free text; use only those warranted by the manuscript.

Existing facts require inspected sources. A possible new fact or cross-linguistic contrast can begin with a provisional LLM judgment, but it needs a concrete invitation to test with competent speakers, an experiment, or appropriate data. A proposal is not a finding that an empirical test has passed.

Plot and table suggestions can use `rewrites` for aligned descriptions of the current presentation and proposed change, `figures` for actual PNG comparisons, and `offers` for requests to improve a figure or table or create an additional plot. Offers can also propose alternative titles, main headlines, or paper structures with bullet-point emphases. Offers describe possible work; they do not imply that a plot or analysis has been produced. Distinguish a clearer display of existing data from a new analysis or new evidence.

For a bounded online frequency comparison, record operational queries, source and retrieval date, comparable samples and denominators, ambiguity checks, and actual results in the evidence and checks. Use `validation` for remaining checks. Keep an unperformed analysis a `proposal` with `suggestion` or `not checked` status. Never invent counts or assume that X will exceed Y.

## Dashboard behavior

The default report uses a near-white, navy, and blue theme with compact tables, following the linglab report style. The default panels are Overview, Comments, Coverage & sources, and How to. Overview shows one prose summary, “Your review goals”, and “Identified strengths”; detailed prioritized items are in Comments, without a separate Overview plan box. Coverage & sources displays `sources`, `coverage`, `checks`, and `gaps`. How to simply invites the author to choose Comments to take into account, then expand the study, review, or form of the report. It shows two side-by-side illustrations, setup first and possibilities (`iterate.svg`) second, and a small linglab link for developing theories. The possibilities include updating the report for a new manuscript version. Detailed suggestions, generation offers, and copyable requests belong in Comments.

The report uses genuine tab panels and an expandable comments table. Sort ID, finding, category, priority, status, or resolution by clicking a column heading. Priority initially orders high before medium before low. Clicking the same heading reverses the order. There are no separate filter, search, or reset controls or count/order sentence above the table.

Each row expands to evidence, basis, validation, significance, actions, and effort as short paragraphs with inline bold labels, plus paired text or image comparisons and generation offers. Expansion state survives sorting. URLs such as `#findings/F01` open a comment directly; the data key remains `findings` and internal route names remain unchanged. Printing includes all panels and expanded comments regardless of the selected tab, using the browser's print command without a separate print button.

The renderer embeds the kit's setup and possibilities illustrations in its own `_illustrations` payload. Do not put illustration URLs or base64 data in the source review JSON. The populated example demonstrates the interface; it does not prescribe which categories or tasks a review must contain.
