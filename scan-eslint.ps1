Get-ChildItem -Path src -Recurse -Include '*.ts', '*.tsx' | ForEach-Object {
    $file = $_.FullName
    $lines = Select-String -Path $file -Pattern 'eslint-disable'
    foreach ($line in $lines) {
        $rel = $file.Replace((Get-Location).Path + '\', '')
        Write-Output ($rel + ':' + $line.LineNumber + ':' + $line.Line.Trim())
    }
} | Sort-Object
