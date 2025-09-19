/**
 * Test script to verify the form completion API response structure
 */

const testFormCompletion = async () => {
  const mockUserProfile = {
    id: "test-user-id",
    email: "test@company.com",
    organization_name: "Test Company LLC",
    tax_id: "12-3456789",
    address: "123 Test Street, Test City, TS 12345",
    phone: "(555) 123-4567",
    website: "https://testcompany.com",
    mission: "We are dedicated to improving educational outcomes through technology"
  };
  
  const mockProject = {
    id: "test-project-id",
    name: "Test Project",
    description: "A test project for grant application focused on educational technology",
    funding_goal: 50000,
    category: "Technology",
    status: "active",
    duration: "24 months"
  };
  
  const mockFormStructure = {
    formFields: {
      organization_name: {
        label: "Organization Name",
        type: "text",
        required: true
      },
      project_title: {
        label: "Project Title",
        type: "text",
        required: true
      },
      funding_amount: {
        label: "Funding Amount",
        type: "number",
        required: true
      },
      project_description: {
        label: "Project Description",
        type: "textarea",
        required: true
      },
      contact_email: {
        label: "Contact Email",
        type: "email",
        required: true
      },
      tax_identification: {
        label: "Tax ID",
        type: "text",
        required: true
      },
      organization_address: {
        label: "Organization Address",
        type: "text",
        required: true
      }
    }
  };
  
  console.log('Testing form completion with mock data...');
  console.log('User Profile Keys:', Object.keys(mockUserProfile));
  console.log('Project Keys:', Object.keys(mockProject));
  console.log('Form Fields Count:', Object.keys(mockFormStructure.formFields).length);
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/smart-form-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formStructure: mockFormStructure,
        userData: {
          userProfile: mockUserProfile,
          project: mockProject,
          organization: mockUserProfile
        }
      })
    });
    
    console.log('Response Status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      return;
    }
    
    const result = await response.json();
    console.log('\n--- API RESPONSE ---');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n--- VALIDATION ---');
    console.log('Has filledForm?', !!result.filledForm);
    console.log('Has fieldCompletions?', !!result.fieldCompletions);
    console.log('Number of filled fields:', Object.keys(result.filledForm || result.fieldCompletions || {}).length);
    console.log('Completion percentage:', result.completionPercentage);
    console.log('Has fieldMappings?', !!result.fieldMappings);
    
    const filledData = result.filledForm || result.fieldCompletions || {};
    if (Object.keys(filledData).length > 0) {
      console.log('\n--- FILLED FIELDS ---');
      Object.entries(filledData).forEach(([field, value]) => {
        console.log(`${field}: ${value}`);
      });
    } else {
      console.log('\n--- NO FILLED FIELDS DETECTED ---');
      console.log('This indicates the API might not be properly mapping fields');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

// Run the test
testFormCompletion();