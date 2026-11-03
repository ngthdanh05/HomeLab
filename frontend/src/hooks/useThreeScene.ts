"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  createSphereGeometry,
  createEquirectangularMaterial,
  createFallbackTexture,
  HotspotData,
  sphericalToCartesian,
  createHotspotMesh,
} from "@/lib/three-utils";

interface UseThreeSceneOptions {
  imageUrl: string;
  hotspots?: HotspotData[];
  onHotspotClick?: (hotspot: HotspotData) => void;
}

const SPHERE_RADIUS = 500;
const HOTSPOT_RADIUS = 450;
const DRAG_SENSITIVITY = 0.1;
const DAMPING = 0.05;
const MAX_LAT = 85;
// Pointer travel (px) below which a press counts as a click, not a drag.
const CLICK_THRESHOLD = 5;

export function useThreeScene(
  containerRef: React.RefObject<HTMLDivElement | null>,
  { imageUrl, hotspots = [], onHotspotClick }: UseThreeSceneOptions,
) {
  const [isLoading, setIsLoading] = useState(true);

  // Keep the latest callback without re-creating the whole WebGL scene.
  const onHotspotClickRef = useRef(onHotspotClick);
  useEffect(() => {
    onHotspotClickRef.current = onHotspotClick;
  }, [onHotspotClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let animationId = 0;
    setIsLoading(true);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / Math.max(container.clientHeight, 1),
      1,
      1100,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);

    const canvas = renderer.domElement;
    // Let the canvas own touch gestures so dragging doesn't scroll the page.
    canvas.style.touchAction = "none";
    canvas.style.display = "block";
    container.appendChild(canvas);

    const geometry = createSphereGeometry(SPHERE_RADIUS);
    const material = createEquirectangularMaterial(null);
    scene.add(new THREE.Mesh(geometry, material));

    const hotspotMeshes = hotspots.map((hotspot) => {
      const mesh = createHotspotMesh();
      mesh.position.copy(
        sphericalToCartesian(hotspot.position.phi, hotspot.position.theta, HOTSPOT_RADIUS),
      );
      mesh.userData = { hotspot };
      scene.add(mesh);
      return mesh;
    });

    let texture: THREE.Texture | null = null;
    const applyTexture = (loaded: THREE.Texture) => {
      if (disposed) {
        loaded.dispose();
        return;
      }
      // BackSide rendering mirrors the panorama; flip U to restore orientation.
      loaded.wrapS = THREE.RepeatWrapping;
      loaded.repeat.x = -1;
      loaded.colorSpace = THREE.SRGBColorSpace;
      texture = loaded;
      material.map = loaded;
      material.needsUpdate = true;
      setIsLoading(false);
    };

    new THREE.TextureLoader().load(imageUrl, applyTexture, undefined, () => {
      console.warn(`Failed to load 360° texture: ${imageUrl}, using fallback.`);
      applyTexture(createFallbackTexture());
    });

    // Camera orientation, smoothed toward the drag target every frame.
    const view = { lon: 0, lat: 0, targetLon: 0, targetLat: 0 };
    const lookTarget = new THREE.Vector3();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      view.lon += (view.targetLon - view.lon) * DAMPING;
      view.lat += (view.targetLat - view.lat) * DAMPING;

      const phi = THREE.MathUtils.degToRad(90 - view.lat);
      const theta = THREE.MathUtils.degToRad(view.lon);
      sphericalToCartesian(phi, theta, SPHERE_RADIUS, lookTarget);
      camera.lookAt(lookTarget);
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    // Pointer events cover mouse, touch and pen with a single code path.
    let activePointer: number | null = null;
    const last = { x: 0, y: 0 };
    const start = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      if (activePointer !== null) return;
      activePointer = e.pointerId;
      last.x = start.x = e.clientX;
      last.y = start.y = e.clientY;
      try {
        // Keeps receiving moves when the drag leaves the canvas.
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Pointer already released (e.g. very fast tap); dragging still works.
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointer) return;
      view.targetLon -= (e.clientX - last.x) * DRAG_SENSITIVITY;
      view.targetLat = THREE.MathUtils.clamp(
        view.targetLat + (e.clientY - last.y) * DRAG_SENSITIVITY,
        -MAX_LAT,
        MAX_LAT,
      );
      last.x = e.clientX;
      last.y = e.clientY;
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const pickHotspot = (clientX: number, clientY: number) => {
      const onClick = onHotspotClickRef.current;
      if (!onClick || hotspotMeshes.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const [hit] = raycaster.intersectObjects(hotspotMeshes, false);
      if (hit) onClick(hit.object.userData.hotspot as HotspotData);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (e.type === "pointerup" && moved < CLICK_THRESHOLD) {
        pickHotspot(e.clientX, e.clientY);
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);

      for (const mesh of hotspotMeshes) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [containerRef, imageUrl, hotspots]);

  return { isLoading };
}
