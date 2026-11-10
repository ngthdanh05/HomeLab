// Playwright fixtures for on-chain journeys:
// - every test runs between evm_snapshot / evm_revert (isolated, order-independent);
// - the page gets a mock MetaMask wired to one Anvil dev account (`test.use({ account })`);
// - V8 JS coverage is collected for the coverage report (Chromium only).
import { test as base, expect, type Page } from "@playwright/test";
import { addCoverageReport } from "monocart-reporter";
import { formatEther, type Address } from "viem";
import { ACCOUNTS, CHAIN_ID, RPC_URL, increaseTime, publicClient, revert, snapshot, type AccountName } from "./anvil";
import { installMockWallet } from "./mock-wallet";

export interface ChainFixture {
  /** Advances block.timestamp (and mines a block). */
  increaseTime: (seconds: number) => Promise<void>;
  balanceOf: (address: Address) => Promise<bigint>;
}

interface Fixtures {
  /** Anvil dev account the mock wallet exposes. */
  account: AccountName;
  address: Address;
  chain: ChainFixture;
  /** Clicks ConnectKit's "Connect Wallet" → MetaMask and waits for the address in the header. */
  connectWallet: (page?: Page) => Promise<void>;
}

/** ConnectKit's connected-button format: 0x7099••••79C8. */
export function connectKitAddress(address: string) {
  return `${address.slice(0, 6)}••••${address.slice(-4)}`;
}

/** Same format as shortenAddress() in src/lib/marketplace.ts: 0x7099…79C8. */
export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** The header's ConnectKit button once connected, labelled with the shortened address. */
export function connectedButton(page: Page, address: string) {
  const [start, end] = connectKitAddress(address).split("••••");
  return page.getByRole("banner").getByRole("button", { name: new RegExp(`${start}.*${end}`, "i") });
}

export const ethText = (wei: bigint) => formatEther(wei).replace(".", ",");

export const test = base.extend<Fixtures>({
  account: ["buyer", { option: true }],

  address: async ({ account }, use) => {
    await use(ACCOUNTS[account].address);
  },

  chain: [
    async ({}, use) => {
      const id = await snapshot();
      await use({
        increaseTime,
        balanceOf: (address) => publicClient.getBalance({ address }),
      });
      await revert(id);
    },
    { auto: true },
  ],

  page: async ({ page, address, browserName }, use, testInfo) => {
    await page.addInitScript(installMockWallet, { account: address, rpcUrl: RPC_URL, chainId: CHAIN_ID });

    // Browser console + page errors, attached to the report when a test fails.
    const logs: string[] = [];
    page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

    const coverage = browserName === "chromium" && process.env.E2E_COVERAGE !== "0";
    if (coverage) await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await use(page);
    if (coverage) await addCoverageReport(await page.coverage.stopJSCoverage(), testInfo);
    if (testInfo.status !== testInfo.expectedStatus && logs.length) {
      await testInfo.attach("browser-console.txt", { body: logs.join("\n"), contentType: "text/plain" });
    }
  },

  connectWallet: async ({ page, address }, use) => {
    await use(async (target = page) => {
      await target.getByRole("button", { name: "Kết nối ví" }).first().click();
      await target.getByRole("button", { name: /^MetaMask/ }).click();
      await expect(connectedButton(target, address)).toBeVisible();
    });
  },
});

export { expect };
