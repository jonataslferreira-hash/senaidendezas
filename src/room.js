import {activityBlocks} from './activity-blocks.js';
import {isPhotoAvatar} from './player-avatar.js';
import { avatars, defaultQuestions } from './content.js';
import { demoLesson, validateLesson } from './lessons.js';

export const questions = defaultQuestions;

export const newToken = () => crypto.randomUUID();
export class Room {
  constructor(code, saved, now = Date.now, lesson = demoLesson(), startIndex) {
    this.now = now;
    this.lesson = validateLesson(saved?.lesson || lesson);
    this.slides = this.lesson.slides;
    this.questions = this.lesson.questions;
    this.data = saved || { code, phase: 'lesson', slide: 0, model: 'ssd', exploded: false, questionIndex: -1, players: [], startedAt: 0, deadline: 0 };
    this.data.lesson = this.lesson;
    if(this.lesson.activityBlocks){this.blocks=activityBlocks(this.lesson).filter(b=>b.items.length);if(!saved)this.enterBlock(0);else this.selectQuestions(this.data.blockIndex||0);}
    if (!saved&&!this.blocks){this.data.model=this.slides[0].model;if(this.lesson.activityOrder?.[0]==='quiz'&&this.questions.length)this.data.phase='lobby';}
    if (!saved && Number.isInteger(startIndex) && this.slides[startIndex]) {
      const blockIndex=this.blocks?.findIndex(b=>b.type==='slides'&&b.items.includes(this.slides[startIndex].id));
      if (blockIndex>=0) this.enterBlock(blockIndex);
      if (!this.blocks || blockIndex>=0) {
        this.data.phase='lesson';
        this.data.slide=startIndex;
        this.data.model=this.slides[startIndex].model;
        this.data.animationStep=0;
      }
    }
    // A atualização da página interrompe as conexões, mas preserva os pontos.
    for (const p of this.data.players) p.online = false;
    this.tick();
  }
  selectQuestions(index){const block=this.blocks?.[index];if(!block)return;const quiz=block.type==='quiz'?block:this.blocks.slice(index+1).find(b=>b.type==='quiz');this.questions=quiz?this.lesson.questions.filter(q=>quiz.items.includes(q.id)):[];}
  enterBlock(index){const block=this.blocks?.[index];if(!block)throw Error('Etapa não encontrada.');this.data.blockIndex=index;this.selectQuestions(index);this.data.questionIndex=-1;this.data.startedAt=0;this.data.deadline=0;if(block.type==='quiz')this.data.phase='lobby';else{const slide=this.slides.findIndex(s=>block.items.includes(s.id));this.data.slide=Math.max(0,slide);this.data.model=this.slides[this.data.slide].model;this.data.animationStep=0;this.data.phase=block.type==='poll'?'poll':'lesson';if(block.type==='poll'){this.data.pollId=newToken();this.data.votes={};}}}
  activity(){if(!this.blocks)return null;const index=this.data.blockIndex||0,block=this.blocks[index];return {id:block.id,index,type:block.type,slideIndices:this.slides.flatMap((s,i)=>block.items.includes(s.id)?[i]:[]),hasNext:index+1<this.blocks.length||(block.type==='poll'&&block.items.indexOf(this.slides[this.data.slide]?.id)<block.items.length-1),nextType:this.blocks[index+1]?.type||''};}
  join({ name, avatar, token } = {}) {
    if(token&&(this.data.removedTokens||[]).includes(token))throw Error('Você foi removido desta sala pelo professor.');
    let p = token && this.data.players.find(p => p.token === token);
    if (!p) {
      if (!['lesson', 'lobby', 'poll', 'poll-results'].includes(this.data.phase)) throw Error('O quiz já começou. Entre na próxima rodada.');
      if (this.data.players.length >= 60) throw Error('Esta sala atingiu o limite de 60 participantes.');
      name = String(name || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 24);
      if (!name) throw Error('Digite seu nome ou apelido.');
      p = { id: newToken(), token: newToken(), name, avatar: avatars.includes(avatar)||isPhotoAvatar(avatar) ? avatar : avatars[0], score: 0, correct: 0, streak:0, answers: {}, online: true };
      this.data.players.push(p);
    }
    p.online = true;
    return { id: p.id, token: p.token };
  }
  disconnect(id) { const p = this.data.players.find(p => p.id === id); if (p) p.online = false; }
  control(action, value) {
    const d = this.data;
    if(action==='next-stage'&&this.blocks){const a=this.activity(),next=a.slideIndices[a.slideIndices.indexOf(d.slide)+1];if(a.type==='poll'&&next!==undefined){d.slide=next;d.phase='poll';d.pollId=newToken();d.votes={};}else if((d.blockIndex||0)+1<this.blocks.length)this.enterBlock((d.blockIndex||0)+1);else d.phase='finished';
    } else if (action === 'edit-slide' && d.phase === 'lesson' && value?.index === d.slide) {
      const nextSlides = this.slides.map((slide, i) => i === value.index ? { ...value.slide, id: slide.id } : slide);
      const next = validateLesson({ ...this.lesson, slides: nextSlides });
      const changedModel = this.slides[d.slide].model !== next.slides[d.slide].model || this.slides[d.slide].kind !== next.slides[d.slide].kind;
      this.lesson = next; this.slides = next.slides; this.questions = next.questions; d.lesson = next;if(this.blocks)this.selectQuestions(d.blockIndex||0);
      if (changedModel) { d.model = next.slides[d.slide].model; d.exploded = false; }
    } else if(action==='kick'){this.kick(value);
    } else if(action==='ranking'&&d.phase==='reveal'){d.phase=d.questionIndex+1===this.questions.length?'finished':'leaderboard';d.resultStartedAt=this.now();d.podiumRevealed=false;
    } else if(action==='podium-all'&&d.phase==='finished'){d.podiumRevealed=true;
    } else if(action==='animation'&&d.phase==='lesson'){const max=Math.max(0,...(this.slides[d.slide].animations||[]).map(a=>a.group||0));d.animationStep=Math.max(0,Math.min(max,Math.floor(Number(value)||0)));
    } else if (action === 'slide' && d.phase === 'lesson' && Number.isInteger(value) && value >= 0 && value < this.slides.length) {
      if(this.blocks){const block=this.blocks.findIndex(b=>b.type!=='quiz'&&b.items.includes(this.slides[value].id));if(block>=0){d.blockIndex=block;this.selectQuestions(block);}}d.slide = value;d.animationStep=0; d.model = this.slides[value].model; d.exploded = false;
    } else if (action === 'poll' && d.phase === 'lesson') {
      if (!this.slides[d.slide].poll) throw Error('Adicione uma enquete a este slide no editor.');
      d.phase = 'poll'; d.pollId = newToken(); d.votes = {};
    } else if (action === 'close-poll' && d.phase === 'poll') d.phase = 'poll-results';
    else if (action === 'model' && d.phase === 'lesson' && (['hdd', 'ssd', 'nvme'].includes(value) || value === 'custom' && this.slides[d.slide].customModel)) d.model = value;
    else if (action === 'explode' && d.phase === 'lesson') d.exploded = Boolean(value);
    else if (action === 'quiz' && d.phase === 'lesson') {
      if(this.blocks){const index=this.blocks.findIndex((b,i)=>i>=(d.blockIndex||0)&&b.type==='quiz');if(index>=0)this.enterBlock(index);}
      if (!this.questions.length) throw Error('Esta aula não tem perguntas de quiz.');
      Object.assign(d, { phase: 'lobby', questionIndex: -1, startedAt: 0, deadline: 0 });
    } else if (action === 'start-quiz' && d.phase === 'lobby') {
      if (!d.players.some(p => p.online)) throw Error('Espere pelo menos um participante entrar.');
      for (const p of d.players) { p.score = 0; p.correct = 0;p.streak=0; p.answers = {}; }
      Object.assign(d, { phase: 'countdown', questionIndex: -1, startedAt: this.now(), deadline: this.now() + 3000 });
    } else if (action === 'reveal' && d.phase === 'question') this.reveal();
    else if (action === 'next' && ['reveal','leaderboard'].includes(d.phase)) {
      if (d.questionIndex + 1 < this.questions.length) this.startQuestion(d.questionIndex + 1);
      else {d.phase = 'finished';d.resultStartedAt=this.now();d.podiumRevealed=false;}
    } else if (action === 'finish' && d.phase === 'lesson') d.phase = 'finished';
    else if (action === 'lesson' && ['lobby', 'countdown', 'reveal','leaderboard', 'finished', 'poll', 'poll-results'].includes(d.phase)) {if(this.blocks&&['quiz','poll'].includes(this.blocks[d.blockIndex||0].type)){if(!['lobby','countdown'].includes(d.phase)&&(d.blockIndex||0)+1<this.blocks.length)this.enterBlock((d.blockIndex||0)+1);else{const first=this.blocks.findIndex(b=>b.type==='slides');if(first>=0)this.enterBlock(first);else d.phase='finished';}}else{d.phase = 'lesson'; d.questionIndex = -1;} }
    else throw Error('Esta ação não está disponível agora.');
  }
  updateProfile(id,{name,avatar}={}){const p=this.data.players.find(p=>p.id===id);if(!p)throw Error('Participante não encontrado.');name=String(name||'').trim().replace(/[\x00-\x1f\x7f]/g,'').slice(0,24);if(!name)throw Error('Digite seu nome.');p.name=name;if(avatars.includes(avatar)||isPhotoAvatar(avatar))p.avatar=avatar;}
  kick(id){const p=this.data.players.find(p=>p.id===id);if(!p)throw Error('Participante não encontrado.');this.data.removedTokens=[...(this.data.removedTokens||[]),p.token].slice(-120);this.data.players=this.data.players.filter(p=>p.id!==id);if(this.data.votes)delete this.data.votes[id];}
  startQuestion(index) {
    this.data.previousRanking=[...this.data.players].sort((a,b)=>b.score-a.score||b.correct-a.correct||a.name.localeCompare(b.name,'pt-BR')).map(p=>p.id);this.data.previousScores=Object.fromEntries(this.data.players.map(p=>[p.id,p.score]));
    Object.assign(this.data, { questionIndex: index, phase: 'question', startedAt: this.now(), deadline: this.now() + this.questions[index].seconds * 1000 });
  }
  answer(id, { choice, questionIndex } = {}) {
    this.tick();
    const d = this.data, p = d.players.find(p => p.id === id), q = this.questions[d.questionIndex];
    if (d.phase === 'poll') {
      const poll = this.slides[d.slide].poll;
      if (!p || questionIndex !== d.pollId || !Number.isInteger(choice) || choice < 0 || choice >= poll.options.length) throw Error('Voto inválido ou enquete já mudou.');
      if (Object.hasOwn(d.votes, id)) throw Error('Seu voto já foi registrado.');
      d.votes[id] = choice; return;
    }
    if (!p || d.phase !== 'question' || this.now() >= d.deadline) throw Error('O tempo desta pergunta terminou.');
    if (questionIndex !== d.questionIndex) throw Error('Esta pergunta já mudou.');
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) throw Error('Resposta inválida.');
    if (p.answers[d.questionIndex]) throw Error('Sua resposta já foi registrada.');
    const correct = choice === q.correct;
    const remaining = Math.max(0, Math.min(1, (d.deadline - this.now()) / (d.deadline - d.startedAt)));
    p.answers[d.questionIndex] = { choice, correct, points: correct ? Math.round(q.base * (0.5 + 0.5 * remaining)) : 0 };
  }
  reveal() {
    if (this.data.phase !== 'question') return;
    for (const p of this.data.players) {
      const a = p.answers[this.data.questionIndex];
      if (a) { p.score += a.points; if (a.correct) p.correct++; }p.streak=a?.correct?(p.streak||0)+1:0;
    }
    this.data.phase = 'reveal';
  }
  tick() { if (this.data.phase === 'countdown' && this.now() >= this.data.deadline) this.startQuestion(0); else if (this.data.phase === 'question' && this.now() >= this.data.deadline) this.reveal(); }
  publicLesson(presenter = false) {
    return { id: this.lesson.id, title: this.lesson.title, description: this.lesson.description,...(this.lesson.customFonts?{customFonts:this.lesson.customFonts}:{}),...(this.lesson.activityBlocks?{activityBlocks:this.lesson.activityBlocks}:{}),activityOrder:this.lesson.activityOrder,gameSettings:this.lesson.gameSettings, quizCount: this.questions.length,
      ...(presenter ? { quizAudio: this.lesson.quizAudio,lobbyAudio:this.lesson.lobbyAudio,questionAudio:this.lesson.questionAudio } : {}),
      slides: this.slides.map(({ note, audio, ...slide }) => presenter ? { ...slide, note, audio } : { ...slide, elements:slide.elements?.map(({audio,...element})=>element) }) };
  }
  snapshot(id, includeLesson = true) {
    const d = this.data, q = this.questions[d.questionIndex], p = d.players.find(p => p.id === id), a = p?.answers[d.questionIndex];
    const revealed = ['reveal','leaderboard', 'finished'].includes(d.phase);
    return {
      code: d.code, phase: d.phase,activity:this.activity(),resultStartedAt:d.resultStartedAt||0,podiumRevealed:Boolean(d.podiumRevealed), animationStep:d.animationStep||0, slide: d.slide, model: d.model, exploded: d.exploded,
      questionIndex: d.questionIndex, totalQuestions: this.questions.length, serverTime: this.now(),
      countdownEndsAt: d.phase === 'countdown' ? d.deadline : 0,
      poll: ['poll', 'poll-results'].includes(d.phase) ? { ...this.slides[d.slide].poll, id: d.pollId, total: Object.keys(d.votes).length, choice: p && Object.hasOwn(d.votes, id) ? d.votes[id] : null, counts: this.slides[d.slide].poll.options.map((_, i) => Object.values(d.votes).filter(v => v === i).length) } : null,
      ...(includeLesson ? { lesson: this.publicLesson(!id) } : {}),
      ranking: d.players.map(({ id, name, avatar, score, correct, online,streak }) => ({ id, name, avatar, score, correct, online,streak:streak||0,previousScore:d.previousScores?.[id]||0,previousRank:(d.previousRanking||[]).indexOf(id)+1 })).sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name, 'pt-BR')),
      answeredCount: d.players.filter(p => p.answers[d.questionIndex]).length,
      question: q && d.phase !== 'lesson' ? { text: q.text, options: q.options, difficulty: q.difficulty, base: q.base, startedAt: d.startedAt, deadline: d.deadline, ...(revealed ? { correct: q.correct, explanation: q.explanation } : {}) } : null,
      me: p ? { id: p.id,name:p.name,avatar:p.avatar,streak:p.streak||0, score: p.score, answer: a ? { choice: a.choice, ...(revealed ? { points: a.points, correct: a.correct } : {}) } : null } : null
    };
  }
}
