// server/storage.ts
// Re-export from modular stores for backward compatibility
// All existing imports of `storage` will continue to work unchanged

export { 
  storage, 
  DatabaseStorage,
  type IStorage,
  // Also export individual stores for direct access if needed
  userStore,
  scanStore,
  billingStore,
  notificationStore,
  fieldPurchaseStore,
} from "./stores/index.js";
