import { NextResponse } from "next/server";

import { interpretCatalogQueryWithAi } from "@/lib/search-interpretation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InterpretRequestBody = {
  query?: unknown;
};

export async function POST(request: Request) {
  let body: InterpretRequestBody;

  try {
    body = (await request.json()) as InterpretRequestBody;
  } catch {
    return NextResponse.json(
      {
        category: [],
        color: [],
        confidence: 0,
        diameter: [],
        holder: [],
        normalizedQuery: "",
        usage: [],
      },
      { status: 400 }
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json(
      {
        category: [],
        color: [],
        confidence: 0,
        diameter: [],
        holder: [],
        normalizedQuery: "",
        usage: [],
      },
      { status: 400 }
    );
  }

  const interpretation = await interpretCatalogQueryWithAi(query.slice(0, 240));

  return NextResponse.json(interpretation);
}
