# Contributing to Paper_Cut

Thank you for considering a contribution.

## 1. Branching strategy

Do not commit directly to `main`. Create a short-lived branch from the latest `main`:

- `feature/<short-description>` — new functionality
- `bugfix/<short-description>` — non-urgent bug fixes
- `hotfix/<short-description>` — urgent fixes
- `docs/<short-description>` — documentation-only changes
- `chore/<short-description>` — maintenance and tooling

Keep branches focused and up to date with `main`.

## 2. Commit messages

Use the Conventional Commits format:

```text
<type>(optional-scope): <imperative summary>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, and `chore`.

Examples:

- `feat(auth): add password reset flow`
- `fix(api): handle missing request fields`
- `docs: clarify local setup`

## 3. Before opening a pull request

- Pull the latest `main` and branch from it.
- Install dependencies using the repository's documented procedure.
- Run relevant tests, linting, and builds that are available.
- Review your own diff and remove unrelated changes.
- Update documentation when behavior or setup changes.

## 4. Pull request requirements

- All changes to `main` must be submitted through a pull request.
- Provide a clear summary, motivation, and testing evidence.
- Link related issues where applicable.
- Request review from the relevant code owner.
- Address review feedback and resolve conversations.
- Do not merge until required approvals and repository checks pass.

## 5. Code quality and security

- Follow existing project conventions and keep changes maintainable.
- Add or update tests for behavior changes.
- Do not commit credentials, tokens, private keys, personal data, or local environment files.
- Avoid introducing dependencies without a clear need.
- Keep pull requests small enough to review effectively.

## 6. Review and merge

A pull request may be merged only when GitHub reports all required reviews and checks as satisfied. The repository's branch protection settings take precedence over this guide.
