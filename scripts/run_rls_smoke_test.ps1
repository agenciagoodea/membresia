param(
  [string]$EnvFile = ".env",
  [string]$OutFile = "reports/rls_smoke_report.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Import-DotEnv {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($line.StartsWith("#")) { return }
    if ($line -notmatch "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") { return }

    $name = $matches[1]
    $value = $matches[2].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
    if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Substring(1, $value.Length - 2) }
    Set-Item -Path ("env:{0}" -f $name) -Value $value
  }
}

function Get-EnvFirst {
  param(
    [string[]]$Names,
    [switch]$Required
  )
  foreach ($name in $Names) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }
  }
  if ($Required) {
    throw "Variável obrigatória ausente. Opções aceitas: $($Names -join ', ')"
  }
  return $null
}

function Parse-JsonSafe {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
  try { return ($Text | ConvertFrom-Json) } catch { return $null }
}

function Parse-JsonArraySafe {
  param([string]$Text)
  $json = Parse-JsonSafe -Text $Text
  if ($null -eq $json) { return @() }
  if ($json -is [System.Array]) { return $json }
  return @($json)
}

function New-Result {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Severity,
    [string]$Expectation,
    [object]$Response,
    [string]$Notes = ""
  )

  [PSCustomObject]@{
    test = $Name
    passed = $Passed
    severity = $Severity
    expectation = $Expectation
    status = $Response.status
    notes = $Notes
    response_error = $Response.error
  }
}

function Invoke-Supa {
  param(
    [string]$Method,
    [string]$Path,
    [string]$ApiKey,
    [string]$Jwt = "",
    [object]$Body = $null
  )

  $headers = @{
    apikey = $ApiKey
    Authorization = "Bearer $ApiKey"
  }
  if (-not [string]::IsNullOrWhiteSpace($Jwt)) {
    $headers.Authorization = "Bearer $Jwt"
  }
  if ($Body -ne $null) {
    $headers.Prefer = "return=representation"
  }

  $uri = "$script:SUPABASE_URL/rest/v1/$Path"

  try {
    if ($Body -ne $null) {
      $jsonBody = ($Body | ConvertTo-Json -Depth 20 -Compress)
      $raw = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $jsonBody -UseBasicParsing
    } else {
      $raw = Invoke-WebRequest -Method $Method -Uri $uri -Headers $headers -UseBasicParsing
    }
    $content = [string]$raw.Content
    return [PSCustomObject]@{
      ok = $true
      status = [int]$raw.StatusCode
      body = $content
      json = (Parse-JsonSafe -Text $content)
      error = ""
    }
  } catch {
    $status = 0
    $content = ""
    if ($_.Exception.Response -ne $null) {
      $status = [int]$_.Exception.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $content = $reader.ReadToEnd()
      $reader.Close()
    }
    return [PSCustomObject]@{
      ok = $false
      status = $status
      body = $content
      json = (Parse-JsonSafe -Text $content)
      error = $_.Exception.Message
    }
  }
}

function Get-TokenFromAuth {
  param(
    [string]$Email,
    [string]$Password,
    [string]$AnonKey
  )
  if ([string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($Password)) { return $null }

  $headers = @{
    apikey = $AnonKey
    Authorization = "Bearer $AnonKey"
    "Content-Type" = "application/json"
  }
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
  $uri = "$script:SUPABASE_URL/auth/v1/token?grant_type=password"

  try {
    $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
    return $resp.access_token
  } catch {
    return $null
  }
}

function Get-RoleToken {
  param(
    [string[]]$TokenNames,
    [string[]]$EmailNames,
    [string[]]$PasswordNames,
    [string]$AnonKey
  )

  $token = Get-EnvFirst -Names $TokenNames
  if (-not [string]::IsNullOrWhiteSpace($token)) { return $token }

  $email = Get-EnvFirst -Names $EmailNames
  $password = Get-EnvFirst -Names $PasswordNames
  return Get-TokenFromAuth -Email $email -Password $password -AnonKey $AnonKey
}

Import-DotEnv -Path $EnvFile

$script:SUPABASE_URL = Get-EnvFirst -Names @("SUPABASE_URL", "VITE_SUPABASE_URL") -Required
$ANON_KEY = Get-EnvFirst -Names @("SUPABASE_ANON_KEY", "ANON_KEY", "VITE_SUPABASE_ANON_KEY") -Required

$JWT_MEMBER = Get-RoleToken -TokenNames @("JWT_MEMBER", "TOKEN_MEMBER_A") -EmailNames @("MEMBER_EMAIL", "TEST_MEMBER_EMAIL") -PasswordNames @("MEMBER_PASSWORD", "TEST_MEMBER_PASSWORD") -AnonKey $ANON_KEY
$JWT_ADMIN = Get-RoleToken -TokenNames @("JWT_ADMIN", "TOKEN_ADMIN_A") -EmailNames @("ADMIN_EMAIL", "TEST_ADMIN_EMAIL") -PasswordNames @("ADMIN_PASSWORD", "TEST_ADMIN_PASSWORD") -AnonKey $ANON_KEY
$JWT_MASTER = Get-RoleToken -TokenNames @("JWT_MASTER", "TOKEN_MASTER") -EmailNames @("MASTER_EMAIL", "TEST_MASTER_EMAIL") -PasswordNames @("MASTER_PASSWORD", "TEST_MASTER_PASSWORD") -AnonKey $ANON_KEY

$CHURCH_ID_A = Get-EnvFirst -Names @("CHURCH_ID_A", "RLS_CHURCH_ID_A")
$CHURCH_ID_B = Get-EnvFirst -Names @("CHURCH_ID_B", "RLS_CHURCH_ID_B")

$results = New-Object System.Collections.Generic.List[object]

# 1) anon cannot read members
$r = Invoke-Supa -Method "GET" -Path "members?select=id&limit=1" -ApiKey $ANON_KEY
$anonReadMembersBlocked = ($r.status -in @(401, 403)) -or ($r.status -eq 200 -and (Parse-JsonArraySafe -Text $r.body).Count -eq 0)
$results.Add((New-Result -Name "anon_blocked_members_read" -Passed $anonReadMembersBlocked -Severity "critical" -Expectation "anon não deve ler members" -Response $r))

# 2) anon reads only active churches
$r = Invoke-Supa -Method "GET" -Path "churches?select=id,status&status=in.(ATIVO,ACTIVE)&limit=50" -ApiKey $ANON_KEY
$rows = Parse-JsonArraySafe -Text $r.body
$allActive = $true
foreach ($row in $rows) {
  if ($row.status -notin @("ATIVO", "ACTIVE")) { $allActive = $false; break }
}
$results.Add((New-Result -Name "anon_reads_active_churches_only" -Passed ($r.status -eq 200 -and $allActive) -Severity "critical" -Expectation "anon pode ler somente churches ativas" -Response $r))

# 3) anon reads only published paid_events
$r = Invoke-Supa -Method "GET" -Path "paid_events?select=id,status&status=eq.published&limit=50" -ApiKey $ANON_KEY
$rows = Parse-JsonArraySafe -Text $r.body
$allPublished = $true
foreach ($row in $rows) {
  if ($row.status -ne "published") { $allPublished = $false; break }
}
$results.Add((New-Result -Name "anon_reads_published_paid_events_only" -Passed ($r.status -eq 200 -and $allPublished) -Severity "critical" -Expectation "anon lê apenas paid_events publicados" -Response $r))

# 4) member tenant isolation
if (-not [string]::IsNullOrWhiteSpace($JWT_MEMBER) -and -not [string]::IsNullOrWhiteSpace($CHURCH_ID_B)) {
  $r = Invoke-Supa -Method "GET" -Path "members?select=id,church_id&church_id=eq.$CHURCH_ID_B&limit=10" -ApiKey $ANON_KEY -Jwt $JWT_MEMBER
  $rows = Parse-JsonArraySafe -Text $r.body
  $memberBlockedOtherChurch = ($r.status -eq 200 -and $rows.Count -eq 0)
  $results.Add((New-Result -Name "member_blocked_other_church" -Passed $memberBlockedOtherChurch -Severity "critical" -Expectation "member não lê members de outra igreja" -Response $r))
} else {
  $results.Add([PSCustomObject]@{ test = "member_blocked_other_church"; passed = $false; severity = "warning"; expectation = "member não lê members de outra igreja"; status = 0; notes = "SKIPPED: JWT_MEMBER ou CHURCH_ID_B ausente"; response_error = "" })
}

# 5) admin blocked other church financial records
if (-not [string]::IsNullOrWhiteSpace($JWT_ADMIN) -and -not [string]::IsNullOrWhiteSpace($CHURCH_ID_B)) {
  $r = Invoke-Supa -Method "GET" -Path "financial_records?select=id,church_id&church_id=eq.$CHURCH_ID_B&limit=10" -ApiKey $ANON_KEY -Jwt $JWT_ADMIN
  $rows = Parse-JsonArraySafe -Text $r.body
  $adminBlockedOtherChurch = ($r.status -eq 200 -and $rows.Count -eq 0)
  $results.Add((New-Result -Name "admin_blocked_other_church_financial_records" -Passed $adminBlockedOtherChurch -Severity "critical" -Expectation "admin não lê financial_records de outra igreja" -Response $r))
} else {
  $results.Add([PSCustomObject]@{ test = "admin_blocked_other_church_financial_records"; passed = $false; severity = "warning"; expectation = "admin não lê financial_records de outra igreja"; status = 0; notes = "SKIPPED: JWT_ADMIN ou CHURCH_ID_B ausente"; response_error = "" })
}

# 6) admin blocked saas_settings
if (-not [string]::IsNullOrWhiteSpace($JWT_ADMIN)) {
  $r = Invoke-Supa -Method "GET" -Path "saas_settings?select=*&limit=1" -ApiKey $ANON_KEY -Jwt $JWT_ADMIN
  $rows = Parse-JsonArraySafe -Text $r.body
  $adminBlockedSaas = ($r.status -in @(401, 403)) -or ($r.status -eq 200 -and $rows.Count -eq 0)
  $results.Add((New-Result -Name "admin_blocked_saas_settings" -Passed $adminBlockedSaas -Severity "critical" -Expectation "admin não acessa saas_settings" -Response $r))
} else {
  $results.Add([PSCustomObject]@{ test = "admin_blocked_saas_settings"; passed = $false; severity = "warning"; expectation = "admin não acessa saas_settings"; status = 0; notes = "SKIPPED: JWT_ADMIN ausente"; response_error = "" })
}

# 7) master has global members access
if (-not [string]::IsNullOrWhiteSpace($JWT_MASTER)) {
  $r = Invoke-Supa -Method "GET" -Path "members?select=id,church_id&limit=20" -ApiKey $ANON_KEY -Jwt $JWT_MASTER
  $rows = Parse-JsonArraySafe -Text $r.body
  $masterGlobal = ($r.status -eq 200 -and $rows.Count -gt 0)
  $results.Add((New-Result -Name "master_global_members_access" -Passed $masterGlobal -Severity "critical" -Expectation "master possui acesso global a members" -Response $r))
} else {
  $results.Add([PSCustomObject]@{ test = "master_global_members_access"; passed = $false; severity = "warning"; expectation = "master possui acesso global a members"; status = 0; notes = "SKIPPED: JWT_MASTER ausente"; response_error = "" })
}

# 8) master can access saas_settings
if (-not [string]::IsNullOrWhiteSpace($JWT_MASTER)) {
  $r = Invoke-Supa -Method "GET" -Path "saas_settings?select=*&limit=1" -ApiKey $ANON_KEY -Jwt $JWT_MASTER
  $masterSaas = ($r.status -eq 200)
  $results.Add((New-Result -Name "master_access_saas_settings" -Passed $masterSaas -Severity "critical" -Expectation "master acessa saas_settings" -Response $r))
} else {
  $results.Add([PSCustomObject]@{ test = "master_access_saas_settings"; passed = $false; severity = "warning"; expectation = "master acessa saas_settings"; status = 0; notes = "SKIPPED: JWT_MASTER ausente"; response_error = "" })
}

$criticalFailures = ($results | Where-Object { $_.severity -eq "critical" -and -not $_.passed } | Measure-Object).Count
$warnings = ($results | Where-Object { $_.severity -eq "warning" } | Measure-Object).Count
$passed = ($results | Where-Object { $_.passed } | Measure-Object).Count
$total = ($results | Measure-Object).Count

$report = [PSCustomObject]@{
  generated_at = (Get-Date).ToString("o")
  supabase_url = $SUPABASE_URL
  summary = [PSCustomObject]@{
    total = $total
    passed = $passed
    critical_failures = $criticalFailures
    warnings = $warnings
  }
  tests = $results
}

$outDir = Split-Path -Parent $OutFile
if (-not [string]::IsNullOrWhiteSpace($outDir)) {
  New-Item -Path $outDir -ItemType Directory -Force | Out-Null
}

$report | ConvertTo-Json -Depth 20 | Set-Content -Path $OutFile -Encoding UTF8

Write-Host ""
Write-Host "RLS smoke test finalizado."
Write-Host "Relatório: $OutFile"
Write-Host "Total: $total | Passed: $passed | Critical failures: $criticalFailures | Warnings: $warnings"

if ($criticalFailures -gt 0) {
  exit 2
}
exit 0
