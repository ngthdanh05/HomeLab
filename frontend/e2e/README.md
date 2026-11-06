# E2E tests (Playwright + Anvil)

End-to-end journeys against a production build of the frontend running on a local Anvil chain.

```bash
cd frontend
npx playwright install chromium   # once
npm run e2e                       # build for Anvil + run all tests
E2E_SKIP_BUILD=1 npm run e2e      # reuse the last build (.next-e2e)
npm run e2e -- tests/04           # one file
npm run e2e:report                # open the HTML report
```

Requirements: Foundry (`anvil`, `forge`) on `PATH`, and port **8545** free (the app's Anvil transport is fixed to `127.0.0.1:8545`). The app is served on port 3210 (`E2E_PORT`).

## How it works

- **`fixtures/global-setup.ts`** starts a fresh Anvil, deploys every contract with the real `contracts/script/Deploy.s.sol`, checks the addresses match `src/config/contracts.ts`, then seeds: 50 ECO for the voter (not delegated), 1 ETH in the Community Treasury, one handicraft listing (0.01 ETH) by the seller.
- **`fixtures/anvil.fixture.ts`** wraps each test in `evm_snapshot` / `evm_revert`, so tests are independent and can run in any order. `test.use({ account })` picks the Anvil dev account (`voter`, `buyer`, `seller`, `traveller`, …, see `fixtures/anvil.ts`).
- **`fixtures/mock-wallet.ts`** injects an EIP-1193 provider that looks like MetaMask (also announced via EIP-6963). It forwards requests to Anvil, which signs with its unlocked dev accounts. `connectWallet()` goes through ConnectKit's real "Connect Wallet → MetaMask" flow.
- Time travel: `chain.increaseTime(seconds)` (`evm_increaseTime` + `evm_mine`).

| File | Journey |
| --- | --- |
| `01_wallet_connect` | connect → shortened address + network in the header; connection kept across navigation and reload |
| `02_marketplace_purchase` | browse → buy → success toast, 70/20/10 split on-chain → ECO_CHECKIN badge on the dashboard; sold listing can't be bought again |
| `03_carbon_offset` | trip legs → CO₂ total → offset → fee to the Treasury, ZERO_CARBON badge |
| `04_governance_vote` | delegate → create proposal → vote → time travel → execute → Treasury −0.3 ETH; wallet below the ECO threshold can't propose |
| `05_dashboard_badges` | ECO balance, badge gallery (flip) and activity feed after a UI purchase + an on-chain offset |

## Reports

- `playwright-report/` – Playwright HTML report (traces, screenshots and videos of failures).
- `coverage/` – V8 JS coverage of the app's own `src/` files during the E2E run (source maps are enabled for the E2E build via `E2E_SOURCEMAPS=1`): `index.html`, `lcov.info`, `coverage-summary.json`. Disable with `E2E_COVERAGE=0`.

Retries are capped at 1 (`playwright.config.ts`); a test that only passes on retry is reported as flaky.
