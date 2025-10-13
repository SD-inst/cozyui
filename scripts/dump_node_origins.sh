#!/bin/sh
for i in `find -maxdepth 1 -type d`; do (cd "$i" && git config -l | sed -n 's#remote.origin.url=\(.*\)#'$i' => \1#p'); done