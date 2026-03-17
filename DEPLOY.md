# Deploy Carl to carl.typelabs.ai

## Quick Deploy (2 minutes)

### 1. Get your Cloudflare Account ID and API Token

Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → select **typelabs.ai** → copy the **Account ID** and **Zone ID** from the right sidebar.

Then create an API Token: My Profile → API Tokens → Create Token → use the **"Edit Cloudflare Workers"** template.

### 2. Add GitHub Secrets

Go to [github.com/TypeLabsAI/carl-biovillage/settings/secrets/actions](https://github.com/TypeLabsAI/carl-biovillage/settings/secrets/actions) and add:

- `CLOUDFLARE_API_TOKEN` — your API token from step 1
- `CLOUDFLARE_ACCOUNT_ID` — your account ID from step 1

### 3. Set the Anthropic Key

```bash
npx wrangler secret put ANTHROPIC_API_KEY
# Paste your Anthropic API key when prompted
```

Or set it in the Cloudflare dashboard: Workers & Pages → carl-biovillage → Settings → Variables and Secrets.

### 4. Deploy

Push to main — GitHub Actions will auto-deploy. Or manually:

```bash
CLOUDFLARE_API_TOKEN=your_token npx wrangler deploy
```

### 5. DNS

The `wrangler.toml` routes `carl.typelabs.ai/*` to the Worker. Wrangler should auto-create the DNS record. If not, add a CNAME:

```
carl.typelabs.ai → carl-biovillage.<your-subdomain>.workers.dev
```

---

## What Gets Deployed

- **Worker** (`worker.js`) — handles `/api/chat` with Anthropic streaming + biomarker analysis
- **Static assets** (`public/`) — billboard hero, starfield, chat UI, cosmic destination card
- **Custom domain** — `carl.typelabs.ai` via Workers route
