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
}: {
  name: string
  email: string
  users: RegisteredUser[]
  messages: SupportMessage[]
}) {
  return (
    <>
      <TopNav name={name} email={email} activeView="support" />
      <SupportDirectory users={users} initialMessages={messages} />
    </>
  )
}