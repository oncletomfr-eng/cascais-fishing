/**
 * Multi-Phase Chat Persistence Utilities
 * Task 17.1: Chat State Management Architecture - State Persistence
 */

import { 
  ChatPersistentState, 
  ChatStoreConfig,
  ChatAction,
  MultiPhaseChatState 
} from './multi-phase-chat-types'
import { ChatPhase } from '@/lib/types/multi-phase-chat'

// Persistence providers
export type PersistenceProvider = 'localStorage' | 'indexedDB' | 'sessionStorage' | 'memory'

// Persistence configuration
export interface PersistenceConfig {
  provider: PersistenceProvider
  keyPrefix: string
  version: number
  encryptData: boolean
  compressionEnabled: boolean
  maxStorageSize: number // in bytes
  autoCleanup: boolean
  retentionDays: number
}

// Default persistence configuration
const defaultPersistenceConfig: PersistenceConfig = {
  provider: 'localStorage',
  keyPrefix: 'multi-phase-chat',
  version: 1,
  encryptData: false,
  compressionEnabled: true,
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  autoCleanup: true,
  retentionDays: 30
}

// Storage keys
export const STORAGE_KEYS = {
  persistentState: (tripId: string, userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-persistent-${tripId}-${userId}`,
  uiPreferences: (userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-ui-${userId}`,
  messageDrafts: (tripId: string, userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-drafts-${tripId}-${userId}`,
  phaseHistory: (tripId: string, userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-history-${tripId}-${userId}`,
  analytics: (tripId: string, userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-analytics-${tripId}-${userId}`,
  readStatus: (tripId: string, userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-read-${tripId}-${userId}`,
  pendingActions: (tripId: string, userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-actions-${tripId}-${userId}`,
  connectionState: (userId: string) => 
    `${defaultPersistenceConfig.keyPrefix}-connection-${userId}`
}

// Serialization utilities
export class SerializationUtils {
  static serialize(data: any): string {
    try {
      return JSON.stringify(data, (key, value) => {
        // Handle Date objects
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() }
        }
        // Handle Map objects
        if (value instanceof Map) {
          return { __type: 'Map', value: Array.from(value.entries()) }
        }
        // Handle Set objects
        if (value instanceof Set) {
          return { __type: 'Set', value: Array.from(value) }
        }
        return value
      })
    } catch (error) {
      console.error('Serialization error:', error)
      return '{}'
    }
  }

  static deserialize(data: string): any {
    try {
      return JSON.parse(data, (key, value) => {
        // Restore Date objects
        if (value && typeof value === 'object' && value.__type === 'Date') {
          return new Date(value.value)
        }
        // Restore Map objects
        if (value && typeof value === 'object' && value.__type === 'Map') {
          return new Map(value.value)
        }
        // Restore Set objects
        if (value && typeof value === 'object' && value.__type === 'Set') {
          return new Set(value.value)
        }
        return value
      })
    } catch (error) {
      console.error('Deserialization error:', error)
      return null
    }
  }

  static compress(data: string): string {
    // Simple compression using base64 (in real app, use proper compression)
    try {
      return btoa(unescape(encodeURIComponent(data)))
    } catch (error) {
      console.error('Compression error:', error)
      return data
    }
  }

  static decompress(data: string): string {
    try {
      return decodeURIComponent(escape(atob(data)))
    } catch (error) {
      console.error('Decompression error:', error)
      return data
    }
  }
}

// Storage adapters
export abstract class StorageAdapter {
  abstract setItem(key: string, value: string): Promise<void>
  abstract getItem(key: string): Promise<string | null>
  abstract removeItem(key: string): Promise<void>
  abstract clear(): Promise<void>
  abstract getAllKeys(): Promise<string[]>
  abstract getSize(): Promise<number>
}

export class LocalStorageAdapter extends StorageAdapter {
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      if (error instanceof DOMException && error.code === 22) {
        // Storage quota exceeded
        await this.cleanup()
        localStorage.setItem(key, value)
      } else {
        throw error
      }
    }
  }

  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    localStorage.clear()
  }

  async getAllKeys(): Promise<string[]> {
    return Object.keys(localStorage)
  }

  async getSize(): Promise<number> {
    let size = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length
      }
    }
    return size
  }

  private async cleanup(): Promise<void> {
    const keys = await this.getAllKeys()
    const chatKeys = keys.filter(key => key.startsWith(defaultPersistenceConfig.keyPrefix))
    
    // Remove oldest entries first
    const keyDates = chatKeys.map(key => {
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const parsed = SerializationUtils.deserialize(data)
          return { key, date: parsed.lastModified || new Date(0) }
        }
      } catch (error) {
        return { key, date: new Date(0) }
      }
      return { key, date: new Date(0) }
    })

    keyDates.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Remove 25% of entries
    const toRemove = Math.floor(keyDates.length * 0.25)
    for (let i = 0; i < toRemove; i++) {
      await this.removeItem(keyDates[i].key)
    }
  }
}

export class IndexedDBAdapter extends StorageAdapter {
  private dbName = 'MultiPhaseChatDB'
  private dbVersion = 1
  private storeName = 'chatData'

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        key,
        value,
        timestamp: Date.now()
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    db.close()
  }

  async getItem(key: string): Promise<string | null> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)
    
    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    db.close()
    return result ? result.value : null
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    db.close()
  }

  async clear(): Promise<void> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readwrite')
    const store = transaction.objectStore(this.storeName)
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    db.close()
  }

  async getAllKeys(): Promise<string[]> {
    const db = await this.openDB()
    const transaction = db.transaction([this.storeName], 'readonly')
    const store = transaction.objectStore(this.storeName)
    
    const keys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys()
      request.onsuccess = () => resolve(request.result as string[])
      request.onerror = () => reject(request.error)
    })
    
    db.close()
    return keys
  }

  async getSize(): Promise<number> {
    // Approximate size calculation for IndexedDB
    const keys = await this.getAllKeys()
    let size = 0
    
    for (const key of keys) {
      const value = await this.getItem(key)
      if (value) {
        size += value.length + key.length
      }
    }
    
    return size
  }
}

// Main persistence manager
export class ChatPersistenceManager {
  private adapter: StorageAdapter
  private config: PersistenceConfig

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...defaultPersistenceConfig, ...config }
    this.adapter = this.createAdapter()
  }

  private createAdapter(): StorageAdapter {
    switch (this.config.provider) {
      case 'indexedDB':
        return new IndexedDBAdapter()
      case 'localStorage':
      default:
        return new LocalStorageAdapter()
    }
  }

  private processData(data: any, operation: 'save' | 'load'): string | any {
    let processed = data

    if (operation === 'save') {
      // Add metadata
      processed = {
        ...data,
        __meta: {
          version: this.config.version,
          timestamp: Date.now(),
          lastModified: new Date()
        }
      }

      // Serialize
      let serialized = SerializationUtils.serialize(processed)

      // Compress if enabled
      if (this.config.compressionEnabled) {
        serialized = SerializationUtils.compress(serialized)
      }

      return serialized
    } else {
      // Load operation
      let deserialized = data

      // Decompress if needed
      if (this.config.compressionEnabled) {
        deserialized = SerializationUtils.decompress(data)
      }

      // Deserialize
      const parsed = SerializationUtils.deserialize(deserialized)
      
      // Version check
      if (parsed?.__meta?.version !== this.config.version) {
        console.warn('Persistence version mismatch, data may be incompatible')
      }

      return parsed
    }
  }

  async savePersistentState(tripId: string, userId: string, state: ChatPersistentState): Promise<void> {
    try {
      const key = STORAGE_KEYS.persistentState(tripId, userId)
      const processed = this.processData(state, 'save')
      await this.adapter.setItem(key, processed)
    } catch (error) {
      console.error('Failed to save persistent state:', error)
      throw error
    }
  }

  async loadPersistentState(tripId: string, userId: string): Promise<ChatPersistentState | null> {
    try {
      const key = STORAGE_KEYS.persistentState(tripId, userId)
      const data = await this.adapter.getItem(key)
      
      if (!data) return null
      
      const processed = this.processData(data, 'load')
      return processed || null
    } catch (error) {
      console.error('Failed to load persistent state:', error)
      return null
    }
  }

  async saveMessageDrafts(tripId: string, userId: string, drafts: Record<ChatPhase, string>): Promise<void> {
    try {
      const key = STORAGE_KEYS.messageDrafts(tripId, userId)
      const processed = this.processData(drafts, 'save')
      await this.adapter.setItem(key, processed)
    } catch (error) {
      console.error('Failed to save message drafts:', error)
    }
  }

  async loadMessageDrafts(tripId: string, userId: string): Promise<Record<ChatPhase, string> | null> {
    try {
      const key = STORAGE_KEYS.messageDrafts(tripId, userId)
      const data = await this.adapter.getItem(key)
      
      if (!data) return null
      
      return this.processData(data, 'load')
    } catch (error) {
      console.error('Failed to load message drafts:', error)
      return null
    }
  }

  async savePendingActions(tripId: string, userId: string, actions: ChatAction[]): Promise<void> {
    try {
      const key = STORAGE_KEYS.pendingActions(tripId, userId)
      const processed = this.processData(actions, 'save')
      await this.adapter.setItem(key, processed)
    } catch (error) {
      console.error('Failed to save pending actions:', error)
    }
  }

  async loadPendingActions(tripId: string, userId: string): Promise<ChatAction[]> {
    try {
      const key = STORAGE_KEYS.pendingActions(tripId, userId)
      const data = await this.adapter.getItem(key)
      
      if (!data) return []
      
      return this.processData(data, 'load') || []
    } catch (error) {
      console.error('Failed to load pending actions:', error)
      return []
    }
  }

  async clearUserData(tripId: string, userId: string): Promise<void> {
    try {
      const keys = [
        STORAGE_KEYS.persistentState(tripId, userId),
        STORAGE_KEYS.messageDrafts(tripId, userId),
        STORAGE_KEYS.phaseHistory(tripId, userId),
        STORAGE_KEYS.analytics(tripId, userId),
        STORAGE_KEYS.readStatus(tripId, userId),
        STORAGE_KEYS.pendingActions(tripId, userId)
      ]

      await Promise.all(keys.map(key => this.adapter.removeItem(key)))
    } catch (error) {
      console.error('Failed to clear user data:', error)
    }
  }

  async clearExpiredData(): Promise<void> {
    if (!this.config.autoCleanup) return

    try {
      const allKeys = await this.adapter.getAllKeys()
      const chatKeys = allKeys.filter(key => key.startsWith(this.config.keyPrefix))
      const cutoffDate = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000)

      for (const key of chatKeys) {
        try {
          const data = await this.adapter.getItem(key)
          if (data) {
            const processed = this.processData(data, 'load')
            if (processed?.__meta?.timestamp < cutoffDate) {
              await this.adapter.removeItem(key)
            }
          }
        } catch (error) {
          console.warn(`Failed to process key ${key} during cleanup:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to clear expired data:', error)
    }
  }

  async getStorageInfo(): Promise<{
    totalSize: number
    keysCount: number
    chatKeysCount: number
    oldestEntry: Date | null
    newestEntry: Date | null
  }> {
    try {
      const totalSize = await this.adapter.getSize()
      const allKeys = await this.adapter.getAllKeys()
      const chatKeys = allKeys.filter(key => key.startsWith(this.config.keyPrefix))
      
      let oldestEntry: Date | null = null
      let newestEntry: Date | null = null

      for (const key of chatKeys) {
        try {
          const data = await this.adapter.getItem(key)
          if (data) {
            const processed = this.processData(data, 'load')
            const timestamp = processed?.__meta?.lastModified
            if (timestamp) {
              const date = new Date(timestamp)
              if (!oldestEntry || date < oldestEntry) oldestEntry = date
              if (!newestEntry || date > newestEntry) newestEntry = date
            }
          }
        } catch (error) {
          console.warn(`Failed to process key ${key} for storage info:`, error)
        }
      }

      return {
        totalSize,
        keysCount: allKeys.length,
        chatKeysCount: chatKeys.length,
        oldestEntry,
        newestEntry
      }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return {
        totalSize: 0,
        keysCount: 0,
        chatKeysCount: 0,
        oldestEntry: null,
        newestEntry: null
      }
    }
  }
}

// Global persistence manager instance
export const chatPersistence = new ChatPersistenceManager()

// Utility functions for easy access
export const persistenceUtils = {
  save: chatPersistence.savePersistentState.bind(chatPersistence),
  load: chatPersistence.loadPersistentState.bind(chatPersistence),
  saveDrafts: chatPersistence.saveMessageDrafts.bind(chatPersistence),
  loadDrafts: chatPersistence.loadMessageDrafts.bind(chatPersistence),
  saveActions: chatPersistence.savePendingActions.bind(chatPersistence),
  loadActions: chatPersistence.loadPendingActions.bind(chatPersistence),
  clear: chatPersistence.clearUserData.bind(chatPersistence),
  cleanup: chatPersistence.clearExpiredData.bind(chatPersistence),
  info: chatPersistence.getStorageInfo.bind(chatPersistence)
}
