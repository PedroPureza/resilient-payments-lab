# 03 — Cronograma (Agosto → Dezembro 2026)

> **Data de início:** 08/08/2026. **Prazo final: 01/12/2026 — data confirmada
> pelo Pedro, sem margem depois disso.** Isso substitui o prazo aproximado
> ("dezembro/2026") usado na primeira versão deste documento.

## ⚠️ O que muda com um prazo final rígido em 01/12

A versão anterior deste cronograma assumia trabalho até ~20/12 com um buffer de
final de ano. Com 01/12 como data-limite real:

- Disponível: **08/08 → 01/12/2026 = 114 dias corridos ≈ 16,3 semanas** (contra
  ~19 semanas + buffer da versão anterior).
- A **5–10h/semana** (premissa confirmada pelo Pedro), isso é aproximadamente
  **95–160h totais**, ante ~135–190h da versão anterior — um corte real de
  disponibilidade, não só uma data mais cedo no calendário.
- **Não existe buffer de véspera de feriado/fim de ano neste plano.** O prazo
  final já é antes disso.
- A decisão de manter o **escopo completo** do PF1 (registrada em
  `06-riscos-e-decisoes.md`, decisão D7) segue valendo por escolha do Pedro, mas
  o risco associado a ela (R1) fica **mais severo** com menos horas disponíveis.
  Isso está refletido no checkpoint de risco abaixo, que foi antecipado.

## Visão geral por mês

| Mês | Foco principal | Fases (`02-plano-de-implementacao.md`) |
|---|---|---|
| Agosto | Setup + arquitetura + início da API | Fase 0, Fase 1, início Fase 2 |
| Setembro | API completa + filas + idempotência | Fase 2, Fase 3, início Fase 4 |
| Outubro | Idempotência + falhas + retry + testes | Fim Fase 4, Fase 5, início Fase 6 |
| Novembro | Testes + análise + redação do artigo | Fim Fase 6, Fase 7, Fase 8 |
| 01/dez | **Entrega final** | — |

## Cronograma semanal

| Semana | Datas | Fase | Entregável da semana |
|---|---|---|---|
| S1 | 10–16/ago | Fase 0 | Ambiente sobe com `docker compose up`; `/health` respondendo |
| S2 | 17–23/ago | Fase 1 | Migrations criadas e revisadas; ERD validado |
| S3 | 24–30/ago | Fase 2 | `POST /payments` síncrono funcionando |
| S4 | 31/ago–06/set | Fase 2 | `GET /payments/:id`; testes da Fase 2 completos |
| S5 | 07–13/set | Fase 3 | Publisher + Worker básico; mensagem trafega pela fila |
| S6 | 14–20/set | Fase 3 | Fluxo assíncrono completo (`PENDING` → `APPROVED` via fila) |
| S7 | 21–27/set | Fase 4 | Middleware de idempotência (caso "chave nova") |
| S8 | 28/set–04/out | Fase 4 | Casos "`COMPLETED`" e "`IN_PROGRESS`"; teste de duplicata passando |
| S9 | 05–11/out | Fase 5 | Módulo `chaos/` configurável + fila de retry com TTL/backoff |
| S10 | 12–18/out | Fase 5 | DLQ + eventos completos; **⚠️ checkpoint de risco (ver abaixo)** |
| S11 | 19–25/out | Fase 6 | Scripts de carga escritos; cenários com/sem idempotência rodados |
| S12 | 26/out–01/nov | Fase 6 | Cenários com diferentes `FAILURE_RATE` rodados; dados salvos |
| S13 | 02–08/nov | Fase 7 | Métricas calculadas, gráficos, achados conectados à teoria |
| S14 | 09–15/nov | Fase 8 | Rascunho de Desenvolvimento e Resultados |
| S15 | 16–22/nov | Fase 8 | Rascunho de Conclusão; revisão geral do texto |
| S16 | 23–29/nov | Fase 8 | Formatação ABNT, referências, revisão final |
| — | 30/nov–01/dez | Entrega | Revisão finalíssima e **envio até 01/12/2026** |

Note que, em relação à primeira versão: Fase 5 caiu de 3 para 2 semanas e Fase 6
de 3 para 2 semanas, Fase 7 de 2 para 1 semana — o corte segue exatamente a
ordem de prioridade já definida abaixo (carga experimental primeiro, nunca
idempotência/retry/redação). Fase 8 (redação) manteve 3 semanas cheias,
propositalmente — é o item que a decisão D7 do Pedro (seção "nunca cortar")
protege por último e é a entrega obrigatória.

## Ritmo sugerido (5–10h/semana)

- 2 a 3 sessões por semana de ~2–3h cada, em vez de tentar um bloco único longo.
- Uma sessão curta (30–45min) no início da semana só para reler o objetivo da
  semana em `02-plano-de-implementacao.md` antes de codar, evita retrabalho.
- **Se uma fase inicial (0–4) terminar adiantada, não "guardar" o tempo sobrando
  — usar para dar mais folga à Fase 5, que é a mais arriscada tecnicamente e foi
  a que mais perdeu tempo neste replanejamento.**

## Checkpoint de risco — fim da Semana 10 (18/out)

Antecipado de 25/out (versão anterior) para 18/out, porque o prazo final ficou
mais curto — quanto mais cedo uma decisão de corte de escopo for tomada, mais
tempo ela realmente economiza.

Pedro optou por manter o **escopo completo** do Projeto Final I mesmo sob risco
de cronograma apertado (ver `06-riscos-e-decisoes.md`, decisão D7) — decisão
tomada *antes* de o prazo de 01/12 ser confirmado como rígido. Vale reafirmá-la
(ou revisá-la) com este dado novo em mãos, não só segui-la por inércia.

Neste ponto, Fases 0–5 deveriam estar concluídas — a metade tecnicamente mais
difícil do projeto. Restam, a partir daqui, **cerca de 6,5 semanas** até 01/12,
já sem nenhuma folga adicional depois disso. Perguntas a responder honestamente:

1. As Fases 0–5 estão de fato concluídas (pela definição de "pronto" de cada uma)?
2. Se não, o atraso é de dias ou de semanas — e cabe nas ~6,5 semanas restantes?
3. Com o prazo de 01/12 sendo rígido, algo precisa ceder **agora**, não "se der"?

**Se for necessário ceder algo**, ordem de prioridade (do que cortar primeiro
para o que cortar por último — não decidir isso sob pressão):

1. Reduzir o número de cenários de experimento (ex. testar 2 valores de
   `FAILURE_RATE` em vez de 4) — perde granularidade, não perde a demonstração
   do conceito.
2. Simplificar o módulo de chaos (menos "modos de falha" simulados).
3. Reduzir profundidade da análise estatística (comparação qualitativa em vez de
   múltiplas repetições por cenário).
4. **Nunca cortar:** o mecanismo de idempotência em si, o retry em si, e tempo de
   redação do artigo — esses são o núcleo da questão de pesquisa e a entrega
   final obrigatória, respectivamente. Se o aperto for tal que até isso esteja em
   risco, a decisão a tomar não é mais "o que cortar dentro do projeto", é
   "falar com o orientador sobre o prazo" — ver `06-riscos-e-decisoes.md`.

Registrar o resultado dessa checagem (mesmo que "seguimos como planejado") em
`06-riscos-e-decisoes.md`.

## Como manter isso atualizado

No início de cada semana, comparar o progresso real com esta tabela e atualizar
o status (linha da semana + seção 2 de `06-riscos-e-decisoes.md` se algo mudou).
