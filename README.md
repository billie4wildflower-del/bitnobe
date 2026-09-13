# autonoma-bank

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_CzVQy4c3zN40JOyiFhQ3zDWFDMrG)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment configuration

Set these environment variables in v0/Vercel before using authenticated or administrative features:

```env
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=https://your-deployment.example
ADMIN_EMAILS=manager@example.com
ADMIN_SUPPORT_EMAILS=support@example.com
ADMIN_MANAGER_EMAILS=manager@example.com
ADMIN_ENGINEERING_EMAILS=engineering@example.com
NEXT_PUBLIC_BUSINESS_MOBILE_APP_URL=https://your-app-release.example/mobile
NEXT_PUBLIC_BUSINESS_DESKTOP_DOWNLOAD_URL=https://your-app-release.example/desktop
EMAIL_FROM=BitNobe <verification@example.com>
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=verification@example.com
SMTP_PASSWORD=replace-with-mailbox-app-password
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=verification@example.com
IMAP_PASSWORD=replace-with-mailbox-app-password
```

`ADMIN_EMAILS` remains the legacy manager fallback. Support agents can view and respond to members; manager and engineering roles can perform account, security, balance, and transaction operations.

New accounts require email verification. Configure the server-side SMTP mailbox values above in v0/Vercel; users only receive a verification link and never see or submit mailbox credentials. IMAP values are reserved for future inbound support-mail automation.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
