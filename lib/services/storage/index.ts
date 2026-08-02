import { LocalStorageAdapter } from './LocalStorageAdapter'

export type { StorageAdapter } from './StorageAdapter'
export const storage = new LocalStorageAdapter()
