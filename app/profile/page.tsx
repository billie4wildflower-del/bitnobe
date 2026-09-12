import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getProfile } from "@/app/actions/bank"
import { DatabaseStatus } from "@/components/database-status"
import { ProfilePageClient } from "@/components/profile-page-client"

export default async function ProfilePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return <DatabaseStatus />

  let session
  try {
    session = await auth.api.getSession({ headers: await headers() })
  } catch {
    return <DatabaseStatus />
  }
  if (!session?.user) redirect("/sign-in")

  try {
    const profile = await getProfile()
    return <ProfilePageClient profile={profile} />
  } catch {
    return <DatabaseStatus />
  }
}