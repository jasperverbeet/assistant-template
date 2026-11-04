#!/usr/bin/env bash
# Controls the assistant. Everything runs in one tmux session, so `stop` ends
# every process that `start` began. Nothing starts by itself.
#
#   start           Start the inbox server and the supervised Claude session.
#   stop            End the tmux session and every process in it.
#   status          Print the status of the services and the inbox.
#   attach          Attach to the tmux session.
#   restart-claude  End the supervised Claude process. Its loop updates Claude
#                   Code and resumes the same conversation. The id of that
#                   conversation is `claudeSessionId` in inbox/state.json.
#   restart-server  Restart the inbox server, for example after a code change.
#   restart-broker  Restart the Dia broker. Dia then asks for a new approval.
#   audio-start     Record the microphone in the window "audio", in 10-minute
#                   Opus parts in inbox/audio/<session-id>/.
#   audio-stop      Stop the recorder cleanly, then transcribe the parts and
#                   write the report in the background (pnpm audio:process).
#   serve,          Internal. The loops that run in the tmux panes. The
#   dia-broker,     window "services" holds serve, dia-broker, dia-allow, and
#   dia-allow,      tunnel. The window "audio" holds the recorder loop.
#   tunnel, claude,
#   audio
set -uo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
session='assistant'
self="${repo}/scripts/assistant.sh"
port="$(grep -E '^INBOX_PORT=' "${repo}/.env" 2>/dev/null | cut -d= -f2)"
port="${port:-4319}"
fast_exit_seconds=30
# The named Cloudflare tunnel that the pane "tunnel" runs. Leave it empty to
# run no tunnel. ~/.cloudflared/config.yml maps each hostname to a port.
tunnel_name="$(grep -E '^CLOUDFLARE_TUNNEL=' "${repo}/.env" 2>/dev/null | cut -d= -f2)"
# The dev-server windows. One entry per project: "<window> <path> <port>".
# `start` opens one tmux window for each entry. Example:
#   projects=("myapp ${HOME}/Projects/myapp 3000")
projects=()
health_timeout_seconds=10

cd "${repo}"

# Ctrl-C in a loop window ends the process in it, not the loop. Child processes
# do not inherit the handler, so they still stop. `stop` ends everything.
case "${1:-}" in
  serve | dia-broker | claude) trap ':' INT ;;
esac

# Opens a tmux window for a project with the dev server in its folder. Next.js
# and most dev servers read PORT, so the repo default stays. To add a pane,
# for example a background worker, add a `tmux split-window` here.
start_project() {
  local name="$1" dir="$2" port="$3"
  tmux new-window -d -t "${session}:" -n "${name}" -c "${dir}" \
    "PORT=${port} zsh -ic 'pnpm dev'"
  tmux set-option -w -t "${session}:${name}" remain-on-exit on
}

# Prints the session id of the running recorder, or nothing.
audio_session() {
  tmux list-windows -t "${session}" -F '#{window_name} #{pane_start_command}' \
    2>/dev/null | awk '$1 == "audio" { gsub(/"/, "", $NF); print $NF }'
}

# Puts the windows in the order services, claude, then the projects, and
# selects claude.
order_windows() {
  local index=10 name entry
  local names=(services claude)
  for entry in "${projects[@]}"; do
    names+=("${entry%% *}")
  done
  for name in "${names[@]}"; do
    tmux move-window -s "${session}:${name}" -t "${session}:${index}" 2>/dev/null
    index=$((index + 1))
  done
  tmux move-window -r -t "${session}"
  tmux select-window -t "${session}:claude"
}

# Prints the index of the pane in the window "services" that runs a loop
# command, for example `serve`.
services_pane() {
  tmux list-panes -t "${session}:services" \
    -F '#{pane_index} #{pane_start_command}' |
    awk -v mode="$1" '$NF == mode || $NF == mode "\"" { print $1 }'
}

wait_after_fast_exit() {
  if (($(date +%s) - $1 < fast_exit_seconds)); then
    echo "$2 stopped within ${fast_exit_seconds} seconds. Waiting 60 seconds."
    sleep 60
  fi
}

case "${1:-}" in
  start)
    if tmux has-session -t "${session}" 2>/dev/null; then
      echo "Already running. Attach with: pnpm assistant attach"
      exit 0
    fi

    tmux new-session -d -s "${session}" -n services "${self} serve"
    tmux set-option -t "${session}" mouse on
    tmux split-window -t "${session}:services" "${self} dia-broker"
    tmux split-window -t "${session}:services" "${self} dia-allow"
    if [[ -n "${tunnel_name}" ]]; then
      tmux split-window -t "${session}:services" "${self} tunnel"
    fi
    tmux select-layout -t "${session}:services" even-vertical
    tmux new-window -t "${session}" -n claude "${self} claude"
    for entry in "${projects[@]}"; do
      read -r name dir project_port <<<"${entry}"
      start_project "${name}" "${dir}" "${project_port}"
    done
    order_windows
    echo "Started. Attach with: pnpm assistant attach"
    ;;

  stop)
    tmux kill-session -t "${session}" 2>/dev/null && echo 'Stopped.' ||
      echo 'Not running.'
    ;;

  attach)
    tmux select-window -t "${session}:claude"
    exec tmux attach -t "${session}"
    ;;

  status)
    if tmux has-session -t "${session}" 2>/dev/null; then
      echo "- Assistant: running in tmux session \"${session}\""
    else
      echo '- Assistant: stopped. Start it with: pnpm assistant start'
    fi

    if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "- Inbox server: listening on 127.0.0.1:${port}"
    else
      echo '- Inbox server: not listening'
    fi

    # perl gives the check a time limit. macOS has no `timeout` command. It
    # stops the whole process group, so bun stops together with pnpm.
    perl -e '$SIG{ALRM} = sub { kill "TERM", -$$ }; alarm shift; setpgrp;
      exit(system(@ARGV) >> 8)' "${health_timeout_seconds}" \
      pnpm -s dia:health 2>/dev/null ||
      echo "- Dia broker: no answer within ${health_timeout_seconds} seconds. Is the dia-broker pane running?"

    total_lines=0
    if [[ -f inbox/inbox.jsonl ]]; then
      total_lines="$(wc -l <inbox/inbox.jsonl | tr -d ' ')"
    fi

    watcher_line=0
    last_poll='never'
    if [[ -f inbox/state.json ]]; then
      watcher_line="$(jq -r '.watcherLine // 0' inbox/state.json)"
      last_poll="$(jq -r '.githubLastPolledAt // "never"' inbox/state.json)"
    fi

    not_triaged=0
    if ((total_lines > watcher_line)); then
      not_triaged="$(tail -n "+$((watcher_line + 1))" inbox/inbox.jsonl |
        grep -vc -e '"channel":"assistant"' -e '"via":"chat"' || true)"
    fi

    echo "- Inbox: ${total_lines} entries, ${not_triaged} not triaged"
    echo "- Last GitHub poll: ${last_poll}"
    if [[ -f inbox/state.json ]]; then
      jq -r '.gmailHistoryIds // {} | to_entries[] | "- Gmail poll: \(.key) at history \(.value)"' inbox/state.json
    fi

    recording="$(audio_session)"
    if [[ -n "${recording}" ]]; then
      parts="$(find "inbox/audio/${recording}" -name '*.opus' | wc -l | tr -d ' ')"
      echo "- Recorder: recording since ${recording}, ${parts} parts. Stop with: pnpm audio:stop"
    fi
    if [[ -f memory/open-items.md ]]; then
      echo "- Open items: $(grep -c '^- \*\*' memory/open-items.md) in memory/open-items.md"
    fi

    if [[ ! -f .env ]]; then
      echo '- Action needed: copy .env.example to .env and set INBOX_TOKEN'
    fi

    if [[ ! -f apps/extension/dist/manifest.json ]]; then
      echo '- Action needed: build the extension with: pnpm build'
    fi
    ;;

  restart-claude)
    if [[ "${ASSISTANT_SUPERVISED:-}" != '1' ]]; then
      echo 'Not in the supervised Claude session. Nothing to restart.' >&2
      exit 1
    fi

    pid=$$
    while [[ "${pid}" -gt 1 ]]; do
      pid="$(ps -o ppid= -p "${pid}" | tr -d ' ')"

      if [[ "$(ps -o comm= -p "${pid}")" == *claude* ]]; then
        echo "Restarting Claude (pid ${pid}) in 2 seconds."
        (sleep 2 && kill -TERM "${pid}") >/dev/null 2>&1 &
        exit 0
      fi
    done

    echo 'No Claude process found above this shell.' >&2
    exit 1
    ;;

  restart-server)
    pane="$(services_pane serve)"
    tmux respawn-pane -k -t "${session}:services.${pane:?No inbox server pane}" &&
      echo 'Inbox server restarted.'
    ;;

  restart-broker)
    pane="$(services_pane dia-broker)"
    tmux respawn-pane -k -t "${session}:services.${pane:?No Dia broker pane}" &&
      echo 'Dia broker restarted. Dia asks for approval of its new connection.'
    ;;

  audio-start)
    if ! tmux has-session -t "${session}" 2>/dev/null; then
      echo 'The assistant is not running. Start it with: pnpm assistant start' >&2
      exit 1
    fi

    if [[ -n "$(audio_session)" ]]; then
      echo "Already recording: $(audio_session). Stop with: pnpm audio:stop" >&2
      exit 1
    fi

    id="$(date +%Y-%m-%d_%H-%M-%S)"
    mkdir -p "inbox/audio/${id}"
    tmux new-window -d -t "${session}:" -n audio "${self} audio ${id}"
    echo "Recording to inbox/audio/${id}. Stop with: pnpm audio:stop"
    ;;

  audio-stop)
    id="$(audio_session)"
    if [[ -z "${id}" ]]; then
      echo 'Not recording.' >&2
      exit 1
    fi

    dir="inbox/audio/${id}"
    touch "${dir}/.stop"
    # ffmpeg 7.1 with avfoundation ignores SIGINT and SIGTERM until its -t
    # limit. So stop kills it. The part stays valid, because ffmpeg writes
    # each packet and an Ogg page each second. The loop then sees .stop and
    # ends, and tmux closes the window.
    pkill -KILL -f "ffmpeg.*${dir}/" || true
    for _ in {1..20}; do
      [[ -z "$(audio_session)" ]] && break
      sleep 0.5
    done
    tmux kill-window -t "${session}:audio" 2>/dev/null
    rm -f "${dir}/.stop"

    nohup pnpm -s audio:process "${id}" >"${dir}/process.log" 2>&1 &
    echo "Stopped. Processing ${id} in the background. Log: ${dir}/process.log"
    echo 'The inbox gets an entry when the report is ready.'
    ;;

  audio)
    # Records the microphone in 10-minute Opus parts. Each part is named after
    # its local start time. AUDIO_INPUT_DEVICE in .env selects the input by
    # name, because the avfoundation index changes. Each part is a new ffmpeg
    # run, so about 1 second is lost between two parts.
    dir="inbox/audio/${2:?No session id}"
    device="$(grep -E '^AUDIO_INPUT_DEVICE=' .env 2>/dev/null | cut -d= -f2-)"
    device="${device:-MacBook Pro Microphone}"
    mkdir -p "${dir}"

    while [[ ! -e "${dir}/.stop" ]]; do
      started_at="$(date +%s)"
      ffmpeg -hide_banner -nostdin -loglevel warning \
        -t 600 -f avfoundation -i ":${device}" \
        -ac 1 -ar 16000 -c:a libopus -b:a 24k -application voip \
        -flush_packets 1 -page_duration 1000000 \
        "${dir}/$(date +%Y-%m-%d_%H-%M-%S).opus"
      [[ -e "${dir}/.stop" ]] && break
      wait_after_fast_exit "${started_at}" 'The recorder'
    done
    ;;

  serve)
    while true; do
      started_at="$(date +%s)"
      scripts/with-secrets.sh bun apps/inbox-server/src/index.ts
      wait_after_fast_exit "${started_at}" 'The inbox server'
    done
    ;;

  dia-broker)
    # Holds one approved CDP connection to Dia and shares it with every tool.
    # Its port and token are in inbox/dia-broker.json.
    while true; do
      started_at="$(date +%s)"
      bun apps/dia/src/index.ts
      wait_after_fast_exit "${started_at}" 'The Dia broker'
    done
    ;;

  dia-allow)
    # Clicks Allow in the Dia dialog "Allow debugging connection?". It
    # approves every local app that connects to Dia. The owner accepts this
    # risk. Logs one line for each click.
    while true; do
      result="$(osascript scripts/dia-allow-debugging.applescript 2>&1)"
      if [[ "${result}" != 'no dialog' ]]; then
        echo "$(date '+%F %T') ${result}"
      fi
      sleep 1
    done
    ;;

  tunnel)
    while true; do
      started_at="$(date +%s)"
      cloudflared tunnel run "${tunnel_name}"
      wait_after_fast_exit "${started_at}" 'The Cloudflare tunnel'
    done
    ;;

  claude)
    export ASSISTANT_SUPERVISED=1
    transcripts="${HOME}/.claude/projects/$(echo "${repo}" | tr '/.' '--')"

    while true; do
      claude update >/dev/null 2>&1

      session_id="$(jq -r '.claudeSessionId // empty' inbox/state.json 2>/dev/null)"
      session_flag=(--resume "${session_id}")

      if [[ -z "${session_id}" || ! -f "${transcripts}/${session_id}.jsonl" ]]; then
        session_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
        session_flag=(--session-id "${session_id}")
        state="$(cat inbox/state.json 2>/dev/null || echo '{}')"
        jq --arg id "${session_id}" '.claudeSessionId = $id' <<<"${state}" \
          >inbox/state.json.tmp && mv inbox/state.json.tmp inbox/state.json
      fi

      started_at="$(date +%s)"
      scripts/with-secrets.sh claude "${session_flag[@]}" \
        --dangerously-skip-permissions \
        --remote-control "${session}" \
        '/watch'
      wait_after_fast_exit "${started_at}" 'Claude'
    done
    ;;

  *)
    awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"
    exit 1
    ;;
esac
