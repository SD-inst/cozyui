#!/bin/sh -e

cd "$(dirname "$0")/.."
yarn && yarn lint && yarn build