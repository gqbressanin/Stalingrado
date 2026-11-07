/*
 * regras.js — A TABELA DE REGRAS DO JOGO
 *
 * Este é o arquivo que você vai editar quando quiser mudar ou criar regras.
 * Ele só guarda informação; quem usa esta tabela é o arquivo partida.js.
 *
 * Estas regras valem só no modo normal. No Armageddon, nenhuma carta tem regra:
 * a tensão é esperar o Coringa, e quem o retirar bebe a garrafa inteira.
 *
 * Cada regra tem:
 *   alvo     → quem cumpre a regra:
 *                'naipe'         carta preta: quem retirou / carta vermelha: quem retirou escolhe outra pessoa
 *                'quemRetirou'   sempre quem retirou
 *                'esquerda'      a pessoa à esquerda de quem retirou
 *                'direita'       a pessoa à direita de quem retirou
 *                'todos'         todos os participantes
 *   medida   → o texto do quanto se bebe, por exemplo '1 segundo'.
 *   descricao→ (opcional) texto livre, para regras que não sejam "beber".
 */
const REGRAS = {
  A: { alvo: 'naipe', medida: '1 segundo' },
  2: { alvo: 'naipe', medida: '2 segundos' },
  3: { alvo: 'naipe', medida: '3 segundos' },
  Q: { alvo: 'esquerda', medida: '1 segundo' },
  J: { alvo: 'todos', medida: '1 shot' },
  K: { alvo: 'direita', medida: '1 segundo' },
};
