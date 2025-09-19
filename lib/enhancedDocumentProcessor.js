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
   * Analyze document quality and suggest improvements
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
      issues: []
    };

    // Check confidence
    if (confidence < 70) {
      analysis.quality = 'poor';
      analysis.issues.push('Low OCR confidence - text may contain errors');
      analysis.suggestions.push('Consider using higher resolution images or clearer scans');
    } else if (confidence < 85) {
      analysis.quality = 'fair';
      analysis.issues.push('Moderate OCR confidence');
      analysis.suggestions.push('Text is mostly accurate but may contain some errors');
    }

    // Check text length
    if (extractedText.length < 50) {
      analysis.issues.push('Very little text extracted');
      analysis.suggestions.push('Ensure the document is clearly readable and properly oriented');
    }

    // Check for common OCR issues
    const commonErrors = /[|\\]{2,}|[~`]{2,}|[^\w\s\.,;:!?\-'"()[\]{}]/g;
    const errorCount = (extractedText.match(commonErrors) || []).length;
    
    if (errorCount > 10) {
      analysis.issues.push('Possible OCR recognition errors detected');
      analysis.suggestions.push('Consider preprocessing the image for better clarity');
    }

    return analysis;
  }

  /**
   * Preprocess text to clean up common OCR issues
   * @param {string} text - Raw extracted text
   * @returns {string} Cleaned text
   */
  cleanOCRText(text) {
    return text
      // Fix common character substitutions
      .replace(/[|\\]{2,}/g, 'II') // Replace multiple pipes/backslashes with II
      .replace(/~{2,}/g, '--') // Replace tildes with dashes
      .replace(/`{2,}/g, '"') // Replace backticks with quotes
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default new EnhancedDocumentProcessor();