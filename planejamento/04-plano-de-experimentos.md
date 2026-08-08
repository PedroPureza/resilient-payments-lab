# 04 — Plano de Experimentos

> Este documento traduz os objetivos específicos do Projeto Final I ("simular
> falhas", "aplicar retry", "observar comportamento", "registrar dados para
> avaliar eficiência") em um desenho experimental concreto e executável.

## 1. Pergunta que os experimentos precisam responder

Direto da questão de pesquisa do Projeto Final I:

> Como técnicas de idempotência e processamento assíncrono podem ser utilizadas
> para evitar inconsistências e aumentar a confiabilidade em sistemas sujeitos a
> falha?

Os experimentos precisam gerar evidência **comparável** (com/sem a técnica) para
essa pergunta ser respondida com dados, não apenas com argumento teórico.

## 2. Variáveis independentes (o que a gente controla)

| Variável | Valores sugeridos |
|---|---|
| Idempotência | Ligada / Desligada (`IDEMPOTENCY_ENABLED`) |
| Taxa de falha simulada | 0%, 10%, 30%, 50% (`FAILURE_RATE`) |
| Taxa de requisições duplicadas propositais | 0%, 20%, 50% do total de requisições |
| Política de retry | Sem retry / Com retry (backoff exponencial, `MAX_ATTEMPTS`) |
| Concorrência | ex. 10, 50 requisições simultâneas |

Não é necessário cruzar todas as combinações (isso explode rápido). Ver seção 4
para os cenários priorizados.

## 3. Variáveis dependentes (o que a gente mede)

| Métrica | Como calcular |
|---|---|
| Taxa de sucesso final | `APPROVED` / total de pagamentos únicos esperados |
| Operações duplicadas evitadas | nº de requisições repetidas que **não** geraram novo pagamento |
| Tempo até consistência | tempo entre `POST /payments` e o pagamento atingir status final (`APPROVED`/`FAILED`) |
| Nº médio de tentativas até sucesso | média de `payments.attempts` nos `APPROVED` |
| Taxa de falha definitiva | `FAILED` / total, após esgotar retries |
| Throughput | requisições/segundo que a API sustenta em cada cenário |

Todas essas métricas já têm origem nos dados de `payment_events` e `payments`
definidos em `01-arquitetura.md` — não é necessário instrumentação extra além do
que a arquitetura já grava.

## 4. Cenários priorizados

Do mais simples/essencial para o mais elaborado — se o tempo apertar (ver
checkpoint de risco em `03-cronograma.md`), cortar de baixo para cima:

1. **Baseline** — sem falha, sem duplicata, idempotência ligada. Prova que o
   caminho feliz funciona.
2. **Duplicação sem idempotência** — `IDEMPOTENCY_ENABLED=false`, 50% de
   requisições duplicadas. Mostra o problema que o trabalho existe para resolver
   (operações duplicadas de fato acontecendo).
3. **Duplicação com idempotência** — mesmo cenário acima, mas
   `IDEMPOTENCY_ENABLED=true`. Comparação direta com o cenário 2 — este par é o
   resultado mais importante do artigo.
4. **Falhas sem retry** — `FAILURE_RATE=30%`, retry desabilitado. Mostra o custo
   de não ter recuperação automática.
5. **Falhas com retry** — mesmo cenário, retry habilitado. Comparação direta com
   o cenário 4 — segundo resultado mais importante do artigo.
6. **Estresse combinado** (opcional/estendido) — falha + duplicata + concorrência
   alta simultaneamente, para observar comportamento do sistema como um todo.

## 5. Ferramentas

- **Geração de carga:** k6 (preferível — scripts em JS, fácil de gerar
  duplicatas controladas e concorrência) ou autocannon (mais simples, menos
  flexível). Decidir na Fase 6, registrar em `06-riscos-e-decisoes.md`.
- **Coleta de dados:** consultas diretas em `payments` e `payment_events` ao fim
  de cada rodada, exportadas para CSV/JSON em `experimentos/resultados/`.
- **Repetição:** cada cenário deve rodar **pelo menos 2 vezes** para checar se
  os resultados são consistentes (sistemas com aleatoriedade — `FAILURE_RATE` —
  podem variar bastante em uma única rodada).

## 6. Formato de registro de cada rodada

Cada execução deve gerar um arquivo com, no mínimo:

```json
{
  "cenario": "duplicacao_com_idempotencia",
  "data_execucao": "2026-11-05T14:30:00Z",
  "parametros": { "idempotency_enabled": true, "failure_rate": 0, "duplicate_rate": 0.5, "concurrency": 20 },
  "resultados": { "total_requisicoes": 200, "pagamentos_unicos_criados": 100, "duplicatas_bloqueadas": 100, "tempo_medio_consistencia_ms": 850 }
}
```

Isso facilita gerar as tabelas/gráficos comparativos na Fase 7 sem precisar
reprocessar logs brutos toda vez.

## 7. Da análise ao artigo

Cada par de cenários comparados (2 vs 3, 4 vs 5) deve virar, na Fase 7:
- Uma tabela ou gráfico de barras comparando a métrica principal.
- Um parágrafo conectando o resultado numérico de volta ao referencial teórico
  (ex.: o resultado do cenário 3 vs. 2 é a evidência empírica para o que
  Helland, 2015, argumenta teoricamente sobre idempotência).

Ver `05-estrutura-do-artigo-final.md` para onde isso entra na estrutura ABNT.
