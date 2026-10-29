import { NextResponse } from "next/server";
import { getSocialLinks } from "@/lib/env.server";
import { whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";

export function GET() {
  const links = getSocialLinks();
  return NextResponse.json({
    ...links,
    whatsapp: links.whatsapp ?? whatsappLink("Hi Eklakshya, I'd like to discuss a project."),
  }, { headers: { "Cache-Control": "no-store" } });
}
