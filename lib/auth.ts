import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"
import { sendVerificationEmail } from "@/lib/email"

export function isAdminEmail(email: string) {
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return allowedEmails.includes(email.trim().toLowerCase())
}

export type AdminRole = "support" | "manager" | "engineering"

export function getAdminRole(email: string): AdminRole | null {
  const normalizedEmail = email.trim().toLowerCase()
  const matches = (key: string) => (process.env[key] ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean).includes(normalizedEmail)
  if (matches("ADMIN_ENGINEERING_EMAILS")) return "engineering"
  if (matches("ADMIN_MANAGER_EMAILS") || isAdminEmail(normalizedEmail)) return "manager"
  if (matches("ADMIN_SUPPORT_EMAILS")) return "support"
  return null
}

function resolveBaseURL() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.V0_RUNTIME_URL
}

function resolveTrustedOrigins() {
  const origins: string[] = []
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000")
    for (const key of ["V0_RUNTIME_URL", "V0_DEV_APP_URL", "V0_BUILD_URL", "V0_SANDBOX_URL"]) {
      const value = process.env[key]
      if (value) origins.push(value)
    }
  } else {
    if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`)
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  }
  return origins
}

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 }),
  baseURL: resolveBaseURL(),
  trustedOrigins: resolveTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string }) => {
      await sendVerificationEmail({ email: user.email, name: user.name, url })
    },
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          // Required by the cross-site v0 preview iframe. Without these
          // attributes, login succeeds but the next request appears signed out.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
  plugins: [nextCookies()],
})
