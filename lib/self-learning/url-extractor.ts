// URL-based PDF extraction system
export class URLPDFExtractor {
  
  async extractFromURL(url: string): Promise<{ text: string; title: string }> {
    try {
      // Validate URL
      if (!this.isValidPDFUrl(url)) {
        throw new Error('Invalid PDF URL')
      }
      
      // Fetch PDF
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/pdf',
          'User-Agent': 'Nivıskar PDF Extractor 1.0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      
      // Extract text using PDF.js
      const text = await this.extractTextFromArrayBuffer(arrayBuffer)
      const title = this.extractTitleFromURL(url) || 'Untitled Document'
      
      return { text, title }
      
    } catch (error) {
      console.error('Error extracting PDF from URL:', error)
      throw error
    }
  }

  private isValidPDFUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return (
        (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') &&
        (url.toLowerCase().endsWith('.pdf') || url.toLowerCase().includes('.pdf'))
      )
    } catch {
      return false
    }
  }

  private async extractTextFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
    // Load PDF.js if not already loaded
    if (!(window as any).pdfjsLib) {
      await this.loadPDFJS()
    }
    
    const pdfjsLib = (window as any).pdfjsLib
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .filter((item: any) => item.str && typeof item.str === 'string')
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + ' '
      } catch (pageError) {
        console.warn(`Error processing page ${i}:`, pageError)
      }
    }
    
    return fullText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()\-"']/g, '')
      .trim()
  }

  private async loadPDFJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          resolve()
        } else {
          reject(new Error('PDF.js failed to load'))
        }
      }
      
      script.onerror = () => reject(new Error('Failed to load PDF.js'))
      document.head.appendChild(script)
    })
  }

  private extractTitleFromURL(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const filename = pathname.split('/').pop()
      
      if (filename && filename.includes('.')) {
        return filename.split('.')[0].replace(/[-_]/g, ' ')
      }
      
      return null
    } catch {
      return null
    }
  }

  async batchExtractFromURLs(urls: string[]): Promise<Array<{ url: string; text: string; title: string; error?: string }>> {
    const results = []
    
    for (const url of urls) {
      try {
        const { text, title } = await this.extractFromURL(url)
        results.push({ url, text, title })
        
        // Add delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        results.push({ 
          url, 
          text: '', 
          title: '', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    return results
  }
}