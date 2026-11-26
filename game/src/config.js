// Nusantara Sky Run — shared tuning and world constants.
// All units are metres / knots / feet where the name says so; the
// renderer works in world units and the HUD converts for display.
export const WORLD = {
  size: 4200, // world spans -2100..2100 on x and z
  seaLevel: 0,
  gridStep: 70, // terrain mesh cell size
  gridHalf: 2100,
};

export const PLANE = {
  stallSpeedKt: 55,
  cruiseSpeedKt: 150,
  maxSpeedKt: 210,
  climbRate: 9, // m/s at full power, level pitch
  sinkRate: 6, // m/s when stalled
  turnRate: 0.55, // rad/s at full bank
  maxBank: 0.9, // rad
  fuelCapacity: 100,
  fuelBurnFull: 0.22, // units per second at full throttle
  fuelBurnIdle: 0.05,
};

export const CAMERA = {
  fovDeg: 68,
  chaseDistance: 26,
  chaseHeight: 7,
  lookAhead: 42,
};

// Runway: flat strip on the main island, heading east (along +x).
export const RUNWAY = {
  cx: 150,
  cz: -320,
  headingDeg: 90, // runway points east
  length: 720,
  width: 64,
};

// Town centre (buildings cluster) and the river that runs past it.
export const TOWN = { cx: 420, cz: -80, radius: 260 };
export const RIVER = { x0: -900, z0: 1500, x1: 700, z1: -1400, width: 90 };

export const COLORS = {
  skyTop: '#2f6fd0',
  skyHorizon: '#bcd9f5',
  seaDeep: '#14608f',
  seaShallow: '#2f97b8',
  sand: '#e8d9a0',
  grassLow: '#5da24a',
  grassHigh: '#3f7d3a',
  fieldA: '#6aa854',
  fieldB: '#7fae56',
  forest: '#2e6b2f',
  rock: '#8d8578',
  town: '#b9b3a4',
  road: '#6f6a5e',
  runway: '#3a3d42',
  runwayMark: '#f5f2e8',
  ring: '#ffb400',
  ringDone: '#37d67a',
  hudInk: '#ffffff',
  hudPanel: 'rgba(8, 24, 44, 0.55)',
  hudAmber: '#ffb400',
  hudRed: '#ff5347',
  hudGreen: '#37d67a',
};

export const MISSIONS = {
  rings: {
    id: 'rings',
    name: 'RING RUN',
    tag: 'Fly the golden rings in order',
    rings: 8,
    timeLimitS: 240,
  },
  landing: {
    id: 'landing',
    name: 'RUNWAY LANDING',
    tag: 'Bring her down gentle on the strip',
    attempts: 3,
  },
  dash: {
    id: 'dash',
    name: 'COURIER DASH',
    tag: 'Deliver to the far island before the fuel runs out',
    timeLimitS: 300,
    fuelStart: 55,
  },
};
