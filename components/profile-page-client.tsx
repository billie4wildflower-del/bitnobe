"use client"

import { FormEvent, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, LockKeyhole, Mail, Pencil, ShieldCheck, UserRound } from "lucide-react"

import { updateProfile } from "@/app/actions/bank"
import { formatCents, formatDateOnly, maskAccount } from "@/lib/format"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TopNav } from "@/components/top-nav"

type Profile = Awaited<ReturnType<typeof import("@/app/actions/bank").getProfile>>

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

export function ProfilePageClient({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.user.name)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await updateProfile({ name })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setName(result.name)
      setEditing(false)
      setNotice("Your profile was updated.")
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav name={profile.user.name} email={profile.user.email} activeView="overview" isAdmin={profile.isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to workspace</Link>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Personal banking</p><h1 className="text-3xl font-semibold tracking-tight">Profile & security</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Manage your member identity and review the account details connected to your BitNobe access.</p></div>
          {profile.isAdmin && <Link href="/admin"><Button variant="outline"><ShieldCheck className="mr-2 h-4 w-4" />Operations console</Button></Link>}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-primary" />Member identity</CardTitle><CardDescription>Your verified banking profile.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 border-b pb-6"><Avatar size="lg"><AvatarFallback className="bg-primary/10 text-primary">{initials(profile.user.name)}</AvatarFallback></Avatar><div><p className="text-lg font-semibold">{profile.user.name}</p><p className="text-sm text-muted-foreground">Member since {formatDateOnly(profile.user.createdAt)}</p></div></div>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div><label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium">Display name</label><div className="flex gap-2"><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} disabled={!editing || pending} maxLength={80} /><Button type={editing ? "submit" : "button"} variant={editing ? "default" : "outline"} onClick={() => !editing && setEditing(true)} disabled={pending}>{editing ? "Save changes" : <><Pencil className="mr-2 h-4 w-4" />Edit</>}</Button></div></div>
                <div><p className="mb-1.5 text-sm font-medium">Email address</p><div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{profile.user.email}<span className="ml-auto text-xs text-emerald-600">{profile.user.emailVerified ? "Verified" : "Unverified"}</span></div></div>
                {notice && <p className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-primary" />Security status</CardTitle><CardDescription>Protections active on your member access.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex items-center justify-between border-b pb-3"><span>Password sign-in</span><span className="font-medium text-emerald-600">Enabled</span></div><div className="flex items-center justify-between"><span>Account access</span><span className={`font-medium capitalize ${profile.account.status === "active" ? "text-emerald-600" : "text-amber-600"}`}>{profile.account.status}</span></div><div className="flex items-center justify-between"><span>Fraud monitoring</span><span className={`font-medium ${profile.account.fraudFreeze ? "text-amber-600" : "text-emerald-600"}`}>{profile.account.fraudFreeze ? "Review active" : "Protected"}</span></div><p className="pt-2 text-xs text-muted-foreground">For a password reset or account concern, contact BitNobe Support.</p></CardContent></Card>
            <Card><CardHeader><CardTitle>Bank account</CardTitle><CardDescription>Your primary BitNobe checking account.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Available balance</span><span className="font-semibold">{formatCents(profile.account.balance)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Account number</span><span className="font-mono">{maskAccount(profile.account.accountNumber)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Routing number</span><span className="font-mono">{profile.account.routingNumber}</span></div><p className="border-t pt-3 text-xs text-muted-foreground">Opened {formatDateOnly(profile.account.openedAt)}</p></CardContent></Card>
          </div>
        </div>
      </main>
    </div>
  )
}