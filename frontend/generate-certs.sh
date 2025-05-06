#!/bin/bash
set -e

CERT_DIR="/etc/nginx/certs"
mkdir -p $CERT_DIR

if [ ! -f "$CERT_DIR/server.key" ] || [ ! -f "$CERT_DIR/server.crt" ]; then
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout $CERT_DIR/server.key \
        -out $CERT_DIR/server.crt \
        -subj "/CN=localhost"
    echo "自签名证书已生成"
else
    echo "证书已存在，跳过生成"
fi 