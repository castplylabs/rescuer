import * as cc from '@/src/vendor/cocos4/cc.js';
import builtinEffects from '@/src/vendor/cocos4/builtinEffectsData.json';

let bootPromise: Promise<void> | null = null;
let contextLostHandlerAttached = false;

function sanitizeGlslForWebGL2(src: string): string {
  return src
    .replace(/#extension\s+GL_EXT_shader_explicit_arithmetic_types_int32\s*:\s*require\s*\r?\n?/g, '')
    .replace(/\bu32vec4\b/g, 'uvec4')
    .replace(/\bgl_VertexIndex\b/g, 'gl_VertexID');
}

function registerBuiltinEffectsAndMaterials(): void {
  const materialsToCompile: cc.Material[] = [];

  for (const rawEffect of builtinEffects) {
    const effect = Object.assign(new cc.EffectAsset(), rawEffect);
    for (const shader of effect.shaders) {
      if (shader.glsl3) {
        shader.glsl3.vert = sanitizeGlslForWebGL2(shader.glsl3.vert);
        shader.glsl3.frag = sanitizeGlslForWebGL2(shader.glsl3.frag);
      }
      if (shader.glsl1) {
        shader.glsl1.vert = sanitizeGlslForWebGL2(shader.glsl1.vert);
        shader.glsl1.frag = sanitizeGlslForWebGL2(shader.glsl1.frag);
      }
    }
    effect.hideInEditor = true;
    effect.onLoaded();
  }

  const registerDefaultMat = (uuid: string, effectName: string, defines?: Record<string, unknown>, colorHex?: string) => {
    const mat = new cc.Material();
    mat._uuid = uuid;
    mat.initialize({ effectName, defines });
    if (colorHex) {
      mat.setProperty('mainColor', cc.color(colorHex));
    }
    cc.builtinResMgr.addAsset(uuid, mat);
    materialsToCompile.push(mat);
  };

  registerDefaultMat('default-material', 'builtin-standard');
  registerDefaultMat('missing-material', 'builtin-unlit', { USE_COLOR: true }, '#d97706');
  registerDefaultMat('default-clear-stencil', 'builtin-clear-stencil', { USE_TEXTURE: false });
  registerDefaultMat('default-particle-material', 'builtin-particle');
  registerDefaultMat('default-billboard-material', 'builtin-billboard');

  cc.game.once(cc.Game.EVENT_GAME_INITED, () => {
    for (const mat of materialsToCompile) {
      for (const pass of mat.passes) {
        pass.tryCompile();
      }
    }
  });
}

export async function initCocos4Runtime(
  onContextLost?: () => void,
  onContextRestored?: () => void
): Promise<void> {
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    cc.game.once(cc.Game.EVENT_POST_SUBSYSTEM_INIT, () => {
      registerBuiltinEffectsAndMaterials();
    });

    await cc.game.init({
      overrideSettings: {
        rendering: {
          renderMode: 0,
          customPipeline: false,
        },
        profiling: {
          showFPS: false,
        },
      },
    });

    await cc.game.run();

    if (!contextLostHandlerAttached && cc.game.canvas) {
      contextLostHandlerAttached = true;
      cc.game.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        onContextLost?.();
      });
      cc.game.canvas.addEventListener('webglcontextrestored', () => {
        onContextRestored?.();
      });
    }
  })().catch((err) => {
    bootPromise = null;
    throw err;
  });

  return bootPromise;
}

export function runCocosScene(scene: cc.Scene): void {
  cc.director.runSceneImmediate(scene);
}
