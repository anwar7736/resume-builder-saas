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

The app reads the existing `MONGODB_URI` from `.env.local`; `MONGODB_DB` is optional and defaults to `resumecraft`. If an Atlas SRV DNS lookup fails, the MongoDB client retries using Google and Cloudflare DNS; set the optional `MONGODB_DNS_SERVERS` to a comma-separated list to override those resolvers. Admin sign-in uses `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The session secret must be at least 32 characters; if `AUTH_SECRET` is present it signs both admin and user sessions and encrypts stored authenticator secrets. Contact emails use the server-only Resend `RESEND_API_KEY` and `EMAIL_FROM` settings; configure `EMAIL_FROM` with a sender verified in Resend. Never commit `.env.local`.

Run locally:

```bash
npm install
npm run dev
```

## Routes and behavior

- `/` — home page and plans
- `/register`, `/login` — create/sign into a customer account
- `/build` — sign-in-required resume request form
- `/account` — current plan, generated resumes, and request history
- `/pricing` — Free, Premium, and Platinum plan details
- `/admin` — unlinked private admin entry; manage resume requests, contact messages, user accounts, website copy, support details, and n8n settings
- `/about`, `/contact`, `/privacy`, `/terms` — public information pages

Resume requests, generated resume files, contact messages, and customer accounts are stored in MongoDB Atlas. Contact form submissions are limited to five valid messages per IP address every 15 minutes, notify `ADMIN_EMAIL`, and send an acknowledgement to the visitor through Resend; if email delivery fails, the message remains saved in the admin inbox and the form reports that notification issue. Passwords are salted and hashed. The Free plan allows one request per account; Premium and Platinum request limits are configured in the admin-managed site content. No checkout is connected: an administrator changes a customer's plan manually. Requests and messages are created through the resume builder and contact form, and can be edited or deleted by an admin. Admins can add, edit, and delete user accounts.

Administrators can enable or disable authenticator-app two-factor authentication in **Admin → Settings**. Users can manage it from their account page. Setup requires the current password, a QR scan with an authenticator app, and verification of a current 6-digit code. When enabled, login requires both the account password and authenticator code. Disabling it requires the current password and code. Authenticator secrets are encrypted in MongoDB; failed code attempts are rate-limited.

Admin site content is edited through individual fields grouped into expandable sections in the Site content section. It includes homepage copy, feature cards, plan names/prices/limits, FAQs, about/contact pages, navigation labels, footer details, support phone/social links, the support avatar (upload JPG/PNG/WebP up to 1 MB or enter an image URL), and draft legal-page copy. Save changes to publish the edited content.

Configure both the n8n webhook URL and a shared secret in **Admin → Settings**. The secret must be at least 32 characters, is encrypted in MongoDB using the session secret, and is never returned to the browser. Use an HTTPS webhook URL (HTTP localhost is allowed during development). Every resume submission is sent to the configured URL with `POST` multipart form data and the `X-Webhook-Secret` header. The form sends `fullName`, `email`, `phone`, `targetJobTitle`, `workExperienceEducation`, `skillsProjects`, `jobDescription`, `resumeLanguage` (`English` or `Bangla`), `resumeTemplate` (`Minimal`, `Modern`, or `Professional`), and `professionalSummary`; `profilePhoto` (JPG/PNG/WebP, up to 5 MB) and `profileSummary` (PDF/DOC/DOCX/TXT, up to 10 MB) are optional file fields. The payload also includes `requestId` and `userId` for associating the workflow output with the account.

After generating a resume, have n8n call `POST /api/resumes` as multipart form data with the original `requestId` and the generated file in the `resume` field. Include the same `X-Webhook-Secret` header. PDF, DOC, and DOCX files up to 10 MB are accepted. The API returns the generated resume ID; users can preview/download, delete, or use a saved request to create a new resume from their account page. The upload is associated with the account that owns the request, rather than an account ID supplied by n8n.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
