/**
 * Document Generation Service
 * 
 * Handles generating completed forms from extracted structure and user data
 * File: lib/documentGenerationService.js
 */

import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export class DocumentGenerationService {
  constructor() {
    this.defaultStyles = {
      fontSize: 11,
      lineHeight: 1.2,
      margins: { top: 20, left: 20, right: 20, bottom: 20 },
      colors: {
        text: '#000000',
        header: '#333333',
        border: '#cccccc'
      }
    }
  }

  /**
   * Generate a completed form PDF from form structure and user data
   */
  async generateCompletedForm(formStructure, userData, options = {}) {
    try {
      // Validate inputs
      if (!formStructure?.formFields) {
        throw new Error('Invalid form structure provided')
      }

      // Map user data to form fields
      const populatedFields = await this.populateFormFields(
        formStructure, 
        userData, 
        options.fieldMappings
      )

      // Generate PDF document
      const doc = await this.createPDFDocument(
        formStructure, 
        populatedFields, 
        options
      )

      return {
        success: true,
        document: doc,
        metadata: {
          totalFields: Object.keys(formStructure.formFields).length,
          populatedFields: Object.keys(populatedFields).length,
          generatedAt: new Date().toISOString(),
          formTitle: formStructure.formMetadata?.title || 'Generated Form'
        }
      }
    } catch (error) {
      console.error('Document generation failed:', error)
      return {
        success: false,
        error: error.message,
        metadata: {
          generatedAt: new Date().toISOString(),
          formTitle: formStructure.formMetadata?.title || 'Form Generation Failed'
        }
      }
    }
  }

  /**
   * Populate form fields with user data based on intelligent mapping
   */
  async populateFormFields(formStructure, userData, fieldMappings = {}) {
    const populated = {}
    const fields = formStructure.formFields

    for (const [fieldId, field] of Object.entries(fields)) {
      let value = null

      // Try field mapping first
      if (fieldMappings[fieldId]) {
        value = this.extractMappedValue(userData, fieldMappings[fieldId])
      }

      // If no mapping, try intelligent field matching
      if (!value) {
        value = this.intelligentFieldMatch(field, userData)
      }

      // Format value based on field type
      if (value) {
        populated[fieldId] = this.formatFieldValue(value, field.type, field.validation)
      }
    }

    return populated
  }

  /**
   * Extract value from user data based on field mapping
   */
  extractMappedValue(userData, mapping) {
    try {
      const { dataSource, dataField, transformation } = mapping
      let value = null

      switch (dataSource) {
        case 'organization':
          value = userData.organization?.[dataField]
          break
        case 'project':
          value = userData.project?.[dataField]
          break
        case 'user':
          value = userData.user?.[dataField]
          break
        case 'calculated':
          value = this.calculateValue(dataField, userData)
          break
        default:
          // Try direct path access
          value = this.getNestedValue(userData, dataField)
      }

      // Apply transformation if specified
      if (value && transformation) {
        value = this.applyTransformation(value, transformation)
      }

      return value
    } catch (error) {
      console.warn('Failed to extract mapped value:', error)
      return null
    }
  }

  /**
   * Intelligent field matching based on field labels and types
   */
  intelligentFieldMatch(field, userData) {
    const label = field.label.toLowerCase()
    const type = field.type

    // Organization fields
    if (label.includes('organization') || label.includes('company') || label.includes('entity')) {
      return userData.organization?.name || userData.organization?.legalName
    }
    if (label.includes('ein') || label.includes('tax id') || label.includes('federal id')) {
      return userData.organization?.ein || userData.organization?.taxId
    }
    if (label.includes('address')) {
      const org = userData.organization
      if (org?.address) {
        return `${org.address.street}, ${org.address.city}, ${org.address.state} ${org.address.zip}`
      }
    }

    // Contact fields
    if (label.includes('phone') || type === 'phone') {
      return userData.organization?.phone || userData.user?.phone
    }
    if (label.includes('email') || type === 'email') {
      return userData.organization?.email || userData.user?.email
    }
    if (label.includes('contact person') || label.includes('executive director')) {
      return userData.organization?.contactPerson || userData.user?.name
    }

    // Project fields
    if (label.includes('project') && label.includes('title')) {
      return userData.project?.title || userData.project?.name
    }
    if (label.includes('project') && label.includes('description')) {
      return userData.project?.description || userData.project?.summary
    }
    if (label.includes('amount') || label.includes('budget') || type === 'currency') {
      return userData.project?.budgetTotal || userData.project?.requestedAmount
    }

    // Date fields
    if (type === 'date') {
      if (label.includes('start')) return userData.project?.startDate
      if (label.includes('end')) return userData.project?.endDate
    }

    return null
  }

  /**
   * Format field value based on field type and validation rules
   */
  formatFieldValue(value, type, validation = {}) {
    if (!value) return ''

    switch (type) {
      case 'currency':
        const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''))
        return isNaN(num) ? value : `$${num.toLocaleString()}`
        
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString()
        }
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          return new Date(value).toLocaleDateString()
        }
        return value
        
      case 'phone':
        const cleaned = value.toString().replace(/\D/g, '')
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
        }
        return value
        
      case 'textarea':
        if (validation.maxLength && value.length > validation.maxLength) {
          return value.substring(0, validation.maxLength) + '...'
        }
        return value
        
      default:
        return value.toString()
    }
  }

  /**
   * Create PDF document with populated form fields
   */
  async createPDFDocument(formStructure, populatedFields, options = {}) {
    const doc = new jsPDF()
    const styles = { ...this.defaultStyles, ...options.styles }
    let yPosition = styles.margins.top

    // Add form title
    const title = formStructure.formMetadata?.title || 'Completed Application Form'
    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text(title, styles.margins.left, yPosition)
    yPosition += 15

    // Add generation date
    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, styles.margins.left, yPosition)
    yPosition += 20

    // Process sections if available
    if (formStructure.formSections && formStructure.formSections.length > 0) {
      for (const section of formStructure.formSections) {
        yPosition = await this.addSection(doc, section, formStructure.formFields, populatedFields, yPosition, styles)
        yPosition += 10 // Section spacing
      }
    } else {
      // Add all fields without sections
      yPosition = await this.addFieldsToDoc(doc, formStructure.formFields, populatedFields, yPosition, styles)
    }

    return doc
  }

  /**
   * Add a section to the PDF document
   */
  async addSection(doc, section, allFields, populatedFields, startY, styles) {
    let yPosition = startY

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = styles.margins.top
    }

    // Add section header
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(section.title, styles.margins.left, yPosition)
    yPosition += 12

    if (section.description) {
      doc.setFontSize(10)
      doc.setFont(undefined, 'italic')
      const descLines = doc.splitTextToSize(section.description, 170)
      doc.text(descLines, styles.margins.left, yPosition)
      yPosition += descLines.length * 5 + 5
    }

    // Add section fields
    const sectionFields = {}
    section.fields.forEach(fieldId => {
      if (allFields[fieldId]) {
        sectionFields[fieldId] = allFields[fieldId]
      }
    })

    yPosition = await this.addFieldsToDoc(doc, sectionFields, populatedFields, yPosition, styles)
    
    return yPosition
  }

  /**
   * Add fields to PDF document
   */
  async addFieldsToDoc(doc, fields, populatedFields, startY, styles) {
    let yPosition = startY

    for (const [fieldId, field] of Object.entries(fields)) {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage()
        yPosition = styles.margins.top
      }

      const value = populatedFields[fieldId] || ''
      const isRequired = field.required

      // Add field label
      doc.setFontSize(11)
      doc.setFont(undefined, 'bold')
      const labelText = `${field.label}${isRequired ? ' *' : ''}`
      doc.text(labelText, styles.margins.left, yPosition)
      yPosition += 8

      // Add field value or placeholder
      doc.setFont(undefined, 'normal')
      if (field.type === 'textarea') {
        // Multi-line text area
        const textLines = doc.splitTextToSize(value || '[Please provide response]', 160)
        doc.text(textLines, styles.margins.left + 5, yPosition)
        yPosition += Math.max(textLines.length * 5, 15)
        
        // Add border for text area
        doc.rect(styles.margins.left, yPosition - (textLines.length * 5) - 5, 160, Math.max(textLines.length * 5, 15))
      } else if (field.type === 'checkbox' && field.options) {
        // Checkbox options
        field.options.forEach(option => {
          const isChecked = Array.isArray(value) ? value.includes(option) : value === option
          doc.text(isChecked ? '☑' : '☐', styles.margins.left + 5, yPosition)
          doc.text(option, styles.margins.left + 15, yPosition)
          yPosition += 6
        })
      } else {
        // Single line field
        doc.text(value || '[To be completed]', styles.margins.left + 5, yPosition)
        yPosition += 5
        
        // Add underline for input fields
        doc.line(styles.margins.left, yPosition + 2, styles.margins.left + 160, yPosition + 2)
      }

      yPosition += 10 // Field spacing
    }

    return yPosition
  }

  /**
   * Helper functions
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  applyTransformation(value, transformation) {
    switch (transformation) {
      case 'uppercase':
        return value.toString().toUpperCase()
      case 'lowercase':
        return value.toString().toLowerCase()
      case 'currency':
        return this.formatFieldValue(value, 'currency')
      case 'phone':
        return this.formatFieldValue(value, 'phone')
      default:
        return value
    }
  }

  calculateValue(calculation, userData) {
    // Handle calculated fields like totals, percentages, etc.
    switch (calculation) {
      case 'total_budget':
        return userData.project?.budgetItems?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
      case 'project_duration_months':
        if (userData.project?.startDate && userData.project?.endDate) {
          const start = new Date(userData.project.startDate)
          const end = new Date(userData.project.endDate)
          return Math.round((end - start) / (1000 * 60 * 60 * 24 * 30))
        }
        return null
      default:
        return null
    }
  }

  /**
   * Download generated PDF
   */
  downloadPDF(doc, filename = 'completed-form.pdf') {
    doc.save(filename)
  }

  /**
   * Get PDF as blob for upload or preview
   */
  getPDFBlob(doc) {
    return doc.output('blob')
  }

  /**
   * Get PDF as base64 string
   */
  getPDFBase64(doc) {
    return doc.output('datauristring')
  }
}

// Singleton instance
export const documentGenerationService = new DocumentGenerationService()
export default documentGenerationService