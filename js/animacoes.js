/*
 * animacoes.js — O QUE SE MOVE NA TELA
 *
 * Nenhuma regra fica aqui. Todas as animações mexem apenas em posição,
 * rotação e transparência, que são as propriedades mais leves para o celular.
 */
const POUCO_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function esperar(milissegundos) {
  const tempo = POUCO_MOVIMENTO ? 0 : milissegundos;
  return new Promise((resolver) => setTimeout(resolver, tempo));
}

/*
 * Faz a carta sair do monte, ir até o centro e virar.
 * "origem" é o retângulo do monte, para a carta partir de onde o dedo a soltou.
 */
function animarRevelacao(carta3d, origem) {
  if (POUCO_MOVIMENTO) return Promise.resolve();

  const destino = carta3d.getBoundingClientRect();
  const deslocarX = origem.left - destino.left;
  const deslocarY = origem.top - destino.top;

  const animacao = carta3d.animate(
    [
      { transform: `translate3d(${deslocarX}px, ${deslocarY}px, 0) scale(1) rotateY(180deg)` },
      { transform: 'translate3d(0, -14px, 0) scale(1.07) rotateY(180deg)', offset: 0.42 },
      { transform: 'translate3d(0, -8px, 0) scale(1.1) rotateY(90deg)', offset: 0.72 },
      { transform: 'translate3d(0, 0, 0) scale(1) rotateY(0deg)' },
    ],
    { duration: 760, easing: 'cubic-bezier(.3, .7, .3, 1)' },
  );

  // Com a tela apagada a animação pode parar; o limite de tempo garante que
  // a partida continue mesmo assim.
  return Promise.race([animacao.finished, esperar(900)]);
}

/* A carta anterior sai de cena quando a próxima pessoa retira direto dela. */
function animarSaida(carta) {
  carta.classList.add('saindo');
  if (POUCO_MOVIMENTO) {
    carta.remove();
    return;
  }
  carta.animate(
    [
      { opacity: 1, transform: carta.style.transform || 'none' },
      { opacity: 0, transform: 'translate3d(0, -70%, 0) rotate(-6deg)' },
    ],
    { duration: 320, easing: 'ease-in', fill: 'forwards' },
  );
  esperar(340).then(() => carta.remove());
}

/* Sequência de ativação do Armageddon. */
async function animarArmageddon() {
  const cena = document.getElementById('cena-armageddon');
  const app = document.getElementById('app');

  cena.hidden = false;
  document.body.classList.add('tremendo');
  app.classList.add('tremendo');
  await esperar(1250);

  // A atmosfera muda enquanto a cena ainda cobre a tela
  document.body.classList.add('armageddon');
  await esperar(1050);

  cena.hidden = true;
  document.body.classList.remove('tremendo');
  app.classList.remove('tremendo');
}

/* Fagulhas que sobem durante o Armageddon. São poucas, para não pesar. */
function criarBrasas() {
  const brasas = document.getElementById('brasas');
  for (let i = 0; i < 12; i++) {
    const brasa = document.createElement('span');
    brasa.style.left = `${Math.random() * 100}%`;
    brasa.style.animationDuration = `${6 + Math.random() * 7}s`;
    brasa.style.animationDelay = `${-Math.random() * 10}s`;
    brasa.style.setProperty('--deriva', `${Math.random() * 80 - 40}px`);
    brasas.append(brasa);
  }
}

/* Cena final: garrafa quebrando e VOCÊ MATOU A GARRAFA! */
function mostrarCenaCoringa(nome) {
  const estilhacos = document.getElementById('estilhacos');
  estilhacos.replaceChildren();
  for (let i = 0; i < 16; i++) {
    const caco = document.createElement('span');
    const angulo = Math.random() * Math.PI * 2;
    const distancia = 70 + Math.random() * 110;
    caco.style.setProperty('--x', `${Math.cos(angulo) * distancia}px`);
    caco.style.setProperty('--y', `${Math.sin(angulo) * distancia}px`);
    caco.style.setProperty('--giro', `${Math.random() * 720 - 360}deg`);
    estilhacos.append(caco);
  }

  const campoNome = document.getElementById('coringa-nome');
  campoNome.textContent = nome ? `${nome} bebe a garrafa inteira` : 'Beba a garrafa inteira';

  document.getElementById('cena-coringa').hidden = false;
}

criarBrasas();
