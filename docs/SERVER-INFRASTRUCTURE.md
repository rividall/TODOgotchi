# TODOgotchi -- Server Infrastructure

Last updated: 2026-04-24

## Machine

- **Server**: cepelynvault
- **Tunnel**: buenalynch

## This App

| Service | Port | Container |
|---------|------|-----------|
| Frontend | 3004 | todogotchi-frontend-1 |
| Backend | 8004 | todogotchi-backend-1 |
| Database | 5432 (internal only, no host port) | todogotchi-db-1 |

- **Subdomain**: porings.buenalynch.com
- **Compose file**: `~/repositories/todogotchi/docker-compose.yml`
- **Volumes**: pgdata (postgres data)

## Notes

Port assignments are managed centrally by the lynch-project-scaffolder skill. If you need to check what other ports are in use across all projects, refer to `_lynchProtocol/SERVER-INFRASTRUCTURE.md` in the parent workspace (not accessible from within this repo).
