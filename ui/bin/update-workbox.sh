#!/usr/bin/env sh

set -e

export WORKBOX_DIR=public/3rdparty/workbox

rm -rf ${WORKBOX_DIR}
mkdir -p ${WORKBOX_DIR}

cp node_modules/workbox-sw/build/workbox-sw.js ${WORKBOX_DIR}
cp node_modules/workbox-core/build/workbox-core.prod.js ${WORKBOX_DIR}
cp node_modules/workbox-strategies/build/workbox-strategies.prod.js ${WORKBOX_DIR}
cp node_modules/workbox-routing/build/workbox-routing.prod.js ${WORKBOX_DIR}
cp node_modules/workbox-navigation-preload/build/workbox-navigation-preload.prod.js ${WORKBOX_DIR}
cp node_modules/workbox-precaching/build/workbox-precaching.prod.js ${WORKBOX_DIR}
