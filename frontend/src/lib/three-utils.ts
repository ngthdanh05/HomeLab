import * as THREE from "three";

export interface HotspotData {
  id: string;
  position: { phi: number; theta: number }; // spherical coordinates (radians)
  title: string;
  description: string;
}

export function createSphereGeometry(radius = 500): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, 60, 40);
}

// Camera sits at the sphere's centre, so the panorama is drawn on the BackSide.
export function createEquirectangularMaterial(
  texture: THREE.Texture | null,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
  });
}

// phi: polar angle from +Y, theta: azimuth in the XZ plane measured from +X.
// Writes into `target` when given, to avoid allocating in the render loop.
export function sphericalToCartesian(
  phi: number,
  theta: number,
  radius: number,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  return target.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// Màu canvas/WebGL không đọc được CSS variable: giữ đúng giá trị token trong globals.css
// (docs/UX-UI.md mục 4.1) thay cho bảng màu emerald/slate cũ.
const OCEAN = {
  accent: 0xc2513a, // --color-accent: cam san hô, nổi trên ảnh biển xanh
  primarySoft: "#e3f2f5",
  primary: "#0e6375",
  text: "#132a33",
} as const;

export function createHotspotMesh(): THREE.Mesh<
  THREE.SphereGeometry,
  THREE.MeshBasicMaterial
> {
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: OCEAN.accent,
    transparent: true,
    opacity: 0.85,
  });
  return new THREE.Mesh(geometry, material);
}

// Used when the panorama image fails to load, so the viewer never stays black.
export function createFallbackTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, OCEAN.primary);
    grad.addColorStop(1, OCEAN.text);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = OCEAN.primarySoft;
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Di sản biển 360° · 360° ocean heritage", 512, 256);
  }
  return new THREE.CanvasTexture(canvas);
}
