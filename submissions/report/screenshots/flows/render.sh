#!/bin/sh
# Renders the flow strips and overview to PNG with headless Chrome. Run from this folder after build.py.
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
r() { "$CH" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=2 --window-size="$2" --screenshot="$PWD/$1.png" "file://$PWD/$1.html"; }
r flow-s1 1562,880
r flow-s2 1562,836
r flow-s3 1562,836
r overview 1664,476
