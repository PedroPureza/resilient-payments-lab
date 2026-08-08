# 05 — Estrutura do Artigo Final (ABNT)

> Mapeia a estrutura já usada no Projeto Final I (`projeto1_completo.pdf`) para o
> que se reaproveita e o que precisa ser escrito no Projeto Final II. **Confirme
> o template/normas ABNT específicos exigidos pela UNISINOS para Projeto Final II**
> antes da formatação final — este documento assume a mesma estrutura do PF1, mas
> a universidade pode exigir seções adicionais (ex. apêndices com código).

Regra de integridade acadêmica: tudo aqui é roteiro de conteúdo — a fonte de
cada afirmação (código real, dados reais em `experimentos/resultados/`) precisa
existir antes de virar texto, e o texto final precisa ser escrito e revisado
pelo próprio Pedro, nunca copiado sem passar pela própria cabeça dele.

## Mapa de seções

| Seção | Origem | O que fazer |
|---|---|---|
| Resumo | PF1 | Reescrever ao final, incluindo uma frase de resultado concreto (ex. "reduziu X% de duplicações") em vez de só "almeja-se analisar" |
| 1 Introdução | PF1 | Reaproveitar quase integralmente; ajustar tempo verbal (o que era "será feito" passa a "foi feito") |
| 1.2 Justificativa/Motivação | PF1 | Reaproveitar |
| 1.3 Questão de Pesquisa | PF1 | Reaproveitar **sem alterar** — precisa ser respondida explicitamente na Conclusão |
| 1.4 Objetivo Geral | PF1 | Reaproveitar |
| 1.5 Objetivos Específicos | PF1 | Reaproveitar, mas cada item vira um checklist a marcar como atingido (com evidência) na Conclusão |
| 2 Referencial Teórico | PF1 | Reaproveitar; avaliar se cabe 1–2 referências novas específicas (ex. padrão TTL+DLX em filas, circuit breaker) descobertas durante a implementação |
| 2.4 Trabalhos Relacionados | PF1 | Reaproveitar |
| 3.1 Metodologia (PF1) | PF1 | Reaproveitar como está (descreve o que já foi feito no PF1) |
| 3.2 Metodologia (PF2) | PF1 (adaptar) | Reescrever no **passado**, descrevendo o que foi de fato executado (hoje está no futuro/condicional: "será adotada") |
| **4 Desenvolvimento** | **NOVO** | Arquitetura efetivamente construída (usar diagramas de `01-arquitetura.md`, ajustados para o que realmente foi implementado, incluindo desvios do plano original e por quê) |
| **5 Resultados e Discussão** | **NOVO** | Vem diretamente de `04-plano-de-experimentos.md` §7 — tabelas/gráficos + interpretação conectada à teoria |
| **6 Conclusão** | **NOVO** | Responder a questão de pesquisa (1.3) diretamente; checklist dos objetivos específicos (1.5) com evidência de cada um; limitações (seção 7 de `01-arquitetura.md` vira aqui "limitações assumidas"); trabalhos futuros |
| Referências | PF1 + novas | Vogels (2009), Helland (2015), Kreps (2014) já estão; adicionar qualquer referência nova citada no Desenvolvimento |

## Notas de redação incremental

Para evitar que a Fase 8 (`02-plano-de-implementacao.md`) vire uma corrida de
última hora em dezembro:

- Cada "definição de pronto" de fase no plano de implementação pede uma nota
  curta de decisão — **guardar essas notas em
  `experimentos/notas-de-desenvolvimento.md`** (criar esse arquivo na Fase 0) à
  medida que forem escritas. Elas viram a matéria-prima da Seção 4 quase pronta.
- Rascunhar a Seção 4 (Desenvolvimento) em paralelo à Fase 5/6, não esperar a
  Fase 8 para começar a escrever sobre algo que já foi implementado há semanas.

## Checklist de formatação (revisar antes da entrega)

- [ ] Confirmar template ABNT oficial da UNISINOS para Projeto Final II (margens,
      fonte, espaçamento, normas de citação) — **pendência a resolver com o
      orientador**, ver `06-riscos-e-decisoes.md`.
- [ ] Todas as citações no texto têm entrada correspondente em Referências e vice-versa.
- [ ] Nenhum resultado numérico no texto sem correspondência nos dados salvos em
      `experimentos/resultados/`.
- [ ] Resumo e Abstract (se exigido) refletem os resultados reais, não a previsão do PF1.
