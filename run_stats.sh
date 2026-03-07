echo "1. npx tsc --noEmit 2>&1 | grep 'error TS' | wc -l"
cat tsc.log | grep "error TS" | wc -l

echo ""
echo "2. npx tsc --noEmit 2>&1 | grep 'error TS' | sed 's/(.*//' | sort | uniq -c | sort -rn | head -20"
cat tsc.log | grep "error TS" | sed 's/(.*//' | sort | uniq -c | sort -rn | head -20

echo ""
echo "3. git log --oneline -5"
git log --oneline -5

echo ""
echo "4. git stash list"
git stash list
