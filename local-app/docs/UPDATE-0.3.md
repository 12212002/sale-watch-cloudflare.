# Update 0.3

This ZIP contains the complete app, not patches. Follow the README steps to preserve your old data folder.

Added Hollister exact-size CAD validation and Indigo physical-book ISBN/edition validation. Added locally configured Gmail delivery, expiring verification codes, verified-login-email reset, notification on/off and minimum-discount controls, and inline images when available. Daily email attempts are capped at 80 for the whole installation, with persistent duplicate-attempt prevention.

Fixed sign-out losing server capabilities, theme changes disabling email alerts, ambiguous email-control labels and a missing-glyph add button. Changed-address verification cancels pending alerts and requires explicit re-enabling. Updated the PWA shell cache.

137 offline tests passed. Browser flows covered registration, recovery-code display, add/variant verification/save, history, email verification/preferences, theme persistence, mobile overflow, export, logout and email reset. Email transport was simulated. Selected live Hollister and Indigo products passed authenticated API checks.

No external account, billing plan or public host was activated. Real emails have not been sent. Store coverage remains limited to five integrations. Consult STATUS.md and EMAIL-SETUP.md before relying on alerts.

The vendored Nodemailer runtime includes its original license in vendor/nodemailer. No npm install is required.
