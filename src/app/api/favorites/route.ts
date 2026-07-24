import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * The favorites API. Every method is guarded: no valid session → 401.
 *
 *   GET    /api/favorites   → list the current user's favorites
 *   POST   /api/favorites   → add one (body: productId + snapshot fields)
 *   DELETE /api/favorites   → remove one (body: productId)
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  const name = typeof body?.name === "string" ? body.name : "";
  if (!productId || !name) {
    return NextResponse.json({ error: "productId and name are required." }, { status: 400 });
  }
  const priceCents = Number.isFinite(body?.priceCents) ? Math.round(body.priceCents) : 0;

  try {
    const favorite = await prisma.favorite.create({
      data: {
        userId: session.user.id,
        productId,
        name,
        brand: typeof body?.brand === "string" ? body.brand : null,
        imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl : null,
        priceCents,
      },
    });
    return NextResponse.json({ favorite }, { status: 201 });
  } catch (err) {
    // P2002 = unique-constraint violation (already favorited). Idempotent success.
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, alreadyFavorited: true });
    }
    throw err;
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "productId is required." }, { status: 400 });
  }

  // deleteMany (not delete) so removing a non-existent favorite is a no-op, not an error.
  await prisma.favorite.deleteMany({
    where: { userId: session.user.id, productId },
  });
  return NextResponse.json({ ok: true });
}
