'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, FileText, Target, Download, Sparkles } from 'lucide-react'
import { directUserServices } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { resolveApiUrl } from '../lib/apiUrlUtils'
import toast from 'react-hot-toast'
import documentGenerationService from '../lib/documentGenerationService'
import { jsPDF } from 'jspdf'

export default function AIDocumentAnalysisModal({ opportunity, project, userProfile, onClose }) {
  const { user } = useAuth()
  const [generating, setGenerating] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    if (user?.id) {
      // Load any existing analysis for this opportunity
      loadExistingAnalysis()
    }
  }, [user, opportunity, project])

  const loadExistingAnalysis = async () => {
    try {
      // Check if we have existing analysis data for this opportunity/project combo
      const existingOpportunities = await directUserServices.projectOpportunities.getProjectOpportunities(project.id, user.id)
      const existing = existingOpportunities.find(po => po.opportunity_id === opportunity.id)
      
      if (existing?.ai_analysis) {
        try {
          setAnalysis(typeof existing.ai_analysis === 'string' ? JSON.parse(existing.ai_analysis) : existing.ai_analysis)
        } catch (e) {
          console.warn('Could not parse existing analysis:', e)
        }
      }
    } catch (error) {
      console.error('Error loading existing analysis:', error)
    }
  }

  const handleGenerateDocument = async () => {
    try {
      setGenerating(true)
      
      // Create application data combining analysis with project/opportunity info
      const applicationData = {
        opportunity,
        project,
        userProfile,
        analysis,
        createdAt: new Date().toISOString()
      }

      let dynamicFormStructure = null

      // Check for dynamic form structure from various sources
      // Priority 1: Check for dynamic form structure from recent document analysis
      if (opportunity.dynamicFormStructure?.formFields) {
        dynamicFormStructure = opportunity.dynamicFormStructure
        console.log('📝 Using dynamic form structure with', Object.keys(opportunity.dynamicFormStructure.formFields).length, 'fields')
      }
      // Priority 2: Check for uploaded documents with dynamic form structures
      else if (opportunity.uploadedDocuments?.dynamicFormStructures?.length > 0) {
        const latestFormStructure = opportunity.uploadedDocuments.dynamicFormStructures[0]
        dynamicFormStructure = latestFormStructure.formStructure
        console.log('📝 Using uploaded dynamic form structure from', latestFormStructure.fileName, 'with', Object.keys(latestFormStructure.formStructure.formFields || {}).length, 'fields')
      }
      // Priority 3: Check for uploaded forms with analysis results (legacy support)
      else if (opportunity.uploadedForms && opportunity.uploadedForms.length > 0) {
        const applicationForm = opportunity.uploadedForms.find(form => 
          form.documentType === 'application' || form.analysisResults?.formFields
        )
        
        if (applicationForm && applicationForm.analysisResults?.formFields) {
          // Convert legacy format to new dynamic form structure
          dynamicFormStructure = {
            formFields: applicationForm.analysisResults.formFields,
            formMetadata: {
              title: applicationForm.fileName,
              source: 'uploaded_form'
            }
          }
          console.log('📝 Using legacy form template:', applicationForm.fileName)
        }
      }
      // Priority 4: Check if project has stored dynamic form templates
      else if (project.dynamicFormStructure?.formFields) {
        dynamicFormStructure = project.dynamicFormStructure
        console.log('📝 Using project dynamic form structure with', Object.keys(project.dynamicFormStructure.formFields).length, 'fields')
      }

      // If we have a dynamic form structure, use our new generation system
      if (dynamicFormStructure?.formFields) {
        console.log('🟢 Using dynamic form generation system')
        
        // Call our new document generation API
        const response = await fetch(resolveApiUrl('/api/ai/document-generation'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formStructure: dynamicFormStructure,
            userData: {
              organization: userProfile?.organization || userProfile || {},
              project: project || {},
              user: userProfile || {}
            },
            options: {
              includeEmptyFields: false,
              addInstructions: true,
              format: 'pdf'
            },
            action: 'generate'
          })
        })

        if (!response.ok) {
          throw new Error('Document generation API failed')
        }

        const result = await response.json()
        if (result.success) {
          // Generate client-side PDF using our document generation service
          const generatedDoc = await documentGenerationService.generateCompletedForm(
            dynamicFormStructure,
            {
              organization: userProfile?.organization || userProfile || {},
              project: project || {},
              user: userProfile || {}
            },
            {
              fieldMappings: result.data.fieldMappings,
              styles: { includeEmptyFields: false, addInstructions: true }
            }
          )

          if (generatedDoc.success) {
            // Download the generated PDF
            const projectName = (project.name || project.title || 'Project').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_')
            const opportunityName = opportunity.title.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_')
            
            documentGenerationService.downloadPDF(
              generatedDoc.document,
              `${projectName}_${opportunityName}_completed_form.pdf`
            )
            
            // Save to applications
            const submittedAmount = opportunity.amount_max || opportunity.amount_min || project.budget || 25000
            
            await directUserServices.applications.createApplicationViaAPI(user.id, {
              project_id: project.id,
              opportunity_id: opportunity.id,
              status: 'draft',
              submitted_amount: submittedAmount,
              application_data: applicationData,
              generated_document: result.data,
              ai_analysis: analysis
            })

            toast.success(`Completed form generated and downloaded! Based on ${dynamicFormStructure.formMetadata?.title || 'uploaded form'} with ${result.data.completionStats?.completionPercentage || 0}% completion.`)
          } else {
            throw new Error(generatedDoc.error || 'PDF generation failed')
          }
        } else {
          throw new Error(result.message || 'Generation failed')
        }
      } else {
        // Fallback to legacy system for opportunities without form structure
        console.log('⚠️ No dynamic form structure found, using legacy document generation')
        
        const response = await fetch(resolveApiUrl('/api/ai/generate-document'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            applicationData,
            documentType: 'grant-application'
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate document')
        }

        const result = await response.json()
        
        // Save to applications
        const submittedAmount = opportunity.amount_max || opportunity.amount_min || project.budget || 25000
        
        await directUserServices.applications.createApplicationViaAPI(user.id, {
          project_id: project.id,
          opportunity_id: opportunity.id,
          status: 'draft',
          submitted_amount: submittedAmount,
          application_data: applicationData,
          generated_document: result.formFields,
          ai_analysis: analysis
        })

        // Generate basic PDF using legacy approach
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 20
        const lineHeight = 8
        let yPosition = margin

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('GRANT APPLICATION', pageWidth / 2, yPosition, { align: 'center' })
        yPosition += lineHeight * 2

        // Metadata section
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const metadata = result.metadata || {}
        doc.text(`Applicant: ${metadata.applicant || userProfile?.full_name || 'Applicant Name'}`, margin, yPosition)
        yPosition += lineHeight
        doc.text(`Date: ${metadata.date || new Date().toLocaleDateString()}`, margin, yPosition)
        yPosition += lineHeight
        doc.text(`Opportunity: ${opportunity.title}`, margin, yPosition)
        yPosition += lineHeight * 2

        // Form fields
        doc.setFontSize(12)
        const formFields = result.formFields || []
        
        for (const field of formFields) {
          if (yPosition > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage()
            yPosition = margin
          }

          doc.setFont('helvetica', 'bold')
          doc.text(`${field.label}:`, margin, yPosition)
          yPosition += lineHeight + 2

          doc.setFont('helvetica', 'normal')
          const textWidth = pageWidth - (margin * 2)
          const lines = doc.splitTextToSize(field.value || '', textWidth)
          
          for (const line of lines) {
            if (yPosition > doc.internal.pageSize.getHeight() - 20) {
              doc.addPage()
              yPosition = margin
            }
            doc.text(line, margin, yPosition)
            yPosition += lineHeight
          }
          
          yPosition += lineHeight
        }

        // Download PDF
        const projectName = (project.name || project.title || 'Project').replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_')
        const opportunityName = opportunity.title.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_')
        
        doc.save(`${projectName}_${opportunityName}_grant_application.pdf`)

        toast.success('Grant application PDF generated and downloaded!')
      }
      
    } catch (error) {
      console.error('Document generation error:', error)
      toast.error('Failed to generate document: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGrantWriterReview = async () => {
    try {
      // Save current state to database for grant writer review
      const reviewData = {
        project_id: project.id,
        opportunity_id: opportunity.id,
        ai_analysis: analysis,
        status: 'pending_review',
        requested_at: new Date().toISOString()
      }

      await directUserServices.createGrantWriterReview(user.id, reviewData)
      
      toast.success('Review request submitted! A grant writer will contact you within 24 hours.')
      
    } catch (error) {
      console.error('Grant writer review error:', error)
      toast.error('Failed to request review: ' + error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-4">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Document Generation</h2>
                <p className="text-blue-100 mt-1">
                  Generate application documents for {opportunity.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {generating ? (
            <div className="text-center py-16">
              <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <FileText className="w-10 h-10 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Generating Application Document</h3>
              <p className="text-slate-600">AI is creating a customized application document...</p>
              <div className="mt-4 w-48 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="p-4 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Generate Application Document</h3>
                <p className="text-slate-600 mb-6">
                  Generate a customized application document based on uploaded forms and project information
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">What this includes:</h4>
                  <ul className="text-sm text-blue-800 text-left space-y-1">
                    <li>• Automatically filled form fields based on your project data</li>
                    <li>• Professional PDF formatting</li>
                    <li>• Integration with your organization profile</li>
                    <li>• Saved to your applications for tracking</li>
                  </ul>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleGenerateDocument}
                    disabled={generating}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Generate & Download Document
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-slate-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Document generation powered by AI
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleGrantWriterReview}
                className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center"
              >
                <Target className="w-4 h-4 mr-2" />
                Review with Grant Writer
              </button>
              
              <button 
                onClick={onClose} 
                className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}