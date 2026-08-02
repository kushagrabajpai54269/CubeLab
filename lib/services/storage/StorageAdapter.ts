/**
 * Storage abstraction (D-002). Business logic and UI never touch
 * localStorage/Supabase/etc. directly, they depend on this interface only,
 * so swapping LocalStorageAdapter for a future SupabaseAdapter requires no
 * changes outside this module.
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}
