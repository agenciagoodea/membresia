# RLS API Smoke Test (PowerShell)

Use este roteiro para validar o comportamento real do RLS após a Fase 2.

## 1) Configuração

```powershell
$SUPABASE_URL = "https://wggjwoglmcmzulplcged.supabase.co"
$ANON_KEY = "COLE_AQUI_SUA_ANON_KEY"

# JWTs reais (sessões válidas)
$JWT_MEMBER = "COLE_AQUI_JWT_MEMBER_IGREJA_A"
$JWT_ADMIN  = "COLE_AQUI_JWT_ADMIN_IGREJA_A"
$JWT_MASTER = "COLE_AQUI_JWT_MASTER_ADMIN"

# IDs reais para validação tenant
$CHURCH_ID_A = "UUID_IGREJA_A"
$CHURCH_ID_B = "UUID_IGREJA_B"
$PAID_EVENT_PUBLISHED_ID = "UUID_EVENTO_PUBLICADO_DA_IGREJA_A"

function Invoke-Supa {
  param(
    [string]$Method,
    [string]$Path,
    [string]$ApiKey,
    [string]$Jwt = "",
    [string]$Body = ""
  )

  $headers = @{
    apikey = $ApiKey
    Authorization = "Bearer $ApiKey"
  }

  if ($Jwt -ne "") {
    $headers.Authorization = "Bearer $Jwt"
  }

  if ($Body -ne "") {
    return Invoke-RestMethod -Method $Method -Uri "$SUPABASE_URL/rest/v1/$Path" -Headers $headers -ContentType "application/json" -Body $Body
  }

  return Invoke-RestMethod -Method $Method -Uri "$SUPABASE_URL/rest/v1/$Path" -Headers $headers
}
```

## 2) Testes `anon` (acesso público)

### 2.1 `anon` não deve ler `members`
```powershell
Invoke-Supa "GET" "members?select=id&limit=1" $ANON_KEY
```
Esperado: bloqueio (erro) ou sem retorno de dados sensíveis.

### 2.2 `anon` pode ler `churches` ativas
```powershell
Invoke-Supa "GET" "churches?select=id,name,status&status=in.(ATIVO,ACTIVE)&limit=5" $ANON_KEY
```
Esperado: retorno apenas de igrejas ativas.

### 2.3 `anon` pode ler `paid_events` publicados
```powershell
Invoke-Supa "GET" "paid_events?select=id,title,status,church_id&status=eq.published&limit=5" $ANON_KEY
```
Esperado: retorna apenas `status=published`.

### 2.4 `anon` pode inserir `members` apenas como baixo privilégio
```powershell
$body = @{
  full_name = "Teste Publico Member"
  email = "teste.publico.member+" + [guid]::NewGuid().ToString("N").Substring(0,8) + "@example.com"
  role = "MEMBER_VISITOR"
  status = "PENDING"
  church_id = $CHURCH_ID_A
} | ConvertTo-Json

Invoke-Supa "POST" "members" $ANON_KEY "" $body
```
Esperado: insere somente com `role` baixa e `status` pendente.

### 2.5 `anon` pode inserir `prayers` com status pendente
```powershell
$body = @{
  name = "Pedido Publico"
  message = "Pedido de oração em teste RLS"
  church_id = $CHURCH_ID_A
  status = "PENDING"
} | ConvertTo-Json

Invoke-Supa "POST" "prayers" $ANON_KEY "" $body
```
Esperado: inserção permitida com `status` pendente.

### 2.6 `anon` pode registrar em evento publicado (mesma igreja)
```powershell
$body = @{
  event_id = $PAID_EVENT_PUBLISHED_ID
  church_id = $CHURCH_ID_A
  attendee_name = "Inscrição Pública"
  attendee_email = "inscricao.publica+" + [guid]::NewGuid().ToString("N").Substring(0,8) + "@example.com"
} | ConvertTo-Json

Invoke-Supa "POST" "paid_event_registrations" $ANON_KEY "" $body
```
Esperado: inserção permitida apenas se evento estiver publicado e `church_id` casar.

## 3) Testes `member` (igreja A)

### 3.1 `member` lê dados da própria igreja
```powershell
Invoke-Supa "GET" "members?select=id,church_id,role,status&church_id=eq.$CHURCH_ID_A&limit=5" $ANON_KEY $JWT_MEMBER
```
Esperado: retorno OK.

### 3.2 `member` não lê igreja B
```powershell
Invoke-Supa "GET" "members?select=id,church_id,role,status&church_id=eq.$CHURCH_ID_B&limit=5" $ANON_KEY $JWT_MEMBER
```
Esperado: lista vazia.

### 3.3 `member` não gerencia `financial_records`
```powershell
Invoke-Supa "GET" "financial_records?select=id,church_id,amount&limit=5" $ANON_KEY $JWT_MEMBER
```
Esperado: sem capacidade de gestão/admin fora do permitido.

## 4) Testes `admin/pastor` (igreja A)

### 4.1 `admin` lê `financial_records` da igreja A
```powershell
Invoke-Supa "GET" "financial_records?select=id,church_id,amount&church_id=eq.$CHURCH_ID_A&limit=5" $ANON_KEY $JWT_ADMIN
```
Esperado: retorno OK.

### 4.2 `admin` não lê `financial_records` da igreja B
```powershell
Invoke-Supa "GET" "financial_records?select=id,church_id,amount&church_id=eq.$CHURCH_ID_B&limit=5" $ANON_KEY $JWT_ADMIN
```
Esperado: lista vazia.

### 4.3 `admin` não acessa tabelas globais SaaS
```powershell
Invoke-Supa "GET" "saas_settings?select=*" $ANON_KEY $JWT_ADMIN
```
Esperado: bloqueado ou vazio.

## 5) Testes `master_admin`

### 5.1 `master` vê múltiplas igrejas em `members`
```powershell
Invoke-Supa "GET" "members?select=id,church_id,role&limit=20" $ANON_KEY $JWT_MASTER
```
Esperado: registros de múltiplos `church_id`.

### 5.2 `master` acessa `saas_settings`
```powershell
Invoke-Supa "GET" "saas_settings?select=*" $ANON_KEY $JWT_MASTER
```
Esperado: retorno OK.

## 6) Resultado (PASS/FAIL)

Marque como **FAIL crítico** se ocorrer qualquer um:
- `anon` lendo dados sensíveis (`members`, `financial_records`, etc.).
- `member` ou `admin` lendo outra igreja.
- `admin` acessando tabelas SaaS globais.
- `master_admin` sem acesso global.

Se quiser evidência objetiva, salve cada resposta em arquivo:

```powershell
Invoke-Supa "GET" "members?select=id,church_id&limit=5" $ANON_KEY $JWT_MEMBER | ConvertTo-Json -Depth 10 | Out-File .\tmp_member_members.json
```
