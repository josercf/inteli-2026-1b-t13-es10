# Módulo 13 · DevOps · Turma T13 · Inteli 2026.1B

Repositório com as apresentações do módulo de DevOps da turma T13 do Inteli.

Os decks são apresentações HTML baseadas em [Reveal.js 5](https://revealjs.com/)
com tema e identidade visual do Inteli, inspirado no padrão
[canaldoovidio/2026-1a-es09-t13](https://github.com/canaldoovidio/2026-1a-es09-t13)
e na arquitetura de tema Reveal usada em
[josercf/FIAP-2026-1-3SIZ](https://github.com/josercf/FIAP-2026-1-3SIZ).

## Como abrir

Abra `aulas/index.html` em um navegador moderno, ou rode um servidor local:

```bash
npx serve aulas
```

Depois navegue até `http://localhost:3000`.

## Estrutura

```
aulas/
├── assets/
│   ├── css/
│   │   ├── inteli-theme.css     tema Reveal com paleta Inteli
│   │   └── inteli-print.css     estilos de impressão (PDF)
│   ├── js/
│   │   ├── inteli-quiz.js       quiz interativo
│   │   └── inteli-zoom.js       zoom em imagens
│   └── img/                      pasta para logos oficiais
├── aula01.html                  Ciclo de vida de software (23/04)
├── aula02.html                  Gestão de configuração SCM (27/04)
├── aula03.html                  Métricas de software (28/04)
├── aula04.html                  Qualidade de software e IA (07/05)
├── aula05.html                  CI parte 1, etapas locais (11/05)
├── aula06.html                  CI parte 2, SAST no pipeline (13/05)
├── index.html                    cronograma principal
└── index.md                      índice auxiliar em markdown
```

## Cronograma

### Sprint 1 · Fundamentos do processo · 22/04 a 05/05

| Aula | Data | Tema |
|------|------|------|
| 01 | 23/04 (qua) | Ciclo de vida de software |
| 02 | 27/04 (seg) | Gestão de configuração (SCM) |
| 03 | 28/04 (ter) | Métricas de software: processo, produto e DORA |

### Sprint 2 · Qualidade e CI · 06/05 a 19/05

| Aula | Data | Tema |
|------|------|------|
| 04 | 07/05 (qui) | Qualidade de software e IA no processo |
| 05 | 11/05 (seg) | CI parte 1, etapas locais |
| 06 | 13/05 (qua) | CI parte 2, SAST no pipeline |

### Próximas sprints

Aulas 07 a 14 em planejamento. Tópicos em roteiro incluem entrega contínua,
containers, IaC, observabilidade e DevSecOps.

## Identidade visual

O tema usa a paleta institucional Inteli:

- Purple `#2e2640`
- Coral `#ff4545`
- Lilac `#90a5e5`
- Green `#89cea5`
- Dark green `#066d73`

Tipografia: Manrope para texto e Space Mono para código.

A wordmark `inteli.` é renderizada em CSS enquanto não há arquivos PNG/SVG
oficiais na pasta `aulas/assets/img/`.

## Scripts

```bash
npm install         # instala Husky e Prettier
npm run lint        # valida formatação de md/yml/yaml/json
npm run format      # aplica formatação automaticamente
```

O hook `pre-commit` roda `lint-staged` antes de cada commit.

## Publicação

O workflow `.github/workflows/deploy-pages.yml` publica o conteúdo da pasta
`aulas/` no GitHub Pages a cada push em `main`.

Para ativar a primeira vez: em Settings, Pages, escolha a source "GitHub Actions".

## Estado atual

Os esqueletos das aulas 01 a 06 estão criados, com capa, agenda, objetivos,
separadores de bloco, slide de exercício, quiz, auto-estudo e encerramento.
O conteúdo detalhado (slides internos de fundamentos e práticas) será populado
aula por aula.
