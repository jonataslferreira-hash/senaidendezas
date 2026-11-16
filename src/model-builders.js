import * as THREE from 'three';

export const PART_DETAILS = {
  // 1-3: Tecnologia (SSD, HDD, NVMe)
  platter: ['Pratos magnéticos', 'Discos metálicos polidos que giram a milhares de RPM guardando bits em trilhas magnéticas concêntricas.'],
  spindle: ['Motor spindle', 'Eixo de alta precisão que faz os pratos girarem em velocidade constante (5.400 ou 7.200 RPM).'],
  arm: ['Braço atuador e cabeça', 'Move a cabeça magnética em milissegundos para ler e gravar dados sem encostar no prato.'],
  vcm: ['Bobina de voz (VCM)', 'Ímã de neodímio e bobina eletromagnética que posicionam o braço com precisão microscópica.'],
  casing: ['Carcaça protetora', 'Estrutura vedada que protege os componentes internos contra impactos, poeira e calor.'],
  pcb: ['Placa de circuito (PCB)', 'Placa com trilhas de cobre que distribui energia e conecta todos os chips e controladores.'],
  nand: ['Memória Flash 3D NAND', 'Armazena os dados eletronicamente em células empilhadas, sem partes móveis e com acesso instantâneo.'],
  dram: ['Cache DRAM', 'Memória ultra-rápida que guarda o mapa de endereços do SSD para acelerar leituras e gravações.'],
  controller: ['Controlador', 'Processador dedicado que organiza os dados, corrige erros e equilibra o desgaste da memória.'],
  heatsink: ['Dissipador e thermal pad', 'Aletas metálicas com almofada térmica que retiram o calor do controlador em altas velocidades.'],
  sata: ['Conector SATA', 'Interface de dados e energia de até 600 MB/s usada em discos 2,5" e 3,5".'],
  nvme: ['Conector M.2 PCIe (M-Key)', 'Barramento direto à placa-mãe que alcança milhares de megabytes por segundo.'],

  // 4: Tecnologia — Processador (CPU)
  cpu_pins: ['Contatos LGA dourados', 'Centenas de pontos de contato banhados a ouro que ligam o processador ao soquete da placa-mãe.'],
  cpu_pcb: ['Substrato multicamadas', 'Placa de fibra de vidro com dezenas de camadas de trilhas microscópicas que alimentam o chip.'],
  cpu_die: ['Die de silício (Núcleos e Cache)', 'Pastilha de silício com bilhões de transistores organizados em núcleos de processamento e cache L3.'],
  cpu_smd: ['Capacitores SMD de filtragem', 'Microcomponentes que estabilizam a tensão elétrica de altíssima frequência que entra nos núcleos.'],
  cpu_ihs: ['Espalhador térmico (IHS)', 'Tampa metálica de cobre niquelado que protege o silício e distribui o calor para o cooler.'],
  cpu_cooler: ['Dissipador e heatpipes', 'Aletas de alumínio e tubos de cobre que absorvem o calor do IHS e o dissipam para o ar.'],

  // 5: Física — Circuito Elétrico
  battery: ['Fonte de tensão (9V)', 'Fornece a diferença de potencial (tensão U) que impulsiona os elétrons pelo circuito.'],
  wire: ['Condutores de cobre', 'Fios de baixa resistência que conduzem a corrente elétrica (I) da fonte até os componentes.'],
  switch: ['Interruptor', 'Abre ou fecha o caminho da corrente elétrica, ligando ou desligando o circuito com segurança.'],
  resistor: ['Resistor (Lei de Ohm)', 'Limita a corrente elétrica (R = U / I). Suas faixas coloridas indicam o valor em Ohms (Ω).'],
  bulb: ['Lâmpada incandescente', 'Transforma energia elétrica em luz e calor quando a corrente percorre o filamento interno.'],

  // 6: Física — Prisma Óptico
  prism: ['Prisma de vidro óptico', 'Desvia cada cor da luz em um ângulo diferente porque o índice de refração varia com a frequência.'],
  emitter: ['Fonte de luz branca', 'Emite luz policromática, formada pela sobreposição de todas as cores do espectro visível.'],
  spectrum: ['Espectro disperso', 'Separação da luz branca nas 7 faixas do arco-íris: o vermelho desvia menos e o violeta desvia mais.'],
  prism_base: ['Base óptica graduada', 'Suporte de laboratório que mantém o prisma alinhado no ângulo ideal de incidência.'],

  // 7: Física — Motor Elétrico DC
  motor_stator: ['Ímãs do estator (Polos N e S)', 'Criam um campo magnético fixo que interage com a corrente da bobina gerando força de rotação.'],
  motor_coil: ['Rotor e bobina de cobre', 'Enrolamentos de fio condutor que viram eletroímãs ao receber corrente elétrica (Força de Lorentz).'],
  motor_commutator: ['Comutador bipartido', 'Anel de cobre dividido que inverte o sentido da corrente a cada meia volta mantendo o giro contínuo.'],
  motor_brushes: ['Escovas de grafite e terminais', 'Fazem contato deslizante com o comutador levando energia da fonte até o rotor giratório.'],
  motor_shaft: ['Eixo motor e polia', 'Transmite a energia mecânica de rotação produzida no interior do motor para o trabalho externo.'],

  // 8: Química — Átomo de Bohr
  nucleus: ['Núcleo atômico', 'Região central superdensa formada por prótons (+) e nêutrons (sem carga), concentrando a massa do átomo.'],
  orbit_k: ['Camada K (n = 1)', 'Nível de energia mais próximo do núcleo, comportando até 2 elétrons.'],
  orbit_l: ['Camada L (n = 2)', 'Segundo nível eletrônico em torno do núcleo, comportando até 8 elétrons.'],
  orbit_m: ['Camada M (n = 3)', 'Camada mais externa (valência), responsável pelas ligações químicas com outros átomos.'],
  electron: ['Elétrons (−)', 'Partículas de carga negativa que ocupam níveis definidos de energia na eletrosfera.'],

  // 9: Química — Molécula de Água (H₂O)
  oxygen: ['Átomo de Oxigênio (δ⁻)', 'Altamente eletronegativo, atrai os elétrons da ligação para perto de si e cria o polo negativo.'],
  hydrogen: ['Átomos de Hidrogênio (δ⁺)', 'Compartilham 1 elétron cada com o oxigênio, formando os polos positivos da molécula.'],
  bond: ['Ligações covalentes (104,5°)', 'Compartilhamento de pares de elétrons; o ângulo de 104,5° torna a água uma molécula polar.'],
  lone_pair: ['Pares de elétrons livres', 'Dois pares não ligantes no oxigênio que repelem as ligações e encurvam a geometria da água.'],

  // 10: Química — Rede Cristalina (Sal NaCl)
  crystal_na: ['Cátions de Sódio (Na⁺)', 'Átomos de sódio que cederam 1 elétron, ficando menores e com carga positiva (+1).'],
  crystal_cl: ['Ânions de Cloreto (Cl⁻)', 'Átomos de cloro que ganharam 1 elétron, ficando maiores e com carga negativa (−1).'],
  crystal_bonds: ['Atrações iônicas (3D)', 'Forças eletrostáticas intensas entre cargas opostas que conferem alto ponto de fusão ao sal.'],
  crystal_cell: ['Célula unitária cúbica', 'Menor bloco repetitivo do retículo cristalino, explicando o formato cúbico dos grãos de sal.'],

  // 11: Biologia — Célula Animal
  cell_membrane: ['Membrana plasmática', 'Película semipermeável que envolve a célula e controla a entrada e saída de substâncias.'],
  cytoplasm: ['Citoplasma', 'Meio gelatinoso onde ficam mergulhadas as organelas e ocorrem diversas reações químicas.'],
  cell_nucleus: ['Núcleo e nucléolo', 'Centro de comando celular que protege o DNA e coordena a produção de proteínas.'],
  mitochondria: ['Mitocôndrias', 'Usinas energéticas da célula: realizam a respiração celular e produzem ATP.'],
  golgi: ['Complexo de Golgi', 'Empacota, modifica e distribui proteínas e lipídios para dentro ou fora da célula.'],
  er_rough: ['Retículo endoplasmático', 'Rede de membranas com ribossomos que sintetiza e transporta proteínas recém-formadas.'],

  // 12: Biologia — Dupla Hélice de DNA
  dna_strand_a: ['Fita açúcar-fosfato (5′→3′)', 'Coluna vertebral estrutural composta por desoxirribose e grupos fosfato alternados.'],
  dna_strand_b: ['Fita complementar (3′→5′)', 'Corre em sentido antiparalelo, garantindo estabilidade e fidelidade na replicação genética.'],
  dna_bases: ['Bases nitrogenadas (A-T / C-G)', 'Degraus do código genético: Adenina sempre pareia com Timina, e Citosina sempre com Guanina.'],
  dna_hbonds: ['Pontes de hidrogênio', 'Ligações suaves no centro que mantêm as duas fitas unidas e permitem abri-las na replicação.'],

  // 13: Biologia — Coração Humano
  heart_ventricles: ['Ventrículos e miocárdio', 'Câmaras inferiores musculares que bombeiam sangue para os pulmões (direito) e para todo o corpo (esquerdo).'],
  heart_atria: ['Átrios direito e esquerdo', 'Câmaras superiores que recebem o sangue das veias e o conduzem para os ventrículos.'],
  heart_aorta: ['Artéria Aorta e arco aórtico', 'Maior artéria do corpo humano: distribui sangue rico em oxigênio do ventrículo esquerdo aos tecidos.'],
  heart_pulmonary: ['Artéria pulmonar', 'Leva sangue rico em CO₂ do ventrículo direito até os pulmões para realizar a hematose.'],
  heart_vena_cava: ['Veias cavas (superior e inferior)', 'Trazem o sangue venoso de volta da cabeça, braços, tronco e pernas para o átrio direito.'],
  heart_valves: ['Válvulas cardíacas', 'Estruturas internas (mitral e tricúspide) que impedem o refluxo garantindo o fluxo em sentido único.'],

  // 14: Geografia — Planeta Terra
  earth_crust: ['Crosta terrestre e oceanos', 'Camada rochosa mais externa onde vivemos, coberta por continentes e cerca de 71% de água.'],
  earth_atmosphere: ['Atmosfera', 'Camada gasosa que protege o planeta da radiação solar, regula a temperatura e permite a vida.'],
  earth_mantle: ['Manto terrestre', 'Camada intermediária espessa de rocha quente e viscosa cujas correntes movem as placas tectônicas.'],
  earth_outer_core: ['Núcleo externo líquido', 'Ferro e níquel fundidos em movimento que geram o campo magnético protetor da Terra.'],
  earth_inner_core: ['Núcleo interno sólido', 'Esfera metálica altíssima em temperatura (~5.500 °C), mantida sólida pela pressão extrema.'],
  earth_axis: ['Eixo de inclinação (23,5°)', 'Inclinação axial da Terra responsável pela alternância das quatro estações do ano.'],

  // 15: Geografia — Vulcão em Corte Transversal
  volcano_crust: ['Crosta e camadas rochosas', 'Base litosférica estratificada atravessada pelo magma sob alta pressão vindo do manto.'],
  volcano_chamber: ['Câmara magmática', 'Reservatório subterrâneo de rocha fundida, gases dissolvidos e cristais em altíssima temperatura.'],
  volcano_cone: ['Cone estratovulcânico', 'Montanha formada ao longo de erupções sucessivas por camadas alternadas de lava solidificada e cinzas.'],
  volcano_conduit: ['Chaminé principal e dique lateral', 'Conduto vertical e ramificações por onde o magma ascende da câmara até a superfície.'],
  volcano_lava: ['Cratera e derrame de lava', 'Abertura no topo de onde o magma emerge como lava incandescente escorrendo pelas encostas.'],
  volcano_plume: ['Pluma de cinzas e gases', 'Coluna vulcânica de vapor d’água, CO₂, SO₂ e fragmentos piroclásticos lançados na atmosfera.']
};

function makeMaterial(color, roughness = 0.42, metalness = 0.25, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function makeCanvasTexture(width, height, drawFn) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawFn(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function pcbTexture(base = '#10493f', trace = '#c9a64b') {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = trace;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 3;
    for (let i = 24; i < w; i += 28) {
      ctx.beginPath();
      ctx.moveTo(i, 16);
      ctx.lineTo(i, h * 0.42);
      ctx.lineTo(i + (i % 56 === 0 ? 18 : -18), h * 0.56);
      ctx.lineTo(i + (i % 56 === 0 ? 18 : -18), h - 20);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#e5c96e';
    for (let y = 40; y < h - 30; y += 52) {
      for (let x = 36; x < w - 30; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function platterTexture() {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, w * 0.5);
    grad.addColorStop(0, '#eef2ff');
    grad.addColorStop(0.45, '#b8c4e0');
    grad.addColorStop(0.72, '#e2e8f6');
    grad.addColorStop(1, '#94a3c4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Trilhas magnéticas concêntricas sutis
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    for (let r = 68; r < w * 0.48; r += 11) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Reflexo diagonal suave
    const sweep = ctx.createLinearGradient(0, 0, w, h);
    sweep.addColorStop(0.35, 'rgba(255,255,255,0)');
    sweep.addColorStop(0.5, 'rgba(180,210,255,0.34)');
    sweep.addColorStop(0.65, 'rgba(255,255,255,0)');
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, w, h);
  });
}

function cpuDieTexture() {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#3b2f7a');
    grad.addColorStop(1, '#0f766e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Grade de 8 núcleos + blocos de cache L3 gravados no silício
    const pad = 26;
    const cols = 4, rows = 2;
    const cw = (w - pad * 2 - 18 * (cols - 1)) / cols;
    const ch = 152;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = pad + c * (cw + 18);
        const y = pad + r * (ch + 20);
        ctx.fillStyle = 'rgba(148, 163, 255, 0.22)';
        ctx.fillRect(x, y, cw, ch);
        ctx.strokeStyle = 'rgba(224, 231, 255, 0.55)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, cw, ch);
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        for (let l = 16; l < ch - 14; l += 16) ctx.fillRect(x + 12, y + l, cw - 24, 5);
      }
    }
    // Faixa inferior de cache L3 compartilhado e controlador de memória
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.fillRect(pad, h - 118, w - pad * 2, 90);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, h - 118, w - pad * 2, 90);
  });
}

function volcanoStrataTexture() {
  return makeCanvasTexture(512, 512, (ctx, w, h) => {
    const bands = ['#4a3728', '#2d2420', '#6b4c35', '#3d302a', '#573f2e', '#261f1d', '#73533a'];
    const bandH = h / bands.length;
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * bandH, w, bandH + 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let x = 0; x < w; x += 24) {
        ctx.fillRect(x, i * bandH + ((x * 7) % 14), 14, 4);
      }
    });
  });
}

/**
 * Helper de construção compartilhado entre todos os 15 modelos.
 * Cada malha recebe `basePos` e `explode` ([dx, dy, dz]) para o modo explodido 3D suave.
 */
function createBuilder(group) {
  const addMesh = (geo, mat, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, part = '', lift = 0, explode = null } = {}) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    const ex = explode ? explode[0] : 0;
    const ey = explode ? explode[1] : lift;
    const ez = explode ? explode[2] : 0;
    mesh.userData = {
      part,
      baseX: x, baseY: y, baseZ: z,
      explodeX: ex, explodeY: ey, explodeZ: ez,
      targetX: x, targetY: y, targetZ: z,
      lift: ey
    };
    group.add(mesh);
    return mesh;
  };

  const box = (x, y, z, w, h, d, mat, part = '', lift = 0, extra = {}) =>
    addMesh(new THREE.BoxGeometry(w, h, d), mat, { x, y, z, part, lift, ...extra });

  const cyl = (x, y, z, r, h, mat, part = '', lift = 0, extra = {}) =>
    addMesh(new THREE.CylinderGeometry(extra.rTop ?? r, extra.rBot ?? r, h, extra.segs ?? 32), mat, { x, y, z, part, lift, ...extra });

  const sphere = (x, y, z, r, mat, part = '', lift = 0, extra = {}) =>
    addMesh(new THREE.SphereGeometry(r, extra.segs ?? 28, extra.segs ?? 22), mat, { x, y, z, part, lift, ...extra });

  const torus = (x, y, z, r, tube, mat, part = '', lift = 0, extra = {}) =>
    addMesh(new THREE.TorusGeometry(r, tube, extra.rSegs ?? 16, extra.tSegs ?? 64), mat, { x, y, z, part, lift, ...extra });

  const label = (text, x, y, z, width, lift = 0, color = '#e4e7f5', opts = {}) => {
    const tex = makeCanvasTexture(512, 96, (ctx) => {
      ctx.fillStyle = color;
      ctx.font = `${opts.weight || 700} ${opts.fontSize || 40}px ${opts.font || 'monospace'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 48);
    });
    if (!tex) return null;
    const mesh = addMesh(
      new THREE.PlaneGeometry(width, (width * 96) / 512),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      { x, y, z, rx: opts.rx ?? -Math.PI / 2, ry: opts.ry ?? 0, rz: opts.rz ?? 0, part: opts.part || '', lift, explode: opts.explode }
    );
    return mesh;
  };

  const tube = (points, radius, mat, part = '', lift = 0, extra = {}) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([px, py, pz]) => new THREE.Vector3(px, py, pz)));
    const geo = new THREE.TubeGeometry(curve, extra.segs ?? 36, radius, extra.radial ?? 12, Boolean(extra.closed));
    return addMesh(geo, mat, { part, lift, ...extra });
  };

  const edges = (geo, color, opts = {}) => {
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 0.9 })
    );
    line.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
    line.rotation.set(opts.rx || 0, opts.ry || 0, opts.rz || 0);
    const ex = opts.explode ? opts.explode[0] : 0;
    const ey = opts.explode ? opts.explode[1] : (opts.lift || 0);
    const ez = opts.explode ? opts.explode[2] : 0;
    line.userData = {
      part: opts.part || '',
      baseX: opts.x || 0, baseY: opts.y || 0, baseZ: opts.z || 0,
      explodeX: ex, explodeY: ey, explodeZ: ez,
      targetX: opts.x || 0, targetY: opts.y || 0, targetZ: opts.z || 0,
      lift: ey
    };
    group.add(line);
    return line;
  };

  return { addMesh, box, cyl, sphere, torus, label, tube, edges };
}

/* ========================================================================== */
/*  OS 13 MODELOS 3D (3 REMAKES PREMIUM + 10 NOVOS MODELOS DAS MATÉRIAS)      */
/* ========================================================================== */

function buildSSD(b) {
  const shellDark = makeMaterial(0x232638, 0.38, 0.72);
  const shellRim = makeMaterial(0x3a3f5c, 0.30, 0.80);
  const pcbMat = makeMaterial(0x13594a, 0.50, 0.12, { map: pcbTexture('#0f4e42', '#d7b55b') });
  const nandMat = makeMaterial(0x151822, 0.42, 0.28);
  const ctrlMat = makeMaterial(0xcbd5e1, 0.22, 0.88);
  const dramMat = makeMaterial(0x283044, 0.36, 0.35);
  const gold = makeMaterial(0xebb744, 0.24, 0.94);
  const smd = makeMaterial(0xc08c55, 0.4, 0.5);
  const silver = makeMaterial(0xdbe2f0, 0.22, 0.92);
  const topShell = makeMaterial(0x2b2542, 0.32, 0.55);
  const accentStrip = makeMaterial(0x8b67e6, 0.35, 0.4, { emissive: 0x3b1f82, emissiveIntensity: 0.32 });

  // Base fresada com bordas laterais elevadas
  b.box(0, -0.44, 0, 3.9, 0.16, 5.25, shellDark, 'casing', -0.25);
  b.box(-1.89, -0.32, 0, 0.12, 0.24, 5.25, shellRim, 'casing', -0.25);
  b.box(1.89, -0.32, 0, 0.12, 0.24, 5.25, shellRim, 'casing', -0.25);
  b.box(0, -0.32, -2.56, 3.9, 0.24, 0.12, shellRim, 'casing', -0.25);

  // PCB detalhada com trilhas de cobre
  b.box(0, -0.26, -0.05, 3.48, 0.09, 4.68, pcbMat, 'pcb', 0.35);
  for (const x of [-1.52, 1.52]) for (const z of [-2.12, 2.02]) {
    b.cyl(x, -0.21, z, 0.09, 0.04, gold, 'pcb', 0.35);
  }

  // 4 módulos 3D NAND com pinos SMD nos dois lados
  for (const x of [-0.90, 0.90]) {
    for (const z of [-1.42, -0.02]) {
      b.box(x, -0.10, z, 1.24, 0.17, 1.16, nandMat, 'nand', 0.92);
      b.box(x, -0.01, z, 1.12, 0.02, 1.04, makeMaterial(0x1f2433, 0.5, 0.2), 'nand', 0.92);
      b.label('3D NAND', x, 0.005, z, 0.82, 0.92, '#c8d2ec', { part: 'nand' });
      for (let k = 0; k < 7; k++) {
        b.box(x - 0.50 + k * 0.165, -0.15, z + 0.63, 0.055, 0.05, 0.14, gold, 'nand', 0.92);
        b.box(x - 0.50 + k * 0.165, -0.15, z - 0.63, 0.055, 0.05, 0.14, gold, 'nand', 0.92);
      }
    }
  }

  // Controlador metálico com difusor de calor + chip DRAM cache
  b.box(0.78, -0.09, 1.38, 0.98, 0.19, 0.98, ctrlMat, 'controller', 1.02);
  for (let f = -3; f <= 3; f++) {
    b.box(0.78 + f * 0.12, 0.02, 1.38, 0.04, 0.05, 0.86, silver, 'controller', 1.02);
  }
  b.label('CTRL', 0.78, 0.055, 1.38, 0.58, 1.02, '#1e2436', { part: 'controller' });

  b.box(-0.78, -0.11, 1.32, 0.92, 0.15, 0.68, dramMat, 'dram', 0.95);
  b.label('DRAM', -0.78, -0.025, 1.32, 0.64, 0.95, '#93c5fd', { part: 'dram' });

  // Fileira de capacitores SMD e reguladores
  for (let n = 0; n < 10; n++) {
    b.box(-1.32 + n * 0.17, -0.18, 1.94, 0.07, 0.07, 0.16, smd, 'pcb', 0.35);
    b.box(-1.32 + n * 0.17, -0.18, 2.02, 0.07, 0.075, 0.04, silver, 'pcb', 0.35);
  }

  // Conector SATA L-Shape (energia 15 pinos + dados 7 pinos)
  b.box(0, -0.26, 2.50, 2.75, 0.18, 0.28, makeMaterial(0x14161f, 0.6, 0.1), 'sata', 0.35);
  for (let p = 0; p < 12; p++) b.box(-1.16 + p * 0.11, -0.24, 2.62, 0.06, 0.09, 0.22, gold, 'sata', 0.35);
  for (let d = 0; d < 7; d++) b.box(0.42 + d * 0.12, -0.24, 2.62, 0.06, 0.09, 0.22, gold, 'sata', 0.35);

  // Tampa superior chanfrada com identidade Storage Lab e parafusos nos cantos
  b.box(0, 0.16, 0, 3.92, 0.14, 5.26, topShell, 'casing', 2.05);
  b.box(0, 0.235, -1.72, 3.45, 0.02, 0.18, accentStrip, 'casing', 2.05);
  b.box(0, 0.235, 1.88, 3.45, 0.02, 0.08, accentStrip, 'casing', 2.05);
  b.label('STORAGE LAB', 0, 0.25, -0.78, 2.7, 2.05, '#d4c4ff', { part: 'casing' });
  b.label('SOLID STATE DRIVE', 0, 0.25, -0.05, 2.45, 2.05, '#f1f5f9', { part: 'casing', weight: 600 });
  b.label('2.5"  ·  SATA III', 0, 0.25, 1.15, 1.85, 2.05, '#a8b3cf', { part: 'casing' });
  for (const x of [-1.68, 1.68]) for (const z of [-2.32, 2.32]) {
    b.cyl(x, 0.24, z, 0.085, 0.04, silver, 'casing', 2.05);
  }
}

function buildHDD(b) {
  const aluBody = makeMaterial(0x282d3e, 0.34, 0.78);
  const aluRim = makeMaterial(0x47506b, 0.28, 0.85);
  const silver = makeMaterial(0xdbe3f4, 0.18, 0.94);
  const mirrorPlatter = makeMaterial(0xdce6f7, 0.08, 0.96, { map: platterTexture() });
  const copper = makeMaterial(0xd97736, 0.28, 0.88);
  const magnetMat = makeMaterial(0x5b647d, 0.30, 0.82);
  const gold = makeMaterial(0xebb744, 0.24, 0.94);
  const pcbMat = makeMaterial(0x114f43, 0.48, 0.15, { map: pcbTexture('#0c443a', '#c8a54a') });
  const glassTop = makeMaterial(0x9fb5dc, 0.12, 0.2, { transparent: true, opacity: 0.20 });

  // Placa lógica inferior (sobe/desce para baixo no explodido!)
  b.box(0, -0.60, 0.35, 3.25, 0.08, 3.65, pcbMat, 'pcb', -0.95);
  b.box(0.55, -0.66, 0.65, 0.85, 0.09, 0.85, makeMaterial(0x181c28, 0.4, 0.3), 'controller', -0.95);
  b.box(-0.75, -0.65, 1.15, 0.75, 0.07, 0.55, makeMaterial(0x252c3f, 0.4, 0.3), 'dram', -0.95);

  // Chassi fresado com paredes laterais
  b.box(0, -0.44, 0, 4.05, 0.22, 5.38, aluBody, 'casing', -0.2);
  b.box(-1.92, -0.06, 0, 0.22, 0.62, 5.38, aluRim, 'casing', -0.2);
  b.box(1.92, -0.06, 0, 0.22, 0.62, 5.38, aluRim, 'casing', -0.2);
  b.box(0, -0.06, -2.58, 4.05, 0.62, 0.22, aluRim, 'casing', -0.2);
  b.box(0, -0.06, 2.58, 4.05, 0.62, 0.22, aluRim, 'casing', -0.2);

  // Pilha dupla de pratos magnéticos + espaçador
  b.cyl(0, -0.18, -0.62, 1.62, 0.06, mirrorPlatter, 'platter', 0.48, { segs: 56 });
  b.cyl(0, -0.09, -0.62, 0.58, 0.10, silver, 'spindle', 0.65);
  b.cyl(0, 0.02, -0.62, 1.62, 0.06, mirrorPlatter, 'platter', 0.92, { segs: 56 });

  // Hub central do motor spindle com 6 parafusos torx
  b.cyl(0, 0.04, -0.62, 0.44, 0.24, silver, 'spindle', 1.22);
  b.cyl(0, 0.17, -0.62, 0.16, 0.06, makeMaterial(0x1f2433, 0.3, 0.8), 'spindle', 1.22);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.cyl(Math.cos(a) * 0.29, 0.18, -0.62 + Math.sin(a) * 0.29, 0.045, 0.04, aluBody, 'spindle', 1.22);
  }

  // Atuador VCM (ímã de neodímio + bobina de cobre)
  b.box(-1.02, -0.14, 1.56, 1.18, 0.16, 1.10, magnetMat, 'vcm', 0.72, { ry: 0.35 });
  b.torus(-1.02, -0.02, 1.56, 0.32, 0.09, copper, 'vcm', 0.95, { rx: Math.PI / 2 });
  b.box(-1.02, 0.12, 1.56, 1.12, 0.12, 1.02, magnetMat, 'vcm', 1.28, { ry: 0.35 });

  // Pivô e braço atuador articulado com cabeça de leitura dourada
  b.cyl(-0.98, 0.04, 1.22, 0.26, 0.36, silver, 'arm', 1.05);
  b.box(-0.54, 0.11, 0.64, 0.32, 0.07, 1.38, silver, 'arm', 1.05, { ry: 0.66 });
  b.box(-0.14, 0.11, 0.16, 0.14, 0.04, 0.78, aluRim, 'arm', 1.05, { ry: 0.66 });
  b.box(0.06, 0.09, -0.08, 0.22, 0.08, 0.18, gold, 'arm', 1.05, { ry: 0.66 });

  // Conector SATA traseiro
  b.box(0, -0.34, 2.74, 2.65, 0.16, 0.22, makeMaterial(0x131620, 0.55, 0.1), 'sata', -0.2);
  for (let i = 0; i < 16; i++) b.box(-1.12 + i * 0.15, -0.32, 2.82, 0.07, 0.09, 0.16, gold, 'sata', -0.2);

  // Tampa transparente de inspeção com moldura e parafusos
  b.box(0, 0.32, 0, 4.02, 0.08, 5.34, glassTop, 'casing', 2.20);
  b.edges(new THREE.BoxGeometry(4.02, 0.08, 5.34), 0x8ea4d2, { y: 0.32, part: 'casing', lift: 2.20, opacity: 0.55 });
  for (const x of [-1.76, 1.76]) for (const z of [-2.38, 2.38]) {
    b.cyl(x, 0.37, z, 0.08, 0.04, silver, 'casing', 2.20);
  }
}

function buildNVMe(b) {
  const pcbMat = makeMaterial(0x131926, 0.42, 0.20, { map: pcbTexture('#121a28', '#d5b253') });
  const nandMat = makeMaterial(0x181c28, 0.40, 0.26);
  const ctrlMat = makeMaterial(0xcbd5e1, 0.20, 0.90);
  const dramMat = makeMaterial(0x273248, 0.36, 0.34);
  const gold = makeMaterial(0xebb744, 0.22, 0.95);
  const padMat = makeMaterial(0x38bdf8, 0.55, 0.05, { transparent: true, opacity: 0.78 });
  const sinkMat = makeMaterial(0x352c54, 0.28, 0.80);
  const sinkAccent = makeMaterial(0x9b72f2, 0.30, 0.50, { emissive: 0x4b249e, emissiveIntensity: 0.30 });
  const ledMat = makeMaterial(0x22c55e, 0.2, 0.1, { emissive: 0x22c55e, emissiveIntensity: 0.9 });

  // PCB M.2 2280 fino com entalhe traseiro dourado de parafuso
  b.box(0, -0.14, 0, 1.72, 0.10, 5.55, pcbMat, 'pcb', 0);
  b.torus(0, -0.09, -2.68, 0.18, 0.045, gold, 'pcb', 0, { rx: Math.PI / 2 });

  // Conector M-Key com 16 pinos dourados e entalhe real
  b.box(0, -0.14, 2.86, 1.64, 0.09, 0.36, makeMaterial(0x0f141e, 0.5, 0.2), 'nvme', 0);
  for (let i = 0; i < 16; i++) {
    if (i === 11 || i === 12) continue; // Entalhe M-Key
    b.box(-0.74 + i * 0.098, -0.13, 2.90, 0.062, 0.11, 0.38, gold, 'nvme', 0);
  }

  // 2 chips 3D NAND de alta densidade
  for (const z of [-1.72, -0.22]) {
    b.box(0, 0.00, z, 1.32, 0.17, 1.24, nandMat, 'nand', 0.52);
    b.label('3D NAND', 0, 0.095, z, 0.92, 0.52, '#cbd5f1', { part: 'nand' });
  }

  // DRAM Cache + Controlador PCIe Gen4 níquel
  b.box(0, -0.01, 0.86, 1.12, 0.14, 0.58, dramMat, 'dram', 0.58);
  b.label('DRAM', 0, 0.07, 0.86, 0.68, 0.58, '#7dd3fc', { part: 'dram' });

  b.box(0, 0.01, 1.82, 1.06, 0.19, 1.02, ctrlMat, 'controller', 0.65);
  b.label('PCIe 4', 0, 0.115, 1.82, 0.78, 0.65, '#1e2436', { part: 'controller' });

  // Componentes SMD + micro LED de atividade
  for (let s = 0; s < 6; s++) {
    b.box(-0.68, -0.06, -0.9 + s * 0.42, 0.12, 0.06, 0.08, gold, 'pcb', 0);
    b.box(0.68, -0.06, -0.9 + s * 0.42, 0.12, 0.06, 0.08, gold, 'pcb', 0);
  }
  b.box(-0.64, -0.06, -2.35, 0.12, 0.07, 0.12, ledMat, 'pcb', 0);

  // Thermal pad azul translúcido (camada intermediária separada no modo explodido!)
  b.box(0, 0.14, 0.05, 1.44, 0.07, 4.78, padMat, 'heatsink', 1.28);

  // Dissipador aletado premium em alumínio anodizado
  b.box(0, 0.25, 0.05, 1.62, 0.12, 4.92, sinkMat, 'heatsink', 2.05);
  for (let i = -3; i <= 3; i++) {
    b.box(i * 0.22, 0.40, 0.05, 0.07, 0.22, 4.86, i === 0 ? sinkAccent : sinkMat, 'heatsink', 2.05);
  }
  b.label('NVMe GEN4', 0, 0.52, 0.05, 1.45, 2.05, '#e2d7ff', { part: 'heatsink', rz: Math.PI / 2 });
}

function buildCircuit(b) {
  const board = makeMaterial(0x1d2436, 0.52, 0.25);
  const copper = makeMaterial(0xe08a42, 0.26, 0.88);
  const wireRed = makeMaterial(0xef4444, 0.42, 0.15);
  const wireBlue = makeMaterial(0x38bdf8, 0.42, 0.15);
  const batBody = makeMaterial(0x2b2f42, 0.38, 0.45);
  const batTop = makeMaterial(0xf59e0b, 0.30, 0.65);
  const silver = makeMaterial(0xdde4f2, 0.20, 0.90);
  const ceramic = makeMaterial(0xe5cfa5, 0.50, 0.08);
  const glass = makeMaterial(0xfff4c2, 0.10, 0.08, { transparent: true, opacity: 0.38 });
  const glow = makeMaterial(0xfde047, 0.15, 0.10, { emissive: 0xfacc15, emissiveIntensity: 1.15 });

  // Base didática de bancada
  b.box(0, -0.52, 0, 4.95, 0.22, 3.65, board, 'wire', -0.2);
  b.edges(new THREE.BoxGeometry(4.95, 0.22, 3.65), 0x64748b, { y: -0.52, lift: -0.2, opacity: 0.4 });

  // Bateria cilíndrica à esquerda (polos + e −)
  b.cyl(-1.68, 0.08, 0.15, 0.54, 1.18, batBody, 'battery', 0.95);
  b.cyl(-1.68, 0.56, 0.15, 0.545, 0.26, batTop, 'battery', 0.95);
  b.cyl(-1.68, 0.76, 0.15, 0.20, 0.16, silver, 'battery', 0.95);
  b.label('9V +', -1.68, 0.86, 0.15, 0.8, 0.95, '#fde68a', { part: 'battery' });

  // Fios tubulares fechando o circuito
  b.tube([[-1.68, 0.72, 0.15], [-1.68, 0.72, -1.25], [0, -0.20, -1.25], [1.55, -0.20, -1.25], [1.55, -0.20, 0.15]], 0.075, wireRed, 'wire', 0.25);
  b.tube([[1.55, -0.20, 0.15], [1.55, -0.20, 1.32], [0.15, -0.20, 1.32], [-1.68, -0.20, 1.32], [-1.68, -0.35, 0.15]], 0.075, wireBlue, 'wire', 0.25);

  // Resistor cerâmico no ramo superior com 4 faixas de código de cores
  b.cyl(0, -0.10, -1.25, 0.24, 1.24, ceramic, 'resistor', 1.15, { rz: Math.PI / 2 });
  const bands = [[-0.36, 0x92400e], [-0.14, 0x111827], [0.08, 0xef4444], [0.36, 0xeab308]];
  for (const [bx, col] of bands) {
    b.cyl(bx, -0.10, -1.25, 0.248, 0.11, makeMaterial(col, 0.35, 0.2), 'resistor', 1.15, { rz: Math.PI / 2 });
  }
  b.cyl(-0.82, -0.10, -1.25, 0.06, 0.46, copper, 'resistor', 1.15, { rz: Math.PI / 2 });
  b.cyl(0.82, -0.10, -1.25, 0.06, 0.46, copper, 'resistor', 1.15, { rz: Math.PI / 2 });
  b.label('1 kΩ', 0, 0.26, -1.25, 0.9, 1.15, '#fde68a', { part: 'resistor' });

  // Interruptor no ramo inferior
  b.box(-0.10, -0.28, 1.32, 1.05, 0.22, 0.56, makeMaterial(0x334155, 0.45, 0.4), 'switch', 0.85);
  b.cyl(-0.38, -0.10, 1.32, 0.10, 0.18, copper, 'switch', 0.85);
  b.cyl(0.22, -0.10, 1.32, 0.10, 0.18, copper, 'switch', 0.85);
  b.box(-0.08, 0.04, 1.32, 0.72, 0.09, 0.14, silver, 'switch', 1.15, { rz: 0.28 });

  // Lâmpada à direita com soquete roscado, filamento aceso e bulbo de vidro
  b.cyl(1.55, -0.18, 0.15, 0.44, 0.42, makeMaterial(0x283148, 0.4, 0.5), 'bulb', 0.75);
  b.cyl(1.55, 0.12, 0.15, 0.30, 0.34, silver, 'bulb', 1.05);
  b.torus(1.55, 0.56, 0.15, 0.16, 0.035, glow, 'bulb', 1.35);
  b.sphere(1.55, 0.64, 0.15, 0.56, glass, 'bulb', 1.65);
  b.sphere(1.55, 0.62, 0.15, 0.16, glow, 'bulb', 1.35);
}

function buildPrism(b) {
  const baseMat = makeMaterial(0x22283a, 0.36, 0.74);
  const silver = makeMaterial(0xcbd5e1, 0.22, 0.88);
  const emitterBody = makeMaterial(0x334155, 0.35, 0.75);
  const glassPrism = makeMaterial(0xcbe8ff, 0.06, 0.15, { transparent: true, opacity: 0.46 });
  const whiteBeam = makeMaterial(0xffffff, 0.1, 0, { emissive: 0xf8fafc, emissiveIntensity: 1.2 });

  // Pedestal óptico graduado
  b.cyl(0, -1.18, 0, 1.95, 0.20, baseMat, 'prism_base', -0.45, { segs: 48 });
  b.torus(0, -1.07, 0, 1.72, 0.035, silver, 'prism_base', -0.45, { rx: Math.PI / 2 });
  b.cyl(0, -0.92, 0, 0.96, 0.30, makeMaterial(0x333c56, 0.35, 0.7), 'prism_base', -0.25);

  // Prisma triangular equilátero de cristal (CylinderGeometry com 3 lados!)
  const prismGeo = new THREE.CylinderGeometry(1.18, 1.18, 1.85, 3);
  b.addMesh(prismGeo, glassPrism, { y: 0.15, ry: Math.PI / 6, part: 'prism', lift: 1.15 });
  b.edges(prismGeo, 0xe0f2fe, { y: 0.15, ry: Math.PI / 6, part: 'prism', lift: 1.15, opacity: 0.95 });

  // Emissor de luz branca à esquerda
  b.cyl(-2.55, 0.25, 0.40, 0.24, 0.92, emitterBody, 'emitter', 0, { rz: Math.PI / 2 - 0.16, explode: [-0.85, 0.25, 0] });
  b.cyl(-2.08, 0.17, 0.40, 0.16, 0.12, whiteBeam, 'emitter', 0, { rz: Math.PI / 2 - 0.16, explode: [-0.85, 0.25, 0] });

  // Feixe de luz branca incidente + feixe refratado interno
  b.tube([[-2.05, 0.17, 0.40], [-0.54, 0.02, 0.10]], 0.075, whiteBeam, 'emitter', 0, { explode: [-0.45, 0.25, 0] });
  b.tube([[-0.54, 0.02, 0.10], [0.56, 0.02, 0.0]], 0.07, makeMaterial(0xe0f2fe, 0.1, 0, { emissive: 0xbae6fd, emissiveIntensity: 0.95, transparent: true, opacity: 0.75 }), 'prism', 1.15);

  // Dispersão nas 7 faixas do arco-íris saindo pela face direita
  const rainbow = [0xef4444, 0xf97316, 0xfacc15, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7];
  rainbow.forEach((col, i) => {
    const t = i / (rainbow.length - 1);
    const dy = 0.62 - t * 1.38;
    const dz = -0.32 + t * 0.64;
    const mat = makeMaterial(col, 0.15, 0.05, { emissive: col, emissiveIntensity: 0.95 });
    b.tube(
      [[0.52, 0.06 - t * 0.16, dz * 0.25], [1.65, dy * 0.56, dz * 0.65], [2.85, dy, dz]],
      0.048,
      mat,
      'spectrum',
      0,
      { explode: [0.85, (0.5 - t) * 0.55, dz * 0.35] }
    );
  });
}

function buildAtom(b) {
  const protonMat = makeMaterial(0xef4444, 0.28, 0.32, { emissive: 0x991b1b, emissiveIntensity: 0.25 });
  const neutronMat = makeMaterial(0x64748b, 0.30, 0.62);
  const electronMat = makeMaterial(0x38bdf8, 0.15, 0.20, { emissive: 0x0ea5e9, emissiveIntensity: 0.95 });

  // Núcleo denso com 14 nucleons entrelaçados (7 prótons + 7 nêutrons)
  const nucleonOffsets = [
    [0, 0, 0], [0.28, 0.16, 0.12], [-0.26, 0.18, -0.14], [0.14, -0.26, 0.18],
    [-0.18, -0.22, -0.20], [0.24, -0.06, -0.24], [-0.28, 0.02, 0.22], [0.02, 0.30, -0.16],
    [-0.06, -0.32, 0.04], [0.30, 0.18, -0.12], [-0.14, 0.24, 0.24], [0.16, -0.12, 0.30],
    [-0.08, 0.08, -0.32], [0.06, 0.28, 0.16]
  ];
  nucleonOffsets.forEach(([nx, ny, nz], idx) => {
    b.sphere(nx, ny, nz, 0.24, idx % 2 === 0 ? protonMat : neutronMat, 'nucleus', 0, {
      segs: 20,
      explode: [nx * 0.6, ny * 0.6, nz * 0.6]
    });
  });

  // 3 camadas orbitais inclinadas em 3D (K, L, M)
  const shells = [
    { part: 'orbit_k', r: 1.25, rx: 1.18, ry: 0.25, rz: 0.12, color: 0xa78bfa, electrons: 2, explode: [0, 0.55, 0] },
    { part: 'orbit_l', r: 1.92, rx: 0.62, ry: 1.05, rz: 0.35, color: 0x38bdf8, electrons: 4, explode: [0, -0.55, 0] },
    { part: 'orbit_m', r: 2.55, rx: -0.78, ry: -0.42, rz: 0.58, color: 0x34d399, electrons: 4, explode: [0, 1.15, 0] }
  ];

  for (const s of shells) {
    const ringMat = makeMaterial(s.color, 0.3, 0.2, { emissive: s.color, emissiveIntensity: 0.35, transparent: true, opacity: 0.72 });
    b.torus(0, 0, 0, s.r, 0.032, ringMat, s.part, 0, { rx: s.rx, ry: s.ry, rz: s.rz, explode: s.explode });

    const euler = new THREE.Euler(s.rx, s.ry, s.rz);
    for (let e = 0; e < s.electrons; e++) {
      const ang = (e / s.electrons) * Math.PI * 2 + 0.4;
      const pos = new THREE.Vector3(Math.cos(ang) * s.r, Math.sin(ang) * s.r, 0).applyEuler(euler);
      b.sphere(pos.x, pos.y, pos.z, 0.145, electronMat, 'electron', 0, {
        segs: 18,
        explode: [s.explode[0] + pos.x * 0.22, s.explode[1] + pos.y * 0.22, s.explode[2] + pos.z * 0.22]
      });
    }
  }
}

function buildMolecule(b) {
  const oxyMat = makeMaterial(0xe11d48, 0.24, 0.28, { emissive: 0x881337, emissiveIntensity: 0.25 });
  const hydMat = makeMaterial(0xf1f5f9, 0.22, 0.22, { emissive: 0x94a3b8, emissiveIntensity: 0.12 });
  const bondMat = makeMaterial(0xcbd5e1, 0.25, 0.75);
  const loneMat = makeMaterial(0x38bdf8, 0.20, 0.10, { transparent: true, opacity: 0.34, emissive: 0x0284c7, emissiveIntensity: 0.35 });
  const arcMat = makeMaterial(0xfacc15, 0.25, 0.3, { emissive: 0xeab308, emissiveIntensity: 0.5 });

  // Oxigênio central
  b.sphere(0, 0.38, 0, 0.88, oxyMat, 'oxygen', 0, { segs: 32 });
  b.label('O (δ−)', 0, 0.38, 0.96, 1.0, 0, '#fecdd3', { rx: 0, part: 'oxygen' });

  // Ângulo exato da água: 104,5° (meio ângulo = 52,25° = 0.9119 rad)
  const half = (52.25 * Math.PI) / 180;
  const dist = 2.05;
  for (const sign of [-1, 1]) {
    const hx = sign * Math.sin(half) * dist;
    const hy = 0.38 - Math.cos(half) * dist;

    // Ligação covalente entre O e H
    b.tube([[0, 0.38, 0], [hx, hy, 0]], 0.145, bondMat, 'bond', 0, {
      explode: [sign * 0.42, -0.32, 0]
    });

    // Átomo de Hidrogênio
    b.sphere(hx, hy, 0, 0.56, hydMat, 'hydrogen', 0, {
      segs: 28,
      explode: [sign * 0.88, -0.68, 0]
    });
    b.label('H (δ+)', hx, hy, 0.64, 0.95, 0, '#e0f2fe', {
      rx: 0,
      part: 'hydrogen',
      explode: [sign * 0.88, -0.68, 0]
    });
  }

  // Dois lóbulos de pares de elétrons livres no topo do oxigênio (explicam o ângulo 104,5°!)
  for (const sz of [-1, 1]) {
    const lobe = b.sphere(0, 1.22, sz * 0.56, 0.42, loneMat, 'lone_pair', 0, {
      explode: [0, 0.72, sz * 0.45]
    });
    lobe.scale.set(0.75, 1.18, 0.75);
    b.sphere(-0.11, 1.24, sz * 0.58, 0.08, makeMaterial(0x7dd3fc, 0.1, 0.1, { emissive: 0x38bdf8, emissiveIntensity: 1 }), 'lone_pair', 0, {
      explode: [0, 0.72, sz * 0.45]
    });
    b.sphere(0.11, 1.24, sz * 0.58, 0.08, makeMaterial(0x7dd3fc, 0.1, 0.1, { emissive: 0x38bdf8, emissiveIntensity: 1 }), 'lone_pair', 0, {
      explode: [0, 0.72, sz * 0.45]
    });
  }

  // Arco indicador do ângulo 104,5°
  const arcPts = [];
  for (let i = 0; i <= 16; i++) {
    const a = -half + (i / 16) * (2 * half);
    arcPts.push([Math.sin(a) * 1.15, 0.38 - Math.cos(a) * 1.15, 0.05]);
  }
  b.tube(arcPts, 0.032, arcMat, 'bond', 0, { explode: [0, -0.55, 0.2] });
  b.label('104,5°', 0, -1.06, 0.12, 1.05, 0, '#fde047', { rx: 0, part: 'bond', explode: [0, -0.55, 0.2] });
}

function buildCell(b) {
  const memMat = makeMaterial(0x38bdf8, 0.25, 0.15, { transparent: true, opacity: 0.36, side: THREE.DoubleSide });
  const cytoMat = makeMaterial(0x1e3a5f, 0.55, 0.08, { side: THREE.DoubleSide });
  const nucMat = makeMaterial(0x7c3aed, 0.32, 0.22, { side: THREE.DoubleSide });
  const nucleolusMat = makeMaterial(0xe879f9, 0.22, 0.18, { emissive: 0xc026d3, emissiveIntensity: 0.42 });
  const mitoMat = makeMaterial(0xf97316, 0.35, 0.20, { emissive: 0x9a3412, emissiveIntensity: 0.2 });
  const golgiMat = makeMaterial(0x10b981, 0.38, 0.15);
  const erMat = makeMaterial(0x6366f1, 0.42, 0.15);
  const riboMat = makeMaterial(0xfde047, 0.3, 0.2);

  // Hemisfério externo da membrana plasmática (corte aberto no topo para ver tudo por dentro!)
  const memGeo = new THREE.SphereGeometry(2.15, 36, 24, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58);
  b.addMesh(memGeo, memMat, { y: 0.15, part: 'cell_membrane', lift: -0.45 });
  b.torus(0, 0.68, 0, 2.08, 0.06, makeMaterial(0x7dd3fc, 0.2, 0.3), 'cell_membrane', -0.45, { rx: Math.PI / 2 });

  // Citoplasma (disco interno)
  b.cyl(0, 0.36, 0, 1.98, 0.34, cytoMat, 'cytoplasm', -0.15, { segs: 42 });

  // Núcleo central + nucléolo luminoso
  const nucGeo = new THREE.SphereGeometry(0.76, 28, 22, 0, Math.PI * 1.55);
  b.addMesh(nucGeo, nucMat, { x: -0.15, y: 0.72, z: -0.15, ry: 0.4, part: 'cell_nucleus', lift: 1.25 });
  b.sphere(-0.15, 0.78, -0.15, 0.28, nucleolusMat, 'cell_nucleus', 1.65);

  // Retículo endoplasmático rugoso ao redor do núcleo
  for (let r = 0; r < 3; r++) {
    const rad = 0.96 + r * 0.20;
    const arcGeo = new THREE.TorusGeometry(rad, 0.055, 12, 32, Math.PI * 1.15);
    b.addMesh(arcGeo, erMat, { x: -0.15, y: 0.62 + r * 0.06, z: -0.15, rx: Math.PI / 2, rz: -0.6 + r * 0.22, part: 'er_rough', lift: 0.75 + r * 0.12 });
  }

  // 3 Mitocôndrias alongadas com anéis de cristas
  const mitos = [
    [1.15, 0.66, 0.55, 0.4],
    [-1.18, 0.66, 0.78, -0.7],
    [0.88, 0.66, -1.05, 1.1]
  ];
  mitos.forEach(([mx, my, mz, ry], idx) => {
    const capsule = new THREE.CapsuleGeometry(0.19, 0.46, 8, 16);
    b.addMesh(capsule, mitoMat, {
      x: mx, y: my, z: mz, rz: Math.PI / 2, ry,
      part: 'mitochondria',
      explode: [mx * 0.35, 1.05 + idx * 0.18, mz * 0.35]
    });
  });

  // Complexo de Golgi (4 cisternas curvas empilhadas em verde)
  for (let g = 0; g < 4; g++) {
    const gGeo = new THREE.TorusGeometry(0.45 + g * 0.12, 0.048, 10, 24, Math.PI * 0.75);
    b.addMesh(gGeo, golgiMat, {
      x: 0.85, y: 0.64 + g * 0.08, z: 0.75,
      rx: Math.PI / 2, rz: 2.2,
      part: 'golgi',
      explode: [0.55, 0.85 + g * 0.14, 0.45]
    });
  }

  // Ribossomos e vesículas espalhados
  const ribos = [[-1.35, 0.62, -0.55], [-0.85, 0.64, 1.25], [0.25, 0.64, 1.42], [1.45, 0.64, -0.35], [-0.45, 0.64, -1.42], [0.42, 0.66, 0.95]];
  for (const [rx, ry, rz] of ribos) {
    b.sphere(rx, ry, rz, 0.085, riboMat, 'er_rough', 0.6, { segs: 12 });
  }
}

function buildDNA(b) {
  const strandAMat = makeMaterial(0x3b82f6, 0.25, 0.45, { emissive: 0x1d4ed8, emissiveIntensity: 0.22 });
  const strandBMat = makeMaterial(0x9333ea, 0.25, 0.45, { emissive: 0x6b21a8, emissiveIntensity: 0.22 });
  const phosphateMat = makeMaterial(0xe2e8f0, 0.2, 0.7);
  const basePairs = [
    [0xfacc15, 0xef4444], // A - T
    [0x10b981, 0x06b6d4]  // C - G
  ];
  const hbondMat = makeMaterial(0xffffff, 0.15, 0.2, { emissive: 0xe0f2fe, emissiveIntensity: 0.65 });

  const turns = 1.65;
  const height = 4.6;
  const radius = 0.98;
  const ptsA = [];
  const ptsB = [];
  const steps = 44;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * turns;
    const y = (t - 0.5) * height;
    ptsA.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
    ptsB.push([Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius]);
  }

  // Duas fitas helicoidais contínuas — no modo explodido, se abrem lateralmente como na replicação!
  b.tube(ptsA, 0.105, strandAMat, 'dna_strand_a', 0, { segs: 64, explode: [-0.85, 0, 0] });
  b.tube(ptsB, 0.105, strandBMat, 'dna_strand_b', 0, { segs: 64, explode: [0.85, 0, 0] });

  // 12 degraus de pares de bases complementares (A-T e C-G)
  const rungs = 12;
  for (let r = 0; r < rungs; r++) {
    const t = (r + 0.5) / rungs;
    const angle = t * Math.PI * 2 * turns;
    const y = (t - 0.5) * height;
    const ax = Math.cos(angle) * radius, az = Math.sin(angle) * radius;
    const bx = -ax, bz = -az;
    const [col1, col2] = basePairs[r % 2];

    // Grupos fosfato nas junções
    b.sphere(ax, y, az, 0.145, phosphateMat, 'dna_strand_a', 0, { segs: 14, explode: [-0.85, 0, 0] });
    b.sphere(bx, y, bz, 0.145, phosphateMat, 'dna_strand_b', 0, { segs: 14, explode: [0.85, 0, 0] });

    // Metade da base A/C + metade da base T/G
    b.tube([[ax, y, az], [ax * 0.12, y, az * 0.12]], 0.072, makeMaterial(col1, 0.3, 0.25), 'dna_bases', 0, {
      segs: 8, explode: [-0.55, 0, 0]
    });
    b.tube([[bx, y, bz], [bx * 0.12, y, bz * 0.12]], 0.072, makeMaterial(col2, 0.3, 0.25), 'dna_bases', 0, {
      segs: 8, explode: [0.55, 0, 0]
    });

    // Ponte de hidrogênio central
    b.sphere(0, y, 0, 0.09, hbondMat, 'dna_hbonds', 0, { segs: 12, explode: [0, (t - 0.5) * 0.4, 0] });
  }
}

function buildCPU(b) {
  const gold = makeMaterial(0xeab308, 0.22, 0.94);
  const pcbTex = pcbTexture('#0c5446', '#d9b555');
  const pcbMat = makeMaterial(0x115e4e, 0.42, 0.22, pcbTex ? { map: pcbTex } : {});
  const dieTex = cpuDieTexture();
  const dieMat = makeMaterial(0x818cf8, 0.14, 0.85, dieTex ? { map: dieTex, emissive: 0x312e81, emissiveIntensity: 0.25 } : {});
  const smdMat = makeMaterial(0xc89a5b, 0.35, 0.72);
  const ihsMat = makeMaterial(0xd8dde8, 0.22, 0.90);
  const pasteMat = makeMaterial(0x94a3b8, 0.48, 0.32);
  const aluMat = makeMaterial(0xbec6d6, 0.30, 0.86);
  const copperMat = makeMaterial(0xd97742, 0.24, 0.92);

  // 1) Matriz de contatos dourados LGA na face inferior do processador
  b.box(0, -0.82, 0, 3.05, 0.06, 3.05, makeMaterial(0x0b3b32, 0.5, 0.2), 'cpu_pins', -1.25);
  for (let gx = -1.28; gx <= 1.29; gx += 0.32) {
    for (let gz = -1.28; gz <= 1.29; gz += 0.32) {
      if (Math.abs(gx) < 0.45 && Math.abs(gz) < 0.45) continue; // cavidade central de capacitores
      b.box(gx, -0.87, gz, 0.18, 0.04, 0.18, gold, 'cpu_pins', -1.25);
    }
  }

  // 2) Substrato PCB multicamadas verde-esmeralda com triângulo dourado de alinhamento
  b.box(0, -0.66, 0, 3.35, 0.22, 3.35, pcbMat, 'cpu_pcb', -0.45);
  b.box(-1.42, -0.54, 1.42, 0.26, 0.02, 0.26, gold, 'cpu_pcb', -0.45, { ry: Math.PI / 4 });

  // 3) Capacitores SMD de filtragem ao redor do silício
  for (let i = -3; i <= 3; i++) {
    b.box(i * 0.30, -0.49, 1.22, 0.13, 0.09, 0.07, smdMat, 'cpu_smd', 0.10);
    b.box(i * 0.30, -0.49, -1.22, 0.13, 0.09, 0.07, smdMat, 'cpu_smd', 0.10);
  }

  // 4) Die de silício espelhado multicore (8 núcleos + cache L3)
  b.box(0, -0.46, 0, 1.56, 0.18, 1.24, dieMat, 'cpu_die', 0.45);
  b.box(0, -0.365, 0, 1.50, 0.015, 1.18, makeMaterial(0x38bdf8, 0.12, 0.5, { transparent: true, opacity: 0.26 }), 'cpu_die', 0.45);
  b.label('8-CORE · L3', 0, -0.35, 0, 1.38, 0.45, '#e0f2fe', { part: 'cpu_die', fontSize: 34 });

  // 5) Espalhador térmico (IHS) de cobre niquelado chanfrado + pasta térmica
  b.box(0, -0.18, 0, 2.75, 0.22, 2.75, ihsMat, 'cpu_ihs', 1.35);
  b.box(0, -0.02, 0, 2.25, 0.14, 2.25, ihsMat, 'cpu_ihs', 1.35);
  b.label('STORAGE CPU', 0, 0.06, -0.35, 1.95, 1.35, '#334155', { part: 'cpu_ihs', fontSize: 34 });
  b.label('5.2 GHz · 8C/16T', 0, 0.06, 0.32, 1.95, 1.35, '#475569', { part: 'cpu_ihs', fontSize: 28 });
  // Camada de pasta térmica entre IHS e dissipador
  b.cyl(0, 0.10, 0, 0.72, 0.03, pasteMat, 'cpu_ihs', 1.80);

  // 6) Bloco dissipador aletado com heatpipes de cobre
  b.box(0, 0.24, 0, 2.55, 0.18, 2.55, copperMat, 'cpu_cooler', 2.35);
  for (let fin = -5; fin <= 5; fin++) {
    b.box(fin * 0.24, 0.88, 0, 0.055, 1.12, 2.52, aluMat, 'cpu_cooler', 2.35);
  }
  for (const hz of [-0.72, 0, 0.72]) {
    b.tube(
      [[-1.38, 0.24, hz], [-1.32, 1.48, hz], [0, 1.54, hz], [1.32, 1.48, hz], [1.38, 0.24, hz]],
      0.085,
      copperMat,
      'cpu_cooler',
      2.35
    );
  }
}

function buildMotor(b) {
  const baseMat = makeMaterial(0x1f2638, 0.50, 0.45);
  const northMat = makeMaterial(0xdc2626, 0.34, 0.25);
  const southMat = makeMaterial(0x2563eb, 0.34, 0.25);
  const copperMat = makeMaterial(0xd97736, 0.24, 0.90);
  const ironMat = makeMaterial(0x64748b, 0.38, 0.82);
  const steelMat = makeMaterial(0xdde3f0, 0.18, 0.95);
  const graphiteMat = makeMaterial(0x272b36, 0.72, 0.20);
  const goldMat = makeMaterial(0xeab308, 0.25, 0.92);

  // Base de bancada de laboratório
  b.box(0, -1.32, 0, 5.2, 0.22, 3.2, baseMat, 'motor_stator', -0.45);

  // Ímãs permanentes do estator (Norte vermelho à esquerda, Sul azul à direita)
  b.box(-1.62, 0.12, 0, 0.62, 2.15, 2.05, northMat, 'motor_stator', 0, { explode: [-1.15, 0, 0] });
  b.box(-1.18, 0.86, 0, 0.42, 0.68, 2.05, northMat, 'motor_stator', 0, { explode: [-1.15, 0, 0] });
  b.box(-1.18, -0.62, 0, 0.42, 0.68, 2.05, northMat, 'motor_stator', 0, { explode: [-1.15, 0, 0] });
  b.label('N', -1.62, 1.24, 0, 0.95, 0, '#fecaca', { part: 'motor_stator', explode: [-1.15, 0, 0], fontSize: 56 });

  b.box(1.62, 0.12, 0, 0.62, 2.15, 2.05, southMat, 'motor_stator', 0, { explode: [1.15, 0, 0] });
  b.box(1.18, 0.86, 0, 0.42, 0.68, 2.05, southMat, 'motor_stator', 0, { explode: [1.15, 0, 0] });
  b.box(1.18, -0.62, 0, 0.42, 0.68, 2.05, southMat, 'motor_stator', 0, { explode: [1.15, 0, 0] });
  b.label('S', 1.62, 1.24, 0, 0.95, 0, '#bfdbfe', { part: 'motor_stator', explode: [1.15, 0, 0], fontSize: 56 });

  // Eixo central de aço + mancal traseiro + hélice/polia frontal
  b.cyl(0, 0.12, 0.15, 0.12, 4.45, steelMat, 'motor_shaft', 0, { rx: Math.PI / 2, explode: [0, 0, -0.65] });
  b.box(0, -0.58, -1.78, 0.56, 1.32, 0.20, ironMat, 'motor_shaft', 0, { explode: [0, 0, -0.95] });
  b.cyl(0, 0.12, -2.02, 0.54, 0.24, steelMat, 'motor_shaft', 0, { rx: Math.PI / 2, explode: [0, 0, -1.15] });
  // Pás indicadoras de rotação no eixo traseiro
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    b.box(Math.cos(a) * 0.52, 0.12 + Math.sin(a) * 0.52, -2.16, 0.62, 0.16, 0.05, goldMat, 'motor_shaft', 0, {
      rz: a, explode: [0, 0, -1.15]
    });
  }

  // Núcleo laminado e bobina de cobre do rotor no centro do campo magnético
  b.box(0, 0.12, -0.25, 1.15, 0.24, 1.75, ironMat, 'motor_coil', 0, { explode: [0, 0.65, 0] });
  for (let i = -3; i <= 3; i++) {
    const z = -0.25 + i * 0.22;
    b.torus(0, 0.12, z, 0.58, 0.068, copperMat, 'motor_coil', 0, { explode: [0, 0.65, 0] });
  }
  b.tube(
    [[-0.58, 0.12, 0.58], [-0.58, 0.12, -1.05], [0.58, 0.12, -1.05], [0.58, 0.12, 0.58]],
    0.075,
    copperMat,
    'motor_coil',
    0,
    { explode: [0, 0.65, 0] }
  );

  // Comutador bipartido de cobre (duas metades separadas por fenda isolante)
  const commA = new THREE.CylinderGeometry(0.32, 0.32, 0.54, 24, 1, false, 0.12, Math.PI - 0.24);
  const commB = new THREE.CylinderGeometry(0.32, 0.32, 0.54, 24, 1, false, Math.PI + 0.12, Math.PI - 0.24);
  b.addMesh(commA, goldMat, { x: 0, y: 0.12, z: 1.25, rx: Math.PI / 2, part: 'motor_commutator', explode: [0, 0, 0.85] });
  b.addMesh(commB, copperMat, { x: 0, y: 0.12, z: 1.25, rx: Math.PI / 2, part: 'motor_commutator', explode: [0, 0, 0.85] });

  // Escovas de grafite e terminais (+) e (−) pressionando o comutador
  for (const side of [-1, 1]) {
    b.box(side * 0.54, 0.12, 1.25, 0.42, 0.24, 0.34, graphiteMat, 'motor_brushes', 0, { explode: [side * 0.85, 0, 0.85] });
    b.box(side * 0.88, -0.56, 1.25, 0.16, 1.38, 0.24, side < 0 ? northMat : southMat, 'motor_brushes', 0, { explode: [side * 0.85, 0, 0.85] });
    b.cyl(side * 0.88, -1.05, 1.56, 0.11, 0.22, goldMat, 'motor_brushes', 0, { explode: [side * 0.85, 0, 0.85] });
  }
}

function buildCrystal(b) {
  const naMat = makeMaterial(0xa78bfa, 0.18, 0.68, { emissive: 0x5b21b6, emissiveIntensity: 0.22 });
  const clMat = makeMaterial(0x10b981, 0.20, 0.28, { emissive: 0x065f46, emissiveIntensity: 0.24 });
  const bondMat = makeMaterial(0xdbeafe, 0.28, 0.62);

  const step = 1.08;
  // Malha cúbica 3x3x3 alternada (estrutura sal-gema NaCl)
  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        const isNa = ((ix + iy + iz + 6) % 2) === 0;
        const x = ix * step, y = iy * step, z = iz * step;
        b.sphere(x, y, z, isNa ? 0.26 : 0.38, isNa ? naMat : clMat, isNa ? 'crystal_na' : 'crystal_cl', 0, {
          segs: 20,
          explode: [ix * 0.52, iy * 0.52, iz * 0.52]
        });

        // Ligações iônicas ao longo dos eixos +X, +Y e +Z
        if (ix < 1) {
          b.cyl(x + step / 2, y, z, 0.042, step - 0.34, bondMat, 'crystal_bonds', 0, {
            rz: Math.PI / 2, segs: 10, explode: [(ix + 0.5) * 0.52, iy * 0.52, iz * 0.52]
          });
        }
        if (iy < 1) {
          b.cyl(x, y + step / 2, z, 0.042, step - 0.34, bondMat, 'crystal_bonds', 0, {
            segs: 10, explode: [ix * 0.52, (iy + 0.5) * 0.52, iz * 0.52]
          });
        }
        if (iz < 1) {
          b.cyl(x, y, z + step / 2, 0.042, step - 0.34, bondMat, 'crystal_bonds', 0, {
            rx: Math.PI / 2, segs: 10, explode: [ix * 0.52, iy * 0.52, (iz + 0.5) * 0.52]
          });
        }
      }
    }
  }

  // Caixa aramada da célula unitária cúbica destacando a simetria do cristal
  const cellGeo = new THREE.BoxGeometry(step * 2, step * 2, step * 2);
  b.edges(cellGeo, 0xfacc15, { part: 'crystal_cell', opacity: 0.95, explode: [0, 0.65, 0] });
  b.label('Na⁺ · Cl⁻  (NaCl)', 0, -1.72, 0.95, 2.2, -0.35, '#a7f3d0', { rx: 0, part: 'crystal_cell', fontSize: 34 });
}

function buildHeart(b) {
  const ventLeftMat = makeMaterial(0xc81e3a, 0.38, 0.14, { emissive: 0x6b0f1e, emissiveIntensity: 0.22 });
  const ventRightMat = makeMaterial(0xa61c3c, 0.40, 0.14, { emissive: 0x4c0d24, emissiveIntensity: 0.18 });
  const atriumLeftMat = makeMaterial(0xe11d48, 0.35, 0.15);
  const atriumRightMat = makeMaterial(0x3b82f6, 0.38, 0.15);
  const aortaMat = makeMaterial(0xef4444, 0.30, 0.18, { emissive: 0x7f1d1d, emissiveIntensity: 0.2 });
  const pulmMat = makeMaterial(0x6366f1, 0.32, 0.16);
  const venaMat = makeMaterial(0x1d4ed8, 0.34, 0.18);
  const valveMat = makeMaterial(0xfef3c7, 0.32, 0.12, { emissive: 0xd97706, emissiveIntensity: 0.18 });
  const coronaryMat = makeMaterial(0xf87171, 0.30, 0.20);

  // Ventrículo esquerdo (mais espesso, forma o ápice inclinado) + Ventrículo direito
  const lv = b.sphere(0.42, -0.45, 0.04, 1.05, ventLeftMat, 'heart_ventricles', 0, {
    segs: 28, explode: [0.55, -0.45, 0]
  });
  lv.scale.set(0.88, 1.32, 0.86);
  lv.rotation.z = 0.22;

  const rv = b.sphere(-0.42, -0.32, 0.18, 0.92, ventRightMat, 'heart_ventricles', 0, {
    segs: 28, explode: [-0.55, -0.35, 0.25]
  });
  rv.scale.set(0.86, 1.18, 0.80);
  rv.rotation.z = -0.18;

  // Artéria coronária descendente anterior percorrendo o sulco interventricular
  b.tube(
    [[0.02, 0.42, 0.88], [-0.04, -0.05, 0.96], [0.14, -0.68, 0.82], [0.24, -1.25, 0.46]],
    0.052,
    coronaryMat,
    'heart_ventricles',
    0,
    { explode: [0, -0.35, 0.55] }
  );

  // Átrio Direito (recebe sangue venoso) e Átrio Esquerdo (recebe sangue arterial)
  const ra = b.sphere(-0.78, 0.58, 0.05, 0.64, atriumRightMat, 'heart_atria', 0, {
    segs: 24, explode: [-0.88, 0.52, 0]
  });
  ra.scale.set(0.95, 0.88, 0.85);
  const la = b.sphere(0.68, 0.64, -0.18, 0.60, atriumLeftMat, 'heart_atria', 0, {
    segs: 24, explode: [0.85, 0.56, -0.25]
  });
  la.scale.set(0.95, 0.86, 0.84);

  // Válvulas cardíacas (tricúspide e mitral) no plano entre átrios e ventrículos (reveladas no modo explodido!)
  b.torus(-0.44, 0.22, 0.08, 0.24, 0.06, valveMat, 'heart_valves', 0, { rx: Math.PI / 2, explode: [-0.24, 0.12, 0.28] });
  b.cyl(-0.44, 0.22, 0.08, 0.22, 0.05, valveMat, 'heart_valves', 0, { explode: [-0.24, 0.12, 0.28] });
  b.torus(0.42, 0.22, -0.06, 0.24, 0.06, valveMat, 'heart_valves', 0, { rx: Math.PI / 2, explode: [0.24, 0.12, -0.22] });
  b.cyl(0.42, 0.22, -0.06, 0.22, 0.05, valveMat, 'heart_valves', 0, { explode: [0.24, 0.12, -0.22] });

  // Arco da Artéria Aorta + 3 ramos superiores (braquiocefálico, carótida e subclávia)
  b.tube(
    [[0.12, 0.52, -0.04], [0.02, 1.38, -0.08], [0.46, 1.82, -0.18], [0.92, 1.46, -0.36], [0.82, 0.12, -0.68]],
    0.24,
    aortaMat,
    'heart_aorta',
    0,
    { segs: 42, explode: [0.25, 1.15, -0.25] }
  );
  b.cyl(0.16, 2.02, -0.12, 0.09, 0.52, aortaMat, 'heart_aorta', 0, { rz: 0.16, explode: [0.25, 1.15, -0.25] });
  b.cyl(0.42, 2.08, -0.18, 0.08, 0.52, aortaMat, 'heart_aorta', 0, { rz: -0.04, explode: [0.25, 1.15, -0.25] });
  b.cyl(0.68, 2.00, -0.26, 0.08, 0.48, aortaMat, 'heart_aorta', 0, { rz: -0.24, explode: [0.25, 1.15, -0.25] });

  // Tronco da Artéria Pulmonar em T saindo do ventrículo direito
  b.tube(
    [[-0.24, 0.28, 0.46], [-0.14, 1.08, 0.36], [0.58, 1.16, 0.12], [1.28, 1.08, 0.02]],
    0.18,
    pulmMat,
    'heart_pulmonary',
    0,
    { explode: [-0.22, 0.72, 0.72] }
  );
  b.tube(
    [[-0.14, 1.08, 0.36], [-0.82, 1.12, 0.24], [-1.34, 1.06, 0.10]],
    0.16,
    pulmMat,
    'heart_pulmonary',
    0,
    { explode: [-0.22, 0.72, 0.72] }
  );

  // Veia Cava Superior e Inferior ligadas ao átrio direito
  b.cyl(-0.88, 1.38, -0.05, 0.20, 1.25, venaMat, 'heart_vena_cava', 0, { rz: 0.08, explode: [-1.15, 0.65, -0.15] });
  b.cyl(-0.78, -0.95, -0.35, 0.19, 1.15, venaMat, 'heart_vena_cava', 0, { rz: -0.06, explode: [-1.05, -0.65, -0.35] });
}

function buildEarth(b) {
  const oceanMat = makeMaterial(0x1d6fe2, 0.30, 0.18);
  const landMat = makeMaterial(0x22c55e, 0.55, 0.06);
  const iceMat = makeMaterial(0xe2e8f0, 0.45, 0.05);
  const atmoMat = makeMaterial(0x7dd3fc, 0.15, 0.05, { transparent: true, opacity: 0.18, side: THREE.BackSide });
  const mantleMat = makeMaterial(0xea580c, 0.45, 0.12, { emissive: 0x9a3412, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  const outerCoreMat = makeMaterial(0xf59e0b, 0.30, 0.30, { emissive: 0xd97706, emissiveIntensity: 0.55, side: THREE.DoubleSide });
  const innerCoreMat = makeMaterial(0xfef9c3, 0.18, 0.45, { emissive: 0xfde047, emissiveIntensity: 0.95 });
  const axisMat = makeMaterial(0xcbd5e1, 0.25, 0.85);

  const tilt = (23.5 * Math.PI) / 180;

  // Eixo de inclinação da Terra (23,5°)
  b.cyl(0, 0, 0, 0.04, 4.45, axisMat, 'earth_axis', 0, { rz: -tilt });
  b.label('23,5°', 0.95, 1.98, 0, 0.95, 0, '#e2e8f0', { rx: 0, part: 'earth_axis' });

  // Globo 3/4 (270°) deixando aberto o quadrante frontal-direito para ver as camadas internas!
  const crustGeo = new THREE.SphereGeometry(1.72, 36, 28, Math.PI * 0.5, Math.PI * 1.5);
  b.addMesh(crustGeo, oceanMat, { part: 'earth_crust', explode: [-0.45, 0, -0.35] });

  // Continentes estilizados sobre o globo (no lado visível dos 270°)
  const continents = [
    [-1.45, 0.42, 0.82, 0.42, 0.55, 0.25],
    [-1.12, -0.58, 1.15, 0.36, 0.52, 0.22],
    [-0.25, 0.68, -1.52, 0.65, 0.48, 0.24],
    [0.82, -0.35, -1.42, 0.52, 0.44, 0.22],
    [0.0, 1.62, -0.15, 0.62, 0.16, 0.62]
  ];
  continents.forEach(([cx, cy, cz, sx, sy, sz], i) => {
    const m = b.sphere(cx, cy, cz, 1, i === 4 ? iceMat : landMat, 'earth_crust', 0, {
      segs: 14, explode: [-0.45, 0, -0.35]
    });
    m.scale.set(sx, sy, sz);
  });

  // Fatia removível de 90° (se afasta dramaticamente no modo explodido!)
  const wedgeGeo = new THREE.SphereGeometry(1.72, 24, 24, 0, Math.PI * 0.5);
  b.addMesh(wedgeGeo, oceanMat, { part: 'earth_crust', explode: [1.35, 0.28, 1.25] });

  // Paredes do corte interno mostrando o manto laranja
  const sliceA = new THREE.CircleGeometry(1.70, 32);
  b.addMesh(sliceA, mantleMat, { ry: Math.PI / 2, part: 'earth_mantle', explode: [-0.12, 0, 0] });
  b.addMesh(sliceA, mantleMat, { ry: 0, part: 'earth_mantle', explode: [0, 0, -0.12] });

  // Manto esférico interno + Núcleo externo + Núcleo interno incandescente
  const mantleGeo = new THREE.SphereGeometry(1.52, 28, 22, Math.PI * 0.5, Math.PI * 1.5);
  b.addMesh(mantleGeo, mantleMat, { part: 'earth_mantle', explode: [-0.12, 0, -0.12] });
  const outerGeo = new THREE.SphereGeometry(0.98, 28, 22, Math.PI * 0.2, Math.PI * 1.8);
  b.addMesh(outerGeo, outerCoreMat, { part: 'earth_outer_core', explode: [0.32, 0, 0.32] });
  b.sphere(0, 0, 0, 0.54, innerCoreMat, 'earth_inner_core', 0, { segs: 24, explode: [0.72, 0, 0.72] });

  // Atmosfera translúcida envolvendo o planeta
  b.sphere(0, 0, 0, 1.94, atmoMat, 'earth_atmosphere', 0, { segs: 32, explode: [-0.45, 0.45, -0.35] });
}

function buildVolcano(b) {
  const strataTex = volcanoStrataTexture();
  const crustBottomMat = makeMaterial(0x3f2e24, 0.72, 0.08);
  const crustMidMat = makeMaterial(0x5c4333, 0.68, 0.08);
  const coneMat = makeMaterial(0x4c3a32, 0.78, 0.06, strataTex ? { map: strataTex, side: THREE.DoubleSide } : { side: THREE.DoubleSide });
  const magmaMat = makeMaterial(0xff5a1f, 0.22, 0.12, { emissive: 0xea380c, emissiveIntensity: 0.92 });
  const lavaMat = makeMaterial(0xfb923c, 0.25, 0.14, { emissive: 0xf97316, emissiveIntensity: 0.75 });
  const ashMat = makeMaterial(0x94a3b8, 0.85, 0.04, { transparent: true, opacity: 0.72 });

  // Base litosférica em camadas sedimentares (corte 3/4 para expor a câmara magmática!)
  const crustLower = new THREE.CylinderGeometry(2.35, 2.45, 0.46, 36, 1, false, Math.PI * 0.5, Math.PI * 1.5);
  b.addMesh(crustLower, crustBottomMat, { y: -1.32, part: 'volcano_crust', explode: [-0.35, -0.55, -0.35] });
  const crustUpper = new THREE.CylinderGeometry(2.25, 2.35, 0.42, 36, 1, false, Math.PI * 0.5, Math.PI * 1.5);
  b.addMesh(crustUpper, crustMidMat, { y: -0.88, part: 'volcano_crust', explode: [-0.35, -0.25, -0.35] });

  // Câmara magmática incandescente subterrânea
  const chamber = b.sphere(0, -1.08, 0, 0.96, magmaMat, 'volcano_chamber', 0, {
    segs: 26, explode: [0.25, -0.68, 0.25]
  });
  chamber.scale.set(1.32, 0.62, 1.32);

  // Cone estratovulcânico em corte aberto de 270° revelando as camadas de cinzas e lava
  const coneGeo = new THREE.CylinderGeometry(0.46, 2.15, 2.15, 36, 1, false, Math.PI * 0.5, Math.PI * 1.5);
  b.addMesh(coneGeo, coneMat, { y: 0.38, part: 'volcano_cone', explode: [-0.55, 0.42, -0.55] });

  // Fatia removível de 90° do cone (no modo explodido afasta-se mostrando todo o interior!)
  const coneWedge = new THREE.CylinderGeometry(0.46, 2.15, 2.15, 18, 1, false, 0, Math.PI * 0.5);
  b.addMesh(coneWedge, coneMat, { y: 0.38, part: 'volcano_cone', explode: [1.28, 0.45, 1.25] });

  // Chaminé principal central + dique lateral (chaminé secundária)
  b.cyl(0, 0.28, 0, 0.24, 2.48, magmaMat, 'volcano_conduit', 0, { rTop: 0.32, rBot: 0.22, explode: [0, 0.35, 0] });
  b.tube(
    [[0.05, -0.25, 0.05], [0.68, 0.08, 0.52], [1.24, 0.26, 0.95]],
    0.11,
    magmaMat,
    'volcano_conduit',
    0,
    { explode: [0.42, 0.25, 0.42] }
  );

  // Lago de lava na cratera + dois rios de lava escorrendo pelas encostas
  b.cyl(0, 1.44, 0, 0.42, 0.10, lavaMat, 'volcano_lava', 0.85);
  b.tube(
    [[0.22, 1.46, -0.18], [0.68, 0.96, -0.55], [1.18, 0.25, -0.88], [1.76, -0.58, -1.16]],
    0.09,
    lavaMat,
    'volcano_lava',
    0,
    { explode: [0.45, 0.65, -0.45] }
  );
  b.tube(
    [[-0.25, 1.46, 0.14], [-0.72, 0.88, 0.52], [-1.32, 0.12, 0.88], [-1.88, -0.58, 1.05]],
    0.085,
    lavaMat,
    'volcano_lava',
    0,
    { explode: [-0.45, 0.65, 0.45] }
  );

  // Pluma de cinzas e gases vulcânicos subindo em camadas acima da cratera
  const puffs = [
    [0, 1.88, 0, 0.36],
    [0.24, 2.24, -0.12, 0.48],
    [-0.28, 2.38, 0.16, 0.44],
    [0.06, 2.66, 0.04, 0.56],
    [0.52, 2.74, -0.22, 0.40],
    [-0.46, 2.78, 0.22, 0.38]
  ];
  for (const [px, py, pz, r] of puffs) {
    b.sphere(px, py, pz, r, ashMat, 'volcano_plume', 1.45, { segs: 16 });
  }
}

export const MODEL_BUILDERS = {
  ssd: buildSSD,
  hdd: buildHDD,
  nvme: buildNVMe,
  cpu: buildCPU,
  circuit: buildCircuit,
  prism: buildPrism,
  motor: buildMotor,
  atom: buildAtom,
  molecule: buildMolecule,
  crystal: buildCrystal,
  cell: buildCell,
  dna: buildDNA,
  heart: buildHeart,
  earth: buildEarth,
  volcano: buildVolcano
};

export function buildBuiltinModel(group, type) {
  const builder = createBuilder(group);
  const fn = MODEL_BUILDERS[type] || MODEL_BUILDERS.ssd;
  fn(builder);
}
