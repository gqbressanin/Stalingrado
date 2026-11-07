# STALINGRADO

Jogo de cartas para jogar presencialmente, em um único celular, direto pelo navegador.
Usa só HTML, CSS e JavaScript. Não tem servidor, banco de dados nem salvamento:
ao atualizar ou fechar a página, a partida se perde. Isso é intencional.

## Como abrir no computador

Dê dois cliques no arquivo `index.html`.

## Como testar no celular, antes de publicar

O computador e o celular precisam estar no mesmo Wi-Fi.

1. Abra um terminal nesta pasta e rode:

   ```bash
   python -m http.server 8080
   ```

2. Em outro terminal, rode `ipconfig` e anote o "Endereço IPv4" (algo como `192.168.0.15`).
3. No navegador do celular, abra `http://192.168.0.15:8080`, usando o seu número.

Se não abrir, o Firewall do Windows pode estar bloqueando. Permita o Python em redes privadas.

## Como conferir as regras

```bash
node testes/testes.js
```

Esse comando simula centenas de partidas e avisa se alguma regra quebrou.
Rode de novo sempre que mudar `regras.js`, `baralho.js` ou `partida.js`.

## O que cada arquivo faz

| Arquivo | Função | Analogia |
|---|---|---|
| `index.html` | Os elementos de cada tela | O esqueleto |
| `css/estilo.css` | Cores, fontes e aparência | A pintura |
| `js/regras.js` | A tabela de regras das cartas | O livro de regras |
| `js/baralho.js` | Monta e embaralha as cartas | O crupiê |
| `js/partida.js` | Controla turnos, retiradas, Armageddon e fim | O juiz |
| `js/animacoes.js` | Movimento das cartas e cenas especiais | Os efeitos especiais |
| `js/interface.js` | Liga os toques da tela à lógica | O apresentador |
| `testes/testes.js` | Confere as regras automaticamente | O fiscal |

## Alterações comuns

- **Mudar as regras do modo normal:** edite `js/regras.js`. No Armageddon, as cartas não têm regra.
- **Mudar as cores:** edite as variáveis no começo de `css/estilo.css`.
- **Mudar o tamanho do baralho normal:** edite `VALORES_NORMAL` e `COPIAS_POR_CARTA` em `js/baralho.js`.

## Publicar depois no GitHub Pages

O projeto já é compatível: todos os caminhos são relativos e não há etapa de instalação.
O título do jogo e os textos usam fontes do Google Fonts. Sem internet, o jogo funciona com uma fonte reserva.
