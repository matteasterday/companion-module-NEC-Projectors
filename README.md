# companion-module-nec-projector

Control and monitor **NEC projectors** from [Bitfocus Companion](https://bitfocus.io/companion) over the network.

No special hardware or cables are required — the module talks to the projector's built-in web
control interface (`IsapiExtPj.dll`) using NEC's projector command protocol. Just enter the
projector's IP address and you get power, input, mute, freeze, lens control and more, plus live
status (power, input, lamp life, filter hours, errors…) that updates automatically.

> **Which projectors?** NEC **"NP" series** projectors with a network connection, including
> newer models branded **Sharp NEC**. It does **not** control Sharp's own (non-NEC) projector
> lines — those use a different protocol. See [Supported projectors](#supported-projectors).

See [HELP.md](./companion/HELP.md) for plain-language setup help, and [LICENSE](./LICENSE).

## Features

**Buttons / actions**

- Power on / off / toggle
- Select input — by name (HDMI 1, Computer 1, Video, DisplayPort…); the right code is detected
  automatically per model, with a "Custom" option for anything unusual
- Mute picture, mute sound, hide on-screen menu, freeze image, shutter (blank screen)
- Adjust picture (brightness / contrast / color / hue / sharpness) and volume
- Aspect ratio, eco / lamp mode, audio source
- Remote-control buttons (menu, arrows, enter, source, auto, magnify…)
- Lens: zoom / focus / shift, move-to-position, lens memory and profiles
- Edge blending, Picture-in-Picture / side-by-side, set projector name, raw command (advanced)

**Feedbacks** (colour your buttons by live state)

- Power on (green) / warming up (orange) / cooling down (blue) / off (red)
- Connected, active input, picture muted, sound muted, menu hidden, image frozen,
  shutter closed, projector has an error

**Variables** (updated by polling)

- Connection, model, serial, MAC
- Power, status, content/signal, active input
- Picture mute, sound mute, on-screen mute, freeze, shutter
- Lamp life remaining (%), lamp hours used, filter hours used
- Eco mode, error count, error list, H/V sync frequency

**Presets** — ready-made buttons for Power, Inputs, Mute / Freeze, Volume and Status.

## Configuration

| Setting                   | What it's for                                                            |
| ------------------------- | ------------------------------------------------------------------------ |
| Projector IP address      | The projector's address on your network                                  |
| HTTP port                 | Almost always `80`                                                       |
| HTTP user name / password | Only if the projector's web page is password-protected (otherwise blank) |
| Poll projector for status | Keeps buttons and variables up to date                                   |
| Poll interval (seconds)   | How often to check (default `5`)                                         |

If your projector has an HTTP control password, the module logs in automatically (NEC's
challenge-response scheme) and re-authenticates if the session drops.

## Supported projectors

Works with NEC / Sharp NEC **NP-series** projectors that have a wired (or wireless) LAN
connection and the classic "Projector LAN Control" web page. This covers essentially the whole
NEC NP line from ~2014 onward, including:

- **NP4100 / NP4100W**
- **M series** — e.g. NP‑M230X/260X/260W/271W/282X/283X/300W/300X/302W/311X/322X/323W/332XS/333XS/350X/352WS/353WS/361X/362W/363X/402W/403W/403X/420X
- **ME series** — e.g. NP‑ME270X/301W/301X/331W/360X/361X/401W/401X
- **P / PE series** — e.g. NP‑P350W/P420X/P451W/P501X/P502H/P525UL/P554U/P603X/P605UL, NP‑PE401H/PE501X/PE523X
- **PA series** — e.g. NP‑PA500U/PA550W/PA600X/PA621U/PA622U/PA653UL/PA703W/PA722X/PA803UL/PA853W/PA903X/PA1004UL
- **PH series** — e.g. NP‑PH1000U/PH1202HL/PH1400U/PH2601QL/PH3501QL
- **PX series** — e.g. NP‑PX602UL/PX700W/PX750U/PX800X/PX803UL/PX1004UL/PX1005QL/PX2000UL
- **U / UM series** — e.g. NP‑U300X/U310W/U321H, NP‑UM280X/UM301W/UM330W/UM351W/UM361X
- **V / VE series** — e.g. NP‑V260X/V300X/V302H/V311X/V332W, NP‑VE280/VE281/VE303

The full official list is in NEC's _Projector Control Command Reference Manual_ and its
_Appendixes_.

### Good to know

- **Inputs auto-detect.** Input codes differ between projector families (for example HDMI 1 is
  `1Ah` on many models but `A1h` on others). You just pick "HDMI 1" — the module tries the
  standard code, falls back to the alternate if the projector rejects it, and remembers which
  one works. Use **Custom** for anything not listed.
- **Powering on from standby over the network** needs the projector's _Standby Mode_ set to
  allow network commands (e.g. _Network Standby_ / _Normal_). In a deep power-saving standby,
  some models won't respond until woken another way.
- **Not every command exists on every model** (e.g. lens, shutter, edge blending). Unsupported
  commands are safely ignored and won't break the connection.
- **Not Sharp's own projectors.** This module is for NEC / Sharp NEC NP-series projectors. Sharp's
  legacy (non-NEC) projector lines use a different control protocol and are not supported.

Tested against an **NEC NP‑PA550W**.

## Development

`yarn build` compiles the module, `yarn dev` watches for changes, `yarn lint` checks
formatting/lint, and `yarn package` builds the installable bundle.
