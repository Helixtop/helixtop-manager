# AI Assistant Setup & Deployment

The AI features (Pricing & Marketing Content) now run securely on a Supabase
Edge Function. This ensures your API Key is never exposed and allows us to
customize the AI's behavior remotely.

## Prerequisite: Supabase CLI

Ensure you have the Supabase CLI installed and logged in.

## 1. Deploy the Edge Function

Run the following command in your terminal to deploy the new AI assistant:

```bash
supabase functions deploy ai-assistant --no-verify-jwt
```

_Note: The `--no-verify-jwt` flag is optional if you want to enforce
authentication, but typically for internal tools or initial setup, it simplifies
access. Our code currently expects an authenticated user via
`supabase.functions.invoke` which handles the JWT automatically, so standard
deployment works too._

**Recommended Command:**

```bash
supabase functions deploy ai-assistant
```

## 2. Set the API Key Secret

You mentioned you put the key in the function secrets. Please verify it is set
for this specific function or globally:

```bash
supabase secrets set GEMINI_API_KEY=your_key_here
```

To verify it's set:

```bash
supabase secrets list
```

## 3. Verify Functionality

Once deployed:

1. Go to **Marketing** -> **Add Content**.
2. Click **Get Gemini Suggestions**.
3. Or go to **Sales** / **AI Pricing** pages to test the pricing engine.

If you see "AI Service unavailable", checks the logs in your Supabase Dashboard
-> Edge Functions -> ai-assistant -> Logs.
