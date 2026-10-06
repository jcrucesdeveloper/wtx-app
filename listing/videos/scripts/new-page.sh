#!/bin/sh
# usage: scripts/new-page.sh <slug> [date]  → es + en pages for compositions/src/<slug>.js
slug=$1; date=${2:-2026-10-06}
cd "$(dirname "$0")/../compositions" || exit 1
for lang in es en; do
cat > daily-$date-$lang-$slug.html <<HTML
<!doctype html>
<html lang="$lang">
  <head>
    <meta charset="utf-8" />
    <title>WTX — $slug ($lang)</title>
    <!-- The composition is src/$slug.js; this page only picks the language. -->
    <link rel="stylesheet" href="../lib/motion.css" />
    <link rel="stylesheet" href="../lib/art.css" />
    <link rel="stylesheet" href="../lib/toon.css" />
  </head>
  <body>
    <div id="stage"></div>
    <script src="../node_modules/gsap/dist/gsap.min.js"></script>
    <script type="module">
      import run from './src/$slug.js'

      run('$lang')
    </script>
  </body>
</html>
HTML
done
