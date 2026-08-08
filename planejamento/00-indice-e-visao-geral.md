# 00 — Índice e Visão Geral

Este é o ponto de partida do planejamento do **Projeto Final II** do Pedro. Leia
este arquivo primeiro antes de mexer em qualquer outra parte do projeto.

## O projeto em uma frase

Construir e experimentar, na prática, um backend simulado de processamento de
pagamentos em Node.js/TypeScript que usa **idempotência**, **processamento
assíncrono via RabbitMQ** e **retry com backoff** para lidar com falhas e
requisições duplicadas — e medir o impacto real dessas técnicas, para responder
à questão de pesquisa definida no Projeto Final I.

Extraído do artigo já escrito (`projeto1_completo.pdf`, Porto Alegre, 2026,
UNISINOS, Curso de Análise e Desenvolvimento de Sistemas):

> "Como técnicas de idempotência e processamento assíncrono podem ser utilizadas
> para evitar inconsistências e aumentar a confiabilidade em sistemas sujeitos a
> falha?"

## Como este conjunto de documentos está organizado

| Arquivo | Para que serve | Quando consultar |
|---|---|---|
| `00-indice-e-visao-geral.md` | Este arquivo — mapa geral | Primeira leitura |
| `01-arquitetura.md` | Como o sistema é desenhado: componentes, dados, filas, idempotência, retry | Antes de codar qualquer coisa |
| `02-plano-de-implementacao.md` | O que fazer em cada fase e o que Pedro precisa dominar em cada uma | No início de cada fase |
| `03-cronograma.md` | Quando fazer cada coisa — calendário semanal ago–dez/2026 | Toda semana |
| `04-plano-de-experimentos.md` | Desenho dos experimentos: variáveis, métricas, cenários | Fases 6 e 7 |
| `05-estrutura-do-artigo-final.md` | Estrutura ABNT do artigo, o que reaproveitar do PF1 | Redação (Fase 8), mas também ao registrar decisões pelo caminho |
| `06-riscos-e-decisoes.md` | Log de decisões já tomadas + riscos + perguntas ainda em aberto | Sempre que uma decisão nova precisar ser registrada |

## Decisões-chave já travadas (08/08/2026)

Ver `06-riscos-e-decisoes.md` para a lista completa com justificativas. Resumo:

- **Stack:** Node.js + TypeScript + Express, PostgreSQL, RabbitMQ, Docker Compose.
- **Abordagem de trabalho:** infraestrutura/setup pode ser mais mecânico; a
  lógica central do projeto (idempotência, retry, máquina de estados do
  pagamento) precisa ser dominada de memória por Pedro — é o que ele defende.
- **Prazo:** concluir tudo até **01/12/2026** — data final rígida, confirmada
  pelo Pedro, sem buffer depois disso (~16,3 semanas úteis a partir de 08/08).
- **Escopo:** manter o escopo completo dos objetivos específicos do PF1, com um
  checkpoint de risco antecipado para 18/out (ver `03-cronograma.md`) para
  reavaliar com dados reais — o prazo mais curto elevou a severidade desse risco.

## O que ainda NÃO foi feito

Nenhum código foi escrito ainda. Este é só o planejamento. O primeiro passo real
é a **Fase 0** em `02-plano-de-implementacao.md`, agendada para a Semana 1
(10–16/ago/2026) em `03-cronograma.md`.

## O que ainda depende do Pedro

Ver a lista completa de perguntas em aberto em `06-riscos-e-decisoes.md` §3.
O item mais importante já foi resolvido (data final = 01/12/2026). O que resta
em aberto agora é mais fino, principalmente: se 01/12 é a entrega do artigo
escrito, a data da banca de defesa, ou ambas — isso muda se é preciso reservar
tempo extra para preparar uma apresentação depois da entrega.
