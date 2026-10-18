# Panasonic Monoblock Card voor Home Assistant

🇬🇧 [English version](README.en.md)

Een geanimeerde dashboardkaart voor een **Panasonic monoblock-warmtepomp zonder buffervat** (`custom:panasonic-monoblock-card`). De buitenunit met ventilator, compressor en warmtewisselaar is rechtstreeks verbonden met de radiatoren en de vloerverwarming. Ventilator en pompen draaien, het water stroomt door de leidingen en leidingen en circuits kleuren mee met de temperatuur.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/monoblock-dark.gif">
    <img src="images/monoblock-light.gif" alt="Panasonic monoblock-kaart" width="560">
  </picture>
</p>

<p align="center"><em>Voorbeeld met demowaarden. In Home Assistant volgen de animaties de live status.</em></p>

De opmaak is geïnspireerd op [AMensink/warmtepomp-cards](https://github.com/AMensink/warmtepomp-cards) (MIT). De code is opnieuw geschreven. Alle labels zijn in het Nederlands. Animaties stoppen automatisch als je apparaat "verminderde beweging" heeft ingesteld.

Heb je ook een Atlantic Explorer warmtepompboiler? Daar is een aparte kaart voor: `atlantic-explorer-card`.

---

## Installatie

### Via HACS (aanbevolen)

1. Open **HACS** in Home Assistant.
2. Klik rechtsboven op ⋮ → **Aangepaste repositories**.
3. Plak de URL van deze repository, kies type **Dashboard** en klik **Toevoegen**.
4. Zoek **Panasonic Monoblock Card**, klik **Downloaden** en herlaad de browser (Ctrl+F5).

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Yakfeet&repository=panasonic-monoblock-card&category=plugin)

### Handmatig

1. Download `dist/panasonic-monoblock-card.js` en zet het in `/config/www/`.
2. Ga naar **Instellingen → Dashboards → ⋮ → Resources → Resource toevoegen**.
3. URL: `/local/panasonic-monoblock-card.js`, type: **JavaScript-module**.
4. Herlaad de browser.

---

## Gebruik

Bewerk een dashboard, kies **Kaart toevoegen**, open de YAML-editor van de kaart en vul je eigen entiteiten in onder `entities:`. Alleen wat je invult wordt getoond: ontbrekende waarden, chips en tegels worden weggelaten. Klik in de kaart op een waarde om het detailvenster van die entiteit te openen.

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

### Opties

| Optie | Omschrijving | Standaard |
| --- | --- | --- |
| `title` | Titel van de kaart | `Warmtepomp` |
| `show_radiators` | Radiatorcircuit tonen | `true` |
| `show_floor` | Vloerverwarming tonen | `true` |
| `reverse_flow` | Draait alle stroomanimaties om | `false` |

### Entiteiten

| Sleutel | Betekenis |
| --- | --- |
| `supply` / `return` | Aanvoer- en retourtemperatuur (outlet / inlet) |
| `delta` | ΔT, alleen nodig als je geen aanvoer en retour hebt |
| `flow` | Waterdebiet (L/min) |
| `power` | Elektrisch vermogen (W) |
| `heat_power` | Geleverd warmtevermogen (W). Zonder deze sensor schat de kaart het uit debiet en ΔT |
| `cop` | COP. Zonder deze sensor wordt hij berekend uit warmte-afgifte en vermogen |
| `comp_hz` | Compressorfrequentie |
| `fan_rpm` / `fan_hz` | Ventilatorsnelheid, bepaalt de draaisnelheid in de tekening |
| `compressor` | Compressor aan/uit, als er geen frequentie is |
| `ambient` / `coil` / `exhaust` / `suction` | Buitentemperatuur, verdamper, persgas en zuiggas |
| `hp_sat` / `eev` | Condensatietemperatuur en positie expansieventiel |
| `defrost` / `online` / `fault` | Ontdooien, online-status en storing |
| `softstart` | Softstart in uitvoering |
| `mode` / `work_mode` | Bedrijfsmodus en werkstand |
| `setpoint` | Gewenste aanvoertemperatuur |
| `thermostat` | `climate`-entiteit, toont de kamertemperatuur |
| `floor_pump` / `radiator_pump` | Schakelaar van de pomp. Staat die uit, dan wordt het circuit grijs |
| `energy_today` | Verbruik vandaag (kWh) |

---

## Goed om te weten

- **Stroomrichting:** de aanvoer loopt van de warmtepomp naar de radiatoren en de vloerverwarming, de retour loopt terug naar de warmtepomp. Staat een richting bij jou toch omgekeerd, zet dan `reverse_flow: true`.
- De COP is een schatting als je geen `cop` of `heat_power` opgeeft: debiet × 4,186 × ΔT gedeeld door het elektrisch vermogen.
- Een entiteit die niet bestaat, wordt stilletjes overgeslagen. Controleer bij een lege waarde of de entiteit-ID klopt.

## Licentie

MIT
