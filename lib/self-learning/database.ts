// Database schema and storage system for self-learning engine
export interface DocumentRecord {
  id: string
  title: string
  source: 'upload' | 'url'
  sourceUrl?: string
  plainText: string
  extractedAt: Date
  fileSize: number
  metadata: {
    wordCount: number
    sentenceCount: number
    language?: string
    documentType?: string
  }
}

export interface SummaryRecord {
  id: string
  documentId: string
  summaryText: string
  summaryLevel: 'student' | 'professor'
  generatedAt: Date
  algorithm: string
  keyPhrases: string[]
  qualityScore?: number
  userFeedback?: 'positive' | 'negative' | 'neutral'
}

export interface LearningMetrics {
  id: string
  documentId: string
  summaryId: string
  metrics: {
    coherenceScore: number
    relevanceScore: number
    compressionRatio: number
    keywordCoverage: number
    sentenceQuality: number
  }
  detectedIssues: string[]
  improvementSuggestions: string[]
  analyzedAt: Date
}

export interface LearningWeights {
  id: string
  version: string
  weights: {
    positionWeight: number
    lengthWeight: number
    keywordWeight: number
    importancePhraseWeight: number
    academicTermWeight: number
    questionWeight: number
  }
  performance: {
    averageQuality: number
    documentsProcessed: number
    lastUpdated: Date
  }
}

// IndexedDB storage implementation
export class SelfLearningStorage {
  private dbName = 'nivıskar-learning'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const documentsStore = db.createObjectStore('documents', { keyPath: 'id' })
          documentsStore.createIndex('source', 'source', { unique: false })
          documentsStore.createIndex('extractedAt', 'extractedAt', { unique: false })
        }
        
        // Summaries store
        if (!db.objectStoreNames.contains('summaries')) {
          const summariesStore = db.createObjectStore('summaries', { keyPath: 'id' })
          summariesStore.createIndex('documentId', 'documentId', { unique: false })
          summariesStore.createIndex('generatedAt', 'generatedAt', { unique: false })
        }
        
        // Learning metrics store
        if (!db.objectStoreNames.contains('learningMetrics')) {
          const metricsStore = db.createObjectStore('learningMetrics', { keyPath: 'id' })
          metricsStore.createIndex('documentId', 'documentId', { unique: false })
          metricsStore.createIndex('summaryId', 'summaryId', { unique: false })
        }
        
        // Learning weights store
        if (!db.objectStoreNames.contains('learningWeights')) {
          db.createObjectStore('learningWeights', { keyPath: 'id' })
        }
      }
    })
  }

  async storeDocument(document: DocumentRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const transaction = this.db.transaction(['documents'], 'readwrite')
    const store = transaction.objectStore('documents')
    await store.add(document)
  }

  async storeSummary(summary: SummaryRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const transaction = this.db.transaction(['summaries'], 'readwrite')
    const store = transaction.objectStore('summaries')
    await store.add(summary)
  }

  async storeMetrics(metrics: LearningMetrics): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const transaction = this.db.transaction(['learningMetrics'], 'readwrite')
    const store = transaction.objectStore('learningMetrics')
    await store.add(metrics)
  }

  async getRecentDocuments(limit: number = 50): Promise<DocumentRecord[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    const transaction = this.db.transaction(['documents'], 'readonly')
    const store = transaction.objectStore('documents')
    const index = store.index('extractedAt')
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev')
      const results: DocumentRecord[] = []
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor && results.length < limit) {
          results.push(cursor.value)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  async getCurrentWeights(): Promise<LearningWeights | null> {
    if (!this.db) throw new Error('Database not initialized')
    
    const transaction = this.db.transaction(['learningWeights'], 'readonly')
    const store = transaction.objectStore('learningWeights')
    
    return new Promise((resolve, reject) => {
      const request = store.openCursor(null, 'prev')
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        resolve(cursor ? cursor.value : null)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  async updateWeights(weights: LearningWeights): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    const transaction = this.db.transaction(['learningWeights'], 'readwrite')
    const store = transaction.objectStore('learningWeights')
    await store.put(weights)
  }
}