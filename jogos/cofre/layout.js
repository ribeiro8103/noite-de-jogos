/* O Cofre de São Segredo — planta da vila (partilhada pelo Blender, pelo motor e pelo mapa 2D) */
(function (root) {
  const R = 7, ST = 3.5;
  const nodes = []; // {id, x, z, name?}
  const edges = [];
  const add = (x, z, name) => { const id = nodes.length; nodes.push({ id, x: +x.toFixed(2), z: +z.toFixed(2), name: name || null }); return id; };
  const link = (a, b) => edges.push([a, b]);
  const chain = (ids) => { for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]); };

  // Anel à volta da praça (0 = este, sentido horário com z para sul)
  const ring = [];
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; ring.push(add(R * Math.cos(a), R * Math.sin(a))); }
  chain(ring); link(ring[7], ring[0]);
  const PARTIDA = ring[2]; nodes[PARTIDA].name = 'Partida';

  // Rua do Porto (z = 14) e Rua do Alto (z = -14)
  const xs = []; for (let x = -24.5; x <= 24.51; x += ST) xs.push(x);
  const harbor = xs.map((x) => add(x, 14)); chain(harbor);
  const alto = xs.map((x) => add(x, -14)); chain(alto);
  const mid = xs.indexOf(0);
  const s1 = add(0, 10.5); link(ring[2], s1); link(s1, harbor[mid]);
  const n1 = add(0, -10.5); link(ring[6], n1); link(n1, alto[mid]);
  nodes[harbor[mid]].name = 'Paragem do Porto';

  // Estradas laterais (x = ±24.5) e rua transversal (z = 0)
  const zs = [-10.5, -7, -3.5, 0, 3.5, 7, 10.5];
  const west = zs.map((z) => add(-24.5, z)); chain([alto[0], ...west, harbor[0]]);
  const east = zs.map((z) => add(24.5, z)); chain([alto[xs.length - 1], ...east, harbor[xs.length - 1]]);
  const crossW = [-10.5, -14, -17.5, -21].map((x) => add(x, 0)); chain([ring[4], ...crossW, west[3]]);
  const crossE = [10.5, 14, 17.5, 21].map((x) => add(x, 0)); chain([ring[0], ...crossE, east[3]]);

  const hx = (x) => harbor[xs.indexOf(x)], ax = (x) => alto[xs.indexOf(x)];
  const cw = (x) => crossW[[-10.5, -14, -17.5, -21].indexOf(x)], ce = (x) => crossE[[10.5, 14, 17.5, 21].indexOf(x)];
  const wz = (z) => west[zs.indexOf(z)], ez = (z) => east[zs.indexOf(z)];
  const diag = (k, r = 9.8) => { const a = (k * Math.PI) / 4; return [r * Math.cos(a), r * Math.sin(a)]; };

  // Edifícios: kind = modelo 3D; type = praca | public | biz | house
  const B = [];
  const bld = (id, name, kind, type, x, z, door, extra) => B.push(Object.assign({ id, name, kind, type, x: +x.toFixed(2), z: +z.toFixed(2), door }, extra || {}));
  // Centro
  bld('praca', 'Praça do Cofre', 'praca', 'praca', 0, 0, PARTIDA, { doors: ring.slice() });
  bld('igreja', 'Igreja', 'igreja', 'public', ...diag(5), ring[5]);
  bld('cartorio', 'Cartório', 'cartorio', 'public', ...diag(7), ring[7]);
  bld('cafe', 'Café Central', 'cafe', 'biz', ...diag(1), ring[1], { price: 140 });
  bld('farmacia', 'Farmácia', 'farmacia', 'biz', ...diag(3), ring[3], { price: 130 });
  bld('biblioteca', 'Biblioteca', 'biblioteca', 'public', 14, -4, ce(14));
  bld('pensao', 'Pensão', 'pensao', 'biz', 17.5, 4, ce(17.5), { price: 120 });
  bld('correios', 'Correios', 'correios', 'biz', -14, -4, cw(-14), { price: 150 });
  bld('barbearia', 'Barbearia', 'barbearia', 'biz', -17.5, 4, cw(-17.5), { price: 110 });
  // Porto
  bld('taberna', 'Taberna', 'taberna', 'biz', -3.5, 10.9, hx(-3.5), { price: 100 });
  bld('mercado', 'Mercado', 'mercado', 'biz', 10.5, 10.9, hx(10.5), { price: 110 });
  bld('lota', 'Lota', 'lota', 'public', -7, 17.8, hx(-7));
  bld('estaleiro', 'Estaleiro', 'estaleiro', 'biz', -17.5, 17.8, hx(-17.5), { price: 90 });
  bld('armazem', 'Armazém', 'armazem', 'biz', 7, 17.8, hx(7), { price: 80 });
  bld('farol', 'Farol', 'farol', 'public', 28.5, 18.5, hx(24.5));
  // Alto
  bld('solar', 'Solar do Comendador', 'solar', 'public', 0, -18.6, ax(0));
  bld('estacao', 'Estação', 'estacao', 'public', 14, -17.8, ax(14));
  bld('cemiterio', 'Cemitério', 'cemiterio', 'public', -17.5, -18.2, ax(-17.5));
  bld('hotel', 'Hotel', 'hotel', 'biz', 21, -17.8, ax(21), { price: 120 });
  bld('adega', 'Adega', 'adega', 'biz', -14, -10.9, ax(-14), { price: 100 });
  bld('gnr', 'Posto da GNR', 'gnr', 'public', -7, -10.9, ax(-7));
  bld('padaria', 'Padaria', 'padaria', 'biz', 7, -10.9, ax(7), { price: 90 });
  // Casas (14): por bairro
  const houses = [
    ['h_a1', -21, -10.9, ax(-21), 'alto'], ['h_a2', 14, -10.9, ax(14), 'alto'], ['h_a3', -7, -17.6, ax(-7), 'alto'], ['h_a4', -28, -7, wz(-7), 'alto'],
    ['h_p1', -21, 10.9, hx(-21), 'porto'], ['h_p2', -14, 10.9, hx(-14), 'porto'], ['h_p3', 3.5, 10.9, hx(3.5), 'porto'], ['h_p4', -28, 7, wz(7), 'porto'], ['h_p5', 28, 7, ez(7), 'porto'],
    ['h_c1', -21, -4, cw(-21), 'centro'], ['h_c2', -10.5, 4, cw(-10.5), 'centro'], ['h_c3', 21, -4, ce(21), 'centro'], ['h_c4', 10.5, 4, ce(10.5), 'centro'], ['h_c5', -28, 0, wz(0), 'centro'],
  ];
  houses.forEach(([id, x, z, door, bairro], i) => bld(id, 'Casa', 'casa', 'house', x, z, door, { bairro, variant: i % 4 }));

  const bairroOf = (z) => (z < -5 ? 'alto' : z > 5 ? 'porto' : 'centro');
  B.forEach((b) => { if (!b.bairro) b.bairro = b.id === 'praca' ? 'centro' : bairroOf(b.z); });
  nodes.forEach((n) => { n.bairro = bairroOf(n.z); });

  const L = { nodes, edges, buildings: B, PARTIDA, PARAGENS: { estacao: 'b:estacao', porto: 'n' + harbor[mid], centro: 'n' + PARTIDA }, BAIRROS: { centro: 'Centro', porto: 'Porto de Pesca', alto: 'Alto' } };
  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.LAYOUT = L;
})(typeof window !== 'undefined' ? window : globalThis);
