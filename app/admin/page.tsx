import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth, getAdminRole, isAdminEmail } from "@/lib/auth"
import { getAdminDashboard } from "@/app/actions/bank"
import { AdminPageClient } from "@/components/admin-page-client"
import { DatabaseStatus } from "@/components/database-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPage() {
	if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return <DatabaseStatus />

	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect("/sign-in?next=/admin")
	if (!getAdminRole(session.user.email) && !isAdminEmail(session.user.email)) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background px-4">
				<Card className="w-full max-w-md">
					<CardHeader><CardTitle>Operations access required</CardTitle></CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>{session.user.email} is signed in, but is not configured as an administrator.</p>
						<p>Add this email to one of the deployed role variables: <code className="rounded bg-muted px-1">ADMIN_EMAILS</code>, <code className="rounded bg-muted px-1">ADMIN_SUPPORT_EMAILS</code>, <code className="rounded bg-muted px-1">ADMIN_MANAGER_EMAILS</code>, or <code className="rounded bg-muted px-1">ADMIN_ENGINEERING_EMAILS</code>.</p>
					</CardContent>
				</Card>
			</main>
		)
	}

	try {
		const users = await getAdminDashboard()
		return <AdminPageClient name={session.user.name} email={session.user.email} role={getAdminRole(session.user.email) ?? "manager"} initialUsers={users} />
	} catch {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background px-4">
				<Card className="w-full max-w-md">
					<CardHeader><CardTitle>Operations console unavailable</CardTitle></CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>Your administrator access was recognized, but the operations data could not be loaded.</p>
						<p>Check the database connection and redeploy after the environment variables are available.</p>
					</CardContent>
				</Card>
			</main>
		)
	}
}
