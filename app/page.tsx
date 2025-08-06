"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { FileText, Download, Brain, Upload, Loader2, AlertCircle, Zap, CheckCircle2, Link, Database, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SelfLearningEngine } from "@/lib/self-learning/learning-engine"
import { URLPDFExtractor } from "@/lib/self-learning/url-extractor"

export default function PDFSummarizer() {
  // ... existing state variables ...
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [summary, setSummary] = useState<string>("")
  const [summaryLevel, setSummaryLevel] = useState<"student" | "professor">("student")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [keyPhrases, setKeyPhrases] = useState<string[]>([])

  // New self-learning state
  const [learningEngine, setLearningEngine] = useState<SelfLearningEngine | null>(null)
  const [urlExtractor] = useState(new URLPDFExtractor())
  const [pdfUrl, setPdfUrl] = useState("")
  const [isUrlExtracting, setIsUrlExtracting] = useState(false)
  const [learningStats, setLearningStats] = useState({
    documentsProcessed: 0,
    averageQuality: 0,
    lastUpdate: null as Date | null
  })
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null)

  // Initialize self-learning engine
  useEffect(() => {
    const initLearning = async () => {
      try {
        const engine = new SelfLearningEngine()
        await engine.initialize()
        setLearningEngine(engine)
        
        // Load learning stats
        const weights = await engine.getCurrentWeights()
        if (weights) {
          setLearningStats({
            documentsProcessed: weights.performance.documentsProcessed,
            averageQuality: weights.performance.averageQuality,
            lastUpdate: weights.performance.lastUpdated
          })
        }
      } catch (error) {
        console.error('Failed to initialize learning engine:', error)
      }
    }
    
    initLearning()
  }, [])

  // ... existing PDF extraction functions with learning integration ...
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    console.log("Page Component: File uploaded:", uploadedFile?.name)

    if (uploadedFile && uploadedFile.type === "application/pdf") {
      setExtractedText("")
      setSummary("")
      setKeyPhrases([])
      setProgress(0)
      setCurrentStep("")
      setCurrentDocumentId(null)

      setFile(uploadedFile)
      await extractTextFromPDF(uploadedFile)
    } else if (uploadedFile) {
      setCurrentStep("Error: Please select a valid PDF file")
      console.error("Page Component: Invalid file type selected:", uploadedFile?.type)
    }
  }

  const extractTextFromPDF = async (pdfFile: File) => {
    setIsProcessing(true)
    setCurrentStep("Loading PDF processor...")
    setProgress(10)

    try {
      // ... existing PDF extraction logic ...
      setCurrentStep("Initializing PDF reader...")
      setProgress(20)

      let pdfjsLib = (window as any).pdfjsLib

      if (!pdfjsLib) {
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"

        await new Promise((resolve, reject) => {
          script.onload = () => resolve(null)
          script.onerror = (e) => reject(new Error("Failed to load PDF.js library."))
          document.head.appendChild(script)
        })

        pdfjsLib = (window as any).pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
      }

      setCurrentStep("Reading PDF file...")
      setProgress(30)
      const arrayBuffer = await pdfFile.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      let fullText = ""
      const numPages = pdf.numPages

      setCurrentStep(`Extracting text from ${numPages} pages...`)

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items
            .filter((item: any) => item.str && typeof item.str === 'string')
            .map((item: any) => item.str)
            .join(" ")
          fullText += pageText + " "
          setProgress(30 + (i / numPages) * 40)
        } catch (pageError) {
          console.warn(`Error processing page ${i}:`, pageError)
        }
      }

      const cleanedText = fullText
        .replace(/\s+/g, " ")
        .replace(/[^\w\s.,!?;:()\-"']/g, "")
        .trim()

      setExtractedText(cleanedText)
      setProgress(70)
      setCurrentStep("Text extraction completed!")

      // Record document in learning system
      if (learningEngine && cleanedText.length > 100) {
        try {
          const documentId = await learningEngine.recordDocument(
            cleanedText,
            'upload',
            pdfFile.name.replace('.pdf', '')
          )
          setCurrentDocumentId(documentId)
          setCurrentStep("Document recorded for learning!")
        } catch (error) {
          console.error('Failed to record document:', error)
        }
      }

    } catch (error) {
      console.error("Error during PDF text extraction:", error)
      setCurrentStep(`Error: ${error instanceof Error ? error.message : "Failed to extract text from PDF"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // New URL extraction function
  const handleUrlExtraction = async () => {
    if (!pdfUrl.trim()) {
      setCurrentStep("Error: Please enter a valid PDF URL")
      return
    }

    setIsUrlExtracting(true)
    setCurrentStep("Fetching PDF from URL...")
    setProgress(10)

    try {
      const { text, title } = await urlExtractor.extractFromURL(pdfUrl)
      
      setExtractedText(text)
      setCurrentStep("URL extraction completed!")
      setProgress(100)

      // Record document in learning system
      if (learningEngine && text.length > 100) {
        try {
          const documentId = await learningEngine.recordDocument(
            text,
            'url',
            title,
            pdfUrl
          )
          setCurrentDocumentId(documentId)
        } catch (error) {
          console.error('Failed to record URL document:', error)
        }
      }

    } catch (error) {
      console.error("URL extraction failed:", error)
      setCurrentStep(`Error: ${error instanceof Error ? error.message : "Failed to extract PDF from URL"}`)
    } finally {
      setIsUrlExtracting(false)
      setProgress(0)
    }
  }

  // Enhanced summary generation with learning integration
  const generateSummary = async () => {
    if (!extractedText) {
      setCurrentStep("Error: No text available for summarization. Please upload a PDF first.")
      return
    }

    setIsProcessing(true)
    setCurrentStep("Analyzing document structure...")
    setProgress(75)

    try {
      // Get current learning weights
      let weights = null
      if (learningEngine) {
        weights = await learningEngine.getCurrentWeights()
      }

      setCurrentStep("Performing intelligent text analysis...")
      setProgress(85)

      // Enhanced summary generation with learning weights
      const { summary: intelligentSummary, keyPhrases: extractedPhrases } = 
        generateIntelligentSummaryWithLearning(extractedText, weights)

      setCurrentStep("Formatting summary...")
      setProgress(95)

      let finalSummary: string
      if (summaryLevel === "professor") {
        finalSummary = `Academic Summary (Nivıskar AI v2.0):\n\n${intelligentSummary}\n\nThis summary was generated using our self-learning AI system that continuously improves based on document analysis and quality feedback.`
      } else {
        finalSummary = `Student Summary (Nivıskar AI v2.0):\n\n${intelligentSummary}\n\nGenerated by our adaptive AI that learns from each document to provide better summaries over time.`
      }

      setSummary(finalSummary)
      setKeyPhrases(extractedPhrases)
      setProgress(100)
      setCurrentStep("Intelligent summary generated successfully!")

      // Record summary in learning system
      if (learningEngine && currentDocumentId) {
        try {
          await learningEngine.recordSummary(
            currentDocumentId,
            finalSummary,
            summaryLevel,
            extractedPhrases,
            'intelligent-v2-learning'
          )
          
          // Update learning stats
          const updatedWeights = await learningEngine.getCurrentWeights()
          if (updatedWeights) {
            setLearningStats({
              documentsProcessed: updatedWeights.performance.documentsProcessed,
              averageQuality: updatedWeights.performance.averageQuality,
              lastUpdate: updatedWeights.performance.lastUpdated
            })
          }
        } catch (error) {
          console.error('Failed to record summary:', error)
        }
      }

    } catch (error) {
      console.error("Summary generation failed:", error)
      setCurrentStep("Error: Could not generate summary. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Enhanced summary generation with learning weights
  const generateIntelligentSummaryWithLearning = (text: string, weights: any): { summary: string; keyPhrases: string[] } => {
    const { sentences, wordFreq, topWords } = analyzeText(text)

    if (sentences.length === 0) {
      return { summary: "Unable to generate summary from the extracted text.", keyPhrases: [] }
    }

    // Use learning weights if available
    const learningWeights = weights?.weights || {
      positionWeight: 4.0,
      lengthWeight: 3.0,
      keywordWeight: 1.0,
      importancePhraseWeight: 2.5,
      academicTermWeight: 1.5,
      questionWeight: 1.0
    }

    const scoredSentences = sentences.map((sentence, index) => {
      let score = 0
      const words = sentence.toLowerCase().split(/\s+/)
      const wordCount = words.length

      // Position scoring with learning weights
      if (index < sentences.length * 0.15) score += learningWeights.positionWeight
      if (index > sentences.length * 0.85) score += learningWeights.positionWeight * 0.75
      if (index >= sentences.length * 0.4 && index <= sentences.length * 0.6) score += learningWeights.positionWeight * 0.5

      // Length scoring with learning weights
      if (wordCount >= 10 && wordCount <= 30) score += learningWeights.lengthWeight
      if (wordCount >= 15 && wordCount <= 25) score += learningWeights.lengthWeight * 0.67

      // Keyword scoring with learning weights
      let keywordCount = 0
      words.forEach((word) => {
        const cleanWord = word.replace(/[^\w]/g, "")
        if (topWords.includes(cleanWord)) {
          keywordCount++
          score += learningWeights.keywordWeight
        }
      })

      // Importance phrases with learning weights
      const importantPhrases = [
        "in conclusion", "to summarize", "the main", "key finding", "important",
        "significant", "research shows", "study reveals", "analysis indicates",
        "results suggest", "evidence shows", "data indicates", "findings demonstrate"
      ]

      const lowerSentence = sentence.toLowerCase()
      importantPhrases.forEach((phrase) => {
        if (lowerSentence.includes(phrase)) {
          score += learningWeights.importancePhraseWeight
        }
      })

      // Academic terms with learning weights
      const academicPatterns = [/tion$/, /sion$/, /ment$/, /ness$/, /ity$/, /ism$/, /ogy$/, /ics$/]
      words.forEach(word => {
        if (academicPatterns.some(pattern => pattern.test(word))) {
          score += learningWeights.academicTermWeight
        }
      })

      // Question words with learning weights
      const questionWords = ["what", "how", "why", "when", "where", "who", "which"]
      questionWords.forEach((qword) => {
        if (lowerSentence.includes(qword)) score += learningWeights.questionWeight
      })

      return { sentence: sentence.trim(), score, index, wordCount }
    })

    let numSentences: number
    if (summaryLevel === "professor") {
      numSentences = Math.min(12, Math.max(4, Math.floor(sentences.length * 0.2)))
    } else {
      numSentences = Math.min(8, Math.max(3, Math.floor(sentences.length * 0.15)))
    }

    const topSentences = scoredSentences
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, numSentences)
      .sort((a, b) => a.index - b.index)

    if (topSentences.length === 0) {
      return { summary: "Unable to generate a meaningful summary from the extracted text.", keyPhrases: [] }
    }

    const summaryText = topSentences.map((item) => item.sentence).join(". ") + "."
    const extractedPhrases = topWords.slice(0, 8)

    return { summary: summaryText, keyPhrases: extractedPhrases }
  }

  // ... existing analyzeText function remains the same ...
  const analyzeText = (text: string) => {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 15)
    const words = text.toLowerCase().split(/\s+/)

    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
      "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did"
      // ... rest of stop words
    ])

    const wordFreq: { [key: string]: number } = {}
    words.forEach((word) => {
      const cleanWord = word.replace(/[^\w]/g, "").toLowerCase()
      if (
        cleanWord.length >= 4 &&
        !stopWords.has(cleanWord) &&
        !/^\d+$/.test(cleanWord) &&
        !/^[^a-z]*$/.test(cleanWord)
      ) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1
      }
    })

    const meaningfulWords = Object.entries(wordFreq)
      .filter(([word, freq]) => freq >= 2 && word.length >= 4)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([word]) => word)

    const academicTerms = meaningfulWords.filter((word) => {
      const academicPatterns = [
        /tion$/, /sion$/, /ment$/, /ness$/, /ity$/, /ism$/, /ogy$/, /ics$/,
        /analysis/, /research/, /study/, /method/, /theory/, /concept/
      ]
      return academicPatterns.some((pattern) => pattern.test(word))
    })

    const topWords = [...new Set([...academicTerms, ...meaningfulWords])].slice(0, 8)

    return { sentences, wordFreq, topWords }
  }

  // ... existing download functions remain the same ...
  const downloadAsTXT = () => {
    let content = summary
    if (keyPhrases.length > 0) {
      content += `\n\n--- Key Terms ---\n${keyPhrases.join(", ")}`
    }

    const element = document.createElement("a")
    const file = new Blob([content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `summary_${summaryLevel}_${Date.now()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const downloadAsPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text(`PDF Summary (${summaryLevel.charAt(0).toUpperCase() + summaryLevel.slice(1)} Level)`, 20, 20)

    doc.setFontSize(12)
    const splitText = doc.splitTextToSize(summary, 170)
    let yPosition = 40
    doc.text(splitText, 20, yPosition)

    if (keyPhrases.length > 0) {
      yPosition += splitText.length * 5 + 10
      doc.setFontSize(14)
      doc.text("Key Terms:", 20, yPosition)
      yPosition += 10
      doc.setFontSize(11)
      const keyPhrasesText = keyPhrases.join(", ")
      const splitKeyPhrases = doc.splitTextToSize(keyPhrasesText, 170)
      doc.text(splitKeyPhrases, 20, yPosition)
    }

    doc.setFontSize(10)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280)

    doc.save(`summary_${summaryLevel}_${Date.now()}.pdf`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent-2/10 to-background p-4 transition-colors duration-[10ms]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-accent-1 transition-colors duration-[10ms]" />
            <h1 className="text-3xl font-bold text-foreground transition-colors duration-[10ms]">Nivıskar AI v2.0</h1>
          </div>
          <p className="text-muted-foreground transition-colors duration-[10ms]">
            Self-Learning PDF Summarization AI with Continuous Improvement
          </p>
          
          {/* Learning Stats */}
          {learningStats.documentsProcessed > 0 && (
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Database className="w-4 h-4" />
                <span>{learningStats.documentsProcessed} documents processed</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{(learningStats.averageQuality * 100).toFixed(1)}% avg quality</span>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Upload Section with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent-1" />
              Document Input
            </CardTitle>
            <CardDescription>Upload a PDF file or extract from URL for intelligent summarization</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">File Upload</TabsTrigger>
                <TabsTrigger value="url">URL Extraction</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdf-upload">Choose PDF File</Label>
                  <Input id="pdf-upload" type="file" accept=".pdf" onChange={handleFileUpload} className="cursor-pointer" />
                </div>

                {file && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-accent-1/10 rounded-lg dark:bg-accent-1/20">
                      <FileText className="w-5 h-5 text-accent-1" />
                      <span className="text-sm text-foreground">{file.name}</span>
                      <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdf-url">PDF URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pdf-url"
                      type="url"
                      placeholder="https://example.com/document.pdf"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                    />
                    <Button
                      onClick={handleUrlExtraction}
                      disabled={isUrlExtracting || !pdfUrl.trim()}
                      className="bg-accent-1 text-accent-1-foreground hover:bg-accent-1/90"
                    >
                      {isUrlExtracting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {currentStep.includes("Error") && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm text-destructive">{currentStep}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="summary-level">Summary Level</Label>
              <Select value={summaryLevel} onValueChange={(value: "student" | "professor") => setSummaryLevel(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select summary level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student Level - Simplified and concise</SelectItem>
                  <SelectItem value="professor">Professor Level - Detailed and academic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {extractedText && (
              <Button
                onClick={generateSummary}
                disabled={isProcessing}
                className="w-full bg-accent-1 text-accent-1-foreground hover:bg-accent-1/90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate AI Summary (Learning Mode)
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Progress Section */}
        {(isProcessing || isUrlExtracting) && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{currentStep}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rest of the existing components remain the same... */}
        {/* Extracted Text Preview, Key Phrases, Summary Section, Features */}
        
        {/* Enhanced Features Section */}
        <Card>
          <CardHeader>
            <CardTitle>Self-Learning AI Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-accent-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Adaptive Learning Engine
                </h4>
                <p className="text-sm text-muted-foreground">
                  AI continuously learns from each document to improve summarization quality
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-accent-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> URL-Based Extraction
                </h4>
                <p className="text-sm text-muted-foreground">
                  Extract and learn from PDFs directly from web URLs
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-accent-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Quality Analysis
                </h4>
                <p className="text-sm text-muted-foreground">
                  Automatic quality assessment and improvement suggestions
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-accent-1 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Background Learning
                </h4>
                <p className="text-sm text-muted-foreground">
                  Continuous improvement through autonomous background processing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}