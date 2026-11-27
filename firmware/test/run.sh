#!/usr/bin/env bash
# 펌웨어 상태머신이 기준 구현(simulate.py)과 같은 결과를 내는지 PC 에서 확인한다.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${TMPDIR:-/tmp}/ig_check_logic"
g++ -std=c++17 -Wall -Wextra -I../iceguard check_logic.cpp -o "$OUT"
g++ -std=c++17 -Wall -Wextra -I../iceguard check_parse.cpp -o "${OUT}_parse"
g++ -std=c++17 -Wall -Wextra -I../iceguard check_safety.cpp -o "${OUT}_safety"
"${OUT}_safety"
"${OUT}_parse"
for seed in 1 2 3; do
  python3 gen_cases.py demo "$seed" 20000 | "$OUT" demo
  python3 gen_cases.py real "$seed" 60000 | "$OUT" real
done
echo "모두 일치"
