# Contributing

## Getting Started

1. Clone the repo and run `npm install`
2. Run `npm run tauri:dev` to start the development server
3. Make your changes on a feature branch

## Development Workflow

- Run `npm run check:all` before committing
- Use `npm run fix:all` to auto-fix formatting and linting issues
- Follow the patterns documented in `docs/developer/`

## Commit Convention

Use Conventional Commits:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for code restructuring
- `test:` for adding tests
- `ci:` for CI/CD changes

## Code Signing

For macOS distribution, you need an Apple Developer account and a signing certificate. Set the following in `src-tauri/tauri.conf.json`:

```json
"macOS": {
  "signingIdentity": "Apple Distribution: Your Name (TEAM_ID)",
  "providerShortName": "TEAM_ID"
}
```

For Windows, set the signing certificate path in the `bundle` section.
