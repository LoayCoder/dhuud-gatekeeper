$dirs = @(
    'src\features\admin\hooks',
    'src\features\assets\hooks',
    'src\features\contractors\hooks',
    'src\features\incidents\hooks',
    'src\features\investigation\hooks',
    'src\features\notifications\hooks',
    'src\features\ptw\hooks',
    'src\features\risk-assessment\hooks',
    'src\features\security\hooks',
    'src\features\users\hooks',
    'src\hooks'
)

foreach ($dir in $dirs) {
    $fullDir = Join-Path $PSScriptRoot $dir
    if (Test-Path $fullDir) {
        Get-ChildItem -Path $fullDir -Include '*.ts','*.tsx' -Recurse -File | ForEach-Object {
            $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
            if ($lines -gt 300) {
                $rel = $_.FullName.Replace($PSScriptRoot + '\', '')
                Write-Output "$rel : $lines lines"
            }
        }
    }
}
