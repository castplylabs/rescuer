import * as cc from '@/src/vendor/cocos4/cc.js';
import {
  BUILDING_CATALOG,
  BuildingType,
  CELL_SIZE,
  GRID_MAX,
  GRID_MIN,
  PetCoat,
  PetEntity,
  PetSpecies,
  UserVillageState,
  cellKey,
} from '@/src/shared/types';
import { VillageLightingController } from './lightingController';
import {
  PetRigHandle,
  addPart,
  animatePetRig,
  attachPetAccessories,
  createBuildingNode,
  createOborTorch,
  createPalmTree,
  createPetRig,
  getSharedMeshes,
} from './meshesAndRigs';
import { createPbrMaterial, getProceduralTextures } from './proceduralTextures';

export interface StrayAnimal {
  id: string;
  species: PetSpecies;
  coat: PetCoat;
  suggestedName: string;
  pos: cc.Vec3;
  target: cc.Vec3;
  rig: PetRigHandle;
  happyTimer: number;
}

export interface SanctuaryCallbacks {
  onSelectBuilding: (buildingId: string) => void;
  onSelectPet: (petId: string) => void;
  onSelectStray: (stray: { id: string; species: PetSpecies; coat: PetCoat; name: string }) => void;
  onGridAction: (gx: number, gz: number) => void;
}

interface OwnedPetAgent {
  pet: PetEntity;
  rig: PetRigHandle;
  pos: cc.Vec3;
  target: cc.Vec3;
  happyTimer: number;
}

interface PlacedBuildingView {
  id: string;
  type: BuildingType;
  level: number;
  gx: number;
  gz: number;
  node: cc.Node;
}

const NEIGHBOR_POSITIONS: Array<[number, number]> = [
  [-17, -20],
  [0, -21],
  [17, -20],
];

class SanctuaryTicker extends cc.Component {
  public onTick?: (dt: number) => void;
  public update(dt: number): void {
    this.onTick?.(dt);
  }
}

export class SanctuarySceneController {
  public scene: cc.Scene;
  public camera: cc.Camera;
  public lighting: VillageLightingController;

  private camNode: cc.Node;
  private camTarget = new cc.Vec3(0, 0.8, 0);
  private camDesiredTarget = new cc.Vec3(0, 0.8, 0);
  private camYaw = 38;
  private camPitch = 34;
  private camDist = 23;
  private camDesiredDist = 23;

  private gridRoot = new cc.Node('GridTiles');
  private buildingsRoot = new cc.Node('PlayerBuildings');
  private petsRoot = new cc.Node('PlayerPets');
  private straysRoot = new cc.Node('StrayAnimals');
  private neighborsRoot = new cc.Node('NeighborCompounds');
  private fxRoot = new cc.Node('EffectsRoot');
  private ghostNode = new cc.Node('BuildGhost');

  private gridTileNodes = new Map<string, { node: cc.Node; mat: cc.Material }>();
  private placedBuildings = new Map<string, PlacedBuildingView>();
  private ownedPets = new Map<string, OwnedPetAgent>();
  private strays: StrayAnimal[] = [];
  private neighborPets: Array<{ rig: PetRigHandle; home: cc.Vec3; phase: number }> = [];

  private callbacks: SanctuaryCallbacks;
  private currentVillage: UserVillageState | null = null;
  private buildMode = false;
  private activeBuildType: BuildingType | null = null;
  private hoverCell: { gx: number; gz: number } | null = null;
  private ghostMat: cc.Material;
  private ghostMeshNode: cc.Node;

  private isDragging = false;
  private pointerDownPos = { x: 0, y: 0 };
  private lastPointerPos = { x: 0, y: 0 };
  private didDrag = false;
  private cleanupInput: (() => void) | null = null;

  constructor(callbacks: SanctuaryCallbacks) {
    this.callbacks = callbacks;
    this.scene = new cc.Scene('KampungSanctuary');

    // Camera
    this.camNode = new cc.Node('SanctuaryCamera');
    this.camera = this.camNode.addComponent(cc.Camera);
    this.camera.fov = 44;
    this.camera.near = 0.5;
    this.camera.far = 160;
    this.scene.addChild(this.camNode);

    this.lighting = new VillageLightingController(this.scene, this.camera, 28);

    this.scene.addChild(this.gridRoot);
    this.scene.addChild(this.buildingsRoot);
    this.scene.addChild(this.petsRoot);
    this.scene.addChild(this.straysRoot);
    this.scene.addChild(this.neighborsRoot);
    this.scene.addChild(this.fxRoot);
    this.scene.addChild(this.ghostNode);

    this.ghostMat = createPbrMaterial({
      colorHex: '#10b981',
      roughness: 0.4,
      transparent: true,
      alpha: 0.48,
      emissiveHex: '#10b981',
      emissiveScale: 0.6,
    });
    this.ghostMeshNode = addPart(
      this.ghostNode,
      'GhostBox',
      getSharedMeshes().box,
      this.ghostMat,
      [0, 0.55, 0],
      [CELL_SIZE * 0.85, 1.1, CELL_SIZE * 0.85],
      undefined,
      false
    );
    this.ghostNode.active = false;

    this.buildStaticVillageEnvironment();
    this.spawnInitialStrays();

    const tickerNode = new cc.Node('SanctuaryTicker');
    const ticker = tickerNode.addComponent(SanctuaryTicker);
    ticker.onTick = (dt) => this.update(dt);
    this.scene.addChild(tickerNode);

    this.updateCameraTransform(1);
  }

  private buildStaticVillageEnvironment(): void {
    const m = getSharedMeshes();
    const tex = getProceduralTextures();

    const env = new cc.Node('StaticKampungEnv');
    this.scene.addChild(env);

    // Broad tropical grass ground
    const grassMat = createPbrMaterial({
      colorHex: '#638f48',
      texture: tex.kampungGrass,
      tiling: [16, 16],
      roughness: 0.92,
    });
    addPart(env, 'GroundField', m.plane, grassMat, [0, -0.02, -4], [95, 1, 95], undefined, false);

    // Packed earth village lane separating player sanctuary & Tetangga compounds
    const roadMat = createPbrMaterial({
      colorHex: '#9d7651',
      texture: tex.earthPath,
      tiling: [12, 2],
      roughness: 0.94,
    });
    addPart(env, 'VillageRoad', m.box, roadMat, [0, 0.01, -12.8], [58, 0.04, 3.6], undefined, false);

    // Bamboo Entry Gate (Gapura) on the road side
    const bambooMat = createPbrMaterial({ colorHex: '#cfa366', texture: tex.bambooWeave, roughness: 0.84 });
    const roofMat = createPbrMaterial({ colorHex: '#bc5632', texture: tex.terracottaTile, roughness: 0.52 });
    addPart(env, 'GatePostL', m.cylinder, bambooMat, [-2.1, 1.5, -10.8], [0.22, 3.0, 0.22]);
    addPart(env, 'GatePostR', m.cylinder, bambooMat, [2.1, 1.5, -10.8], [0.22, 3.0, 0.22]);
    addPart(env, 'GateBeam', m.box, bambooMat, [0, 2.85, -10.8], [4.9, 0.24, 0.28]);
    addPart(env, 'GateRoof', m.cone, roofMat, [0, 3.45, -10.8], [4.6, 0.9, 1.5]);

    // Roadside Obor Torches (dynamic twilight PointLights)
    const torchPositions: Array<[number, number, number]> = [
      [-2.7, 0, -10.5],
      [2.7, 0, -10.5],
      [-11.5, 0, -10.5],
      [11.5, 0, -10.5],
      [-11.5, 0, 10.5],
      [11.5, 0, 10.5],
    ];
    torchPositions.forEach((tp) => {
      env.addChild(createOborTorch(tp, this.lighting, 155));
    });

    // Surrounding Coconut Palms
    const palmCoords: Array<[number, number, number]> = [
      [-14.5, -6, 1.05],
      [-15.2, 5, 0.9],
      [14.5, -4, 1.1],
      [15.0, 7, 0.95],
      [-9, 13.5, 1.0],
      [9, 13.5, 1.15],
      [-25, -18, 1.05],
      [25, -18, 1.0],
    ];
    palmCoords.forEach(([px, pz, sc]) => {
      const palm = createPalmTree(sc);
      palm.setPosition(px, 0, pz);
      palm.setRotationFromEuler(0, (px * 37) % 360, 0);
      env.addChild(palm);
    });

    // Grid Tiles (-3..3 x -3..3)
    for (let gx = GRID_MIN; gx <= GRID_MAX; gx++) {
      for (let gz = GRID_MIN; gz <= GRID_MAX; gz++) {
        const tileNode = new cc.Node(`Tile_${gx}_${gz}`);
        tileNode.setPosition(gx * CELL_SIZE, 0.025, gz * CELL_SIZE);
        const mat = createPbrMaterial({
          colorHex: '#7da15c',
          roughness: 0.88,
          transparent: true,
          alpha: 0.25,
        });
        addPart(
          tileNode,
          'TileSurface',
          m.box,
          mat,
          [0, 0, 0],
          [CELL_SIZE * 0.92, 0.04, CELL_SIZE * 0.92],
          undefined,
          false
        );
        this.gridRoot.addChild(tileNode);
        this.gridTileNodes.set(cellKey(gx, gz), { node: tileNode, mat });
      }
    }
  }

  private spawnInitialStrays(): void {
    const specs: Array<{ id: string; species: PetSpecies; coat: PetCoat; name: string; x: number; z: number }> = [
      { id: 'stray-cat', species: 'cat', coat: 'tabby', name: 'Oyen', x: -2.4, z: -9.4 },
      { id: 'stray-dog', species: 'dog', coat: 'spotted', name: 'Bobi', x: 2.6, z: -9.6 },
      { id: 'stray-duck', species: 'duck', coat: 'white', name: 'Kwek', x: 0.4, z: -10.0 },
    ];
    for (const s of specs) {
      const rig = createPetRig(s.species, s.coat, {});
      rig.root.setPosition(s.x, 0, s.z);
      this.straysRoot.addChild(rig.root);
      this.strays.push({
        id: s.id,
        species: s.species,
        coat: s.coat,
        suggestedName: s.name,
        pos: new cc.Vec3(s.x, 0, s.z),
        target: new cc.Vec3(s.x + (Math.random() - 0.5) * 2.5, 0, s.z + (Math.random() - 0.5) * 1.5),
        rig,
        happyTimer: 0,
      });
    }
  }

  public syncVillage(village: UserVillageState): void {
    this.currentVillage = village;
    this.lighting.applyTimeOfDay(village.timeOfDay);
    this.refreshGridTileVisuals();

    // Sync Placed Buildings
    const nextIds = new Set(village.buildings.map((b) => b.id));
    for (const [id, existing] of this.placedBuildings.entries()) {
      if (!nextIds.has(id)) {
        existing.node.destroy();
        this.placedBuildings.delete(id);
      }
    }

    for (const b of village.buildings) {
      const prev = this.placedBuildings.get(b.id);
      if (!prev || prev.level !== b.level || prev.gx !== b.gx || prev.gz !== b.gz) {
        const isUpgrade = Boolean(prev && prev.level !== b.level);
        if (prev) prev.node.destroy();

        const { node } = createBuildingNode(b.type, b.level, this.lighting);
        const offset = BUILDING_CATALOG[b.type].footprint === 2 ? CELL_SIZE * 0.5 : 0;
        const wx = b.gx * CELL_SIZE + offset;
        const wz = b.gz * CELL_SIZE + offset;
        node.setPosition(wx, 0, wz);
        this.buildingsRoot.addChild(node);

        if (!prev || isUpgrade) {
          node.setScale(0.72, 0.72, 0.72);
          cc.tween(node)
            .to(0.28, { scale: new cc.Vec3(1.06, 1.06, 1.06) })
            .to(0.14, { scale: new cc.Vec3(1, 1, 1) })
            .start();
          this.spawnSparkBurst(new cc.Vec3(wx, 1.4, wz), '#fbbf24');
        }

        this.placedBuildings.set(b.id, {
          id: b.id,
          type: b.type,
          level: b.level,
          gx: b.gx,
          gz: b.gz,
          node,
        });
      }
    }

    // Sync Owned Pets
    const petIds = new Set(village.pets.map((p) => p.id));
    for (const [id, agent] of this.ownedPets.entries()) {
      if (!petIds.has(id)) {
        agent.rig.root.destroy();
        this.ownedPets.delete(id);
      }
    }

    village.pets.forEach((pet, idx) => {
      const existing = this.ownedPets.get(pet.id);
      if (existing) {
        existing.pet = pet;
        attachPetAccessories(existing.rig, pet.equipped);
      } else {
        const rig = createPetRig(pet.species, pet.coat, pet.equipped);
        const angle = idx * 1.9;
        const px = Math.cos(angle) * 2.2;
        const pz = Math.sin(angle) * 2.2;
        rig.root.setPosition(px, 0, pz);
        this.petsRoot.addChild(rig.root);
        this.ownedPets.set(pet.id, {
          pet,
          rig,
          pos: new cc.Vec3(px, 0, pz),
          target: new cc.Vec3(-px, 0, -pz),
          happyTimer: 0,
        });
      }
    });
  }

  public syncRemoteNeighbors(neighbors: UserVillageState[]): void {
    this.neighborsRoot.destroyAllChildren();
    this.neighborPets = [];
    const m = getSharedMeshes();
    const tex = getProceduralTextures();
    const fenceMat = createPbrMaterial({ colorHex: '#b48a4e', texture: tex.bambooWeave, roughness: 0.85 });
    const groundMat = createPbrMaterial({ colorHex: '#6c8f52', roughness: 0.9 });

    neighbors.slice(0, 3).forEach((nb, idx) => {
      const [nx, nz] = NEIGHBOR_POSITIONS[idx];
      const compound = new cc.Node(`Compound_${nb.id}`);
      compound.setPosition(nx, 0, nz);
      this.neighborsRoot.addChild(compound);

      addPart(compound, 'PlotPad', m.box, groundMat, [0, 0.02, 0], [11.5, 0.04, 10.5], undefined, false);
      addPart(compound, 'FenceFrontL', m.box, fenceMat, [-3.4, 0.35, 5.1], [4.2, 0.5, 0.12]);
      addPart(compound, 'FenceFrontR', m.box, fenceMat, [3.4, 0.35, 5.1], [4.2, 0.5, 0.12]);

      nb.buildings.slice(0, 4).forEach((b) => {
        const { node } = createBuildingNode(b.type, b.level, this.lighting, nb.id);
        node.setPosition(b.gx * 2.8, 0, b.gz * 2.8);
        compound.addChild(node);
      });

      nb.pets.slice(0, 2).forEach((pet, pIdx) => {
        const rig = createPetRig(pet.species, pet.coat, pet.equipped);
        const px = (pIdx === 0 ? -1.8 : 1.8);
        const pz = 2.6;
        rig.root.setPosition(px, 0, pz);
        compound.addChild(rig.root);
        this.neighborPets.push({
          rig,
          home: new cc.Vec3(px, 0, pz),
          phase: Math.random() * Math.PI * 2,
        });
      });
    });
  }

  public focusCompound(index: -1 | 0 | 1 | 2): void {
    if (index === -1) {
      this.camDesiredTarget.set(0, 0.8, 0);
      this.camDesiredDist = 23;
    } else {
      const [nx, nz] = NEIGHBOR_POSITIONS[index] || [0, -20];
      this.camDesiredTarget.set(nx, 0.9, nz);
      this.camDesiredDist = 17.5;
    }
  }

  public focusPet(petId: string): void {
    const agent = this.ownedPets.get(petId);
    if (!agent) return;
    this.camDesiredTarget.set(agent.pos.x, 0.65, agent.pos.z);
    this.camDesiredDist = 11.5;
  }

  public triggerPetCelebration(petId: string): void {
    const agent = this.ownedPets.get(petId);
    if (!agent) return;
    agent.happyTimer = 1.6;
    this.spawnSparkBurst(new cc.Vec3(agent.pos.x, 0.85, agent.pos.z), '#34d399');
  }

  public removeStray(strayId: string): void {
    const idx = this.strays.findIndex((s) => s.id === strayId);
    if (idx === -1) return;
    const [removed] = this.strays.splice(idx, 1);
    this.spawnSparkBurst(new cc.Vec3(removed.pos.x, 0.8, removed.pos.z), '#fbbf24');
    removed.rig.root.destroy();
  }

  public setBuildMode(enabled: boolean, buildType: BuildingType | null): void {
    this.buildMode = enabled;
    this.activeBuildType = buildType;
    this.refreshGridTileVisuals();
    if (!enabled) {
      this.ghostNode.active = false;
      this.hoverCell = null;
    }
  }

  public setTimeOfDay(timeOfDay: number): void {
    this.lighting.applyTimeOfDay(timeOfDay);
  }

  public attachInputListeners(canvas: HTMLCanvasElement): void {
    this.detachInputListeners();

    const onPointerDown = (e: PointerEvent) => {
      this.isDragging = true;
      this.didDrag = false;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastPointerPos.x;
        const dy = e.clientY - this.lastPointerPos.y;
        const totalDist =
          Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
        if (totalDist > 5) this.didDrag = true;

        this.camYaw -= dx * 0.34;
        this.camPitch = Math.max(16, Math.min(64, this.camPitch + dy * 0.26));
        this.lastPointerPos = { x: e.clientX, y: e.clientY };
      }

      if (this.buildMode) {
        this.updateBuildHover(canvas, e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasDrag = this.didDrag;
      this.isDragging = false;
      if (!wasDrag) {
        this.handleCanvasClick(canvas, e.clientX, e.clientY);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.camDesiredDist = Math.max(9, Math.min(36, this.camDesiredDist + e.deltaY * 0.015));
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    this.cleanupInput = () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }

  public detachInputListeners(): void {
    this.cleanupInput?.();
    this.cleanupInput = null;
  }

  private screenToGroundPoint(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number
  ): cc.Vec3 | null {
    const rect = canvas.getBoundingClientRect();
    const dpr = cc.screen.devicePixelRatio || window.devicePixelRatio || 1;
    // Cocos 4 screenPointToRay expects screen coordinates with Y flipped from DOM top-left
    const sx = (clientX - rect.left) * dpr;
    const sy = (rect.height - (clientY - rect.top)) * dpr;
    const ray = this.camera.screenPointToRay(sx, sy);
    const plane = cc.geometry.Plane.fromNormalAndPoint(
      new cc.geometry.Plane(),
      new cc.Vec3(0, 1, 0),
      new cc.Vec3(0, 0, 0)
    );
    const t = cc.geometry.intersect.rayPlane(ray, plane);
    if (!t || t <= 0) return null;
    return new cc.Vec3(ray.o.x + ray.d.x * t, 0, ray.o.z + ray.d.z * t);
  }

  private updateBuildHover(canvas: HTMLCanvasElement, clientX: number, clientY: number): void {
    const pt = this.screenToGroundPoint(canvas, clientX, clientY);
    if (!pt) {
      this.ghostNode.active = false;
      return;
    }
    const gx = Math.round(pt.x / CELL_SIZE);
    const gz = Math.round(pt.z / CELL_SIZE);
    if (gx < GRID_MIN || gx > GRID_MAX || gz < GRID_MIN || gz > GRID_MAX) {
      this.ghostNode.active = false;
      this.hoverCell = null;
      return;
    }
    this.hoverCell = { gx, gz };
    if (!this.activeBuildType || !this.currentVillage) {
      this.ghostNode.active = true;
      this.ghostNode.setPosition(gx * CELL_SIZE, 0.05, gz * CELL_SIZE);
      this.ghostMeshNode.setScale(CELL_SIZE * 0.85, 0.12, CELL_SIZE * 0.85);
      this.ghostMeshNode.setPosition(0, 0.06, 0);
      const isUnlocked = this.currentVillage?.unlockedCells.includes(cellKey(gx, gz));
      const c = cc.color(isUnlocked ? '#38bdf8' : '#f59e0b');
      c.a = 122;
      this.ghostMat.setProperty('mainColor', c);
      return;
    }

    const footprint = BUILDING_CATALOG[this.activeBuildType].footprint;
    const canPlace = this.canPlaceAt(gx, gz, footprint);
    const offset = footprint === 2 ? CELL_SIZE * 0.5 : 0;
    this.ghostNode.active = true;
    this.ghostNode.setPosition(gx * CELL_SIZE + offset, 0, gz * CELL_SIZE + offset);
    this.ghostMeshNode.setScale(
      CELL_SIZE * footprint * 0.85,
      1.3,
      CELL_SIZE * footprint * 0.85
    );
    this.ghostMeshNode.setPosition(0, 0.65, 0);
    const c = cc.color(canPlace ? '#10b981' : '#ef4444');
    c.a = 122;
    this.ghostMat.setProperty('mainColor', c);
  }

  public canPlaceAt(gx: number, gz: number, footprint: 1 | 2): boolean {
    if (!this.currentVillage) return false;
    const cellsNeeded: Array<[number, number]> =
      footprint === 2
        ? [
            [gx, gz],
            [gx + 1, gz],
            [gx, gz + 1],
            [gx + 1, gz + 1],
          ]
        : [[gx, gz]];

    for (const [cx, cz] of cellsNeeded) {
      if (cx < GRID_MIN || cx > GRID_MAX || cz < GRID_MIN || cz > GRID_MAX) return false;
      if (!this.currentVillage.unlockedCells.includes(cellKey(cx, cz))) return false;
      for (const b of this.currentVillage.buildings) {
        const bf = BUILDING_CATALOG[b.type].footprint;
        for (let bx = b.gx; bx < b.gx + bf; bx++) {
          for (let bz = b.gz; bz < b.gz + bf; bz++) {
            if (bx === cx && bz === cz) return false;
          }
        }
      }
    }
    return true;
  }

  private handleCanvasClick(canvas: HTMLCanvasElement, clientX: number, clientY: number): void {
    const pt = this.screenToGroundPoint(canvas, clientX, clientY);
    if (!pt) return;

    if (this.buildMode) {
      const gx = Math.round(pt.x / CELL_SIZE);
      const gz = Math.round(pt.z / CELL_SIZE);
      if (gx >= GRID_MIN && gx <= GRID_MAX && gz >= GRID_MIN && gz <= GRID_MAX) {
        this.callbacks.onGridAction(gx, gz);
      }
      return;
    }

    // Check stray animals first
    for (const s of this.strays) {
      if (cc.Vec3.distance(pt, s.pos) < 1.35) {
        this.callbacks.onSelectStray({
          id: s.id,
          species: s.species,
          coat: s.coat,
          name: s.suggestedName,
        });
        return;
      }
    }

    // Check owned pets
    for (const agent of this.ownedPets.values()) {
      if (cc.Vec3.distance(pt, agent.pos) < 1.25) {
        this.callbacks.onSelectPet(agent.pet.id);
        return;
      }
    }

    // Check placed buildings
    if (this.currentVillage) {
      for (const b of this.currentVillage.buildings) {
        const fp = BUILDING_CATALOG[b.type].footprint;
        const offset = fp === 2 ? CELL_SIZE * 0.5 : 0;
        const bPos = new cc.Vec3(b.gx * CELL_SIZE + offset, 0, b.gz * CELL_SIZE + offset);
        if (cc.Vec3.distance(pt, bPos) < CELL_SIZE * 0.58 * fp) {
          this.callbacks.onSelectBuilding(b.id);
          return;
        }
      }
    }
  }

  private refreshGridTileVisuals(): void {
    if (!this.currentVillage) return;
    for (let gx = GRID_MIN; gx <= GRID_MAX; gx++) {
      for (let gz = GRID_MIN; gz <= GRID_MAX; gz++) {
        const key = cellKey(gx, gz);
        const tile = this.gridTileNodes.get(key);
        if (!tile) continue;
        const unlocked = this.currentVillage.unlockedCells.includes(key);
        tile.node.active = this.buildMode || unlocked;
        if (unlocked) {
          const c = cc.color(this.buildMode ? '#86efac' : '#7ea35e');
          c.a = Math.round((this.buildMode ? 0.45 : 0.16) * 255);
          tile.mat.setProperty('mainColor', c);
        } else {
          const c = cc.color('#fbbf24');
          c.a = Math.round(0.25 * 255);
          tile.mat.setProperty('mainColor', c);
        }
      }
    }
  }

  private spawnSparkBurst(center: cc.Vec3, colorHex: string): void {
    const m = getSharedMeshes();
    const mat = createPbrMaterial({
      colorHex,
      emissiveHex: colorHex,
      emissiveScale: 2.2,
      roughness: 0.2,
    });
    for (let i = 0; i < 8; i++) {
      const spark = addPart(
        this.fxRoot,
        `Spark_${i}`,
        m.sphere,
        mat,
        [center.x, center.y, center.z],
        [0.16, 0.16, 0.16],
        undefined,
        false
      );
      const ang = (i / 8) * Math.PI * 2;
      const dest = new cc.Vec3(
        center.x + Math.cos(ang) * 1.4,
        center.y + 1.1 + Math.random() * 0.6,
        center.z + Math.sin(ang) * 1.4
      );
      cc.tween(spark)
        .to(0.45, { position: dest, scale: new cc.Vec3(0.02, 0.02, 0.02) })
        .call(() => spark.destroy())
        .start();
    }
  }

  private updateCameraTransform(lerpAlpha: number): void {
    cc.Vec3.lerp(this.camTarget, this.camTarget, this.camDesiredTarget, lerpAlpha);
    this.camDist += (this.camDesiredDist - this.camDist) * lerpAlpha;

    const yawRad = (this.camYaw * Math.PI) / 180;
    const pitchRad = (this.camPitch * Math.PI) / 180;
    const horiz = Math.cos(pitchRad) * this.camDist;
    const cx = this.camTarget.x + Math.sin(yawRad) * horiz;
    const cy = this.camTarget.y + Math.sin(pitchRad) * this.camDist;
    const cz = this.camTarget.z + Math.cos(yawRad) * horiz;

    this.camNode.setPosition(cx, cy, cz);
    this.camNode.lookAt(this.camTarget);
  }

  private update(dt: number): void {
    const safeDt = Math.min(0.05, dt);
    this.lighting.tick(safeDt);
    this.updateCameraTransform(Math.min(1, safeDt * 7.5));

    // Wander owned pets smoothly inside the sanctuary
    for (const agent of this.ownedPets.values()) {
      if (agent.happyTimer > 0) {
        agent.happyTimer = Math.max(0, agent.happyTimer - safeDt);
        animatePetRig(agent.rig, 'happy', safeDt);
        continue;
      }
      const dist = cc.Vec3.distance(agent.pos, agent.target);
      if (dist < 0.25) {
        if (Math.random() < 0.018) {
          agent.target.set(
            (Math.random() - 0.5) * 9,
            0,
            (Math.random() - 0.5) * 9
          );
        }
        animatePetRig(agent.rig, 'idle', safeDt);
      } else {
        const dx = agent.target.x - agent.pos.x;
        const dz = agent.target.z - agent.pos.z;
        const speed = 1.45;
        agent.pos.x += (dx / dist) * speed * safeDt;
        agent.pos.z += (dz / dist) * speed * safeDt;
        agent.rig.root.setPosition(agent.pos);
        const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
        agent.rig.root.setRotationFromEuler(0, yaw, 0);
        animatePetRig(agent.rig, 'trot', safeDt);
      }
    }

    // Wander strays near village gate
    for (const stray of this.strays) {
      const dist = cc.Vec3.distance(stray.pos, stray.target);
      if (dist < 0.2) {
        if (Math.random() < 0.025) {
          stray.target.set((Math.random() - 0.5) * 7, 0, -9.8 + (Math.random() - 0.5) * 1.6);
        }
        animatePetRig(stray.rig, 'idle', safeDt);
      } else {
        const dx = stray.target.x - stray.pos.x;
        const dz = stray.target.z - stray.pos.z;
        stray.pos.x += (dx / dist) * 1.15 * safeDt;
        stray.pos.z += (dz / dist) * 1.15 * safeDt;
        stray.rig.root.setPosition(stray.pos);
        stray.rig.root.setRotationFromEuler(0, (Math.atan2(dx, dz) * 180) / Math.PI, 0);
        animatePetRig(stray.rig, 'trot', safeDt);
      }
    }

    // Subtle idle animation for neighbor pets across the lane
    for (const np of this.neighborPets) {
      animatePetRig(np.rig, 'idle', safeDt);
    }
  }
}
