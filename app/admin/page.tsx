import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth, isAdminEmail } from "@/lib/auth"
import { getAdminDashboard } from "@/app/actions/bank"
import { AdminPageClient } from "@/components/admin-page-client"
import { DatabaseStatus } from "@/components/database-status"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPage() {
	if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return <DatabaseStatus />

	const session = await auth.api.getSession({ headers: await headers() })
	if (!session?.user) redirect("/sign-in?next=/admin")
	if (!isAdminEmail(session.user.email)) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background px-4">
				<Card className="w-full max-w-md">
					<CardHeader><CardTitle>Operations access required</CardTitle></CardHeader>
					<CardContent className="space-y-3 text-sm text-muted-foreground">
						<p>{session.user.email} is signed in, but is not configured as an administrator.</p>
						<p>An administrator must add this email to the deployed <code className="rounded bg-muted px-1">ADMIN_EMAILS</code> environment variable before access is granted.</p>
					</CardContent>
				</Card>
			</main>
		)
	}

	try {
		const users = await getAdminDashboard()
		return <AdminPageClient name={session.user.name} email={session.user.email} initialUsers={users} />
	} catch {
		redirect("/")
	}
}
