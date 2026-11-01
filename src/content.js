export const slides = [
  {
    tag: '01 / O ponto de partida', title: 'Onde vivem os seus arquivos?',
    intro: 'Fotos, jogos e trabalhos precisam de uma casa. Mesmo quando o computador desliga.',
    model: 'ssd', points: ['O armazenamento guarda dados por longo prazo, sem depender de energia.', 'O sistema operacional, os aplicativos e seus arquivos ficam no HDD ou no SSD.', 'A RAM é a bancada de trabalho temporária. O armazenamento é o armário.'],
    note: '1 min · Comece perguntando onde ficam as fotos depois que desligamos o computador. Use a comparação bancada × armário. Cada integrante deve assumir uma parte da aula.',
    callout: 'Desligar o computador não apaga os arquivos salvos.'
  },
  {
    tag: '02 / Por dentro do HDD', title: 'Uma pequena máquina de precisão.',
    intro: 'No disco rígido, os dados são padrões magnéticos gravados em pratos que giram.',
    model: 'hdd', points: ['O motor gira os pratos, normalmente a milhares de rotações por minuto.', 'Um braço posiciona as cabeças para ler ou gravar nas trilhas.', 'Esperar a rotação e o movimento do braço aumenta o tempo de acesso.'],
    note: '1 min 20 s · Gire o modelo e destaque prato, motor e braço. É um esquema ampliado: a cabeça real opera extremamente próxima da superfície. Não abra um HDD que ainda será usado.',
    callout: 'Movimento mecânico → mais latência, ruído e sensibilidade a impactos.'
  },
  {
    tag: '03 / Por dentro do SSD', title: 'Sem movimento. Com muita velocidade.',
    intro: 'O SSD armazena dados em células de memória flash NAND, controladas eletronicamente.',
    model: 'ssd', points: ['A memória flash mantém os dados mesmo sem energia.', 'O controlador organiza leituras, gravações e o desgaste das células.', 'Sem pratos nem braços móveis, o acesso é mais rápido e silencioso.'],
    note: '1 min 20 s · Use “Abrir modelo” e toque nos chips e no controlador. A disposição é ilustrativa e varia por fabricante. Nem todo SSD possui DRAM dedicada. SSD também pode falhar: backup continua necessário.',
    callout: 'Pergunta 1: por que um SSD continua guardando arquivos sem energia?',
    prompt: 'Por que um SSD não perde os arquivos quando o computador desliga?', answer: 'Porque usa memória flash não volátil. A RAM comum, por outro lado, precisa de energia para manter os dados.'
  },
  {
    tag: '04 / Frente a frente', title: 'A escolha depende do uso.',
    intro: 'Velocidade importa. Capacidade, orçamento e resistência também.',
    model: 'hdd', comparison: true,
    points: ['HDD: costuma oferecer mais espaço por real; útil para grandes volumes de arquivos.', 'SSD: menor latência, sem ruído mecânico e maior resistência a impactos durante o uso.', 'Ambos podem falhar. Mantenha cópias dos arquivos importantes em outro dispositivo ou serviço.'],
    note: '1 min · Compare custo por GB, ruído e resistência. Não prometa que SSD é indestrutível ou que HDD é sempre lento em toda tarefa. Valores de desempenho dependem do modelo e da carga.',
    callout: 'É possível combinar SSD para sistema e programas + HDD para arquivos.'
  },
  {
    tag: '05 / Conexões e protocolos', title: 'SATA, NVMe e a confusão do M.2.',
    intro: 'O formato da peça não diz tudo sobre como ela conversa com o computador.',
    model: 'nvme', points: ['SATA é uma interface usada por HDDs e SSDs; em SATA III, o limite bruto é 6 Gb/s.', 'NVMe é um protocolo para armazenamento que normalmente usa PCIe e permite menor latência e maior vazão.', 'M.2 é um formato/conector: um SSD M.2 pode usar SATA ou PCIe/NVMe. Confira o suporte da placa-mãe.'],
    note: '1 min 30 s · Mostre o conector do M.2. SSD SATA costuma chegar a cerca de 500–550 MB/s em leitura sequencial; NVMe varia conforme geração, pistas e modelo. Isso não significa que toda tarefa acelera na mesma proporção.',
    callout: 'Pergunta 2: todo SSD M.2 é NVMe?',
    prompt: 'Todo SSD em formato M.2 usa NVMe?', answer: 'Não. M.2 descreve um formato/conector. Existem SSDs M.2 SATA e SSDs M.2 PCIe/NVMe; a placa precisa ser compatível.'
  },
  {
    tag: '06 / Sua vez de decidir', title: 'O PC da escola demora para iniciar.',
    intro: 'O computador usa HDD. A turma precisa abrir o sistema e os programas com mais agilidade. O orçamento permite trocar uma peça.',
    model: 'ssd', points: ['Que tipo de armazenamento você recomendaria?', 'Como você justificaria a escolha para alguém que não conhece hardware?', 'O que é preciso conferir antes da compra e da migração dos arquivos?'],
    note: '1 min 30 s · Dê 30 segundos para duplas discutirem e peça uma justificativa. SSD é a recomendação esperada se o armazenamento for o gargalo. Conferir SATA/PCIe/NVMe, formato, capacidade e backup. Outros gargalos também podem existir.',
    callout: 'Desafio da turma · pense, converse e justifique.',
    prompt: 'Qual seria sua recomendação para esse computador?', answer: 'Trocar o HDD por um SSD compatível tende a reduzir o tempo de inicialização e abertura dos programas. Faça backup e confira formato, interface e capacidade antes de migrar.'
  },
  {
    tag: '07 / Conectando as ideias', title: 'Dados guardados. Ideias conectadas.',
    intro: 'HDD e SSD têm a mesma missão. O caminho até os dados é que muda.',
    model: 'nvme', points: ['HDD grava magneticamente em pratos que giram.', 'SSD usa memória flash e não tem partes móveis.', 'Escolha considerando uso, custo, capacidade e compatibilidade. E sempre faça backup.'],
    note: '40 s · Retome a diferença entre armazenamento e RAM. Convide a turma ao quiz. Reserve cerca de 2 minutos para as 5 perguntas e o ranking, totalizando aproximadamente 10–12 minutos.',
    callout: 'Pronto para testar o que você aprendeu?'
  }
];

// O apresentador controla a revelação das respostas; o site é estático.
export const avatars = ['🚀', '🤖', '🦊', '🐱', '👾', '🐼', '⚡', '🧠', '🦉', '🐸', '🪐', '🎮'];

export const defaultQuestions = [
  { text: 'Qual componente mantém seus arquivos salvos quando o computador desliga?', options: ['Memória RAM comum', 'Armazenamento (HDD ou SSD)', 'Ventoinha', 'Cache do processador'], correct: 1, difficulty: 'Fácil', base: 1000, seconds: 18, explanation: 'HDD e SSD são armazenamento não volátil: guardam os dados sem energia.' },
  { text: 'Como um HDD lê e grava os dados?', options: ['Em células de flash NAND', 'Por meio de luz em um DVD', 'Em pratos magnéticos com cabeças de leitura/gravação', 'Somente na memória RAM'], correct: 2, difficulty: 'Fácil', base: 1000, seconds: 18, explanation: 'O HDD usa pratos magnéticos giratórios e um braço que posiciona as cabeças.' },
  { text: 'Por que o SSD costuma responder mais rápido que um HDD?', options: ['Porque gira os pratos mais rápido', 'Porque sempre tem mais capacidade', 'Porque guarda tudo em RAM volátil', 'Porque acessa a memória eletronicamente, sem movimento mecânico'], correct: 3, difficulty: 'Média', base: 1500, seconds: 20, explanation: 'O SSD não precisa esperar pratos girarem ou um braço mecânico se posicionar.' },
  { text: 'Qual afirmação sobre M.2 e NVMe está correta?', options: ['M.2 é um formato/conector; o SSD pode usar SATA ou PCIe/NVMe', 'Todo M.2 é NVMe', 'NVMe só funciona por cabos SATA', 'M.2 e NVMe são sinônimos'], correct: 0, difficulty: 'Difícil', base: 2000, seconds: 25, explanation: 'M.2 descreve formato/conector. NVMe é um protocolo normalmente usado sobre PCIe. Confira a compatibilidade da placa-mãe.' },
  { text: 'Um PC com HDD precisa iniciar mais rápido. Qual recomendação faz sentido?', options: ['Comprar qualquer M.2 sem olhar a placa-mãe', 'Desligar o backup para economizar espaço', 'Usar um SSD compatível para sistema e programas, mantendo backup', 'Escolher um HDD apenas por ele fazer ruído'], correct: 2, difficulty: 'Média', base: 1500, seconds: 22, explanation: 'Um SSD compatível tende a agilizar o acesso aos arquivos do sistema. Verifique conexão, formato e capacidade; faça backup antes da migração.' }
];
