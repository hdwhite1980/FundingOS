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

    return text;
  }

  /**
   * Extract text from PDF files (basic text extraction)
   * @param {File} pdfFile - PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromPDF(pdfFile) {
    console.log('📄 Extracting text from PDF...');
    
    // For now, we'll use a simple approach for PDFs
    // In a production environment, you might want to use pdf-lib or similar
    const text = await this.readFileAsText(pdfFile);
    
    // If PDF has very little readable text, it might be a scanned document
    if (text.length < 100) {
      console.log('🔍 PDF appears to be scanned or has minimal text, suggesting OCR conversion');
      console.warn('⚠️ For scanned PDFs, please convert to images (JPG/PNG) for better OCR results');
      return text || '';
    }
    
    console.log(`✅ Extracted ${text.length} characters from PDF`);
    return text;
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

    // Analyze field detection patterns
    const fieldPatterns = [
      { pattern: /\w+\s*:\s*[_\-\.]{3,}/g, type: 'colon_underscore', name: 'Field with colons and underscores' },
      { pattern: /\[\s*\]/g, type: 'checkbox', name: 'Checkbox fields' },
      { pattern: /\(\s*\)/g, type: 'radio', name: 'Radio button fields' },
      { pattern: /\$\s*[_\-\.]{3,}/g, type: 'currency', name: 'Currency fields' },
      { pattern: /date\s*[:\(][^:\)]*[\:\)]\s*[_\-\.]{3,}/gi, type: 'date', name: 'Date fields' },
      { pattern: /name\s*:\s*[_\-\.]{3,}/gi, type: 'name', name: 'Name fields' },
      { pattern: /address\s*:\s*[_\-\.]{3,}/gi, type: 'address', name: 'Address fields' },
      { pattern: /phone\s*:\s*[_\-\.]{3,}/gi, type: 'phone', name: 'Phone fields' },
      { pattern: /email\s*:\s*[_\-\.]{3,}/gi, type: 'email', name: 'Email fields' }
    ];

    let totalPatternMatches = 0;
    fieldPatterns.forEach(({ pattern, type, name }) => {
      const matches = (extractedText.match(pattern) || []);
      if (matches.length > 0) {
        analysis.fieldDetection.fieldPatterns.push({
          type,
          name,
          count: matches.length,
          examples: matches.slice(0, 3)
        });
        totalPatternMatches += matches.length;
      }
    });

    analysis.fieldDetection.potentialFields = totalPatternMatches;
    
    // Estimate clear field count (higher confidence patterns)
    const clearFieldPatterns = extractedText.match(/\w+\s*:\s*[_]{4,}/g) || [];
    analysis.fieldDetection.clearFields = clearFieldPatterns.length;

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