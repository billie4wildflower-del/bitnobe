"use client"

import { useEffect, useState } from "react"

import { BrandMark } from "@/components/brand-mark"

export function PageLoader() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2600)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#091e1a] text-white" role="status" aria-label="Loading BitNobe">
      <div className="absolute inset-0 segment-surface opacity-95" />
      <div className="absolute inset-0 segment-grid opacity-30" />
      <div className="absolute inset-0 segment-network opacity-60" />
      <div className="absolute left-[12%] top-[18%] h-16 w-16 rotate-[-12deg] rounded-[18px] bg-[#091e1a] opacity-80 segment-glow" />
      <div className="absolute right-[15%] top-[18%] h-12 w-12 rounded-[16px] bg-[#091e1a] opacity-90 segment-glow" />
      <div className="absolute bottom-[18%] left-[18%] h-14 w-14 rounded-[16px] bg-[#091e1a] opacity-85 segment-glow" />
      <div className="absolute bottom-[20%] right-[18%] h-16 w-16 rotate-[10deg] rounded-[18px] bg-[#091e1a] opacity-80 segment-glow" />
      <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_center,rgba(168,255,79,0.25),transparent_30%)]" />
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-32 w-60 items-center justify-center">
          <span className="loader-frame absolute inset-x-8 inset-y-4 rounded-[28px] border border-[#d9f06c]/60" />
          <span className="loader-frame loader-frame-delay absolute inset-x-3 inset-y-8 rounded-[24px] border border-white/10" />
          <span className="loader-scan absolute left-0 top-1/2 h-px w-full bg-[#d9f06c] shadow-[0_0_18px_#d9f06c]" />
          <span className="loader-node absolute left-6 top-6 h-2.5 w-2.5 rounded-full bg-[#d9f06c]" />
          <span className="loader-node loader-node-two absolute bottom-6 right-7 h-2.5 w-2.5 rounded-full bg-white/90" />
          <BrandMark className="brand-spotlight relative z-10 h-16 w-16 rounded-[20px]" inverse />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-[0.34em] text-[#d9f06c]">BITNOBE</p>
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          <span className="loader-dot h-1.5 w-1.5 rounded-full bg-[#d9f06c]" />
          <span className="loader-dot loader-dot-delay h-1.5 w-1.5 rounded-full bg-[#d9f06c]" />
          <span className="loader-dot loader-dot-delay-two h-1.5 w-1.5 rounded-full bg-[#d9f06c]" />
        </div>
      </div>
    </div>
  )
}
