/*
 * baralho.js — MONTA E EMBARALHA AS CARTAS
 *
 * Cada carta é um objeto assim:
 *   { id: 'A-copas-2', valor: 'A', naipe: 'copas', copia: 2 }
 *
 * O "id" é a identidade interna da carta. Ele diferencia as duas cópias do
 * mesmo Ás de Copas (copia 1 e copia 2). É por ele que o Armageddon sabe
 * exatamente quais cartas já saíram e nunca as coloca de volta.
 */
const NAIPES = {
  copas: { simbolo: '♥', cor: 'vermelha', nome: 'Copas' },
  ouros: { simbolo: '♦', cor: 'vermelha', nome: 'Ouros' },
  paus: { simbolo: '♣', cor: 'preta', nome: 'Paus' },
  espadas: { simbolo: '♠', cor: 'preta', nome: 'Espadas' },
};

const VALORES_NORMAL = ['A', '2', '3', 'Q', 'J', 'K'];
const VALORES_COMPLETOS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COPIAS_POR_CARTA = 2; // dois baralhos = duas cópias de cada carta

const CORINGA = { id: 'CORINGA', valor: 'CORINGA', naipe: null, copia: 1 };

/* Cria duas cópias de cada combinação de valor e naipe. */
function montarCartas(valores) {
  const cartas = [];
  for (let copia = 1; copia <= COPIAS_POR_CARTA; copia++) {
    for (const valor of valores) {
      for (const naipe of Object.keys(NAIPES)) {
        cartas.push({ id: `${valor}-${naipe}-${copia}`, valor, naipe, copia });
      }
    }
  }
  return cartas;
}

/* Baralho do modo normal: só A, 2, 3, Q, J e K. Sem Coringa. */
function criarBaralhoNormal() {
  return montarCartas(VALORES_NORMAL);
}

/* Conjunto do Armageddon: dois baralhos completos e exatamente um Coringa. */
function criarBaralhoArmageddon() {
  return [...montarCartas(VALORES_COMPLETOS), { ...CORINGA }];
}

/* Embaralha com o algoritmo de Fisher-Yates, que dá chance igual a toda ordem. */
function embaralhar(cartas) {
  const copia = [...cartas];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
