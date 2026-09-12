"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Landmark, LogOut } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
}: {
  name: string
  email: string
  activeView: WorkspaceView
  onViewChange?: (view: WorkspaceView) => void
}) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">BitNobe</p>
            <p className="text-xs text-muted-foreground">Member banking</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {(["overview", "accounts", "transfers", "activity"] as WorkspaceView[]).map((view) => (
            <button key={view} type="button" onClick={() => onViewChange?.(view)} className={`rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors ${
                activeView === view ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {view}
            </button>
          ))}
          <Link href="/support" className={`rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors ${activeView === "support" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>Support</Link>
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs font-normal text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
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
