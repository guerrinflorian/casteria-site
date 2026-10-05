#!/usr/bin/env bash
# Des photos des pages entières (pour relire le site sans l'ouvrir). Le serveur doit tourner (npm run dev).
# Usage : bash outils/capturer.sh [port] [chrome]   -> captures/*.png (ce dossier n'est jamais dans git)
# La page entière : une copie de la page avec la classe « photo » (tout est visible, l'en-tête a une hauteur fixe).
P="${1:-3000}"; C="${2:-C:/Program Files/Google/Chrome/Application/chrome.exe}"
ICI="$(cd "$(dirname "$0")/.." && pwd)"; mkdir -p "$ICI/captures"
entiere() { # nom, page, largeur,hauteur
  sed -e 's|<html lang="fr">|<html lang="fr" class="photo">|' -e 's|<head>|<head><base href="/">|' "$ICI/$2" > "$ICI/captures/copie_$2"
  "$C" --headless=new --disable-gpu --hide-scrollbars --window-size="$3" --virtual-time-budget=5000 --screenshot="$ICI/captures/$1.png" "http://localhost:$P/captures/copie_$2" > /dev/null 2>&1
}
ecran() { "$C" --headless=new --disable-gpu --hide-scrollbars --window-size="$3" --virtual-time-budget=5000 --screenshot="$ICI/captures/$1.png" "http://localhost:$P/$2" > /dev/null 2>&1; }
ecran accueil_ecran index.html 1440,900
ecran accueil_portable index.html 1366,768
entiere accueil index.html 1440,8300
entiere accueil_telephone index.html 520,9000
entiere commencer commencer.html 1440,3700
entiere pirates pirates.html 1440,4200
entiere boutique boutique.html 1440,2100
ls "$ICI/captures"
