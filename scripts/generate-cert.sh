#!/bin/sh
# Génère un certificat HTTPS auto-signé (key.pem + cert.pem) à la racine du projet.
# Usage : npm run cert
cd "$(dirname "$0")/.." || exit 1

if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL est introuvable. Installez-le (Linux : sudo apt install openssl, Windows : utilisez Git Bash)." >&2
    exit 1
fi

openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
    -keyout key.pem -out cert.pem \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null

echo "Certificat créé : key.pem et cert.pem (valables 365 jours, auto-signés)."
