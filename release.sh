#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh <version>  (e.g. ./release.sh 1.2.3)"
  exit 1
fi

npm version "$VERSION" --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"
git tag "v$VERSION"
git push origin main "v$VERSION"
