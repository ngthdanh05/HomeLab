// Type declarations for Three.js module
declare module "three" {
  export const BackSide: number;
  export const EquirectangularReflectionMapping: number;

  export class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
  }

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(v: Vector3): this;
  }

  export class Texture {
    mapping: number;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class TextureLoader {
    load(
      url: string,
      onLoad?: (texture: Texture) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: unknown) => void
    ): Texture;
  }

  export class SphereGeometry {
    constructor(
      radius?: number,
      widthSegments?: number,
      heightSegments?: number
    );
  }

  export class MeshBasicMaterial {
    constructor(parameters?: {
      color?: number;
      map?: Texture;
      side?: number;
      transparent?: boolean;
      opacity?: number;
    });
  }

  export class Object3D {
    position: Vector3;
    userData: Record<string, unknown>;
  }

  export class Mesh extends Object3D {
    constructor(geometry?: unknown, material?: unknown);
  }

  export class Scene {
    children: Object3D[];
    add(...object: Object3D[]): this;
  }

  export class PerspectiveCamera {
    position: Vector3;
    aspect: number;
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    lookAt(vector: Vector3): void;
    updateProjectionMatrix(): void;
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor(parameters?: { antialias?: boolean });
    setSize(width: number, height: number): void;
    setPixelRatio(pixelRatio: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }

  export class Raycaster {
    setFromCamera(coords: Vector2, camera: PerspectiveCamera): void;
    intersectObjects(objects: Object3D[]): Array<{ object: Object3D }>;
  }

  export namespace MathUtils {
    export function degToRad(degrees: number): number;
  }
}
