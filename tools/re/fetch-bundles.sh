#!/usr/bin/env bash
# Download the public (logged-out) duolingo.com web bundles into tools/re/work/app
# so REA can analyze them. Nothing here is committed (see .gitignore).
set -euo pipefail
WORK="$(cd "$(dirname "$0")" && pwd)/work"
APP="$WORK/app/js"
mkdir -p "$APP"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36"
CDN="https://d35aaqx5ub95lt.cloudfront.net/js"

curl -sL --compressed -A "$UA" https://www.duolingo.com/ -o "$WORK/index.html"

# entry chunks referenced by the HTML shell
grep -oE "$CDN/[^\"]+\.js" "$WORK/index.html" | grep -v '/strings/' | while read -r url; do
  curl -sL --compressed "$url" -o "$APP/$(basename "$url")"
done

# lazy chunks: the webpack runtime (manifest-*.js) maps chunk id → name + hash
MANIFEST=$(ls "$APP"/manifest-*.js)
node - "$MANIFEST" > "$WORK/chunks.txt" <<'JS'
const src = require('fs').readFileSync(process.argv[2], 'utf8');
const m = src.match(/t\.u=e=>"js\/"\+\((\{[^}]*\})\[e\]\|\|e\)\+"-"\+(\{[^}]*\})/);
const toObj = (s) => Function(`return ${s}`)();
const names = toObj(m[1]);
const hashes = toObj(m[2]);
for (const [id, h] of Object.entries(hashes)) console.log(`${names[id] ?? id}-${h}`);
JS
xargs -P 16 -I{} curl -sL --compressed -o "$APP/{}.js" "$CDN/{}.js" < "$WORK/chunks.txt"
# drop CloudFront error bodies
grep -l "<Error>" "$APP"/*.js 2>/dev/null | xargs rm -f || true
echo '{"name":"duolingo-web","version":"0.0.0"}' > "$WORK/app/package.json"
echo "fetched $(ls "$APP" | wc -l | tr -d ' ') chunks into $APP"
