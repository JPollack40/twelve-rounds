#!/usr/bin/env bash
# Builds from src/:
#   dist/twelve-rounds-beta.html   hosted claude.ai page (no document skeleton; Three.js from cdnjs)
#   Twelve-Rounds-offline.html     single offline file (Three.js inlined)
#   docs/index.html + sw.js + manifest  PWA served by GitHub Pages (Three.js inlined)
# dist/twelve-rounds.html is the frozen alpha build and is not touched.
set -euo pipefail
cd "$(dirname "$0")"
VER=$(date -u +%Y%m%d%H%M)
mkdir -p dist docs
# embedded models: assets/models/<name>.glb listed here are base64-inlined into every build as R3M_DATA
MODELS=(duncan boxer boxer_f)
MJS="const R3M_DATA={"
for m in "${MODELS[@]}"; do MJS+="$m:\"$(base64 -w0 "assets/models/$m.glb")\","; done
MJS+="};"
JS="$MJS
$(cat src/js/*.js)"
THREE_CDN='<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js"></script>'
{
  cat src/head.html
  echo "$THREE_CDN"
  echo '<div id="app"></div>'
  echo '<script>'
  echo "$JS"
  echo '</script>'
} > dist/twelve-rounds-beta.html
page(){ # $1 = extra head, $2 = extra script prefix
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
  echo '<meta name="theme-color" content="#0d0f1d"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
  echo "$1"
  cat src/head.html
  echo '</head><body>'
  echo '<div id="app"></div>'
  echo '<script>'
  cat src/vendor/three.min.js
  echo
  echo '</script><script>'
  echo "$2"
  echo "$JS"
  echo '</script></body></html>'
}
page "" "" > Twelve-Rounds-offline.html
page '<link rel="manifest" href="./manifest.json"><link rel="icon" href="./icon-192.png"><link rel="apple-touch-icon" href="./icon-192.png">' "const PWA_BUILD='$VER';" > docs/index.html
cat > docs/manifest.json <<EOM
{"name":"Twelve Rounds","short_name":"12 Rounds","start_url":"./index.html","scope":"./","display":"fullscreen","orientation":"any","background_color":"#0d0f1d","theme_color":"#0d0f1d",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}
EOM
cat > docs/sw.js <<EOM
const V='tr-$VER';const FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin){return}
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
EOM
echo "build $VER"; wc -c dist/twelve-rounds-beta.html Twelve-Rounds-offline.html docs/index.html | tail -1
