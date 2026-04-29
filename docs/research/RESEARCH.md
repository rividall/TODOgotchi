# Research, Analysis & Deployment Docs

This folder contains all technical research, package analysis, and deployment documentation for TODOgotchi. It follows a three-stage pipeline for integrating new packages and features.

---

## The Pipeline

Every new package or major feature goes through three stages:

1. **Research** -- Evaluate the package using [HOW_TO_RESEARCH_PACKAGES.md](./HOW_TO_RESEARCH_PACKAGES.md) and write the analysis using [RESEARCH_TEMPLATE.md](./RESEARCH_TEMPLATE.md).
2. **Analysis** -- Document the decision: why this package, how it fits the stack, pros/cons, alternatives considered. Named `{feature}-analysis.md`.
3. **Deployment** -- Track integration, configuration, known issues, and troubleshooting. Named `{feature}-deployment.md`.

Not every feature needs all three stages. Some only need a deployment doc (e.g., Docker setup). But any new third-party library **must** have at least an analysis doc.

### Server Context

All projects in this ecosystem deploy to the home server infrastructure described in [SERVER-INFRASTRUCTURE.md](../SERVER-INFRASTRUCTURE.md). When evaluating packages, consider:

- **Does it need a port?** Check SERVER-INFRASTRUCTURE.md for conflicts. Next available: frontend 3006, backend 8006, postgres 5435.
- **Does it need a sidecar container?** It will run alongside the project's Docker Compose stack on `cepelynvault`.
- **Does it need external network access?** All outbound traffic works normally, but inbound goes through Cloudflare Tunnels only.
- **Does it need persistent storage?** Plan Docker volumes. The mini PC has SSD storage.
- **Does it need DNS/subdomain changes?** Document the CNAME + tunnel ingress steps in the deployment doc.

---

## Documents in This Folder

### Research Guides
| File | Purpose |
|------|---------|
| [HOW_TO_RESEARCH_PACKAGES.md](./HOW_TO_RESEARCH_PACKAGES.md) | Step-by-step process for evaluating packages |
| [RESEARCH_TEMPLATE.md](./RESEARCH_TEMPLATE.md) | 15-section template for analysis docs |

### Analysis Docs
| File | Feature | Recommendation |
|------|---------|----------------|
| [field-rendering-stack-analysis.md](./field-rendering-stack-analysis.md) | Canvas renderer + physics + juice stack (PixiJS + Matter.js + GSAP + tsparticles) for the bouncing poring field | ✅ YES, phased |
| [field-art-pipeline-analysis.md](./field-art-pipeline-analysis.md) | Asset pipeline for upgrading field visuals — Kenney CC0 tiles for environment + Rive state-machine for poring character | ⚠️ CONDITIONAL on style + budget |
| [multi-world-pipeline-analysis.md](./multi-world-pipeline-analysis.md) | Phase 5 architecture — labels gain a `world` field, porings render as per-world creatures (forest/city/graveyard/...) | ✅ YES, after single-world forest is polished |

<!--
  Add rows as you create analysis docs. Format:
  | [package-analysis.md](./package-analysis.md) | What it does | ✅ YES / ❌ NO / ⚠️ CONDITIONAL |
-->

### Deployment Docs
| File | Feature | Status |
|------|---------|--------|

<!--
  Add rows as you create deployment docs. Format:
  | [feature-deployment.md](./feature-deployment.md) | Brief description | Deployed YYYY-MM-DD / In progress |
-->

---

## Adding New Docs

- **New package?** Follow [HOW_TO_RESEARCH_PACKAGES.md](./HOW_TO_RESEARCH_PACKAGES.md) -> create `{package}-analysis.md` using [RESEARCH_TEMPLATE.md](./RESEARCH_TEMPLATE.md)
- **Deploying a feature?** Create `{feature}-deployment.md` with setup steps, configuration, and troubleshooting
- **Update RESEARCH.md** when adding new docs -- keep the tables current

---

## Quick Links

- [Project README](../../README.md) -- Tech stack, structure, architecture
- [SERVER-INFRASTRUCTURE.md](../SERVER-INFRASTRUCTURE.md) -- Server topology, tunnels, domains, ports
- [PROGRESS.md](../PROGRESS.md) -- What's built, what's next
- [TODO.md](../TODO.md) -- Pending tasks

---

**Last Updated:** 2026-04-29
