# Demo CI/CD para Firmware PX4 — Spec de Design

- **Data:** 2026-05-17
- **Autor:** José Romualdo (com input de Hermano Peixoto)
- **Status:** rascunho para revisão
- **Sprint:** S3 (CD e métricas, 18/05 a 29/05) — Módulo 13, ES10 T13 Inteli 2026.1B
- **Origem:** consolida e materializa o documento "Construção de uma Esteira CI/CD para Firmware PX4 com GitHub Actions, OpenChoreo, SITL e Releases Imutáveis"

---

## 1. Objetivo

Construir uma demo executável de CI/CD para firmware de drones PX4 que:

1. Sirva de base prática para 4 aulas da Sprint 3 (07 a 10), com cada aula representando uma etapa de evolução incremental do pipeline.
2. Permita aos alunos visualizar, em sala, um pipeline real verde de ponta a ponta — do commit ao artefato flasheável.
3. Demonstre os conceitos-chave: integração contínua, simulação SITL containerizada, métricas operacionais extraídas do simulador, testes de integração robustos, quality gates, e releases imutáveis promovidas entre ambientes.
4. Forneça código-base reaproveitável que os alunos possam clonar como referência para a atividade descrita no PDF original.

## 2. Não-objetivos

- Não substituir a atividade do PDF; o demo é referência de instrutor, não solução pronta para entrega dos alunos.
- Não rodar OpenChoreo como infra real (decisão de escopo aprovada).
- Não renderizar Gazebo graficamente no CI (decisão aprovada).
- Não flashar firmware em hardware real durante aula; gerar e anexar o artefato é suficiente.
- Não cobrir HIL (Hardware-in-the-Loop) ou bench tests reais — apenas referenciados conceitualmente.

## 3. Arquitetura

### 3.1. Estrutura de repositório

Repo novo: **`josercf/inteli-px4-cicd-demo`** (público).

```
inteli-px4-cicd-demo/
├── PX4-Autopilot/                         submódulo, pinado em tag estável corrente do PX4 (definida na construção do esqueleto)
├── libs/
│   └── drone_modeling/
│       ├── __init__.py
│       ├── dynamics.py                    compute_thrust, trajectory_error
│       └── geometry.py                    distância haversine, conversões NED
├── tests/
│   ├── unit/
│   │   ├── test_dynamics.py
│   │   └── test_geometry.py
│   └── sitl/
│       ├── conftest.py                    fixtures de simulador + MAVSDK
│       ├── test_connection.py             smoke: arma + desarma
│       └── test_mission_square.py         missão 4 waypoints
├── tools/
│   ├── run_mission.py                     CLI: executa missão YAML, salva ulog
│   ├── extract_metrics.py                 parser ulog → reports/metrics.json
│   ├── quality_gates.py                   aplica thresholds em metrics + cov + sast
│   └── promote_release.py                 re-tag GHCR dev→staging→prod
├── missions/
│   └── square_50m.yaml                    missão de referência
├── docker/
│   ├── Dockerfile.sitl                    base PX4 + Gazebo headless
│   └── Dockerfile.tools                   Python + MAVSDK + pyulog
├── docker-compose.yml                     dev local: sitl + tools
├── docker-compose.gui.yml                 overlay com display X11
├── .github/
│   ├── workflows/
│   │   ├── base-image.yml                 build manual da imagem SITL base
│   │   ├── ci.yml                         pipeline principal (lint→unit→sitl→gates)
│   │   ├── release.yml                    build hardware + GitHub Release
│   │   └── promote.yml                    promoção dev→staging→prod (workflow_dispatch)
│   └── pull_request_template.md
├── openchoreo/                            manifestos conceituais
│   ├── component.yaml
│   ├── release.yaml
│   └── environments/
├── reports/                               saída do CI (gitignored)
├── docs/
│   ├── adrs/
│   │   ├── ADR-001-wrapper-com-submodulo.md
│   │   ├── ADR-002-openchoreo-simulado.md
│   │   ├── ADR-003-gazebo-headless-no-ci.md
│   │   └── ADR-004-promocao-por-retag.md
│   └── aulas/
│       ├── aula07-walkthrough.md
│       ├── aula08-walkthrough.md
│       ├── aula09-walkthrough.md
│       └── aula10-walkthrough.md
├── quality_gates.yaml                     thresholds versionados
├── pyproject.toml                         ruff + black + mypy + pytest config
├── requirements.txt
├── requirements-dev.txt
├── .gitignore
├── .gitmodules
└── README.md
```

### 3.2. Componentes e responsabilidades

| Componente | Responsabilidade | Interface |
|---|---|---|
| **PX4-Autopilot/** | Firmware, builds SITL e hardware | submódulo read-only |
| **libs/drone_modeling/** | Funções puras de modelagem (testáveis em isolamento) | Python API |
| **tools/run_mission.py** | Executa missão definida em YAML, grava .ulog | CLI: `--mission`, `--output` |
| **tools/extract_metrics.py** | Lê .ulog → KPIs em JSON | CLI: `--ulog`, `--output` |
| **tools/quality_gates.py** | Compara métricas/coverage/SAST contra thresholds | exit code 0/1 |
| **tools/promote_release.py** | Re-tagueia imagem GHCR sem rebuild | CLI: `--from`, `--to` |
| **docker/Dockerfile.sitl** | Imagem base do PX4 SITL headless | publica em `ghcr.io/josercf/px4-sitl-base:<px4-tag>` |
| **docker/Dockerfile.tools** | Container do test runner | publica em `ghcr.io/josercf/px4-tools:<sha>` |
| **.github/workflows/ci.yml** | Orquestração do pipeline principal | trigger: push, PR |
| **.github/workflows/release.yml** | Build hardware + artefatos | trigger: tag `v*` |
| **SonarQube (instância hospedada pelo instrutor)** | SAST + cobertura agregada + Quality Gate externo | scanner em job dedicado, URL e token via GitHub secrets |

Cada componente é independente: o test runner não conhece o Dockerfile, o gates não conhece o MAVSDK, etc. A única dependência cruzada é o contrato de arquivos JSON em `reports/`.

### 3.3. Fluxo do pipeline (CI principal)

Este é o estado **final** do pipeline (após PR #4). A construção é incremental: PR #1 entrega `python-quality` + `sonar-scan` (análise básica, sem gate enforcement) + `sitl-build` + `deploy-dev`; PR #2 adiciona `mission-test`; PR #3 reforça `mission-test` com fixtures; PR #4 adiciona `quality-gates` + `pr-comment` + ativa enforcement do gate do Sonar + arquivos `release.yml` e `promote.yml`.


```
push/PR
  │
  ├─► [job: python-quality]   ruff + black --check + mypy + pytest tests/unit + coverage
  │
  ├─► [job: sonar-scan]       sonar-scanner → publica em SONAR_HOST_URL
  │      (depende de python-quality para reusar coverage.xml)
  │
  ├─► [job: sitl-build]       docker build -f Dockerfile.sitl (cache de layer)
  │      │
  │      ├─► push para GHCR como ghcr.io/josercf/px4-sitl:<sha>
  │      │
  │      └─► [job: mission-test] (depende de sitl-build)
  │              │
  │              ├─► docker compose up sitl + tester
  │              ├─► python tools/run_mission.py --mission missions/square_50m.yaml
  │              ├─► python tools/extract_metrics.py --ulog ... → reports/metrics.json
  │              └─► upload-artifact reports/
  │
  ├─► [job: quality-gates]    (depende de python-quality + sonar-scan + mission-test)
  │      │
  │      ├─► python tools/quality_gates.py
  │      │       inputs: reports/metrics.json, coverage.xml, sonar quality gate status (via API)
  │      │       config: quality_gates.yaml
  │      └─► falha pipeline se algum gate vermelho (inclui gate do Sonar)
  │
  └─► [job: pr-comment]       posta resumo de métricas + diff vs. baseline no PR
```

Tag `v*` dispara `release.yml`:
- Reusa imagem `px4-sitl:<sha>` (não recompila).
- Roda `make px4_fmu-v6x_default` em paralelo → `.px4` flasheável.
- Cria GitHub Release com: imagem GHCR, `.px4`, `metrics.json`, checksum, SBOM.

Promoção dev→staging→prod: workflow manual (`promote.yml`) que invoca `tools/promote_release.py` — apenas re-tagueia a imagem GHCR. **Não recompila.** Aprovação humana via GitHub Environments.

### 3.4. Estratégia de cache

Build PX4 SITL cold leva ~25min. Mitigações:

1. **Imagem base separada** (`base-image.yml`): build manual periódico de `px4-sitl-base:<px4-tag>` com PX4 já compilado. Trocada só quando submódulo PX4 muda de tag.
2. **CI pipeline** parte da base e só recompila se houver mudança em `PX4-Autopilot/`. Caso contrário: ~2min de build.
3. **Cache de pip** padrão `actions/setup-python` para deps Python.

Resultado alvo: pipeline de PR fecha em **<6 minutos**.

## 4. Fluxo das 4 aulas

Cada aula = 1 PR no repo demo, demonstrando a esteira evoluindo. Os PRs ficam abertos como referência permanente.

### 4.1. Aula 07 — Hello World, Continuous Deployment (19/05, Hermano)

**Tema:** o "hello world" de CD é uma esteira verde que produz um artefato deployável a cada commit.

**PR #1 entrega:**
- Estrutura inicial do repo (libs/, tests/unit/, Dockerfiles, ci.yml mínimo).
- Pipeline com 4 jobs: `python-quality` (lint+unit+coverage), `sonar-scan` (publica métricas na instância Sonar do instrutor — sem gate ainda), `sitl-build` (publica imagem GHCR com tag `<sha>`), `deploy-dev` (sobe container, healthcheck do PX4 responde via MAVLink em até 60s, MAVSDK conecta e drone entra em estado armed sem erro — sem missão ainda).
- `sonar-project.properties` versionado; secrets `SONAR_HOST_URL` e `SONAR_TOKEN` configurados no repo.
- Conceito demonstrado: cada commit gera uma release candidata rastreável + dashboard de qualidade visível desde o dia 1.

**Conteúdo da aula:** continuous deployment vs. continuous delivery; pipeline mínimo viável; imutabilidade de artefatos; walkthrough ao vivo do PR #1.

### 4.2. Aula 08 — Extraindo métricas do pipeline de CI/CD (22/05, José)

**Tema:** métricas operacionais do sistema em execução (DAST-like), não só do código.

**PR #2 entrega:**
- `missions/square_50m.yaml`: missão de referência (decola, 4 waypoints em quadrado de 50m, pousa).
- `tools/run_mission.py` + `tools/extract_metrics.py`.
- Novo job `mission-test` no `ci.yml`.
- KPIs extraídos:
  - duração total da missão (s)
  - erro RMS de trajetória vs. waypoints planejados (m)
  - altitude média e desvio padrão durante cruzeiro (m)
  - consumo de bateria simulado (% por minuto)
  - máximo de aceleração instantânea (m/s²)
- Métricas comentadas automaticamente no PR.

**Conteúdo da aula:** taxonomia de métricas de pipeline (DORA + métricas de domínio); paralelo SAST x DAST aplicado a firmware; walkthrough do PR #2; análise das métricas reais.

### 4.3. Aula 09 — Você escreve (bons) testes de integração? (26/05, Hermano)

**Tema:** lições aprendidas com a aula 08 viram disciplina de teste.

**PR #3 entrega:**
- `tests/sitl/conftest.py` com fixtures: `sitl_running` (sobe simulador), `drone_armed`, `mission_completed`. Cada fixture com setup/teardown determinístico.
- Refatoração dos testes em `tests/sitl/` para usar fixtures.
- Asserções de invariantes físicos: max accel < threshold, geofence respeitada, altitude nunca negativa.
- Parametrização: mesma missão em 3 cenários de vento (0, 5, 10 m/s).
- Conserto de flakiness identificada na aula 08 (timeouts determinísticos, esperas baseadas em estado e não em sleep).

**Conteúdo da aula:** princípios FIRST de testes (Fast, Independent, Repeatable, Self-validating, Timely); pirâmide de testes adaptada a firmware; antipadrões (sleep, shared state, ordem-dependentes); walkthrough do PR #3.

### 4.4. Aula 10 — Esteira de CI como guardiã da qualidade (28/05, Hermano)

**Tema:** pipeline não é só pra rodar testes — é a porta da qualidade.

**PR #4 entrega:**
- `quality_gates.yaml` com thresholds versionados.
- `tools/quality_gates.py` que falha o pipeline se qualquer gate vermelho.
- Gates implementados:
  - cobertura unitária ≥ 80% (verificado localmente + reforçado pelo Sonar)
  - erro RMS de trajetória ≤ 2.0m
  - máx aceleração ≤ 15 m/s²
  - **Sonar Quality Gate = Passed** (consulta via API do Sonar; bloqueia merge se Failed)
  - SAST sem `HIGH`/`CRITICAL` no Sonar (vulnerabilidades + security hotspots novos)
  - missão completa em ≤ 180s (regressão de performance)
- `release.yml` adicionado: build firmware `px4_fmu-v6x_default`, anexa `.px4` ao GitHub Release.
- `promote.yml` adicionado: workflow manual com aprovação por Environment para dev→staging→prod via re-tag GHCR.
- Demonstração ao vivo: PR intencionalmente quebrado (missão que excede aceleração) sendo barrado pelos gates.
- Demonstração de rollback: re-tag de versão anterior para "prod".

**Conteúdo da aula:** quality gates como contrato; trade-off rigor vs. velocidade; promoção controlada entre ambientes; estratégia de rollback; walkthrough do PR #4 e do PR quebrado.

## 5. Quality gates: thresholds iniciais

`quality_gates.yaml`:

```yaml
coverage:
  min_line_coverage: 0.80

mission_metrics:
  max_trajectory_rms_error_m: 2.0
  max_acceleration_m_s2: 15.0
  max_mission_duration_s: 180
  min_altitude_stability_m: 0.5    # desvio padrão durante cruzeiro

sonar:
  require_quality_gate_passed: true
  max_new_blocker_issues: 0
  max_new_critical_issues: 0
  max_new_security_hotspots_to_review: 0
```

O Quality Gate configurado **no Sonar** segue a definição Sonar Way (padrão), e o `quality_gates.py` apenas valida que o gate retornou status `OK` para a análise daquele commit. Isso evita duplicar lógica entre o YAML local e a configuração do Sonar.

Thresholds são iniciais e calibrados a partir das execuções da aula 08. Versionados no repo para permitir evolução com justificativa em ADR.

## 6. Tratamento de erro

- **Submódulo PX4 desatualizado:** workflow `base-image.yml` valida que tag do submódulo corresponde à imagem base disponível; falha cedo com mensagem clara.
- **SITL não inicializa:** healthcheck no container (tenta conexão MAVLink por 60s); job falha com log do PX4 anexado.
- **Missão trava (sem progresso):** timeout duro de 300s no `run_mission.py`; mata simulador, anexa logs, falha.
- **Métricas ausentes:** `quality_gates.py` distingue "arquivo não encontrado" (erro de pipeline) de "threshold violado" (falha de qualidade); mensagens distintas.
- **Re-tag de release inexistente:** `promote_release.py` valida que tag origem existe no GHCR antes de criar a destino.

## 7. Plano de testes do próprio demo

Como o demo é referência didática, ele mesmo precisa ser testado:

- **Unit** (`tests/unit/`): cobrem `libs/drone_modeling/` e helpers em `tools/`.
- **Integration** (`tests/sitl/`): cobrem o pipeline ao vivo (testes que rodam DENTRO do CI usando o próprio Dockerfile.sitl).
- **Smoke local**: `make smoke` que sobe docker compose, roda missão, verifica metrics.json existe e tem chaves esperadas. Documentado no README como check pré-aula.

Critério de "pronto para aula": pipeline verde no main + smoke local verde em <10min em laptop razoável.

## 8. Atualização das aulas Reveal.js

Repo: `inteli-2026-1b-t13-es10` (existente).

| Arquivo | Status | Ação |
|---|---|---|
| `aulas/aula07.html` | a criar | Hello World CD + walkthrough PR #1 |
| `aulas/aula08.html` | a criar | Métricas de pipeline + walkthrough PR #2 |
| `aulas/aula09.html` | a criar | Testes de integração + walkthrough PR #3 |
| `aulas/aula10.html` | a criar | Quality gates + walkthrough PR #4 |
| `aulas/index.html` | atualizar | adicionar links das aulas 07-10 |
| `aulas/index.md` | já tem | OK |

Cada aula segue padrão visual das aulas 05/06: capa, agenda, objetivos, blocos teóricos, exercício ao vivo (walkthrough), quiz, auto-estudo, encerramento.

Tempo alvo por aula: ~80 minutos, com ~30min de walkthrough do PR correspondente.

## 9. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Build PX4 SITL não termina em runner free | Média | Imagem base pré-construída + cache agressivo; fallback self-hosted se necessário |
| MAVSDK flaky em headless | Média | Esperas baseadas em estado + retries; investigado e endereçado na aula 09 |
| GHCR rate limit em PR de aluno (caso copiem repo) | Baixa | Documentar autenticação no README; permitir build local sem push |
| OpenChoreo "fingido" parece artificial pedagogicamente | Baixa | ADR-002 explica decisão; aula 10 mostra manifestos reais como referência |
| Aulas 09 e 10 tem dependência de PR #2 verde | Alta | Lock no main: PRs #1 e #2 mergeados até 21/05 (1 dia antes da aula 08) |
| Instância Sonar do instrutor cai durante aula | Média | `sonar-scan` configurado com `continue-on-error: true` em PRs 1-3; só vira gate enforcement no PR #4. Aula 10 tem plano B: mostrar print do dashboard se URL fora do ar. |
| Token Sonar vaza em log público | Baixa | Token só em `secrets.SONAR_TOKEN`; scanner usa `-Dsonar.login=$SONAR_TOKEN` via env, nunca em CLI inline. Rotação documentada no README. |

## 10. Cronograma de construção

| Marco | Data alvo | Conteúdo |
|---|---|---|
| Esqueleto do repo + base-image rodando | 18/05 | PX4 submódulo, Dockerfiles, ci.yml mínimo, 1 unit test verde |
| PR #1 mergeado + aula07.html pronta | 18/05 | Hello World CD funcional |
| PR #2 mergeado + aula08.html pronta | 21/05 | Métricas extraídas |
| PR #3 mergeado + aula09.html pronta | 25/05 | Testes refatorados |
| PR #4 mergeado + aula10.html pronta + release.yml | 27/05 | Quality gates + release |
| Smoke local validado em 2 máquinas distintas | 27/05 | Reprodutibilidade confirmada |

## 11. ADRs previstas

Conforme diretiva global do usuário (`~/.claude/CLAUDE.md`), cada decisão não-trivial vira ADR em `docs/adrs/`:

1. **ADR-001:** repo wrapper com PX4 como submódulo (vs. fork direto).
2. **ADR-002:** OpenChoreo simulado via re-tag GHCR (vs. infra real).
3. **ADR-003:** Gazebo headless no CI (vs. com render).
4. **ADR-004:** promoção entre ambientes via re-tag de imagem (vs. rebuild por ambiente).
5. **ADR-005:** thresholds de quality gates iniciais e processo de revisão.
6. **ADR-006:** SonarQube self-hosted (instância do instrutor) como SAST oficial do demo (vs. SonarCloud ou semgrep/bandit standalone). Documenta trade-off de manutenção vs. controle sobre regras.

## 12. Entregáveis desta spec

Ao final da Sprint 3:

- Repo `josercf/inteli-px4-cicd-demo` público, com 4 PRs históricos referenciados.
- 4 aulas HTML em Reveal.js no repo `inteli-2026-1b-t13-es10`.
- 4 walkthroughs em markdown (`docs/aulas/aulaNN-walkthrough.md`) — roteiro do instrutor.
- 6 ADRs.
- README com instruções de smoke local em <10 minutos.
- Projeto criado na instância Sonar do instrutor com chave `inteli-px4-cicd-demo`, Quality Gate "Sonar Way" associado, e branch `main` analisada.

## 12.1. Pré-requisitos do instrutor (José)

Antes do PR #1:

- Instância SonarQube acessível publicamente em HTTPS (URL definida).
- Projeto criado no Sonar com chave `inteli-px4-cicd-demo`.
- Token de análise gerado (escopo: apenas esse projeto).
- Secrets adicionados no repo GitHub: `SONAR_HOST_URL`, `SONAR_TOKEN`.
- Quality Gate associado ao projeto (recomendado: "Sonar Way" para começar; customizar via ADR-005 depois).

## 13. Próximo passo

Após aprovação desta spec, gerar plano de implementação detalhado (via skill `writing-plans`) com tarefas ordenadas, arquivos a criar/editar, e checkpoints de validação por aula.
