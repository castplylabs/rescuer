# Kampung Paws — Cocos 4 Indonesian Village Pet Sanctuary & PVP Racing

A 3D web game built on the open-source **Cocos 4 (`cocos/cocos4`)** HTML5/WebGL2 engine where players rescue and care for Indonesian kampung stray animals, construct and upgrade a grid-based village sanctuary up to Level 10 alongside neighbors (*Tetangga*), equip stat-boosting accessories, and compete in real-time WebSocket PVP pet races.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> All core product directions below reflect your confirmed choices from clarification. Approving this plan proceeds to bootstrapping the Cocos 4 web toolchain, lighting scenes, building systems, and real-time multiplayer race server.

- **Confirmed Decision 1 — PVP Racing Mode**: **Real-time WebSocket multiplayer race rooms** hosted on the application server on port 3000, supporting room creation/joining via room codes, live countdown synchronization, and authoritative track physics/inputs (lane shifts, jumps over kampung obstacles, sprint boosts).
- **Confirmed Decision 2 — Persistence & Neighbors**: **Local browser storage (`localStorage`) with simulated village neighbors (*Tetangga*)**. Your coins, unlocked grid plots, buildings (Levels 1–10), adopted pets, care meters, and accessories persist automatically in the browser, surrounded by interactive neighbor plots (*Pak Budi*, *Bu Sari*, *Mas Raka*) that evolve locally and can be visited.
- **Confirmed Decision 3 — Indonesian Village Lighting Mood**: **Dynamic golden hour to warm lantern twilight** driven by Cocos 4's PBR, `DirectionalLight`, `AmbientInfo`, `FogInfo`, `ShadowsInfo`, and `PostSettingsInfo` pipeline, smoothly shifting sun elevation, tropical atmospheric haze, and glowing *obor* / *warung* paper lanterns (`PointLight` / `SphereLight` + emissive shaders).
- **Confirmed Decision 4 — Stray Animals & Architecture**: **Kampung cats (*Kucing Kampung*), dogs (*Anjing Kampung*), and ducks (*Bebek Kampung*)** paired with traditional Indonesian timber, bamboo, and terracotta-tiled shelters that transform visually across Levels 1–10.
- **Toolchain Note — Cocos 4 Web Target**: Because this environment serves browser previews on port 3000 without native mobile/desktop SDKs, the game compiles strictly for Cocos 4's **Web (`web-desktop` / HTML5 WebGL2)** target using `cocos/cocos-cli` and `@cocos/ccbuild`, wrapped in a semantic React DOM HUD and backed by an Express + WebSocket server.

---

## 1. Overview & Core Concept

- **What It Does**: Players adopt stray kampung animals wandering the village edge, nurture their Hunger, Hygiene, Health, and Happiness inside a customizable grid sanctuary, unlock adjacent grid cells, construct and upgrade 6 distinct traditional Indonesian buildings up to Level 10, dress pets in wearable 3D accessories, visit neighboring *Tetangga* compounds, and enter a separate 3D PVP Racing Track scene to race live against other connected players.
- **Target Audience**: Casual 3D simulation, cozy village-builder, and arcade pet-racing players looking for warm cultural atmosphere and crisp browser-based 3D lighting.
- **Key Value**: Combines tactile grid-based village crafting and pet nurturing with high-craft Cocos 4 lighting and immediate real-time multiplayer payoff—every care session, shelter upgrade, and equipped accessory directly improves a pet's live racing stats.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Arrival & Stray Rescue (Scene 1 — Kampung Sanctuary)**
   - The player lands in an isometric/orbitable 3D Indonesian village bathed in late-afternoon golden sunlight. A stray *Kucing Kampung*, *Anjing Kampung*, or *Bebek Kampung* trots near the village gate with a subtle world-projected interaction cue.
   - Clicking the stray opens the Adoption & Care Drawer: feed *ikan bakar* / *nasi*, bathe at the bamboo pump, or heal to boost Happiness and convert the stray into an owned companion.
2. **Grid Building & Level 1–10 Progression**
   - Toggling **Build Mode** projects a crisp spatial grid overlay onto the village terrain (showing owned cells, locked expandable cells, and occupied footprints).
   - Selecting a locked perimeter cell displays its **Grid Cell Expansion Cost** (Coins + Bamboo/Timber) to claim new buildable land.
   - Placing a building deducts its **Grid Cell Footprint Cost** + **Coin & Material Cost**. Clicking any placed building opens the **Upgrade Inspector**, letting the player upgrade it from **Level 1 → Level 10**. Each level increases passive coin generation, pet care speed, shelter capacity, and swaps/enhances the 3D structure (from simple bamboo posts and palm thatch at Lv.1 to carved *Jati* wood pillars, multi-tier *Joglo* terracotta roofs, hanging batik banners, and warm glowing lanterns at Lv.10).
3. **Neighbor (*Tetangga*) Exploration**
   - Across the village dirt lane sit 3 neighboring *Tetangga* compounds (*Rumah Pak Budi*, *Warung Bu Sari*, *Taman Mas Raka*), each rendered with its own traditional buildings, roaming village pets, and glowing evening lanterns.
   - Clicking a neighbor's gate moves the Cocos 4 camera smoothly across the lane to inspect their layout, collect a daily neighbor *gotong-royong* gift (coins/materials), or pet their animals for friendship bonuses.
4. **Accessory Dressing & Stat Synergy**
   - Opening the **Pet Wardrobe** lets players equip head, neck, and back accessories (*Caping* bamboo farmer hat, *Blangkon*, *Kalung Batik* bandana, *Lonceng Kuningan* brass bell, *Sayap Layangan* kite harness) directly onto attach-bones/sockets on the 3D animal rig, visibly updating the character in real time and adding Speed, Stamina, or Boost Power.
5. **PVP Pet Racing Contest (Scene 2 — *Arena Balap Kampung*)**
   - Clicking **Enter Race** opens the Multiplayer Race Room Modal where the player picks their cared-for pet, creates or joins a **WebSocket Room Code**, and sees connected opponents ready up in real time.
   - Once all players ready up, Cocos 4 transitions to **Scene 2**: a sun-dappled riverside *pematang sawah* (rice-terrace & village bridge) 3-lane track lit by golden-hour sunbeams and bamboo torchlight. Players steer lanes (`A/D` or Left/Right), jump mud puddles and coconut hurdles (`Space`), and trigger stamina-fueled **Sprint Boosts** (`Shift`) until crossing the bamboo finish arch, earning Coins and Trophies back in the village.

### Visual Identity & Theme

- **Aesthetic Direction**: Warm architectural Indonesian kampung diorama paired with a clean, breathable translucent DOM HUD—prioritizing natural PBR materials (weathered teakwood, woven bamboo, terracotta roof tiles, damp tropical soil, brass bells) and avoiding generic dark neon or cluttered mobile-game popups.
- **Cocos 4 Lighting Pipeline & Mood**:
  - **Dynamic Golden Hour → Lantern Twilight Cycle**: A continuous (plus manual preview scrubber) time-of-day controller interpolates sun pitch from `28°` warm amber (`#FFB36B`, ~3800K) down to `-4°` indigo-violet dusk (`#3B4675`), shifting `AmbientInfo` sky/ground hemisphere tones, warming `FogInfo` horizon depth, and smoothly ramping up localized `PointLight` / `SphereLight` fixtures inside *warung* stalls, *pos ronda* lanterns, and *obor* bamboo torches with soft shadows (`ShadowsInfo`) and ACES tone mapping (`PostSettingsInfo`).
  - **Material Realism**: Standard PBR materials calibrated with distinct roughness/metalness values (matte woven bamboo `0.88`, glazed terracotta tiles `0.42`, wet paddy water reflections `0.12`, brushed brass bells `0.25`).
- **HUD Palette & Surface System (60-30-10)**:
  - **Dominant Canvas (60%)**: Full-bleed 3D WebGL2 Cocos 4 viewport (`w-full h-full`) with zero outer borders or scrollbars.
  - **Structural HUD Surfaces (30%)**: Soft frosted warm-charcoal panels (`rgba(24, 22, 20, 0.74)` with `backdrop-blur-md` and `1px solid rgba(255, 248, 235, 0.14)`) anchored cleanly at screen edges so the center 75% of the 3D village and racetrack remains unobstructed.
  - **Accent Budget (10%)**: Tropical Pandan Teal (`#0F766E`) for primary confirm/race actions and Warm Lantern Amber (`#D97706`) for upgrade highlights and active golden-hour indicators.
- **Typography & Hierarchy**:
  - **Display / Headings**: `Plus Jakarta Sans` (SemiBold 600–700) for modal headers and scene banners.
  - **Body & Controls**: `DM Sans` (Regular 400 / Medium 500), single-line controls (`whitespace-nowrap`), plain everyday action labels (`Build`, `Upgrade`, `Feed`, `Equip`, `Join Room`).
  - **Numeric Readouts**: `JetBrains Mono` with `tabular-nums` strictly for Coins, Grid Cell costs, Level `1–10` stats, and Race lap/split timers.

### Interactive Feedback & Motion

- **Spatial Placement Preview**: Hovering grid cells in Build Mode shows a translucent green/amber ghost mesh footprint with real-time cell cost and validity feedback (`<= 16ms` pointer response).
- **Upgrade Celebration**: Upgrading a building triggers a brief bounce-scale tween, timber-dust + golden-spark particle burst in Cocos 4, and instant visual mesh evolution.
- **Lighting Transition Feedback**: An unobtrusive corner time-of-day dial lets players watch golden-hour shadows lengthen and kampung lanterns automatically ignite at dusk.
- **WebGL Safety & Loading State**: Listeners for `webglcontextlost` / `webglcontextrestored` plus a warm illustrated loading veil while the Cocos 4 H5 runtime initializes.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Cocos 4 Code-First Scene Construction vs. Hand-Authored Static Scene JSONs**
  - *Chosen Approach*: Bootstrap a valid Cocos 4 H5 project via `cocos-cli` and drive procedural/modular 3D village terrain, grid cells, Lv.1–10 building geometry, animal rigs, and dynamic lighting through modular TypeScript `@ccclass` controllers.
  - *Why*: Without the standalone GUI visual editor running inside the browser workspace, deterministic TypeScript scene builders prevent fragile UUID desyncs and make Level 1–10 visual mesh upgrades and dynamic grid placement rock-solid.
  - *Alternatives Considered*: Editing raw multi-thousand-line `.scene` JSON graphs directly; rejected because manual UUID wiring is brittle and hard to maintain.

- **Decision 2 — Semantic React DOM Overlay HUD vs. Cocos In-Canvas UI (`cc.Canvas`)**
  - *Chosen Approach*: Keep all 3D world rendering, lighting, shadows, particle bursts, and animations inside Cocos 4 (`WebGL2`), while rendering menus, build palettes, Level 1–10 upgrade sheets, wardrobe grids, and race room lobbies in a semantic React/Tailwind DOM layer directly over the canvas.
  - *Why*: Ensures crisp typography, keyboard/screen-reader accessibility, instant WebSocket lobby forms, and responsive 1440px+ layout integrity without blurry canvas-bitmap text.
  - *Alternatives Considered*: Building all UI modals inside Cocos `UITransform`/`Label` nodes; rejected due to slower iteration and weaker text/form ergonomics.

- **Decision 3 — Server-Authoritative WebSocket Race Rooms vs. Client-Side Race Simulation**
  - *Chosen Approach*: Run an Express + WebSocket (`ws`) server on port 3000 acting as the single source of truth for PVP race rooms (room codes, player ready states, countdown, server tick loop at 20Hz validating lane/jump/boost inputs and computing race placements), while Cocos 4 smoothly interpolates 3D pet transforms between server snapshots.
  - *Why*: Prevents client-side speed cheating, eliminates desynced finish lines between players, and follows real-time multiplayer best practices cleanly.
  - *Alternatives Considered*: Peer-to-peer or client-timed `setInterval` bots only; rejected because real-time WebSocket multiplayer rooms were explicitly chosen.

- **Decision 4 — Local Persistence (`localStorage`) + Deterministic Neighbor (*Tetangga*) Compounds**
  - *Chosen Approach*: Persist all player village state (grid ownership, building placements & Lv.1–10 tiers, economy, pet roster, care meters, equipped accessories) in versioned `localStorage`, and generate 3 distinct *Tetangga* compounds across the village road with daily interaction cooldowns.
  - *Why*: Zero sign-in friction, instant reload recovery, and cohesive offline-safe village state while reserving WebSocket server memory strictly for active PVP race rooms.
  - *Alternatives Considered*: Cloud database + user authentication; passed over per user choice for local storage with simulated neighbors.

---

## 4. Technical Architecture & Data Strategy

### System Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     Browser Client (Port 3000)                          │
│                                                                         │
│  ┌──────────────────────────────┐     ┌──────────────────────────────┐  │
│  │   React Semantic DOM HUD     │◄───►│   Typed Game State Bridge    │  │
│  │  • Village Build & Upgrade   │     │  • localStorage Persistence  │  │
│  │  • Pet Care & Wardrobe Modal │     │  • Grid Economy & Lv.1-10    │  │
│  │  • Time-of-Day Scrubber      │     │  • Scene Switcher (1 <-> 2)  │  │
│  │  • PVP Room Lobby & Results  │     └──────────────┬───────────────┘  │
│  └──────────────────────────────┘                    │                  │
│                                                      ▼                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │            Cocos 4 Engine Runtime (HTML5 / WebGL2)                │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────┐  ┌────────────────────────────┐  │  │
│  │  │ Scene 1: Kampung Sanctuary  │  │ Scene 2: PVP Pet Racing    │  │  │
│  │  │ • Grid Terrain & Plot Cells │  │ • 3-Lane Rice-Terrace Track│  │  │
│  │  │ • Lv.1-10 Building Meshes   │  │ • Hurdles, Mud & Boost Pads│  │  │
│  │  │ • 3 Tetangga Compounds      │  │ • Multi-Pet Interpolator   │  │  │
│  │  │ • Stray & Owned Animal AI   │  │ • Chase Cam & Dust Trails  │  │  │
│  │  └──────────────┬──────────────┘  └─────────────┬──────────────┘  │  │
│  │                 └───────────────┬───────────────┘                 │  │
│  │                                 ▼                                 │  │
│  │       Shared Cocos 4 Lighting & Accessory Pipeline                │  │
│  │       • DirectionalLight (Golden Sun) + ShadowsInfo (CSM/PCF)     │  │
│  │       • AmbientInfo + SkyboxInfo + Warm Exponential FogInfo       │  │
│  │       • Dynamic Twilight PointLights / Emissive Bamboo Lanterns   │  │
│  │       • PostSettingsInfo (ACES Tone Mapping) + Socket Accessories │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ WebSocket (ws://host:3000/ws/race)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Node.js Express + WebSocket Server (Port 3000)             │
│                                                                         │
│  • Serves Vite / Built Cocos 4 Web Bundle + Static Assets               │
│  • Authoritative Race Room Manager (Create / Join / Ready / Countdown)  │
│  • 20Hz Server Race Tick (Validates Lane, Jump, Boost using Pet Stats)  │
│  • Idempotent Event Broadcasts & Disconnect / Reconnect Recovery        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Core Entities

- **PlayerVillageState** (persisted in `localStorage`):
  - `coins`, `bamboo`, `teakwood`, `trophies`
  - `timeOfDay` (`0.0` morning → `0.65` golden hour → `0.85` warm lantern twilight, plus auto-cycle toggle)
  - `unlockedCells`: array of grid coordinates `(gx, gz)` unlocked from initial starter plot
  - `buildings`: array of placed building instances (`id`, `type`, `gx`, `gz`, `level` `1..10`, `lastCollectedAt`)
  - `pets`: array of rescued animals (`id`, `species`: `cat | dog | duck`, `name`, `coatVariant`, `hunger`, `hygiene`, `happiness`, `energy`, `equippedAccessories`: `{ head?, neck?, back? }`)
  - `neighbors`: 3 deterministic *Tetangga* profiles (`name`, `houseStyle`, `buildings`, `pets`, `lastVisitedAt`)
- **Building Catalog & Level 1–10 Scaling**:
  - 6 building types: *Kandang Bambu* (Pet Shelter), *Warung Pakan* (Food & Coin Stall), *Pancuran Air* (Bamboo Bath & Hygiene), *Klinik Jamu* (Health & Recovery), *Menara Lentera* (Lantern Tower — expands warm twilight illumination radius + happiness aura), and *Arena Latihan* (Agility Training Ground — passive speed/stamina XP).
  - Each building defines `footprint` (`1x1` or `2x2` grid cells), `cellUnlockCost`, `buildCost` (`coins`, `bamboo`, `teakwood`), and per-level upgrade formulas (`Lv.1` → `Lv.10`) scaling visual tier (`bamboo/thatch` → `painted timber` → `carved Joglo + glowing lanterns`) and gameplay yield.
- **Accessory Catalog & Pet Stats**:
  - Base pet stats derived from species + current Care Meters (well-fed/clean/happy pets get up to `+25%` performance bonus) + Equipped Accessories (`+Speed`, `+Stamina`, `+Boost Power`, `+Obstacle Recovery`).
- **WebSocket Race Protocol Events**:
  - Client → Server: `room:create`, `room:join`, `room:ready`, `race:input` (`laneLeft | laneRight | jump | boost`), `room:leave`
  - Server → Client: `room:state` (idempotent roster + pet loadouts), `race:countdown`, `race:tick` (authoritative `z` progress, `lane`, `y` jump arc, `stamina`, `rank`), `race:finished` (podium + rewards)

### Interactive Component & State Mapping

- **Grid Interaction Controller (Cocos 4 Raycast ↔ HUD)**: Clicking terrain tiles raycasts against the village ground plane, snaps to `(gx, gz)`, checks cell ownership and footprint collisions, and emits selection/placement events to the state bridge; cancelling or lacking funds displays inline cost shortfall feedback without mutating state.
- **Pet Care & Accessory Socket Binder**: Triggering Feed/Bathe/Heal deducts inventory or coins, plays a Cocos 4 bounce/sparkle animation on the target pet, recalculates racing stats, and attaches/swaps accessory mesh nodes on the pet's head/neck/back anchor transforms.
- **Time-of-Day & Lantern Controller**: Scrubbing or running the Golden Hour → Twilight clock updates Cocos 4 `DirectionalLight` rotation/color/intensity, `AmbientInfo`, `FogInfo`, and toggles building/street lantern `PointLight` + emissive intensities smoothly per frame.
- **PVP Race Lobby & Scene Transition**: Submitting pet selection + Room Code opens the WebSocket connection; upon `race:countdown`, the engine switches cleanly from Scene 1 (`KampungSanctuary`) to Scene 2 (`PetRaceTrack`), binds keyboard/touch lane & boost controls to throttled WebSocket `race:input` packets, and awards coins/trophies once `race:finished` arrives before returning to Scene 1.
