#!/bin/bash
cd /Users/andrewyoung/Harbor-App/harbor-app/subgraph

# Fix stETH-EUR address (add missing '9' at the end)
sed -i '' 's/0xf4f97218a00213a57a32e4606aaec99e1805a8/0xf4f97218a00213a57a32e4606aaec99e1805a89/g' src/*.ts

# Fix fxUSD-EUR address (add missing 'b' at the end)
sed -i '' 's/0xa9eb43ed6ba3b953a82741f3e226c1d6b029699/0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b/g' src/*.ts

echo "Addresses fixed"
grep "GENESIS_EUR" src/dailyMarksUpdate.ts
