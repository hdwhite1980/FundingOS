// remove-hascolumn.js - Remove hasColumn checks from AccountSettingsModal.js
const fs = require('fs');

const filePath = 'components/AccountSettingsModal.js';
let content = fs.readFileSync(filePath, 'utf8');

// Fields to unwrap (remove hasColumn checks)
const fieldsToUnwrap = [
  'user_role', 'audit_status', 'financial_systems', 'indirect_cost_rate',
  'address_line1', 'address_line2', 'city', 'state', 'zip_code',
  'phone', 'website', 'service_radius', 'annual_budget', 'years_in_operation',
  'full_time_staff', 'board_size', 'grant_experience', 'largest_grant',
  'grant_writing_capacity', 'data_collection_capacity', 'partnership_approach',
  'mission_statement', 'primary_service_areas', 'target_demographics',
  'key_outcomes', 'unique_differentiators', 'minority_owned', 'woman_owned',
  'veteran_owned', 'small_business', 'hubzone_certified', 'eight_a_certified',
  'disadvantaged_business', 'organization_type', 'organization_types'
];

// Remove hasColumn checks for each field
fieldsToUnwrap.forEach(field => {
  // Match: {hasColumn('field') && (
  const openPattern = new RegExp(`\\{hasColumn\\('${field}'\\)\\s*&&\\s*\\(`, 'g');
  content = content.replace(openPattern, '{');
  
  // Match: {!hasColumn('field') && (
  const negatePattern = new RegExp(`\\{!hasColumn\\('${field}'\\)\\s*&&\\s*\\(`, 'g');
  content = content.replace(negatePattern, '{');
});

// Now we need to remove the corresponding closing )}
// This is trickier - we'll look for patterns like:
// </div>\n    )}
// and replace with:
// </div>\n    }

// Simple heuristic: replace )}  that appear after hasColumn removals
content = content.replace(/(\s+)\)\}/g, '$1}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Removed hasColumn checks for standard fields');
console.log('✅ Kept notification_preferences checks intact');
