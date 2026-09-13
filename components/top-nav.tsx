"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, ShieldCheck, UserRound } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BrandMark } from "@/components/brand-mark"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export type WorkspaceView = "overview" | "accounts" | "transfers" | "activity" | "support"

export function TopNav({
  name,
  email,
  activeView,
  onViewChange,
  isAdmin = false,
}: {
  name: string
  email: string
  activeView: WorkspaceView
  onViewChange?: (view: WorkspaceView) => void
  isAdmin?: boolean
}) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/business-banking" className="flex items-center gap-3 rounded-full outline-none ring-offset-2 transition-all hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark className="h-10 w-10" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">BitNobe</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Member banking</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-border/80 bg-muted/30 p-1 md:flex" aria-label="Primary navigation">
          {(["overview", "accounts", "transfers", "activity"] as WorkspaceView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange?.(view)}
              className={`rounded-full px-3 py-2 text-sm font-medium capitalize transition-all ${
                activeView === view
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-white hover:text-foreground"
              }`}
            >
              {view}
            </button>
          ))}
          <Link href="/support" className={`rounded-full px-3 py-2 text-sm font-medium capitalize transition-all ${activeView === "support" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white hover:text-foreground"}`}>Support</Link>
          <Link href="/cards" className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-white hover:text-foreground">Cards</Link>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/30 px-2 py-1.5 outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8 ring-2 ring-white">
              <AvatarFallback className="bg-[#d9f06c] text-[#10251f] text-xs font-semibold">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-foreground sm:inline">{name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-border/80 bg-white p-1 shadow-lg">
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs font-normal text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserRound className="mr-2 h-4 w-4" />
              Profile & security
            </DropdownMenuItem>
            {isAdmin && (
              <Link
                href="/admin"
                className="relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none hover:bg-accent focus:bg-accent focus:text-accent-foreground"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Operations console
              </Link>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
