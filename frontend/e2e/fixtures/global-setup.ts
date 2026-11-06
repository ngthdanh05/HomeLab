// Starts a fresh Anvil chain, deploys every contract with the real Deploy.s.sol
// and seeds the state the journeys start from. Each test then runs inside an
// evm_snapshot / evm_revert pair (see anvil.fixture.ts), so tests stay independent.
import {
  assertDeployedAddresses,
  deployContracts,
  isAnvilUp,
  seedChain,
  startAnvil,
} from "./anvil";

export default async function globalSetup() {
  if (await isAnvilUp()) {
    throw new Error(
      "A chain is already running on 127.0.0.1:8545. Stop it first: the E2E suite deploys onto a fresh Anvil " +
        "(the frontend's local transport is fixed to that port).",
    );
  }

  const anvil = await startAnvil();
  try {
    deployContracts();
    assertDeployedAddresses();
    await seedChain();
  } catch (error) {
    anvil.kill();
    throw error;
  }

  // Returned function = global teardown.
  return async () => {
    if (process.platform === "win32" && anvil.pid) {
      // spawn(shell: true) wraps anvil in cmd.exe; kill the whole tree.
      const { spawnSync } = await import("node:child_process");
      spawnSync("taskkill", ["/pid", String(anvil.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      anvil.kill();
    }
  };
}
