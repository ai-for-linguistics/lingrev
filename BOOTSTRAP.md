# Starting or resuming a lingrev review

You are the assistant doing the review. The user has launched this workflow with the kit in `<project>/utils`. Resolve all commands below from the project folder. Translate the instructions to your own tools. No special assistant, sub-agents, account, or API is required.

## 1. Start or resume

Read `utils/METHOD.md` for review standards. Check file access, command execution, and Python 3 without interviewing the user about tools. Explain once, briefly and before reading the manuscript: lingrev recommends reviewing the user's own work. Material shared with the assistant may become accessible to AI agents, service providers, and companies operating the tools, with handling and retention depending on the service and settings. The user should share only material they have permission to share, especially for confidential manuscripts or sensitive data. The assistant uses their credits or tokens and they can set a budget. This produces AI material. Inspect the evidence and preserve the strength of your claims. You decide what to change. Do not claim any provider's particular privacy or training policy without verifying it. These notices do not require a separate consent questionnaire. Follow existing user authorization and ask only when a concrete missing permission matters. Do not install dependencies for the first pass.

If `data/review.json` exists, this is a resume. Read it, `brief.md`, and `changes.md`. Identify the manuscript version, what has already been inspected, and the next requested step. Do not reset the workspace. Run `python3 utils/bin/lingrev.py check .` and repair any data problems before rebuilding with `report .`. Briefly orient the user and continue their request.

For a new project, use the current manuscript and output folder already named by the author. Ask only for a missing paper, genuine ambiguity between drafts, or a project location that cannot be inferred. A paper alone is enough. Read supplied goals, target venue, time constraints, literature, and exclusions. Do not block the first pass on optional questions.

Run `python3 utils/bin/lingrev.py init .` to create the workspace and initial empty report. The command preserves existing files and stops at conflicts. Do not erase conflicts to force initialization. Fill `brief.md` with known goals and explicit assumptions. Preserve original manuscript files in place, and record their paths instead of moving them.

If Python or commands are unavailable, perform the same setup using file tools. Use `utils/templates/review.json` as the data shape and generate a local HTML report from the available template, or inline the assets yourself. If file writing is unavailable too, deliver a Markdown review in chat and explain this limitation. The scientific first pass should still proceed when the paper is readable.

## 2. Review automatically

Follow `utils/METHOD.md`. Inventory and read the available material, then write the first pass into `data/review.json`. State actual coverage and gaps. Write one prose summary, the author's review goals, and identified strengths for Overview. Start Comments with a small set of consequential comments (usually up to five); record revision order in the companion review and `plan`, not a second Overview box. Be specific to this manuscript. Follow the scientific and editorial suggestions in METHOD.md: counterevidence, candidate facts and provisional LLM judgments, cross-linguistic extensions, principle clarification or improvement, local and global rewrites, terminology, new arguments and experiments, and further directions. Include generation offers when useful, such as five abstract versions with different emphases. Do not invent findings just to cover these categories. Do not merely create a scaffold and wait for instructions when a readable paper is available.

Also consider clearer plots or tables, an additional plot, a bounded online check such as comparing frequencies of two structures, or alternative titles, main headlines, and paper structures. Follow METHOD.md for reproducible queries and fair comparisons. An online check tests a claim; it must not promise the preferred outcome. Save the first review before starting optional analyses.

The JSON contract is in `utils/docs/data-format.md`. Use stable IDs, evidence, manuscript locators, status, priority, and concrete actions. Display comment numbers as #01, #02, ... with a small # prefix. Existing data retain stored F01/F02 IDs; resolve user references like #01 to those IDs. For each reviewed area, distinguish what was checked from what was unavailable. Update the report metadata, sources, checks, and gaps, and replace the empty-template text. Write a human-readable `review.md` and record this first pass in `changes.md`.

Run:

```sh
python3 utils/bin/lingrev.py check .
python3 utils/bin/lingrev.py report .
```

The renderer creates `report/index.html` with inline assets. Open it if your tools support that. Give the user its full path and explain once: the chat is the input, the report is the output, reload after each update, and the work, review, and form of the report can change by asking. Use the current kit template and its blue theme: Overview, Comments, Coverage & sources, and How to. Comments has sortable column headings and expandable rows, without filters, search, reset, or count/order controls. Expanded rows use inline bold paragraph labels for evidence and next actions, aligned current/proposed passages or PNG images, and any generation offers with bullet-point emphases. Copy buttons only copy prompts for the chat.

Save this first usable review before starting optional extensions. Offer one recommended next step grounded in the actual findings. If the author already requested more work within a clear budget, continue without asking for the same permission again. Ask for a budget before a substantial unbounded extension, and keep estimates distinct from actual usage. Do not claim unavailable cost telemetry.

Read `utils/moves/README.md` to route the available inputs and actual request to a relevant task playbook. Use that playbook automatically for the next applicable step after saving the first review. These playbooks support literature comparisons, code and data checks, formal analysis, and revisions or presentations. Do not read the whole library or turn it into a preliminary questionnaire. Continue authorized work within the agreed scope and budget.

Keep How to simple: invite the author to choose which Comments to take into account, then to expand the study, review, or form of the report. Use two side-by-side illustrations, setup first and possibilities (`iterate.svg`) second, with a small linglab link for theory development. The possibilities include updating the report for a new manuscript version, improving the theory, and expanding the work or report. Do not add a print button. Put detailed tasks, specific suggestions, and copyable requests in Comments.

## 3. Iterate and persist

Interpret ordinary follow-up requests as changes to the current review: narrow the scope, challenge a finding, add sources, check facts or a derivation, formalize the theory in Lean, replay code or reproduce an analysis, add sources or plots, suggest venues, compare abstract/title/outline alternatives, make a slide deck/handout, or change the dashboard. Read the relevant sources and update the data. Record the evidence for any correction, resolution, or retraction. Keep IDs stable. Each finding has a `resolution` of open, resolved, or retracted, independent of its evidence status. Revisit findings affected by a new manuscript version rather than assuming that they still apply.

After each substantive step:

1. Update `data/review.json` and `review.md`.
2. Append a dated entry to `changes.md`, including finding IDs and what changed.
3. Update Done, Next, and Budget in `brief.md` so another session can resume.
4. Run `check .` then `report .` and fix errors.
5. Tell the user what changed, where to look, and one useful next step.

If asked to change the dashboard, first inspect any existing `custom/report.html` and preserve its agreed changes. If none exists, copy `utils/templates/report.html` there and edit that project copy. The renderer uses it automatically, with the same `__REVIEW_DATA__`, `__DASHBOARD_CSS__`, and `__DASHBOARD_JS__` insertion markers and `<meta name="lingrev-template" content="2">`. This template version is separate from review data schema version 1. If the renderer rejects an older custom template, preserve a copy, start from the current kit template, and merge the author's custom preferences into it. Do not bypass the check by adding new version metadata to old markup. Preserve the review data, project files, and comment IDs. Put additional requested deliverables under `outputs/`. Do not alter manuscript originals unless the author requests edits. Preserve prior wording or use a separate proposed revision.

## Workspace

- `brief.md`: goals, constraints, decisions, progress, budget.
- `data/review.json`: review metadata, plan, findings, coverage, and evidence.
- `report/index.html`: the generated dashboard, fully local and portable.
- `review.md`: a readable companion review maintained by the assistant.
- `changes.md`: update history maintained by the assistant.
- `custom/`: optional project-specific report template.
- `outputs/`: additional abstracts, outlines, slides, or analyses as requested.
- `utils/`: this kit. Preserve it so the project can resume.

The initializer adds short `AGENTS.md` and `CLAUDE.md` pointers only if those files do not already exist. Respect existing project instructions. They may require the assistant to open this bootstrap file explicitly in a later session. Never claim that automated checks validate scientific judgments: the commands check data structure and render the assistant's review.
