# 06 — Registro de Decisões e Riscos

## 1. Registro de decisões (decision log)

Todas as decisões abaixo foram tomadas por Pedro, via perguntas diretas, em
**08/08/2026**, no momento em que este plano foi criado.

| ID | Decisão | Alternativas consideradas | Justificativa |
|---|---|---|---|
| D1 | Stack: Node.js + TypeScript | Python/FastAPI, Java/Spring Boot | Escolha do Pedro; bom equilíbrio entre ecossistema de filas/APIs e curva de aprendizado |
| D2 | Fila: RabbitMQ | Kafka, Redis, fila simulada em memória/DB | Escolha do Pedro; modelo de exchange/DLX é didático para demonstrar retry visualmente |
| D3 | Banco: PostgreSQL | MySQL, SQLite | Escolha do Pedro (opção recomendada); constraints fortes essenciais para idempotência sob concorrência |
| D4 | Framework HTTP: Express (não NestJS) | NestJS | Decisão registrada dentro da faixa aprovada ("Node.js + TS"), justificada em `01-arquitetura.md` §6 pela carga de aprendizado — **Pedro pode contestar esta decisão específica a qualquer momento** |
| D5 | Abordagem de implementação: incremental, fase a fase, com "foco pessoal obrigatório" marcado em cada fase (ver `02-plano-de-implementacao.md`) | Avançar mais rápido sem essa marcação explícita | Escolha do Pedro; precisa defender o trabalho oralmente, então precisa dominar de memória o núcleo do que constrói, não só ter algo funcionando |
| D6 | Prazo: comprimir cronograma original de 6 meses (PF1) em 5 meses (ago–dez/2026) | Manter 6 meses (defesa em janeiro), usar datas oficiais da UNISINOS | Escolha do Pedro; na época da decisão, **nenhuma data oficial de entrega/banca havia sido confirmada** — ver D9, que substitui esta premissa |
| D7 | Escopo: manter escopo **completo** do PF1 mesmo com risco de cronograma apertado | Priorizar profundidade sobre amplitude, proteger tempo de redação acima de tudo | Escolha explícita do Pedro, mesmo após ser alertado do risco (nível iniciante + 5–10h/semana + prazo comprimido). **Reafirmada** em 08/08/2026 após D9 tornar o prazo mais curto ainda — ver risco R1 (severidade elevada) e o checkpoint antecipado em `03-cronograma.md` |
| D8 | Documentação de planejamento em português | Inglês, misto | Escolha do Pedro; consistência com orientador, banca e o próprio artigo |
| D9 | **Prazo final confirmado: 01/12/2026**, sem margem depois disso | — (data informada diretamente pelo Pedro) | Substitui a premissa de "dezembro/2026" aproximado usada em D6. Reduz a janela útil de ~19 semanas+buffer para **~16,3 semanas sem buffer** (08/08→01/12). Cronograma em `03-cronograma.md` totalmente reconstruído em torno desta data; checkpoint de risco antecipado de 25/10 para 18/10 por causa disso. Resolve o risco R4 (ver abaixo) — mas ver pendência nova em §3 sobre se 01/12 é entrega do artigo, data de banca, ou ambas |

## 2. Registro de riscos

| ID | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | Combinação iniciante + 5–10h/semana + escopo completo + prazo rígido de 01/12 (≈16,3 semanas, **sem buffer**) gera atraso real | **Alta → elevada após D9** | Alto | Checkpoint obrigatório antecipado para o fim da Semana 10 (18/10, `03-cronograma.md`); ordem de corte de escopo pré-definida para não decidir sob pressão; se mesmo assim o item "nunca cortar" (idempotência/retry/redação) estiver ameaçado, a ação vira falar com o orientador sobre o prazo, não cortar mais escopo |
| R2 | Curva de aprendizado de RabbitMQ + Docker para quem nunca usou nenhum dos dois | Média-Alta | Médio | Fase 0 dedicada só a ambiente funcionando antes de seguir adiante; priorizar entender o setup passo a passo em vez de copiar comandos sem entender |
| R3 | Texto final não refletir domínio pessoal do conteúdo, comprometendo a defesa perante a banca | Média | Alto (pode comprometer a defesa) | Toda seção do artigo é escrita e revisada pelo próprio Pedro; nenhum resultado numérico no texto sem correspondência real em `experimentos/resultados/`; nenhuma citação sem fonte conferida |
| R4 | ~~Não existe data oficial de entrega/defesa confirmada~~ — **resolvido em 08/08/2026, ver D9**: prazo final é 01/12/2026 | — | — | Fechado. Cronograma reconstruído em `03-cronograma.md`. Resta confirmar se 01/12 é entrega do artigo, banca, ou ambas — ver pendência nova em §3 |
| R5 | Ambiente do Pedro (Docker Desktop no Windows) pode ter limitações de recursos/WSL não verificadas | Baixa-Média | Médio | Verificar `docker compose up` funcionando como primeiro passo literal da Fase 0, antes de qualquer outra coisa |
| R6 | Template/normas ABNT específicas da UNISINOS para Projeto Final II podem diferir do PF1 | Média | Baixo-Médio | Confirmar com orientador/secretaria antes da Fase 8; ver checklist em `05-estrutura-do-artigo-final.md` |
| R7 | Prazo rígido de 01/12 corta a disponibilidade total de ~135–190h (estimativa anterior) para **~95–160h** — cerca de 27% a menos — mantendo o mesmo escopo completo (D7) | Alta | Alto | Mesma mitigação de R1; ver matemática completa em `03-cronograma.md` (seção "O que muda com um prazo final rígido") |

## 3. Perguntas em aberto — precisam de resposta do Pedro (não assumidas)

Estas não foram perguntadas ainda porque não bloqueiam o início do trabalho, mas
precisam de resposta antes das fases correspondentes:

- [x] ~~Data oficial de entrega/defesa da UNISINOS~~ — **resolvido 08/08/2026:
      prazo final é 01/12/2026** (D9). Cronograma reconstruído.
- [ ] **01/12 é a entrega do artigo escrito, a data da banca/defesa oral, ou
      ambas no mesmo dia?** Isso importa porque, se houver uma banca separada
      depois da entrega, pode ser necessário reservar tempo extra para preparar
      a apresentação/defesa — que não está coberto pelo cronograma atual (que
      assume que 01/12 é o fim de todo o trabalho, ponto final).
- [ ] **O orientador quer revisar cada fase, ou só o artigo final?** (impacta se
      cada fase precisa de um "resumo para o orientador")
- [ ] **Template ABNT oficial do Projeto Final II** (pode diferir do PF1) —
      confirmar antes da Fase 8.
- [ ] **Hospedagem do código:** GitHub público (bom para portfólio) ou privado?
- [ ] **Docker Desktop já está instalado e funcional na máquina do Pedro?** —
      verificar no primeiro minuto da Fase 0, antes de planejar em torno disso.
- [ ] **Vitest ou Jest**, e **query builder** (`pg` puro, Kysely, Drizzle, Prisma)
      — decisão técnica pequena, adiada para o início da Fase 0 de propósito
      (não precisa ser resolvida agora).
- [ ] **Vitest ou k6/autocannon para carga** — mesma lógica, decidir na Fase 6.

Sempre que uma dessas for resolvida, adicionar uma linha na seção 1 (decision
log) e marcar o item aqui como resolvido.
