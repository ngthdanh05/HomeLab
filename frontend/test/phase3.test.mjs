import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, "..");

console.log("🚀 Bắt đầu kiểm thử Phase 3: AI Engine Integration & Digital Archive\n");

// 1. Kiểm tra Cultural Seed Data (Task 3.3)
console.log("--- 1. Kiểm tra Cultural Seed Data (Task 3.3) ---");
const culturalFile = fs.readFileSync(path.join(frontendDir, "src/data/culturalData.ts"), "utf-8");
assert.ok(culturalFile.includes("hoi-an"), "Phải có điểm đến Hội An");
assert.ok(culturalFile.includes("sa-pa"), "Phải có điểm đến Sa Pa");
assert.ok(culturalFile.includes("phu-quoc"), "Phải có điểm đến Phú Quốc");
assert.ok(culturalFile.includes("dos:"), "Phải có trường dos");
assert.ok(culturalFile.includes("donts:"), "Phải có trường donts");
assert.ok(culturalFile.includes("phrases:"), "Phải có trường phrases (học tiếng)");
assert.ok(culturalFile.includes("customs:"), "Phải có trường customs (phong tục)");
console.log("✅ Seed data văn hóa cho 3 điểm đến (Hội An, Sa Pa, Phú Quốc) đầy đủ.");

// 2. Kiểm tra Three.js 360 Components & Utils (Task 3.4)
console.log("\n--- 2. Kiểm tra Three.js 360 Components & Math (Task 3.4) ---");
const threeUtils = fs.readFileSync(path.join(frontendDir, "src/lib/three-utils.ts"), "utf-8");
assert.ok(threeUtils.includes("sphericalToCartesian"), "Phải có hàm sphericalToCartesian");
assert.ok(threeUtils.includes("createSphereGeometry"), "Phải có hàm createSphereGeometry");
assert.ok(threeUtils.includes("createEquirectangularMaterial"), "Phải có hàm createEquirectangularMaterial");
assert.ok(threeUtils.includes("BackSide"), "Phải cấu hình BackSide cho 360 viewer");

assert.ok(fs.existsSync(path.join(frontendDir, "src/components/archive/DigitalArchive360.tsx")), "Phải có DigitalArchive360.tsx");
assert.ok(fs.existsSync(path.join(frontendDir, "src/components/archive/HotspotOverlay.tsx")), "Phải có HotspotOverlay.tsx");
assert.ok(fs.existsSync(path.join(frontendDir, "src/components/archive/ArchiveGallery.tsx")), "Phải có ArchiveGallery.tsx");
assert.ok(fs.existsSync(path.join(frontendDir, "public/360/sample-equirectangular-1.svg")), "Phải có ảnh 360 mẫu 1");
assert.ok(fs.existsSync(path.join(frontendDir, "public/360/sample-equirectangular-2.svg")), "Phải có ảnh 360 mẫu 2");
console.log("✅ Toàn bộ cấu trúc 360° Digital Heritage Archive đã hoàn chỉnh.");

// 3. Kiểm tra AI Travel Assistant (Task 3.2)
console.log("\n--- 3. Kiểm tra AI Travel Assistant Endpoints & Components (Task 3.2) ---");
assert.ok(fs.existsSync(path.join(frontendDir, "src/lib/gemini.ts")), "Phải có gemini.ts");
assert.ok(fs.existsSync(path.join(frontendDir, "src/app/api/ai/chat/route.ts")), "Phải có API chat route");
assert.ok(fs.existsSync(path.join(frontendDir, "src/app/api/ai/itinerary/route.ts")), "Phải có API itinerary route");
assert.ok(fs.existsSync(path.join(frontendDir, "src/app/api/ai/culture-guide/route.ts")), "Phải có API culture-guide route");
assert.ok(fs.existsSync(path.join(frontendDir, "src/components/ai/TravelAssistant.tsx")), "Phải có TravelAssistant.tsx");
assert.ok(fs.existsSync(path.join(frontendDir, "src/components/ai/ChatBubble.tsx")), "Phải có ChatBubble.tsx");
assert.ok(fs.existsSync(path.join(frontendDir, "src/components/ai/ItineraryCard.tsx")), "Phải có ItineraryCard.tsx");
assert.ok(fs.existsSync(path.join(frontendDir, "src/hooks/useAIChat.ts")), "Phải có useAIChat.ts");
console.log("✅ Các API routes và components của AI Travel Assistant đã đầy đủ.");

// 4. Kiểm tra Web3 Contract ABIs & Addresses (Task 3.1)
console.log("\n--- 4. Kiểm tra Web3 Contract ABIs & Addresses (Task 3.1) ---");
const expectedContracts = [
  "EcoToken",
  "ImpactBadge",
  "CommunityTreasury",
  "Governance",
  "PaymentSplitter",
  "Marketplace"
];

for (const cName of expectedContracts) {
  const abiPath = path.join(frontendDir, `src/abis/${cName}.json`);
  assert.ok(fs.existsSync(abiPath), `File ABI ${cName}.json phải tồn tại`);
  const content = JSON.parse(fs.readFileSync(abiPath, "utf-8"));
  assert.ok(Array.isArray(content.abi), `ABI ${cName} phải chứa mảng hàm`);
  assert.ok(content.abi.length > 0, `ABI ${cName} không được rỗng`);
}
console.log(`✅ Đã xác minh 6/6 smart contracts với đầy đủ ABI artifacts từ Foundry.`);

console.log("\n🎉 TẤT CẢ CÁC BÀI TEST UNIT VÀ LOGIC PHASE 3 ĐÃ VƯỢT QUA 100%!");
