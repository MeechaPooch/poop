#!/bin/bash

USERNAME="$1"
PASSWORD="$2"
SHARE_DIR="$3"

groupadd -f siteusers

useradd -g siteusers "$USERNAME"

echo "$USERNAME:$PASSWORD" | chpasswd

(echo "$PASSWORD"; echo "$PASSWORD") | smbpasswd -s -a "$USERNAME"

mkdir -p "$SHARE_DIR"

chown $USERNAME "$SHARE_DIR"
chmod 600 "$SHARE_DIR"
