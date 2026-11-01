import { slides, defaultQuestions } from './content.js';
import { compactLesson } from './assets.js';

export const LIBRARY_KEY = 'storage-lab-lessons-v1';
export const MAX_LESSON_BYTES = 48 * 1024 * 1024;
export const difficulties = { 'Fácil': 1000, 'Média': 1500, 'Difícil': 2000 };
export const clone = value => JSON.parse(JSON.stringify(value));
const uid = () => crypto.randomUUID();
const text = (value, max = 6000) => typeof value === 'string' ? value.slice(0, max) : '';

export function imageURL(value) {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > 2_000_000) throw Error('Use uma imagem de até 1,4 MB.');
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return url.href;
  } catch { /* mensagem abaixo */ }
  throw Error('A imagem precisa ser PNG, JPEG, WebP, GIF ou um link HTTPS.');
}

export function newSlide() {
  return { id: uid(), kind: 'text', tag: 'Uma nova ideia', title: 'Novo slide', intro: '', points: [], callout: '', note: '', model: 'ssd', image: '', imageAlt: '', prompt: '', answer: '' };
}
export function newQuestion() {
  return { id: uid(), text: 'Nova pergunta', options: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'], correct: 0, difficulty: 'Fácil', base: 1000, seconds: 20, explanation: '' };
}
export function newLesson() {
  return { version: 1, id: uid(), title: 'Minha nova aula', description: '', updatedAt: Date.now(), slides: [newSlide()], questions: [] };
}
export function demoLesson() {
  return { version: 1, id: 'hdd-ssd-demo', title: 'HDD e SSD: por dentro dos seus dados', description: 'Professor por um dia · Senai · Grupo 4 · 10–12 minutos', updatedAt: 0,
    slides: slides.map((slide, i) => ({ ...clone(slide), id: 'hardware-' + i, kind: 'model', image: '', imageAlt: '' })),
    questions: defaultQuestions.map((q, i) => ({ ...clone(q), id: 'hardware-question-' + i })) };
}

export function validateLesson(input, { draft = false } = {}) {
  if (!input || typeof input !== 'object' || input.version !== 1) throw Error('Este arquivo não é uma aula no formato JSON da plataforma (versão 1).');
  if (JSON.stringify(input).length > MAX_LESSON_BYTES) throw Error('A aula excede o limite de 48 MB. Divida a apresentação.');
  if (!Array.isArray(input.slides) || input.slides.length < 1 || input.slides.length > 80) throw Error('A aula precisa ter de 1 a 80 slides.');
  if (!Array.isArray(input.questions) || input.questions.length > 50) throw Error('O quiz pode ter até 50 perguntas.');
  const title = text(input.title, 140);
  if (!draft && !title.trim()) throw Error('Dê um título para a aula.');
  const result = { version: 1, id: text(input.id, 100) || uid(), title, description: text(input.description, 500), updatedAt: Number(input.updatedAt) || 0 };
  result.slides = input.slides.map((s, i) => {
    if (!s || !['text', 'image', 'model', 'document'].includes(s.kind)) throw Error('Tipo inválido no slide ' + (i + 1) + '.');
    const title = text(s.title, 200);
    if (!draft && !title.trim()) throw Error('Preencha o título do slide ' + (i + 1) + '.');
    const image = imageURL(s.image);
    const assetId = typeof s.assetId === 'string' && /^asset-[a-f0-9-]{36}$/.test(s.assetId) ? s.assetId : '';
    if (s.assetId && !assetId) throw Error('Referência de imagem inválida no slide ' + (i + 1) + '.');
    if (s.kind === 'document' && !image && !assetId) throw Error('A página importada ' + (i + 1) + ' está sem imagem.');
    if (!draft && s.kind === 'image' && !image) throw Error('Adicione a imagem do slide ' + (i + 1) + '.');
    if (!draft && s.kind === 'image' && !text(s.imageAlt, 500).trim()) throw Error('Descreva a imagem do slide ' + (i + 1) + ' para os alunos.');
    if (s.kind === 'model' && !['ssd', 'hdd', 'nvme'].includes(s.model)) throw Error('Escolha um modelo 3D válido no slide ' + (i + 1) + '.');
    return { id: text(s.id, 100) || uid(), kind: s.kind, title, tag: text(s.tag, 160), intro: text(s.intro), points: Array.isArray(s.points) ? s.points.slice(0, 12).map(p => text(p, 1000)) : [],
      callout: text(s.callout, 1000), note: text(s.note), prompt: text(s.prompt, 1000), answer: text(s.answer, 3000), comparison: Boolean(s.comparison), model: ['ssd', 'hdd', 'nvme'].includes(s.model) ? s.model : 'ssd', image, imageAlt: text(s.imageAlt, 500),
      ...(assetId ? { assetId } : {}), sourceType: ['pdf', 'pptx'].includes(s.sourceType) ? s.sourceType : '', pageWidth: Math.max(1, Math.min(8000, Number(s.pageWidth) || 1600)), pageHeight: Math.max(1, Math.min(8000, Number(s.pageHeight) || 900)) };
  });
  result.questions = input.questions.map((q, i) => {
    if (!q || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) throw Error('A pergunta ' + (i + 1) + ' precisa ter de 2 a 4 alternativas.');
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) throw Error('Escolha a resposta correta da pergunta ' + (i + 1) + '.');
    if (!Object.hasOwn(difficulties, q.difficulty)) throw Error('Escolha a dificuldade da pergunta ' + (i + 1) + '.');
    const seconds = Number(q.seconds);
    if (!Number.isInteger(seconds) || seconds < 5 || seconds > 300) throw Error('O tempo da pergunta ' + (i + 1) + ' deve ser de 5 a 300 segundos.');
    const options = q.options.map(o => text(o, 500)), questionText = text(q.text, 1500);
    if (!draft && (!questionText.trim() || options.some(o => !o.trim()))) throw Error('Preencha a pergunta ' + (i + 1) + ' e todas as alternativas.');
    return { id: text(q.id, 100) || uid(), text: questionText, options, correct: q.correct, difficulty: q.difficulty, base: difficulties[q.difficulty], seconds, explanation: text(q.explanation, 3000) };
  });
  if (JSON.stringify(result).length > MAX_LESSON_BYTES) throw Error('A aula excede o limite de 48 MB.');
  return result;
}

export class LessonLibrary {
  constructor(storage = localStorage) {
    this.storage = storage;
    this.warning = '';
    const raw = storage.getItem(LIBRARY_KEY);
    if (raw === null) {
      this.lessons = [demoLesson()];
      this.persist(this.lessons);
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw Error();
        this.lessons = parsed.map(lesson => validateLesson(lesson, { draft: true }));
      } catch {
        this.lessons = [];
        this.warning = 'Não foi possível ler a biblioteca salva. Seus dados foram preservados; exporte ou recupere o armazenamento antes de substituí-los.';
      }
    }
  }
  persist(next) {
    if (this.warning) throw Error(this.warning);
    try { this.storage.setItem(LIBRARY_KEY, JSON.stringify(next)); }
    catch { throw Error('O navegador não conseguiu salvar. Exporte sua aula em JSON para guardar uma cópia; tente reduzir as imagens ou liberar espaço.'); }
    this.lessons = next;
  }
  save(lesson) {
    const validated = compactLesson(validateLesson({ ...lesson, updatedAt: Date.now() }, { draft: true }));
    const next = this.lessons.filter(l => l.id !== validated.id);
    next.unshift(validated); this.persist(next);
    return clone(validated);
  }
  remove(id) { this.persist(this.lessons.filter(l => l.id !== id)); }
  duplicate(id) {
    const source = this.lessons.find(l => l.id === id);
    if (!source) throw Error('A aula não foi encontrada.');
    return this.save({ ...clone(source), id: uid(), title: source.title + ' (cópia)' });
  }
  import(input) { return this.save({ ...validateLesson(input, { draft: true }), id: uid() }); }
  restoreDemo() {
    const lesson = demoLesson(); lesson.id = uid();
    return this.save(lesson);
  }
}
