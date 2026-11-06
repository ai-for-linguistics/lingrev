# Reviewing principles and formal arguments

Begin with the paper's actual definitions, principles, scope, and worked examples. An informal check can be useful even when no proof assistant is available. Installing a formal toolchain is not a prerequisite for the first review.

1. Locate the claim precisely and reconstruct it under the author's assumptions. Explain ambiguous notions and show how different readings change predictions.
2. Check derivations and worked examples. For a suspected failure, give the steps or a concrete candidate counterexample and consider alternative interpretations. Keep paper errors separate from errors introduced by your reconstruction.
3. If improving a principle, show original and proposed formulations separately. Explain the gain, possible loss, and examples on which the accounts differ. Suggest new facts, cross-linguistic extensions, or experiments when they would discriminate between them.
4. For Python or proof checking, record the translation from the paper to code. State the domain or fragment tested and the assumptions. Finite checks do not establish claims outside the checked domain. A Lean proof establishes the encoded statement, while translation fidelity still needs review.
5. If formal tools or a library are already supplied, inspect the relevant definitions and versions. If the author requests comparison with linglib or work with linglab, use the accessible project/library and identify what you actually inspected. Do not claim an integration or a completed check from a link alone. Treat new installations or substantial computation as additional scoped work.
6. Record actual commands, outcomes, and gaps. An attempted build or proof with holes is not a successful verification. Put the implications and next tests in Comments.

LLM judgments can help generate candidate examples or interpretations, but remain provisional. Give contexts, readings, and a plan for testing them with speakers or data. Do not turn a plausible model judgment into an established linguistic fact.
