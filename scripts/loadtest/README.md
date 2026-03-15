# Load Testing (k6)

This suite runs four scenarios simultaneously:

1. 500 dashboard loads
2. 2000 check-ins
3. 1000 AI chats
4. 200 payments

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OWNER_JWT` (owner or super_admin token)
- `MEMBER_JWT` (member token)
- `CHECKIN_MEMBER_IDS` (comma-separated UUIDs)
- `PAYMENT_MEMBER_IDS` (comma-separated UUIDs)

Optional:
- `AI_QUESTION`

## Run (PowerShell)

```powershell
scripts\\loadtest\\run-k6.ps1
```

## Notes

- Use a staging environment only. The test will create attendance rows and payment intents.
- Ensure the member IDs are valid and belong to the same gym as the JWT used.
