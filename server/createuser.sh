#!/bin/bash

USERNAME="$1"
PASSWORD="$2"
SHARE_DIR="$3"

echo username $USERNAME
echo pwd $PASSWORD
echo sharedir $SHARE_DIR

groupadd -f siteusers

useradd -g siteusers -M "$USERNAME"

echo "$USERNAME:$PASSWORD" | chpasswd

(echo "$PASSWORD"; echo "$PASSWORD") | smbpasswd -s -a "$USERNAME"

mkdir -p "$SHARE_DIR"

chown $USERNAME "$SHARE_DIR"
chmod 770 "$SHARE_DIR"
