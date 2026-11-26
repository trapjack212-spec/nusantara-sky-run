# Nusantara Sky Run

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/trapjack212-spec/nusantara-sky-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/trapjack212-spec/nusantara-sky-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

An original 3D chase-view flight game, built for the
[best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057)
on make.fun. Fly a courier plane between the islands of Nusantara:
thread golden rings, grease a landing on strip 09, or dash a delivery
to the far island before the fuel runs out.

## Play

Serve `game/` from any static server and open `game/index.html` in
desktop Chrome — no network, no build step:

```sh
node serve.ts
# open http://localhost:8080
```

Controls: **W/S** throttle, **Arrow keys** pitch & bank, **mouse**
steers, **P** pause, **M** mute, **R** restart. Missions are picked
from the menu with keys **1 / 2 / 3** or a click.

## Missions

1. **Ring Run** — fly 8 golden rings in order against the clock.
2. **Runway Landing** — three attempts to land gently on the runway.
3. **Courier Dash** — deliver to the far island before the fuel runs out;
   refuel rings top the tank up.

Fuel burns with the throttle, damage grows on hard contact, and a stall
below 55 kt drops the nose. The HUD shows airspeed, altitude, heading,
an artificial horizon, throttle / fuel / damage gauges and a minimap.

## Tech

Pure Canvas 2D, zero dependencies: a hand-written 3D projector, a
seeded procedural island world (terrain, town, river, runway, trees,
clouds), synthesised WebAudio sound, and a small arcade flight model.
Everything is in `game/src/`, one file per job.

## License

MIT — see [LICENSE](LICENSE).
