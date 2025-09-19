'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, FileText, Target, Download, Sparkles, Upload, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react'
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
  const [missingFieldRecommendations, setMissingFieldRecommendations] = useState([])
  const [processingOCR, setProcessingOCR] = useState(false)
  const [documentQuality, setDocumentQuality] = useState(null)

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
          const parsedAnalysis = typeof existing.ai_analysis === 'string' ? JSON.parse(existing.ai_analysis) : existing.ai_analysis
          setAnalysis(parsedAnalysis)
          
          // Generate missing field recommendations if we have form fields
          if (parsedAnalysis?.formFields) {
            generateMissingFieldRecommendations(parsedAnalysis.formFields)
          }
        } catch (e) {
          console.warn('Could not parse existing analysis:', e)
        }
      }
    } catch (error) {
      console.error('Error loading existing analysis:', error)
    }
  }

  const handleEnhancedDocumentUpload = async (files) => {
    if (!files || files.length === 0) return
    
    setProcessingOCR(true)
    try {
      const file = files[0]
      console.log(`🔍 Processing ${file.name} with client-side OCR...`)
      
      // Check file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        throw new Error('Unsupported file type. Please use JPG, PNG, GIF, WebP, or PDF.')
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File too large. Maximum size is 10MB.')
      }

      // Extract text using client-side OCR
      const { default: enhancedDocumentProcessor } = await import('../lib/enhancedDocumentProcessor')
      
      console.log('📄 Extracting text from document...')
      const extractedText = await enhancedDocumentProcessor.extractText(file, file.type)
      
      if (!extractedText || extractedText.length < 10) {
        throw new Error('No readable text found in document. Please ensure the document is clearly readable and properly oriented.')
      }

      // Clean the text and analyze quality
      const cleanedText = enhancedDocumentProcessor.cleanOCRText(extractedText)
      const quality = enhancedDocumentProcessor.analyzeQuality(cleanedText)
      
      console.log(`✅ Extracted ${cleanedText.length} characters with ${quality.quality} quality`)
      
      // Perform AI analysis on extracted text
      const analysisResponse = await fetch(resolveApiUrl('/api/ai/enhanced-document-processing'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: cleanedText,
          documentType: file.type,
          context: {
            userProfile,
            project,
            opportunity
          }
        })
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json()
        throw new Error(errorData.message || errorData.error || 'Analysis failed')
      }

      const result = await analysisResponse.json()
      console.log('Enhanced document analysis result:', result)
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed')
      }

      setAnalysis(result.analysis)
      setDocumentQuality(quality)
      
      // Generate recommendations for missing fields
      if (result.analysis?.formFields) {
        generateMissingFieldRecommendations(result.analysis.formFields)
      }
      
      toast.success(`Document processed! Extracted ${cleanedText.length} characters with ${quality.quality} quality`)
      
      // Show quality warnings if needed
      if (quality.issues?.length > 0) {
        quality.issues.forEach(issue => {
          toast.warning(issue, { duration: 4000 })
        })
      }

      // Show quality suggestions
      if (quality.suggestions?.length > 0) {
        quality.suggestions.forEach(suggestion => {
          toast.info(suggestion, { duration: 6000 })
        })
      }
      
    } catch (error) {
      console.error('Enhanced document upload error:', error)
      toast.error('Document processing failed: ' + error.message)
    } finally {
      setProcessingOCR(false)
    }
  }

  const generateMissingFieldRecommendations = (formFields) => {
    const recommendations = []
    
    Object.entries(formFields).forEach(([fieldName, fieldData]) => {
      if (!fieldData.value || fieldData.value === '' || fieldData.value === '____' || fieldData.value === '_________') {
        let recommendation = `Missing: ${fieldData.label || fieldName}`
        
        // Add AI suggestions based on field type and user profile
        switch (fieldData.type) {
          case 'email':
            if (userProfile?.contact_email) {
              recommendation += ` → Suggested: ${userProfile.contact_email}`
            }
            break
          case 'phone':
            if (userProfile?.phone) {
              recommendation += ` → Suggested: ${userProfile.phone}`
            }
            break
          case 'text':
            if (fieldName.toLowerCase().includes('organization') && userProfile?.organization_name) {
              recommendation += ` → Suggested: ${userProfile.organization_name}`
            } else if (fieldName.toLowerCase().includes('address') && userProfile?.address) {
              recommendation += ` → Suggested: ${userProfile.address}`
            }
            break
          case 'currency':
            if (fieldName.toLowerCase().includes('amount') && project?.funding_amount) {
              recommendation += ` → Suggested: $${project.funding_amount.toLocaleString()}`
            }
            break
        }
        
        recommendations.push({
          field: fieldName,
          label: fieldData.label || fieldName,
          type: fieldData.type || 'text',
          suggestion: recommendation,
          required: fieldData.required || false
        })
      }
    })
    
    setMissingFieldRecommendations(recommendations)
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
              // User & Authentication
              user: {
                id: user.id,
                email: user.email,
                full_name: userProfile?.full_name || user.user_metadata?.full_name,
                user_role: userProfile?.user_role
              },
              
              // Comprehensive Organization Data
              organization: {
                // Basic Information
                organization_name: userProfile?.organization_name,
                organization_type: userProfile?.organization_type,
                organization_types: userProfile?.organization_types || [],
                
                // Legal & Compliance
                tax_id: userProfile?.tax_id,
                ein: userProfile?.tax_id, // alias for EIN
                date_incorporated: userProfile?.date_incorporated,
                state_incorporated: userProfile?.state_incorporated,
                sam_gov_status: userProfile?.sam_gov_status,
                grants_gov_status: userProfile?.grants_gov_status,
                duns_uei_number: userProfile?.duns_uei_number,
                compliance_history: userProfile?.compliance_history,
                
                // Address & Contact
                address_line1: userProfile?.address_line1,
                address_line2: userProfile?.address_line2,
                city: userProfile?.city,
                state: userProfile?.state,
                zip_code: userProfile?.zip_code,
                phone: userProfile?.phone,
                website: userProfile?.website,
                service_radius: userProfile?.service_radius,
                additional_service_areas: userProfile?.additional_service_areas,
                
                // Organizational Capacity
                annual_budget: userProfile?.annual_budget,
                annual_revenue: userProfile?.annual_revenue,
                full_time_staff: userProfile?.full_time_staff,
                board_size: userProfile?.board_size,
                years_in_operation: userProfile?.years_in_operation,
                grant_experience: userProfile?.grant_experience,
                largest_grant: userProfile?.largest_grant,
                grant_writing_capacity: userProfile?.grant_writing_capacity,
                data_collection_capacity: userProfile?.data_collection_capacity,
                partnership_approach: userProfile?.partnership_approach,
                
                // Mission & Focus
                mission_statement: userProfile?.mission_statement,
                primary_service_areas: userProfile?.primary_service_areas,
                target_demographics: userProfile?.target_demographics,
                unique_differentiators: userProfile?.unique_differentiators,
                key_outcomes: userProfile?.key_outcomes,
                
                // Financial Systems
                audit_status: userProfile?.audit_status,
                financial_systems: userProfile?.financial_systems,
                
                // Contact Person (Executive)
                executive_director: userProfile?.full_name,
                contact_person: userProfile?.full_name,
                contact_email: userProfile?.email || user.email,
                contact_phone: userProfile?.phone
              },
              
              // Comprehensive Project Data
              project: {
                // Basic Project Info
                id: project?.id,
                name: project?.name,
                title: project?.title || project?.name,
                description: project?.description,
                project_narrative: project?.project_narrative,
                
                // Project Categories & Type
                project_categories: project?.project_categories,
                project_type: project?.project_type,
                primary_goals: project?.primary_goals,
                
                // Financial Information
                funding_request_amount: project?.funding_request_amount,
                funding_needed: project?.funding_needed,
                funding_goal: project?.funding_goal,
                total_project_budget: project?.total_project_budget,
                budget: project?.budget,
                
                // Project Details
                estimated_people_served: project?.estimated_people_served,
                location: project?.location,
                project_location: project?.project_location,
                timeline: project?.timeline,
                project_duration: project?.project_duration,
                
                // Project Outcomes
                community_benefit: project?.community_benefit,
                evaluation_plan: project?.evaluation_plan,
                outcome_measures: project?.outcome_measures,
                
                // Funding Preferences
                preferred_funding_types: project?.preferred_funding_types,
                
                // Dates
                start_date: project?.start_date,
                end_date: project?.end_date,
                created_at: project?.created_at
              },
              
              // Opportunity Context (for tailoring)
              opportunity: {
                id: opportunity?.id,
                title: opportunity?.title,
                amount_max: opportunity?.amount_max,
                amount_min: opportunity?.amount_min,
                organization_types: opportunity?.organization_types,
                geographic_focus: opportunity?.geographic_focus,
                program_areas: opportunity?.program_areas
              },
              
              // Analysis Context (if available)
              analysisContext: analysis ? {
                formFields: analysis.formFields,
                extractedText: analysis.extractedText,
                documentStructure: analysis.documentStructure
              } : null
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
              {/* Enhanced Document Upload Section */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Upload Application Form (OCR Enabled)</h4>
                  <p className="text-slate-600 mb-4">
                    Upload a PDF or image of your application form. Our AI will extract text using OCR and identify all form fields.
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={(e) => handleEnhancedDocumentUpload(e.target.files)}
                    className="hidden"
                    id="enhanced-document-upload"
                  />
                  <label
                    htmlFor="enhanced-document-upload"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors ${processingOCR ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {processingOCR ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                        Processing with OCR...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Document
                      </>
                    )}
                  </label>
                </div>
                
                {documentQuality && (
                  <div className={`mt-4 p-3 rounded-lg ${documentQuality.quality === 'good' ? 'bg-green-50 border border-green-200' : documentQuality.quality === 'fair' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center">
                      <CheckCircle className={`w-4 h-4 mr-2 ${documentQuality.quality === 'good' ? 'text-green-600' : documentQuality.quality === 'fair' ? 'text-yellow-600' : 'text-red-600'}`} />
                      <span className={`font-medium ${documentQuality.quality === 'good' ? 'text-green-900' : documentQuality.quality === 'fair' ? 'text-yellow-900' : 'text-red-900'}`}>
                        Document Quality: {documentQuality.quality.toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Field Detection Summary */}
                    {documentQuality.fieldDetection && (
                      <div className="mt-2 text-sm">
                        <p className={`font-medium ${documentQuality.quality === 'good' ? 'text-green-800' : documentQuality.quality === 'fair' ? 'text-yellow-800' : 'text-red-800'}`}>
                          🎯 Field Detection: {documentQuality.fieldDetection.potentialFields} potential fields found
                        </p>
                        {documentQuality.fieldDetection.fieldPatterns?.length > 0 && (
                          <div className="mt-1 text-xs text-slate-600">
                            Detected: {documentQuality.fieldDetection.fieldPatterns.map(p => `${p.count} ${p.name.toLowerCase()}`).join(', ')}
                          </div>
                        )}
                      </div>
                    )}

                    {documentQuality.suggestions?.length > 0 && (
                      <div className="mt-2">
                        {documentQuality.suggestions.map((suggestion, index) => (
                          <p key={index} className="text-sm text-slate-600">• {suggestion}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Missing Field Recommendations */}
              {missingFieldRecommendations.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
                    <h4 className="font-medium text-amber-900">Missing Information Detected</h4>
                  </div>
                  <p className="text-amber-800 text-sm mb-4">
                    AI has identified {missingFieldRecommendations.length} fields that need completion. Here are intelligent suggestions:
                  </p>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {missingFieldRecommendations.map((rec, index) => (
                      <div key={index} className={`flex items-start p-3 rounded-lg ${rec.required ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
                        <Lightbulb className={`w-4 h-4 mt-0.5 mr-2 flex-shrink-0 ${rec.required ? 'text-red-600' : 'text-slate-600'}`} />
                        <div className="flex-1">
                          <p className={`font-medium ${rec.required ? 'text-red-900' : 'text-slate-900'}`}>
                            {rec.label} {rec.required && <span className="text-red-600">*</span>}
                          </p>
                          <p className="text-sm text-slate-600">{rec.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center">
                <div className="p-4 bg-blue-50 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Generate Application Document</h3>
                <p className="text-slate-600 mb-6">
                  Generate a customized application document {analysis ? 'with extracted fields and AI recommendations' : 'based on your project information'}
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">What this includes:</h4>
                  <ul className="text-sm text-blue-800 text-left space-y-1">
                    <li>• Automatically filled form fields based on your project data</li>
                    {analysis && <li>• OCR-extracted fields with intelligent completion</li>}
                    <li>• AI recommendations for missing information</li>
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