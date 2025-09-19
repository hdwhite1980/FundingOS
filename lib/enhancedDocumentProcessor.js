/**
 * Enhanced Document Processing Service with OCR
 * Handles text extraction from PDFs and images using OCR
 */

import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';

class EnhancedDocumentProcessor {
  constructor() {
    this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.supportedPdfTypes = ['application/pdf'];
  }

  /**
   * Extract text from various document types
   * @param {File|Buffer} file - The file to process
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<string>} Extracted text
   */
  async extractText(file, mimeType) {
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
   * @param {File|Buffer} imageFile - Image file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromImage(imageFile) {
    console.log('🔍 Starting OCR text extraction from image...');
    
    const { data: { text, confidence } } = await Tesseract.recognize(
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
   * Extract text from PDF files
   * @param {File|Buffer} pdfFile - PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromPDF(pdfFile) {
    console.log('📄 Extracting text from PDF...');
    
    const buffer = pdfFile instanceof File ? 
      await this.fileToBuffer(pdfFile) : pdfFile;
    
    const data = await pdfParse(buffer);
    
    // If PDF has very little text, it might be a scanned document
    if (data.text.length < 100) {
      console.log('🔍 PDF appears to be scanned, attempting OCR...');
      
      // For scanned PDFs, we'd need to convert to images first
      // This is a placeholder - full implementation would require pdf2pic or similar
      console.warn('⚠️ Scanned PDF OCR not fully implemented. Consider pre-converting to images.');
      return data.text || '';
    }
    
    console.log(`✅ Extracted ${data.text.length} characters from PDF`);
    return data.text;
  }

  /**
   * Convert File to Buffer
   * @param {File} file - File object
   * @returns {Promise<Buffer>} Buffer
   */
  async fileToBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const buffer = Buffer.from(arrayBuffer);
        resolve(buffer);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
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