"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Landmark, Loader2 } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { BrandMark } from "@/components/brand-mark"
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
      const authError = err instanceof Error ? err.message.toLowerCase() : ""
      setError(isSignUp
        ? "Could not create account. Try a different email."
        : authError.includes("verify")
          ? "Your email has not been verified yet. Ask BitNobe support to verify your account."
          : "Invalid email or password.")
      setLoading(false)
    }
  }

  function chooseProvider(domain: string) {
    const localPart = email.split("@")[0]?.trim() ?? ""
    setEmail(`${localPart}@${domain}`)
    setSelectedProvider(domain)
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_center,rgba(217,240,108,0.2),transparent_60%)] blur-3xl" />
      <Link href="/business-banking" className="mb-8 flex items-center gap-3 rounded-full transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring">
        <BrandMark className="h-11 w-11" />
        <div>
          <p className="text-lg font-semibold leading-tight tracking-tight text-foreground">BitNobe</p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Internal banking</p>
        </div>
      </Link>

      <div className="glass-panel rounded-[26px] p-7 shadow-[0_24px_70px_-36px_rgba(16,37,31,0.35)] sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              {isSignUp ? "Create your account" : "Sign in"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignUp
                ? "Register to hold a balance and transfer funds to other members."
                : "Welcome back. Access your account to manage transfers."}
            </p>
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#d9f06c] text-[#10251f] shadow-sm">
            <Landmark className="h-4 w-4" />
          </span>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
                className="h-11 rounded-xl border-border/80 bg-white/85"
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
              className="h-11 rounded-xl border-border/80 bg-white/85"
            />
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
              className="h-11 rounded-xl border-border/80 bg-white/85"
            />
            {isSignUp && <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>}
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-2 h-11 w-full rounded-xl bg-[#10251f] text-white hover:bg-[#1a3d37]" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border/80 pt-5">
          <p className="text-sm font-medium text-card-foreground">Email options</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose a provider to complete your email.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Email provider options">
            {emailProviders.map((provider) => (
              <button
                key={provider.domain}
                type="button"
                onClick={() => chooseProvider(provider.domain)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${selectedProvider === provider.domain ? "border-[#10251f] bg-[#10251f] text-white" : "border-border/80 bg-white/70 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {provider.label}
              </button>
            ))}
          </div>
        </div>

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
