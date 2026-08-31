import { ReconciliationResult, DiscrepancyItem } from './reconciliation-engine';

export interface StoredReconciliation {
  id: string;
  userId: string;
  title: string;
  status: string;
  summary: ReconciliationResult['summary'];
  discrepancies: DiscrepancyItem[];
  ordersCount: number;
  paymentsCount: number;
  createdAt: string;
}

// Global in-memory fallback cache for fast multi-tenant session & demo state
const globalStore = globalThis as unknown as {
  inMemoryReconciliations?: Map<string, StoredReconciliation[]>;
  inMemoryUsers?: Map<string, { id: string; email: string; name: string; passwordHash: string }>;
};

if (!globalStore.inMemoryReconciliations) {
  globalStore.inMemoryReconciliations = new Map();
}
if (!globalStore.inMemoryUsers) {
  globalStore.inMemoryUsers = new Map();
}

export const inMemoryStore = {
  reconciliations: globalStore.inMemoryReconciliations,
  users: globalStore.inMemoryUsers,
};
