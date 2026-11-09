# CarePayNY

Free pay calculator and plain-language guides for New York home care aides, home health aides and CDPAP caregivers. Live at [carepayny.com](https://carepayny.com) after launch.

- **Am I being paid right?** Checks one week of pay against New York's 2026 home care minimum wage, wage parity, overtime and 24-hour shift rules. It runs entirely in the browser and stores nothing.
- Coming next: a CDPAP payroll guide, pay-rule explainers, a free training finder and Spanish versions.

## Develop

```sh
npm install
npm run dev      # local preview
npm test         # calculator worked examples
npm run build    # static site in dist/
```

## Deploy (Cloudflare Pages)

Connect this repository in Cloudflare Pages with:

- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `NODE_VERSION=22`

Production deploys from `main` only. Every change goes through a pull request and must pass CI.

## Docs

- Product requirements: [`docs/PRD.md`](docs/PRD.md)
- Rules for agents and contributors: [`CLAUDE.md`](CLAUDE.md)

CarePayNY gives general information, not legal advice, and is not affiliated with any New York State agency, PPL or Medicaid.
