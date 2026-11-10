import {openSlideThemes} from './open-slide-themes.js';
import {studioSlideThemes} from './studio-slide-themes.js';

export const AI_PHOTO_LIMIT=15;
export const AI_SLIDE_LIMIT=20;
export const AI_PHOTOS_PER_SHEET=5;
export const aiThemes=['ocean','midnight','paper','sage','ember','iris','glacier','sand','cosmos','citrus','lagoon','rose',...Object.keys(openSlideThemes),...Object.keys(studioSlideThemes)];
export const aiLayouts=['cover','split','feature','gallery','statement','editorial'];

