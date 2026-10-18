# Panasonic Monoblock Card for Home Assistant

🇳🇱 [Nederlandse versie](README.md)

An animated dashboard card for a **Panasonic monoblock heat pump without a buffer tank** (`custom:panasonic-monoblock-card`). The outdoor unit with fan, compressor and heat exchanger is connected straight to the radiators and the underfloor heating. The fan and pumps spin, water flows through the pipes, and pipes and circuits change colour with temperature.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/monoblock-dark.gif">
    <img src="images/monoblock-light.gif" alt="Panasonic monoblock card" width="560">
  </picture>
</p>

<p align="center"><em>Example with demo values. In Home Assistant the animations follow the live status.</em></p>

The look is inspired by [AMensink/warmtepomp-cards](https://github.com/AMensink/warmtepomp-cards) (MIT). The code was written from scratch. Card labels are in Dutch. Animations stop automatically if your device has "reduce motion" enabled.

Do you also have an Atlantic Explorer heat pump water heater? There is a separate card for that: `atlantic-explorer-card`.

---

## Installation

### Via HACS (recommended)

1. Open **HACS** in Home Assistant.
2. Click ⋮ in the top right → **Custom repositories**.
3. Paste the URL of this repository, choose type **Dashboard** and click **Add**.
4. Search for **Panasonic Monoblock Card**, click **Download** and reload the browser (Ctrl+F5).

### Manual

1. Download `dist/panasonic-monoblock-card.js` and place it in `/config/www/`.
2. Go to **Settings → Dashboards → ⋮ → Resources → Add resource**.
3. URL: `/local/panasonic-monoblock-card.js`, type: **JavaScript module**.
4. Reload the browser.

---

## Usage

Edit a dashboard, choose **Add card**, open the card's YAML editor and fill in your own entities under `entities:`. Only what you fill in is shown: missing values, chips and tiles are left out. Click a value in the card to open that entity's details dialog.

```yaml
type: custom:panasonic-monoblock-card
title: Warmtepomp
entities:
  supply: sensor.panasonic_outlet
  return: sensor.panasonic_inlet
  flow: sensor.panasonic_pomp
  power: sensor.panasonic_vermogen
  heat_power: sensor.panasonic_productie
  cop: sensor.panasonic_cop
  comp_hz: sensor.panasonic_compressor
  fan_rpm: sensor.panasonic_ventilator
  ambient: sensor.panasonic_buitentemperatuur
  setpoint: sensor.panasonic_target
  softstart: binary_sensor.wp_softstart_in_uitvoering
  thermostat: climate.woonkamer
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `title` | Card title | `Warmtepomp` |
| `show_radiators` | Show the radiator circuit | `true` |
| `show_floor` | Show underfloor heating | `true` |
| `reverse_flow` | Reverses all flow animations | `false` |

### Entities

| Key | Meaning |
| --- | --- |
| `supply` / `return` | Supply and return water temperature (outlet / inlet) |
| `delta` | ΔT, only needed if you have no supply and return |
| `flow` | Water flow rate (L/min) |
| `power` | Electrical power (W) |
| `heat_power` | Delivered heat output (W). Without it, the card estimates it from flow and ΔT |
| `cop` | COP. Without it, it is calculated from heat output and power |
| `comp_hz` | Compressor frequency |
| `fan_rpm` / `fan_hz` | Fan speed, sets the rotation speed in the drawing |
| `compressor` | Compressor on/off, if there is no frequency sensor |
| `ambient` / `coil` / `exhaust` / `suction` | Outdoor temperature, evaporator, discharge gas and suction gas |
| `hp_sat` / `eev` | Condensing temperature and expansion valve position |
| `defrost` / `online` / `fault` | Defrost, online status and fault |
| `softstart` | Soft start in progress |
| `mode` / `work_mode` | Operating mode and work mode |
| `setpoint` | Target supply temperature |
| `thermostat` | `climate` entity, shows the room temperature |
| `floor_pump` / `radiator_pump` | Pump switch. If it is off, that circuit turns grey |
| `energy_today` | Energy used today (kWh) |

---

## Good to know

- **Flow direction:** the supply runs from the heat pump to the radiators and the underfloor heating, and the return runs back to the heat pump. If a direction looks reversed on your setup, set `reverse_flow: true`.
- The COP is an estimate unless you provide `cop` or `heat_power`: flow × 4.186 × ΔT divided by electrical power.
- An entity that does not exist is silently skipped. If a value stays empty, check that the entity ID is correct.

## License

MIT
