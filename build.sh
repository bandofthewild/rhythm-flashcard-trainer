#!/usr/bin/env bash
# Rhythm Flashcard Trainer - build + verify
# Concatenates the three sources into the single deployable index.html, then verifies.
set -e
cd "$(dirname "$0")"

echo "==> building index.html from src/"
cat src/shell_top.html src/engine.js src/shell_bottom.html > index.html
echo "    $(wc -c < index.html) bytes, $(wc -l < index.html) lines"

echo "==> syntax check (inline script)"
python3 - <<'PY'
s = open('index.html', encoding='utf-8').read()
start = s.rindex('<script>\n(function(){')
end   = s.rindex('</script>')
open('test/_inline.js', 'w', encoding='utf-8').write(s[start + len('<script>\n'):end])
PY
cat test/dom-stubs.js test/_inline.js > test/_wrapped.js
node --check test/_wrapped.js && echo "    syntax OK"

echo "==> rhythm generation suite"
node test/generation.test.js

echo "==> DSP suite (tempo / phase / bar-phase)"
node test/dsp.test.js

rm -f test/_inline.js test/_wrapped.js
echo "==> BUILD OK"
