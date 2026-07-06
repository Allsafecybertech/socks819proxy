#!/usr/bin/env bash
# scripts/start-vnc.sh
#
# Run this once when your server boots (e.g. via systemd or pm2) so that
# any headed Playwright browser launched by runFetch.ts renders into a
# virtual display that's viewable/controllable from the admin dashboard.
#
# Requires: xvfb, x11vnc, novnc (websockify) installed on the host.
#   Debian/Ubuntu: apt-get install -y xvfb x11vnc novnc websockify

set -e

DISPLAY_NUM=99
VNC_PORT=5900
NOVNC_PORT=6080

export DISPLAY=":${DISPLAY_NUM}"

echo "Starting Xvfb on display :${DISPLAY_NUM}..."
Xvfb :${DISPLAY_NUM} -screen 0 1280x800x24 &
sleep 1

echo "Starting x11vnc on port ${VNC_PORT}..."
x11vnc -display :${DISPLAY_NUM} -forever -shared -rfbport ${VNC_PORT} -nopw &
sleep 1

echo "Starting noVNC websocket proxy on port ${NOVNC_PORT}..."
websockify --web=/usr/share/novnc/ ${NOVNC_PORT} localhost:${VNC_PORT} &

echo "Admin viewer URL: http://<your-server>:${NOVNC_PORT}/vnc.html?autoconnect=true"
echo "Set NOVNC_URL env var to that address in your app's .env"

wait
