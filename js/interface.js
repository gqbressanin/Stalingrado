/*
 * interface.js — LIGA A TELA À LÓGICA
 *
 * Responde aos toques e mostra na tela o estado da partida.
 * Quem decide as regras é o partida.js; aqui só se pergunta e se exibe.
 *
 * Tudo fica em variáveis comuns, na memória da página. Por isso, atualizar ou
 * fechar a página perde a partida, como foi pedido.
 */
const buscar = (id) => document.getElementById(id);

let modoEscolhido = 'celular';
let jogadores = [];
let partida = null;
let ocupado = false; // true enquanto uma animação roda, para ignorar toques

/* ---------- Navegação entre telas ---------- */

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach((tela) => {
    tela.classList.toggle('ativa', tela.id === id);
  });
}

function voltarAoInicio() {
  partida = null;
  ocupado = false;
  document.body.classList.remove('armageddon');
  buscar('cena-coringa').hidden = true;
  buscar('revelacao').hidden = true;
  buscar('palco').replaceChildren();
  buscar('historico').hidden = true;
  buscar('dialogo').hidden = true;
  mostrarTela('tela-inicio');
}

/* ---------- Tela inicial ---------- */

document.querySelectorAll('.modo').forEach((botao) => {
  botao.addEventListener('click', () => {
    modoEscolhido = botao.dataset.modo;
    document.querySelectorAll('.modo').forEach((outro) => {
      const selecionado = outro === botao;
      outro.classList.toggle('selecionado', selecionado);
      outro.setAttribute('aria-pressed', selecionado);
    });
  });
});

buscar('btn-iniciar').addEventListener('click', () => {
  if (modoEscolhido === 'celular') {
    iniciarPartida();
  } else {
    desenharJogadores();
    mostrarTela('tela-jogadores');
  }
});

/* ---------- Cadastro de jogadores ---------- */

function avisar(mensagem) {
  const aviso = buscar('aviso-nome');
  aviso.textContent = mensagem;
  aviso.hidden = !mensagem;
}

function botaoJogador(texto, rotulo, classe, desativado, aoTocar) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.textContent = texto;
  botao.setAttribute('aria-label', rotulo);
  botao.className = classe;
  botao.disabled = desativado;
  botao.addEventListener('click', aoTocar);
  return botao;
}

function moverJogador(posicao, direcao) {
  const destino = posicao + direcao;
  [jogadores[posicao], jogadores[destino]] = [jogadores[destino], jogadores[posicao]];
  desenharJogadores();
}

function desenharJogadores() {
  const lista = buscar('lista-jogadores');
  lista.replaceChildren();

  jogadores.forEach((nome, posicao) => {
    const item = document.createElement('li');
    item.className = 'jogador';

    const numero = document.createElement('span');
    numero.className = 'jogador-posicao';
    numero.textContent = posicao + 1;

    const texto = document.createElement('span');
    texto.className = 'jogador-nome';
    texto.textContent = nome;

    item.append(
      numero,
      texto,
      botaoJogador('▲', `Subir ${nome}`, '', posicao === 0, () => moverJogador(posicao, -1)),
      botaoJogador('▼', `Descer ${nome}`, '', posicao === jogadores.length - 1, () => moverJogador(posicao, 1)),
      botaoJogador('✕', `Remover ${nome}`, 'remover', false, () => {
        jogadores.splice(posicao, 1);
        desenharJogadores();
      }),
    );
    lista.append(item);
  });

  buscar('btn-comecar').disabled = jogadores.length < 2;
}

buscar('form-jogador').addEventListener('submit', (evento) => {
  evento.preventDefault(); // impede a página de recarregar
  const campo = buscar('campo-nome');
  const nome = campo.value.trim();
  if (!nome) return;

  const repetido = jogadores.some((outro) => outro.toLowerCase() === nome.toLowerCase());
  if (repetido) {
    avisar('Esse nome já está na lista.');
    return;
  }

  avisar('');
  jogadores.push(nome);
  campo.value = '';
  desenharJogadores();
  buscar('lista-jogadores').lastElementChild.scrollIntoView({ block: 'nearest' });
});

buscar('btn-voltar').addEventListener('click', () => mostrarTela('tela-inicio'));
buscar('btn-comecar').addEventListener('click', () => iniciarPartida());

/* ---------- Mesa ---------- */

function iniciarPartida() {
  partida = criarPartida(modoEscolhido, modoEscolhido === 'todos' ? jogadores : []);
  ocupado = false;
  buscar('revelacao').classList.toggle('sobre-mesa', partida.modo === 'celular');
  mostrarTela('tela-partida');
  atualizarMesa();
}

function atualizarTurno() {
  const nome = jogadorAtual(partida);
  const rotulo = buscar('turno-rotulo');
  const campoNome = buscar('turno-nome');

  if (nome) {
    rotulo.textContent = 'Vez de';
    campoNome.textContent = nome;
    buscar('turno-esquerda').textContent = `◄ Esquerda: ${jogadorEsquerda(partida)}`;
    buscar('turno-direita').textContent = `Direita: ${jogadorDireita(partida)} ►`;
    // Reinicia a animação de troca de nome
    campoNome.classList.remove('trocou');
    void campoNome.offsetWidth;
    campoNome.classList.add('trocou');
  } else {
    rotulo.textContent = 'Com o celular na mão';
    campoNome.textContent = 'Retire uma carta';
  }
  buscar('turno-lados').hidden = !nome;
}

function atualizarMesa() {
  const restantes = partida.monte.length;
  const esgotado = partida.fase === 'esgotado';

  buscar('contador').textContent = restantes;
  buscar('monte').style.setProperty('--pilha', Math.min(8, Math.ceil(restantes / 6)));
  buscar('monte').hidden = esgotado;
  buscar('dica').hidden = esgotado;
  buscar('esgotado').hidden = !esgotado;

  buscar('selo-armageddon').hidden = !partida.armageddon;
  const botaoArmageddon = buscar('btn-armageddon');
  botaoArmageddon.hidden = partida.armageddon;

  buscar('turno').hidden = esgotado;
  if (!esgotado) atualizarTurno();
  desenharTiraHistorico();
}

/* ---------- Retirada: toque ou arrasto ---------- */

const DISTANCIA_ARRASTO = 70; // pixels para cima que contam como retirada
const LIMITE_TOQUE = 10; // abaixo disso, o gesto é um toque simples

let arrasto = null;

/* Pode retirar agora? No modo 1, a carta aberta não impede a próxima pessoa. */
function podeRetirar() {
  if (!partida || ocupado) return false;
  return partida.fase === 'aguardando' || retiradaDireta();
}

function retiradaDireta() {
  return partida.modo === 'celular' && partida.fase === 'resolvida' && partida.monte.length > 0;
}

function moverCarta(carta, deslocarX, deslocarY) {
  carta.style.transform =
    `translate3d(${deslocarX}px, ${deslocarY}px, 0) rotate(${deslocarX * 0.03}deg)`;
}

function soltarCarta(carta, comAnimacao) {
  carta.classList.toggle('voltando', comAnimacao);
  carta.style.transform = '';
}

/* Liga o toque e o arrasto a uma área da tela. O monte e a carta aberta usam o mesmo gesto. */
function ligarGesto(area, obterCarta) {
  area.addEventListener('pointerdown', (evento) => {
    const carta = obterCarta();
    if (!carta || !podeRetirar()) return;
    carta.classList.remove('voltando');
    area.setPointerCapture(evento.pointerId);
    arrasto = { carta, inicioX: evento.clientX, inicioY: evento.clientY, x: 0, y: 0, moveu: 0 };
  });

  area.addEventListener('pointermove', (evento) => {
    if (!arrasto) return;
    arrasto.x = evento.clientX - arrasto.inicioX;
    arrasto.y = Math.min(0, evento.clientY - arrasto.inicioY); // a carta só sobe
    arrasto.moveu = Math.max(arrasto.moveu, Math.hypot(arrasto.x, evento.clientY - arrasto.inicioY));
    moverCarta(arrasto.carta, arrasto.x * 0.4, arrasto.y);
  });

  area.addEventListener('pointerup', () => {
    if (!arrasto) return;
    const { carta } = arrasto;
    const foiToque = arrasto.moveu < LIMITE_TOQUE;
    const foiArrasto = arrasto.y <= -DISTANCIA_ARRASTO;
    arrasto = null;

    if (foiToque || foiArrasto) {
      retirar();
    } else {
      soltarCarta(carta, true); // arrasto curto demais: a carta volta para o lugar
    }
  });

  area.addEventListener('pointercancel', () => {
    if (!arrasto) return;
    soltarCarta(arrasto.carta, true);
    arrasto = null;
  });
}

ligarGesto(buscar('monte'), () => buscar('topo'));
ligarGesto(buscar('palco'), () => buscar('palco').querySelector('.carta3d:not(.saindo)'));

// Teclado (Enter ou Espaço): só gera click, sem os eventos de ponteiro acima
buscar('monte').addEventListener('click', (evento) => {
  if (evento.detail === 0) retirar();
});

const NOMES_VALORES = { A: 'Ás', J: 'Valete', Q: 'Dama', K: 'Rei' };

function nomeDaCarta(carta) {
  if (carta.valor === 'CORINGA') return 'Coringa';
  return `${NOMES_VALORES[carta.valor] || carta.valor} de ${NAIPES[carta.naipe].nome}`;
}

function textoCurtoDaCarta(carta) {
  return carta.valor === 'CORINGA' ? '★' : `${carta.valor}${NAIPES[carta.naipe].simbolo}`;
}

function criarCanto(carta, classe) {
  const canto = document.createElement('span');
  canto.className = `canto ${classe}`;
  const simbolo = document.createElement('i');
  simbolo.textContent = NAIPES[carta.naipe].simbolo;
  canto.append(carta.valor, simbolo);
  return canto;
}

/* Monta a carta na tela, com a frente e o verso para poder virar. */
function criarCarta3d(carta) {
  const frente = document.createElement('div');
  frente.className = 'carta-frente';
  const centro = document.createElement('span');
  centro.className = 'centro';

  if (carta.valor === 'CORINGA') {
    frente.classList.add('carta-coringa');
    centro.textContent = 'CORINGA';
    frente.append(centro);
  } else {
    if (NAIPES[carta.naipe].cor === 'vermelha') frente.classList.add('vermelha');
    const ehAs = carta.valor === 'A';
    if (!ehAs) centro.classList.add('letra');
    centro.textContent = ehAs ? NAIPES[carta.naipe].simbolo : carta.valor;
    frente.append(criarCanto(carta, 'canto-a'), centro, criarCanto(carta, 'canto-b'));
  }

  const verso = document.createElement('div');
  verso.className = 'carta-verso';

  const carta3d = document.createElement('div');
  carta3d.className = 'carta3d';
  carta3d.append(frente, verso);
  return carta3d;
}

async function retirar() {
  if (!podeRetirar()) return;

  // Se uma carta está aberta, é a próxima pessoa retirando direto dela
  const trocando = !buscar('revelacao').hidden;
  const anterior = buscar('palco').querySelector('.carta3d:not(.saindo)');
  let origem = buscar('topo').getBoundingClientRect();
  if (trocando) {
    const lugar = anterior.getBoundingClientRect();
    origem = { left: lugar.left, top: lugar.top + lugar.height * 0.7 };
    proximaCarta(partida);
  }

  const entrada = retirarCarta(partida);
  if (!entrada) return;

  ocupado = true;
  soltarCarta(buscar('topo'), false);
  buscar('painel').hidden = true;
  buscar('revelacao').hidden = false;

  const carta3d = criarCarta3d(entrada.carta);
  if (trocando) {
    animarSaida(anterior);
    buscar('palco').append(carta3d);
  } else {
    buscar('palco').replaceChildren(carta3d);
  }
  atualizarMesa();

  await animarRevelacao(carta3d, origem);

  if (entrada.coringa) {
    await esperar(650);
    mostrarCenaCoringa(entrada.jogador);
  } else {
    mostrarPainel(entrada);
  }
  ocupado = false;
}

/* ---------- Painel da regra ---------- */

function mostrarPainel(entrada) {
  const { resultado, jogador } = entrada;
  const escolhendo = partida.fase === 'escolhendo';
  const todos = resultado.alvo === 'todos' && partida.modo === 'todos';

  buscar('painel-carta').textContent = nomeDaCarta(entrada.carta);

  const regra = buscar('painel-regra');
  regra.textContent = escolhendo ? `${jogador}, escolha quem bebe por ${resultado.medida}` : entrada.regra;

  const info = buscar('painel-info');
  const quem = jogador && !escolhendo ? `Retirada por ${jogador}.` : '';
  info.textContent = resultado.semRegra ? `${quem} Só o Coringa conta.`.trim() : quem;
  info.hidden = !info.textContent;

  const nomes = buscar('painel-nomes');
  nomes.replaceChildren();
  if (todos) {
    resultado.cumpre.forEach((nome) => {
      const item = document.createElement('li');
      item.textContent = nome;
      nomes.append(item);
    });
  }
  nomes.hidden = !todos;

  const escolha = buscar('painel-escolha');
  escolha.replaceChildren();
  escolha.hidden = !escolhendo;
  if (escolhendo) {
    jogadoresParaEscolher(partida).forEach((nome) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.textContent = nome;
      botao.addEventListener('click', () => {
        if (escolherJogador(partida, nome)) mostrarPainel(entrada);
      });
      escolha.append(botao);
    });
  }

  const proxima = buscar('btn-proxima');
  const direta = retiradaDireta();
  proxima.hidden = escolhendo || direta;
  proxima.textContent = partida.modo === 'celular' ? 'Continuar' : 'Próxima carta';
  buscar('painel-dica').hidden = !direta;

  buscar('painel').hidden = false;
}

buscar('btn-proxima').addEventListener('click', () => {
  if (!proximaCarta(partida)) return;
  fecharRevelacao();
  atualizarMesa();
});

function fecharRevelacao() {
  buscar('revelacao').hidden = true;
  buscar('palco').replaceChildren();
}

/* ---------- Histórico ---------- */

function criarMini(carta) {
  const mini = document.createElement('span');
  mini.className = 'mini';
  mini.textContent = textoCurtoDaCarta(carta);
  if (carta.valor === 'CORINGA') {
    mini.classList.add('coringa');
  } else if (NAIPES[carta.naipe].cor === 'vermelha') {
    mini.classList.add('vermelha');
  }
  return mini;
}

/* As últimas cartas retiradas, na barra de baixo da mesa. */
function desenharTiraHistorico() {
  const ultimas = partida.retiradas.slice(-5);
  buscar('tira-historico').replaceChildren(...ultimas.map((entrada) => criarMini(entrada.carta)));
}

function desenharHistorico() {
  const lista = buscar('lista-historico');
  lista.replaceChildren();
  buscar('historico-vazio').hidden = partida.retiradas.length > 0;

  // Da mais recente para a mais antiga
  [...partida.retiradas].reverse().forEach((entrada) => {
    const item = document.createElement('li');
    const texto = document.createElement('div');
    texto.className = 'historico-texto';

    const regra = document.createElement('b');
    regra.textContent = entrada.regra;
    texto.append(regra);

    if (entrada.jogador) {
      const quem = document.createElement('small');
      quem.textContent = `Retirada por ${entrada.jogador}`;
      texto.append(quem);
    }

    item.append(criarMini(entrada.carta), texto);
    lista.append(item);
  });
}

buscar('btn-historico').addEventListener('click', () => {
  desenharHistorico();
  buscar('historico').hidden = false;
});

buscar('btn-fechar-historico').addEventListener('click', () => {
  buscar('historico').hidden = true;
});

/* ---------- Armageddon ---------- */

buscar('btn-armageddon').addEventListener('click', () => {
  if (ocupado || partida.armageddon) return;
  buscar('dialogo').hidden = false;
});

buscar('btn-cancelar').addEventListener('click', () => {
  buscar('dialogo').hidden = true;
});

buscar('btn-confirmar').addEventListener('click', async () => {
  buscar('dialogo').hidden = true;

  // No modo 1 a carta anterior pode estar aberta: ela fica para trás
  if (partida.modo === 'celular' && proximaCarta(partida)) fecharRevelacao();
  if (!ativarArmageddon(partida)) return;

  ocupado = true;
  await animarArmageddon();
  atualizarMesa();
  ocupado = false;
});

/* ---------- Nova partida ---------- */

buscar('btn-nova-esgotado').addEventListener('click', voltarAoInicio);
buscar('btn-nova-coringa').addEventListener('click', voltarAoInicio);
