# HRM Connect

A modern web application for Heart Rate Variability (HRV) monitoring and biofeedback training.

## Features

- **Real-time HRV Monitoring**: Connects to Bluetooth heart rate monitors to visualize HRV in real-time.
- **Resonance Frequency Breathing**: Guided breathing exercises to help you reach your resonance frequency.
- **Biofeedback**: Visual and auditory feedback to optimize your breathing and HRV.
- **Session Tracking**: Record and review your sessions to track progress over time.
- **Advanced Analytics**: Poincare plots, frequency analysis, and stress metrics.

## Tech Stack

- **Framework**: React + TypeScript + Vite
- **Styling**: Vanilla CSS with a focus on modern, responsive design.
- **Bluetooth**: Web Bluetooth API for device connectivity.
- **Charting**: Recharts for data visualization.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## Requirements

- A Bluetooth Low Energy (BLE) heart rate monitor (e.g., Polar H10).
- A browser that supports the Web Bluetooth API (Chrome, Edge, etc.).
