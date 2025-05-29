# Supabase Schema Setup

## Seeding the Database

1. Set your Supabase credentials in a `.env` file:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Run the seed script (add a script or run via ts-node):
   ```sh
   npx ts-node utils/seedSupabase.ts
   ```

## Running Tests

```sh
npm test
```
