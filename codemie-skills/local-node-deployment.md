---
name: local-node-deployment
description: Build and deploy the Node.js Task Manager locally with health checks and rollback.
---

# Local Node deployment

1. Run scripts/build.ps1 to create the build artefact.
2. Install dependencies, apply db/schema.sql, start the server.
3. Health check: GET /health must return 200.
4. Rollback: stop the server and restore the previous artefact.
5. Record the steps and results in docs/deployment.md.
