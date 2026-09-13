import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; verified?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  const { next } = await searchParams
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/"
  if (session?.user) redirect(redirectTo)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <AuthForm mode="sign-in" redirectTo={redirectTo} />
    </main>
  )
}
