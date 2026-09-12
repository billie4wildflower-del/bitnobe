import { NextResponse } from "next/server"

export async function GET(_: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params
  if (platform !== "mobile" && platform !== "desktop") {
    return NextResponse.json({ error: "Unknown download" }, { status: 404 })
  }

  const title = platform === "mobile" ? "BitNobe Business Mobile App" : "BitNobe Business Desktop Software"
  const configuredUrl = platform === "mobile"
    ? process.env.NEXT_PUBLIC_BUSINESS_MOBILE_APP_URL
    : process.env.NEXT_PUBLIC_BUSINESS_DESKTOP_DOWNLOAD_URL

  if (configuredUrl) return NextResponse.redirect(configuredUrl)

  const guide = `${title}\n\nThis download is not configured for this deployment yet.\n\nConfigure ${platform === "mobile" ? "NEXT_PUBLIC_BUSINESS_MOBILE_APP_URL" : "NEXT_PUBLIC_BUSINESS_DESKTOP_DOWNLOAD_URL"} with the approved release URL, then redeploy.\n`
  return new NextResponse(guide, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="bitnobe-business-${platform}-download.txt"`,
    },
  })
}
