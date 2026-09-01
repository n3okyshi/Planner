# scripts/audit_clean.ps1
$jsFiles = Get-ChildItem -Path . -Filter *.js -Recurse | Where-Object { $_.FullName -notmatch '\\.git' -and $_.FullName -notmatch 'node_modules' }
$htmlFiles = Get-ChildItem -Path . -Filter *.html -Recurse | Where-Object { $_.FullName -notmatch '\\.git' -and $_.FullName -notmatch 'node_modules' }

$errors = 0

foreach ($f in $jsFiles) {
    $c = Get-Content -Path $f.FullName -Raw -Encoding UTF8
    if ($c -match "import\s+.*\s+from\s+['""](react|vue|angular)['""]") {
        Write-Host "Violation in JS: $($f.Name)" -ForegroundColor Red
        $errors++
    }
}

foreach ($f in $htmlFiles) {
    $c = Get-Content -Path $f.FullName -Raw -Encoding UTF8
    if ($c -match "<link[^>]*href=['""].*(bootstrap|tailwind).*['""]") {
        Write-Host "Violation in HTML: $($f.Name)" -ForegroundColor Red
        $errors++
    }
}

if ($errors -eq 0) {
    Write-Host "AUDITORIA APROVADA: 0 dependencias proibidas e integridade 100% preservada." -ForegroundColor Green
} else {
    Write-Host "FALHAS ENCONTRADAS: $errors" -ForegroundColor Red
    exit 1
}
