declare module '@/src/vendor/cocos4/cc.js' {
  export class Vec2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
  }

  export class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y?: number, z?: number): this;
    set(other: Vec3): this;
    clone(): Vec3;
    add(other: Vec3): this;
    subtract(other: Vec3): this;
    multiplyScalar(s: number): this;
    length(): number;
    normalize(): this;
    static lerp(out: Vec3, a: Vec3, b: Vec3, t: number): Vec3;
    static distance(a: Vec3, b: Vec3): number;
  }

  export class Vec4 {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    set(x: number, y: number, z: number, w: number): this;
  }

  export class Quat {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    static fromEuler(out: Quat, x: number, y: number, z: number): Quat;
    static slerp(out: Quat, a: Quat, b: Quat, t: number): Quat;
    static fromViewUp(out: Quat, view: Vec3, up?: Vec3): Quat;
  }

  export class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number | string, g?: number, b?: number, a?: number);
    set(r: number, g: number, b: number, a?: number): this;
    fromHEX(hex: string): this;
    static lerp(out: Color, from: Color, to: Color, ratio: number): Color;
  }

  export function color(r?: number | string, g?: number, b?: number, a?: number): Color;
  export function v3(x?: number, y?: number, z?: number): Vec3;
  export function quat(x?: number, y?: number, z?: number, w?: number): Quat;

  export class Asset {
    _uuid: string;
    name: string;
  }

  export class ImageAsset extends Asset {
    constructor(nativeAsset?: HTMLCanvasElement | HTMLImageElement | Record<string, unknown>);
  }

  export class Texture2D extends Asset {
    image: ImageAsset | null;
    static Filter: { NEAREST: number; LINEAR: number };
    static WrapMode: { REPEAT: number; CLAMP_TO_EDGE: number; MIRRORED_REPEAT: number };
    setFilters(minFilter: number, magFilter: number): void;
    setWrapMode(wrapS: number, wrapT: number): void;
  }

  export class EffectAsset extends Asset {
    hideInEditor: boolean;
    techniques: unknown[];
    shaders: Array<{
      name: string;
      glsl3?: { vert: string; frag: string };
      glsl1?: { vert: string; frag: string };
      [key: string]: unknown;
    }>;
    onLoaded(): void;
    static register(asset: EffectAsset): void;
  }

  export class Material extends Asset {
    passes: Array<{ tryCompile(): boolean }>;
    initialize(info: {
      effectName?: string;
      defines?: Record<string, unknown>;
      states?: Record<string, unknown>;
      technique?: number;
    }): void;
    setProperty(name: string, val: unknown, passIdx?: number): void;
    getProperty(name: string, passIdx?: number): unknown;
  }

  export class Mesh extends Asset {
    destroy(): boolean;
  }

  export class Node {
    name: string;
    active: boolean;
    layer: number;
    position: Vec3;
    worldPosition: Vec3;
    rotation: Quat;
    eulerAngles: Vec3;
    scale: Vec3;
    parent: Node | null;
    children: Node[];
    constructor(name?: string);
    addChild(child: Node): void;
    removeFromParent(): void;
    destroy(): boolean;
    destroyAllChildren(): void;
    getChildByName(name: string): Node | null;
    setPosition(x: number | Vec3, y?: number, z?: number): void;
    setRotationFromEuler(x: number, y: number, z: number): void;
    setScale(x: number | Vec3, y?: number, z?: number): void;
    lookAt(pos: Vec3, up?: Vec3): void;
    addComponent<T extends Component>(type: new () => T): T;
    getComponent<T extends Component>(type: new () => T): T | null;
  }

  export class AmbientInfo {
    skyColor: Vec4;
    groundAlbedo: Vec4;
    skyIllum: number;
  }

  export class ShadowsInfo {
    enabled: boolean;
    type: number;
    distance: number;
    maxReceived: number;
    shadowMapSize: number;
    shadowColor: Color;
  }

  export class FogInfo {
    enabled: boolean;
    type: number;
    fogColor: Color;
    fogDensity: number;
    fogStart: number;
    fogEnd: number;
    fogAtten: number;
    fogTop: number;
    fogRange: number;
    accurate: boolean;
  }

  export class SkyboxInfo {
    enabled: boolean;
    useHDR: boolean;
    useIBL: boolean;
    envLightingType: number;
  }

  export class PostSettingsInfo {
    toneMappingType: number;
  }

  export class SceneGlobals {
    ambient: AmbientInfo;
    shadows: ShadowsInfo;
    fog: FogInfo;
    skybox: SkyboxInfo;
    postSettings: PostSettingsInfo;
  }

  export class Scene extends Node {
    globals: SceneGlobals;
    constructor(name?: string);
  }

  export class Component {
    node: Node;
    enabled: boolean;
    update?(dt: number): void;
    onDestroy?(): void;
  }

  export class Camera extends Component {
    fov: number;
    near: number;
    far: number;
    clearColor: Color;
    clearFlags: number;
    visibility: number;
    priority: number;
    orthoHeight: number;
    projection: number;
    screenPointToRay(x: number, y: number, out?: geometry.Ray): geometry.Ray;
    worldToScreen(worldPos: Vec3, out?: Vec3): Vec3;
    static ClearFlag: Record<string, number>;
    static ProjectionType: { ORTHO: number; PERSPECTIVE: number };
  }

  export class MeshRenderer extends Component {
    mesh: Mesh | null;
    material: Material | null;
    shadowCastingMode: number;
    receiveShadow: number;
    setSharedMaterial(mat: Material | null, idx: number): void;
    getMaterialInstance(idx: number): Material | null;
  }

  export class Light extends Component {
    color: Color;
    useColorTemperature: boolean;
    colorTemperature: number;
  }

  export class DirectionalLight extends Light {
    illuminance: number;
    shadowEnabled: boolean;
    shadowPcf: number;
    shadowBias: number;
    shadowNormalBias: number;
    shadowSaturation: number;
    shadowDistance: number;
    shadowOrthoSize: number;
    csmLevel: number;
  }

  export class PointLight extends Light {
    luminousFlux: number;
    range: number;
  }

  export class SphereLight extends Light {
    luminousFlux: number;
    range: number;
    size: number;
  }

  export class ParticleSystem extends Component {
    capacity: number;
    duration: number;
    loop: boolean;
    playOnAwake: boolean;
    rateOverTime: { constant: number };
    startLifetime: { constant: number };
    startSpeed: { constant: number };
    startSizeX: { constant: number };
    startColor: { color: Color };
    gravityModifier: { constant: number };
    shapeModule: { enable: boolean; shapeType: number; radius: number };
    renderer: { particleMaterial: Material | null };
    play(): void;
    stop(): void;
    clear(): void;
  }

  export const primitives: {
    box(options?: { width?: number; height?: number; length?: number }): unknown;
    sphere(radius?: number, opts?: { segments?: number }): unknown;
    cylinder(radiusTop?: number, radiusBottom?: number, height?: number, opts?: { radialSegments?: number }): unknown;
    cone(radius?: number, height?: number, opts?: { radialSegments?: number }): unknown;
    plane(options?: { width?: number; length?: number; widthSegments?: number; lengthSegments?: number }): unknown;
    torus(radius?: number, tube?: number, opts?: { radialSegments?: number; tubularSegments?: number }): unknown;
    capsule(radiusTop?: number, radiusBottom?: number, height?: number, opts?: { sides?: number; heightSegments?: number }): unknown;
  };

  export const utils: {
    MeshUtils: {
      createMesh(geometry: unknown, out?: Mesh, options?: { calculateBounds?: boolean }): Mesh;
    };
  };

  export namespace geometry {
    export class Ray {
      o: Vec3;
      d: Vec3;
      constructor(ox?: number, oy?: number, oz?: number, dx?: number, dy?: number, dz?: number);
    }
    export class Plane {
      n: Vec3;
      d: number;
      static fromNormalAndPoint(out: Plane, normal: Vec3, point: Vec3): Plane;
    }
    export const intersect: {
      rayPlane(ray: Ray, plane: Plane): number;
    };
  }

  export const gfx: {
    ClearFlagBit?: { NONE: number; COLOR: number; DEPTH: number; STENCIL: number; ALL: number };
    BlendFactor?: {
      ZERO: number;
      ONE: number;
      SRC_ALPHA: number;
      DST_ALPHA: number;
      ONE_MINUS_SRC_ALPHA: number;
      ONE_MINUS_DST_ALPHA: number;
    };
  };

  export const Layers: {
    Enum: { DEFAULT: number; UI_3D: number; UI_2D: number };
  };

  export class Tween<T> {
    to(duration: number, props: Partial<T>, opts?: { easing?: string; onComplete?: () => void }): Tween<T>;
    by(duration: number, props: Partial<T>, opts?: { easing?: string }): Tween<T>;
    call(cb: () => void): Tween<T>;
    delay(duration: number): Tween<T>;
    repeatForever(t?: Tween<T>): Tween<T>;
    start(): Tween<T>;
    stop(): Tween<T>;
  }

  export function tween<T>(target: T): Tween<T>;

  export const builtinResMgr: {
    addAsset(key: string, asset: Asset): void;
    get<T extends Asset>(uuid: string): T;
  };

  export const director: {
    runSceneImmediate(scene: Scene): void;
    getScene(): Scene | null;
    root: {
      pipeline: unknown;
      device: unknown;
    } | null;
  };

  export const Game: {
    EVENT_POST_SUBSYSTEM_INIT: string;
    EVENT_ENGINE_INITED: string;
    EVENT_GAME_INITED: string;
  };

  export const game: {
    canvas: HTMLCanvasElement | null;
    init(config: Record<string, unknown>): Promise<void>;
    run(onLaunched?: () => void): Promise<void>;
    on(event: string, cb: () => void): void;
    once(event: string, cb: () => void): void;
  };

  export const screen: {
    windowSize: { width: number; height: number };
    devicePixelRatio: number;
  };

  export const sys: {
    platform: string;
  };
}

declare module '@/src/vendor/cocos4/builtinEffectsData.json' {
  const effects: Array<Record<string, unknown>>;
  export default effects;
}
