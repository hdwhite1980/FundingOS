/**
 * Form Export API - Generates completed application documents
 * /api/form/export
 */

import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export async function POST(request: NextRequest) {
  try {
    const { 
      formStructure, 
      completedData, 
      exportFormat, 
      options 
    } = await request.json()

    if (!formStructure || !completedData) {
      return NextResponse.json(
        { success: false, error: 'Form structure and completed data are required' },
        { status: 400 }
      )
    }

    console.log('📄 Generating form export:', {
      formTitle: formStructure.formTitle || 'Unknown',
      format: exportFormat || 'pdf',
      fieldsCompleted: Object.keys(completedData).length
    })

    let exportResult

    switch (exportFormat) {
      case 'pdf':
        exportResult = await generatePDFExport(formStructure, completedData, options)
        break
      case 'html':
        exportResult = await generateHTMLExport(formStructure, completedData, options)
        break
      case 'json':
        exportResult = generateJSONExport(formStructure, completedData, options)
        break
      case 'docx':
        exportResult = await generateWordExport(formStructure, completedData, options)
        break
      default:
        exportResult = await generatePDFExport(formStructure, completedData, options)
    }

    console.log('✅ Form export generated:', {
      format: exportFormat,
      size: exportResult.size || 'unknown'
    })

    return NextResponse.json({
      success: true,
      data: exportResult
    })

  } catch (error) {
    console.error('Form export error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Form export failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

async function generatePDFExport(formStructure: any, completedData: any, options: any = {}) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 20
  let currentY = margin

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const title = formStructure.formTitle || 'Completed Application'
  doc.text(title, margin, currentY)
  currentY += 20

  // Subtitle
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, currentY)
  currentY += 15

  // Process sections
  const sections = formStructure.sections || []
  const fields = formStructure.fields || []

  if (sections.length > 0) {
    // Organized by sections
    for (const section of sections) {
      currentY = addSectionToPDF(doc, section, fields, completedData, currentY, margin, pageWidth, pageHeight, options)
    }
  } else {
    // All fields without sections
    currentY = addFieldsToPDF(doc, fields, completedData, currentY, margin, pageWidth, pageHeight, options)
  }

  // Generate base64 PDF
  const pdfOutput = doc.output('datauristring')
  
  return {
    format: 'pdf',
    data: pdfOutput,
    filename: `${sanitizeFilename(title)}.pdf`,
    size: pdfOutput.length,
    mimeType: 'application/pdf'
  }
}

async function generateHTMLExport(formStructure: any, completedData: any, options: any = {}) {
  const title = formStructure.formTitle || 'Completed Application'
  const sections = formStructure.sections || []
  const fields = formStructure.fields || []

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6;
            color: #333;
        }
        .header { 
            border-bottom: 2px solid #007cba; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .section { 
            margin-bottom: 40px; 
            page-break-inside: avoid;
        }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #007cba; 
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .field { 
            margin-bottom: 20px; 
        }
        .field-label { 
            font-weight: bold; 
            color: #555; 
            margin-bottom: 5px;
        }
        .field-value { 
            background: #f9f9f9; 
            padding: 10px; 
            border-left: 3px solid #007cba; 
            white-space: pre-wrap;
        }
        .empty-field {
            background: #fff5f5;
            border-left: 3px solid #ff6b6b;
            color: #666;
            font-style: italic;
        }
        .auto-filled {
            border-left: 3px solid #51cf66;
            background: #f8fff9;
        }
        .metadata { 
            background: #f0f0f0; 
            padding: 15px; 
            border-radius: 5px; 
            margin-top: 30px;
            font-size: 14px;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Completion Status:</strong> ${Object.keys(completedData).length} fields completed</p>
    </div>
`

  if (sections.length > 0) {
    // Organized by sections
    for (const section of sections) {
      html += generateSectionHTML(section, fields, completedData, options)
    }
  } else {
    // All fields without sections
    html += '<div class="section">'
    html += '<div class="section-title">Application Fields</div>'
    for (const field of fields) {
      html += generateFieldHTML(field, completedData, options)
    }
    html += '</div>'
  }

  html += `
    <div class="metadata">
        <h3>Export Information</h3>
        <p><strong>Form Type:</strong> ${formStructure.formType || 'Application'}</p>
        <p><strong>Total Fields:</strong> ${fields.length}</p>
        <p><strong>Completed Fields:</strong> ${Object.keys(completedData).length}</p>
        <p><strong>Export Date:</strong> ${new Date().toISOString()}</p>
    </div>
</body>
</html>
`

  const htmlBlob = new Blob([html], { type: 'text/html' })
  const dataUrl = `data:text/html;base64,${Buffer.from(html).toString('base64')}`

  return {
    format: 'html',
    data: dataUrl,
    html: html,
    filename: `${sanitizeFilename(title)}.html`,
    size: html.length,
    mimeType: 'text/html'
  }
}

function generateJSONExport(formStructure: any, completedData: any, options: any = {}) {
  const exportData = {
    metadata: {
      formTitle: formStructure.formTitle,
      formType: formStructure.formType,
      exportDate: new Date().toISOString(),
      totalFields: (formStructure.fields || []).length,
      completedFields: Object.keys(completedData).length
    },
    formStructure: formStructure,
    completedData: completedData,
    exportOptions: options
  }

  const jsonString = JSON.stringify(exportData, null, 2)
  const dataUrl = `data:application/json;base64,${Buffer.from(jsonString).toString('base64')}`

  return {
    format: 'json',
    data: dataUrl,
    json: exportData,
    filename: `${sanitizeFilename(formStructure.formTitle || 'application')}.json`,
    size: jsonString.length,
    mimeType: 'application/json'
  }
}

async function generateWordExport(formStructure: any, completedData: any, options: any = {}) {
  // For Word export, we'll generate HTML that can be opened in Word
  // This is a simplified approach - for true .docx generation, you'd need libraries like docx
  
  const htmlResult = await generateHTMLExport(formStructure, completedData, options)
  
  // Modify the HTML for better Word compatibility
  const wordCompatibleHTML = htmlResult.html
    .replace(/<style>[\s\S]*?<\/style>/, '') // Remove complex CSS
    .replace(/<div class="metadata">[\s\S]*?<\/div>/, '') // Remove metadata section
  
  const dataUrl = `data:application/msword;base64,${Buffer.from(wordCompatibleHTML).toString('base64')}`

  return {
    format: 'docx',
    data: dataUrl,
    filename: `${sanitizeFilename(formStructure.formTitle || 'application')}.doc`,
    size: wordCompatibleHTML.length,
    mimeType: 'application/msword'
  }
}

function addSectionToPDF(doc: any, section: any, fields: any[], completedData: any, currentY: number, margin: number, pageWidth: number, pageHeight: number, options: any) {
  // Check if we need a new page
  if (currentY > pageHeight - 60) {
    doc.addPage()
    currentY = margin
  }

  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(section.title, margin, currentY)
  currentY += 15

  // Section description
  if (section.description) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(section.description, pageWidth - 2 * margin)
    doc.text(descLines, margin, currentY)
    currentY += descLines.length * 5 + 10
  }

  // Fields in this section
  const sectionFields = fields.filter(field => field.section === section.id)
  currentY = addFieldsToPDF(doc, sectionFields, completedData, currentY, margin, pageWidth, pageHeight, options)

  return currentY + 10
}

function addFieldsToPDF(doc: any, fields: any[], completedData: any, currentY: number, margin: number, pageWidth: number, pageHeight: number, options: any) {
  for (const field of fields) {
    // Check if we need a new page
    if (currentY > pageHeight - 80) {
      doc.addPage()
      currentY = margin
    }

    // Field label
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(field.label, margin, currentY)
    currentY += 12

    // Field value
    doc.setFont('helvetica', 'normal')
    const value = completedData[field.id]
    
    if (value) {
      const valueLines = doc.splitTextToSize(String(value), pageWidth - 2 * margin)
      doc.text(valueLines, margin + 5, currentY)
      currentY += valueLines.length * 5 + 5
    } else if (options.includeEmptyFields) {
      doc.setTextColor(128, 128, 128)
      doc.text('[Not completed]', margin + 5, currentY)
      doc.setTextColor(0, 0, 0)
      currentY += 10
    }

    currentY += 10
  }

  return currentY
}

function generateSectionHTML(section: any, fields: any[], completedData: any, options: any) {
  let html = `<div class="section">`
  html += `<div class="section-title">${section.title}</div>`
  
  if (section.description) {
    html += `<p><em>${section.description}</em></p>`
  }

  const sectionFields = fields.filter(field => field.section === section.id)
  for (const field of sectionFields) {
    html += generateFieldHTML(field, completedData, options)
  }

  html += `</div>`
  return html
}

function generateFieldHTML(field: any, completedData: any, options: any) {
  const value = completedData[field.id]
  const isEmpty = !value || value.trim() === ''
  
  if (isEmpty && !options.includeEmptyFields) {
    return ''
  }

  let html = `<div class="field">`
  html += `<div class="field-label">${field.label}</div>`
  
  if (isEmpty) {
    html += `<div class="field-value empty-field">[This field was not completed]</div>`
  } else {
    const isAutoFilled = options.autoFilledFields && options.autoFilledFields.includes(field.id)
    const cssClass = isAutoFilled ? 'field-value auto-filled' : 'field-value'
    html += `<div class="${cssClass}">${String(value).replace(/\n/g, '<br>')}</div>`
  }
  
  html += `</div>`
  return html
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
}
