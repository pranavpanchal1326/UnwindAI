#!/bin/bash
# scripts/fix/download_fonts.sh
# Downloads General Sans from Fontshare
# Run: bash scripts/fix/download_fonts.sh

mkdir -p public/fonts

echo "Checking General Sans fonts..."

if [ -f "public/fonts/GeneralSans-Regular.woff2" ]; then
  echo "✅ General Sans already downloaded"
  exit 0
fi

echo "Downloading General Sans from Fontshare..."

# Download each weight
curl -L "https://api.fontshare.com/v2/fonts/download/general-sans?variants=400,500,600" \
  -o /tmp/general-sans.zip 2>/dev/null

if [ $? -eq 0 ]; then
  unzip -q /tmp/general-sans.zip -d /tmp/general-sans/ 2>/dev/null
  # Copy woff2 files
  find /tmp/general-sans -name "*.woff2" -exec cp {} public/fonts/ \; 2>/dev/null
  echo "✅ General Sans downloaded to public/fonts/"
else
  echo "⚠️  Could not download General Sans"
  echo "   The app will use system-ui as fallback"
  echo "   Download manually from: https://www.fontshare.com/fonts/general-sans"
fi

rm -rf /tmp/general-sans.zip /tmp/general-sans
