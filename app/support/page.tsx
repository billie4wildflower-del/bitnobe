import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getRegisteredUsers, getSupportMessages } from "@/app/actions/bank"
import { SupportDirectory } from "@/components/support-directory"
import { TopNav } from "@/components/top-nav"
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
      <TopNav name={session.user.name} email={session.user.email} activeView="support" onViewChange={() => {}} />
      <SupportDirectory users={users} initialMessages={messages} />
    </div>
  )
}