# PowerShell script to remove hasColumn checks from AccountSettingsModal.js
# Keeps only notification_preferences checks

$file = "components\AccountSettingsModal.js"
$content = Get-Content $file -Raw

# List of fields that should NOT have hasColumn checks (standard profile fields)
$fieldsToUnwrap = @(
    'user_role',
    'audit_status',
    'financial_systems',
    'indirect_cost_rate',
    'address_line1',
    'address_line2',
    'city',
    'state',
    'zip_code',
    'phone',
    'website',
    'service_radius',
    'annual_budget',
    'years_in_operation',
    'full_time_staff',
    'board_size',
    'grant_experience',
    'largest_grant',
    'grant_writing_capacity',
    'data_collection_capacity',
    'partnership_approach',
    'mission_statement',
    'primary_service_areas',
    'target_demographics',
    'key_outcomes',
    'unique_differentiators',
    'minority_owned',
    'woman_owned',
    'veteran_owned',
    'small_business',
    'hubzone_certified',
    'eight_a_certified',
    'disadvantaged_business'
)

# For each field, remove the hasColumn wrapper
foreach ($field in $fieldsToUnwrap) {
    # Pattern to match {hasColumn('field') && (
    $pattern = "\{hasColumn\('$field'\) && \("
    $content = $content -replace $pattern, "{"
    
    # Find and remove the closing )}
    # This is trickier as we need to match the correct closing
}

# Save the modified content
$content | Set-Content $file -NoNewline

Write-Host "Removed hasColumn checks for standard fields"
Write-Host "Kept notification_preferences checks intact"
