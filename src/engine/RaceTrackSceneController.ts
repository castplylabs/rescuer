import * as cc from '@/src/vendor/cocos4/cc.js';
import { RacePlayerInfo, RaceRoomSnapshot } from '@/src/shared/types';
import { VillageLightingController } from './lightingController';
import {
  PetRigHandle,
  addPart,
  animatePetRig,
  createOborTorch,
  createPalmTree,
  createPetRig,
  getSharedMeshes,
} from './meshesAndRigs';
import { createPbrMaterial, getProceduralTextures } from './proceduralTextures';

const LANE_X = [-2.2, 0, 2.2];

interface RacerVisual {
  playerId: string;
  rig: PetRigHandle;
  curX: number;
  curY: number;
  curZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  speed: number;
  boosting: boolean;
  stunned: boolean;
}

class RaceTicker extends cc.Component {
  public onTick?: (dt: number) => void;
  public update(dt: number): void {
    this.onTick?.(dt);
  }
}

export class RaceTrackSceneController {
  public scene: cc.Scene;
  public camera: cc.Camera;
  public lighting: VillageLightingController;

  private camNode: cc.Node;
  private trackRoot = new cc.Node('RaceTrackRoot');
  private racersRoot = new cc.Node('RacersRoot');
  private racers = new Map<string, RacerVisual>();
  private localPlayerId: string | null = null;
  private isRacing = false;

  constructor(initialRoom: RaceRoomSnapshot, localPlayerId: string, timeOfDay: number) {
    this.localPlayerId = localPlayerId;
    this.scene = new cc.Scene('PetRaceTrack');

    this.camNode = new cc.Node('RaceChaseCamera');
    this.camera = this.camNode.addComponent(cc.Camera);
    this.camera.fov = 50;
    this.camera.near = 0.4;
    this.camera.far = 220;
    this.scene.addChild(this.camNode);

    this.lighting = new VillageLightingController(this.scene, this.camera, 36);
    this.lighting.applyTimeOfDay(timeOfDay);

    this.scene.addChild(this.trackRoot);
    this.scene.addChild(this.racersRoot);

    this.buildTrackEnvironment(initialRoom);
    this.syncPlayers(initialRoom.players);

    const tickerNode = new cc.Node('RaceTicker');
    const ticker = tickerNode.addComponent(RaceTicker);
    ticker.onTick = (dt) => this.update(dt);
    this.scene.addChild(tickerNode);
  }

  private buildTrackEnvironment(room: RaceRoomSnapshot): void {
    const m = getSharedMeshes();
    const tex = getProceduralTextures();
    const len = room.trackLength + 30;

    // Reflective tropical sawah paddy water flanking the bridge track
    const waterMat = createPbrMaterial({
      colorHex: '#2f6f65',
      texture: tex.paddyWater,
      tiling: [12, 36],
      roughness: 0.14,
      metallic: 0.18,
      specular: 0.92,
    });
    addPart(this.trackRoot, 'SawahWater', m.plane, waterMat, [0, -0.35, len * 0.45], [85, 1, len], undefined, false);

    // 3-Lane Packed Earth & Teak Plank Bridge
    const earthMat = createPbrMaterial({
      colorHex: '#9d744f',
      texture: tex.earthPath,
      tiling: [2, 48],
      roughness: 0.9,
    });
    addPart(this.trackRoot, 'TrackDeck', m.box, earthMat, [0, -0.05, len * 0.45], [7.4, 0.16, len]);

    const teakMat = createPbrMaterial({
      colorHex: '#734729',
      texture: tex.teakWood,
      tiling: [1, 40],
      roughness: 0.68,
    });
    // Side bridge rails & lane dividers
    addPart(this.trackRoot, 'RailL', m.box, teakMat, [-3.85, 0.25, len * 0.45], [0.24, 0.5, len]);
    addPart(this.trackRoot, 'RailR', m.box, teakMat, [3.85, 0.25, len * 0.45], [0.24, 0.5, len]);
    addPart(this.trackRoot, 'LaneDivL', m.box, teakMat, [-1.1, 0.04, len * 0.45], [0.08, 0.03, len], undefined, false);
    addPart(this.trackRoot, 'LaneDivR', m.box, teakMat, [1.1, 0.04, len * 0.45], [0.08, 0.03, len], undefined, false);

    // Bamboo Torches & Palms lining the track
    for (let z = 12; z < room.trackLength + 10; z += 22) {
      this.trackRoot.addChild(createOborTorch([-4.2, 0, z], this.lighting, 180));
      this.trackRoot.addChild(createOborTorch([4.2, 0, z], this.lighting, 180));
      if (z % 44 === 12) {
        const pL = createPalmTree(1.0);
        pL.setPosition(-7.5, -0.3, z + 5);
        this.trackRoot.addChild(pL);
        const pR = createPalmTree(1.1);
        pR.setPosition(7.8, -0.3, z + 8);
        this.trackRoot.addChild(pR);
      }
    }

    // Finish Line Gapura Arch
    const bambooMat = createPbrMaterial({ colorHex: '#d5ae72', texture: tex.bambooWeave, roughness: 0.8 });
    const batikMat = createPbrMaterial({ colorHex: '#e08a3c', texture: tex.batikCloth, roughness: 0.65 });
    const fz = room.trackLength;
    addPart(this.trackRoot, 'FinishPostL', m.cylinder, bambooMat, [-3.6, 1.9, fz], [0.24, 3.8, 0.24]);
    addPart(this.trackRoot, 'FinishPostR', m.cylinder, bambooMat, [3.6, 1.9, fz], [0.24, 3.8, 0.24]);
    addPart(this.trackRoot, 'FinishBanner', m.box, batikMat, [0, 3.2, fz], [7.6, 0.9, 0.2]);

    // Obstacles & Boost Pads
    const hurdleMat = createPbrMaterial({ colorHex: '#d97706', texture: tex.bambooWeave, roughness: 0.72 });
    const mudMat = createPbrMaterial({ colorHex: '#432d1c', roughness: 0.25, specular: 0.85 });
    const boostMat = createPbrMaterial({
      colorHex: '#14b8a6',
      emissiveHex: '#2dd4bf',
      emissiveScale: 1.6,
      roughness: 0.3,
    });

    for (const obs of room.obstacles) {
      const ox = LANE_X[obs.lane];
      if (obs.kind === 'hurdle') {
        addPart(this.trackRoot, `${obs.id}_Bar`, m.box, hurdleMat, [ox, 0.45, obs.z], [1.6, 0.2, 0.22]);
        addPart(this.trackRoot, `${obs.id}_PostL`, m.cylinder, teakMat, [ox - 0.75, 0.28, obs.z], [0.1, 0.56, 0.1]);
        addPart(this.trackRoot, `${obs.id}_PostR`, m.cylinder, teakMat, [ox + 0.75, 0.28, obs.z], [0.1, 0.56, 0.1]);
      } else if (obs.kind === 'mud') {
        addPart(this.trackRoot, obs.id, m.cylinder, mudMat, [ox, 0.04, obs.z], [1.75, 0.04, 1.8], undefined, false);
      } else {
        addPart(this.trackRoot, obs.id, m.box, boostMat, [ox, 0.05, obs.z], [1.55, 0.05, 1.9], undefined, false);
      }
    }
  }

  public setRacingActive(active: boolean): void {
    this.isRacing = active;
  }

  public syncPlayers(players: RacePlayerInfo[]): void {
    const activeIds = new Set(players.map((p) => p.playerId));
    for (const [id, vis] of this.racers.entries()) {
      if (!activeIds.has(id)) {
        vis.rig.root.destroy();
        this.racers.delete(id);
      }
    }

    for (const p of players) {
      const tx = LANE_X[p.lane];
      let vis = this.racers.get(p.playerId);
      if (!vis) {
        const rig = createPetRig(p.species, p.coat, p.equipped);
        rig.root.setPosition(tx, p.y, p.z);
        this.racersRoot.addChild(rig.root);
        vis = {
          playerId: p.playerId,
          rig,
          curX: tx,
          curY: p.y,
          curZ: p.z,
          targetX: tx,
          targetY: p.y,
          targetZ: p.z,
          speed: p.speed,
          boosting: p.boostTimer > 0,
          stunned: p.stunTimer > 0,
        };
        this.racers.set(p.playerId, vis);
      } else {
        vis.targetX = tx;
        vis.targetY = p.y;
        vis.targetZ = p.z;
        vis.speed = p.speed;
        vis.boosting = p.boostTimer > 0;
        vis.stunned = p.stunTimer > 0;
      }
    }
  }

  private update(dt: number): void {
    const safeDt = Math.min(0.05, dt);
    this.lighting.tick(safeDt);

    const alpha = Math.min(1, safeDt * 14);
    for (const vis of this.racers.values()) {
      vis.curX += (vis.targetX - vis.curX) * alpha;
      vis.curY += (vis.targetY - vis.curY) * alpha;
      vis.curZ += (vis.targetZ - vis.curZ) * alpha;
      vis.rig.root.setPosition(vis.curX, vis.curY, vis.curZ);

      const bankRoll = (vis.targetX - vis.curX) * -14;
      vis.rig.root.setRotationFromEuler(0, 0, bankRoll);

      const mode = !this.isRacing ? 'idle' : vis.boosting ? 'race' : 'trot';
      animatePetRig(vis.rig, mode, safeDt, vis.boosting ? 1.45 : 1.0);
    }

    // Chase Camera tracks local racer smoothly
    const localVis = this.localPlayerId ? this.racers.get(this.localPlayerId) : null;
    const focusX = localVis ? localVis.curX * 0.55 : 0;
    const focusZ = localVis ? localVis.curZ : 0;

    const desiredCamPos = new cc.Vec3(focusX, 4.4, focusZ - 7.8);
    const curPos = this.camNode.position;
    cc.Vec3.lerp(curPos, curPos, desiredCamPos, Math.min(1, safeDt * 10));
    this.camNode.setPosition(curPos);
    this.camNode.lookAt(new cc.Vec3(focusX * 0.7, 1.1, focusZ + 8.5));

    const targetFov = localVis?.boosting ? 60 : 50;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, safeDt * 6);
  }
}
