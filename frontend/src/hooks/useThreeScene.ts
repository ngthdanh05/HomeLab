"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import {
  createSphereGeometry,
  createEquirectangularMaterial,
  HotspotData,
  sphericalToCartesian,
  createHotspotMesh,
} from "@/lib/three-utils";

interface UseThreeSceneOptions {
  imageUrl: string;
  hotspots?: HotspotData[];
  onHotspotClick?: (hotspot: HotspotData) => void;
}

export function useThreeScene(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseThreeSceneOptions
) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const lonRef = useRef(0);
  const latRef = useRef(0);
  const targetLonRef = useRef(0);
  const targetLatRef = useRef(0);

  const cleanup = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  }, []);

  const initScene = useCallback(async () => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Clear any existing canvas children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Sphere with 360 texture with robust fallback
    const createFallbackTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, "#064e3b");
        grad.addColorStop(0.5, "#0f172a");
        grad.addColorStop(1, "#022c22");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 512);
        ctx.fillStyle = "#10b981";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("360° Digital Heritage Viewer", 512, 256);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const textureLoader = new THREE.TextureLoader();
    const texture = await new Promise<THREE.Texture>((resolve) => {
      textureLoader.load(
        options.imageUrl,
        (loadedTexture: THREE.Texture) => {
          loadedTexture.mapping = THREE.EquirectangularReflectionMapping;
          resolve(loadedTexture);
        },
        undefined,
        () => {
          console.warn("Failed to load texture, using fallback.");
          resolve(createFallbackTexture());
        }
      );
    });

    const geometry = createSphereGeometry(500);
    const material = createEquirectangularMaterial(texture);
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Hotspots
    if (options.hotspots) {
      for (const hotspot of options.hotspots) {
        const mesh = createHotspotMesh();
        const pos = sphericalToCartesian(
          hotspot.position.phi,
          hotspot.position.theta,
          450
        );
        mesh.position.copy(pos);
        mesh.userData = { hotspot };
        scene.add(mesh);
      }
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Smooth camera rotation
      lonRef.current += (targetLonRef.current - lonRef.current) * 0.05;
      latRef.current += (targetLatRef.current - latRef.current) * 0.05;

      const lat = Math.max(-85, Math.min(85, latRef.current));
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      const target = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Mouse events
    const canvas = renderer.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - previousMouseRef.current.x;
      const dy = e.clientY - previousMouseRef.current.y;
      targetLonRef.current -= dx * 0.1;
      targetLatRef.current += dy * 0.1;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Touch events
    let prevTouch: Touch | null = null;
    const handleTouchStart = (e: TouchEvent) => {
      prevTouch = e.touches[0];
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!prevTouch) return;
      const touch = e.touches[0];
      const dx = touch.clientX - prevTouch.clientX;
      const dy = touch.clientY - prevTouch.clientY;
      targetLonRef.current -= dx * 0.1;
      targetLatRef.current += dy * 0.1;
      prevTouch = touch;
    };
    const handleTouchEnd = () => {
      prevTouch = null;
    };

    // Hotspot click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (e: MouseEvent) => {
      if (!options.onHotspotClick) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      for (const intersect of intersects) {
        if (intersect.object.userData.hotspot) {
          options.onHotspotClick(intersect.object.userData.hotspot as HotspotData);
          break;
        }
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("click", handleClick);
      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
      renderer.dispose();
    };
  }, [options.imageUrl, containerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    initScene().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
      cleanup();
      cleanupFn?.();
    };
  }, [initScene, cleanup]);
}
