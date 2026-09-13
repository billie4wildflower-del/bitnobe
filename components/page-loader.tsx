"use client"

import { useEffect, useState } from "react"

import { BrandMark } from "@/components/brand-mark"

export function PageLoader() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#10251f] text-white" role="status" aria-label="Loading BitNobe">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute inset-0 animate-[spin_3s_linear_infinite] rounded-full border border-[#d9f06c]/30 border-t-[#d9f06c]" />
          <span className="absolute inset-3 animate-pulse rounded-full border border-white/10" />
          <BrandMark className="h-16 w-16 rounded-[20px] text-3xl shadow-[0_0_45px_rgba(217,240,108,.18)]" inverse />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-[0.28em] text-[#d9f06c]">BITNOBE</p>
        <span className="mt-4 h-1 w-1 animate-ping rounded-full bg-[#d9f06c]" />
      </div>
    </div>
  )
}
