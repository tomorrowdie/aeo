# Project Memory
* Welcome Back: The repository is now standardized as a cloud-ready npm workspace monorepo with a new root package.json managing the frontend and backend packages together.
* Structural Changes: The frontend keeps the standard Next.js production build command and now starts with `next start` so Zeabur can provide `PORT` automatically. The backend start command now runs `npx prisma generate && npx prisma db push && node src/index.js` so Prisma artifacts and schema state are prepared before boot.
* Environment Linking: Set `BACKEND_URL=https://aeo.zeabur.app` on the frontend service and `FRONTEND_URL=https://aeo-web.zeabur.app` on the backend service.
* Final Zeabur Step: In the dashboard, set the Root Directory to `/frontend` for the web service and `/backend` for the API service before redeploying.
* Agent 1: Claude Code - Handled initial MVP setup, standardizing ports to 8080. Currently on cooldown.
* Agent 2 (Codex): Completed backend stabilization and standardized the monorepo for separate frontend and backend cloud deployment.
* Agent 3: Antigravity - Reserved for future automation/workflow orchestration.
