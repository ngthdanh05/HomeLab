# Contributing to MyHomeLab

Thanks for your interest in improving MyHomeLab! This guide explains how to set up the project, the conventions the
codebase follows and what a pull request needs before it can be merged.

Product background and the full architecture are in [README.md](README.md) and [docs/PLAN.md](docs/PLAN.md).

---

## Ways to contribute

- **Report a bug** — open an issue with steps to reproduce, the expected and actual result, the network
  (Anvil `31337` or Sepolia `11155111`) and the transaction hash if one is involved.
- **Suggest a feature** — open an issue describing the problem first; larger changes are easier to review once the
  approach is agreed.
- **Send a pull request** — bug fixes, tests, translations and documentation are all welcome.

> **Security issues:** please do **not** open a public issue for a vulnerability in the smart contracts or the API
> routes. Contact the maintainer privately through GitHub instead. The contracts run on a testnet and have not had a
> third-party audit.

---

## Development setup

The main development environment is **Windows + Git Bash** (the `*.sh` scripts need bash); macOS and Linux work too.

| Tool | Notes |
| --- | --- |
| Git | clone with submodules (OpenZeppelin) |
| [Foundry](https://getfoundry.sh/) | `forge`, `cast`, `anvil` on your `PATH` |
| Node.js ≥ 20 + npm | CI pins npm 11.6.1 (`npx -y npm@11.6.1 ci`) |
| MetaMask | for manual testing in the browser |

```bash
git clone --recurse-submodules https://github.com/<your-fork>/HomeLab.git
cd HomeLab/frontend && npm ci
```

Run the app against a local chain:

```bash
anvil --chain-id 31337                       # terminal 1, keep it open (port 8545)
cd contracts && make deploy-local            # terminal 2
cd frontend && cp .env.example .env.local    # set NEXT_PUBLIC_CHAIN_ID=31337
cd frontend && npm run dev                   # http://localhost:3000
```

Anvil addresses are deterministic and hard-coded in
[frontend/src/config/contracts.ts](frontend/src/config/contracts.ts). If Anvil already has other transactions, the
addresses will not match: restart Anvil and deploy again. See [README.md → Getting Started](README.md#getting-started)
for MetaMask setup and environment variables.

Never commit `frontend/.env.local` or `contracts/.env`.

---

## Workflow

1. Fork the repository and create a branch from `main`:
   `feat/…`, `fix/…`, `docs/…`, `ci/…`, `refactor/…`, `test/…`.
2. Make your change **with tests**.
3. Run the checks below locally.
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):

   ```text
   feat: add order tracking to the dashboard
   fix(marketplace): refund overpayment when a listing is bought
   docs: explain the DAO timelock
   ```

5. Open a pull request against `main`. Describe what changed and why, how you tested it, and add screenshots for
   UI changes (both Vietnamese and English).

Every pull request runs CI ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) →
[`ci.yml`](.github/workflows/ci.yml)): contract tests, typecheck, lint, unit tests, E2E, a security scan
(Slither, `npm audit`) and a Vercel preview deployment. All checks must pass before merging.

### Checks to run before pushing

```bash
cd contracts && forge build --sizes && forge test
```

```bash
cd frontend && npm run typecheck && npx eslint src test e2e && npm test
```

End-to-end tests start their own Anvil on port 8545, so stop yours first:

```bash
cd frontend && npx playwright install chromium && npm run e2e
```

Details on the E2E fixtures: [frontend/e2e/README.md](frontend/e2e/README.md).

---

## Coding conventions

### Smart contracts (`contracts/`)

- Solidity `0.8.24`, OpenZeppelin, Foundry.
- Follow **Checks-Effects-Interactions**, use `nonReentrant` on every function that moves ETH, use **custom errors**
  instead of `require` strings, and keep the **pull pattern** for platform fees.
- Every contract change needs tests in `contracts/test/`.
- Comments in Solidity files are short and in English.
- **Do not change the deploy order** in `script/Deploy.s.sol` or add transactions before the first broadcast block
  without updating the Anvil addresses in `frontend/src/config/contracts.ts` — E2E will fail otherwise.
- When you redeploy a single contract with your own script, grant its `MINTER_ROLE` again (see the existing
  `DeployCarbonOffset.s.sol` / `DeployQuestRewards.s.sol`).
- Quest order in `script/QuestSetup.sol` must match `frontend/src/data/quests.ts`.
- After changing a contract interface, copy the ABIs to the frontend:

  ```bash
  cd contracts && forge build && for c in EcoToken ImpactBadge CommunityTreasury Governance PaymentSplitter Marketplace CarbonOffset QuestRewards; do cp out/$c.sol/$c.json ../frontend/src/abis/$c.json; done
  ```

### Frontend (`frontend/`)

- Next.js App Router, TypeScript, Tailwind, wagmi v2 + viem. Read [frontend/AGENTS.md](frontend/AGENTS.md) and check the
  docs in `node_modules/next/dist/docs/` before using a Next.js API you are unsure about.
- Contract writes go through the `useContractTx` hook (wallet prompt → confirmation → toast → refetch).
- **Bilingual UI (Vietnamese default, English):** every visible string needs both versions.
  - Components: `const { t, locale } = useI18n()` then `t("Tiếng Việt", "English")`.
  - Code without hooks: `pick(locale, vi, en)` from `lib/i18n.ts`.
  - Server components and `generateMetadata`: `getLocale()` from `lib/i18n-server.ts`.
  - Pass `locale` to number and date formatters.
  - Static English data lives next to the Vietnamese version (`labelEn`, `culturalData.en.ts`, `HERITAGE_EN`, `QUESTS_EN`).
- **Design system** ([docs/UX-UI.md](docs/UX-UI.md), section 4):
  - Use role-based colour tokens only (`bg`, `surface`, `text`, `text-muted`, `primary`, `accent`, `danger`…, defined in
    `globals.css`). The default Tailwind palette is replaced, so `slate-*` / `emerald-*` have no effect.
  - Radius only `rounded-sm` / `-md` / `-lg`; text at least `text-xs`.
  - Icons from `lucide-react`; data in `lib/` stores the icon **name** and renders it through `AppIcon`.
  - Monospace only for wallet addresses and transaction hashes.
  - Prefer the components in `src/components/ui/` (`Button`, `TxButton`, `Modal`, `Field`…).
  - `test/design-system.test.mjs` enforces these rules.
- The CSP in `next.config.mjs` only allows `http://` to `127.0.0.1:8545` / `localhost:8545`.

### AI routes (`frontend/src/app/api/`)

- Declare `runtime = "edge"` and `preferredRegion = "sin1"`; do not use Node APIs (`fs`, `Buffer`, Node `crypto`).
- Reuse `readAIRequest`, `errorResponse` and `withGeminiTimeout`.
- Put the system prompt in `systemInstruction` (never concatenate it with user input), wrap user data in `"""…"""`
  and sanitise it with `sanitizeText`.
- Never trust model output: add a validator and a `normalize*()` function in `lib/ai-validation.ts`, with unit tests
  in `frontend/test/`.
- Error messages follow the user's language and must not leak internal details.

### Language

- Variable and function names: English.
- Pull request titles, commit messages and this repository's README: English.

---

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
