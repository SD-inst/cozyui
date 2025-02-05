#!/bin/sh -e

cd "$(dirname "$0")/.."
yarn && yarn build --mode sfw