type BrandMarkProps = {
  className?: string
  inverse?: boolean
}

export function BrandMark({ className = "", inverse = false }: BrandMarkProps) {
  return (
    <span
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] ${inverse ? "bg-[#d9f06c] text-[#10251f]" : "bg-primary text-primary-foreground"} ${className}`}
      aria-hidden="true"
    >
      <span className="relative z-10 text-[17px] font-black leading-none tracking-[-0.12em]">B</span>
      <span className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full border-2 border-current opacity-35" />
      <span className="absolute -bottom-2 -left-1 h-5 w-5 rounded-full border-2 border-current opacity-25" />
    </span>
  )
}
