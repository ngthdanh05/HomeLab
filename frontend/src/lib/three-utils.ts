import * as THREE from "three";

export interface HotspotData {
  id: string;
  position: { phi: number; theta: number }; // spherical coordinates
  title: string;
  description: string;
}

export function createSphereGeometry(radius = 500): THREE.SphereGeometry {
  return new THREE.SphereGeometry(radius, 60, 40);
}

export function createEquirectangularMaterial(
  texture: THREE.Texture
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
  });
}

export function sphericalToCartesian(
  phi: number,
  theta: number,
  radius: number
): THREE.Vector3 {
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function clampLat(lat: number): number {
  return Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, lat));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function createHotspotMesh(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(8, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.85,
  });
  return new THREE.Mesh(geometry, material);
}
