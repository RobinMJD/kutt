#!/bin/sh
set -eu
image=${1:?candidate image required}
name="kutt-redis-test-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
docker run -d --name "$name" --network none --read-only --tmpfs /data --cap-drop ALL \
  --user 999:999 --security-opt no-new-privileges:true redis:8-alpine \
  redis-server --save '' --appendonly no --bind 127.0.0.1 >/dev/null
attempt=0
until docker exec "$name" redis-cli ping | grep -q PONG; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || exit 1
  sleep 1
done
docker run --rm --init --network "container:$name" --read-only --tmpfs /tmp:mode=1777 \
  --cap-drop ALL --security-opt no-new-privileges:true -e KUTT_REDIS_TEST=isolated \
  --entrypoint node "$image" tests/redis-smoke.cjs
