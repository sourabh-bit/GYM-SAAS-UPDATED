param(
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$SupabaseAnonKey = $env:SUPABASE_ANON_KEY,
  [string]$OwnerJwt = $env:OWNER_JWT,
  [string]$MemberJwt = $env:MEMBER_JWT,
  [string]$CheckinMemberIds = $env:CHECKIN_MEMBER_IDS,
  [string]$PaymentMemberIds = $env:PAYMENT_MEMBER_IDS,
  [string]$AiQuestion = $env:AI_QUESTION
)

if (-not $SupabaseUrl -or -not $SupabaseAnonKey) {
  Write-Error "SUPABASE_URL and SUPABASE_ANON_KEY are required."
  exit 1
}

$env:SUPABASE_URL = $SupabaseUrl
$env:SUPABASE_ANON_KEY = $SupabaseAnonKey
$env:OWNER_JWT = $OwnerJwt
$env:MEMBER_JWT = $MemberJwt
$env:CHECKIN_MEMBER_IDS = $CheckinMemberIds
$env:PAYMENT_MEMBER_IDS = $PaymentMemberIds
if ($AiQuestion) { $env:AI_QUESTION = $AiQuestion }

Write-Host "Running k6 load tests..."
k6 run "$PSScriptRoot\\k6-gym-saas.js"
