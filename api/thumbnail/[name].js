import * as gridEngine from "../../engine/engine.js";
import { palette } from "../../palette.js";
// import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import path from 'path';

async function drawGame(game) {

  // const url = `https://raw.githubusercontent.com/hackclub/sprig/main/games/${game}.js`;
  // const src = await fetch(url).then(x => x.text());

  const file = path.join(process.cwd(), 'games', `${game}.js`);
  const src = readFileSync(file, 'utf8');

  let screen, bitmaps;
  const setScreenSize = (w, h) => screen = {
    data: new Uint8Array(w*h*4),
    width: w
  };
  const { api, state } = gridEngine.init({
    palette,
    setBitmaps: bm => bitmaps = bm,
    setScreenSize,
    drawText: () => {}
  });
  api.setScreenSize = setScreenSize;
  api.afterInput = () => {};
  api.onInput = () => {};

  try {
    new Function(...Object.keys(api), src)(...Object.values(api));

    if (!screen) throw new Error("never set screen size");
    if (!bitmaps) throw new Error("never set legend");
  } catch(e) {
    console.error(`couldn't run ${game}: ${e}`);
    return {};
  }

  screen.data.fill(255);
  drawTiles(state, api, screen, bitmaps);
  
  return { name: game, image: screen, url };


  function blitSprite(screen, sprite, tx, ty) {
    const [_, { imageData: { data: bitmap } }] = sprite;
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 16; y++) {
        const sx = tx*16 + x;
        const sy = ty*16 + y;

        if (bitmap[(y*16 + x)*4 + 3] < 255) continue;

        screen.data[(sy*screen.width + sx)*4 + 0] = bitmap[(y*16 + x)*4 + 0];
        screen.data[(sy*screen.width + sx)*4 + 1] = bitmap[(y*16 + x)*4 + 1];
        screen.data[(sy*screen.width + sx)*4 + 2] = bitmap[(y*16 + x)*4 + 2];
        screen.data[(sy*screen.width + sx)*4 + 3] = bitmap[(y*16 + x)*4 + 3];
      }
  }

  function drawTiles(state, api, screen, bitmaps) {
    const { dimensions, legend } = state;
    const { width, height, maxTileDim } = dimensions;

    const grid = api.getGrid();

    for (const cell of grid) {
      const zOrder = legend.map(x => x[0]);
      cell.sort((a, b) => zOrder.indexOf(a.type) - zOrder.indexOf(b.type));

      for (const { x, y, type } of cell) {
        blitSprite(screen, bitmaps.find(x => x[0] == type), x, y);
      }
    }
  }
}

export default async function handler(request, response) {
  const { name } = request.query;
  const data = await drawGame(name);
  return response.status(200).json(data);
}