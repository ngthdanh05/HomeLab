// Local Anvil chain for the E2E suite: start, deploy (contracts/script/Deploy.s.sol),
// seed, snapshot/revert and time travel. Used by global-setup and the test fixtures.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { readFileSync } from "node:fs";
import CommunityTreasuryJson from "../../src/abis/CommunityTreasury.json";
import EcoTokenJson from "../../src/abis/EcoToken.json";
import MarketplaceJson from "../../src/abis/Marketplace.json";

/** The frontend's Anvil transport is hard-wired to this URL (src/config/wagmi.ts). */
export const RPC_URL = "http://127.0.0.1:8545";
export const CHAIN_ID = 31337;

/** Anvil's default dev accounts (mnemonic "test test … junk"); unlocked, 10 000 ETH each. */
export const ACCOUNTS = {
  deployer: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    key: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  /** Governance voter: seeded with VOTER_ECO, not delegated yet. */
  voter: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    key: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  /** Marketplace buyer / dashboard user: starts with no ECO and no badges. */
  buyer: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    key: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  /** Artisan who owns the seeded listings. */
  seller: {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    key: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  /** Traveller offsetting carbon. */
  traveller: {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    key: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  },
  /** Recipient of governance disbursements (never sends txs). */
  recipient: {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    key: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  },
} as const satisfies Record<string, { address: Address; key: Hex }>;

export type AccountName = keyof typeof ACCOUNTS;

/**
 * Mirrors DEPLOYMENTS[31337] in src/config/contracts.ts (deterministic: nonces of the
 * deployer in Deploy.s.sol). global-setup checks them against contracts/deployments/local.json.
 */
export const ADDRESSES = {
  ecoToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  impactBadge: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  communityTreasury: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  governance: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  paymentSplitter: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  marketplace: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  carbonOffset: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  questRewards: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
} as const satisfies Record<string, Address>;

export const SEED = {
  /** ECO minted to the voter (quorum on Anvil = 1% of supply). */
  voterEco: parseEther("50"),
  /** ETH deposited into CommunityTreasury so proposals can be paid. */
  treasuryEth: parseEther("1"),
  listingPrice: parseEther("0.01"),
  listingName: "Đèn lồng lụa Hội An E2E",
} as const;

const CONTRACTS_DIR = path.resolve(__dirname, "../../../contracts");

export const publicClient = createPublicClient({ chain: anvil, transport: http(RPC_URL) });

export function walletFor(name: AccountName) {
  return createWalletClient({
    account: privateKeyToAccount(ACCOUNTS[name].key),
    chain: anvil,
    transport: http(RPC_URL),
  });
}

/** Raw JSON-RPC call (Anvil cheat methods are not in viem's public actions). */
export async function rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await response.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`${method}: ${body.error.message}`);
  return body.result as T;
}

export async function isAnvilUp(): Promise<boolean> {
  try {
    return Number(await rpc<string>("eth_chainId")) === CHAIN_ID;
  } catch {
    return false;
  }
}

export const snapshot = () => rpc<Hex>("evm_snapshot");
export async function revert(id: Hex) {
  if (!(await rpc<boolean>("evm_revert", [id]))) throw new Error(`evm_revert(${id}) failed`);
}

/** Moves the chain clock forward and mines a block (Governance compares block.timestamp). */
export async function increaseTime(seconds: number) {
  await rpc("evm_increaseTime", [seconds]);
  await rpc("evm_mine");
}

export async function startAnvil(): Promise<ChildProcess> {
  const child = spawn("anvil", ["--port", "8545", "--chain-id", String(CHAIN_ID), "--silent"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  for (let i = 0; i < 100; i++) {
    if (await isAnvilUp()) return child;
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error("Anvil did not start on port 8545 (is Foundry installed and the port free?)");
}

/** Runs the real deployment script, so the E2E chain matches `make deploy-local`. */
export function deployContracts() {
  const result = spawnSync(
    "forge",
    [
      "script",
      "script/Deploy.s.sol",
      "--rpc-url",
      RPC_URL,
      "--private-key",
      ACCOUNTS.deployer.key,
      "--broadcast",
      "--gas-estimate-multiplier",
      "130",
    ],
    { cwd: CONTRACTS_DIR, encoding: "utf8", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    throw new Error(`forge script Deploy.s.sol failed:\n${result.stdout}\n${result.stderr}`);
  }
}

/** Fails fast if Deploy.s.sol produced different addresses than the frontend expects. */
export function assertDeployedAddresses() {
  const file = path.join(CONTRACTS_DIR, "deployments", "local.json");
  const deployed = JSON.parse(readFileSync(file, "utf8")).contracts as Record<string, string>;
  const expected: Record<string, string> = {
    EcoToken: ADDRESSES.ecoToken,
    ImpactBadge: ADDRESSES.impactBadge,
    CommunityTreasury: ADDRESSES.communityTreasury,
    Governance: ADDRESSES.governance,
    PaymentSplitter: ADDRESSES.paymentSplitter,
    Marketplace: ADDRESSES.marketplace,
    CarbonOffset: ADDRESSES.carbonOffset,
    QuestRewards: ADDRESSES.questRewards,
  };
  for (const [name, address] of Object.entries(expected)) {
    if (deployed[name]?.toLowerCase() !== address.toLowerCase()) {
      throw new Error(`${name} deployed at ${deployed[name]}, but the frontend expects ${address}`);
    }
  }
}

function dataJsonUri(value: unknown) {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(value)).toString("base64")}`;
}

/** State every test starts from (taken as an Anvil snapshot before each test). */
export async function seedChain() {
  const deployer = walletFor("deployer");
  const wait = async (hash: Hex) => {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`seed tx reverted: ${hash}`);
  };

  // ECO for the governance voter: the deployer (token admin) grants itself MINTER_ROLE.
  await wait(
    await deployer.writeContract({
      address: ADDRESSES.ecoToken,
      abi: EcoTokenJson.abi,
      functionName: "grantRole",
      args: [keccak256(toBytes("MINTER_ROLE")), ACCOUNTS.deployer.address],
    }),
  );
  await wait(
    await deployer.writeContract({
      address: ADDRESSES.ecoToken,
      abi: EcoTokenJson.abi,
      functionName: "mint",
      args: [ACCOUNTS.voter.address, SEED.voterEco],
    }),
  );

  await wait(
    await deployer.writeContract({
      address: ADDRESSES.communityTreasury,
      abi: CommunityTreasuryJson.abi,
      functionName: "deposit",
      value: SEED.treasuryEth,
    }),
  );

  // One handicraft listing (ProductType 0 → buyer gets an ECO_CHECKIN badge).
  const seller = walletFor("seller");
  await wait(
    await seller.writeContract({
      address: ADDRESSES.marketplace,
      abi: MarketplaceJson.abi,
      functionName: "createListing",
      args: [
        SEED.listingPrice,
        0,
        dataJsonUri({ name: SEED.listingName, description: "Đèn lồng lụa làm thủ công bởi nghệ nhân phố cổ." }),
      ],
    }),
  );
}
