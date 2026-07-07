import type { DataSource } from "@/data/source";
import type { GearCategory } from "@/domain/types";
import { products, retailers } from "./seed";

/**
 * In-memory data source backed by seed data. Async on purpose so the interface
 * matches a real networked source — swapping in a live adapter requires no
 * call-site changes.
 */
export class MockDataSource implements DataSource {
  async listRetailers() {
    return retailers;
  }

  async listProducts(filter?: { category?: GearCategory }) {
    if (!filter?.category) return products;
    return products.filter((p) => p.category === filter.category);
  }

  async searchProducts(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // Match any whitespace-separated term against name, brand, or category.
    const terms = q.split(/\s+/);
    return products.filter((p) => {
      const haystack = `${p.name} ${p.brand} ${p.category}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }

  async getProduct(id: string) {
    return products.find((p) => p.id === id) ?? null;
  }
}
