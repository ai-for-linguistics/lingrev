# Using lingrev

## Start with the prompt

Give your assistant [PROMPT.md](../PROMPT.md). It finds the kit and asks for what is missing. You can provide:

- Just the paper.
- The paper and relevant literature, as PDFs, other files, or links.
- The whole working folder, including code, data, and notes. Identify the current manuscript and any files to exclude.

You do not need to prepare a brief or choose review settings first. If you already know your deadline, target venue, or main concern, mention it. Otherwise the assistant starts with a short review and helps you choose what to do next.

Use an assistant that can read and write files and run commands. Python 3 is enough for the dashboard. In a chat without file tools, the assistant can provide a Markdown review instead. If it cannot find the kit, point it to the downloaded folder or [archive](../dist/lingrev-beta.zip).

## Before sharing material

The recommended use is review of your own work. Only provide other people's manuscripts, confidential review material, or sensitive data when you have permission and the service is appropriate. Material shared with an assistant may become accessible to AI agents, service providers, and companies operating its tools. Check the service's handling, retention, and settings before sharing unpublished or sensitive work.

Reviews use your assistant's credits or tokens. Set a budget for long jobs. This produces AI material. Inspect the evidence and preserve the strength of your claims. You decide what to change.

## Chat beside the dashboard

The assistant creates a review project and gives you the path to `report/index.html`. Open it in a browser beside the chat. Reload after each update. The chat is where you ask for work. The dashboard is where you read the result.

Copy buttons copy follow-up prompts for you to paste into the chat. They do not run work. If clipboard access fails, copy the visible selected prompt manually. You can change the dashboard itself just by asking.

In How to, choose which Comments to take into account, then consider expanding your study, the review, or the form of the report. Two side-by-side illustrations show the chat/report setup first and further possibilities second. You can supply a new manuscript version and ask for the report to be updated, improve the theory, or ask for another format. The link to [linglab](https://github.com/ai-for-linguistics/linglab) offers a way to develop and test theories. Specific suggestions and requests to copy stay in Comments.

## Reading the feedback

Overview gives one prose summary, your review goals, and identified strengths. Comments holds the detailed feedback: click a column heading to sort by ID, comment, category, priority, status, or resolution, and click again to reverse the order. Expand a row to read its evidence, proposed tests, and next actions as short labeled paragraphs. Coverage & sources records what was inspected, checks actually performed, and gaps.

Local rewrites show current and proposed passages side by side. Plot or table images can show current and proposed presentations, or a proposed additional figure. A structure suggestion can compare whole outlines. Generation offers describe possible emphases in bullet points and provide requests to copy into the chat, including a request for five abstract versions. The assistant generates them when you ask. The example dashboard illustrates these possibilities; your review should address the material and goals you supply.

Priority describes consequence. Status describes evidence:

| Status | Meaning |
| --- | --- |
| Observed | Supported directly by inspected material or a recorded check |
| Concern | Plausible issue needing verification |
| Suggestion | Optional editorial or research choice |
| Not checked | Work not yet performed |

Resolution (open, resolved, or retracted) records what happened next. A high-priority concern still needs checking. No findings in an area does not mean that area passed. Read coverage and gaps alongside the comments.

## Things to ask

```text
I have two hours to revise. What matters most, and what can wait?

For #02, show the exact passage and consider an alternative reading.

Check section 3 using the paper's exact definitions. Give a counterexample
if you think the argument fails. Separate informal and tool-checked steps.

Compare with these papers. Identify evidence in both sources for each
claimed difference. Mark sources you cannot access.

Show the current abstract beside five alternatives with different emphases.
Keep the claims no stronger than the evidence.

Suggest three presentation angles, each with a title, main headline,
and paper outline. Explain what each angle puts first.

Improve the presentation of figure 2 and table 1. Show what would change.
Suggest one additional plot and explain the question it would answer.

Propose a small online analysis to test whether structure X is more frequent
than Y. Define queries, comparable samples and denominators, and ambiguity
checks. Record the source, date, and actual results if you run it.

Separate needed checks, useful additions, and ambitious follow-ups.
Estimate author effort. I can spend one day on new analyses.

Suggest venues. Verify current scope and guidelines from official pages
if you can browse. Tell me what you could not verify.

Make a slide deck/handout from the revised argument.

Produce a Lean version of the theory and the facts.

Check claim X with Python.

Inspect the supplied analysis code, replay it with these data, and compare
the result with the paper. Record what ran and what could not be reproduced.

Here is the new manuscript version. Revisit the comments, preserve their IDs,
and update the review and report. Record what is resolved or still applies.

Make the dashboard simpler. Group everything by manuscript section.
```

Proof checking and comparison with linglib are optional deeper work. A tool-checked proof establishes a statement under specified assumptions, and its translation from the paper still needs review. Missing data limits reproducibility checks. Inaccessible sources limit literature comparisons. The assistant should say what it actually checked.

## Scientific feedback as well as editing

Ask about an existing fact that might contradict the theory, a new contrast worth testing, an unclear principle, an improved principle, terminology, or a new argument. Ask for cross-linguistic extensions or new experiments when they could discriminate between accounts. Local comments, local rewrites, overall structure, and future directions are equally valid feedback.

Feedback can also improve plots and tables, propose an additional plot, or offer different titles, main headlines, and paper structures. A small online analysis can test a frequency claim when suitable data are accessible. It needs reproducible queries, comparable samples and denominators, and ambiguity checks; the result may support either direction or remain inconclusive.

An LLM can help propose examples and give tentative judgments, including across languages. Those judgments are provisional hypotheses. Ask for the contexts, readings, competing predictions, and a plan to test them with competent speakers or data. An unchecked translation or a model's plausible answer does not establish a linguistic fact.

## Stop and resume

Your project keeps `brief.md` (goals and progress), `data/review.json` (findings and evidence), `review.md`, `changes.md`, and `report/index.html`. Additional material goes under `outputs/`. Manuscript originals stay intact unless you ask for edits.

Open the assistant in the project folder and say “Read utils/BOOTSTRAP.md and resume the review.” On a new manuscript version, ask which findings still apply. The assistant keeps IDs stable and records resolutions or retractions.

## For people extending the kit

The [bootstrap](../BOOTSTRAP.md) coordinates setup and iteration. [METHOD.md](../METHOD.md) defines review standards. The [data format](data-format.md) connects the assistant's review to the renderer. `bin/lingrev.py` provides `init`, `check`, and `report`. These commands manage files and validate structure. They do not supply AI judgments.

The assistant can use the relevant task playbook under `utils/moves/` after the first review: literature, code and data, formal analysis, or revisions and presentations. These are routes for doing useful work with the inputs and goals already available, rather than another setup questionnaire.

To change the report for one project, ask the assistant to create `custom/report.html` from the kit template, or update the existing custom version, preserving its three insertion markers. The renderer then uses the custom version. It embeds all assets and review data into a single HTML file, so the result opens offline without a server. The default report has a print stylesheet for the browser's print command, without an extra print button.

An older custom template may need migration to HTML template version 2. Keep a copy, use the current kit template as the starting point, and merge your layout preferences into it. Adding a version tag to the old markup does not migrate it. Your JSON review data remains schema version 1; keep the project files and comment IDs.
