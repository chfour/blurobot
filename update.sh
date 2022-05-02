#!/bin/bash
cd `dirname $0`

BRANCH="release"
REMOTE="origin"

echo "switching branch to $BRANCH"
git switch "$BRANCH"
echo 'updating remotes...'
git remote update
echo 'checking for changes...'
diffcount=`git diff "$REMOTE/$(git branch --show-current)" --numstat | wc -l`
echo "$diffcount changes"
if [ "$diffcount" -gt 0 ]; then
    echo 'fetching changes...'
    git pull "$REMOTE"

    echo 'updating dependencies...'
    npm install
    echo 'restarting the bot'
    npm run daemon
else
    echo 'nothing to do.'
fi
