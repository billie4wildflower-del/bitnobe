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
        <div className="relative flex h-32 w-56 items-center justify-center">
          <span className="loader-frame absolute inset-x-7 inset-y-4 border border-[#d9f06c]/45" />
          <span className="loader-frame loader-frame-delay absolute inset-x-3 inset-y-8 border border-white/15" />
          <span className="loader-scan absolute left-0 top-1/2 h-px w-full bg-[#d9f06c] shadow-[0_0_18px_#d9f06c]" />
          <span className="loader-node loader-node-one absolute left-5 top-5 h-2 w-2 bg-[#d9f06c]" />
          <span className="loader-node loader-node-two absolute bottom-5 right-5 h-2 w-2 bg-white" />
          <BrandMark className="relative z-10 h-16 w-16 rounded-[20px] text-3xl shadow-[0_0_45px_rgba(217,240,108,.22)]" inverse />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-[0.28em] text-[#d9f06c]">BITNOBE</p>
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          <span className="loader-dot h-1 w-1 bg-[#d9f06c]" />
          <span className="loader-dot loader-dot-delay h-1 w-1 bg-[#d9f06c]" />
          <span className="loader-dot loader-dot-delay-two h-1 w-1 bg-[#d9f06c]" />
        </div>
      </div>
    </div>
  )
}
