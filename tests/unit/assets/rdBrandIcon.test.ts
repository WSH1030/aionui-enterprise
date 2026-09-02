/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const PNG_TARGETS = [
  'resources/app.png',
  'resources/app_dev.png',
  'resources/icon.png',
  'resources/aionui_logo_no_border.png',
  'packages/desktop/src/renderer/assets/logos/brand/app.png',
  'mobile/assets/images/icon.png',
];

describe('Rd Worker brand icon assets', () => {
  it.each(PNG_TARGETS)('%s has transparent rounded corners', async (relativePath) => {
    const image = sharp(path.resolve(process.cwd(), relativePath));
    const metadata = await image.metadata();
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];

    expect(metadata.hasAlpha).toBe(true);
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(info.width - 1, 0)).toBe(0);
    expect(alphaAt(0, info.height - 1)).toBe(0);
    expect(alphaAt(info.width - 1, info.height - 1)).toBe(0);
    expect(alphaAt(Math.floor(info.width / 2), Math.floor(info.height / 2))).toBe(255);
  });
});
