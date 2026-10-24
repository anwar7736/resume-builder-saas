# ResumeCraft AI

A Next.js resume-request service with MongoDB Atlas storage, customer accounts, admin-managed plans and site content, and a Free-plan request limit.

## Configuration

Configure these server-only variables in `.env.local`:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=resumecraft
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-long-private-password
ADMIN_SESSION_SECRET=use-at-least-32-random-characters
AUTH_SECRET=use-at-least-32-random-characters
RESEND_API_KEY=re_...
EMAIL_FROM=ResumeCraft AI <support@your-verified-domain.com>
```

The app reads the existing `MONGODB_URI` from `.env.local`; `MONGODB_DB` is optional and defaults to `resumecraft`. If an Atlas SRV DNS lookup fails, the MongoDB client retries using Google and Cloudflare DNS; set the optional `MONGODB_DNS_SERVERS` to a comma-separated list to override those resolvers. Admin sign-in uses `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The session secret must be at least 32 characters; if `AUTH_SECRET` is present it signs both admin and user sessions. Contact emails use the server-only Resend `RESEND_API_KEY` and `EMAIL_FROM` settings; configure `EMAIL_FROM` with a sender verified in Resend. Never commit `.env.local`.

Run locally:

```bash
npm install
npm run dev
```

## Routes and behavior

- `/` — home page and plans
- `/register`, `/login` — create/sign into a customer account
- `/build` — sign-in-required resume request form
- `/account` — current plan and request history
- `/pricing` — Free, Premium, and Platinum plan details
- `/admin` — unlinked private admin entry; manage resume requests, contact messages, user plans, website copy, support details, and webhook URL
- `/about`, `/contact`, `/privacy`, `/terms` — public information pages

Resume requests, contact messages, and customer accounts are stored in MongoDB Atlas. Contact form submissions are limited to five valid messages per IP address every 15 minutes, notify `ADMIN_EMAIL`, and send an acknowledgement to the visitor through Resend; if email delivery fails, the message remains saved in the admin inbox and the form reports that notification issue. Passwords are salted and hashed. The Free plan allows one request per account; Premium and Platinum request limits are configured in the admin-managed site content. No checkout is connected: an administrator changes a customer's plan manually.

Admin site content is edited through individual fields grouped into expandable sections in the Site content section. It includes homepage copy, feature cards, plan names/prices/limits, FAQs, about/contact pages, navigation labels, footer details, support phone/social links, the support avatar (upload JPG/PNG/WebP up to 1 MB or enter an image URL), and draft legal-page copy. Save changes to publish the edited content.

The admin panel stores the n8n webhook URL. Resume form submissions with an optional PDF, DOC, DOCX, or TXT attachment (up to 10 MB) are sent to that webhook as multipart form data, including the submitted resume details. File submissions require a configured webhook; submissions without an attachment remain stored in the app.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
