param(
  [Parameter(Mandatory=$true)][string]$UserId,
  [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "Testing Account Settings API for user $UserId at $BaseUrl" -ForegroundColor Cyan

function Invoke-Json {
  param([string]$Method, [string]$Url, [object]$Body)
  $json = $Body | ConvertTo-Json -Depth 6
  Invoke-RestMethod -Method $Method -Uri $Url -Headers @{ 'Content-Type' = 'application/json' } -Body $json
}

# 1) Fetch profile
try {
  $profile = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/account/profile?userId=$UserId"
  Write-Host "Current profile loaded" -ForegroundColor Green
} catch {
  Write-Warning "GET profile failed: $($_.Exception.Message)"
}

# 2) Update profile
try {
  $updates = @{ full_name = "Test User"; organization_name = "Test Org"; organization_type = "nonprofit" }
  $res = Invoke-Json -Method PUT -Url "$BaseUrl/api/account/profile" -Body @{ userId = $UserId; updates = $updates }
  Write-Host "Profile updated: $($res.profile.full_name) / $($res.profile.organization_name)" -ForegroundColor Green
} catch {
  Write-Warning "PUT profile failed: $($_.Exception.Message)"
}

# 3) Update notifications
try {
  $prefs = @{ email = $true; app = $true; sms = $false; digest = "weekly" }
  $res2 = Invoke-Json -Method PUT -Url "$BaseUrl/api/account/notifications" -Body @{ userId = $UserId; preferences = $prefs }
  Write-Host "Notifications updated: $((($res2.profile.notification_preferences | ConvertTo-Json -Depth 6)))" -ForegroundColor Green
} catch {
  Write-Warning "PUT notifications failed: $($_.Exception.Message)"
}

# 4) Verify
try {
  $final = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/account/profile?userId=$UserId"
  Write-Host "Final profile: $((($final.profile | ConvertTo-Json -Depth 6)))" -ForegroundColor Yellow
} catch {
  Write-Warning "Verification GET failed: $($_.Exception.Message)"
}
