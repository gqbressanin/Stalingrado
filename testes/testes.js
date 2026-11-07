/*
 * testes.js — CONFERE AS REGRAS AUTOMATICAMENTE
 *
 * Como rodar (dentro da pasta Stalingrado):  node testes/testes.js
 * Ele simula centenas de partidas sem precisar abrir o jogo.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Carrega os mesmos arquivos que o navegador usa, na mesma ordem.
const pasta = path.join(__dirname, '..', 'js');
const codigo = ['regras.js', 'baralho.js', 'partida.js']
  .map((nome) => fs.readFileSync(path.join(pasta, nome), 'utf8'))
  .join('\n');
const expor = `({ REGRAS, NAIPES, CORINGA, criarBaralhoNormal, criarBaralhoArmageddon, embaralhar,
  criarPartida, jogadorAtual, jogadorEsquerda, jogadorDireita, jogadoresParaEscolher,
  retirarCarta, escolherJogador, proximaCarta, ativarArmageddon })`;
const jogo = vm.runInNewContext(`${codigo}\n${expor}`, { Math });

let aprovados = 0;
function teste(nome, funcao) {
  try {
    funcao();
    aprovados++;
    console.log(`  ok    ${nome}`);
  } catch (erro) {
    console.error(`  FALHOU ${nome}\n        ${erro.message}`);
    process.exitCode = 1;
  }
}

const NOMES = ['Ana', 'Beto', 'Caio', 'Duda'];

/* Coloca uma carta específica no topo do monte. */
function forcarTopo(partida, id) {
  const posicao = partida.monte.findIndex((carta) => carta.id === id);
  assert(posicao >= 0, `carta ${id} não está no monte`);
  const [carta] = partida.monte.splice(posicao, 1);
  partida.monte.push(carta);
}

function retirar(partida, id) {
  forcarTopo(partida, id);
  return jogo.retirarCarta(partida);
}

/* Avança uma carta inteira, resolvendo a escolha quando existir. */
function jogarUmaCarta(partida) {
  const entrada = jogo.retirarCarta(partida);
  if (partida.fase === 'escolhendo') {
    jogo.escolherJogador(partida, jogo.jogadoresParaEscolher(partida)[0]);
  }
  if (partida.fase === 'resolvida') jogo.proximaCarta(partida);
  return entrada;
}

console.log('\nBARALHO');

teste('normal: 48 cartas, só A 2 3 Q J K, 4 naipes, 2 cópias, sem Coringa', () => {
  const cartas = jogo.criarBaralhoNormal();
  assert.strictEqual(cartas.length, 48);
  assert(!cartas.some((carta) => carta.id === 'CORINGA'));
  assert.deepStrictEqual([...new Set(cartas.map((c) => c.valor))].sort(), ['2', '3', 'A', 'J', 'K', 'Q']);
  for (const valor of ['A', '2', '3', 'Q', 'J', 'K']) {
    for (const naipe of Object.keys(jogo.NAIPES)) {
      assert.strictEqual(cartas.filter((c) => c.valor === valor && c.naipe === naipe).length, 2);
    }
  }
});

teste('Armageddon: 105 cartas, todos os 13 valores e exatamente 1 Coringa', () => {
  const cartas = jogo.criarBaralhoArmageddon();
  assert.strictEqual(cartas.length, 105);
  assert.strictEqual(cartas.filter((c) => c.id === 'CORINGA').length, 1);
  assert.strictEqual(new Set(cartas.map((c) => c.valor)).size, 14); // 13 valores + Coringa
});

teste('todo id é único, inclusive entre as duas cópias', () => {
  for (const cartas of [jogo.criarBaralhoNormal(), jogo.criarBaralhoArmageddon()]) {
    assert.strictEqual(new Set(cartas.map((c) => c.id)).size, cartas.length);
  }
});

teste('toda carta normal também existe no conjunto do Armageddon', () => {
  const completos = new Set(jogo.criarBaralhoArmageddon().map((c) => c.id));
  assert(jogo.criarBaralhoNormal().every((c) => completos.has(c.id)));
});

teste('embaralhar não perde nem duplica cartas, e muda a ordem', () => {
  const original = jogo.criarBaralhoArmageddon();
  const misturado = jogo.embaralhar(original);
  assert.strictEqual(misturado.length, original.length);
  assert.deepStrictEqual(misturado.map((c) => c.id).sort(), original.map((c) => c.id).sort());
  assert.notDeepStrictEqual(misturado.map((c) => c.id), original.map((c) => c.id));
});

console.log('\nREGRAS');

teste('A, 2 e 3 pretos: quem retirou cumpre, sem escolha', () => {
  const casos = [['A', '1 segundo'], ['2', '2 segundos'], ['3', '3 segundos']];
  for (const [valor, medida] of casos) {
    for (const naipe of ['paus', 'espadas']) {
      const partida = jogo.criarPartida('todos', NOMES);
      const entrada = retirar(partida, `${valor}-${naipe}-1`);
      assert.deepStrictEqual([...entrada.resultado.cumpre], ['Ana']);
      assert.strictEqual(entrada.resultado.medida, medida);
      assert.strictEqual(partida.fase, 'resolvida');
    }
  }
});

teste('A, 2 e 3 vermelhos: exige escolher outra pessoa', () => {
  for (const valor of ['A', '2', '3']) {
    for (const naipe of ['copas', 'ouros']) {
      const partida = jogo.criarPartida('todos', NOMES);
      retirar(partida, `${valor}-${naipe}-2`);
      assert.strictEqual(partida.fase, 'escolhendo');
      assert.strictEqual(jogo.proximaCarta(partida), false, 'não pode avançar antes de escolher');
      assert.deepStrictEqual([...jogo.jogadoresParaEscolher(partida)], ['Beto', 'Caio', 'Duda']);
    }
  }
});

teste('carta vermelha não aceita escolher a si mesmo nem nome desconhecido', () => {
  const partida = jogo.criarPartida('todos', NOMES);
  retirar(partida, 'A-copas-1');
  assert.strictEqual(jogo.escolherJogador(partida, 'Ana'), false);
  assert.strictEqual(jogo.escolherJogador(partida, 'Zé'), false);
  assert.strictEqual(jogo.escolherJogador(partida, 'Caio'), true);
  assert.strictEqual(partida.retiradas[0].regra, 'Caio bebe por 1 segundo');
  assert.strictEqual(partida.fase, 'resolvida');
});

teste('Q: pessoa à esquerda (próxima da lista), ignorando o naipe', () => {
  for (const naipe of Object.keys(jogo.NAIPES)) {
    const partida = jogo.criarPartida('todos', NOMES);
    const entrada = retirar(partida, `Q-${naipe}-1`);
    assert.deepStrictEqual([...entrada.resultado.cumpre], ['Beto']);
    assert.strictEqual(entrada.resultado.medida, '1 segundo');
    assert.strictEqual(partida.fase, 'resolvida');
  }
});

teste('K: pessoa à direita (anterior da lista), com a volta circular', () => {
  for (const naipe of Object.keys(jogo.NAIPES)) {
    const partida = jogo.criarPartida('todos', NOMES);
    const entrada = retirar(partida, `K-${naipe}-1`);
    assert.deepStrictEqual([...entrada.resultado.cumpre], ['Duda']);
    assert.strictEqual(partida.fase, 'resolvida');
  }
});

teste('Q no último da lista volta para o primeiro', () => {
  const partida = jogo.criarPartida('todos', NOMES);
  partida.turno = 3;
  const entrada = retirar(partida, 'Q-paus-1');
  assert.deepStrictEqual([...entrada.resultado.cumpre], ['Ana']);
});

teste('J: identifica todos, 1 shot, ignorando o naipe', () => {
  for (const naipe of Object.keys(jogo.NAIPES)) {
    const partida = jogo.criarPartida('todos', NOMES);
    const entrada = retirar(partida, `J-${naipe}-1`);
    assert.deepStrictEqual([...entrada.resultado.cumpre], NOMES);
    assert.strictEqual(entrada.regra, 'Todos bebem 1 shot');
  }
});

teste('modo passar o celular: frases sem nomes e sem etapa de escolha', () => {
  const casos = [
    ['A-paus-1', 'Você bebe por 1 segundo'],
    ['3-espadas-1', 'Você bebe por 3 segundos'],
    ['2-copas-1', 'Escolha outra pessoa para beber por 2 segundos'],
    ['Q-ouros-1', 'A pessoa à sua esquerda bebe por 1 segundo'],
    ['K-paus-1', 'A pessoa à sua direita bebe por 1 segundo'],
    ['J-copas-1', 'Todos bebem 1 shot'],
  ];
  for (const [id, frase] of casos) {
    const partida = jogo.criarPartida('celular');
    const entrada = retirar(partida, id);
    assert.strictEqual(entrada.regra, frase);
    assert.strictEqual(entrada.jogador, null);
    assert.strictEqual(partida.fase, 'resolvida');
  }
});

console.log('\nTURNOS');

teste('exige pelo menos dois jogadores no modo com cadastro', () => {
  assert.throws(() => jogo.criarPartida('todos', ['Ana']));
  assert.throws(() => jogo.criarPartida('todos', []));
});

teste('ordem circular: volta ao primeiro depois do último', () => {
  const partida = jogo.criarPartida('todos', ['Ana', 'Beto', 'Caio']);
  const vistos = [];
  for (let i = 0; i < 7; i++) {
    vistos.push(jogo.jogadorAtual(partida));
    jogarUmaCarta(partida);
  }
  assert.deepStrictEqual(vistos, ['Ana', 'Beto', 'Caio', 'Ana', 'Beto', 'Caio', 'Ana']);
});

teste('dois jogadores: esquerda e direita são a mesma pessoa', () => {
  const partida = jogo.criarPartida('todos', ['Ana', 'Beto']);
  assert.strictEqual(jogo.jogadorEsquerda(partida), 'Beto');
  assert.strictEqual(jogo.jogadorDireita(partida), 'Beto');
});

teste('não retira carta nova antes de resolver a atual', () => {
  const partida = jogo.criarPartida('todos', NOMES);
  retirar(partida, 'A-copas-1');
  assert.strictEqual(jogo.retirarCarta(partida), null);
  jogo.escolherJogador(partida, 'Beto');
  assert.strictEqual(jogo.retirarCarta(partida), null);
  assert.strictEqual(partida.retiradas.length, 1);
});

teste('partida normal completa: 48 cartas sem repetir e sem Coringa', () => {
  for (const modo of ['celular', 'todos']) {
    const partida = jogo.criarPartida(modo, modo === 'todos' ? NOMES : []);
    while (partida.fase === 'aguardando') jogarUmaCarta(partida);
    const ids = partida.retiradas.map((e) => e.carta.id);
    assert.strictEqual(ids.length, 48);
    assert.strictEqual(new Set(ids).size, 48);
    assert(!ids.includes('CORINGA'));
    assert.strictEqual(partida.fase, 'esgotado');
    assert.strictEqual(jogo.retirarCarta(partida), null);
  }
});

console.log('\nARMAGEDDON');

teste('ativado no início: 105 cartas', () => {
  const partida = jogo.criarPartida('celular');
  assert.strictEqual(jogo.ativarArmageddon(partida), true);
  assert.strictEqual(partida.monte.length, 105);
});

teste('preserva histórico, turno e remove exatamente o que já saiu', () => {
  for (let saidas = 0; saidas <= 48; saidas += 6) {
    const partida = jogo.criarPartida('todos', NOMES);
    for (let i = 0; i < saidas; i++) jogarUmaCarta(partida);
    const historico = partida.retiradas.map((e) => e.carta.id);
    const turno = partida.turno;

    assert.strictEqual(jogo.ativarArmageddon(partida), true);

    assert.strictEqual(partida.monte.length, 105 - saidas);
    assert.deepStrictEqual(partida.retiradas.map((e) => e.carta.id), historico);
    assert.strictEqual(partida.turno, turno);
    assert.strictEqual(partida.monte.filter((c) => c.id === 'CORINGA').length, 1);
    assert(!partida.monte.some((c) => historico.includes(c.id)));
    assert.strictEqual(new Set(partida.monte.map((c) => c.id)).size, partida.monte.length);
  }
});

teste('cópia ainda não retirada continua disponível; a retirada, não', () => {
  const partida = jogo.criarPartida('todos', NOMES);
  retirar(partida, 'A-copas-1');
  jogo.escolherJogador(partida, 'Beto');
  jogo.proximaCarta(partida);
  jogo.ativarArmageddon(partida);
  const ids = partida.monte.map((c) => c.id);
  assert(!ids.includes('A-copas-1'));
  assert(ids.includes('A-copas-2'));
});

teste('não ativa duas vezes e não pode ser desativado', () => {
  const partida = jogo.criarPartida('celular');
  jogo.ativarArmageddon(partida);
  const tamanho = partida.monte.length;
  assert.strictEqual(jogo.ativarArmageddon(partida), false);
  assert.strictEqual(partida.monte.length, tamanho);
  assert.strictEqual(partida.armageddon, true);
});

teste('não ativa com uma carta aberta na tela', () => {
  const partida = jogo.criarPartida('todos', NOMES);
  retirar(partida, 'A-copas-1');
  assert.strictEqual(jogo.ativarArmageddon(partida), false);
  jogo.escolherJogador(partida, 'Beto');
  assert.strictEqual(jogo.ativarArmageddon(partida), false);
  assert.strictEqual(partida.armageddon, false);
});

teste('ativa depois de o baralho normal acabar', () => {
  const partida = jogo.criarPartida('celular');
  while (partida.fase === 'aguardando') jogarUmaCarta(partida);
  assert.strictEqual(partida.fase, 'esgotado');
  assert.strictEqual(jogo.ativarArmageddon(partida), true);
  assert.strictEqual(partida.fase, 'aguardando');
  assert.strictEqual(partida.monte.length, 57);
});

teste('cartas 4 a 10 só aparecem no Armageddon', () => {
  const partida = jogo.criarPartida('todos', NOMES);
  assert(!partida.monte.some((c) => ['4', '5', '6', '7', '8', '9', '10'].includes(c.valor)));
  jogo.ativarArmageddon(partida);
  assert(partida.monte.some((c) => c.valor === '7'));
});

teste('no Armageddon nenhuma carta tem regra, nem escolha, nos dois modos', () => {
  const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  for (const modo of ['celular', 'todos']) {
    for (const valor of valores) {
      for (const naipe of ['copas', 'espadas']) {
        const partida = jogo.criarPartida(modo, modo === 'todos' ? NOMES : []);
        jogo.ativarArmageddon(partida);
        const entrada = retirar(partida, `${valor}-${naipe}-1`);
        assert.strictEqual(entrada.resultado.semRegra, true);
        assert.strictEqual(entrada.regra, 'Escapou!');
        assert.strictEqual(entrada.resultado.cumpre.length, 0);
        assert.strictEqual(partida.fase, 'resolvida');
        assert.strictEqual(jogo.proximaCarta(partida), true);
      }
    }
  }
});

teste('cartas retiradas antes do Armageddon mantêm a regra no histórico', () => {
  const partida = jogo.criarPartida('todos', NOMES);
  retirar(partida, 'J-paus-1');
  jogo.proximaCarta(partida);
  jogo.ativarArmageddon(partida);
  assert.strictEqual(partida.retiradas[0].regra, 'Todos bebem 1 shot');
});

console.log('\nCORINGA');

teste('encerra a partida e impede novas retiradas', () => {
  for (const modo of ['celular', 'todos']) {
    const partida = jogo.criarPartida(modo, modo === 'todos' ? NOMES : []);
    jogo.ativarArmageddon(partida);
    const entrada = retirar(partida, 'CORINGA');
    assert.strictEqual(entrada.coringa, true);
    assert.strictEqual(partida.fase, 'fim');
    assert.strictEqual(jogo.retirarCarta(partida), null);
    assert.strictEqual(jogo.proximaCarta(partida), false);
    assert.strictEqual(jogo.ativarArmageddon(partida), false);
  }
});

teste('guarda quem retirou no modo com cadastro, e ninguém no outro modo', () => {
  const comNomes = jogo.criarPartida('todos', NOMES);
  comNomes.turno = 2;
  jogo.ativarArmageddon(comNomes);
  assert.strictEqual(retirar(comNomes, 'CORINGA').jogador, 'Caio');

  const semNomes = jogo.criarPartida('celular');
  jogo.ativarArmageddon(semNomes);
  assert.strictEqual(retirar(semNomes, 'CORINGA').jogador, null);
});

teste('500 partidas com Armageddon em ponto aleatório: nunca repete carta', () => {
  for (let rodada = 0; rodada < 500; rodada++) {
    const modo = rodada % 2 ? 'celular' : 'todos';
    const partida = jogo.criarPartida(modo, modo === 'todos' ? NOMES : []);
    const ativarEm = Math.floor(Math.random() * 49);
    for (let i = 0; i < ativarEm; i++) jogarUmaCarta(partida);
    jogo.ativarArmageddon(partida);
    while (partida.fase === 'aguardando') jogarUmaCarta(partida);

    const ids = partida.retiradas.map((e) => e.carta.id);
    assert.strictEqual(partida.fase, 'fim', 'toda partida com Armageddon termina no Coringa');
    assert.strictEqual(new Set(ids).size, ids.length);
    assert.strictEqual(ids.filter((id) => id === 'CORINGA').length, 1);
    assert.strictEqual(ids[ids.length - 1], 'CORINGA');
  }
});

console.log(`\n${aprovados} testes aprovados${process.exitCode ? ', COM FALHAS' : ''}.\n`);
