# AGENTS protocol appendix

This appendix records two extra rules for future Image Studio work.

## Planned task protocol

When Max explicitly asks to do a task with a plan, first create a staged checklist and update it during implementation.

Checklist marks:

- [ ] not started
- [~] in progress or partially done
- [x] done and verified

Before each stage, describe the intended code changes and evaluate whether they would add technical debt, weaken architecture, increase coupling, or make future extension harder.

If the planned stage would harm maintainability, first do a small preparatory refactor that removes that risk, then continue with the stage.

Prefer maintainable extension points over repeated edits. Favor data-driven descriptions, strategies, registries, adapters, and placements. Provider-specific and model-specific logic should be extensible without changing every central type and every UI component for each new parameter or capability.

For example, provider-specific parameters should be described by a strategy or declarative descriptor that reports what parameters it owns, how they are validated, and how they are rendered.

## Finished branch workspace lifecycle

After Max explicitly accepts an update, the branch is pushed, the merge into main succeeds, the main checkout is updated, and the separate branch workspace is no longer needed, close that temporary workspace so old branch copies do not accumulate.

Do not close a branch workspace before explicit acceptance and a successful merge into main.
