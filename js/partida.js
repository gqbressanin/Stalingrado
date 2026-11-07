/*
 * partida.js — O "JUIZ" DO JOGO
 *
 * Aqui fica toda a lógica de uma partida, sem nada de visual. Os dois modos
 * usam exatamente este mesmo código; a única diferença é que o modo
 * 'celular' não tem lista de jogadores.
 *
 * A partida sempre está em uma destas fases:
 *   'aguardando' → esperando alguém retirar uma carta
 *   'escolhendo' → carta vermelha A, 2 ou 3: falta escolher quem cumpre (só modo 'todos')
 *   'resolvida'  → regra mostrada, esperando o botão PASSAR CELULAR / PRÓXIMA CARTA
 *   'esgotado'   → o baralho normal acabou e o Armageddon não foi ativado
 *   'fim'        → o Coringa saiu; ninguém retira mais nada
 */

/* modo: 'celular' (passar o celular) ou 'todos' (um celular para todos) */
function criarPartida(modo, jogadores = []) {
  if (modo === 'todos' && jogadores.length < 2) {
    throw new Error('São necessários pelo menos dois jogadores.');
  }
  return {
    modo,
    jogadores: [...jogadores],
    turno: 0, // posição, na lista de jogadores, de quem está retirando
    monte: embaralhar(criarBaralhoNormal()),
    retiradas: [], // histórico, da mais antiga para a mais recente
    armageddon: false,
    fase: 'aguardando',
  };
}

function jogadorAtual(partida) {
  return partida.modo === 'todos' ? partida.jogadores[partida.turno] : null;
}

/*
 * A lista de jogadores segue o sentido horário ao redor da mesa. Assim, o
 * próximo da lista é quem está à ESQUERDA de quem retirou, e o anterior é
 * quem está à DIREITA.
 */
function jogadorEsquerda(partida) {
  const total = partida.jogadores.length;
  return partida.jogadores[(partida.turno + 1) % total];
}

function jogadorDireita(partida) {
  const total = partida.jogadores.length;
  return partida.jogadores[(partida.turno - 1 + total) % total];
}

/* Todos menos quem retirou: é a lista da escolha nas cartas vermelhas. */
function jogadoresParaEscolher(partida) {
  return partida.jogadores.filter((_, posicao) => posicao !== partida.turno);
}

/*
 * Lê a tabela REGRAS e descobre o que a carta manda fazer agora.
 * No Armageddon, nenhuma carta tem regra: só o Coringa importa.
 * Devolve { alvo, medida, descricao, semRegra, escolha, cumpre }:
 *   escolha → true quando quem retirou precisa escolher outra pessoa
 *   cumpre  → lista com os nomes de quem cumpre (vazia no modo 'celular')
 */
function resolverCarta(partida, carta) {
  if (partida.armageddon) {
    return { alvo: null, medida: null, descricao: null, semRegra: true, escolha: false, cumpre: [] };
  }

  const regra = REGRAS[carta.valor];

  let alvo = regra.alvo;
  let escolha = false;
  if (alvo === 'naipe') {
    escolha = NAIPES[carta.naipe].cor === 'vermelha';
    alvo = escolha ? 'escolhido' : 'quemRetirou';
  }

  let cumpre = [];
  if (partida.modo === 'todos') {
    if (alvo === 'quemRetirou') cumpre = [jogadorAtual(partida)];
    if (alvo === 'esquerda') cumpre = [jogadorEsquerda(partida)];
    if (alvo === 'direita') cumpre = [jogadorDireita(partida)];
    if (alvo === 'todos') cumpre = [...partida.jogadores];
  }

  return {
    alvo,
    medida: regra.medida || null,
    descricao: regra.descricao || null,
    semRegra: false,
    escolha,
    cumpre,
  };
}

/* Transforma o resultado em uma frase para a tela e para o histórico. */
function textoDaRegra(resultado, modo) {
  const { alvo, medida, descricao, semRegra, cumpre } = resultado;
  if (semRegra) return 'Escapou!';
  if (descricao) return descricao;

  if (alvo === 'todos') return `Todos bebem ${medida}`;

  if (modo === 'celular') {
    if (alvo === 'quemRetirou') return `Você bebe por ${medida}`;
    if (alvo === 'escolhido') return `Escolha outra pessoa para beber por ${medida}`;
    if (alvo === 'esquerda') return `A pessoa à sua esquerda bebe por ${medida}`;
    if (alvo === 'direita') return `A pessoa à sua direita bebe por ${medida}`;
  }

  if (cumpre.length === 0) return `Escolha quem bebe por ${medida}`;
  return `${cumpre[0]} bebe por ${medida}`;
}

/* Retira a carta do topo. Devolve a entrada do histórico, ou null se não puder. */
function retirarCarta(partida) {
  if (partida.fase !== 'aguardando' || partida.monte.length === 0) return null;

  const carta = partida.monte.pop();
  const entrada = {
    carta,
    jogador: jogadorAtual(partida),
    coringa: carta.id === CORINGA.id,
    resultado: null,
    regra: '',
  };
  partida.retiradas.push(entrada);

  if (entrada.coringa) {
    entrada.regra = 'Você matou a garrafa!';
    partida.fase = 'fim';
    return entrada;
  }

  entrada.resultado = resolverCarta(partida, carta);
  entrada.regra = textoDaRegra(entrada.resultado, partida.modo);
  const precisaEscolher = entrada.resultado.escolha && partida.modo === 'todos';
  partida.fase = precisaEscolher ? 'escolhendo' : 'resolvida';
  return entrada;
}

/* Carta vermelha A, 2 ou 3 no modo 'todos': registra a pessoa escolhida. */
function escolherJogador(partida, nome) {
  if (partida.fase !== 'escolhendo') return false;
  if (!jogadoresParaEscolher(partida).includes(nome)) return false;

  const entrada = partida.retiradas[partida.retiradas.length - 1];
  entrada.resultado.cumpre = [nome];
  entrada.regra = textoDaRegra(entrada.resultado, partida.modo);
  partida.fase = 'resolvida';
  return true;
}

/* Botão PASSAR CELULAR / PRÓXIMA CARTA. */
function proximaCarta(partida) {
  if (partida.fase !== 'resolvida') return false;
  if (partida.modo === 'todos') {
    partida.turno = (partida.turno + 1) % partida.jogadores.length;
  }
  partida.fase = partida.monte.length > 0 ? 'aguardando' : 'esgotado';
  return true;
}

/*
 * ARMAGEDDON: monta o conjunto completo, tira tudo o que já saiu, e embaralha.
 * A partida não recomeça: histórico, turno e jogadores continuam iguais.
 * A partir daqui as cartas não têm regra; a partida só termina no Coringa.
 * Só pode ser ativado entre uma carta e outra, e não pode ser desfeito.
 */
function ativarArmageddon(partida) {
  if (partida.armageddon) return false;
  if (partida.fase !== 'aguardando' && partida.fase !== 'esgotado') return false;

  const jaSairam = new Set(partida.retiradas.map((entrada) => entrada.carta.id));
  const restantes = criarBaralhoArmageddon().filter((carta) => !jaSairam.has(carta.id));

  partida.monte = embaralhar(restantes);
  partida.armageddon = true;
  partida.fase = 'aguardando';
  return true;
}
