import * as cc from '@/src/vendor/cocos4/cc.js';
import {
  ACCESSORY_CATALOG,
  BuildingType,
  PetCoat,
  PetEntity,
  PetSpecies,
} from '@/src/shared/types';
import { LanternFixture, VillageLightingController } from './lightingController';
import { createPbrMaterial, getProceduralTextures } from './proceduralTextures';

interface SharedMeshes {
  box: cc.Mesh;
  sphere: cc.Mesh;
  cylinder: cc.Mesh;
  cone: cc.Mesh;
  plane: cc.Mesh;
  torus: cc.Mesh;
}

let sharedMeshes: SharedMeshes | null = null;

export function getSharedMeshes(): SharedMeshes {
  if (sharedMeshes) return sharedMeshes;
  sharedMeshes = {
    box: cc.utils.MeshUtils.createMesh(cc.primitives.box({ width: 1, height: 1, length: 1 })),
    sphere: cc.utils.MeshUtils.createMesh(cc.primitives.sphere(0.5, { segments: 18 })),
    cylinder: cc.utils.MeshUtils.createMesh(
      cc.primitives.cylinder(0.5, 0.5, 1, { radialSegments: 16 })
    ),
    cone: cc.utils.MeshUtils.createMesh(cc.primitives.cone(0.5, 1, { radialSegments: 16 })),
    plane: cc.utils.MeshUtils.createMesh(
      cc.primitives.plane({ width: 1, length: 1, widthSegments: 1, lengthSegments: 1 })
    ),
    torus: cc.utils.MeshUtils.createMesh(
      cc.primitives.torus(0.5, 0.14, { radialSegments: 12, tubularSegments: 20 })
    ),
  };
  return sharedMeshes;
}

const SHADOW_CAST_OFF = 0;
const SHADOW_CAST_ON = 1;
const SHADOW_RECEIVE_ON = 1;

export function addPart(
  parent: cc.Node,
  name: string,
  mesh: cc.Mesh,
  mat: cc.Material,
  pos: [number, number, number],
  scale: [number, number, number],
  rot?: [number, number, number],
  castShadow = true
): cc.Node {
  const n = new cc.Node(name);
  n.setPosition(pos[0], pos[1], pos[2]);
  n.setScale(scale[0], scale[1], scale[2]);
  if (rot) n.setRotationFromEuler(rot[0], rot[1], rot[2]);
  const mr = n.addComponent(cc.MeshRenderer);
  mr.mesh = mesh;
  mr.setSharedMaterial(mat, 0);
  mr.shadowCastingMode = castShadow ? SHADOW_CAST_ON : SHADOW_CAST_OFF;
  mr.receiveShadow = SHADOW_RECEIVE_ON;
  parent.addChild(n);
  return n;
}

// ==========================================
// Articulated 3D Kampung Pet Rigs + Sockets
// ==========================================

export interface PetRigHandle {
  root: cc.Node;
  body: cc.Node;
  head: cc.Node;
  tail: cc.Node;
  legs: cc.Node[];
  wings: cc.Node[];
  socketHead: cc.Node;
  socketNeck: cc.Node;
  socketBack: cc.Node;
  phase: number;
}

function getCoatColors(species: PetSpecies, coat: PetCoat): {
  primary: string;
  secondary: string;
  accent: string;
} {
  if (species === 'duck') {
    if (coat === 'brown') return { primary: '#8a623c', secondary: '#5e3f23', accent: '#ea580c' };
    return { primary: '#f5efe2', secondary: '#e4d8c0', accent: '#f97316' };
  }
  switch (coat) {
    case 'calico':
      return { primary: '#f3ead8', secondary: '#d97736', accent: '#3c2a1e' };
    case 'tabby':
      return { primary: '#d58946', secondary: '#9e531e', accent: '#f3dfc1' };
    case 'black':
      return { primary: '#2d2926', secondary: '#453e38', accent: '#d6c7b2' };
    case 'spotted':
      return { primary: '#e7dfd3', secondary: '#5b4331', accent: '#b8764a' };
    case 'brown':
      return { primary: '#8b5a36', secondary: '#5c381f', accent: '#d8b48a' };
    case 'tan':
    default:
      return { primary: '#d4a36a', secondary: '#9c6c3b', accent: '#f5e4c8' };
  }
}

export function createPetRig(
  species: PetSpecies,
  coat: PetCoat,
  equipped: PetEntity['equipped']
): PetRigHandle {
  const m = getSharedMeshes();
  const palette = getCoatColors(species, coat);
  const primaryMat = createPbrMaterial({ colorHex: palette.primary, roughness: 0.72 });
  const secondaryMat = createPbrMaterial({ colorHex: palette.secondary, roughness: 0.76 });
  const accentMat = createPbrMaterial({ colorHex: palette.accent, roughness: 0.55 });
  const eyeMat = createPbrMaterial({ colorHex: '#181412', roughness: 0.2, specular: 0.9 });
  const noseMat = createPbrMaterial({ colorHex: '#fb7185', roughness: 0.45 });

  const root = new cc.Node(`Pet_${species}`);
  const body = new cc.Node('BodyRoot');
  root.addChild(body);

  const head = new cc.Node('HeadRoot');
  const tail = new cc.Node('TailRoot');
  const legs: cc.Node[] = [];
  const wings: cc.Node[] = [];

  if (species === 'duck') {
    // Plump Bebek Kampung duck
    addPart(body, 'Torso', m.sphere, primaryMat, [0, 0.36, 0], [0.46, 0.36, 0.58]);
    addPart(body, 'Breast', m.sphere, secondaryMat, [0, 0.32, 0.16], [0.38, 0.28, 0.34]);

    head.setPosition(0, 0.64, 0.22);
    body.addChild(head);
    addPart(head, 'Skull', m.sphere, primaryMat, [0, 0, 0], [0.3, 0.28, 0.3]);
    addPart(head, 'Bill', m.box, accentMat, [0, -0.04, 0.2], [0.16, 0.06, 0.2]);
    addPart(head, 'EyeL', m.sphere, eyeMat, [-0.1, 0.04, 0.11], [0.055, 0.055, 0.055]);
    addPart(head, 'EyeR', m.sphere, eyeMat, [0.1, 0.04, 0.11], [0.055, 0.055, 0.055]);

    const wingL = addPart(body, 'WingL', m.sphere, secondaryMat, [-0.24, 0.38, 0], [0.1, 0.22, 0.38], [0, 0, 12]);
    const wingR = addPart(body, 'WingR', m.sphere, secondaryMat, [0.24, 0.38, 0], [0.1, 0.22, 0.38], [0, 0, -12]);
    wings.push(wingL, wingR);

    tail.setPosition(0, 0.44, -0.28);
    body.addChild(tail);
    addPart(tail, 'TailTip', m.cone, secondaryMat, [0, 0.04, -0.08], [0.16, 0.18, 0.18], [-55, 0, 0]);

    const legL = addPart(body, 'FootL', m.box, accentMat, [-0.11, 0.08, 0.02], [0.1, 0.16, 0.18]);
    const legR = addPart(body, 'FootR', m.box, accentMat, [0.11, 0.08, 0.02], [0.1, 0.16, 0.18]);
    legs.push(legL, legR);
  } else {
    const isDog = species === 'dog';
    const bodyScale: [number, number, number] = isDog ? [0.44, 0.38, 0.72] : [0.36, 0.32, 0.58];
    const legH = isDog ? 0.32 : 0.26;
    const bodyY = legH + 0.14;

    addPart(body, 'Torso', m.box, primaryMat, [0, bodyY, 0], bodyScale);
    addPart(body, 'SpotBack', m.box, secondaryMat, [0, bodyY + 0.04, -0.05], [
      bodyScale[0] * 0.85,
      bodyScale[1] * 0.75,
      bodyScale[2] * 0.48,
    ]);

    head.setPosition(0, bodyY + 0.24, bodyScale[2] * 0.48);
    body.addChild(head);
    const hScale = isDog ? 0.36 : 0.32;
    addPart(head, 'Skull', m.box, primaryMat, [0, 0, 0], [hScale, hScale * 0.9, hScale * 0.95]);
    addPart(
      head,
      'Snout',
      m.box,
      accentMat,
      [0, -0.05, hScale * 0.48],
      [hScale * 0.52, hScale * 0.4, hScale * 0.45]
    );
    addPart(head, 'Nose', m.sphere, noseMat, [0, -0.01, hScale * 0.72], [0.07, 0.06, 0.06]);
    addPart(head, 'EyeL', m.sphere, eyeMat, [-hScale * 0.3, 0.05, hScale * 0.45], [0.055, 0.055, 0.055]);
    addPart(head, 'EyeR', m.sphere, eyeMat, [hScale * 0.3, 0.05, hScale * 0.45], [0.055, 0.055, 0.055]);

    // Ears
    if (isDog) {
      addPart(head, 'EarL', m.box, secondaryMat, [-hScale * 0.52, 0.04, 0], [0.08, 0.2, 0.12], [0, 0, 16]);
      addPart(head, 'EarR', m.box, secondaryMat, [hScale * 0.52, 0.04, 0], [0.08, 0.2, 0.12], [0, 0, -16]);
    } else {
      addPart(head, 'EarL', m.cone, secondaryMat, [-hScale * 0.34, hScale * 0.55, 0], [0.12, 0.16, 0.12], [0, 0, 12]);
      addPart(head, 'EarR', m.cone, secondaryMat, [hScale * 0.34, hScale * 0.55, 0], [0.12, 0.16, 0.12], [0, 0, -12]);
    }

    // Tail
    tail.setPosition(0, bodyY + 0.1, -bodyScale[2] * 0.48);
    body.addChild(tail);
    addPart(
      tail,
      'TailMesh',
      m.cylinder,
      secondaryMat,
      [0, 0.14, -0.14],
      [0.08, 0.34, 0.08],
      [-52, 0, 0]
    );

    // 4 Legs
    const lx = bodyScale[0] * 0.34;
    const lz = bodyScale[2] * 0.34;
    const legOffsets: Array<[number, number]> = [
      [-lx, lz],
      [lx, lz],
      [-lx, -lz],
      [lx, -lz],
    ];
    legOffsets.forEach(([ox, oz], idx) => {
      const legPivot = new cc.Node(`Leg_${idx}`);
      legPivot.setPosition(ox, legH, oz);
      body.addChild(legPivot);
      addPart(legPivot, 'LegMesh', m.box, primaryMat, [0, -legH * 0.5, 0], [0.1, legH, 0.1]);
      legs.push(legPivot);
    });
  }

  // Named Socket Nodes for 3D Accessories
  const socketHead = new cc.Node('Socket_Head');
  socketHead.setPosition(0, species === 'duck' ? 0.16 : 0.18, 0);
  head.addChild(socketHead);

  const socketNeck = new cc.Node('Socket_Neck');
  socketNeck.setPosition(0, species === 'duck' ? -0.14 : -0.15, 0.04);
  head.addChild(socketNeck);

  const socketBack = new cc.Node('Socket_Back');
  socketBack.setPosition(0, species === 'duck' ? 0.54 : 0.62, -0.02);
  body.addChild(socketBack);

  const rig: PetRigHandle = {
    root,
    body,
    head,
    tail,
    legs,
    wings,
    socketHead,
    socketNeck,
    socketBack,
    phase: Math.random() * Math.PI * 2,
  };

  attachPetAccessories(rig, equipped);
  return rig;
}

export function attachPetAccessories(
  rig: PetRigHandle,
  equipped: PetEntity['equipped']
): void {
  rig.socketHead.destroyAllChildren();
  rig.socketNeck.destroyAllChildren();
  rig.socketBack.destroyAllChildren();

  const m = getSharedMeshes();
  const tex = getProceduralTextures();

  if (equipped.head) {
    const spec = ACCESSORY_CATALOG.find((a) => a.id === equipped.head);
    if (spec?.id === 'caping') {
      const hatMat = createPbrMaterial({
        colorHex: '#f0d8a8',
        texture: tex.bambooWeave,
        roughness: 0.78,
      });
      addPart(rig.socketHead, 'CapingCone', m.cone, hatMat, [0, 0.08, 0], [0.56, 0.24, 0.56]);
    } else if (spec?.id === 'blangkon') {
      const clothMat = createPbrMaterial({
        colorHex: '#b47b4e',
        texture: tex.batikCloth,
        roughness: 0.7,
      });
      addPart(rig.socketHead, 'BlangkonBase', m.cylinder, clothMat, [0, 0.04, 0], [0.36, 0.14, 0.36]);
      addPart(rig.socketHead, 'BlangkonKnot', m.sphere, clothMat, [0, 0.04, -0.18], [0.14, 0.14, 0.14]);
    }
  }

  if (equipped.neck) {
    const spec = ACCESSORY_CATALOG.find((a) => a.id === equipped.neck);
    if (spec?.id === 'kalung_batik') {
      const batikMat = createPbrMaterial({
        colorHex: '#e08a3c',
        texture: tex.batikCloth,
        roughness: 0.65,
      });
      addPart(rig.socketNeck, 'BatikCollar', m.torus, batikMat, [0, 0, 0], [0.24, 0.24, 0.24], [75, 0, 0]);
    } else if (spec?.id === 'lonceng') {
      const collarMat = createPbrMaterial({ colorHex: '#991b1b', roughness: 0.6 });
      const brassMat = createPbrMaterial({
        colorHex: '#fbbf24',
        metallic: 0.85,
        roughness: 0.22,
        specular: 0.95,
      });
      addPart(rig.socketNeck, 'CollarStrap', m.torus, collarMat, [0, 0, 0], [0.22, 0.22, 0.22], [75, 0, 0]);
      addPart(rig.socketNeck, 'BrassBell', m.sphere, brassMat, [0, -0.1, 0.18], [0.12, 0.12, 0.12]);
    }
  }

  if (equipped.back) {
    const spec = ACCESSORY_CATALOG.find((a) => a.id === equipped.back);
    if (spec?.id === 'sayap_layangan') {
      const kiteMat = createPbrMaterial({
        colorHex: '#14b8a6',
        texture: tex.batikCloth,
        roughness: 0.45,
      });
      const frameMat = createPbrMaterial({ colorHex: '#d4a359', roughness: 0.7 });
      addPart(rig.socketBack, 'KiteWingL', m.box, kiteMat, [-0.24, 0.08, -0.06], [0.36, 0.03, 0.24], [8, 18, 22]);
      addPart(rig.socketBack, 'KiteWingR', m.box, kiteMat, [0.24, 0.08, -0.06], [0.36, 0.03, 0.24], [8, -18, -22]);
      addPart(rig.socketBack, 'KiteSpar', m.cylinder, frameMat, [0, 0.06, -0.06], [0.05, 0.48, 0.05], [0, 0, 90]);
    }
  }
}

export function animatePetRig(
  rig: PetRigHandle,
  mode: 'idle' | 'trot' | 'race' | 'happy',
  dt: number,
  speedMult = 1
): void {
  const rate = mode === 'race' ? 14 * speedMult : mode === 'trot' ? 8 : mode === 'happy' ? 12 : 2.6;
  rig.phase += dt * rate;
  const p = rig.phase;

  if (mode === 'idle') {
    rig.body.setPosition(0, Math.sin(p) * 0.015, 0);
    rig.head.setRotationFromEuler(Math.sin(p * 0.7) * 4, Math.cos(p * 0.5) * 6, 0);
    rig.tail.setRotationFromEuler(0, Math.sin(p * 2.2) * 18, 0);
    rig.legs.forEach((l) => l.setRotationFromEuler(0, 0, 0));
  } else if (mode === 'happy') {
    rig.body.setPosition(0, Math.abs(Math.sin(p)) * 0.24, 0);
    rig.head.setRotationFromEuler(-10, Math.sin(p * 1.4) * 14, 0);
    rig.tail.setRotationFromEuler(0, Math.sin(p * 3.5) * 32, 0);
  } else {
    const stride = mode === 'race' ? 38 : 22;
    rig.body.setPosition(0, Math.abs(Math.sin(p * 2)) * (mode === 'race' ? 0.09 : 0.04), 0);
    rig.head.setRotationFromEuler(mode === 'race' ? 8 : 2, Math.sin(p) * 5, 0);
    rig.tail.setRotationFromEuler(0, Math.sin(p * 1.8) * 24, 0);
    rig.legs.forEach((l, idx) => {
      const sign = idx === 0 || idx === 3 ? 1 : -1;
      l.setRotationFromEuler(Math.sin(p) * stride * sign, 0, 0);
    });
    rig.wings.forEach((w, idx) => {
      w.setRotationFromEuler(0, 0, (idx === 0 ? 1 : -1) * (15 + Math.sin(p * 2) * 18));
    });
  }
}

// ==========================================
// Indonesian Buildings: Level 1 -> Level 10
// ==========================================

export function createBuildingNode(
  type: BuildingType,
  level: number,
  lighting: VillageLightingController | null,
  ownerTag?: string
): { node: cc.Node; fixtures: LanternFixture[] } {
  const m = getSharedMeshes();
  const tex = getProceduralTextures();
  const clampedLv = Math.max(1, Math.min(10, level));
  const tier = clampedLv >= 10 ? 4 : clampedLv >= 7 ? 3 : clampedLv >= 4 ? 2 : 1;
  const footprintScale = type === 'arena' ? 1.85 : 1.0;

  const bambooMat = createPbrMaterial({ colorHex: '#d5ae72', texture: tex.bambooWeave, roughness: 0.85 });
  const teakMat = createPbrMaterial({ colorHex: '#8d5b37', texture: tex.teakWood, roughness: 0.65 });
  const thatchMat = createPbrMaterial({ colorHex: '#806440', texture: tex.thatchRoof, roughness: 0.92 });
  const terracottaMat = createPbrMaterial({
    colorHex: '#cc603a',
    texture: tex.terracottaTile,
    roughness: 0.48,
    specular: 0.6,
  });
  const batikMat = createPbrMaterial({ colorHex: '#d89b4a', texture: tex.batikCloth, roughness: 0.68 });
  const goldMat = createPbrMaterial({
    colorHex: '#fbbf24',
    metallic: 0.86,
    roughness: 0.22,
    specular: 0.95,
  });
  const waterMat = createPbrMaterial({
    colorHex: '#2dd4bf',
    roughness: 0.14,
    metallic: 0.1,
    specular: 0.9,
  });
  const stoneMat = createPbrMaterial({ colorHex: '#78716c', roughness: 0.88 });

  const root = new cc.Node(`Building_${type}_Lv${clampedLv}${ownerTag ? `_${ownerTag}` : ''}`);
  const fixtures: LanternFixture[] = [];

  const addLantern = (pos: [number, number, number], flux = 160, range = 9) => {
    const lNode = new cc.Node('LanternPoint');
    lNode.setPosition(pos[0], pos[1], pos[2]);
    root.addChild(lNode);
    const lanternMat = createPbrMaterial({
      colorHex: '#fde68a',
      emissiveHex: '#ff9d2e',
      emissiveScale: 1.8,
      roughness: 0.3,
    });
    addPart(lNode, 'LanternOrb', m.sphere, lanternMat, [0, 0, 0], [0.28, 0.34, 0.28], undefined, false);
    addPart(lNode, 'LanternCap', m.cone, teakMat, [0, 0.2, 0], [0.34, 0.14, 0.34], undefined, false);

    const light = lNode.addComponent(cc.SphereLight);
    light.color = cc.color('#ffaa4c');
    light.range = range;
    light.size = 0.25;
    light.luminousFlux = flux;

    const fixture: LanternFixture = {
      light,
      emissiveMat: lanternMat,
      baseFlux: flux,
      baseEmissive: 2.2,
      flickerPhase: Math.random() * Math.PI * 2,
    };
    fixtures.push(fixture);
    lighting?.registerLantern(fixture);
  };

  // Base foundation grows richer with tier
  const baseMat = tier >= 3 ? stoneMat : tier >= 2 ? teakMat : bambooMat;
  const baseH = 0.14 + tier * 0.05;
  addPart(root, 'Foundation', m.box, baseMat, [0, baseH * 0.5, 0], [
    2.4 * footprintScale,
    baseH,
    2.4 * footprintScale,
  ]);

  const wallMat = tier >= 2 ? teakMat : bambooMat;
  const roofMat = tier >= 2 ? terracottaMat : thatchMat;
  const heightBoost = (clampedLv - 1) * 0.08;

  if (type === 'lentera') {
    // Menara Lentera — tall Indonesian beacon tower
    const towerH = 1.8 + clampedLv * 0.26;
    const postOffsets: Array<[number, number]> = [
      [-0.45, -0.45],
      [0.45, -0.45],
      [-0.45, 0.45],
      [0.45, 0.45],
    ];
    postOffsets.forEach(([px, pz], idx) => {
      addPart(root, `TowerPost_${idx}`, m.cylinder, wallMat, [px, towerH * 0.5, pz], [0.14, towerH, 0.14]);
    });
    addPart(root, 'LanternDeck', m.box, teakMat, [0, towerH, 0], [1.35, 0.14, 1.35]);
    addPart(root, 'TowerRoof', m.cone, roofMat, [0, towerH + 0.85, 0], [1.75, 0.85, 1.75]);
    if (tier >= 3) {
      addPart(root, 'BatikBanner', m.box, batikMat, [0, towerH * 0.58, 0.46], [0.7, 0.9, 0.05]);
    }
    if (tier === 4) {
      addPart(root, 'GoldFinial', m.cone, goldMat, [0, towerH + 1.4, 0], [0.32, 0.48, 0.32]);
    }
    addLantern([0, towerH + 0.34, 0], 260 + clampedLv * 45, 12 + clampedLv * 0.9);
  } else if (type === 'pancuran') {
    // Pancuran Air — bamboo water bath & pool
    addPart(root, 'PoolRim', m.box, stoneMat, [0, baseH + 0.16, 0], [2.0, 0.32, 2.0]);
    addPart(root, 'WaterSurface', m.box, waterMat, [0, baseH + 0.33, 0], [1.65, 0.04, 1.65], undefined, false);
    addPart(root, 'SpoutPost', m.cylinder, bambooMat, [0, baseH + 0.65 + heightBoost, -0.78], [0.18, 1.2 + heightBoost, 0.18]);
    addPart(root, 'BambooSpout', m.cylinder, bambooMat, [0, baseH + 0.95 + heightBoost, -0.45], [0.12, 0.72, 0.12], [72, 0, 0]);
    if (tier >= 2) {
      addPart(root, 'CanopyRoof', m.cone, roofMat, [0, baseH + 1.65 + heightBoost, -0.55], [1.6, 0.65, 1.4]);
    }
    if (tier >= 3) {
      addLantern([0.85, baseH + 1.0, 0.85], 130, 8);
    }
    if (tier === 4) {
      addPart(root, 'GoldSpoutRing', m.torus, goldMat, [0, baseH + 0.95 + heightBoost, -0.18], [0.16, 0.16, 0.16]);
    }
  } else if (type === 'arena') {
    // Arena Latihan — 2x2 agility ground with Joglo archway & hurdles
    addPart(root, 'SandRing', m.box, createPbrMaterial({ colorHex: '#d2aa77', roughness: 0.9 }), [0, baseH + 0.03, 0], [
      3.9,
      0.06,
      3.9,
    ]);
    // 4 Corner Pavilion Pillars
    const corners: Array<[number, number]> = [
      [-1.7, -1.7],
      [1.7, -1.7],
      [-1.7, 1.7],
      [1.7, 1.7],
    ];
    corners.forEach(([cx, cz], i) => {
      addPart(root, `ArenaPost_${i}`, m.cylinder, wallMat, [cx, baseH + 1.0, cz], [0.18, 2.0, 0.18]);
      if (tier >= 2 && i < 2) {
        addLantern([cx, baseH + 2.1, cz], 160, 10);
      }
    });
    // Practice hurdles inside arena
    addPart(root, 'HurdleBar', m.cylinder, bambooMat, [0, baseH + 0.45, 0], [0.1, 2.2, 0.1], [0, 0, 90]);
    addPart(root, 'ArchBeam', m.box, teakMat, [0, baseH + 1.95, -1.7], [3.6, 0.22, 0.22]);
    if (tier >= 2) {
      addPart(root, 'ArchRoof', m.cone, roofMat, [0, baseH + 2.45, -1.7], [3.4, 0.85, 1.5]);
    }
    if (tier >= 3) {
      addPart(root, 'BannerL', m.box, batikMat, [-1.2, baseH + 1.3, -1.7], [0.45, 1.0, 0.06]);
      addPart(root, 'BannerR', m.box, batikMat, [1.2, baseH + 1.3, -1.7], [0.45, 1.0, 0.06]);
    }
    if (tier === 4) {
      addPart(root, 'GoldCrown', m.cone, goldMat, [0, baseH + 3.0, -1.7], [0.42, 0.55, 0.42]);
    }
  } else {
    // Kandang Bambu / Warung Pakan / Klinik Jamu — Traditional Indonesian Pavilion
    const w = 1.85;
    const postH = 1.15 + heightBoost;
    const posts: Array<[number, number]> = [
      [-0.78, -0.78],
      [0.78, -0.78],
      [-0.78, 0.78],
      [0.78, 0.78],
    ];
    posts.forEach(([px, pz], i) => {
      addPart(root, `Pillar_${i}`, m.cylinder, wallMat, [px, baseH + postH * 0.5, pz], [0.14, postH, 0.14]);
    });

    // Rear / Side half-walls
    addPart(root, 'BackWall', m.box, bambooMat, [0, baseH + postH * 0.45, -0.76], [w * 0.88, postH * 0.78, 0.1]);
    if (type === 'warung') {
      addPart(root, 'Counter', m.box, teakMat, [0, baseH + 0.42, 0.7], [1.65, 0.65, 0.36]);
      addPart(root, 'Awning', m.box, batikMat, [0, baseH + postH * 0.85, 0.95], [1.9, 0.08, 0.55], [18, 0, 0]);
    } else if (type === 'klinik') {
      const herbMat = createPbrMaterial({ colorHex: '#10b981', roughness: 0.45 });
      addPart(root, 'JamuTable', m.box, teakMat, [0, baseH + 0.38, 0.4], [1.2, 0.48, 0.48]);
      addPart(root, 'HerbCross', m.box, herbMat, [0, baseH + postH + 0.4, 0.82], [0.32, 0.32, 0.08]);
    } else {
      const cushionMat = createPbrMaterial({ colorHex: '#d97706', texture: tex.batikCloth, roughness: 0.75 });
      addPart(root, 'PetBed', m.box, cushionMat, [0, baseH + 0.12, 0.1], [1.1, 0.2, 0.9]);
    }

    // Primary Roof
    addPart(root, 'RoofLower', m.cone, roofMat, [0, baseH + postH + 0.42, 0], [2.45, 0.9, 2.45], [0, 45, 0]);

    // Level 4-6: Second Joglo Roof Tier + Porch Lantern
    if (tier >= 2) {
      addPart(root, 'RoofUpper', m.cone, roofMat, [0, baseH + postH + 0.96, 0], [1.45, 0.75, 1.45], [0, 45, 0]);
      addLantern([0.82, baseH + postH * 0.82, 0.86], 125 + clampedLv * 15, 8 + clampedLv * 0.4);
    }

    // Level 7-9: Batik Banners + Second Lantern
    if (tier >= 3) {
      addPart(root, 'BannerL', m.box, batikMat, [-0.82, baseH + postH * 0.55, 0.82], [0.22, 0.72, 0.06]);
      addPart(root, 'BannerR', m.box, batikMat, [0.82, baseH + postH * 0.55, 0.82], [0.22, 0.72, 0.06]);
      addLantern([-0.82, baseH + postH * 0.82, 0.86], 125 + clampedLv * 15, 8 + clampedLv * 0.4);
    }

    // Level 10: Gilded Pendopo Finial
    if (tier === 4) {
      addPart(root, 'GoldCrown', m.cone, goldMat, [0, baseH + postH + 1.5, 0], [0.32, 0.44, 0.32]);
    }
  }

  return { node: root, fixtures };
}

export function createPalmTree(scale = 1): cc.Node {
  const m = getSharedMeshes();
  const trunkMat = createPbrMaterial({ colorHex: '#6b4f35', roughness: 0.9 });
  const frondMat = createPbrMaterial({ colorHex: '#3f7d32', roughness: 0.65 });

  const tree = new cc.Node('PalmTree');
  tree.setScale(scale, scale, scale);
  addPart(tree, 'Trunk1', m.cylinder, trunkMat, [0, 1.1, 0], [0.28, 2.2, 0.28], [4, 0, 3]);
  addPart(tree, 'Trunk2', m.cylinder, trunkMat, [0.1, 2.8, 0.1], [0.22, 1.8, 0.22], [7, 0, -4]);

  const crown = new cc.Node('Crown');
  crown.setPosition(0.18, 3.65, 0.14);
  tree.addChild(crown);
  for (let i = 0; i < 6; i++) {
    const yaw = (i / 6) * 360;
    const frond = new cc.Node(`Frond_${i}`);
    frond.setRotationFromEuler(0, yaw, 0);
    crown.addChild(frond);
    addPart(frond, 'Leaf', m.box, frondMat, [0, -0.05, 0.85], [0.42, 0.08, 1.7], [18, 0, 0]);
  }
  return tree;
}

export function createOborTorch(
  pos: [number, number, number],
  lighting: VillageLightingController | null,
  flux = 150
): cc.Node {
  const m = getSharedMeshes();
  const tex = getProceduralTextures();
  const bambooMat = createPbrMaterial({ colorHex: '#b48a4e', texture: tex.bambooWeave, roughness: 0.82 });
  const flameMat = createPbrMaterial({
    colorHex: '#fde047',
    emissiveHex: '#ff7a18',
    emissiveScale: 2.5,
    roughness: 0.2,
  });

  const torch = new cc.Node('OborTorch');
  torch.setPosition(pos[0], pos[1], pos[2]);
  addPart(torch, 'Post', m.cylinder, bambooMat, [0, 0.85, 0], [0.12, 1.7, 0.12]);
  addPart(torch, 'Cup', m.cone, bambooMat, [0, 1.65, 0], [0.24, 0.28, 0.24], [180, 0, 0]);
  addPart(torch, 'Flame', m.sphere, flameMat, [0, 1.88, 0], [0.22, 0.34, 0.22], undefined, false);

  const lNode = new cc.Node('OborLight');
  lNode.setPosition(0, 2.05, 0);
  torch.addChild(lNode);
  const light = lNode.addComponent(cc.SphereLight);
  light.color = cc.color('#ff9e3b');
  light.range = 10;
  light.size = 0.2;
  light.luminousFlux = flux;

  lighting?.registerLantern({
    light,
    emissiveMat: flameMat,
    baseFlux: flux,
    baseEmissive: 2.6,
    flickerPhase: Math.random() * Math.PI * 2,
  });

  return torch;
}
