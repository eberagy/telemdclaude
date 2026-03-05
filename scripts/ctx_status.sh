#!/usr/bin/env bash
# ctx_status.sh — Rough Claude context window estimator
# Add to your shell prompt or run manually
# Claude Sonnet 4.6 has a ~200K token context window

# Approximate: 1 token ≈ 4 chars. This measures your current conversation
# by looking at recent Claude Code session logs if available.

SESSION_LOG="${TMPDIR}claude-$(id -u)"
if [ -d "$SESSION_LOG" ]; then
  TOTAL_CHARS=$(find "$SESSION_LOG" -name "*.output" -newer /tmp/.ctx_baseline 2>/dev/null | xargs wc -c 2>/dev/null | tail -1 | awk '{print $1}')
  TOKENS=$((${TOTAL_CHARS:-0} / 4))
  MAX=200000
  PCT=$(( TOKENS * 100 / MAX ))
  if [ $PCT -lt 50 ]; then COLOR="\033[32m"    # green
  elif [ $PCT -lt 75 ]; then COLOR="\033[33m"  # yellow
  else COLOR="\033[31m"; fi                    # red
  echo -e "${COLOR}CTX: ~${PCT}% (${TOKENS}/${MAX} tokens)\033[0m"
else
  echo "CTX: session log not found"
fi
