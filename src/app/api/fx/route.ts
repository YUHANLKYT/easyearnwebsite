import { NextResponse } from "next/server";

import { getUsdFxData } from "@/lib/fx";

export const dynamic = "force-dynamic";

export async function GET() {
  const fx = await getUsdFxData();

  return NextResponse.json({
    base: "USD",
    rates: fx.rates,
    updatedAt: fx.updatedAt,
    live: fx.live,
  });
}
