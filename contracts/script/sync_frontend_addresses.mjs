#!/usr/bin/env node
// Ghi địa chỉ Sepolia vừa deploy và block bắt đầu quét event vào frontend/src/config/contracts.ts.
// Cách dùng (trong contracts/): node script/sync_frontend_addresses.mjs [deployments.json] [run.json] [contracts.ts]
import { readFileSync, writeFileSync } from "node:fs";

const [
  deploymentsPath = "deployments/sepolia.json",
  runPath = "broadcast/Deploy.s.sol/11155111/run-latest.json",
  targetPath = "../frontend/src/config/contracts.ts",
] = process.argv.slice(2);

const { chainId, contracts } = JSON.parse(readFileSync(deploymentsPath, "utf8"));
if (chainId !== 11155111) throw new Error(`Cần deployment Sepolia, nhận chain ${chainId}`);

const blocks = JSON.parse(readFileSync(runPath, "utf8")).receipts.map((r) => Number(r.blockNumber));
if (blocks.length === 0) throw new Error(`Không có receipt trong ${runPath}`);
const firstBlock = Math.min(...blocks);

const replaceOnce = (source, pattern, value, label) => {
  if (source.match(new RegExp(pattern.source, `${pattern.flags}g`))?.length !== 1) {
    throw new Error(`Không tìm thấy đúng một vị trí cho ${label}`);
  }
  return source.replace(pattern, value);
};

const addressBlock = [
  "[sepolia.id]: {",
  `    ecoToken: "${contracts.EcoToken}",`,
  `    impactBadge: "${contracts.ImpactBadge}",`,
  `    communityTreasury: "${contracts.CommunityTreasury}",`,
  `    governance: "${contracts.Governance}",`,
  `    paymentSplitter: "${contracts.PaymentSplitter}",`,
  `    marketplace: "${contracts.Marketplace}",`,
  "  },",
].join("\n");

const n = firstBlock.toLocaleString("en-US").replaceAll(",", "_");
const blockBlock = [
  "[sepolia.id]: {",
  ...["impactBadge", "paymentSplitter", "marketplace", "carbonOffset", "governance", "questRewards"].map(
    (key) => `    ${key}: ${n}n,`,
  ),
  "  },",
].join("\n");

let source = readFileSync(targetPath, "utf8").replaceAll("\r\n", "\n");
source = replaceOnce(source, /\[sepolia\.id\]: \{\n\s+ecoToken:[\s\S]*?\n {2}\},/, addressBlock, "DEPLOYMENTS");
source = replaceOnce(source, /\[sepolia\.id\]: \{\n\s+impactBadge: [\d_]+n,[\s\S]*?\n {2}\},/, blockBlock, "LOGS_FROM_BLOCK");
source = replaceOnce(source, /(SEPOLIA_CARBON_OFFSET: Address = )"0x[0-9a-fA-F]{40}"/, `$1"${contracts.CarbonOffset}"`, "CarbonOffset");
source = replaceOnce(source, /(SEPOLIA_QUEST_REWARDS: Address = )"0x[0-9a-fA-F]{40}"/, `$1"${contracts.QuestRewards}"`, "QuestRewards");
writeFileSync(targetPath, source);

console.log(`Đã cập nhật ${targetPath}, block bắt đầu ${firstBlock}.`);
