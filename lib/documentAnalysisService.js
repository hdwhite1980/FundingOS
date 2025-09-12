/**
 * AI Document Analysis Service (Client-side)
 * 
 * This service handles the client-side interface for AI-powered analysis 
 * of funding/grant documents by calling server-side API routes.
 */

export class DocumentAnalysisService {
  constructor() {
    this.apiBaseUrl = '/api/ai/document-analysis'
  }

  /**
   * Analyze a document and extract structured information
   * @param {string} documentText - The text content of the document
   * @param {string} documentType - Type of document (application, rfp, guidelines, etc.)
   * @param {Object} context - User profile and project context for better analysis
   * @returns {Object} Structured analysis results
   */
  async analyzeDocument(documentText, documentType = 'unknown', context = {}) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText,
          documentType,
          context,
          action: 'analyze'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Document analysis failed:', error)
      throw new Error(`Document analysis failed: ${error.message}`)
    }
  }

  /**
   * Analyze application form and suggest completions
   * @param {string} formContent - Content of the application form
   * @param {Object} userProfile - User's company profile
   * @param {Object} projectData - Current project information
   * @returns {Object} Form completion suggestions and missing information
   */
  async analyzeApplicationForm(formContent, userProfile, projectData) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: formContent,
          context: { userProfile, projectData },
          action: 'form-analysis'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Form analysis failed:', error)
      throw new Error(`Form analysis failed: ${error.message}`)
    }
  }

  /**
   * Extract requirements and create checklist
   * @param {Object} analysis - Document analysis results
   * @param {Object} userProfile - User's profile for personalization
   * @returns {Object} Requirements checklist with status
   */
  async generateRequirementsChecklist(analysis, userProfile) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: { analysis, userProfile },
          action: 'requirements-checklist'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Requirements checklist generation failed:', error)
      throw new Error(`Checklist generation failed: ${error.message}`)
    }
  }

  /**
   * Generate intelligent questions for missing information
   * @param {Object} formAnalysis - Analysis of what's needed vs what's available
   * @param {Object} context - Additional context for better questions
   * @returns {Array} List of intelligent questions to ask the user
   */
  async generateClarifyingQuestions(formAnalysis, context = {}) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: { formAnalysis, ...context },
          action: 'questions'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Question generation failed:', error)
      throw new Error(`Question generation failed: ${error.message}`)
    }
  }

  /**
   * Extract text content from different file types
   * This would integrate with file processing libraries
   */
  async extractTextFromFile(file, fileType) {
    // This would be implemented based on the file type
    // PDF: pdf-parse or similar
    // Word: mammoth or docx libraries
    // Excel: xlsx library
    // For now, return placeholder
    
    switch (fileType.toLowerCase()) {
      case 'pdf':
        // return await this.extractFromPDF(file)
        throw new Error('PDF extraction not yet implemented')
      case 'docx':
      case 'doc':
        // return await this.extractFromWord(file)
        throw new Error('Word document extraction not yet implemented')
      case 'txt':
        return file.toString()
      default:
        throw new Error(`Unsupported file type: ${fileType}`)
    }
  }

  /**
   * Process multiple documents and provide consolidated analysis
   */
  async analyzeBatch(documents, context = {}) {
    const analyses = []
    
    for (const doc of documents) {
      try {
        const analysis = await this.analyzeDocument(doc.content, doc.type, context)
        analyses.push({
          ...analysis,
          documentName: doc.name,
          documentId: doc.id
        })
      } catch (error) {
        console.error(`Failed to analyze document ${doc.name}:`, error)
        analyses.push({
          error: error.message,
          documentName: doc.name,
          documentId: doc.id
        })
      }
    }

    // Generate batch summary
    const summary = await this.generateBatchSummary(analyses)
    const consolidatedRequirements = this.consolidateRequirements(analyses)

    return {
      analyses,
      summary,
      consolidatedRequirements
    }
  }

  /**
   * Generate summary of multiple document analyses
   */
  async generateBatchSummary(analyses) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: { analyses },
          action: 'batch-summary'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Batch summary generation failed:', error)
      return { error: 'Failed to generate summary', message: error.message }
    }
  }

  /**
   * Consolidate requirements from multiple documents (client-side)
   */
  consolidateRequirements(analyses) {
    const allRequirements = []
    
    analyses.forEach(analysis => {
      if (analysis.requirements) {
        allRequirements.push(...(analysis.requirements.documents || []))
        allRequirements.push(...(analysis.requirements.eligibility || []))
        allRequirements.push(...(analysis.requirements.technical || []))
      }
    })

    // Remove duplicates and prioritize
    const uniqueRequirements = [...new Set(allRequirements)]
    
    return {
      total: uniqueRequirements.length,
      requirements: uniqueRequirements,
      categories: this.categorizeRequirements(uniqueRequirements)
    }
  }

  /**
   * Categorize requirements by type (client-side helper)
   */
  categorizeRequirements(requirements) {
    const categories = {
      documentation: [],
      eligibility: [],
      technical: [],
      financial: [],
      compliance: [],
      other: []
    }

    requirements.forEach(req => {
      const lower = req.toLowerCase()
      if (lower.includes('document') || lower.includes('form') || lower.includes('report')) {
        categories.documentation.push(req)
      } else if (lower.includes('eligible') || lower.includes('qualify')) {
        categories.eligibility.push(req)
      } else if (lower.includes('technical') || lower.includes('specification')) {
        categories.technical.push(req)
      } else if (lower.includes('budget') || lower.includes('financial') || lower.includes('cost')) {
        categories.financial.push(req)
      } else if (lower.includes('compliance') || lower.includes('regulation')) {
        categories.compliance.push(req)
      } else {
        categories.other.push(req)
      }
    })

    return categories
  }

  /**
   * Validate API connectivity and configuration
   */
  async testConnection() {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentText: 'Test document for API connectivity',
          documentType: 'test',
          action: 'analyze'
        })
      })

      return response.ok
    } catch (error) {
      console.error('API connection test failed:', error)
      return false
    }
  }
}

// Singleton instance for use across the application
export const documentAnalysisService = new DocumentAnalysisService()
export default documentAnalysisService