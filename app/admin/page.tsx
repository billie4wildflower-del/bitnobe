import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth, isAdminEmail } from "@/lib/auth"
import { getAdminDashboard } from "@/app/actions/bank"
import { AdminPageClient } from "@/components/admin-page-client"
import { DatabaseStatus } from "@/components/database-status"

export default async function AdminPage() {
	if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return <DatabaseStatus />

	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect("/sign-in")
	if (!isAdminEmail(session.user.email)) redirect("/")

	try {
		const users = await getAdminDashboard()
		return <AdminPageClient name={session.user.name} email={session.user.email} initialUsers={users} />
	} catch {
		redirect("/")
	}
}
