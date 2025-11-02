# Reset User Password Function

This Edge Function lets an administrator reset a user's Supabase Auth password.

## Environment variables

Configure the function with the following variables (see `../.env.example` for placeholders):

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL (e.g. `https://xyz.supabase.co`). |
| `SERVICE_ROLE_KEY` | Service-role key for the project. **Never expose in client code.** |
| `ADMIN_RESET_TOKEN` | Custom bearer token; only requests with this token are allowed to perform resets. |

## Deploy

```bash
# Ensure you are logged into the Supabase CLI
supabase login

# Deploy the function
supabase functions deploy reset-user-password
```

When calling the function, send a `POST` request with:

```json
{
  "userId": "<Supabase Auth user ID>",
  "newPassword": "<new password>"
}
```

and include the header:

```
Authorization: Bearer <ADMIN_RESET_TOKEN>
```

> Keep the `SERVICE_ROLE_KEY` and `ADMIN_RESET_TOKEN` secret. Store them only in server-side environments or CI/CD secrets.
