// Streams supplied by the user; kept separate from the editor's playlist.
const classic='https://nu.vgmtreasurechest.com/soundtracks/kahoot-soundtrack/';
const mobile='https://jetta.vgmtreasurechest.com/soundtracks/kahoot-android-ios-mobile-gamerip-2013/';
const track=(root,id,title,path,seconds)=>({id,title,url:root+path.split('/').map(encodeURIComponent).join('/'),...(seconds?{seconds}:{})});
export const lobbyTracks=[
 track(classic,'lobby-beatbox','Beatbox','rcjnoflo/Beatbox Lobby Theme.mp3'),
 track(classic,'lobby-christmas','Christmas 2020','nvpozfcv/Christmas Lobby Music 2020.mp3'),
 track(classic,'lobby-ghost-theme','Ghost Mode Theme','plluthfd/Ghost Mode Lobby Theme.mp3'),
 track(classic,'lobby-halloween','Halloween 2019','asopgpdw/Halloween 2019 Lobby Music.mp3'),
 track(classic,'lobby-ghost','Ghost Mode','axlmejin/Ghost Mode Lobby Music.mp3'),
 track(classic,'lobby-classic','Lobby clássico','awgsuvsc/Lobby Music.mp3'),
 track(classic,'lobby-space','Space','borpzfzk/Lobby Music [Space Music].mp3'),
 track(mobile,'lobby-kids','Kids Background','pqlgyzzb/21. Kids Background.mp3'),
 track(classic,'lobby-jungle','Jungle','egvkkxiz/Jungle Lobby Theme.mp3')
];
export const questionTracks=[
 track(mobile,'alt2-10','Alt 2 · 10 s','frsqagcs/01. Alt02 Answer 010sec.mp3',10),
 track(mobile,'alt2-20','Alt 2 · 20 s','innbtnkj/02. Alt02 Answer 020sec.mp3',20),
 track(mobile,'alt2-30','Alt 2 · 30 s','tqvidtjn/03. Alt02 Answer 030sec.mp3',30),
 track(mobile,'alt3-10','Alt 3 · 10 s','ltksimlt/04. Alt03 Answer 010sec.mp3',10),
 track(mobile,'alt3-20','Alt 3 · 20 s','jrfctmfp/05. Alt03 Answer 020sec.mp3',20),
 track(mobile,'alt3-30','Alt 3 · 30 s','jzvfpive/06. Alt03 Answer 030sec.mp3',30),
 track(mobile,'alt3-60','Alt 3 · 60 s','lqwkkxgo/07. Alt03 Answer 060sec.mp3',60),
 track(mobile,'alt3-90','Alt 3 · 90 s','zipzfbpv/08. Alt03 Answer 090sec.mp3',90),
 track(mobile,'alt3-120','Alt 3 · 120 s','lqudieye/09. Alt03 Answer 120sec.mp3',120),
 track(mobile,'alt1-10','Alt 1 · 10 s','apxuemyh/10. Answer 10sec.mp3',10),
 track(mobile,'alt1-20','Alt 1 · 20 s','qglikcdl/11. Answer 20sec.mp3',20),
 track(mobile,'alt1-30','Alt 1 · 30 s','uryrqbkw/12. Answer 30sec.mp3',30),
 track(classic,'timer-120-1','Countdown 1 · 120 s','rmlrdrys/In Game Music (120 Second Countdown) 1_1.mp3',120),
 track(classic,'timer-120-2','Countdown 2 · 120 s','bimjmfsv/In Game Music (120 Second Timer) 2_3.mp3',120),
 track(classic,'british-20','British Month · 20 s','btpvgtcg/In Game Music (20 Second Countdown) (British Month).mp3',20),
 track(classic,'timer-60','Countdown · 60 s','fqnrtusg/In Game Music (60 Second Count Down) 2_3.mp3',60),
 track(classic,'british-60','British Month · 60 s','ziuwzgjc/In Game Music (British Month) (60 Second Countdown).mp3',60),
 track(classic,'british-120','British Month · 120 s','iiqgjcjo/In Game Music (British Month)~(120 Second Timer).mp3',120),
 track(classic,'ghost-20','Ghost Mode · 20 s','rsnnyffl/In Game Music Ghost Mode (20 Second Timer) 1_2.mp3',20),
 track(classic,'ghost-30','Ghost Mode · 30 s','onvqsqcp/In Game Music Ghost Mode (30 Second Timer) 2_2.mp3',30)
];
export const countdownTracks=[
 track(classic,'five-1','Últimos 5 segundos · 1','mlshjztt/In Game Music (5 Second Count Down) 1_3.mp3',5),
 track(classic,'five-2','Últimos 5 segundos · 2','nhzcktpt/In Game Music (5 Second Count Down) 2_3.mp3',5),
 track(classic,'five-3','Últimos 5 segundos · 3','zowqqgkg/In Game Music (5 Second Countdown) 3_3.mp3',5)
];
export const resultTrack=track(mobile,'result','Resultado','iiuygoxy/29. Theend.mp3');
export const podiumTrack=track(mobile,'podium','Kids Gameplay','mjhkeqqj/25. Kids Gameplay.mp3');
export function chooseTrack(list,previous,random=Math.random){const choices=list.filter(t=>t.id!==previous);const pool=choices.length?choices:list;return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];}
export function timedTracks(seconds){const durations=[...new Set(questionTracks.map(t=>t.seconds))].sort((a,b)=>a-b),duration=durations.find(d=>d>=seconds)||durations.at(-1);return questionTracks.filter(t=>t.seconds===duration);}
