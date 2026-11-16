// ILHA DO VULCÃO — dados: tabuleiro, provas, cartas e regras (partilhado pela TV e pelos comandos)
(function (G) {
  const D = {};

  // ---------- tabuleiro da ilha ----------
  // n normal · + avança · - recua · again trampolim · luck sorte · duel duelo · storm tufão · swap papagaio
  // volc erupção · skull caveira · gate guardião · goal cume
  const L = 'start n +2 n luck duel -2 n again n storm luck +3 gate ' +
    'n duel n +2 luck skull n volc swap duel +3 n again gate ' +
    'n luck skull duel n volc -3 swap +2 n duel storm luck gate ' +
    'n +2 duel -3 volc skull luck n again goal';
  D.ISLAND = L.split(' ').map(s => {
    if (s[0] === '+' ) return { t: '+', v: +s.slice(1) };
    if (s[0] === '-' ) return { t: '-', v: +s.slice(1) };
    return { t: s };
  });
  D.N = D.ISLAND.length;            // 64
  D.GOAL = D.N - 1;
  D.GATES = D.ISLAND.map((s, i) => s.t === 'gate' ? i : -1).filter(i => i >= 0);
  D.GATE_NAMES = ['Guardião da Praia', 'Guardião da Selva', 'Guardião da Cratera'];
  D.LAVA_TYPES = { '+': 1, again: 1, luck: 1, duel: 1, storm: 1, swap: 1 };

  // ---------- interior do vulcão ----------
  D.VOLC = 'n n geyser n vback n geyser n vback n geyser exit'.split(' ').map(t => ({ t }));
  D.M = D.VOLC.length;              // 12
  D.EXITV = D.M - 1;

  D.SPACE = {
    start: ['🏖️', 'Praia', 'Aqui começa a subida.'],
    n: ['', 'Casa livre', 'Nada acontece. Respira.'],
    '+': ['⏩', 'Vento a favor', 'Avanças as casas indicadas.'],
    '-': ['⏪', 'Areia movediça', 'Recuas as casas indicadas.'],
    again: ['🤸', 'Trampolim', 'Lanças um dado normal e avanças outra vez.'],
    luck: ['🃏', 'Carta da Sorte', 'Tiras uma carta: pode ser boa, má ou uma prenda para pagar.'],
    duel: ['⚔️', 'Duelo', 'Desafias alguém para uma prova 1 contra 1. Quem ganha avança 3, quem perde recua 3.'],
    storm: ['🌪️', 'Tufão', 'A roleta escolhe alguém na ilha (podes ser tu) e o tufão leva-o 5 casas para trás.'],
    swap: ['🦜', 'Papagaio', 'Trocas de lugar com um jogador à tua escolha.'],
    volc: ['🌋', 'Erupção', 'O vulcão acorda: durante 3 rondas as casas especiais da ilha viram lava (recuas 4).'],
    skull: ['💀', 'Caveira', 'O chão abre-se e cais dentro do vulcão.'],
    gate: ['🗿', 'Guardião', 'Paragem obrigatória. Na tua vez seguinte tens de vencer o desafio para passar.'],
    goal: ['🏆', 'Cume', 'Toca o gongo do templo para ganhar.'],
    geyser: ['♨️', 'Géiser', 'Sais disparado e voltas à casa da ilha de onde caíste.'],
    vback: ['🪨', 'Desabamento', 'Recuas 2 casas dentro do vulcão.'],
    exit: ['🚪', 'Saída da gruta', 'Voltas à ilha, na casa do último Guardião que venceste (ou na Praia).'],
    lava: ['🔥', 'Lava', 'Casa coberta de lava: recuas 4.'],
  };
  D.SPCOL = { start: '#f2d9a0', n: '#e9e2cf', '+': '#3fb56b', '-': '#e2574c', again: '#35b6c9', luck: '#f0b429', duel: '#8e5bd6', storm: '#7f8c9b', swap: '#f2718c', volc: '#e8672a', skull: '#2b2b33', gate: '#a9793f', goal: '#f6d04d', geyser: '#58c7e8', vback: '#8a6a5a', exit: '#7bd389', lava: '#ff5a1f' };

  // ---------- caminho (coordenadas partilhadas pelo 3D e pelo mapa 2D) ----------
  const R0 = 47, R1 = 14.5, TH = 10.6, A0 = 1.95;
  D.coastK = th => 1 + .35 * Math.sin(3 * th + 1) + .2 * Math.sin(5 * th + 2.1);
  D.coastR = (th, re) => 48 + (re - 48) / D.coastK(th);
  D.profile = function (r) { // altura do terreno em função da distância ao centro
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    if (r > 58) return -3 - (r - 58) * 0.12;
    if (r > 50) return -3 + ss(58, 50, r) * 3.9;           // praia a sair da água
    if (r > 30) return 0.9 + ss(50, 30, r) * 6.2;           // planície e selva
    if (r > 11.5) return 7.1 + Math.pow(ss(30, 11.5, r), 0.92) * 21; // cone
    if (r > 7.5) return 28.1 - ss(11.5, 7.5, r) * 7.5;      // interior da cratera
    return 20.6;
  };
  (function () {
    const fine = [], K = 2400; let len = 0, px = null, pz = null;
    for (let k = 0; k <= K; k++) {
      const u = k / K, th = A0 + u * TH, r = R0 + (R1 - R0) * u;
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      if (px !== null) len += Math.hypot(x - px, z - pz);
      fine.push([x, z, len, r]); px = x; pz = z;
    }
    D.PATH = []; D.FINE = [];
    let j = 0;
    for (let i = 0; i < D.N; i++) {
      const target = len * i / (D.N - 1);
      while (j < K && fine[j][2] < target) j++;
      const f = fine[j];
      D.PATH.push({ x: f[0], z: f[1], y: D.profile(f[3]) + 0.25, r: f[3] });
    }
    for (let k = 0; k <= K; k += 6) D.FINE.push({ x: fine[k][0], z: fine[k][1], y: D.profile(fine[k][3]), r: fine[k][3] });
    D.VPATH = [];
    for (let i = 0; i < D.M; i++) { const a = -0.9 + i * 0.5, r = 10.5; D.VPATH.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 1.2 + i * 1.25 }); }
  })();

  // ---------- jogadores ----------
  D.MAXP = 8;
  D.PCOLORS = ['#e63946', '#2a9df4', '#f4a300', '#2bb673', '#9b5de5', '#ff6fb5', '#00bcd4', '#f5f0e6'];
  D.HATS = [['👒', 'Chapéu de palha'], ['🏴‍☠️', 'Bandana'], ['🌺', 'Coroa de flores'], ['🧢', 'Boné'], ['⛑️', 'Capacete'], ['🎩', 'Cartola'], ['🥥', 'Coco'], ['👑', 'Coroa']];
  D.BOTNAMES = ['Robinson', 'Sexta-Feira', 'Tia Lava', 'Zé Coco', 'Dona Maré', 'Sr. Caranguejo', 'Cap. Sardinha', 'Menina Brisa'];

  // ---------- provas da vida real ----------
  // t título · d instruções · s segundos (0 = sem relógio) · c precisa de baralho · v variantes (substitui {v})
  const OBJ = ['uma colher', 'algo vermelho', 'uma meia que não seja tua', 'um rolo de papel higiénico', 'um comando de televisão', 'uma moeda de 20 cêntimos', 'um íman do frigorífico', 'algo que cheire bem', 'um livro com mais de 200 páginas', 'uma chave que não seja tua', 'três coisas azuis', 'um fruto ou legume'];
  const CAT = ['marcas de carros', 'sítios e ruas de Fátima', 'jogadores de futebol portugueses', 'coisas que se levam para a praia', 'bebidas', 'capitais da Europa', 'jogos de tabuleiro ou de cartas', 'coisas que há num supermercado', 'personagens de desenhos animados', 'cidades e vilas de Portugal', 'coisas que se dizem numa noite de copos', 'animais com quatro patas'];
  const TL = ['“Três tristes tigres trincam trigo num prato de trigo”', '“O rato roeu a rolha da garrafa de rum do rei da Rússia”', '“Um prato de trigo para três tigres tristes”', '“A aranha arranha a rã, a rã arranha a aranha”', '“Padre Pedro prega pregos, prega pregos Padre Pedro”', '“Se o papá papa papa, se o papa papa pão, tudo papa o papá”'];

  D.ALL = [ // todos contra todos
    { t: 'Estátuas de Sal', d: 'Todos de pé, numa pose ridícula. Quem se mexer ou se rir, sai. Ganha a última estátua.', s: 0 },
    { t: 'Pedra, Papel, Tesoura', d: 'Jogam aos pares, à melhor de 1. Quem perde sai. Continuem até sobrar um campeão.', s: 0 },
    { t: 'Caça ao Objeto', d: 'Ganha o primeiro a voltar à mesa com: {v}. Partida à contagem de 3!', s: 0, v: OBJ },
    { t: 'Cadeira Invisível', d: 'Costas na parede, joelhos a 90 graus, mãos fora das pernas. O último a aguentar ganha.', s: 0 },
    { t: 'Carta Mais Alta', d: 'Cada um tira uma carta do baralho. Ganha a mais alta (o Ás ganha a tudo). Em caso de empate, tiram outra.', s: 0, c: 1 },
    { t: 'Não Te Rias', d: 'Olhem uns para os outros em silêncio. Vale caretas, não vale tocar. Quem se rir sai. Ganha o último sério.', s: 0 },
    { t: 'Categorias', d: 'À vez e sem repetir, digam {v}. Quem hesitar 3 segundos, repetir ou inventar, sai. Ganha o último.', s: 0, v: CAT },
    { t: 'Flamingo', d: 'Num pé só e de olhos fechados. Quem pousar o pé ou abrir os olhos, sai. Ganha o último flamingo.', s: 0 },
    { t: 'Lança a Carta', d: 'Ponham um alvo (panela, chapéu ou almofada) a 2 metros. Cada um lança uma carta. Ganha quem acertar ou ficar mais perto.', s: 0, c: 1 },
    { t: 'Moeda ao Copo', d: 'À vez, façam a moeda saltar na mesa para dentro de um copo. Ganha o primeiro a acertar.', s: 0 },
    { t: 'Barrote', d: 'Contem à roda a partir do 1. Nos múltiplos de 3 e nos números com um 3, digam “barrote” em vez do número. Quem falhar sai. Ganha o último.', s: 0 },
    { t: 'Vermelha ou Preta', d: 'Antes de virar cada carta, todos apostam na cor. Quem falhar sai. Continua até sobrar um (se saírem todos, voltam todos).', s: 0, c: 1 },
    { t: 'Aviões de Papel', d: 'Têm 60 segundos para fazer um avião de papel. Depois lançam todos do mesmo sítio. Ganha o que for mais longe.', s: 60 },
    { t: 'Prancha', d: 'Todos em prancha, apoiados nos antebraços. Ganha o último a ceder.', s: 0 },
    { t: 'Trava-Línguas', d: 'Cada um diz 3 vezes seguidas e depressa: {v}. O grupo vota em quem disse melhor.', s: 0, v: TL },
    { t: 'Estátua Musical', d: 'Alguém põe uma música. Dancem! Quando parar, quem se mexer sai. Repitam até sobrar um.', s: 0 },
    { t: 'Dedos', d: 'À contagem de 3, todos mostram de 1 a 5 dedos. Quem mostrar um número igual ao de outro jogador sai. Repitam até sobrar um (ou ganha o maior número único).', s: 0 },
  ];
  D.DUEL = [ // 1 contra 1
    { t: 'Braço de Ferro', d: 'Cotovelos na mesa, à contagem de 3. Sem levantar o cotovelo.', s: 0 },
    { t: 'Sério', d: 'Olhos nos olhos. Perde o primeiro a rir ou a desviar o olhar.', s: 0 },
    { t: 'Pedra, Papel, Tesoura', d: 'À melhor de 3.', s: 0 },
    { t: 'Guerra de Polegares', d: 'Mãos entrelaçadas. Ganha quem prender o polegar do outro durante 3 segundos.', s: 0 },
    { t: 'Carta Mais Alta', d: 'Cada um tira uma carta, à melhor de 3. O Ás ganha a tudo.', s: 0, c: 1 },
    { t: 'Copo de Água', d: 'Um copo de água igual para cada um. Ganha quem acabar primeiro e pousar o copo na mesa.', s: 0 },
    { t: 'Bate-Mãos', d: 'Um põe as mãos por cima, o outro por baixo e tenta bater-lhe. 3 tentativas para cada um. Ganha quem acertar mais.', s: 0 },
    { t: 'Trava-Línguas', d: 'Cada um diz 3 vezes seguidas: {v}. O grupo decide quem disse melhor.', s: 0, v: TL },
    { t: 'Moeda à Parede', d: 'Cada um lança uma moeda a rasar o chão. Ganha quem a deixar mais perto da parede.', s: 0 },
    { t: 'Flamingos de Luta', d: 'Num pé só, frente a frente. Só podem empurrar-se pelas palmas das mãos. Perde quem pousar o pé.', s: 0 },
    { t: 'Tás Mal', d: 'Cada um tem 15 segundos para dizer ao outro o “tás mal” mais criativo. O grupo vota no melhor.', s: 0 },
    { t: 'Agachamentos', d: '30 segundos. Ganha quem fizer mais agachamentos completos. O grupo conta em voz alta.', s: 30 },
    { t: 'Apanha a Carta', d: 'Um larga uma carta em pé, o outro tenta apanhá-la com dois dedos. 3 tentativas para cada um.', s: 0, c: 1 },
    { t: 'Par ou Ímpar', d: 'À melhor de 3. Um é “par”, o outro “ímpar”; mostram dedos ao mesmo tempo.', s: 0 },
    { t: 'Pânico Longo', d: 'Sem respirar, digam “pâââânico” o mais tempo que conseguirem. Ganha a nota mais longa.', s: 0 },
    { t: 'Dedo Rápido', d: 'Uma moeda no meio da mesa, mãos atrás das costas. Um terceiro diz “já!”. Ganha quem a apanhar primeiro, à melhor de 3.', s: 0 },
  ];
  D.SOLO = [ // 1 contra o resto: o texto diz quando ganha o solo
    { t: 'Faz-me Rir', d: '{S} tem 45 segundos para fazer rir pelo menos uma pessoa. Não vale tocar. Se alguém se rir, ganha {S}.', s: 45 },
    { t: 'Tesouro Escondido', d: 'Fechem todos os olhos 20 segundos enquanto {S} esconde uma moeda na sala. Depois têm 60 segundos para a encontrar. Se não a encontrarem, ganha {S}.', s: 80 },
    { t: 'O Mentiroso', d: '{S} conta 3 coisas sobre si: 2 verdades e 1 mentira. O grupo conferencia e aponta a mentira. Se o grupo falhar, ganha {S}.', s: 0 },
    { t: 'Detetives', d: 'Fechem os olhos 20 segundos. {S} muda 3 coisas (em si ou na sala). O grupo tem 60 segundos para descobrir as 3. Se faltar uma, ganha {S}.', s: 80 },
    { t: 'Em Que Mão?', d: '{S} esconde uma moeda numa das mãos. Cada adversário aposta numa mão. {S} ganha se enganar pelo menos metade.', s: 0 },
    { t: 'Um Contra Todos', d: '{S} joga Pedra, Papel, Tesoura contra cada adversário, um de cada vez. {S} ganha se vencer pelo menos metade dos duelos.', s: 0 },
    { t: 'Cara de Pau', d: '{S} tem de ficar 40 segundos sem se rir nem sorrir enquanto os outros fazem de tudo (sem tocar). Se aguentar, ganha {S}.', s: 40 },
    { t: 'Número Secreto', d: '{S} pensa num número de 1 a 30 e escreve-o às escondidas. O grupo tem 5 palpites; {S} só diz “mais” ou “menos”. Se não acertarem, ganha {S}.', s: 0 },
    { t: 'Carta Marcada', d: '{S} tira uma carta sem a mostrar. Cada adversário diz um naipe. {S} ganha se ninguém acertar.', s: 0, c: 1 },
    { t: 'Fuga às Perguntas', d: 'Durante 45 segundos o grupo faz perguntas a {S}, que não pode dizer “sim”, “não”, “não sei” nem abanar a cabeça. Se aguentar, ganha {S}.', s: 45 },
  ];
  D.TEAM = [ // duas equipas
    { t: 'Mímica', d: 'Cada equipa tem 45 segundos. Um elemento vê as palavras no telemóvel e faz mímica; a equipa adivinha. Ganha a equipa com mais palavras.', s: 45, w: 'mime' },
    { t: 'Cantarola', d: 'Cada equipa tem 45 segundos. Um elemento vê as músicas no telemóvel e só pode cantarolar (sem letra!). Ganha a equipa com mais músicas adivinhadas.', s: 45, w: 'song' },
    { t: 'Palavra Proibida', d: 'Cada equipa tem 45 segundos. Um elemento descreve as palavras do telemóvel sem as dizer nem usar palavras da mesma família. Ganha quem adivinhar mais.', s: 45, w: 'mime' },
    { t: 'Estafeta da Carta', d: 'Cada equipa em fila. Passem uma carta de jogador em jogador, equilibrada nas costas da mão. Se cair, recomeça. Ganha a primeira equipa a chegar ao fim.', s: 0, c: 1 },
    { t: 'Torre de Cartas', d: '60 segundos para construir a torre de cartas mais alta. Ganha a torre mais alta ainda de pé no fim.', s: 60, c: 1 },
    { t: 'Soma Sete', d: 'Sem falar! À contagem de 3, cada elemento mostra de 0 a 5 dedos. Ganha a primeira equipa a somar exatamente 7.', s: 0 },
    { t: 'Estafeta PPT', d: 'Um de cada equipa joga Pedra, Papel, Tesoura. Quem perde é substituído pelo colega seguinte. Perde a equipa que ficar sem jogadores.', s: 0 },
    { t: 'Coro Desafinado', d: 'Cada equipa canta em coro o refrão de uma música à escolha. A equipa adversária dá nota de 1 a 10. Ganha a melhor nota (empate: repete).', s: 0 },
  ];
  D.GATE = [ // desafio do guardião: o resto do grupo dá 👍 ou 👎
    { t: 'Alfabeto ao Contrário', d: 'Diz o alfabeto de Z até P, sem enganos, em 20 segundos.', s: 20 },
    { t: 'Equilibrista', d: 'Equilibra um objeto na cabeça (escolhido pelo grupo) e dá uma volta à mesa sem lhe tocar.', s: 0 },
    { t: 'Força Bruta', d: 'Faz 10 flexões ou 15 agachamentos em 30 segundos. O grupo conta.', s: 30 },
    { t: 'Trava-Línguas', d: 'Diz 3 vezes seguidas, sem enganos: {v}', s: 0, v: TL },
    { t: 'Pontaria', d: 'Acerta com uma bola de papel num copo ou caixote a 2 metros. Tens 3 tentativas.', s: 0 },
    { t: 'Olho de Peixe', d: 'Fica 20 segundos sem pestanejar. O grupo vigia de perto.', s: 20 },
    { t: 'Língua Afiada', d: 'Diz 7 {v} em 15 segundos.', s: 15, v: CAT },
    { t: 'Discurso', d: 'Faz um discurso de 20 segundos a explicar porque mereces passar. O grupo decide se convenceu.', s: 20 },
    { t: 'Cara ou Coroa', d: 'Lança uma moeda e adivinha o lado antes de cair. Tens de acertar 2 em 3.', s: 0 },
    { t: 'Vidente', d: 'Adivinha a cor (vermelha ou preta) de 3 cartas, uma de cada vez. Tens de acertar pelo menos 2.', s: 0, c: 1 },
    { t: 'Toques', d: 'Dá 5 toques seguidos numa bola de papel (pé ou mão) sem a deixar cair. Tens 3 tentativas.', s: 0 },
    { t: 'Karaoke Relâmpago', d: 'O grupo escolhe uma letra. Canta 10 segundos de uma música cujo título comece por essa letra.', s: 0 },
    { t: 'Imitador', d: 'Imita outro jogador sem dizer o nome. O grupo tem de adivinhar quem é em 20 segundos.', s: 20 },
    { t: 'Memória de Elefante', d: 'O grupo diz-te 6 palavras ao calhas. Repete-as todas pela ordem certa.', s: 0 },
  ];
  D.DARE = [ // prendas das cartas da sorte: fazes e avanças 3, recusas e recuas 3
    'Canta o refrão de uma música escolhida pelo grupo.',
    'Imita outro jogador até alguém adivinhar quem é.',
    'Faz 10 agachamentos a contar em voz alta.',
    'Conta em 20 segundos a tua história mais “tás em bad”.',
    'Fala só a cantar até à tua próxima jogada.',
    'Dá o teu melhor grito de “pânico!”.',
    'Dança 15 segundos sem música.',
    'Diz 5 sítios de Fátima em 10 segundos.',
    'Faz um elogio sincero a cada jogador, um de cada vez.',
    'Deixa o grupo escolher-te uma alcunha para o resto do jogo.',
    'Faz a tua melhor imitação de um turista perdido no Santuário.',
    'Explica o que é “mandar um barrote” como se fosses professor universitário.',
    'Bate na mesa o ritmo de uma música até alguém adivinhar qual é.',
    'Fala com sotaque do Norte (ou do Alentejo) até à tua próxima jogada.',
  ];
  D.WORDS = {
    mime: ['pescador', 'vulcão', 'peregrino', 'GNR', 'tartaruga', 'surfista', 'rotunda', 'vela', 'padeiro', 'canalizador', 'árbitro', 'dentista', 'bombeiro', 'tufão', 'papagaio', 'ressaca', 'casamento', 'ginásio', 'selfie', 'mosquito', 'multa', 'churrasco', 'karaoke', 'autocarro', 'náufrago', 'coco', 'chuveiro', 'exame', 'entrevista', 'pizza', 'maratona', 'gelado', 'trotinete', 'fotógrafo', 'cabeleireiro', 'astronauta', 'fantasma', 'pinguim', 'eletricista', 'DJ'],
    song: ['Parabéns a Você', 'A Portuguesa (hino nacional)', 'Apita o Comboio', 'Atirei o Pau ao Gato', 'Bacalhau à Portuguesa', 'A Minha Casinha', 'Cheira a Lisboa', 'Uma Casa Portuguesa', 'O Malhão', 'We Will Rock You', 'Macarena', 'Despacito', 'Waka Waka', 'Happy Birthday', 'Jingle Bells', 'We Are the Champions', 'Dancing Queen', 'Gangnam Style', 'Baby Shark', 'Aserejé', 'A Garota de Ipanema', 'Eye of the Tiger', 'Smoke on the Water', 'Hino do Benfica', 'Hino do Sporting', 'Hino do Porto', 'Bella Ciao', 'La Bamba', 'Seven Nation Army', 'Noite Feliz'],
  };

  // ---------- cartas da sorte ----------
  D.LUCK = [
    { a: 'mv', v: 4, t: 'Boleia de Tartaruga', d: 'Uma tartaruga dá-te boleia: avanças 4 casas.' },
    { a: 'mv', v: 2, t: 'Liana', d: 'Agarras uma liana: avanças 2 casas.' },
    { a: 'mv', v: -3, t: 'Maré Cheia', d: 'A maré leva-te: recuas 3 casas.' },
    { a: 'swaplast', t: 'Solidariedade', d: 'Trocas de lugar com o último da ilha.' },
    { a: 'others', v: -2, t: 'Sismo', d: 'A ilha treme: todos os outros na ilha recuam 2 casas.' },
    { a: 'extra', t: 'Dado de Bronze', d: 'No teu próximo lançamento levas um dado de bronze extra (1 a 3).' },
    { a: 'amulet', t: 'Amuleto de Pedra', d: 'Protege-te da próxima Caveira. Depois parte-se.' },
    { a: 'amulet', t: 'Amuleto de Pedra', d: 'Protege-te da próxima Caveira. Depois parte-se.' },
    { a: 'push', v: -3, t: 'Empurrão', d: 'Escolhe um jogador na ilha: ele recua 3 casas.' },
    { a: 'leader', v: -4, t: 'Inveja', d: 'Quem vai à frente na ilha recua 4 casas (mesmo que sejas tu).' },
    { a: 'all', v: 1, t: 'Festa na Praia', d: 'Toda a gente na ilha avança 1 casa.' },
    { a: 'pull', t: 'Corda', d: 'Avanças até à casa do jogador que está logo à tua frente.' },
    { a: 'dare' }, { a: 'dare' }, { a: 'dare' }, { a: 'dare' }, { a: 'dare' }, { a: 'dare' },
  ];

  // ---------- regras ----------
  D.RULES = [
    ['objetivo', '🏆 Objetivo', `<p>Sobe da <b>Praia</b> até ao <b>Cume</b> do vulcão e toca o <b>gongo do templo</b>. O primeiro a consegui-lo ganha e o jogo acaba logo.</p><p>Uma partida dura cerca de 45 a 75 minutos, conforme o azar de cada um.</p>`],
    ['ronda', '🔁 Como é uma ronda', `<ol><li><b>Prova da ronda</b>: todos jogam uma prova (na vida real ou no telemóvel). O resultado decide os dados de cada um.</li><li><b>Jogadas</b>: à vez, cada jogador lança os dados, avança e resolve a casa onde parou.</li></ol><p>Se demorares mais de 1 minuto a lançar, a TV lança por ti.</p>`],
    ['dados', '🎲 Os dados', `<ul><li><b>Dado normal</b> (1 a 6): toda a gente tem um.</li><li><b>Dado de ouro</b> (1 a 6): prémio para quem ganha a prova da ronda. Lanças os dois e somas.</li><li><b>Dado de bronze</b> (1 a 3): prémio de consolação (2.º lugar, equipa vencedora ou carta da sorte).</li></ul><p><b>Prova de todos contra todos</b>: o vencedor leva o dado de ouro.<br><b>1 contra o resto</b>: se o solo ganhar leva o dado de ouro; se perder, cada adversário leva um de bronze.<br><b>Equipas</b>: cada elemento da equipa vencedora leva um de bronze.<br><b>Provas de telemóvel</b>: 1.º lugar ouro, 2.º lugar bronze.</p><p>Os bots não entram nas provas da vida real: lançam uma moeda e, se sair cara, levam um dado de bronze.</p>`],
    ['provas', '🤹 Provas da vida real', `<p>A TV mostra a prova e quem participa. Qualquer jogador toca em <b>Começar</b> (arranca o relógio, se houver) e em <b>Acabou</b> quando terminar.</p><p>Depois <b>todos votam</b> no telemóvel em quem ganhou. Ganha a maioria. Se houver empate, <b>decide o dado</b>.</p><p>Se a prova não der para fazer (falta material, espaço…), toquem em <b>Outra prova</b>. Podem dizer no início se têm um baralho de cartas.</p><p>Tipos: <b>todos contra todos</b>, <b>1 contra o resto</b>, <b>equipas</b> e <b>duelos 1 contra 1</b>.</p>`],
    ['casas', '🗺️ Casas da ilha', () => `<table class="rt">${['+', '-', 'again', 'luck', 'duel', 'storm', 'swap', 'volc', 'skull', 'gate', 'goal'].map(k => `<tr><td><span class="sq" style="background:${D.SPCOL[k]}">${D.SPACE[k][0]}</span></td><td><b>${D.SPACE[k][1]}</b><br>${D.SPACE[k][2]}</td></tr>`).join('')}</table><p>Só a casa onde paras <b>com os dados</b> tem efeito. Se fores empurrado ou puxado para outra casa, não acontece mais nada.</p>`],
    ['guardioes', '🗿 Guardiões', `<p>Há 3 Guardiões no caminho. És <b>obrigado a parar</b> em cada um, mesmo que os dados dessem para mais.</p><p>Na tua vez seguinte fazes o <b>desafio do Guardião</b>: uma prova a solo. O resto do grupo vota 👍 ou 👎 (empate conta como 👍). Se não houver mais ninguém para julgar, decide um dado.</p><ul><li><b>Passas</b>: o Guardião fica vencido para sempre e lanças logo os dados.</li><li><b>Falhas</b>: perdes a vez e tentas outra vez na ronda seguinte.</li><li><b>Guardião da Cratera</b> (o último): se falhares, <b>cais no vulcão</b>.</li></ul><p>Cada Guardião vencido é um ponto de regresso quando sais do vulcão pela gruta.</p>`],
    ['vulcao', '🌋 Dentro do vulcão', () => `<p>Quem cai numa <b>Caveira</b> vai para o fundo do vulcão. Lá dentro há um caminho de ${D.M} casas até à saída, e lanças os dados como na ilha.</p><table class="rt">${['geyser', 'vback', 'exit'].map(k => `<tr><td><span class="sq" style="background:${D.SPCOL[k]}">${D.SPACE[k][0]}</span></td><td><b>${D.SPACE[k][1]}</b><br>${D.SPACE[k][2]}</td></tr>`).join('')}</table><p>Enquanto estás no vulcão, o Tufão, o Papagaio, os Duelos e as cartas não te apanham. O mapa do telemóvel mostra o sítio onde estás: a ilha ou o vulcão.</p>`],
    ['erupcao', '🔥 Erupção', `<p>Quando alguém para numa casa <b>Erupção</b>, o vulcão acorda durante <b>3 rondas</b>. Nessas rondas, todas as casas especiais da ilha (Vento a favor, Trampolim, Sorte, Duelo, Tufão e Papagaio) ficam cobertas de <b>lava</b>: quem lá parar <b>recua 4</b>.</p><p>As Caveiras, os Guardiões e as casas de recuo continuam iguais. Outra erupção reinicia a contagem.</p>`],
    ['cume', '⛩️ O Cume', `<p>Ao chegar ao Cume lanças <b>um dado normal</b> para tocar o gongo:</p><ul><li>1.ª tentativa: precisas de <b>4 ou mais</b>.</li><li>2.ª tentativa: <b>3 ou mais</b>.</li><li>A partir da 3.ª: <b>2 ou mais</b>.</li></ul><p>Se falhares, ficas no Cume e tentas outra vez na tua próxima vez. Cuidado com o Tufão e os Empurrões enquanto esperas!</p>`],
    ['sorte', '🃏 Cartas da Sorte e prendas', `<p>As cartas podem dar-te casas, amuletos e dados, ou tirar casas aos outros.</p><p>Algumas são <b>prendas</b>: um pequeno desafio. Se o fizeres, <b>avanças 3</b>. Se recusares, <b>recuas 3</b>. O grupo é a testemunha.</p><p>O <b>Amuleto de Pedra</b> salva-te de uma Caveira (uma vez).</p>`],
    ['bots', '🤖 Bots e imprevistos', `<p>No início podes juntar <b>bots</b> para completar a mesa. Jogam sozinhos e participam nas provas de telemóvel.</p><p>Se um telemóvel se desligar, volta a abrir o link e escolhe o teu nome para <b>retomar o lugar</b>. Na TV, toca no nome de um jogador para jogar por ele no ecrã ou pôr um bot no lugar dele.</p><p>Se o jogo ficar à espera de alguém, a TV tem o botão <b>⏭ Avançar</b>.</p>`],
  ];
  D.rulesHtml = open => D.RULES.map(([k, t, b]) => `<details class="rule" id="r-${k}" ${open && open.includes(k) ? 'open' : ''}><summary>${t}</summary><div>${typeof b === 'function' ? b() : b}</div></details>`).join('');

  G.DATA = D;
  if (typeof module !== 'undefined') module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
