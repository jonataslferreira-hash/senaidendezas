// Gera uma imagem PNG de alta resolução com o pódio e a classificação da aula.

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  const raw = String(text || '');
  if (ctx.measureText(raw).width <= maxWidth) return raw;
  let out = raw;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
  return out + '…';
}

export function renderResultsCanvas(state, lessonTitle = 'Resultado da aula') {
  const ranking = Array.isArray(state?.ranking) ? state.ranking : [];
  const teams = Array.isArray(state?.teams) && state.teams.length ? [...state.teams].sort((a, b) => (b.score || 0) - (a.score || 0)) : [];
  const width = 1400;
  const rowH = 54;
  const hasTeams = teams.length > 0;
  const hasPodium = ranking.length > 0;
  const podiumBlock = hasPodium ? 300 : 80;
  const teamBlock = hasTeams ? 150 : 0;
  const tableRows = Math.min(ranking.length, 40);
  const tableBlock = 96 + Math.max(1, tableRows) * rowH + 40;
  const height = 190 + teamBlock + podiumBlock + tableBlock + 50;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Fundo escuro editorial com brilho suave
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#17122b');
  bg.addColorStop(0.55, '#1b1734');
  bg.addColorStop(1, '#101829');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width / 2, 260, 20, width / 2, 260, 560);
  glow.addColorStop(0, 'rgba(250, 204, 21, 0.16)');
  glow.addColorStop(0.55, 'rgba(139, 92, 246, 0.12)');
  glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Cabeçalho
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a78bfa';
  ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('storagelab.', 64, 58);

  const dateText = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(`${dateText} · ${ranking.length} participante${ranking.length === 1 ? '' : 's'}`, width - 64, 58);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#c4b5fd';
  ctx.font = '800 16px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('PLACAR GERAL FINAL', width / 2, 102);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 40px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(fitText(ctx, lessonTitle || 'Resultado da aula', width - 160), width / 2, 146);

  let y = 200;

  // Bloco de equipes (se houver)
  if (hasTeams) {
    const gap = 20;
    const cols = Math.min(teams.length, 4);
    const cardW = (width - 128 - gap * (cols - 1)) / cols;
    teams.slice(0, cols).forEach((team, idx) => {
      const x = 64 + idx * (cardW + gap);
      const color = team.color || '#38bdf8';
      roundRect(ctx, x, y, cardW, 122, 20);
      ctx.fillStyle = idx === 0 ? 'rgba(250, 204, 21, 0.14)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fill();
      ctx.lineWidth = idx === 0 ? 3 : 1.5;
      ctx.strokeStyle = idx === 0 ? '#facc15' : color;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = idx === 0 ? '#fde047' : 'rgba(255,255,255,0.72)';
      ctx.font = '800 13px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(idx === 0 ? 'EQUIPE CAMPEÃ' : `${idx + 1}º LUGAR`, x + 22, y + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 26px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(fitText(ctx, team.name, cardW - 160), x + 22, y + 62);

      const memberNames = (team.members || []).map(m => m.name).join(', ');
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.font = '600 15px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(fitText(ctx, memberNames || 'Sem integrantes', cardW - 44), x + 22, y + 96);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 30px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(`${Number(team.score || 0).toLocaleString('pt-BR')} pts`, x + cardW - 22, y + 60);
    });
    y += teamBlock;
  }

  // Pódio visual (1º sempre no centro, sem 3º lugar quando só há 2 jogadores)
  if (hasPodium) {
    const winners = ranking.slice(0, 3);
    const slots = winners.length === 1
      ? [{ place: 1, col: 1, person: winners[0] }]
      : winners.length === 2
        ? [{ place: 2, col: 0, person: winners[1] }, { place: 1, col: 1, person: winners[0] }]
        : [{ place: 2, col: 0, person: winners[1] }, { place: 1, col: 1, person: winners[0] }, { place: 3, col: 2, person: winners[2] }];

    const colW = 280;
    const colGap = 28;
    const totalW = colW * 3 + colGap * 2;
    const startX = (width - totalW) / 2;
    const baseY = y + 265;
    const heights = { 1: 158, 2: 112, 3: 84 };
    const fills = { 1: ['#fde047', '#d97706'], 2: ['#93c5fd', '#2563eb'], 3: ['#fdba74', '#ea580c'] };

    for (const slot of slots) {
      const h = heights[slot.place];
      const x = startX + slot.col * (colW + colGap);
      const topY = baseY - h;

      // Nome e pontuação acima da barra
      ctx.textAlign = 'center';
      ctx.fillStyle = slot.place === 1 ? '#fde047' : '#ffffff';
      ctx.font = slot.place === 1 ? '800 28px system-ui, -apple-system, Segoe UI, sans-serif' : '700 22px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(fitText(ctx, slot.person.name, colW - 12), x + colW / 2, topY - 46);

      ctx.fillStyle = 'rgba(255,255,255,0.84)';
      ctx.font = '700 18px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(`${Number(slot.person.score || 0).toLocaleString('pt-BR')} pts`, x + colW / 2, topY - 18);

      // Pedestal
      const [c1, c2] = fills[slot.place];
      const grad = ctx.createLinearGradient(x, topY, x, baseY);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      roundRect(ctx, x, topY, colW, h, 20);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.fillStyle = slot.place === 1 ? '#3b1f00' : '#ffffff';
      ctx.font = '900 44px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(`${slot.place}º`, x + colW / 2, topY + h / 2 + 2);
    }
    y += podiumBlock;
  }

  // Tabela completa de classificação
  const tableX = 64;
  const tableW = width - 128;
  roundRect(ctx, tableX, y, tableW, tableBlock - 20, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#c4b5fd';
  ctx.font = '800 15px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('CLASSIFICAÇÃO COMPLETA', tableX + 28, y + 36);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '700 13px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('POS', tableX + 28, y + 70);
  ctx.fillText('PARTICIPANTE', tableX + 106, y + 70);
  ctx.textAlign = 'right';
  ctx.fillText('ACERTOS', tableX + tableW - 210, y + 70);
  ctx.fillText('PONTOS', tableX + tableW - 28, y + 70);

  let rowY = y + 96;
  ranking.slice(0, tableRows).forEach((p, idx) => {
    if (idx % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.fillRect(tableX + 12, rowY, tableW - 24, rowH - 6);
    }
    const midY = rowY + (rowH - 6) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = idx === 0 ? '#fde047' : 'rgba(255,255,255,0.75)';
    ctx.font = '800 19px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(`${idx + 1}º`, tableX + 28, midY);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(fitText(ctx, p.name, tableW - 420), tableX + 106, midY);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '600 18px system-ui, -apple-system, Segoe UI, sans-serif';
    const hits = Number(p.correct || 0);
    ctx.fillText(`${hits} acerto${hits === 1 ? '' : 's'}`, tableX + tableW - 210, midY);

    ctx.fillStyle = idx === 0 ? '#fde047' : '#ffffff';
    ctx.font = '800 22px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.fillText(`${Number(p.score || 0).toLocaleString('pt-BR')} pts`, tableX + tableW - 28, midY);

    rowY += rowH;
  });

  return canvas;
}

export function downloadResultsPng(state, lessonTitle) {
  const canvas = renderResultsCanvas(state, lessonTitle);
  const filename = 'storage-lab-resultados.png';
  const trigger = url => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  if (typeof canvas.toBlob === 'function') {
    canvas.toBlob(blob => {
      if (blob) trigger(URL.createObjectURL(blob));
      else trigger(canvas.toDataURL('image/png'));
    }, 'image/png');
  } else {
    trigger(canvas.toDataURL('image/png'));
  }
}
