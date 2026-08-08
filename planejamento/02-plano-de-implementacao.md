# 02 — Plano de Implementação por Fases

> Cada fase referencia a arquitetura definida em `01-arquitetura.md`. As datas de
> calendário para cada fase estão em `03-cronograma.md` — este documento foca no
> **o quê**; o cronograma foca no **quando**.

Cada fase abaixo tem uma seção **"Foco pessoal obrigatório"**: a parte que Pedro
precisa dominar de memória, porque é o núcleo conceitual do trabalho e é isso
que ele vai defender. O resto de cada fase (setup, boilerplate, configuração de
infraestrutura) é mais mecânico — importa que funcione e que Pedro entenda o
suficiente para depurar, mas não precisa ser decorado linha a linha.

---

## Fase 0 — Setup do ambiente

**Objetivo:** ambiente de desenvolvimento rodando, do zero, com um comando.

- Criar repositório (Git) e estrutura de pastas de `01-arquitetura.md` §8.
- `docker-compose.yml` com PostgreSQL + RabbitMQ (com management UI habilitada
  na porta padrão 15672 — útil para inspecionar filas visualmente depois).
- Projeto Node + TypeScript inicial (`package.json`, `tsconfig.json`, lint/format).
- Escolher e configurar: query builder/driver Postgres, Vitest/Jest, `pino`.
- Um endpoint `GET /health` funcionando, só para provar que o esqueleto sobe.

**Foco pessoal obrigatório:** isto é infraestrutura de setup, mais mecânica —
mas Pedro precisa sair desta fase capaz de rodar, depurar e explicar esse
ambiente sozinho, sem depender de anotações.

**Definição de pronto:** `docker compose up` sobe Postgres + RabbitMQ; `npm run dev`
sobe a API; `GET /health` responde 200; tudo commitado.

---

## Fase 1 — Arquitetura e modelagem de dados

**Objetivo:** schema do banco criado e versionado; decisões de `01-arquitetura.md`
§2.3 revisadas e ajustadas se necessário antes de virar código.

- Migrations para `payments`, `idempotency_keys`, `payment_events`.
- Revisar se o modelo faz sentido antes de migrar (é mais barato mudar agora
  do que na Fase 4).

**Foco pessoal obrigatório:** Pedro precisa conseguir explicar cada tabela e
cada constraint de memória, não só ter o ERD proposto funcionando.

**Definição de pronto:** migrations rodam limpo num banco vazio; Pedro consegue
desenhar o ERD de memória (ou quase) numa call de orientação.

---

## Fase 2 — API core (síncrona, sem fila/idempotência ainda)

**Objetivo:** `POST /payments` e `GET /payments/:id` funcionando de forma
totalmente síncrona — cria e já marca como `APPROVED` na hora. Isso dá uma base
simples para comparar "antes" e "depois" nas fases seguintes.

- Rotas, controllers, `PaymentService` básico, `PaymentRepository`.
- Testes de unidade do `PaymentService` e teste de integração do endpoint.

**Foco pessoal obrigatório:** o `PaymentService` (lógica de criação/consulta) —
é o primeiro pedaço de lógica de negócio real do projeto, e a base sobre a qual
tudo depois é construído.

**Definição de pronto:** consigo criar e consultar um pagamento via curl/Postman;
testes passam.

---

## Fase 3 — Filas e processamento assíncrono

**Objetivo:** `POST /payments` passa a responder `202 Accepted` com status
`PENDING`, publica na fila `payments.process`; o Worker consome e atualiza para
`APPROVED` (ainda sem simular falha).

- Publisher no lado da API.
- Processo `worker` separado, consumer básico.
- Topologia de filas no RabbitMQ (`01-arquitetura.md` §2.4) — pelo menos a fila
  principal nesta fase; retry/DLQ entram na Fase 5.

**Foco pessoal obrigatório:** a lógica do consumer (o que fazer ao receber a
mensagem, como decidir sucesso). A conexão em si com o RabbitMQ é mais
mecânica/repetitiva — vale entender bem o padrão pub/sub antes de escrever essa
parte, mas o consumer é o que precisa ser dominado de cor.

**Definição de pronto:** criar um pagamento, ver a mensagem passar pela fila (via
management UI do RabbitMQ), status muda de `PENDING` para `APPROVED` sem
intervenção manual.

---

## Fase 4 — Idempotência

**Objetivo:** implementar o mecanismo completo de `01-arquitetura.md` §3,
incluindo a flag `IDEMPOTENCY_ENABLED` para os experimentos comparativos.

- Middleware de idempotência.
- Tratamento dos três casos: chave nova, chave `COMPLETED`, chave `IN_PROGRESS`.
- Teste que prova: enviar a mesma `Idempotency-Key` duas vezes gera **um** pagamento.

**Foco pessoal obrigatório:** o middleware e o `IdempotencyService` inteiros —
este é o núcleo conceitual do trabalho, o coração da questão de pesquisa. Isso
inclui entender a diferença entre idempotência por chave de cliente e
idempotência natural de operação, e por que a constraint `UNIQUE` no banco é o
que de fato garante a propriedade sob concorrência.

**Definição de pronto:** teste automatizado de "requisição duplicada" passando;
Pedro consegue explicar, sem consultar notas, por que a constraint `UNIQUE` no
banco é necessária e não bastaria checar em memória.

---

## Fase 5 — Simulação de falhas e retry

**Objetivo:** módulo `chaos/` funcionando com falha configurável; política de
retry com backoff via TTL + DLX; DLQ recebendo pagamentos que esgotaram tentativas.

- Módulo de chaos configurável por env vars.
- Fila `payments.retry` com TTL crescente, fila `payments.dead-letter`.
- Eventos `FAILED_ATTEMPT`, `RETRY_SCHEDULED`, `MOVED_TO_DLQ` sendo gravados.

**Foco pessoal obrigatório:** a política de retry em si (quantas tentativas,
cálculo do backoff, quando desistir). O padrão TTL+DLX do RabbitMQ não é óbvio
na primeira vez — vale estudar bem como ele funciona antes de implementar, já
que é bem provável que apareça como pergunta na banca.

**Definição de pronto:** com `FAILURE_RATE` alto, consigo ver mensagens
retornando à fila principal após um atraso crescente, e eventualmente indo para a
DLQ; `payment_events` conta a história completa de um pagamento que falhou.

**⚠️ Checkpoint de risco:** esta é a fase historicamente mais arriscada do
cronograma (ver `03-cronograma.md` e `06-riscos-e-decisoes.md`, risco R1). Ao final
dela, reavaliar prazo restante de forma honesta.

---

## Fase 6 — Testes experimentais e coleta de dados

**Objetivo:** executar os cenários definidos em `04-plano-de-experimentos.md` e
salvar os dados brutos.

- Scripts de carga (k6/autocannon) que geram requisições, incluindo duplicatas
  propositais.
- Rodar cada cenário com `IDEMPOTENCY_ENABLED` ligado e desligado, e com
  diferentes `FAILURE_RATE`.
- Salvar resultados brutos em `experimentos/resultados/`.

**Foco pessoal obrigatório:** os parâmetros de cada rodada e o acompanhamento da
execução — entender o que está sendo observado, e por quê, é o ponto central
deste exercício. Os scripts de carga em si podem ser mais mecânicos.

**Definição de pronto:** dados de todos os cenários planejados salvos em formato
analisável (CSV/JSON), com nota de quando/como cada rodada foi executada.

---

## Fase 7 — Análise dos resultados

**Objetivo:** transformar dados brutos em conclusões e visualizações para o artigo.

- Processar os dados coletados, calcular as métricas definidas em
  `04-plano-de-experimentos.md`.
- Gerar gráficos/tabelas comparando cenários (com/sem idempotência, diferentes
  taxas de falha).
- Conectar os achados de volta à questão de pesquisa e ao referencial teórico.

**Foco pessoal obrigatório:** a interpretação e as conclusões precisam vir do
Pedro — é o que ele vai defender perante a banca, palavra por palavra.

**Definição de pronto:** conjunto de gráficos/tabelas prontos e uma lista de
"achados" em linguagem simples, antes de virar prosa acadêmica.

---

## Fase 8 — Redação do artigo final

Ver `05-estrutura-do-artigo-final.md` para o mapeamento seção a seção.

**Recomendação forte:** não deixar toda a redação para o final. As seções de
Desenvolvimento devem ser esboçadas fase a fase (uma nota curta por decisão, como
já pedido na "definição de pronto" de cada fase acima), para que a Fase 8 seja
principalmente compilação e revisão, não escrita do zero sob pressão de prazo.
