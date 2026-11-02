const wiiPlay = new URL('./assets/covers/wii-play.jpg', import.meta.url).href;
const wiiParty = new URL('./assets/covers/wii-party.jpg', import.meta.url).href;
const wiiU = new URL('./assets/covers/wii-u.jpg', import.meta.url).href;
export const editorTracks = [
  {id:'wii-play',title:'Title (Wii Play)',artist:'Wii Play',cover:wiiPlay,color:'#93beb9',url:'https://nu.vgmtreasurechest.com/soundtracks/wii-music-collection/kxgoydxa/17.%20Title%20%28Wii%20Play%29.mp3'},
  {id:'rankings',title:'Rankings',artist:'Wii Party',cover:wiiParty,color:'#d8a78c',url:'https://lambda.vgmtreasurechest.com/soundtracks/wii-party/mapbjtqw/004%20-%20Rankings.mp3'},
  {id:'mii-tv',title:'Mii Maker — Editing a Mii (TV)',artist:'Wii U',cover:wiiU,color:'#a59acb',url:'https://lambda.vgmtreasurechest.com/soundtracks/wii-u-system-audio-background-music/obpsvapz/50.%20Mii%20Maker%20-%20Editing%20a%20Mii%20%28TV%29.mp3'},
  {id:'mii-menu',title:'Mii Maker — Menu (Gamepad)',artist:'Wii U',cover:wiiU,color:'#a8c290',url:'https://lambda.vgmtreasurechest.com/soundtracks/wii-u-system-audio-background-music/nfpitvwv/48.%20Mii%20Maker%20-%20Menu%20%28Gamepad%29.mp3'},
  {id:'mii-gamepad',title:'Mii Maker — Editing a Mii (Gamepad)',artist:'Wii U',cover:wiiU,color:'#9eb9d5',url:'https://lambda.vgmtreasurechest.com/soundtracks/wii-u-system-audio-background-music/qpeaotay/49.%20Mii%20Maker%20-%20Editing%20a%20Mii%20%28Gamepad%29.mp3'}
];
export function musicCover(track){return track.cover||'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="24" fill="${track.color}"/><circle cx="111" cy="40" r="49" fill="#ffffff22"/><circle cx="44" cy="126" r="57" fill="#ffffff22"/><text x="80" y="98" text-anchor="middle" fill="#fff" font-family="Georgia" font-size="66">♫</text></svg>`);}
export function spotifyTrackId(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='open.spotify.com')return null;return /^\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]{22})\/?$/.exec(u.pathname)?.[1]||null;}catch{return null;}}
