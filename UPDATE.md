# LingoAI Update and Deployment Flow

Use this flow to merge the latest `main` changes into the `deploy` branch, then redeploy the app on port `3000`.

## 1. Enter the project directory

```bash
cd /root/.openclaw/workspace/repo/LingoAI
```

## 2. Confirm you are on the deploy branch

If you are already on `deploy`, no action is needed. Otherwise, switch to `deploy`:

```bash
git switch deploy
```

## 3. Fetch main and merge it into deploy

Retry up to 8 times if the network is unstable. Each attempt fetches the remote branch first, then merges `origin/main` into the current `deploy` branch:

```bash
for i in 1 2 3 4 5 6 7 8; do
  echo "[update attempt $i]"
  git fetch origin main && git merge origin/main && break
  sleep 3
done
```

If all 8 attempts fail, run the same command again.

## 4. Build

```bash
npm run build
```

## 5. Stop the old service

Check the current process:

```bash
ps -ef | grep "server/dist/index.js" | grep -v grep
```

Stop the old service:

```bash
pkill -f "server/dist/index.js"
```

## 6. Start the new service with nohup

```bash
setsid nohup env HOST=0.0.0.0 PORT=3000 CLIENT_ORIGIN=http://101.132.124.46:3000 node /root/.openclaw/workspace/repo/LingoAI/server/dist/index.js > /tmp/lingoai-prod.log 2>&1 < /dev/null &
```

## 7. Verify

Check the process:

```bash
ps -ef | grep "server/dist/index.js" | grep -v grep
```

Check the health endpoint:

```bash
curl -sS http://127.0.0.1:3000/api/health
```

Check the homepage:

```bash
curl -I -sS http://127.0.0.1:3000/
```

Check the logs:

```bash
tail -n 50 /tmp/lingoai-prod.log
```

## 8. Push deploy after successful verification

Only push after the process, health endpoint, homepage, and logs all look good:

```bash
GIT_SSH_COMMAND="ssh -v" git push origin deploy
```
