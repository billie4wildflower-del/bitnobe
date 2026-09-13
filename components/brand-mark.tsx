type BrandMarkProps = {
  className?: string
  inverse?: boolean
}

export function BrandMark({ className = "", inverse = false }: BrandMarkProps) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] shadow-[0_12px_28px_rgba(16,37,31,0.18)] ${className}`}
      aria-hidden="true"
    >
      <img
        src="/segments/logo-icon.png"
        alt="BitNobe logo"
        className="h-full w-full object-cover"
        style={{ filter: inverse ? "brightness(1.08) saturate(1.15)" : "none" }}
      />
    </span>
  )
}
