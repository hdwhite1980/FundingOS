/**
 * Enhanced Document Processing Service with OCR (Client-side only)
 * Handles text extraction from PDFs and images using OCR in the browser
 */

let Tesseract = null;

// Dynamic import for browser-only usage
const loadTesseract = async () => {
  if (!Tesseract && typeof window !== 'undefined') {
    Tesseract = (await import('tesseract.js')).default;
  }
  return Tesseract;
};

class EnhancedDocumentProcessor {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.supportedPdfTypes = ['application/pdf'];
  }

  /**
   * Extract text from various document types (client-side only)
   * @param {File} file - The file to process
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<string>} Extracted text
   */
  async extractText(file, mimeType) {
    if (typeof window === 'undefined') {
      throw new Error('Enhanced document processing is only available in the browser');
    }

    try {
      if (this.supportedImageTypes.includes(mimeType)) {
        return await this.extractFromImage(file);
      } else if (this.supportedPdfTypes.includes(mimeType)) {
        return await this.extractFromPDF(file);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('Text extraction failed:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Extract text from images using OCR
   * @param {File} imageFile - Image file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromImage(imageFile) {
    console.log('🔍 Starting OCR text extraction from image...');
    
    const tesseract = await loadTesseract();
    if (!tesseract) {
      throw new Error('Tesseract not available in this environment');
    }

    const { data: { text, confidence } } = await tesseract.recognize(
      imageFile,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`📄 OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    console.log(`✅ OCR completed with ${Math.round(confidence)}% confidence`);
    
    if (confidence < 70) {
      console.warn(`⚠️ Low OCR confidence (${Math.round(confidence)}%) - text may be inaccurate`);
    }

    // Clean the extracted text to remove artifacts
    const cleanedText = this.cleanExtractedText(text);
    console.log(`🧹 Text cleaning: ${text.length} chars -> ${cleanedText.length} chars`);

    return cleanedText;
  }

  /**
   * Extract text from PDF files with improved OCR handling
   * @param {File} pdfFile - PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromPDF(pdfFile) {
    console.log('📄 Extracting text from PDF...');
    
    try {
      // First, try basic text extraction
      const basicText = await this.readFileAsText(pdfFile);
      const cleanBasicText = this.cleanExtractedText(basicText);
      
      console.log(`📊 Basic PDF extraction: ${basicText.length} chars, cleaned: ${cleanBasicText.length} chars`);
      
      // If we got meaningful text, use it
      if (cleanBasicText.length > 100 && this.hasReadableContent(cleanBasicText)) {
        console.log(`✅ Extracted ${cleanBasicText.length} characters from text-based PDF`);
        return cleanBasicText;
      }
      
      // If basic extraction failed or returned garbage, treat as scanned PDF
      console.log('🔍 PDF appears to be scanned or has corrupted text, attempting OCR conversion');
      
      // Convert PDF to canvas for OCR
      const canvas = await this.pdfToCanvas(pdfFile);
      if (canvas) {
        console.log('🎨 Converted PDF to canvas for OCR processing');
        
        // Convert canvas to blob for OCR
        const imageBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', 0.95);
        });
        
        // Run OCR on the converted image
        const ocrText = await this.extractFromImage(new File([imageBlob], 'pdf-page.png', { type: 'image/png' }));
        const cleanOcrText = this.cleanExtractedText(ocrText);
        
        console.log(`🔍 OCR extraction: ${ocrText.length} chars, cleaned: ${cleanOcrText.length} chars`);
        return cleanOcrText;
      }
      
      // Fallback to basic text even if it's poor quality
      console.warn('⚠️ Unable to convert PDF for OCR, using basic text extraction');
      return cleanBasicText;
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      console.warn('⚠️ PDF extraction failed, please try converting to JPG/PNG for better results');
      return '';
    }
  }

  /**
   * Read file as text (basic approach)
   * @param {File} file - File object
   * @returns {Promise<string>} Text content
   */
  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result || '');
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Convert PDF to canvas for OCR processing
   * @param {File} pdfFile - PDF file
   * @returns {Promise<HTMLCanvasElement|null>} Canvas element or null if failed
   */
  async pdfToCanvas(pdfFile) {
    try {
      // This is a simplified approach - in production you'd use pdf.js
      // For now, we'll indicate that PDF-to-image conversion isn't fully implemented
      console.log('📝 PDF-to-canvas conversion requires additional libraries (pdf.js)');
      return null;
    } catch (error) {
      console.error('PDF to canvas conversion failed:', error);
      return null;
    }
  }

  /**
   * Clean extracted text to remove encoding artifacts and improve readability
   * @param {string} text - Raw extracted text
   * @returns {string} Cleaned text
   */
  cleanExtractedText(text) {
    if (!text) return '';

    let cleaned = text;

    // Remove PDF encoding artifacts
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, ' '); // Remove control characters
    cleaned = cleaned.replace(/[^\w\s\.,;:!?\-'"()[\]{}$_@#%&*+=<>/\\|`~]/g, ' '); // Keep only printable chars
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single space
    cleaned = cleaned.replace(/\n\s*\n/g, '\n'); // Multiple newlines to single
    
    // Remove empty lines
    cleaned = cleaned.split('\n').filter(line => line.trim()).join('\n');
    
    // Fix common OCR issues
    cleaned = cleaned.replace(/\bO\b/g, '0'); // O -> 0 in contexts where it makes sense
    cleaned = cleaned.replace(/\bl\b/g, '1'); // l -> 1 in number contexts
    
    return cleaned.trim();
  }

  /**
   * Check if text has readable content (not just encoding artifacts)
   * @param {string} text - Text to check
   * @returns {boolean} True if text appears to contain meaningful content
   */
  hasReadableContent(text) {
    if (!text || text.length < 10) return false;
    
    // Count readable characters vs total characters
    const readableChars = text.match(/[a-zA-Z0-9\s]/g) || [];
    const readableRatio = readableChars.length / text.length;
    
    // Also check for common form words
    const formWords = /(name|address|phone|email|date|organization|project|amount|budget|description)/i;
    const hasFormWords = formWords.test(text);
    
    return readableRatio > 0.7 || hasFormWords;
  }

  /**
   * Analyze document quality and suggest improvements, with focus on field detection
   * @param {string} extractedText - The extracted text
   * @param {number} confidence - OCR confidence score
   * @returns {Object} Quality analysis and suggestions
   */
  analyzeQuality(extractedText, confidence = 100) {
    const analysis = {
      quality: 'good',
      confidence: confidence,
      textLength: extractedText.length,
      suggestions: [],
      issues: [],
      fieldDetection: {
        potentialFields: 0,
        clearFields: 0,
        fieldPatterns: []
      }
    };

    // Enhanced field detection patterns - more comprehensive and OCR-aware
    const fieldPatterns = [
      // Basic colon patterns with various underline styles
      { pattern: /\w+[^:\n]*:\s*[_\-\.━]{3,}/g, type: 'colon_underscore', name: 'Field with colons and underscores' },
      { pattern: /\w+[^:\n]*:\s*[_]{4,}/g, type: 'colon_underscore_clear', name: 'Clear underscore fields' },
      
      // Checkbox and selection patterns
      { pattern: /\[\s*\]|\□|\☐/g, type: 'checkbox', name: 'Checkbox fields' },
      { pattern: /\(\s*\)/g, type: 'radio', name: 'Radio button fields' },
      
      // Currency and numeric patterns
      { pattern: /\$\s*[_\-\.]{3,}|\$[_]{3,}/g, type: 'currency', name: 'Currency fields' },
      { pattern: /amount\s*[:\$]*\s*[_\-\.]{3,}/gi, type: 'currency', name: 'Amount fields' },
      { pattern: /budget\s*[:\$]*\s*[_\-\.]{3,}/gi, type: 'currency', name: 'Budget fields' },
      
      // Date patterns with various formats
      { pattern: /date\s*[:\(][^:\)]*[\:\)]\s*[_\-\.]{3,}/gi, type: 'date', name: 'Date fields' },
      { pattern: /(mm\/dd\/yyyy|dd\/mm\/yyyy|yyyy-mm-dd)\s*[_\-\.]{3,}/gi, type: 'date_format', name: 'Formatted date fields' },
      { pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, type: 'date_example', name: 'Date examples' },
      
      // Contact information patterns
      { pattern: /name\s*[:\-]*\s*[_\-\.]{3,}/gi, type: 'name', name: 'Name fields' },
      { pattern: /(organization|company|agency)\s*[:\-]*\s*[_\-\.]{3,}/gi, type: 'organization', name: 'Organization fields' },
      { pattern: /(address|street|city|state|zip)\s*[:\-]*\s*[_\-\.]{3,}/gi, type: 'address', name: 'Address fields' },
      { pattern: /(phone|tel|telephone|fax)\s*[:\-]*\s*[_\-\.]{3,}/gi, type: 'phone', name: 'Phone fields' },
      { pattern: /email\s*[:\-]*\s*[_\-\.]{3,}/gi, type: 'email', name: 'Email fields' },
      
      // Signature and certification patterns
      { pattern: /(signature|signed|certify)\s*[:\-]*\s*[_\-\.]{3,}/gi, type: 'signature', name: 'Signature fields' },
      { pattern: /(title|position)\s*[:\-]*\s*[_\-\.]{3,}/gi, type: 'title', name: 'Title fields' },
      
      // Common form field patterns
      { pattern: /(description|explain|provide|enter|list)\s+[^:\n]*[:\-]*\s*[_\-\.]{3,}/gi, type: 'instruction_field', name: 'Instructional fields' },
      { pattern: /\b\d+\.\s+[^:\n]*[:\-]*\s*[_\-\.]{3,}/g, type: 'numbered_field', name: 'Numbered fields' },
      
      // Table-like structures
      { pattern: /\|\s*[_\-\.]{3,}\s*\|/g, type: 'table_field', name: 'Table fields' },
      
      // Multi-line text areas
      { pattern: /comments?\s*[:\-]*\s*[\n\r]*[_\-\.]{5,}/gi, type: 'textarea', name: 'Comment/textarea fields' },
      { pattern: /notes?\s*[:\-]*\s*[\n\r]*[_\-\.]{5,}/gi, type: 'textarea', name: 'Notes fields' }
    ];

    let totalPatternMatches = 0;
    fieldPatterns.forEach(({ pattern, type, name }) => {
      const matches = (extractedText.match(pattern) || []);
      if (matches.length > 0) {
        console.log(`🎯 Found ${matches.length} ${name} patterns:`, matches.slice(0, 3));
        analysis.fieldDetection.fieldPatterns.push({
          type,
          name,
          count: matches.length,
          examples: matches.slice(0, 3)
        });
        totalPatternMatches += matches.length;
      }
    });

    console.log(`📊 Field Detection Summary:`, {
      totalPatterns: totalPatternMatches,
      uniquePatternTypes: analysis.fieldDetection.fieldPatterns.length,
      extractedTextLength: extractedText.length,
      confidence: Math.round(confidence)
    });

    analysis.fieldDetection.potentialFields = totalPatternMatches;
    
    // Enhanced clear field count estimation with multiple approaches
    let clearFieldCount = 0;
    
    // Approach 1: Clear underscore patterns
    const clearUnderscoreFields = extractedText.match(/\w+[^:\n]*:\s*[_]{4,}/g) || [];
    clearFieldCount += clearUnderscoreFields.length;
    
    // Approach 2: Colon-space-underscore patterns (very common in forms)
    const colonSpaceUnderscore = extractedText.match(/[A-Za-z][^:\n]*:\s+[_\-\.]{3,}/g) || [];
    clearFieldCount += colonSpaceUnderscore.length;
    
    // Approach 3: Form instruction patterns
    const instructionFields = extractedText.match(/(enter|provide|list|describe)\s+[^:\n]*[:\-]*\s*[_\-\.]{3,}/gi) || [];
    clearFieldCount += instructionFields.length;
    
    // Approach 4: Numbered list fields
    const numberedFields = extractedText.match(/\b\d+\.\s+[^:\n]*[:\-]*\s*[_\-\.]{3,}/g) || [];
    clearFieldCount += numberedFields.length;
    
    // Remove duplicates by taking maximum of detected patterns
    analysis.fieldDetection.clearFields = Math.max(
      clearFieldCount, 
      clearUnderscoreFields.length,
      Math.floor(totalPatternMatches * 0.7) // Conservative estimate
    );

    // Check confidence
    if (confidence < 70) {
      analysis.quality = 'poor';
      analysis.issues.push('Low OCR confidence - field extraction may be incomplete');
      analysis.suggestions.push('Consider using higher resolution images or clearer scans for better field detection');
    } else if (confidence < 85) {
      analysis.quality = 'fair';
      analysis.issues.push('Moderate OCR confidence - some fields might be missed');
      analysis.suggestions.push('Field extraction should be mostly accurate but verify completeness');
    }

    // Check text length
    if (extractedText.length < 50) {
      analysis.issues.push('Very little text extracted - form fields likely missing');
      analysis.suggestions.push('Ensure the document is clearly readable and properly oriented');
    }

    // Check field detection quality
    if (totalPatternMatches === 0) {
      analysis.issues.push('No clear form fields detected in OCR text');
      analysis.suggestions.push('This may not be a form document, or OCR quality is too low');
      analysis.quality = 'poor';
    } else if (totalPatternMatches < 5) {
      analysis.issues.push('Few form fields detected - some fields may be missing');
      analysis.suggestions.push('Verify all form fields were properly extracted');
      if (analysis.quality === 'good') analysis.quality = 'fair';
    }

    // Check for common OCR issues that affect field detection
    const ocrIssues = /[|\\~`]{2,}|[^\w\s\.,;:!?\-'"()[\]{}$_]/g;
    const errorCount = (extractedText.match(ocrIssues) || []).length;
    
    if (errorCount > 10) {
      analysis.issues.push('OCR artifacts detected - field extraction may be affected');
      analysis.suggestions.push('Consider preprocessing the image for better clarity');
    }

    return analysis;
  }

  /**
   * Preprocess text to clean up common OCR issues while preserving field structure
   * @param {string} text - Raw extracted text
   * @returns {string} Cleaned text
   */
  cleanOCRText(text) {
    return text
      // Preserve field indicators first
      .replace(/(\w+)\s*:\s*[_\-\.]{3,}/g, '$1: ________________') // Normalize field indicators
      .replace(/\$\s*[_\-\.]{3,}/g, '$________________') // Normalize currency fields
      .replace(/\[\s*\]/g, '[ ]') // Normalize checkboxes
      .replace(/\(\s*\)/g, '( )') // Normalize radio buttons
      // Fix common character substitutions
      .replace(/[|\\]{2,}/g, 'II') // Replace multiple pipes/backslashes with II
      .replace(/~{2,}/g, '--') // Replace tildes with dashes
      .replace(/`{2,}/g, '"') // Replace backticks with quotes
      // Preserve section structures
      .replace(/(\d+\.\s*[A-Z][^:\n]*):?\s*\n/g, '\n=== $1 ===\n') // Mark numbered sections
      .replace(/([A-Z][A-Z\s]{10,}):\s*\n/g, '\n=== $1 ===\n') // Mark title sections
      // Normalize whitespace while preserving line breaks for structure
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
      .trim();
  }
}

export default new EnhancedDocumentProcessor();