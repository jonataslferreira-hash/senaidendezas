import { avatars, defaultQuestions } from './content.js';
import { demoLesson, validateLesson } from './lessons.js';

export const questions = defaultQuestions;

export const newToken = () => crypto.randomUUID();
export class Room {
  constructor(code, saved, now = Date.now, lesson = demoLesson()) {
    this.now = now;
    this.lesson = validateLesson(saved?.lesson || lesson);
    this.slides = this.lesson.slides;
    this.questions = this.lesson.questions;
    this.data = saved || { code, phase: 'lesson', slide: 0, model: 'ssd', exploded: false, questionIndex: -1, players: [], startedAt: 0, deadline: 0 };
    this.data.lesson = this.lesson;
    if (!saved) this.data.model = this.slides[0].model;
    // A atualização da página interrompe as conexões, mas preserva os pontos.
    for (const p of this.data.players) p.online = false;
    this.tick();
  }
  join({ name, avatar, token } = {}) {
    let p = token && this.data.players.find(p => p.token === token);
    if (!p) {
      if (this.data.phase !== 'lesson') throw Error('O quiz já começou. Entre na próxima rodada.');
      if (this.data.players.length >= 60) throw Error('Esta sala atingiu o limite de 60 participantes.');
      name = String(name || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 24);
      if (!name) throw Error('Digite seu nome ou apelido.');
      p = { id: newToken(), token: newToken(), name, avatar: avatars.includes(avatar) ? avatar : avatars[0], score: 0, correct: 0, answers: {}, online: true };
      this.data.players.push(p);
    }
    p.online = true;
    return { id: p.id, token: p.token };
  }
  disconnect(id) { const p = this.data.players.find(p => p.id === id); if (p) p.online = false; }
  control(action, value) {
    const d = this.data;
    if (action === 'slide' && d.phase === 'lesson' && Number.isInteger(value) && value >= 0 && value < this.slides.length) {
      d.slide = value; d.model = this.slides[value].model; d.exploded = false;
    } else if (action === 'model' && d.phase === 'lesson' && ['hdd', 'ssd', 'nvme'].includes(value)) d.model = value;
    else if (action === 'explode' && d.phase === 'lesson') d.exploded = Boolean(value);
    else if (action === 'quiz' && d.phase === 'lesson') {
      if (!this.questions.length) throw Error('Esta aula não tem perguntas de quiz.');
      if (!d.players.some(p => p.online)) throw Error('Espere pelo menos um participante entrar.');
      for (const p of d.players) { p.score = 0; p.correct = 0; p.answers = {}; }
      this.startQuestion(0);
    } else if (action === 'reveal' && d.phase === 'question') this.reveal();
    else if (action === 'next' && d.phase === 'reveal') {
      if (d.questionIndex + 1 < this.questions.length) this.startQuestion(d.questionIndex + 1);
      else d.phase = 'finished';
    } else if (action === 'finish' && d.phase === 'lesson') d.phase = 'finished';
    else if (action === 'lesson' && ['reveal', 'finished'].includes(d.phase)) { d.phase = 'lesson'; d.questionIndex = -1; }
    else throw Error('Esta ação não está disponível agora.');
  }
  startQuestion(index) {
    Object.assign(this.data, { questionIndex: index, phase: 'question', startedAt: this.now(), deadline: this.now() + this.questions[index].seconds * 1000 });
  }
  answer(id, { choice, questionIndex } = {}) {
    this.tick();
    const d = this.data, p = d.players.find(p => p.id === id), q = this.questions[d.questionIndex];
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
      if (a) { p.score += a.points; if (a.correct) p.correct++; }
    }
    this.data.phase = 'reveal';
  }
  tick() { if (this.data.phase === 'question' && this.now() >= this.data.deadline) this.reveal(); }
  publicLesson(presenter = false) {
    return { id: this.lesson.id, title: this.lesson.title, description: this.lesson.description, quizCount: this.questions.length,
      slides: this.slides.map(({ note, ...slide }) => presenter ? { ...slide, note } : slide) };
  }
  snapshot(id, includeLesson = true) {
    const d = this.data, q = this.questions[d.questionIndex], p = d.players.find(p => p.id === id), a = p?.answers[d.questionIndex];
    const revealed = ['reveal', 'finished'].includes(d.phase);
    return {
      code: d.code, phase: d.phase, slide: d.slide, model: d.model, exploded: d.exploded,
      questionIndex: d.questionIndex, totalQuestions: this.questions.length, serverTime: this.now(),
      ...(includeLesson ? { lesson: this.publicLesson(!id) } : {}),
      ranking: d.players.map(({ id, name, avatar, score, correct, online }) => ({ id, name, avatar, score, correct, online })).sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name, 'pt-BR')),
      answeredCount: d.players.filter(p => p.answers[d.questionIndex]).length,
      question: q && d.phase !== 'lesson' ? { text: q.text, options: q.options, difficulty: q.difficulty, base: q.base, startedAt: d.startedAt, deadline: d.deadline, ...(revealed ? { correct: q.correct, explanation: q.explanation } : {}) } : null,
      me: p ? { id: p.id, score: p.score, answer: a ? { choice: a.choice, ...(revealed ? { points: a.points, correct: a.correct } : {}) } : null } : null
    };
  }
}
