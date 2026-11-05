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

The app reads the existing `MONGODB_URI` from `.env.local`; `MONGODB_DB` is optional and defaults to `resumecraft`. If an Atlas SRV DNS lookup fails, the MongoDB client retries using Google and Cloudflare DNS; set the optional `MONGODB_DNS_SERVERS` to a comma-separated list to override those resolvers. Admin sign-in uses `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The session secret must be at least 32 characters; if `AUTH_SECRET` is present it signs both admin and user sessions and encrypts stored authenticator secrets. Contact and password-reset emails use the server-only Resend `RESEND_API_KEY` and `EMAIL_FROM` settings; configure `EMAIL_FROM` with a sender verified in Resend. Never commit `.env.local`.

Run locally:

```bash
npm install
npm run dev
```

## Routes and behavior

- `/` — home page and plans
- `/register`, `/login` — create/sign into a customer account; `/forgot-password` and `/reset-password` provide email OTP password reset
- `/build` — sign-in-required resume request form
- `/account` — update your profile or password with current-password confirmation, view your plan, generated resumes, and request history
- `/pricing` — Free, Premium, and Platinum plan details
- `/admin` — unlinked private admin entry; manage resume requests, contact messages, user accounts, website copy, support details, and n8n settings
- `/about`, `/contact`, `/privacy`, `/terms` — public information pages

Resume requests, generated resume files, contact messages, and customer accounts are stored in MongoDB Atlas. Contact form submissions are limited to five valid messages per IP address every 15 minutes, notify `ADMIN_EMAIL`, and send an acknowledgement to the visitor through Resend; if email delivery fails, the message remains saved in the admin inbox and the form reports that notification issue. Passwords are salted and hashed; password-reset OTP requests are limited to five per IP and three per email every 15 minutes, and verification attempts are limited to ten per IP and email every 15 minutes and five per OTP. Reset codes are single-use and expire after 10 minutes. The Free plan allows one request per account; Premium and Platinum request limits are configured in the admin-managed site content. No checkout is connected: an administrator changes a customer's plan manually. Requests and messages are created through the resume builder and contact form, and can be edited or deleted by an admin. Admins can add, edit, and delete user accounts.

Administrators can enable or disable authenticator-app two-factor authentication in **Admin → Settings**. Users can manage it from their account page. Setup requires the current password, a QR scan with an authenticator app, and verification of a current 6-digit code. When enabled, login requires both the account password and authenticator code. Disabling it requires the current password and code. Authenticator secrets are encrypted in MongoDB; failed code attempts are rate-limited.

Admin site content is edited through individual fields grouped into expandable sections in the Site content section. It includes homepage copy, feature cards, plan names/prices/limits, FAQs, about/contact pages, navigation labels, footer details, support phone/social links, the support avatar (upload JPG/PNG/WebP up to 1 MB or enter an image URL), and draft legal-page copy. Save changes to publish the edited content.

Configure both the n8n webhook URL and a shared secret in **Admin → Settings**. The secret must be at least 32 characters, is encrypted in MongoDB using the session secret, and is never returned to the browser. Use an HTTPS webhook URL (HTTP localhost is allowed during development). Every resume submission is sent to the configured URL with `POST` multipart form data and the `X-Webhook-Secret` header. The form sends `fullName`, `email`, `phone`, `targetJobTitle`, `workExperienceEducation`, `skillsProjects`, `jobDescription`, `resumeLanguage` (`English` or `Bangla`), `resumeTemplate` (`Minimal`, `Modern`, or `Professional`), and `professionalSummary`; `profilePhoto` (JPG/PNG/WebP, up to 5 MB) and `profileSummary` (PDF/DOC/DOCX/TXT, up to 10 MB) are optional file fields. When a profile summary is attached, the app extracts its text and sends it as `profileSummaryText` (up to 30,000 characters) alongside the original file. PDF extraction requires a text-based PDF; scanned/image-only files need OCR and are rejected with a form error. The payload also includes `requestId` and `userId` for associating the workflow output with the account.

The ready-to-import workflow is `resume-craft-ai-ready.json`. It uses `profileSummaryText` from the app and inserts the uploaded profile photo into the generated HTML, with a fallback if the AI response omits the photo placeholder. Re-select the n8n credentials after import and set the header-auth secret to the same value configured in Admin → Settings.

After generating a resume, configure the n8n workflow to:

1. **Save the resume in the app first.** Use an HTTP Request node with method `POST` and URL `https://<your-domain>/api/resumes`. Set the `X-Webhook-Secret` header to the same secret configured in Admin → Settings. Send the body as `multipart/form-data` with these fields:

   | Field | Type | Value |
   |---|---|---|
   | `requestId` | Form field | The `requestId` received with the original resume request |
   | `resume` | n8n binary file | The generated PDF, DOC, or DOCX file (up to 10 MB) |

   In n8n, enable sending binary data for the `resume` field and select the binary property produced by your document-generation step. Do not manually set the multipart `Content-Type` header; n8n must add its boundary. A successful upload returns HTTP `201` and a JSON response containing the saved resume ID. The app associates the upload with the user who owns `requestId`; n8n does not need to send `userId`.

2. **Email the generated resume.** After the upload succeeds, add an email node addressed to the `email` from the original resume request. Attach the same generated binary file. This way the app has saved the resume before n8n emails it; if the upload fails, the workflow should stop and report the error rather than sending an email for a resume that is not saved in the account.

The saved resume appears in the user's account, where they can preview/download it, delete it, or use its request to create a new resume.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
