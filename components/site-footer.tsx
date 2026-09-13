import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"

export function SiteFooter() {
  return (
    <footer className="bg-[#10251f] text-white/65">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link href="/business-banking" className="flex items-center gap-3 text-white transition-opacity hover:opacity-90">
              <BrandMark inverse className="h-10 w-10" />
              <span className="text-base font-semibold tracking-tight">BitNobe</span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/70">Modern banking tools for members and teams that want more control over their money.</p>
            <div className="mt-5 flex items-center gap-2 text-xs text-white/55"><ShieldCheck className="h-4 w-4 text-[#d9f06c]" />Security-led member banking</div>
          </div>
          <div><p className="text-sm font-semibold text-white">Solutions</p><div className="mt-4 space-y-3 text-sm"><Link href="/business-banking#solutions" className="block text-white/65 hover:text-white">Business checking</Link><Link href="/business-banking#solutions" className="block text-white/65 hover:text-white">Payments</Link><Link href="/business-banking#security" className="block text-white/65 hover:text-white">Team access</Link><Link href="/business-banking#downloads" className="block text-white/65 hover:text-white">Downloads</Link></div></div>
          <div><p className="text-sm font-semibold text-white">Company</p><div className="mt-4 space-y-3 text-sm"><Link href="/business-banking#security" className="block text-white/65 hover:text-white">Why BitNobe</Link><Link href="/sign-up" className="block text-white/65 hover:text-white">Get started</Link><Link href="/sign-in" className="block text-white/65 hover:text-white">Member sign in</Link><Link href="/support" className="block text-white/65 hover:text-white">Contact us</Link></div></div>
          <div><p className="text-sm font-semibold text-white">Support</p><div className="mt-4 space-y-3 text-sm"><Link href="/support" className="block text-white/65 hover:text-white">Help center</Link><Link href="/business-banking#downloads" className="block text-white/65 hover:text-white">App downloads</Link><Link href="/support" className="block text-white/65 hover:text-white">Report an issue</Link><a href="mailto:support@bitnobe.example" className="block text-white/65 hover:text-white">Email support</a></div></div>
          <div><p className="text-sm font-semibold text-white">Legal and security</p><div className="mt-4 space-y-3 text-sm"><Link href="/business-banking#security" className="block text-white/65 hover:text-white">Security overview</Link><a href="/support" className="block text-white/65 hover:text-white">Privacy notice</a><a href="/support" className="block text-white/65 hover:text-white">Terms of service</a><a href="/support" className="block text-white/65 hover:text-white">Accessibility</a></div></div>
        </div>
        <div className="mt-14 border-t border-white/10 pt-6 text-xs leading-5 text-white/40"><p>BitNobe is a product experience for authorized members. Banking services, account availability, and deposit protections are subject to applicable terms and program disclosures.</p><div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row"><p>© 2026 BitNobe. All rights reserved.</p><p>Equal Housing Opportunity · Member support available</p></div></div>
      </div>
    </footer>
  )
}
