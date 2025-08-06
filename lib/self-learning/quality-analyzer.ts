// Quality analysis and evaluation system
export interface QualityMetrics {
  coherenceScore: number
  relevanceScore: number
  compressionRatio: number
  keywordCoverage: number
  sentenceQuality: number
  overallScore: number
}

export class SummaryQualityAnalyzer {
  
  analyzeSummaryQuality(
    originalText: string, 
    summary: string, 
    keyPhrases: string[]
  ): QualityMetrics {
    const coherenceScore = this.calculateCoherence(summary)
    const relevanceScore = this.calculateRelevance(originalText, summary)
    const compressionRatio = this.calculateCompressionRatio(originalText, summary)
    const keywordCoverage = this.calculateKeywordCoverage(originalText, summary, keyPhrases)
    const sentenceQuality = this.calculateSentenceQuality(summary)
    
    const overallScore = (
      coherenceScore * 0.25 +
      relevanceScore * 0.3 +
      compressionRatio * 0.15 +
      keywordCoverage * 0.2 +
      sentenceQuality * 0.1
    )
    
    return {
      coherenceScore,
      relevanceScore,
      compressionRatio,
      keywordCoverage,
      sentenceQuality,
      overallScore
    }
  }

  private calculateCoherence(summary: string): number {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length < 2) return 0.5
    
    let coherenceScore = 0
    const transitionWords = [
      'however', 'therefore', 'furthermore', 'moreover', 'consequently',
      'thus', 'additionally', 'meanwhile', 'nevertheless', 'nonetheless',
      'first', 'second', 'third', 'finally', 'in conclusion', 'to summarize'
    ]
    
    // Check for transition words
    const summaryLower = summary.toLowerCase()
    transitionWords.forEach(word => {
      if (summaryLower.includes(word)) {
        coherenceScore += 0.1
      }
    })
    
    // Check sentence length consistency
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    const lengthVariance = sentences.reduce((sum, s) => sum + Math.pow(s.length - avgLength, 2), 0) / sentences.length
    const lengthConsistency = Math.max(0, 1 - (lengthVariance / (avgLength * avgLength)))
    
    coherenceScore += lengthConsistency * 0.3
    
    // Check for repetitive patterns
    const words = summary.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)
    const repetitionScore = uniqueWords.size / words.length
    coherenceScore += repetitionScore * 0.4
    
    return Math.min(1, coherenceScore)
  }

  private calculateRelevance(originalText: string, summary: string): number {
    const originalWords = this.extractMeaningfulWords(originalText.toLowerCase())
    const summaryWords = this.extractMeaningfulWords(summary.toLowerCase())
    
    if (originalWords.length === 0 || summaryWords.length === 0) return 0
    
    // Calculate word overlap
    const commonWords = summaryWords.filter(word => originalWords.includes(word))
    const wordOverlap = commonWords.length / summaryWords.length
    
    // Calculate semantic similarity (simplified)
    const originalFreq = this.getWordFrequency(originalWords)
    const summaryFreq = this.getWordFrequency(summaryWords)
    
    let semanticScore = 0
    for (const word of summaryWords) {
      const originalWeight = originalFreq[word] || 0
      const summaryWeight = summaryFreq[word] || 0
      semanticScore += Math.min(originalWeight, summaryWeight)
    }
    
    semanticScore = semanticScore / summaryWords.length
    
    return (wordOverlap * 0.6 + semanticScore * 0.4)
  }

  private calculateCompressionRatio(originalText: string, summary: string): number {
    const originalLength = originalText.length
    const summaryLength = summary.length
    
    if (originalLength === 0) return 0
    
    const ratio = summaryLength / originalLength
    
    // Optimal compression ratio is between 0.1 and 0.3
    if (ratio >= 0.1 && ratio <= 0.3) {
      return 1.0
    } else if (ratio < 0.1) {
      return ratio / 0.1 // Penalize over-compression
    } else {
      return Math.max(0, 1 - (ratio - 0.3) / 0.7) // Penalize under-compression
    }
  }

  private calculateKeywordCoverage(originalText: string, summary: string, keyPhrases: string[]): number {
    if (keyPhrases.length === 0) return 0.5
    
    const summaryLower = summary.toLowerCase()
    const coveredKeywords = keyPhrases.filter(phrase => 
      summaryLower.includes(phrase.toLowerCase())
    )
    
    return coveredKeywords.length / keyPhrases.length
  }

  private calculateSentenceQuality(summary: string): number {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0)
    if (sentences.length === 0) return 0
    
    let qualityScore = 0
    
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/)
      const wordCount = words.length
      
      // Optimal sentence length (10-25 words)
      if (wordCount >= 10 && wordCount <= 25) {
        qualityScore += 1
      } else if (wordCount >= 8 && wordCount <= 30) {
        qualityScore += 0.7
      } else {
        qualityScore += 0.3
      }
      
      // Check for grammatical indicators
      const hasCapitalization = /^[A-Z]/.test(sentence.trim())
      const hasProperEnding = /[.!?]$/.test(sentence.trim())
      
      if (hasCapitalization) qualityScore += 0.1
      if (hasProperEnding) qualityScore += 0.1
    })
    
    return qualityScore / sentences.length
  }

  private extractMeaningfulWords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ])
    
    return text.split(/\s+/)
      .map(word => word.replace(/[^\w]/g, '').toLowerCase())
      .filter(word => word.length >= 3 && !stopWords.has(word) && !/^\d+$/.test(word))
  }

  private getWordFrequency(words: string[]): { [key: string]: number } {
    const freq: { [key: string]: number } = {}
    words.forEach(word => {
      freq[word] = (freq[word] || 0) + 1
    })
    
    // Normalize frequencies
    const maxFreq = Math.max(...Object.values(freq))
    Object.keys(freq).forEach(word => {
      freq[word] = freq[word] / maxFreq
    })
    
    return freq
  }

  detectIssues(metrics: QualityMetrics, summary: string): string[] {
    const issues: string[] = []
    
    if (metrics.coherenceScore < 0.4) {
      issues.push('Low coherence - summary lacks logical flow')
    }
    
    if (metrics.relevanceScore < 0.5) {
      issues.push('Low relevance - summary may not capture main content')
    }
    
    if (metrics.compressionRatio < 0.3) {
      issues.push('Poor compression ratio - summary may be too long or too short')
    }
    
    if (metrics.keywordCoverage < 0.4) {
      issues.push('Low keyword coverage - important terms missing')
    }
    
    if (metrics.sentenceQuality < 0.6) {
      issues.push('Poor sentence quality - sentences may be too short or malformed')
    }
    
    // Check for specific patterns
    if (summary.split(/[.!?]+/).length < 3) {
      issues.push('Summary too brief - needs more sentences')
    }
    
    if (summary.includes('Unable to') || summary.includes('Error:')) {
      issues.push('Error in summary generation')
    }
    
    return issues
  }

  generateImprovementSuggestions(metrics: QualityMetrics, issues: string[]): string[] {
    const suggestions: string[] = []
    
    if (metrics.coherenceScore < 0.4) {
      suggestions.push('Add more transition words and improve sentence flow')
      suggestions.push('Ensure logical progression of ideas')
    }
    
    if (metrics.relevanceScore < 0.5) {
      suggestions.push('Focus on main topics and key concepts')
      suggestions.push('Increase weight for important keywords')
    }
    
    if (metrics.compressionRatio < 0.3) {
      suggestions.push('Adjust sentence selection criteria')
      suggestions.push('Optimize summary length for content density')
    }
    
    if (metrics.keywordCoverage < 0.4) {
      suggestions.push('Prioritize sentences containing key terms')
      suggestions.push('Improve keyword extraction algorithm')
    }
    
    if (metrics.sentenceQuality < 0.6) {
      suggestions.push('Filter out malformed or very short sentences')
      suggestions.push('Improve sentence scoring for length and structure')
    }
    
    return suggestions
  }
}