# Contributing to Sonovarem

Sonovarem is built by a four-person capstone team. Work is tracked on the Linear board (team Sonovarem-voice, project "Sonovarem Capstone PoC"). Each issue title starts with its task ID from the build plan, for example `T-155 · Walking skeleton`.

## Workflow

1. Pick an issue from the current sprint milestone and move it to **In Progress**.
2. Create a branch from `master`. Linear's suggested branch name works (`<user>/son-123-...`).
3. Keep the change to that one task. If the spec needs to change, amend `spec/` in the same pull request and add a line to `spec/CHANGELOG.md`.
4. Open a pull request that names the issue (`SON-123`) and says how you tested it. Another member reviews it before merge.

## Before you push

- Run `uv run prek run --all-files` (or install the hook once with `uv run prek install -f`).
- Add or update tests. Backend tests live in `backend/tests/`, browser tests in `frontend/tests/`.
- If the OpenAPI schema changed, run `bash scripts/generate-client.sh` and commit the result.
- New dependencies need a short reason in the pull request.

## Data and secrets

- Never commit `.env`, keys, tokens or real phone numbers.
- Never commit farmer audio, transcripts or personal data. Test data must be synthetic or from consented team recordings.

## Use of AI tools

You may use AI assistants. You remain responsible for every line you submit: read it, test it, and say in the pull request where an assistant did substantial work.
