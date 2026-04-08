# Admin Commands

## Reset Password

Development state is persisted in:

- `.data/app-state.json`

To reset a user's password from the command line:

```bash
pnpm reset-password --username <username> --password <new-password>
```

Rules:

- password must be at least 8 characters
- password cannot contain Chinese characters
- username is matched in lowercase
