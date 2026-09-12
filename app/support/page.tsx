import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/auth"
import { getRegisteredUsers, getSupportMessages } from "@/app/actions/bank"
import { SupportPageClient } from "@/components/support-page-client"
import { DatabaseStatus } from "@/components/database-status"

export default async function SupportPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return <DatabaseStatus />

  let session
  try {
    session = await auth.api.getSession({ headers: await headers() })
  } catch {
    return <DatabaseStatus />
  }
  if (!session?.user) redirect("/sign-in")

  let users
  let messages
  try {
    ;[users, messages] = await Promise.all([getRegisteredUsers(), getSupportMessages()])
  } catch {
    return <DatabaseStatus />
  }

  return (
    <div className="min-h-screen bg-background">
      <SupportPageClient name={session.user.name} email={session.user.email} users={users} messages={messages} isAdmin={isAdminEmail(session.user.email)} />
    </div>
  )
}