# Módulo de DevOps — Turma T13 (Base dos Slides)

## Contexto

Este repositório contém a **base inicial dos slides** para o módulo de DevOps da Turma 13.

O material foi estruturado com referência no padrão do repositório:

- https://github.com/canaldoovidio/2026-1a-es09-t13

> **Nota:** o cronograma detalhado e a divisão final das aulas serão definidos na sequência.

---

## Objetivo deste repositório

Consolidar uma base reutilizável para montagem das aulas, mantendo:

- organização clara do conteúdo;
- foco em aprendizagem prática;
- alinhamento com práticas modernas de DevOps.

---

## Estrutura base sugerida para os slides

Cada aula pode seguir esta espinha dorsal:

1. **Abertura**
   - Tema da aula
   - Objetivos de aprendizagem
2. **Fundamentos**
   - Conceitos essenciais do tópico
   - Contexto de uso no ciclo de software
3. **Aplicação prática**
   - Exemplo guiado
   - Demonstração de fluxo DevOps
4. **Atividade**
   - Exercício em grupo ou hands-on
5. **Síntese e próximos passos**
   - Recapitulação
   - Conexão com a próxima aula

---

## Trilhas de conteúdo para o módulo de DevOps

### 1) Cultura e Fundamentos DevOps

- Colaboração entre Dev e Ops
- Fluxo de valor e entrega contínua
- Métricas de desempenho (lead time, frequência de deploy, MTTR)

### 2) Versionamento e Fluxo de Trabalho

- Git e estratégia de branches
- Pull Requests e revisão de código
- Boas práticas para integração frequente

### 3) Integração Contínua (CI)

- Pipelines automatizados
- Build e testes automatizados
- Qualidade de código no pipeline

### 4) Entrega e Deploy Contínuos (CD)

- Estratégias de entrega
- Deploy seguro (blue/green, canary, rollback)
- Gestão de configuração e ambientes

### 5) Infraestrutura como Código (IaC)

- Conceitos e benefícios
- Reprodutibilidade de ambientes
- Governança de infraestrutura

### 6) Observabilidade e Operação

- Logs, métricas e traces
- Alertas e SLO/SLA
- Resposta a incidentes e melhoria contínua

### 7) DevSecOps

- Segurança no ciclo de desenvolvimento
- SAST/DAST e análise de dependências
- Práticas de compliance e redução de risco

---

## Modelo de slide (template por aula)

Para cada aula, manter no mínimo:

- **Slide 1:** título, contexto e objetivos
- **Slide 2-4:** conceitos-chave
- **Slide 5-7:** exemplo prático e fluxo técnico
- **Slide 8:** atividade guiada
- **Slide 9:** discussão e aprendizados
- **Slide 10:** fechamento e próximos passos

---

## Próximos passos

- Definir sequência oficial das aulas do módulo
- Detalhar cronograma com duração por bloco
- Produzir os decks finais por aula com exemplos e exercícios

---

## Publicação das aulas no GitHub Pages

Foi criado o workflow `.github/workflows/deploy-pages.yml` para publicar o conteúdo da pasta `aulas/` no GitHub Pages.

### Como funciona

- Dispara em push para `main` (e manualmente por `workflow_dispatch`);
- Copia o conteúdo de `aulas/` para o artefato do Pages;
- Faz deploy para o ambiente `github-pages`.

> Para funcionar, habilite o GitHub Pages no repositório usando **GitHub Actions** como source.

## Husky para boas práticas

O projeto agora usa Husky com hook `pre-commit` para validar formatação antes de cada commit.

### Setup local

```bash
npm install
```

### Scripts úteis

- `npm run lint`: valida formatação (`md`, `yml`, `yaml`, `json`);
- `npm run format`: aplica formatação automaticamente.
