# Email setup

Use an existing free personal @gmail.com account. Sale Watch uses Gmail SMTP directly; it does not buy a domain, subscribe to Google Workspace, or activate a paid API. Your Gmail address appears as the sender. The app caps all attempts (alerts, verification and resets together) at **80 per rolling 24 hours across all users**. Google can reject messages earlier. This is suitable for a small personal installation, not a bulk email service.

1. On your own device, enable Google 2-Step Verification if appropriate for your account, then create a Google app password: https://support.google.com/accounts/answer/185833 . Never put your normal password or app password into ChatGPT.
2. Stop Sale Watch with Ctrl+C. In the new app folder, double-click **Setup-Email.cmd**, or run `npm run setup-email` in a terminal.
3. Enter your personal Gmail address and the 16-character app password. Password input is hidden. Setup saves it in private `data/email.json` and sends no email.
4. Restart Sale Watch. Open **Settings → Notifications → Verify or change address**. Enter an address you own and request a code.
5. Enter the eight-digit code from your inbox. It expires after 15 minutes and allows five attempts. Check Spam if needed.
6. Turn **Email alerts** on, choose the minimum percentage drop (0 means any confirmed drop), and save.

To enable email password reset, verify the same address used to sign in. A different notification address does not enable reset for an unverified login address. Keep your recovery code as a fallback.

Changing the notification address turns alerts off and cancels pending alerts; enable alerts again after verification. A theme change keeps your alert preference.

## Limits and delivery

- There are no periodic reminder emails. A tracked item must show a confirmed decrease from its previously verified price; initial saving establishes a baseline.
- The application records an attempt before sending. Ambiguous SMTP failures are not retried automatically, which avoids duplicate attempts but can miss an email. An SMTP acceptance means the mail server accepted it, not that it reached the inbox.
- Reaching the app's daily cap defers queued alerts. Verification/reset requests must be retried later. There is no paid upgrade path.
- App passwords may be unavailable for certain Google account/security configurations. Do not weaken account security just to use this app. Email stays off if you cannot configure it.
- Google can revoke app passwords after a password change. Rerun local setup when necessary.
- Keep `data` private; it contains the database and email credential. Protect backups and restrict operating-system access, particularly on shared Windows PCs. Never upload this folder to a public repository.
- To disconnect: stop the server, remove `data/email.json`, revoke the app password in your Google account, and restart.

Real Gmail delivery has **not** been tested with your account. Automated tests and browser tests use a simulated transport and send no messages.

Official references reviewed for this update:
- App passwords: https://support.google.com/accounts/answer/185833
- Gmail sending limits: https://support.google.com/mail/answer/22839
- SMTP transport: https://developers.google.com/workspace/gmail/imap/imap-smtp
