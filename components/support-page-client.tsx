"use client"

import { SupportDirectory } from "@/components/support-directory"
import { TopNav } from "@/components/top-nav"
import type { SupportMessage } from "@/app/actions/bank"

export function SupportPageClient({
  name,
  email,
  messages,
}: {
  name: string
  email: string
  messages: SupportMessage[]
}) {
  return (
    <>
      <TopNav name={name} email={email} activeView="support" />
      <SupportDirectory initialMessages={messages} />
    </>
  )
}