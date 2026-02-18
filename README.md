# HRM Connect

> Real-time heart rate variability monitoring and biofeedback training in your browser.

<!-- screenshot -->

## Features

- **Real-time HRV monitoring** — live SDNN, RMSSD, and pNN50 from RR intervals
- **Stress gauge** — Baevsky stress index visualised as an animated gauge
- **Frequency analysis** — LF/HF power bands and LF/HF ratio via FFT
- **Poincaré plot** — scatter plot of successive RR intervals for ANS assessment
- **Breathing guide** — paced resonance-frequency breathing pacer (5–6 BPM)
- **Estimated respiration rate** — derived from RR interval oscillations
- **Heart rate zones** — age-adjusted zone indicator updated in real time
- **Morning readiness test** — guided HRV measurement for daily readiness scoring
- **Session history** — past sessions stored locally; review stats and trends
- **Draggable dashboard** — fully resizable, rearrangeable grid layout per breakpoint
- **Dark / light theme** — persisted across sessions
- **Battery level** — reads monitor battery via BLE Battery Service

## Tech Stack

| Layer | Library / API |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| Charts | Recharts 3 |
| Animation | Framer Motion 12 |
| Dashboard grid | react-grid-layout |
| Bluetooth | Web Bluetooth API |
| Local storage | IndexedDB via `idb` |
| FFT | fft.js |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build

# Run tests
npm test
```

## Browser Requirements

The Web Bluetooth API is required. Supported browsers:

- **Google Chrome** 56+ (desktop)
- **Microsoft Edge** 79+ (desktop)

> Firefox and Safari do not support Web Bluetooth.  
> The page must be served over **HTTPS** or **localhost** — Web Bluetooth is blocked on plain HTTP.

## Compatible Devices

Any Bluetooth Low Energy heart rate monitor that exposes the standard **Heart Rate** GATT service works. Tested with:

- **Polar H10** — recommended; provides full RR interval data required for HRV analysis

Other devices (Polar H9, Wahoo TICKR, Garmin HRM-Pro, etc.) should work for basic HR; RR interval availability varies by device.

## License

MIT — see [LICENSE](LICENSE)
