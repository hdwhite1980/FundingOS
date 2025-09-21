/**
 * Smart Form Completion Service (Client-side)
 * 
 * This service provides AI-powered assistance for completing grant and funding
 * application forms by calling server-side API routes.
 */

import { resolveApiUrl } from './apiUrlUtils'

export class SmartFormCompletionService {
  constructor() {
    this.apiBaseUrl = '/api/ai/smart-form-completion'
  }

  // Smart field mapping - same logic as contextBuilder
  mapFieldToUserProfile(fieldName, userProfile) {
    const cleanFieldName = fieldName.toLowerCase().replace(/[_\s-]/g, '').trim()
    
    // EIN/Tax ID mappings (same as contextBuilder)
    if (cleanFieldName.match(/^(ein|taxid|employeridentification|federaltax|taxidnumber)$/)) {
      return userProfile?.ein || userProfile?.tax_id || null
    }
    
    // DUNS/UEI mappings
    if (cleanFieldName.match(/^(duns|dunsnumber|uei|uniqueentity|dunsuei|dunsueinum)$/)) {
      return userProfile?.duns_number || userProfile?.duns_uei || userProfile?.duns_uei_number || null
    }
    
    // CAGE Code mappings
    if (cleanFieldName.match(/^(cage|cagecode|commercialandgovernment)$/)) {
      return userProfile?.cage_code || null
    }
    
    // SAM registration mappings
    if (cleanFieldName.match(/^(sam|samgov|samregistration|samstatus|systemforawardmanagement)$/)) {
      return userProfile?.sam_registration || userProfile?.sam_gov_status || null
    }
    
    // Organization name mappings
    if (cleanFieldName.match(/^(organization|org|company|business|organizationname|companyname|businessname)$/)) {
      return userProfile?.organization_name || null
    }
    
    // Contact information mappings
    if (cleanFieldName.match(/^(email|contactemail|emailaddress)$/)) {
      return userProfile?.email || null
    }
    
    if (cleanFieldName.match(/^(phone|phonenumber|telephone|contactphone)$/)) {
      return userProfile?.phone || null
    }
    
    if (cleanFieldName.match(/^(website|url|websiteurl)$/)) {
      return userProfile?.website || null
    }
    
    // Address mappings
    if (cleanFieldName.match(/^(address|address1|addressline1|street)$/)) {
      return userProfile?.address_line1 || userProfile?.address || null
    }
    
    if (cleanFieldName.match(/^(address2|addressline2)$/)) {
      return userProfile?.address_line2 || null
    }
    
    if (cleanFieldName.match(/^(city)$/)) {
      return userProfile?.city || null
    }
    
    if (cleanFieldName.match(/^(state|stateorprovince)$/)) {
      return userProfile?.state || null
    }
    
    if (cleanFieldName.match(/^(zip|zipcode|postalcode)$/)) {
      return userProfile?.zip_code || null
    }
    
    if (cleanFieldName.match(/^(country)$/)) {
      return userProfile?.country || 'United States'
    }
    
    // Full name mappings
    if (cleanFieldName.match(/^(name|fullname|contactname|primarycontact)$/)) {
      return userProfile?.full_name || null
    }
    
    // Organization details
    if (cleanFieldName.match(/^(organizationtype|orgtype|businesstype)$/)) {
      return userProfile?.organization_type || null
    }
    
    if (cleanFieldName.match(/^(yearsinoperation|yearsestablished|establishedyear)$/)) {
      return userProfile?.years_in_operation || null
    }
    
    if (cleanFieldName.match(/^(employeecount|numberofemployees|staff)$/)) {
      return userProfile?.employee_count || null
    }
    
    if (cleanFieldName.match(/^(annualrevenue|revenue|budget|annualbudget)$/)) {
      return userProfile?.annual_revenue || userProfile?.annual_budget || null
    }
    
    // Incorporation details
    if (cleanFieldName.match(/^(incorporationdate|dateincorporated|founded)$/)) {
      return userProfile?.incorporation_year || null
    }
    
    if (cleanFieldName.match(/^(stateincorporated|incorporationstate|stateofincorporation)$/)) {
      return userProfile?.state || null // Often same as business location
    }
    
    // Certification status mappings
    if (cleanFieldName.match(/^(minorityowned|minoritybusiness)$/)) {
      return userProfile?.minority_owned ? 'Yes' : 'No'
    }
    
    if (cleanFieldName.match(/^(womanowned|womenbusiness)$/)) {
      return userProfile?.woman_owned ? 'Yes' : 'No'
    }
    
    if (cleanFieldName.match(/^(veteranowned|veteranbusiness)$/)) {
      return userProfile?.veteran_owned ? 'Yes' : 'No'
    }
    
    if (cleanFieldName.match(/^(smallbusiness|sba)$/)) {
      return userProfile?.small_business ? 'Yes' : 'No'
    }
    
    if (cleanFieldName.match(/^(8acertified|eightacertified)$/)) {
      return userProfile?.eight_a_certified ? 'Yes' : 'No'
    }
    
    if (cleanFieldName.match(/^(hubzone|hubzonecertified)$/)) {
      return userProfile?.hubzone_certified ? 'Yes' : 'No'
    }
    
    // Mission and focus areas
    if (cleanFieldName.match(/^(mission|missionstatement|purpose)$/)) {
      return userProfile?.mission_statement || null
    }
    
    if (cleanFieldName.match(/^(focusareas|primaryfocus|serviceareas)$/)) {
      return userProfile?.primary_focus_areas || null
    }
    
    if (cleanFieldName.match(/^(populationsserved|targetpopulation|demographics)$/)) {
      return userProfile?.populations_served || null
    }
    
    // Legal structure
    if (cleanFieldName.match(/^(legalstructure|entitytype|businessstructure)$/)) {
      return userProfile?.legal_structure || userProfile?.organization_type || null
    }
    
    return null
  }

  // Enhanced autofill with intelligent field mapping
  smartAutoFill(fieldName, userProfile, projectData) {
    // First try direct mapping from user profile
    const profileValue = this.mapFieldToUserProfile(fieldName, userProfile)
    if (profileValue !== null) {
      return {
        value: profileValue,
        confidence: 0.9,
        source: 'User Profile'
      }
    }
    
    // Then try project data for project-specific fields
    const cleanFieldName = fieldName.toLowerCase().replace(/[_\s-]/g, '').trim()
    
    if (cleanFieldName.match(/^(project|projecttitle|projectname|title)$/) && projectData?.name) {
      return {
        value: projectData.name,
        confidence: 0.9,
        source: 'Project Data'
      }
    }
    
    if (cleanFieldName.match(/^(projectdescription|description|summary)$/) && projectData?.description) {
      return {
        value: projectData.description,
        confidence: 0.8,
        source: 'Project Data'
      }
    }
    
    if (cleanFieldName.match(/^(funding|fundingrequest|amount|budgetrequest)$/) && projectData?.funding_needed) {
      return {
        value: projectData.funding_needed,
        confidence: 0.8,
        source: 'Project Data'
      }
    }
    
    if (cleanFieldName.match(/^(location|projectlocation|city)$/) && projectData?.location) {
      return {
        value: projectData.location,
        confidence: 0.7,
        source: 'Project Data'
      }
    }
    
    if (cleanFieldName.match(/^(duration|timeline|timeframe)$/) && projectData?.timeline) {
      return {
        value: projectData.timeline,
        confidence: 0.7,
        source: 'Project Data'
      }
    }
    
    if (cleanFieldName.match(/^(targetpopulation|beneficiaries|served)$/) && projectData?.target_population) {
      return {
        value: projectData.target_population,
        confidence: 0.8,
        source: 'Project Data'
      }
    }
    
    return null
  }

  // ApplicationAssistant compatibility methods
  
  async identifyMissingInformation(applicationForm, context) {
    const { userProfile, projectData } = context || {}
    return {
      missing_critical: [],
      missing_optional: [],
      available_fields: Object.keys(userProfile || {}).concat(Object.keys(projectData || {})),
      completion_percentage: 75
    }
  }

  async generateClarifyingQuestions(analysis, context) {
    return [
      {
        id: 'general',
        category: 'General',
        question: 'What additional information would help strengthen your application?',
        helpText: 'Consider including details about your methodology, timeline, or expected impact.',
        priority: 'medium'
      }
    ]
  }

  async analyzeAndCompleteForm(applicationForm, userProfile, projectData, previousApplications = []) {
    // Extract form fields from applicationForm if it's an object
    let formFields = []
    if (applicationForm && typeof applicationForm === 'object') {
      if (applicationForm.fields) {
        formFields = applicationForm.fields
      } else if (applicationForm.formStructure?.fields) {
        formFields = applicationForm.formStructure.fields
      }
    }
    
    const fieldCompletions = {}
    let autoFilledCount = 0
    let totalFieldsProcessed = 0
    
    // If we have form structure, use smart mapping for each field
    if (formFields.length > 0) {
      formFields.forEach(field => {
        totalFieldsProcessed++
        const fieldId = field.id || field.name || field.label?.toLowerCase().replace(/\s+/g, '_')
        
        if (fieldId) {
          const autoFillResult = this.smartAutoFill(fieldId, userProfile, projectData)
          if (autoFillResult && autoFillResult.value) {
            fieldCompletions[fieldId] = autoFillResult.value
            autoFilledCount++
          }
        }
      })
    } else {
      // Fallback: Use comprehensive field mapping for common field names
      const commonFields = [
        // Organization identifiers
        'organization_name', 'company_name', 'business_name',
        'ein', 'tax_id', 'tax_id_ein', 'federal_tax_id', 'employer_identification_number',
        'duns_number', 'uei_number', 'duns_uei_number',
        'cage_code', 'sam_gov_status', 'sam_registration',
        
        // Contact information
        'contact_email', 'email', 'email_address',
        'phone', 'phone_number', 'telephone', 'contact_phone',
        'full_name', 'contact_name', 'primary_contact',
        'website', 'website_url',
        
        // Address
        'address', 'address_line1', 'street_address',
        'address_line2', 'address2',
        'city', 'state', 'zip_code', 'postal_code', 'country',
        
        // Organization details
        'organization_type', 'business_type', 'legal_structure',
        'years_in_operation', 'years_established',
        'employee_count', 'number_of_employees',
        'annual_revenue', 'annual_budget',
        'incorporation_date', 'date_incorporated',
        'state_incorporated', 'incorporation_state',
        
        // Certifications
        'minority_owned', 'woman_owned', 'veteran_owned', 'small_business',
        'eight_a_certified', '8a_certified', 'hubzone_certified',
        
        // Mission and focus
        'mission_statement', 'purpose',
        'primary_focus_areas', 'focus_areas', 'service_areas',
        'populations_served', 'target_population',
        
        // Project fields
        'project_title', 'project_name', 'title',
        'project_description', 'description', 'summary',
        'funding_request', 'funding_needed', 'amount_requested',
        'project_location', 'location',
        'project_duration', 'timeline', 'timeframe'
      ]
      
      commonFields.forEach(fieldName => {
        totalFieldsProcessed++
        const autoFillResult = this.smartAutoFill(fieldName, userProfile, projectData)
        if (autoFillResult && autoFillResult.value) {
          fieldCompletions[fieldName] = autoFillResult.value
          autoFilledCount++
        }
      })
    }
    
    const completionPercentage = totalFieldsProcessed > 0 ? 
      Math.round((autoFilledCount / totalFieldsProcessed) * 100) : 0

    return {
      fieldCompletions,
      narrativeSuggestions: [
        {
          field: 'project_summary',
          suggestion: 'Describe your project goals, methodology, and expected outcomes based on your organization\'s mission and focus areas.',
          priority: 'high'
        },
        {
          field: 'project_impact',
          suggestion: 'Explain how this project will benefit your target population and align with your organization\'s goals.',
          priority: 'high'
        },
        {
          field: 'sustainability_plan',
          suggestion: 'Describe how you will maintain the project benefits beyond the grant period.',
          priority: 'medium'
        }
      ],
      strategicRecommendations: [
        {
          type: 'improvement',
          title: 'Complete Organization Profile',
          description: `Auto-filled ${autoFilledCount} of ${totalFieldsProcessed} fields. Complete your profile to improve autofill coverage.`,
          priority: 'medium'
        },
        ...(userProfile?.ein || userProfile?.tax_id ? [] : [{
          type: 'missing_data',
          title: 'Add EIN/Tax ID',
          description: 'Many grant applications require your organization\'s EIN. Add this to your profile.',
          priority: 'high'
        }]),
        ...(userProfile?.duns_number || userProfile?.duns_uei || userProfile?.duns_uei_number ? [] : [{
          type: 'missing_data',
          title: 'Add DUNS/UEI Number',
          description: 'Federal grants often require DUNS or UEI numbers. Consider registering for these.',
          priority: 'medium'
        }])
      ],
      missingInformation: this.identifyMissingProfileData(userProfile),
      completionPercentage,
      autoFilledCount,
      totalFieldsProcessed,
      analysisDate: new Date().toISOString(),
      confidence: autoFilledCount > 0 ? Math.min(0.9, autoFilledCount / Math.max(totalFieldsProcessed, 10)) : 0.1
    }
  }

  // Helper method to identify missing profile data
  identifyMissingProfileData(userProfile) {
    const missing = []
    
    if (!userProfile?.ein && !userProfile?.tax_id) {
      missing.push({
        field: 'ein',
        label: 'EIN/Tax ID',
        importance: 'high',
        description: 'Required for most grant applications'
      })
    }
    
    if (!userProfile?.organization_name) {
      missing.push({
        field: 'organization_name',
        label: 'Organization Name',
        importance: 'high',
        description: 'Primary identifier for your organization'
      })
    }
    
    if (!userProfile?.address_line1) {
      missing.push({
        field: 'address',
        label: 'Organization Address',
        importance: 'high',
        description: 'Required for legal documentation'
      })
    }
    
    if (!userProfile?.phone) {
      missing.push({
        field: 'phone',
        label: 'Contact Phone',
        importance: 'medium',
        description: 'Important for grant communications'
      })
    }
    
    if (!userProfile?.duns_number && !userProfile?.duns_uei && !userProfile?.duns_uei_number) {
      missing.push({
        field: 'duns_uei',
        label: 'DUNS/UEI Number',
        importance: 'medium',
        description: 'Required for federal grants'
      })
    }
    
    if (!userProfile?.sam_registration && !userProfile?.sam_gov_status) {
      missing.push({
        field: 'sam_registration',
        label: 'SAM.gov Registration',
        importance: 'medium',
        description: 'Required for federal grants over $30,000'
      })
    }
    
    return missing
  }

  async testConnection() {
    return true
  }

  async completeFormField({ fieldName, fieldDescription, fieldType = 'text', context = '', userProfile = {} }) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/smart-form-completion'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldName,
          fieldDescription,
          fieldType,
          context,
          userProfile,
          action: 'complete'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.completion || 'Unable to generate completion'
    } catch (error) {
      console.error('Error completing form field:', error)
      return 'Error generating completion'
    }
  }
}

export const smartFormCompletionService = new SmartFormCompletionService()
export default smartFormCompletionService
