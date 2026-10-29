# Floating social drawer

The bottom-right Connect button opens a social drawer on every page. It follows the current
theme, fits small screens and supports Escape, backdrop/close-button dismissal and native
dialog keyboard focus management. Existing page layouts and animations are unchanged.

Configure these public links in the ignored root `.env`:

```dotenv
SOCIAL_LINKEDIN_URL=
SOCIAL_GITHUB_URL=
SOCIAL_INSTAGRAM_URL=
SOCIAL_WHATSAPP_URL=
```

Use full HTTPS profile/company/repository URLs on the corresponding platform. Empty profiles
show Coming soon. WhatsApp defaults to the site's existing +919205617576 business number;
the optional WhatsApp URL overrides it. No usernames or profiles are invented.

The drawer fetches `/api/social-links` each time it opens. The endpoint reads environment
values at request time and returns only approved public profile URLs, with caching disabled.
Links are not baked into the frontend bundle. Invalid URLs and URLs containing credentials
are excluded. Private database/payment/admin variables are never returned.

Restart `npm run dev` after editing `.env` so the process receives the updated values. On
Vercel, add these names in Project Settings > Environment Variables and create a new deployment.
Never commit `.env`; `.env.example` contains the safe template.
