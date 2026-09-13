"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Landmark, Loader2 } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const emailProviders = [
  { label: "Gmail", domain: "gmail.com" },
  { label: "Outlook", domain: "outlook.com" },
  { label: "Yahoo", domain: "yahoo.com" },
  { label: "Comcast", domain: "comcast.net" },
  { label: "Windstream", domain: "windstream.net" },
  { label: "Optimum", domain: "optimum.net" },
  { label: "Suddenlink", domain: "suddenlink.net" },
] as const

export function AuthForm({ mode, redirectTo = "/" }: { mode: "sign-in" | "sign-up"; redirectTo?: string }) {
  const router = useRouter()
  const isSignUp = mode === "sign-up"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password, name })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message)
      }
      router.push(isSignUp ? "/sign-in?verified=pending" : redirectTo)
      router.refresh()
    } catch (err) {
      setError(isSignUp ? "Could not create account. Try a different email." : "Invalid email or password.")
      setLoading(false)
    }
  }

  function chooseProvider(domain: string) {
    const localPart = email.split("@")[0]?.trim() ?? ""
    setEmail(`${localPart}@${domain}`)
    setSelectedProvider(domain)
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/business-banking" className="mb-8 flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Landmark className="h-6 w-6" /></div>
        <div><p className="text-lg font-semibold leading-tight tracking-tight">BitNobe</p><p className="text-sm text-muted-foreground leading-tight">Internal Banking Console</p></div>
      </Link>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
          {isSignUp ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignUp
            ? "Register to hold a balance and transfer funds to other members. Check your email to verify access."
            : "Welcome back. Access your account to manage transfers."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            <div className="flex flex-wrap gap-1.5" aria-label="Email provider options">
              {emailProviders.map((provider) => (
                <button
                  key={provider.domain}
                  type="button"
                  onClick={() => chooseProvider(provider.domain)}
                  className={`rounded-md border px-2 py-1 text-xs transition-colors ${selectedProvider === provider.domain ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  {provider.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Choose your email provider to complete the address. Sign in still uses your BitNobe email and password.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            {isSignUp && <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>}
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground text-balance">
        For authorized members only. All transfers are recorded and auditable.
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Looking for business banking? <Link href="/business-banking" className="font-medium text-primary hover:underline">Explore BitNobe for business</Link>
      </p>
    </div>
  )
}
