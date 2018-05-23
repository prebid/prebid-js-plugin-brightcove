## Summary
We take PR review seriously. Please read https://medium.com/@mrjoelkemp/giving-better-code-reviews-16109e0fdd36#.xa8lc4i23 to understand how a PR review should be conducted. Be rational and strict in your review, make sure you understand exactly what the submitter's intent is. Anyone in the community can review a PR, but a Prebid Org member is also required. A Prebid Org member should take ownership of a PR and do the initial review.

For modules and core platform updates, the initial reviewer should request an additional team member to review as a sanity check. Merge should only happen when the PR has 2 `LGTM` from the core team and a documentation PR if required.

### General PR review Process
- Checkout the branch (these instructions are available on the github PR page as well).
- Verify PR is a single change type. Example, refactor OR bugfix. If more than 1 type, ask submitter to break out requests.
- Verify code under review has at least 50% unit test coverage. If legacy code has no unit test coverage, ask for unit tests to be included in the PR.
- Verify all tests are passing by running `gulp test`
- Verify no code quality violations are present from linting (should be reported in terminal) by running `gulp lint`
- Review for obvious errors or bad coding practice / use best judgement here.
- If the change is a new feature / change to core plugin - review the change with a Tech Lead on the project and make sure they agree with the nature of change.
- If the change results in needing updates to docs (such as public API change, module interface etc), add a label for "needs docs" and inform the submitter they must submit a docs PR to update the appropriate area of Prebid.org **before the PR can merge**. Help them with finding where the docs are located on prebid.org if needed. 
- If all above is good, add a `LGTM` comment and request 1 additional core member to review.
- Once there is 2 `LGTM` on the PR, merge to master
- Ask the submitter to add a PR for documentation if applicable.
- Add a line into the [draft release](https://github.com/prebid/prebid-js-plugin-brightcove/releases) notes for this submission. If no draft release is available, create one using [this template]( https://gist.github.com/mkendall07/c3af6f4691bed8a46738b3675cb5a479)

## Ticket Coordinator

Each week, Prebid Org assigns one person to keep an eye on incoming issues and PRs. That person should:
- Review issues and PRs at least once per weekday for new items.
- For PRs: assign PRs to individuals on the PR review list. Try to be equitable -- not all PRs are created equally. Use the "Assigned" field and add the "Needs Review" label.
- For Issues: try to address questions and troubleshooting requests on your own, assigning them to others as needed.
- Issues that are questions or troubleshooting requests may be closed if the originator doesn't respond within a week to requests for confirmation or details.
- Issues that are bug reports should be left open and assigned to someone in PR rotation to confirm or deny the bug status.
- It's polite to check with others before assigning them large tasks.
- If possible, check in on older items and see if they can be unstuck.
