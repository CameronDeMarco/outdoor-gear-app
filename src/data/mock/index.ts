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

  async getProduct(id: string) {
    return products.find((p) => p.id === id) ?? null;
  }
}
