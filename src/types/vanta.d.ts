declare module 'vanta/dist/vanta.fog.min.js' {
  interface VantaEffect {
    destroy: () => void;
    resize: () => void;
    setOptions: (options: {
      highlightColor?: number;
      midtoneColor?: number;
      lowlightColor?: number;
      baseColor?: number;
      blurFactor?: number;
      speed?: number;
      zoom?: number;
    }) => void;
  }

  interface VantaOptions {
    el: HTMLElement | null;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
  }

  const FOG: (options: VantaOptions) => VantaEffect;
  export default FOG;
}

