import {catalogPhoto} from './catalog-photos.js';
import {creativeArtPrefix, creativeFramePrefix, newElement} from './canvas-data.js';

function luminance(hex) {
  const clean = String(hex || '#ffffff').replace('#', '');
  const full = clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].reduce((sum, idx, i) => {
    const c = parseInt(full.slice(idx, idx + 2), 16) / 255;
    const lin = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return sum + [0.2126, 0.7152, 0.0722][i] * lin;
  }, 0);
}

function contrast(a, b) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}

function readOn(bg, preferred) {
  if (preferred && contrast(bg, preferred) >= 4.5) return preferred;
  return contrast(bg, '#ffffff') >= contrast(bg, '#141824') ? '#ffffff' : '#141824';
}

export const creativeDirections = {
  'strawberry-party': ['invitation', 'cake', 'friends'],
  'strawberry-poster': ['market-poster', 'market', 'cake'],
  'strawberry-album': ['scrapbook', 'candles', 'picnic'],
  'coastal-postcards': ['postcard', 'coast', 'waves'],
  'moonlight-playlist': ['vinyl', 'vinyl', 'city'],
  'indie-arcade': ['arcade', 'neon', 'show'],
  'sunset-at-home': ['cinema', 'cinema', 'friends'],
  'clay-studio': ['pottery', 'clay', 'flowers'],
  'easy-brunch': ['menu', 'brunch', 'coffee'],
  'rainy-book-club': ['book-jacket', 'book', 'coffee'],
  'neighborhood-art': ['gallery', 'city', 'neon'],
  'picnic-with-friends': ['picnic', 'picnic', 'friends'],
  'birthday-story': ['invitation', 'birthday', 'candles'],
  'morning-vlog': ['storyboard', 'coffee', 'brunch'],
  'roadtrip-vertical': ['roadbook', 'road', 'coast'],
  'moon-zine': ['zine', 'neon', 'city'],
  'market-story': ['market-grid', 'market', 'lemonade'],
  'pet-story': ['portrait', 'dog', 'friends'],
  'outfit-stories': ['lookbook', 'outfit', 'city'],
  'matcha-recipe': ['recipe', 'matcha', 'flowers'],
  'concert-pocket': ['ticket', 'show', 'city'],
  'pocket-quest': ['quest', 'city', 'neon'],
  'friends-scrapbook': ['scrapbook', 'friends', 'picnic'],
  'bloom-feed': ['botanical', 'flowers', 'picnic'],
  'tiny-bakery': ['bakery-grid', 'bakery', 'cake'],
  'ocean-photo-dump': ['photodump', 'waves', 'coast'],
  'after-dark-gallery': ['night-gallery', 'neon', 'city'],
  'sunset-invite': ['sunset', 'coast', 'picnic'],
  'lemonade-cards': ['citrus', 'lemonade', 'market'],
  'vinyl-swap': ['record-swap', 'records', 'vinyl'],
  'kitchen-letters': ['recipe-book', 'brunch', 'bakery'],
  'pixel-stickers': ['pixel', 'neon', 'city'],
  'analog-film-notes': ['zine', 'city', 'neon'],
  'slow-coffee-ritual': ['menu', 'coffee', 'brunch'],
  'city-window-gallery': ['gallery', 'city', 'neon'],
  'garden-seed-swap': ['botanical', 'flowers', 'picnic'],
  'vinyl-side-stories': ['vinyl', 'vinyl', 'records'],
  'weekend-market-route': ['market-grid', 'market', 'lemonade'],
  'night-bus-postcards': ['postcard', 'city', 'road'],
  'backstage-show-diary': ['ticket', 'show', 'neon'],
  'pet-park-moments': ['portrait', 'dog', 'friends'],
  'thrift-store-lookbook': ['lookbook', 'outfit', 'city'],
  'recipe-zine-oven': ['recipe-book', 'bakery', 'cake'],
  'sea-glass-collection': ['photodump', 'coast', 'waves'],
  'board-game-night': ['scrapbook', 'friends', 'records'],
  'flower-color-club': ['botanical', 'flowers', 'brunch'],
  'rooftop-movie-night': ['cinema', 'cinema', 'city']
};

const bound = (x, y, w, h) => ({x, y, w, h});

function fitCopy(value, width, height, limit, fixedWidth) {
  const measure = word => [...word].reduce((sum, letter) => sum + (
    fixedWidth ? .62 : /[MWmw@]/u.test(letter) ? .91
      : /[A-ZÀ-Ý]/u.test(letter) ? .71 : /[.,'’!:;ilÍí]/u.test(letter) ? .35 : .58
  ), 0);
  const paragraphs = value.split('\n').map(paragraph => paragraph.trim().split(/\s+/u).map(measure));
  const longest = Math.max(1, ...paragraphs.flat());
  let size = Math.min(limit, width / longest);
  for (; size > 12; size -= 1) {
    let lines = 0;
    for (const paragraph of paragraphs) {
      lines++;
      let line = 0;
      for (const word of paragraph) {
        const next = line + (line ? .34 : 0) + word;
        if (next * size > width && line) {
          lines++;
          line = word;
        } else {
          line = next;
        }
      }
    }
    if (lines * size * 1.42 <= height) break;
  }
  return size;
}

export function creativeElements(deck, palette, title, body, mode, pageIndex) {
  const [layout, primary, secondary] = creativeDirections[deck.id];
  const wide = deck.format === '16:9';
  const tall = deck.format === '9:16';
  const p = palette;
  const elements = [];
  let textHead = p.title;
  let textInk = p.ink;
  const put = (element, prefix = creativeArtPrefix) => {
    element.id = prefix + element.id;
    elements.push(element);
  };
  const rect = (x, y, w, h, color, extra = {}, prefix = creativeArtPrefix) =>
    put(newElement('shape', {...bound(x, y, w, h), shapeType: 'rectangle', background: color, cornerRadius: 0, ...extra}), prefix);
  const circle = (x, y, d, color) =>
    put(newElement('shape', {...bound(x, y, d, d), shapeType: 'ellipse', background: color}), creativeFramePrefix);
  const photo = (name, box, rotation = 0) => {
    if (name) {
      put(newElement('image', {...bound(...box), ...catalogPhoto(name), rotation}));
      return;
    }
    rect(...box, p.surfaceStrong, {rotation});
  };
  const text = (value, [x, y, w, h], options = {}) => {
    const headline = options.headline === true;
    const fontFamily = options.font || (headline ? p.heading : p.body);
    const maxSize = options.size || (headline ? (wide ? 112 : tall ? 120 : 105) : (wide ? 38 : tall ? 48 : 40));
    const ratio = wide ? 16 / 9 : tall ? 9 / 16 : 1;
    const fontSize = fitCopy(value, w * 12.8 * (fontFamily === 'Verdana' ? .82 : .88),
      h * 12.8 * (fontFamily === 'Verdana' ? .82 : 1) / ratio, maxSize, fontFamily === 'Courier New');
    elements.push(newElement('text', {
      ...bound(x, y, w, h), text: value, fontSize, fontFamily,
      color: options.color || (headline ? textHead : textInk),
      role: headline ? 'title' : '', bold: headline || Boolean(options.bold),
      italic: Boolean(options.italic), align: options.align || 'left', verticalAlign: options.valign || 'center'
    }));
  };
  const copy = (titleBox, bodyBox, options = {}) => {
    text(title, titleBox, {headline: true, font: options.font, size: options.titleSize, italic: options.italic, align: options.align, color: options.titleColor});
    text(body, bodyBox, {font: options.bodyFont, size: options.bodySize, italic: options.bodyItalic, align: options.align, color: options.bodyColor});
  };
  const useBg = value => {
    textHead = readOn(value, p.title);
    textInk = readOn(value, p.ink);
    return value;
  };
  const line = (x, y, w, color = p.accent, h = wide ? .42 : .5) =>
    rect(x, y, w, h, color, {}, creativeFramePrefix + 'line-');
  const framedPhoto = (name, box, rotation = 0) => {
    const [x, y, w, h] = box;
    rect(x, y, w, h, '#fffaf0', {rotation});
    photo(name, [x + w * .055, y + h * .05, w * .89, h * .78], rotation);
  };
  const repositoryLayout = () => {
    const repository = deck.collection;
    const label = deck.categoryLabel?.toUpperCase() || 'STORAGE LAB';
    const entries = body.split('\n').filter(Boolean).slice(0, 3);
    useBg(p.bg);

    if (mode === 'cover') {
      if (repository === 'marp-core') {
        if (wide) {
          rect(0, 0, 2.5, 100, p.accent);
          photo(primary, [57, 9, 36, 82]);
          text(label, [8, 10, 42, 7], {size: 21, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [8, 25, 42, 36], {headline: true, font: 'Georgia', size: 105});
          line(8, 65, 29);
          text(body, [8, 72, 42, 16], {size: 34});
        } else if (tall) {
          photo(primary, [9, 8, 82, 40]);
          text(label, [9, 52, 82, 6], {size: 20, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [9, 61, 82, 17], {headline: true, font: 'Georgia', size: 106});
          line(9, 80, 72);
          text(body, [9, 84, 82, 10], {size: 34});
        } else {
          photo(primary, [55, 8, 37, 45]);
          text(label, [8, 11, 40, 7], {size: 19, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [8, 23, 41, 32], {headline: true, font: 'Georgia', size: 91});
          line(8, 60, 33);
          text(body, [8, 69, 84, 13], {size: 34});
        }
      } else if (repository === 'webslides') {
        if (wide) {
          photo(primary, [43, 0, 57, 100]);
          rect(0, 0, 48, 100, p.surface, {cornerRadius: 2});
          useBg(p.surface);
          text(label, [7, 11, 36, 7], {size: 21, bold: true, color: readOn(p.surface, p.accent)});
          text(deck.name, [7, 26, 36, 34], {headline: true, font: 'Georgia', size: 100});
          line(7, 65, 27);
          text(body, [7, 72, 36, 15], {size: 33});
        } else if (tall) {
          photo(primary, [0, 0, 100, 48]);
          rect(0, 45, 100, 55, p.bg);
          useBg(p.bg);
          text(label, [8, 54, 84, 7], {size: 20, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [8, 64, 84, 15], {headline: true, font: 'Georgia', size: 103});
          line(8, 81, 84);
          text(body, [8, 85, 84, 10], {size: 34});
        } else {
          photo(primary, [0, 0, 100, 54]);
          rect(0, 52, 100, 48, p.bg);
          useBg(p.bg);
          text(label, [8, 59, 84, 6], {size: 19, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [8, 68, 84, 14], {headline: true, font: 'Georgia', size: 94});
          text(body, [8, 84, 84, 10], {size: 33});
        }
      } else if (repository === 'impress-js') {
        if (wide) {
          circle(8, 8, 72, p.tints[0]);
          framedPhoto(primary, [15, 13, 43, 70], -4);
          text(label, [63, 12, 31, 7], {size: 19, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [63, 24, 31, 37], {headline: true, font: 'Georgia', size: 94});
          line(63, 65, 27);
          text(body, [63, 72, 31, 16], {size: 32});
        } else if (tall) {
          circle(14, 6, 72, p.tints[0]);
          framedPhoto(primary, [22, 12, 56, 48], -3);
          text(label, [9, 63, 82, 6], {size: 19, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [9, 71, 82, 14], {headline: true, font: 'Georgia', size: 103});
          text(body, [9, 87, 82, 8], {size: 33});
        } else {
          circle(18, 5, 64, p.tints[0]);
          framedPhoto(primary, [24, 10, 52, 44], -3);
          text(label, [8, 59, 84, 6], {size: 19, bold: true, color: readOn(p.bg, p.accent)});
          text(deck.name, [8, 68, 84, 14], {headline: true, font: 'Georgia', size: 96});
          text(body, [8, 84, 84, 9], {size: 32});
        }
      } else {
        text(label, [8, 9, 84, 6], {size: 20, bold: true, color: readOn(p.bg, p.accent)});
        if (wide) {
          text(deck.name, [8, 19, 84, 29], {headline: true, font: 'Georgia', size: 108});
          line(8, 52, 84);
          photo(primary, [8, 60, 50, 30]);
          text(body, [63, 61, 29, 28], {size: 34});
        } else if (tall) {
          text(deck.name, [8, 18, 84, 19], {headline: true, font: 'Georgia', size: 101});
          photo(primary, [8, 43, 84, 27]);
          line(8, 74, 84);
          text(body, [8, 80, 84, 12], {size: 34});
        } else {
          text(deck.name, [8, 19, 84, 25], {headline: true, font: 'Georgia', size: 103});
          photo(primary, [8, 52, 84, 24]);
          line(8, 80, 84);
          text(body, [8, 84, 84, 8], {size: 32});
        }
      }
      return elements;
    }

    if (mode === 'heart-list') {
      const top = wide ? 28 : tall ? 27 : 29;
      const step = wide ? 21 : tall ? 22 : 20;
      text(title, [8, 8, 84, 14], {headline: true, font: 'Georgia', size: wide ? 84 : 92});
      if (repository === 'webslides' && wide) photo(primary, [79, 8, 13, 84]);
      entries.forEach((entry, index) => {
        const y = top + index * step;
        if (repository === 'impress-js') {
          circle(8, y + 1, 11, p.tints[index % p.tints.length]);
          text(String(index + 1).padStart(2, '0'), [8, y + 2, 11, 7], {size: 20, bold: true, align: 'center'});
          text(entry, [24, y, wide ? 67 : 68, 13], {size: wide ? 34 : 37});
          line(24, y + 15, wide ? 67 : 68, p.border, .3);
        } else {
          const rowWidth = repository === 'webslides' && wide ? 66 : 84;
          rect(8, y, rowWidth, 15, repository === 'marp-core' ? p.surface : p.tints[index % p.tints.length], {cornerRadius: repository === 'webslides' ? 3 : 0}, creativeFramePrefix);
          useBg(repository === 'marp-core' ? p.surface : p.tints[index % p.tints.length]);
          text(String(index + 1).padStart(2, '0'), [11, y + 3, 10, 7], {size: 20, bold: true, color: readOn(repository === 'marp-core' ? p.surface : p.tints[index % p.tints.length], p.accent)});
          text(entry, [24, y + 1, rowWidth - 28, 12], {size: wide ? 32 : 36});
          useBg(p.bg);
        }
      });
      return elements;
    }

    if (mode === 'photo' || mode === 'poster') {
      if (repository === 'webslides') {
        if (wide) {
          photo(primary, mode === 'poster' ? [0, 0, 37, 100] : [0, 0, 100, 58]);
          rect(mode === 'poster' ? 37 : 0, mode === 'poster' ? 0 : 56, mode === 'poster' ? 63 : 100, mode === 'poster' ? 100 : 44, p.surface);
          useBg(p.surface);
          const x = mode === 'poster' ? 44 : 8;
          const width = mode === 'poster' ? 48 : 84;
          text(title, [x, mode === 'poster' ? 21 : 64, width, 15], {headline: true, font: 'Georgia', size: 90});
          line(x, mode === 'poster' ? 41 : 82, Math.min(width, 70));
          text(body, [x, mode === 'poster' ? 50 : 86, width, mode === 'poster' ? 28 : 9], {size: 34});
        } else {
          photo(primary, [7, 8, 86, tall ? 42 : 46]);
          text(title, [8, tall ? 55 : 59, 84, 14], {headline: true, font: 'Georgia', size: 91});
          line(8, tall ? 72 : 77, 84);
          text(body, [8, tall ? 77 : 82, 84, tall ? 13 : 10], {size: 34});
        }
      } else if (repository === 'impress-js') {
        if (wide) {
          circle(31, 7, 68, p.tints[0]);
          framedPhoto(primary, [39, 10, 51, 65], pageIndex % 2 ? 4 : -4);
          text(title, [7, 18, 28, 25], {headline: true, font: 'Georgia', size: 78});
          text(body, [7, 54, 28, 25], {size: 32});
        } else {
          framedPhoto(primary, [17, 8, 66, tall ? 45 : 49], pageIndex % 2 ? 4 : -4);
          circle(9, tall ? 49 : 54, 22, p.tints[0]);
          text(title, [9, tall ? 64 : 68, 82, 12], {headline: true, font: 'Georgia', size: 88});
          text(body, [9, tall ? 79 : 83, 82, 11], {size: 34});
        }
      } else if (repository === 'marp-core') {
        if (wide) {
          photo(primary, [55, 8, 38, 84]);
          text(title, [8, 19, 40, 28], {headline: true, font: 'Georgia', size: 89});
          line(8, 52, 30);
          text(body, [8, 60, 40, 23], {size: 34});
        } else if (tall) {
          photo(primary, [9, 8, 82, 42]);
          text(title, [9, 56, 82, 14], {headline: true, font: 'Georgia', size: 94});
          line(9, 73, 82);
          text(body, [9, 78, 82, 13], {size: 35});
        } else {
          photo(primary, [56, 9, 36, 80]);
          text(title, [8, 20, 42, 24], {headline: true, font: 'Georgia', size: 85});
          line(8, 50, 34);
          text(body, [8, 58, 42, 25], {size: 32});
        }
      } else {
        if (wide) {
          text(title, [8, 9, 84, 13], {headline: true, font: 'Georgia', size: 82});
          photo(primary, [8, 28, 40, 60]);
          line(53, 29, 39);
          text(body, [53, 38, 39, 45], {size: 34});
        } else if (tall) {
          text(title, [8, 8, 84, 14], {headline: true, font: 'Georgia', size: 90});
          photo(primary, [8, 28, 84, 39]);
          line(8, 71, 84);
          text(body, [8, 77, 84, 13], {size: 34});
        } else {
          text(title, [8, 8, 84, 12], {headline: true, font: 'Georgia', size: 83});
          photo(primary, [8, 28, 40, 60]);
          text(body, [54, 31, 38, 48], {size: 33});
        }
      }
      return elements;
    }

    if (mode === 'album' || mode === 'sticker-page') {
      if (repository === 'impress-js') {
        if (wide) {
          framedPhoto(primary, [8, 14, 35, 65], -4);
          framedPhoto(secondary || primary, [36, 22, 35, 63], 4);
          text(title, [74, 17, 20, 34], {headline: true, font: 'Georgia', size: 67});
          text(body, [74, 58, 20, 23], {size: 29});
        } else if (tall) {
          framedPhoto(primary, [8, 8, 56, 41], -4);
          framedPhoto(secondary || primary, [37, 29, 55, 39], 4);
          text(title, [8, 73, 84, 9], {headline: true, font: 'Georgia', size: 80});
          text(body, [8, 84, 84, 8], {size: 32});
        } else {
          framedPhoto(primary, [8, 10, 49, 48], -4);
          framedPhoto(secondary || primary, [43, 22, 49, 47], 4);
          text(title, [8, 74, 84, 9], {headline: true, font: 'Georgia', size: 77});
          text(body, [8, 85, 84, 8], {size: 30});
        }
      } else if (repository === 'webslides') {
        if (wide) {
          photo(primary, [0, 0, 50, 76]);
          photo(secondary || primary, [50, 0, 50, 76]);
          rect(0, 74, 100, 26, p.surface);
          useBg(p.surface);
          text(title, [7, 77, 42, 10], {headline: true, font: 'Georgia', size: 72});
          text(body, [53, 77, 39, 12], {size: 31});
        } else {
          photo(primary, [8, 8, 84, tall ? 35 : 40]);
          photo(secondary || primary, [8, tall ? 47 : 52, 84, tall ? 27 : 25]);
          rect(8, tall ? 77 : 80, 84, tall ? 15 : 12, p.surface);
          useBg(p.surface);
          text(title, [12, tall ? 78 : 81, 76, 6], {headline: true, font: 'Georgia', size: 64});
          text(body, [12, tall ? 84 : 87, 76, 6], {size: 27});
        }
      } else {
        if (wide) {
          rect(7, 8, 86, 84, repository === 'marp-core' ? p.surface : p.tints[2], {cornerRadius: repository === 'marp-core' ? 0 : 4}, creativeFramePrefix);
          photo(primary, [11, 12, 43, 54]);
          photo(secondary || primary, [57, 12, 34, 30]);
          useBg(repository === 'marp-core' ? p.surface : p.tints[2]);
          text(title, [57, 48, 34, 13], {headline: true, font: 'Georgia', size: 71});
          text(body, [57, 64, 34, 19], {size: 29});
        } else if (tall) {
          photo(primary, [8, 8, 84, 42]);
          photo(secondary || primary, [8, 54, 39, 28]);
          text(title, [52, 56, 40, 12], {headline: true, font: 'Georgia', size: 67});
          text(body, [52, 71, 40, 13], {size: 27});
        } else {
          photo(primary, [8, 8, 52, 54]);
          photo(secondary || primary, [64, 8, 28, 32]);
          text(title, [64, 46, 28, 15], {headline: true, font: 'Georgia', size: 62});
          text(body, [64, 64, 28, 22], {size: 25});
        }
      }
      return elements;
    }

    if (mode === 'cloud-page' || mode === 'note') {
      if (repository === 'impress-js') {
        if (wide) {
          circle(8, 8, 80, p.tints[0]);
          rect(16, 20, 68, 57, p.surface, {cornerRadius: 4}, creativeFramePrefix);
          useBg(p.surface);
          text(title, [22, 28, 56, 16], {headline: true, font: 'Georgia', size: 86, align: 'center'});
          line(35, 49, 30);
          text(body, [23, 57, 54, 13], {size: 34, align: 'center'});
        } else {
          circle(11, 7, 78, p.tints[0]);
          rect(15, 23, 70, 50, p.surface, {cornerRadius: 4}, creativeFramePrefix);
          useBg(p.surface);
          text(title, [20, 30, 60, 12], {headline: true, font: 'Georgia', size: 86, align: 'center'});
          line(35, 47, 30);
          text(body, [21, 54, 58, 14], {size: 32, align: 'center'});
        }
      } else if (repository === 'webslides') {
        if (wide) {
          photo(primary, [0, 0, 42, 100]);
          rect(42, 0, 58, 100, p.surface);
          useBg(p.surface);
          text(title, [50, 22, 42, 25], {headline: true, font: 'Georgia', size: 89});
          line(50, 53, 35);
          text(body, [50, 61, 42, 23], {size: 34});
        } else {
          photo(primary, [8, 8, 84, tall ? 35 : 40]);
          rect(8, tall ? 48 : 53, 84, tall ? 42 : 37, p.surface);
          useBg(p.surface);
          text(title, [14, tall ? 54 : 59, 72, 12], {headline: true, font: 'Georgia', size: 82});
          line(14, tall ? 69 : 73, 72);
          text(body, [14, tall ? 75 : 78, 72, 12], {size: 33});
        }
      } else if (repository === 'marp-core') {
        rect(wide ? 9 : 7, wide ? 12 : 9, wide ? 82 : 86, wide ? 76 : 82, p.surface, {borderWidth: 2, borderColor: p.border}, creativeFramePrefix);
        useBg(p.surface);
        rect(wide ? 9 : 7, wide ? 12 : 9, 2, wide ? 76 : 82, p.accent);
        text(title, [wide ? 17 : 14, wide ? 25 : 22, wide ? 66 : 72, 18], {headline: true, font: 'Georgia', size: wide ? 96 : 104});
        line(wide ? 17 : 14, wide ? 48 : 47, wide ? 66 : 72);
        text(body, [wide ? 17 : 14, wide ? 58 : 57, wide ? 66 : 72, wide ? 18 : 20], {size: wide ? 38 : 41});
      } else {
        text(title, [8, wide ? 18 : 20, 84, wide ? 20 : 16], {headline: true, font: 'Georgia', size: wide ? 102 : 96, align: 'center'});
        line(8, wide ? 44 : 43, 84);
        text(body, [12, wide ? 54 : 52, 76, wide ? 22 : 23], {size: wide ? 38 : 37, align: 'center'});
      }
      return elements;
    }

    text(title, [8, 20, 84, 20], {headline: true, font: 'Georgia', size: 92});
    line(8, 46, 84);
    text(body, [8, 56, 84, 22], {size: 36});
    return elements;
  };
  if (['marp-core', 'webslides', 'impress-js', 'gnab-remark'].includes(deck.collection)) {
    return repositoryLayout();
  }
  if (mode === 'cover') {
    switch (layout) {
      case 'invitation':
      case 'portrait':
      case 'lookbook':
      case 'pottery':
      case 'menu':
      case 'recipe': {
        if (wide) {
          photo(primary, layout === 'invitation' ? [0, 0, 47, 100] : [5, 9, 43, 82]);
          line(55, 17, 34, p.accent, .6);
          copy([55, 25, 38, 42], [55, 69, 37, 19], {font: layout === 'lookbook' ? 'Trebuchet MS' : 'Georgia', titleSize: 106, bodySize: 39});
          text(deck.categoryLabel?.toUpperCase() || 'STORAGE LAB', [55, 10, 38, 7], {size: 22, bold: true, color: p.accent});
        } else if (tall) {
          photo(primary, [8, 7, 84, 43]);
          text(deck.categoryLabel?.toUpperCase() || 'STORAGE LAB', [9, 55, 82, 7], {size: 23, bold: true, color: p.accent});
          copy([9, 63, 82, 19], [9, 84, 82, 10], {font: 'Georgia', titleSize: 110, bodySize: 39});
        } else {
          photo(primary, [7, 7, 48, 86]);
          text(deck.categoryLabel?.toUpperCase() || 'STORAGE LAB', [61, 13, 31, 8], {size: 21, bold: true, color: p.accent});
          copy([61, 25, 32, 43], [61, 72, 32, 16], {font: 'Georgia', titleSize: 87, bodySize: 32});
        }
        break;
      }
      case 'market-poster':
      case 'arcade':
      case 'quest':
      case 'pixel':
      case 'ticket': {
        rect(0, 0, 100, 100, p.accent);
        useBg(p.accent);
        if (wide) {
          rect(5, 8, 60, 84, p.bg, {cornerRadius: 3}, creativeFramePrefix);
          useBg(p.bg);
          text(deck.name.toUpperCase(), [10, 18, 50, 42], {headline: true, font: deck.id === 'pixel-stickers' || deck.id === 'indie-arcade' ? 'Courier New' : 'Impact', size: 130});
          text(body, [10, 68, 50, 17], {size: 36});
          photo(primary, [70, 18, 22, 64]);
          line(10, 61, 49, p.accent, .8);
        } else if (tall) {
          photo(primary, [14, 8, 72, 34]);
          rect(6, 47, 88, 46, p.bg, {cornerRadius: 3}, creativeFramePrefix);
          useBg(p.bg);
          text(deck.name.toUpperCase(), [12, 54, 76, 22], {headline: true, font: deck.id === 'pocket-quest' ? 'Courier New' : 'Impact', size: 118, align: 'center'});
          text(body, [14, 80, 72, 10], {size: 36, align: 'center'});
        } else {
          photo(primary, [8, 18, 26, 64]);
          rect(40, 8, 54, 84, p.bg, {cornerRadius: 3}, creativeFramePrefix);
          useBg(p.bg);
          text(deck.name.toUpperCase(), [46, 17, 43, 40], {headline: true, font: deck.id === 'pixel-stickers' ? 'Courier New' : 'Impact', size: 105});
          text(body, [46, 64, 42, 18], {size: 32});
          line(46, 57, 42, p.accent, .8);
        }
        break;
      }
      case 'scrapbook':
      case 'photodump':
      case 'night-gallery': {
        if (tall) {
          framedPhoto(primary, [7, 7, 58, 42], -5);
          framedPhoto(secondary || primary, [36, 24, 57, 39], 5);
          text(title, [8, 69, 84, 15], {headline: true, font: 'Georgia', size: 103});
          text(body, [8, 86, 84, 9], {font: 'Georgia', size: 36, italic: true});
        } else if (wide) {
          framedPhoto(primary, [5, 10, 31, 71], -5);
          framedPhoto(secondary || primary, [24, 33, 30, 55], 5);
          text(title, [60, 17, 35, 40], {headline: true, font: 'Georgia', size: 99});
          line(60, 62, 28);
          text(body, [60, 69, 35, 17], {font: 'Georgia', size: 35, italic: true});
        } else {
          framedPhoto(primary, [7, 7, 48, 50], -5);
          framedPhoto(secondary || primary, [44, 21, 48, 44], 5);
          text(title, [8, 68, 84, 15], {headline: true, font: 'Georgia', size: 98});
          text(body, [8, 85, 84, 9], {font: 'Georgia', size: 35, italic: true});
        }
        break;
      }
      case 'postcard':
      case 'roadbook':
      case 'storyboard': {
        if (wide) {
          rect(0, 0, 64, 100, p.tints[0], {}, creativeFramePrefix);
          photo(primary, [4, 7, 56, 86]);
          text('POSTCARD  /  01', [70, 12, 24, 8], {size: 20, bold: true, color: p.accent});
          copy([70, 27, 24, 38], [70, 69, 24, 17], {font: 'Georgia', titleSize: 84, bodySize: 30});
        } else if (tall) {
          text('FIELD NOTES  /  01', [9, 6, 82, 7], {size: 21, bold: true, color: p.accent});
          photo(primary, [8, 16, 84, 45]);
          copy([9, 68, 82, 14], [9, 84, 82, 9], {font: 'Georgia', titleSize: 100, bodySize: 35});
        } else {
          photo(primary, [7, 7, 86, 51]);
          text('POSTCARD  /  01', [9, 63, 34, 7], {size: 19, bold: true, color: p.accent});
          copy([9, 70, 82, 14], [9, 86, 82, 8], {font: 'Georgia', titleSize: 94, bodySize: 32});
        }
        break;
      }
      case 'vinyl':
      case 'record-swap': {
        if (wide) {
          circle(9, 11, 72, p.surfaceStrong);
          circle(20, 22, 50, p.bg);
          photo(primary, [31, 30, 28, 28]);
          text(title, [61, 17, 33, 39], {headline: true, font: 'Georgia', size: 96});
          line(61, 61, 28);
          text(body, [61, 69, 33, 17], {size: 36});
        } else {
          circle(20, 7, 60, p.surfaceStrong);
          circle(29, 16, 42, p.bg);
          photo(primary, [38, 25, 24, 24]);
          text(title, [8, 70, 84, 15], {headline: true, font: 'Georgia', size: 98});
          text(body, [8, 87, 84, 8], {size: 33});
        }
        break;
      }
      case 'cinema':
      case 'sunset': {
        rect(0, 0, 100, 23, p.accent);
        useBg(p.accent);
        text(deck.name.toUpperCase(), [6, 5, 88, 11], {size: 25, bold: true, align: 'center'});
        useBg(p.bg);
        if (wide) {
          photo(primary, [7, 29, 86, 46]);
          copy([8, 78, 84, 11], [8, 90, 84, 7], {font: 'Georgia', titleSize: 80, bodySize: 29});
        } else if (tall) {
          photo(primary, [7, 27, 86, 47]);
          text(title, [8, 78, 84, 12], {headline: true, font: 'Georgia', size: 96, align: 'center'});
          text(body, [8, 91, 84, 7], {size: 33, align: 'center'});
        } else {
          photo(primary, [7, 28, 86, 48]);
          text(title, [8, 80, 84, 11], {headline: true, font: 'Georgia', size: 89, align: 'center'});
          text(body, [8, 92, 84, 6], {size: 31, align: 'center'});
        }
        break;
      }
      case 'gallery':
      case 'botanical':
      case 'bakery-grid':
      case 'market-grid':
      case 'citrus': {
        if (wide) {
          photo(primary, [48, 8, 45, 84]);
          rect(7, 10, 34, 80, p.surface, {borderWidth: 2, borderColor: p.border}, creativeFramePrefix);
          text(deck.name.toUpperCase(), [11, 19, 26, 38], {headline: true, font: 'Georgia', size: 89});
          line(11, 61, 24);
          text(body, [11, 68, 26, 16], {size: 33});
          circle(40, 8, 12, p.tints[0]);
        } else if (tall) {
          photo(primary, [7, 7, 86, 47]);
          circle(72, 48, 20, p.tints[0]);
          text(deck.name.toUpperCase(), [9, 62, 82, 15], {headline: true, font: 'Georgia', size: 101});
          text(body, [9, 80, 82, 12], {size: 36});
        } else {
          photo(primary, [7, 7, 54, 86]);
          text(deck.name.toUpperCase(), [65, 15, 29, 39], {headline: true, font: 'Georgia', size: 83});
          line(65, 59, 25);
          text(body, [65, 66, 29, 19], {size: 31});
        }
        break;
      }
      case 'book-jacket':
      case 'recipe-book':
      case 'zine': {
        rect(6, 6, 88, 88, p.surface, {borderWidth: 2, borderColor: p.border}, creativeFramePrefix);
        if (wide) {
          photo(primary, [11, 12, 33, 76]);
          text(deck.name.toUpperCase(), [50, 16, 39, 43], {headline: true, font: 'Georgia', size: 96});
          line(50, 63, 34);
          text(body, [50, 71, 37, 16], {font: 'Georgia', size: 34, italic: true});
        } else if (tall) {
          photo(primary, [13, 11, 74, 42]);
          text(deck.name.toUpperCase(), [13, 58, 74, 19], {headline: true, font: 'Georgia', size: 100});
          line(13, 79, 74);
          text(body, [13, 83, 74, 8], {font: 'Georgia', size: 34, italic: true});
        } else {
          photo(primary, [12, 12, 76, 44]);
          text(deck.name.toUpperCase(), [13, 62, 74, 18], {headline: true, font: 'Georgia', size: 93});
          text(body, [13, 83, 74, 8], {font: 'Georgia', size: 33, italic: true});
        }
        break;
      }
      default:
        photo(primary, wide ? [48, 8, 45, 84] : [8, 8, 84, tall ? 46 : 50]);
        copy(wide ? [7, 19, 37, 42] : [8, tall ? 62 : 66, 84, 15],
          wide ? [7, 66, 37, 18] : [8, tall ? 80 : 84, 84, 10], {font: 'Georgia'});
    }
    return elements;
  }

  switch (mode) {
    case 'photo':
      if (wide) {
        const imageOnRight = pageIndex % 2 === 1;
        photo(pageIndex % 2 === 0 ? secondary || primary : primary, imageOnRight ? [48, 8, 46, 84] : [6, 8, 46, 84]);
        const x = imageOnRight ? 7 : 59;
        line(x, 17, 24);
        copy([x, 25, 34, 35], [x, 64, 34, 21], {font: layout.includes('book') ? 'Georgia' : p.heading});
      } else if (tall) {
        photo(primary, [7, 7, 86, 47]);
        line(8, 59, 34);
        copy([8, 64, 84, 14], [8, 80, 84, 13], {font: 'Georgia'});
      } else {
        photo(primary, [7, 7, 86, 49]);
        line(8, 61, 28);
        copy([8, 67, 84, 13], [8, 82, 84, 10], {font: 'Georgia'});
      }
      break;
    case 'heart-list': {
      rect(5, 7, 90, 86, p.tints[0], {cornerRadius: 5}, creativeFramePrefix);
      rect(9, 11, 82, 78, p.bg, {cornerRadius: 3}, creativeFramePrefix);
      useBg(p.bg);
      text(title, [15, 15, 70, 14], {headline: true, font: 'Georgia', size: wide ? 86 : 92});
      const entries = body.split('\n').filter(Boolean);
      const top = 36;
      const step = (wide ? 48 : 45) / Math.max(1, entries.length);
      entries.forEach((entry, i) => {
        const y = top + i * step;
        circle(15, y + step * .27, Math.min(4.5, step * .45), p.tints[i % p.tints.length]);
        text(entry, [23, y, 65, step - 1], {size: wide ? 34 : tall ? 39 : 36, bold: i === 0});
      });
      break;
    }
    case 'poster': {
      if (wide) {
        const photoRight = pageIndex % 2 === 0;
        photo(photoRight ? secondary || primary : primary, photoRight ? [69, 0, 31, 100] : [0, 0, 31, 100]);
        const x = photoRight ? 7 : 39;
        line(x, 15, 22);
        copy([x, 24, 52, 39], [x, 67, 50, 19], {font: layout.includes('poster') ? 'Impact' : 'Georgia', titleSize: 104});
      } else if (tall) {
        photo(primary, [8, 7, 84, 39]);
        line(9, 51, 35);
        copy([9, 58, 82, 16], [9, 77, 82, 14], {font: 'Impact', titleSize: 109});
      } else {
        photo(primary, [7, 7, 34, 86]);
        line(49, 18, 35);
        copy([49, 27, 43, 36], [49, 67, 43, 18], {font: 'Impact', titleSize: 100});
      }
      break;
    }
    case 'cloud-page':
      if (wide) {
        circle(8, 7, 13, p.tints[0]);
        circle(78, 9, 10, p.tints[1]);
        photo(secondary || primary, [24, 12, 52, 53]);
        copy([8, 70, 84, 12], [8, 84, 84, 9], {font: 'Georgia', titleSize: 88, bodySize: 33});
      } else if (tall) {
        circle(5, 5, 14, p.tints[0]);
        circle(80, 5, 14, p.tints[1]);
        photo(secondary || primary, [12, 12, 76, 43]);
        copy([8, 61, 84, 15], [8, 79, 84, 12], {font: 'Georgia', titleSize: 104, bodySize: 38});
      } else {
        circle(6, 5, 13, p.tints[0]);
        circle(81, 5, 13, p.tints[1]);
        photo(secondary || primary, [16, 13, 68, 48]);
        copy([8, 67, 84, 13], [8, 82, 84, 10], {font: 'Georgia', titleSize: 94, bodySize: 35});
      }
      break;
    case 'sticker-page':
      if (wide) {
        rect(0, 0, 100, 100, p.tints[2]);
        useBg(p.tints[2]);
        photo(primary, [7, 8, 49, 84]);
        rect(61, 17, 31, 66, p.bg, {cornerRadius: 4}, creativeFramePrefix);
        copy([65, 23, 24, 27], [65, 55, 24, 20], {font: 'Georgia', titleSize: 76, bodySize: 31});
      } else if (tall) {
        rect(0, 0, 100, 100, p.tints[2]);
        useBg(p.tints[2]);
        photo(primary, [10, 8, 80, 42]);
        rect(8, 57, 84, 34, p.bg, {cornerRadius: 4}, creativeFramePrefix);
        copy([13, 61, 76, 12], [13, 76, 76, 12], {font: 'Georgia', titleSize: 93, bodySize: 36});
      } else {
        rect(0, 0, 100, 100, p.tints[2]);
        useBg(p.tints[2]);
        photo(primary, [8, 7, 84, 50]);
        rect(12, 65, 76, 26, p.bg, {cornerRadius: 4}, creativeFramePrefix);
        copy([17, 67, 66, 10], [17, 79, 66, 9], {font: 'Georgia', titleSize: 83, bodySize: 33});
      }
      break;
    case 'album':
      if (wide) {
        framedPhoto(primary, [38, 12, 25, 72], -5);
        framedPhoto(secondary || primary, [66, 16, 25, 68], 5);
        copy([7, 17, 25, 31], [7, 54, 25, 27], {font: 'Georgia', titleSize: 76, bodySize: 31});
      } else if (tall) {
        framedPhoto(primary, [8, 8, 57, 43], -5);
        framedPhoto(secondary || primary, [37, 25, 55, 40], 5);
        copy([9, 70, 82, 12], [9, 84, 82, 9], {font: 'Georgia', titleSize: 96, bodySize: 35});
      } else {
        framedPhoto(primary, [7, 8, 48, 50], -5);
        framedPhoto(secondary || primary, [45, 20, 48, 45], 5);
        copy([8, 70, 84, 12], [8, 84, 84, 9], {font: 'Georgia', titleSize: 91, bodySize: 34});
      }
      break;
    case 'note':
      rect(wide ? 9 : 7, wide ? 14 : 9, wide ? 82 : 86, wide ? 72 : 82, p.surface, {borderWidth: 2, borderColor: p.border}, creativeFramePrefix);
      useBg(p.surface);
      line(wide ? 17 : 13, wide ? 30 : 26, wide ? 66 : 74);
      copy(wide ? [17, 37, 66, 19] : [13, 34, 74, 21],
        wide ? [17, 60, 66, 17] : [13, 58, 74, 19], {font: 'Georgia', titleSize: wide ? 102 : 112, bodySize: wide ? 40 : 45});
      break;
    default:
      copy([8, 23, 84, 23], [8, 52, 84, 20], {font: 'Georgia'});
      line(8, 81, 84);
  }

  return elements;
}
