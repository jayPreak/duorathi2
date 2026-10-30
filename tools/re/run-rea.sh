#!/usr/bin/env bash
# Static analysis of the fetched bundles with REA (https://github.com/morluto/rea).
# Needs Node >= 22.23.4 / 24.22.1. The full bundle set exceeds REA's default
# per-source budget, so we analyze the chunks that hold the learning loop.
set -euo pipefail
WORK="$(cd "$(dirname "$0")" && pwd)/work"
cd "$WORK/app"
pick() { ls js | grep -E "^$1-[0-9a-f]{8}\.js$" | head -1; }
SOURCES=()
for name in path pathSections session homePage debug0 179 8876 1469; do
  f=$(pick "$name") && [ -n "$f" ] && SOURCES+=(--source-path "js/$f")
done
npx -y rea-agents@latest analyze-javascript-application "$WORK/app" "${SOURCES[@]}" \
  --analysis-timeout-ms 1200000 --json > "$WORK/evidence.json"
echo '{"source":{"kind":"evidence-file","path":"evidence.json"},"view":{"kind":"summary"}}' > "$WORK/summary-view.json"
(cd "$WORK" && npx -y rea-agents@latest inspect-analysis-view summary-view.json --json > summary.json)
# feature trace example: everything reachable from the "legendary" string
(cd "$WORK" && node --max-old-space-size=8192 --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const application = JSON.parse(readFileSync("evidence.json", "utf8"));
writeFileSync("trace-legendary.json", JSON.stringify({ application, seed: { kind: "string", value: "legendary" }, direction: "both" }));' \
 && NODE_OPTIONS=--max-old-space-size=8192 npx -y rea-agents@latest trace-application-feature ./trace-legendary.json --json > trace-legendary.out)
echo "evidence: $WORK/evidence.json  summary: $WORK/summary.json  trace: $WORK/trace-legendary.out"
