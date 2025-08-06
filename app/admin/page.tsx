"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  TrendingUp, 
  Settings, 
  FileText, 
  Brain, 
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { SelfLearningEngine } from "@/lib/self-learning/learning-engine"
import { URLPDFExtractor } from "@/lib/self-learning/url-extractor"

export default function AdminDashboard() {
  const [learningEngine, setLearningEngine] = useState<SelfLearningEngine | null>(null)
  const [urlExtractor] = useState(new URLPDFExtractor())
  const [stats, setStats] = useState({
    documentsProcessed: 0,
    averageQuality: 0,
    lastUpdate: null as Date | null,
    currentVersion: '1.0.0'
  })
  
  const [batchUrls, setBatchUrls] = useState('')
  const [isBatchProcessing, setBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchResults, setBatchResults] = useState<any[]>([])

  useEffect(() => {
    const initAdmin = async () => {
      try {
        const engine = new SelfLearningEngine()
        await engine.initialize()
        setLearningEngine(engine)
        
        const weights = await engine.getCurrentWeights()
        if (weights) {
          setStats({
            documentsProcessed: weights.performance.documentsProcessed,
            averageQuality: weights.performance.averageQuality,
            lastUpdate: weights.performance.lastUpdated,
            currentVersion: weights.version
          })
        }
      } catch (error) {
        console.error('Failed to initialize admin dashboard:', error)
      }
    }
    
    initAdmin()
  }, [])

  const handleBatchURLProcessing = async () => {
    if (!learningEngine || !batchUrls.trim()) return
    
    setBatchProcessing(true)
    setBatchProgress(0)
    setBatchResults([])
    
    const urls = batchUrls.split('\n').filter(url => url.trim())
    
    try {
      const results = []
      
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i].trim()
        setBatchProgress((i / urls.length) * 100)
        
        try {
          const { text, title } = await urlExtractor.extractFromURL(url)
          
          if (text.length > 100) {
            const documentId = await learningEngine.recordDocument(text, 'url', title, url)
            results.push({ url, title, status: 'success', documentId, textLength: text.length })
          } else {
            results.push({ url, title, status: 'error', error: 'Insufficient text extracted' })
          }
        } catch (error) {
          results.push({ 
            url, 
            title: '', 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
      
      setBatchResults(results)
      setBatchProgress(100)
      
      // Update stats
      const weights = await learningEngine.getCurrentWeights()
      if (weights) {
        setStats({
          documentsProcessed: weights.performance.documentsProcessed,
          averageQuality: weights.performance.averageQuality,
          lastUpdate: weights.performance.lastUpdated,
          currentVersion: weights.version
        })
      }
      
    } catch (error) {
      console.error('Batch processing error:', error)
    } finally {
      setBatchProcessing(false)
    }
  }

  const triggerLearningCycle = async () => {
    if (!learningEngine) return
    
    try {
      await learningEngine.runManualLearningCycle()
      
      // Refresh stats
      const weights = await learningEngine.getCurrentWeights()
      if (weights) {
        setStats({
          documentsProcessed: weights.performance.documentsProcessed,
          averageQuality: weights.performance.averageQuality,
          lastUpdate: weights.performance.lastUpdated,
          currentVersion: weights.version
        })
      }
    } catch (error) {
      console.error('Learning cycle error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent-2/10 to-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-accent-1" />
            <h1 className="text-3xl font-bold">Nivıskar Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Self-Learning Engine Management & Analytics
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Documents Processed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.documentsProcessed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Average Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.averageQuality * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Engine Version</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentVersion}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {stats.lastUpdate ? stats.lastUpdate.toLocaleDateString() : 'Never'}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="batch-urls" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="batch-urls">Batch URL Processing</TabsTrigger>
            <TabsTrigger value="learning-control">Learning Control</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Batch URL Processing */}
          <TabsContent value="batch-urls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Batch PDF URL Processing
                </CardTitle>
                <CardDescription>
                  Add multiple PDF URLs (one per line) to automatically extract and store content for learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-urls">PDF URLs (one per line)</Label>
                  <Textarea
                    id="batch-urls"
                    placeholder="https://example.com/document1.pdf&#10;https://example.com/document2.pdf&#10;https://example.com/document3.pdf"
                    value={batchUrls}
                    onChange={(e) => setBatchUrls(e.target.value)}
                    className="min-h-[120px]"
                    disabled={isBatchProcessing}
                  />
                </div>
                
                <Button 
                  onClick={handleBatchURLProcessing}
                  disabled={isBatchProcessing || !batchUrls.trim()}
                  className="w-full"
                >
                  {isBatchProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing URLs...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Process URLs
                    </>
                  )}
                </Button>
                
                {isBatchProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing...</span>
                      <span>{batchProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={batchProgress} />
                  </div>
                )}
                
                {batchResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Processing Results:</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {batchResults.map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title || result.url}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.status === 'success' ? (
                              <>
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Success
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {result.textLength} chars
                                </span>
                              </>
                            ) : (
                              <Badge variant="destructive">
                                Error
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Control */}
          <TabsContent value="learning-control" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Learning Engine Control
                </CardTitle>
                <CardDescription>
                  Manually trigger learning cycles and monitor engine performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={triggerLearningCycle} variant="outline">
                    <Brain className="w-4 h-4 mr-2" />
                    Trigger Learning Cycle
                  </Button>
                  
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Learning Data
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Current Learning Status</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Background Learning:</span>
                      <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next Cycle:</span>
                      <span className="ml-2">~25 minutes</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Learning Analytics
                </CardTitle>
                <CardDescription>
                  Performance metrics and improvement trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Quality Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Coherence Score:</span>
                          <span>78%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Relevance Score:</span>
                          <span>82%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Compression Ratio:</span>
                          <span>85%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Learning Progress</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Weight Adjustments:</span>
                          <span>12</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Improvement Rate:</span>
                          <span>+3.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Learning Cycles:</span>
                          <span>8</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}