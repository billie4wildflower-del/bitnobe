import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  Download,
  Globe2,
  Landmark,
  LockKeyhole,
  Menu,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react"

export const metadata = {
  title: "Business Banking | BitNobe",
  description: "Business checking, payments, cards, and treasury tools built for growing companies.",
}

const mobileDownload = process.env.NEXT_PUBLIC_BUSINESS_MOBILE_APP_URL ?? "/api/downloads/mobile"
const desktopDownload = process.env.NEXT_PUBLIC_BUSINESS_DESKTOP_DOWNLOAD_URL ?? "/api/downloads/desktop"

const capabilities = [
  { icon: WalletCards, title: "Business checking", text: "Keep operating cash organized with account views, permissions, and clear balances." },
  { icon: ReceiptText, title: "Payables and collections", text: "Move money, manage vendors, and keep every transaction easy to reconcile." },
  { icon: UsersRound, title: "Team access", text: "Give finance, operations, and leadership the right access without sharing credentials." },
  { icon: BarChart3, title: "Cash-flow intelligence", text: "See what is moving in and out with reporting designed for daily decisions." },
]

export default function BusinessBankingPage() {
  return (
    <main className="min-h-screen bg-[#f5f7f3] text-[#14241f]">
      <section className="relative overflow-hidden bg-[#10251f] text-white">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <nav className="flex h-20 items-center justify-between border-b border-white/10">
            <Link href="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d9f06c] text-[#10251f]"><Landmark className="h-5 w-5" /></span><span className="font-semibold tracking-tight">BitNobe <span className="font-normal text-white/55">for business</span></span></Link>
            <div className="hidden items-center gap-7 text-sm text-white/70 md:flex"><a href="#solutions" className="hover:text-white">Solutions</a><a href="#security" className="hover:text-white">Security</a><a href="#downloads" className="hover:text-white">Downloads</a><Link href="/sign-in" className="rounded-full border border-white/20 px-4 py-2 text-white hover:bg-white/10">Sign in</Link></div>
            <button type="button" className="md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          </nav>
          <div className="grid gap-12 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-28">
            <div className="max-w-2xl"><p className="mb-5 flex items-center gap-2 text-sm font-medium text-[#d9f06c]"><Sparkles className="h-4 w-4" /> Banking infrastructure for the next stage</p><h1 className="max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-7xl">Move your business forward.</h1><p className="mt-7 max-w-lg text-lg leading-8 text-white/65">A business banking workspace for controlling cash, paying people, and making confident decisions as your company grows.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/sign-up" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#d9f06c] px-5 text-sm font-semibold text-[#10251f] hover:bg-[#e5f995]">Open a business account <ArrowRight className="h-4 w-4" /></Link><a href="#downloads" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10">Get the app <Download className="h-4 w-4" /></a></div></div>
            <div className="relative mx-auto w-full max-w-[510px] lg:justify-self-end"><div className="absolute -inset-5 rounded-[2rem] border border-[#d9f06c]/20" /><div className="relative rounded-[1.5rem] border border-white/15 bg-white/[.08] p-4 shadow-2xl backdrop-blur"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-xs text-white/50">Operating account</p><p className="mt-1 text-2xl font-semibold">$248,630.42</p></div><span className="rounded-full bg-[#d9f06c]/15 px-3 py-1 text-xs text-[#d9f06c]">Healthy cash flow</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-black/15 p-4"><p className="text-xs text-white/45">Incoming this month</p><p className="mt-3 text-xl font-medium">$82,410</p><div className="mt-4 h-1.5 rounded-full bg-white/10"><div className="h-full w-4/5 rounded-full bg-[#d9f06c]" /></div></div><div className="rounded-xl bg-black/15 p-4"><p className="text-xs text-white/45">Scheduled out</p><p className="mt-3 text-xl font-medium">$31,780</p><p className="mt-4 text-xs text-white/50">18 payments queued</p></div></div><div className="mt-3 rounded-xl bg-[#d9f06c] p-4 text-[#10251f]"><div className="flex items-center justify-between"><div><p className="text-xs font-medium opacity-60">Weekly insight</p><p className="mt-1 font-semibold">Runway is up 14% this quarter.</p></div><BarChart3 className="h-6 w-6" /></div></div></div></div>
          </div>
        </div>
      </section>

      <section id="solutions" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28"><div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[.18em] text-[#5d7469]">One connected workspace</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.03em] sm:text-5xl">The everyday money layer for your company.</h2></div><div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#dbe2da] bg-[#dbe2da] sm:grid-cols-2 lg:grid-cols-4">{capabilities.map(({ icon: Icon, title, text }) => <article key={title} className="bg-[#f5f7f3] p-7"><Icon className="h-6 w-6 text-[#1d7565]" /><h3 className="mt-12 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#60736a]">{text}</p><a href="#downloads" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#1d7565]">Explore <ChevronRight className="h-4 w-4" /></a></article>)}</div></section>

      <section id="security" className="border-y border-[#dbe2da] bg-white"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-28"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[#5d7469]">Built for control</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.03em]">A clearer way to run business money.</h2><p className="mt-5 max-w-md leading-7 text-[#60736a]">Protect every movement with role-based access, account monitoring, and a complete operational record your finance team can trust.</p><Link href="/support" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#1d7565]">Talk to a specialist <ArrowRight className="h-4 w-4" /></Link></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#10251f] p-7 text-white"><ShieldCheck className="h-6 w-6 text-[#d9f06c]" /><h3 className="mt-12 text-lg font-semibold">Permissioned by design</h3><p className="mt-3 text-sm leading-6 text-white/60">Separate approval, payment, and reporting access across your team.</p></div><div className="rounded-2xl border border-[#dbe2da] p-7"><LockKeyhole className="h-6 w-6 text-[#1d7565]" /><h3 className="mt-12 text-lg font-semibold">Protected at every step</h3><p className="mt-3 text-sm leading-6 text-[#60736a]">Session controls and visible audit activity help your team act quickly.</p></div><div className="rounded-2xl border border-[#dbe2da] p-7"><Globe2 className="h-6 w-6 text-[#1d7565]" /><h3 className="mt-12 text-lg font-semibold">Ready wherever you work</h3><p className="mt-3 text-sm leading-6 text-[#60736a]">Use the web workspace, mobile app, or desktop software.</p></div><div className="rounded-2xl border border-[#dbe2da] p-7"><Building2 className="h-6 w-6 text-[#1d7565]" /><h3 className="mt-12 text-lg font-semibold">Made for real operators</h3><p className="mt-3 text-sm leading-6 text-[#60736a]">Designed for founders, finance teams, and growing organizations.</p></div></div></div></section>

      <section id="downloads" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[#5d7469]">Work from anywhere</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.03em]">Take BitNobe with you.</h2></div><p className="max-w-sm text-sm leading-6 text-[#60736a]">Download links can be connected to your approved mobile and desktop release packages through deployment settings.</p></div><div className="mt-10 grid gap-4 md:grid-cols-2"><a href={mobileDownload} download className="group flex items-center justify-between rounded-2xl bg-[#d9f06c] p-7 text-[#10251f] transition-transform hover:-translate-y-1"><span><span className="flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4" /> Mobile banking app</span><span className="mt-3 block text-2xl font-semibold">iOS & Android</span><span className="mt-2 block text-sm opacity-70">Approve payments and monitor cash on the move.</span></span><ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" /></a><a href={desktopDownload} download className="group flex items-center justify-between rounded-2xl bg-[#10251f] p-7 text-white transition-transform hover:-translate-y-1"><span><span className="flex items-center gap-2 text-sm font-semibold text-[#d9f06c]"><Download className="h-4 w-4" /> Desktop software</span><span className="mt-3 block text-2xl font-semibold">Windows & macOS</span><span className="mt-2 block text-sm text-white/60">A focused command center for finance operations.</span></span><ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" /></a></div></section>

      <section className="bg-[#dfe9d8]"><div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between"><div><h2 className="text-3xl font-semibold tracking-[-.03em]">Ready to make business banking simpler?</h2><p className="mt-3 text-[#60736a]">Open an account or sign in to your existing BitNobe workspace.</p></div><div className="flex flex-wrap gap-3"><Link href="/sign-up" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#10251f] px-5 text-sm font-semibold text-white">Get started <ArrowRight className="h-4 w-4" /></Link><Link href="/sign-in" className="inline-flex h-10 items-center rounded-full border border-[#9caf9e] px-5 text-sm font-semibold">Sign in</Link></div></div></section>
      <footer className="bg-[#10251f] text-white/50"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8"><p className="font-medium text-white">BitNobe <span className="font-normal text-white/45">for business</span></p><p>Business banking tools for registered members.</p></div></footer>
    </main>
  )
}
