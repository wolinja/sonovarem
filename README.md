# Sonovarem

**Farm advice by voice for smallholder farmers in Ghana who cannot read English, starting with Asante Twi.**

A farmer asks a farming question by voice in Twi and hears a grounded, cited answer spoken back. Answers come from cited agricultural extension guides, the week's weather forecast and, where available, a soil sensor on her farm. Literate farmers can also use English voice or text. The problem is national; Berekuso, in the Eastern Region, is our first test site.

This repository is our capstone for **ICS 591: Building Secure Intelligent Systems** (Ashesi University), and the first working core of the Sonovarem venture.

## Start here

| | |
|---|---|
| **Specification** | [`spec/`](spec/): scope, architecture, measurement plan and design decisions. Later milestones amend it in place; see [`spec/CHANGELOG.md`](spec/CHANGELOG.md) |
| **Status** | Milestone 1 (2026-10-01): framing, architecture and measurement plan. The application scaffold (FastAPI backend, React frontend, Docker Compose) is in place; features follow from Milestone 2 |
| **Develop** | [`development.md`](development.md) to run it locally; [`deployment-docker-compose.md`](deployment-docker-compose.md) to deploy; [`CONTRIBUTING.md`](CONTRIBUTING.md) for the team workflow |
| **Due** | 2026-12-15 |

## How the system works

A fixed pipeline handles each question:
1. **Speech recognition** turns Twi speech into text.
2. **Echo-back:** the system repeats the question and waits for the farmer's yes whenever a number, dose or product is involved.
3. **Translation:** the question is translated to English, with numbers protected.
4. **Retrieval:** relevant passages are found in cited extension guides.
5. **Answer:** a language model drafts an answer from those passages only.
6. **Guards:** deterministic code checks every dose, product and number against the cited source.
7. **Speech:** the answer is translated back to Twi and spoken.

All speech and translation calls go through a reusable **language gateway** (`langgw`), so a better Twi engine can be swapped in by configuration. When the sources do not support an answer, the system says "I don't know" and names who can help. Details: [`spec/architecture.md`](spec/architecture.md).

## Planned stack

| Layer | Choice |
|---|---|
| Frontend | React, Vite and TypeScript web app |
| Backend | FastAPI modular monolith, including the `langgw` language gateway |
| Data | PostgreSQL with pgvector; Redis |
| Language model | Anthropic Claude (Haiku 4.5, Sonnet 5) |
| Twi speech and translation | Chosen at our week-2 comparison |
| Hosting | Docker Compose on a Hetzner VPS, behind Traefik and Cloudflare |

The backend and frontend start from the [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template) (MIT licence; see [`LICENSE`](LICENSE)), with its users, items, email login and release tooling removed.

## Team

| Name | Role |
|---|---|
| Joseph Ajegetina Ajongba | Project lead |
| [Member 2] | [Role] |
| [Member 3] | [Role] |
| [Member 4] | [Role] |

## Data and privacy

No farmer's personal data or audio is stored in this repository. No external farmer is recorded before the Ashesi IRB has answered in writing and the project is registered with Ghana's Data Protection Commission (Act 843).

## Use of AI tools

We used Claude (Anthropic), through Claude Code, as an assistant to draft specifications and diagrams from decisions the team made. The team reviewed and edited them.
