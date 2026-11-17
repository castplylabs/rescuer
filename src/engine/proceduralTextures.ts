import * as cc from '@/src/vendor/cocos4/cc.js';

export interface ProceduralTextureSet {
  bambooWeave: cc.Texture2D;
  teakWood: cc.Texture2D;
  terracottaTile: cc.Texture2D;
  batikCloth: cc.Texture2D;
  kampungGrass: cc.Texture2D;
  earthPath: cc.Texture2D;
  paddyWater: cc.Texture2D;
  thatchRoof: cc.Texture2D;
}

let cachedTextures: ProceduralTextureSet | null = null;

function makeCanvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  repeat = true
): cc.Texture2D {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);

  const img = new cc.ImageAsset(canvas);
  const tex = new cc.Texture2D();
  tex.image = img;
  tex.setFilters(cc.Texture2D.Filter.LINEAR, cc.Texture2D.Filter.LINEAR);
  const wrap = repeat ? cc.Texture2D.WrapMode.REPEAT : cc.Texture2D.WrapMode.CLAMP_TO_EDGE;
  tex.setWrapMode(wrap, wrap);
  return tex;
}

export function getProceduralTextures(): ProceduralTextureSet {
  if (cachedTextures) return cachedTextures;

  const bambooWeave = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#c49a5c';
    ctx.fillRect(0, 0, s, s);
    const step = 32;
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        const alt = ((x / step + y / step) | 0) % 2 === 0;
        ctx.fillStyle = alt ? '#d5ad6f' : '#a97e43';
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
        ctx.fillStyle = 'rgba(62, 42, 18, 0.22)';
        ctx.fillRect(x, y, step, 3);
        ctx.fillRect(x, y, 3, step);
      }
    }
  });

  const teakWood = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#6f4528';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 42; i++) {
      const y = (i * s) / 42;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(42, 24, 12, 0.28)' : 'rgba(145, 96, 58, 0.22)';
      ctx.fillRect(0, y, s, 4);
    }
    ctx.fillStyle = 'rgba(28, 16, 8, 0.45)';
    for (let p = 0; p < 4; p++) {
      ctx.fillRect(0, p * (s / 4), s, 3);
    }
  });

  const terracottaTile = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#b14c2c';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const cols = 6;
    const rw = s / cols;
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (rw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * rw + offset;
        const y = r * rh;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#c35936' : '#9f4124';
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, rw - 4, rh - 3, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(45, 16, 8, 0.32)';
        ctx.fillRect(x + 2, y + rh - 4, rw - 4, 3);
      }
    }
  });

  const batikCloth = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#3b2416';
    ctx.fillRect(0, 0, s, s);
    const step = 64;
    for (let y = 0; y < s; y += step) {
      for (let x = 0; x < s; x += step) {
        ctx.strokeStyle = '#e4b363';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(x + step * 0.5, y + step * 0.5, 22, 11, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x + step * 0.5, y + step * 0.5, 22, 11, -Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(x + step * 0.5, y + step * 0.5, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  const kampungGrass = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#4e7738';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 420; i++) {
      const x = (i * 73) % s;
      const y = (i * 137) % s;
      ctx.fillStyle = i % 2 === 0 ? '#5c8a43' : '#3f632c';
      ctx.fillRect(x, y, 6, 12);
    }
  });

  const earthPath = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#8b6848';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 360; i++) {
      const x = (i * 97) % s;
      const y = (i * 53) % s;
      ctx.fillStyle = i % 3 === 0 ? '#9c7856' : '#775639';
      ctx.fillRect(x, y, 8, 6);
    }
  });

  const paddyWater = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#2d5852';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(182, 232, 220, 0.16)';
    ctx.lineWidth = 2;
    for (let y = 16; y < s; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.33, y - 6, s * 0.66, y + 6, s, y);
      ctx.stroke();
    }
  });

  const thatchRoof = makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#685032';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      ctx.fillStyle = y % 16 === 0 ? '#7c623f' : '#533e24';
      ctx.fillRect(0, y, s, 6);
    }
    for (let x = 0; x < s; x += 12) {
      ctx.fillStyle = 'rgba(28, 20, 10, 0.25)';
      ctx.fillRect(x, 0, 2, s);
    }
  });

  cachedTextures = {
    bambooWeave,
    teakWood,
    terracottaTile,
    batikCloth,
    kampungGrass,
    earthPath,
    paddyWater,
    thatchRoof,
  };
  return cachedTextures;
}

export function createPbrMaterial(opts: {
  colorHex: string;
  roughness?: number;
  metallic?: number;
  specular?: number;
  texture?: cc.Texture2D;
  tiling?: [number, number];
  emissiveHex?: string;
  emissiveScale?: number;
  transparent?: boolean;
  alpha?: number;
}): cc.Material {
  const mat = new cc.Material();
  const defines: Record<string, unknown> = {
    CC_RECEIVE_SHADOW: !opts.transparent,
    USE_ALBEDO_MAP: Boolean(opts.texture),
  };
  const states = opts.transparent
    ? [
        {
          blendState: {
            targets: [
              {
                blend: true,
                blendSrc: cc.gfx?.BlendFactor?.SRC_ALPHA ?? 2,
                blendDst: cc.gfx?.BlendFactor?.ONE_MINUS_SRC_ALPHA ?? 4,
                blendSrcAlpha: cc.gfx?.BlendFactor?.ONE ?? 1,
                blendDstAlpha: cc.gfx?.BlendFactor?.ONE_MINUS_SRC_ALPHA ?? 4,
              },
            ],
          },
          depthStencilState: {
            depthWrite: false,
          },
        },
      ]
    : undefined;

  mat.initialize({
    effectName: 'builtin-standard',
    technique: 0,
    defines,
    ...(states ? { states: states as unknown as Record<string, unknown> } : {}),
  });

  const c = cc.color(opts.colorHex);
  if (opts.alpha !== undefined) {
    c.a = Math.round(opts.alpha * 255);
  }
  mat.setProperty('mainColor', c);
  mat.setProperty('roughness', opts.roughness ?? 0.65);
  mat.setProperty('metallic', opts.metallic ?? 0.04);
  mat.setProperty('specularIntensity', opts.specular ?? 0.45);
  if (opts.texture) {
    mat.setProperty('mainTexture', opts.texture);
    const tx = opts.tiling?.[0] ?? 1;
    const ty = opts.tiling?.[1] ?? 1;
    mat.setProperty('tilingOffset', new cc.Vec4(tx, ty, 0, 0));
  }
  if (opts.emissiveHex) {
    mat.setProperty('emissive', cc.color(opts.emissiveHex));
    const s = opts.emissiveScale ?? 1.0;
    mat.setProperty('emissiveScale', new cc.Vec3(s, s, s));
  }
  return mat;
}
