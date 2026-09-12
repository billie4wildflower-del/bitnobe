"use client"

import { SupportDirectory } from "@/components/support-directory"
import { TopNav } from "@/components/top-nav"
import type { SupportMessage } from "@/app/actions/bank"

type RegisteredUser = {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: Date
}

export function SupportPageClient({
  name,
  email,
  users,
  messages,
  isAdmin,
}: {
  name: string
  email: string
  users: RegisteredUser[]
  messages: SupportMessage[]
  isAdmin: boolean
}) {
  return (
    <>
      <TopNav name={name} email={email} activeView="support" isAdmin={isAdmin} />
      <SupportDirectory initialMessages={messages} />
    </>
  )
}