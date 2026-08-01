#!/usr/bin/env bash
# Rhythm Flashcard Trainer - build + verify.  Requires Node.js only.
set -e
cd "$(dirname "$0")"
echo "==> building index.html from src/"
cat src/shell_top.html src/engine.js src/shell_bottom.html > index.html
echo "    $(wc -c < index.html) bytes"
echo "==> syntax check";            node test/syntax-check.js
echo "==> rhythm generation suite"; node test/generation.test.js
echo "==> DSP suite";               node test/dsp.test.js
echo "==> BUILD OK"
