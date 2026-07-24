import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the set of productIds the current user has favorited — used by server
 * components to mark which cards are already saved. Empty set when logged out.
 */
export async function getFavoritedIds(): Promise<Set<string>> {
  const session = await auth();
  if (!session?.user?.id) return new Set();

  const rows = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });
  return new Set(rows.map((r) => r.productId));
}
