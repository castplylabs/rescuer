import * as cc from '@/src/vendor/cocos4/cc.js';

export interface LanternFixture {
  light: cc.SphereLight;
  emissiveMat: cc.Material;
  baseFlux: number;
  baseEmissive: number;
  flickerPhase: number;
}

interface TimeStop {
  t: number;
  sunPitch: number;      // degrees downward
  sunYaw: number;
  sunColor: string;
  sunLux: number;
  skyColor: string;
  groundColor: string;
  skyIllum: number;
  fogColor: string;
  fogDensity: number;
  clearColor: string;
  lanternGlow: number;   // 0..1
}

const TIME_STOPS: TimeStop[] = [
  {
    t: 0.0, // Dawn mist
    sunPitch: 18,
    sunYaw: 55,
    sunColor: '#ffd4a3',
    sunLux: 42000,
    skyColor: '#a8c5e5',
    groundColor: '#4e463a',
    skyIllum: 14000,
    fogColor: '#c9b8a8',
    fogDensity: 0.008,
    clearColor: '#a8b7c9',
    lanternGlow: 0.35,
  },
  {
    t: 0.35, // Tropical Midday
    sunPitch: 58,
    sunYaw: 25,
    sunColor: '#fff5e4',
    sunLux: 72000,
    skyColor: '#9ad0f5',
    groundColor: '#5c5b47',
    skyIllum: 24000,
    fogColor: '#c7dde6',
    fogDensity: 0.005,
    clearColor: '#8dc2e6',
    lanternGlow: 0.0,
  },
  {
    t: 0.66, // Indonesian Golden Hour (Hero Mood)
    sunPitch: 21,
    sunYaw: -42,
    sunColor: '#ffb162',
    sunLux: 56000,
    skyColor: '#e8a26d',
    groundColor: '#543c2b',
    skyIllum: 17000,
    fogColor: '#d99866',
    fogDensity: 0.0095,
    clearColor: '#d98f5b',
    lanternGlow: 0.55,
  },
  {
    t: 0.85, // Warm Lantern Twilight
    sunPitch: 6,
    sunYaw: -62,
    sunColor: '#e07a5f',
    sunLux: 18000,
    skyColor: '#4f5d91',
    groundColor: '#292226',
    skyIllum: 6800,
    fogColor: '#4c4668',
    fogDensity: 0.012,
    clearColor: '#363654',
    lanternGlow: 1.0,
  },
  {
    t: 1.0, // Kampung Night
    sunPitch: 28,
    sunYaw: -75,
    sunColor: '#6d82bf',
    sunLux: 7500,
    skyColor: '#242c4a',
    groundColor: '#19171a',
    skyIllum: 3200,
    fogColor: '#202238',
    fogDensity: 0.013,
    clearColor: '#181a2c',
    lanternGlow: 1.25,
  },
];

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sampleTimeStop(timeOfDay: number): TimeStop {
  const clamped = Math.max(0, Math.min(1, timeOfDay));
  let prev = TIME_STOPS[0];
  let next = TIME_STOPS[TIME_STOPS.length - 1];
  for (let i = 0; i < TIME_STOPS.length - 1; i++) {
    if (clamped >= TIME_STOPS[i].t && clamped <= TIME_STOPS[i + 1].t) {
      prev = TIME_STOPS[i];
      next = TIME_STOPS[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, next.t - prev.t);
  const ratio = (clamped - prev.t) / span;

  const mixHex = (h1: string, h2: string): string => {
    const out = new cc.Color();
    cc.Color.lerp(out, cc.color(h1), cc.color(h2), ratio);
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(out.r)}${toHex(out.g)}${toHex(out.b)}`;
  };

  return {
    t: clamped,
    sunPitch: lerpNum(prev.sunPitch, next.sunPitch, ratio),
    sunYaw: lerpNum(prev.sunYaw, next.sunYaw, ratio),
    sunColor: mixHex(prev.sunColor, next.sunColor),
    sunLux: lerpNum(prev.sunLux, next.sunLux, ratio),
    skyColor: mixHex(prev.skyColor, next.skyColor),
    groundColor: mixHex(prev.groundColor, next.groundColor),
    skyIllum: lerpNum(prev.skyIllum, next.skyIllum, ratio),
    fogColor: mixHex(prev.fogColor, next.fogColor),
    fogDensity: lerpNum(prev.fogDensity, next.fogDensity, ratio),
    clearColor: mixHex(prev.clearColor, next.clearColor),
    lanternGlow: lerpNum(prev.lanternGlow, next.lanternGlow, ratio),
  };
}

// Verified Cocos 4 runtime enum values from cc.js
const SHADOW_TYPE_SHADOW_MAP = 1;
const PCF_SOFT = 1;
const FOG_TYPE_EXP = 1;
const TONE_MAPPING_ACES = 0;

function hexToVec4(hex: string): cc.Vec4 {
  const c = cc.color(hex);
  return new cc.Vec4(c.r / 255, c.g / 255, c.b / 255, 1.0);
}

export class VillageLightingController {
  private scene: cc.Scene;
  private camera: cc.Camera;
  private sunNode: cc.Node;
  private sunLight: cc.DirectionalLight;
  private lanterns: LanternFixture[] = [];
  private currentTime = 0.66;
  private elapsed = 0;

  constructor(scene: cc.Scene, camera: cc.Camera, shadowOrthoSize = 30) {
    this.scene = scene;
    this.camera = camera;

    // Configure Cocos 4 Scene Globals: Shadows, Ambient, Exponential Fog, ACES Tone Mapping
    const globals = scene.globals;
    globals.shadows.enabled = true;
    globals.shadows.type = SHADOW_TYPE_SHADOW_MAP;
    globals.shadows.shadowMapSize = 2048;
    globals.shadows.maxReceived = 4;

    globals.fog.enabled = true;
    globals.fog.type = FOG_TYPE_EXP;
    globals.fog.fogStart = 12;
    globals.fog.fogAtten = 1;

    globals.skybox.enabled = false;
    globals.postSettings.toneMappingType = TONE_MAPPING_ACES;

    const clearBits = cc.gfx?.ClearFlagBit;
    this.camera.clearFlags = clearBits
      ? clearBits.COLOR | clearBits.DEPTH | clearBits.STENCIL
      : 7;

    // Main Directional Sun Light
    this.sunNode = new cc.Node('KampungSunLight');
    this.sunLight = this.sunNode.addComponent(cc.DirectionalLight);
    this.sunLight.shadowEnabled = true;
    this.sunLight.shadowPcf = PCF_SOFT;
    this.sunLight.shadowOrthoSize = shadowOrthoSize;
    this.sunLight.shadowDistance = 75;
    this.sunLight.shadowBias = 0.0004;
    this.sunLight.shadowNormalBias = 0.02;
    this.sunLight.shadowSaturation = 0.85;
    scene.addChild(this.sunNode);

    this.applyTimeOfDay(0.66);
  }

  public registerLantern(fixture: LanternFixture): void {
    this.lanterns.push(fixture);
    this.updateLanternFixture(fixture, sampleTimeStop(this.currentTime).lanternGlow);
  }

  public clearLanterns(): void {
    this.lanterns = [];
  }

  public applyTimeOfDay(timeOfDay: number): void {
    this.currentTime = timeOfDay;
    const state = sampleTimeStop(timeOfDay);

    this.sunNode.setRotationFromEuler(-state.sunPitch, state.sunYaw, 0);
    this.sunLight.color = cc.color(state.sunColor);
    this.sunLight.illuminance = state.sunLux;

    const globals = this.scene.globals;
    globals.ambient.skyColor = hexToVec4(state.skyColor);
    globals.ambient.groundAlbedo = hexToVec4(state.groundColor);
    globals.ambient.skyIllum = state.skyIllum;

    globals.fog.fogColor = cc.color(state.fogColor);
    globals.fog.fogDensity = state.fogDensity;

    this.camera.clearColor = cc.color(state.clearColor);

    for (const fixture of this.lanterns) {
      this.updateLanternFixture(fixture, state.lanternGlow);
    }
  }

  public tick(dt: number): void {
    this.elapsed += dt;
    const glow = sampleTimeStop(this.currentTime).lanternGlow;
    if (glow <= 0.05) return;
    for (const fixture of this.lanterns) {
      const flicker = 1 + Math.sin(this.elapsed * 5.2 + fixture.flickerPhase) * 0.07;
      this.updateLanternFixture(fixture, glow * flicker);
    }
  }

  private updateLanternFixture(fixture: LanternFixture, glow: number): void {
    fixture.light.luminousFlux = fixture.baseFlux * glow;
    const em = fixture.baseEmissive * Math.max(0.12, glow);
    fixture.emissiveMat.setProperty('emissiveScale', new cc.Vec3(em, em, em));
  }
}
