import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDemoPack } from '../demo';
import { MapCanvas } from './MapCanvas';

describe('MapCanvas coordinate surface', () => {
  it('uses the floor image dimensions for both aspect ratio and SVG coordinates', () => {
    const html = renderToStaticMarkup(<MapCanvas pack={createDemoPack()} />);
    expect(html).toContain('aspect-ratio:1200 / 720');
    expect(html).toContain('viewBox="0 0 1200 720"');
    expect(html).toContain('translate(144 360)');
  });
});
