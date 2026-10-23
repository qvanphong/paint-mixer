declare module 'spectral.js' {
  class Color {
    constructor(value: string | readonly number[]);
    readonly lRGB: number[];
    readonly XYZ: number[];
    readonly KS: number[];
    readonly luminance: number;
    tintingStrength: number;
    toString(options?: { format?: 'hex' | 'rgb'; method?: 'map' | 'clip' }): string;
  }

  const spectral: {
    Color: typeof Color;
    mix(...colors: [Color, number][]): Color;
  };

  export default spectral;
}
