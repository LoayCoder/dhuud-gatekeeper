Write-Output "1. total error count:"
$content = Get-Content tsc.log
$errors = $content | Select-String "error TS"
$errors.Count

Write-Output ""
Write-Output "2. top 20 files with most errors:"
$errors | ForEach-Object {
    if ($_.Line -match '^(.*?)\(') {
        $matches[1]
    }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 20 | ForEach-Object {
    "      $($_.Count) $($_.Name)"
}

Write-Output ""
Write-Output "3. last 5 commits:"
git --no-pager log --oneline -5 | Out-String -Stream

Write-Output ""
Write-Output "4. git stash list:"
git --no-pager stash list | Out-String -Stream
