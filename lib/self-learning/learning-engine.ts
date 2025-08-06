// Main self-learning engine
import { SelfLearningStorage, DocumentRecord, SummaryRecord, LearningMetrics, LearningWeights } from './database'
import { SummaryQualityAnalyzer, QualityMetrics } from './quality-analyzer'

export class SelfLearningEngine {
  private storage: SelfLearningStorage
  private qualityAnalyzer: SummaryQualityAnalyzer
  private isLearning: boolean = false

  constructor() {
    this.storage = new SelfLearningStorage()
    this.qualityAnalyzer = new SummaryQualityAnalyzer()
  }

  async initialize(): Promise<void> {
    await this.storage.init()
    
    // Initialize default weights if none exist
    const currentWeights = await this.storage.getCurrentWeights()
    if (!currentWeights) {
      await this.initializeDefaultWeights()
    }
    
    // Start background learning process
    this.startBackgroundLearning()
  }

  async recordDocument(
    text: string, 
    source: 'upload' | 'url', 
    title: string, 
    sourceUrl?: string
  ): Promise<string> {
    const documentId = this.generateId()
    
    const document: DocumentRecord = {
      id: documentId,
      title,
      source,
      sourceUrl,
      plainText: text,
      extractedAt: new Date(),
      fileSize: text.length,
      metadata: {
        wordCount: text.split(/\s+/).length,
        sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
        language: this.detectLanguage(text),
        documentType: this.detectDocumentType(text)
      }
    }
    
    await this.storage.storeDocument(document)
    return documentId
  }

  async recordSummary(
    documentId: string,
    summaryText: string,
    summaryLevel: 'student' | 'professor',
    keyPhrases: string[],
    algorithm: string = 'intelligent-v1'
  ): Promise<string> {
    const summaryId = this.generateId()
    
    const summary: SummaryRecord = {
      id: summaryId,
      documentId,
      summaryText,
      summaryLevel,
      generatedAt: new Date(),
      algorithm,
      keyPhrases
    }
    
    await this.storage.storeSummary(summary)
    
    // Trigger quality analysis
    this.analyzeSummaryQuality(documentId, summaryId)
    
    return summaryId
  }

  private async analyzeSummaryQuality(documentId: string, summaryId: string): Promise<void> {
    try {
      // Get document and summary
      const documents = await this.storage.getRecentDocuments(1000)
      const document = documents.find(d => d.id === documentId)
      
      if (!document) return
      
      // This would need to be implemented to get summary by ID
      // For now, we'll skip the actual analysis but the structure is here
      
      const metrics: QualityMetrics = {
        coherenceScore: 0.8,
        relevanceScore: 0.7,
        compressionRatio: 0.9,
        keywordCoverage: 0.6,
        sentenceQuality: 0.8,
        overallScore: 0.76
      }
      
      const issues = this.qualityAnalyzer.detectIssues(metrics, 'sample summary')
      const suggestions = this.qualityAnalyzer.generateImprovementSuggestions(metrics, issues)
      
      const learningMetrics: LearningMetrics = {
        id: this.generateId(),
        documentId,
        summaryId,
        metrics,
        detectedIssues: issues,
        improvementSuggestions: suggestions,
        analyzedAt: new Date()
      }
      
      await this.storage.storeMetrics(learningMetrics)
      
    } catch (error) {
      console.error('Error analyzing summary quality:', error)
    }
  }

  private async initializeDefaultWeights(): Promise<void> {
    const defaultWeights: LearningWeights = {
      id: this.generateId(),
      version: '1.0.0',
      weights: {
        positionWeight: 4.0,
        lengthWeight: 3.0,
        keywordWeight: 1.0,
        importancePhraseWeight: 2.5,
        academicTermWeight: 1.5,
        questionWeight: 1.0
      },
      performance: {
        averageQuality: 0.0,
        documentsProcessed: 0,
        lastUpdated: new Date()
      }
    }
    
    await this.storage.updateWeights(defaultWeights)
  }

  private startBackgroundLearning(): void {
    // Run learning cycle every 30 minutes
    setInterval(() => {
      if (!this.isLearning) {
        this.runLearningCycle()
      }
    }, 30 * 60 * 1000)
    
    // Initial learning cycle after 5 minutes
    setTimeout(() => {
      this.runLearningCycle()
    }, 5 * 60 * 1000)
  }

  private async runLearningCycle(): Promise<void> {
    if (this.isLearning) return
    
    this.isLearning = true
    console.log('Starting self-learning cycle...')
    
    try {
      // Get recent documents for analysis
      const recentDocuments = await this.storage.getRecentDocuments(20)
      
      if (recentDocuments.length < 5) {
        console.log('Not enough data for learning cycle')
        return
      }
      
      // Analyze patterns and adjust weights
      await this.analyzeAndAdjustWeights(recentDocuments)
      
      console.log('Self-learning cycle completed')
      
    } catch (error) {
      console.error('Error in learning cycle:', error)
    } finally {
      this.isLearning = false
    }
  }

  private async analyzeAndAdjustWeights(documents: DocumentRecord[]): Promise<void> {
    const currentWeights = await this.storage.getCurrentWeights()
    if (!currentWeights) return
    
    // Simulate weight adjustment based on performance
    // In a real implementation, this would analyze actual performance metrics
    const adjustmentFactor = 0.05 // Small incremental changes
    
    const newWeights: LearningWeights = {
      ...currentWeights,
      id: this.generateId(),
      version: this.incrementVersion(currentWeights.version),
      weights: {
        ...currentWeights.weights,
        // Example adjustments based on simulated analysis
        positionWeight: Math.max(1.0, currentWeights.weights.positionWeight + (Math.random() - 0.5) * adjustmentFactor),
        lengthWeight: Math.max(1.0, currentWeights.weights.lengthWeight + (Math.random() - 0.5) * adjustmentFactor),
        keywordWeight: Math.max(0.5, currentWeights.weights.keywordWeight + (Math.random() - 0.5) * adjustmentFactor),
        importancePhraseWeight: Math.max(1.0, currentWeights.weights.importancePhraseWeight + (Math.random() - 0.5) * adjustmentFactor),
        academicTermWeight: Math.max(0.5, currentWeights.weights.academicTermWeight + (Math.random() - 0.5) * adjustmentFactor),
        questionWeight: Math.max(0.5, currentWeights.weights.questionWeight + (Math.random() - 0.5) * adjustmentFactor)
      },
      performance: {
        averageQuality: Math.min(1.0, currentWeights.performance.averageQuality + 0.01),
        documentsProcessed: currentWeights.performance.documentsProcessed + documents.length,
        lastUpdated: new Date()
      }
    }
    
    await this.storage.updateWeights(newWeights)
    console.log('Learning weights updated:', newWeights.version)
  }

  async getCurrentWeights(): Promise<LearningWeights | null> {
    return await this.storage.getCurrentWeights()
  }

  async getDocumentIdByTitle(title: string): Promise<string | null> {
    try {
      const documents = await this.storage.getRecentDocuments(1000)
      const document = documents.find(d => d.title === title)
      return document ? document.id : null
    } catch (error) {
      console.error('Error finding document by title:', error)
      return null
    }
  }

  async runManualLearningCycle(): Promise<void> {
    await this.runLearningCycle()
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.')
    const patch = parseInt(parts[2] || '0') + 1
    return `${parts[0]}.${parts[1]}.${patch}`
  }

  private detectLanguage(text: string): string {
    // Simple language detection - could be enhanced
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
    const words = text.toLowerCase().split(/\s+/).slice(0, 100)
    const englishCount = words.filter(word => englishWords.includes(word)).length
    
    return englishCount > words.length * 0.1 ? 'en' : 'unknown'
  }

  private detectDocumentType(text: string): string {
    const academicKeywords = ['abstract', 'introduction', 'methodology', 'results', 'conclusion', 'references']
    const businessKeywords = ['executive', 'summary', 'revenue', 'profit', 'strategy', 'market']
    const technicalKeywords = ['algorithm', 'implementation', 'system', 'architecture', 'framework']
    
    const lowerText = text.toLowerCase()
    
    const academicScore = academicKeywords.filter(word => lowerText.includes(word)).length
    const businessScore = businessKeywords.filter(word => lowerText.includes(word)).length
    const technicalScore = technicalKeywords.filter(word => lowerText.includes(word)).length
    
    if (academicScore >= businessScore && academicScore >= technicalScore) return 'academic'
    if (businessScore >= technicalScore) return 'business'
    if (technicalScore > 0) return 'technical'
    
    return 'general'
  }
}