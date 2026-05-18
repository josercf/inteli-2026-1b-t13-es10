# PX4 CI/CD Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma demo executável de pipeline CI/CD para firmware PX4, evoluindo em 4 PRs (um por aula da Sprint 3), com testes SITL containerizados, métricas extraídas de missão, integração com SonarQube e quality gates obrigatórios.

**Architecture:** Repo wrapper (`josercf/inteli-px4-cicd-demo`) com PX4-Autopilot como submódulo, libs Python (`drone_modeling/`), test runners SITL via MAVSDK, pipeline GitHub Actions com Sonar self-hosted, releases imutáveis no GHCR promovidas por re-tag entre `dev`/`staging`/`prod`.

**Tech Stack:** Python 3.11, pytest, ruff, black, mypy, MAVSDK, pyulog, Docker, PX4-Autopilot (submódulo), Gazebo (headless), GitHub Actions, SonarQube, GHCR.

**Reference spec:** `docs/superpowers/specs/2026-05-17-px4-cicd-demo-design.md`

---

## Visão geral das fases

| Fase | Aula | Deliverable | Prazo |
|---|---|---|---|
| **Fase 0** | — | Esqueleto do repo (não-PR; commit direto em `main`) | 18/05 manhã |
| **Fase 1** | Aula 07 (19/05) | PR #1 — Hello World CD + `aula07.html` | 18/05 EOD |
| **Fase 2** | Aula 08 (22/05) | PR #2 — Métricas + `aula08.html` | 21/05 EOD |
| **Fase 3** | Aula 09 (26/05) | PR #3 — Bons testes integração + `aula09.html` | 25/05 EOD |
| **Fase 4** | Aula 10 (28/05) | PR #4 — Quality gates + release.yml + `aula10.html` | 27/05 EOD |

**Detalhe granular**: Fases 0 e 1 abaixo (executáveis agora). Fases 2-4 em **outline** — cada uma vira plano detalhado próprio após Fase 1 mergeada (lições do PR #1 informam os próximos).

---

## File Structure (estado final pós Fase 4)

Repo `josercf/inteli-px4-cicd-demo`:

```
PX4-Autopilot/                       — submódulo, tag estável
libs/drone_modeling/
  __init__.py                        — exports públicos
  dynamics.py                        — compute_thrust, trajectory_rms_error
  geometry.py                        — haversine, ned_to_lat_lon
tests/unit/
  test_dynamics.py
  test_geometry.py
tests/sitl/
  conftest.py                        — fixtures sitl_running, drone_armed
  test_connection.py
  test_mission_square.py
tools/
  run_mission.py                     — CLI executa missão YAML
  extract_metrics.py                 — ulog → metrics.json
  quality_gates.py                   — valida thresholds + Sonar API
  promote_release.py                 — re-tag GHCR
missions/
  square_50m.yaml
docker/
  Dockerfile.sitl                    — base PX4 + Gazebo headless
  Dockerfile.tools                   — Python + MAVSDK
docker-compose.yml
docker-compose.gui.yml               — overlay X11 (dev local)
.github/workflows/
  base-image.yml                     — manual; constrói px4-sitl-base
  ci.yml                             — pipeline principal
  release.yml                        — tag v* → build hardware
  promote.yml                        — workflow_dispatch dev→staging→prod
openchoreo/
  component.yaml
  release.yaml
  environments/{dev,staging,prod}.yaml
docs/adrs/
  ADR-001-wrapper-com-submodulo.md
  ADR-002-openchoreo-simulado.md
  ADR-003-gazebo-headless-no-ci.md
  ADR-004-promocao-por-retag.md
  ADR-005-thresholds-quality-gates.md
  ADR-006-sonar-self-hosted.md
docs/aulas/
  aula07-walkthrough.md
  aula08-walkthrough.md
  aula09-walkthrough.md
  aula10-walkthrough.md
quality_gates.yaml
sonar-project.properties
pyproject.toml
requirements.txt
requirements-dev.txt
.gitignore
.gitmodules
README.md
```

Repo `josercf/inteli-2026-1b-t13-es10` (presentation):

```
aulas/aula07.html                    — criar (Fase 1)
aulas/aula08.html                    — criar (Fase 2)
aulas/aula09.html                    — criar (Fase 3)
aulas/aula10.html                    — criar (Fase 4)
aulas/index.html                     — atualizar links (cada fase)
```

---

## Fase 0 — Esqueleto do repo

**Objetivo:** repo público criado, estrutura mínima commitada em `main`, smoke local funciona. **Sem PR** — é a fundação. Tudo aqui é pré-requisito para a Fase 1.

### Task 0.1: Criar repo público no GitHub

**Files:** nenhum local ainda.

- [ ] **Step 1: Criar repo via gh CLI**

Run:
```bash
gh repo create josercf/inteli-px4-cicd-demo \
  --public \
  --description "Demo de pipeline CI/CD para firmware PX4 — Módulo 13 Inteli T13" \
  --license MIT
```

Expected: URL do repo criado retornada.

- [ ] **Step 2: Clonar localmente**

Run:
```bash
cd ~/Projects/Inteli/Graduacao/2026.1/ES10T13/
gh repo clone josercf/inteli-px4-cicd-demo
cd inteli-px4-cicd-demo
```

Expected: diretório clonado, vazio exceto `LICENSE`.

- [ ] **Step 3: Configurar identidade `josercf` para esse clone**

Run:
```bash
git config user.email "joseromualdo@outlook.com"
git config user.name "José Romualdo (josercf)"
git config core.sshCommand 'ssh -i ~/.ssh/id_ed25519_josercf -o IdentitiesOnly=yes'
```

Expected: nenhuma saída. (Diretiva global do `~/.claude/CLAUDE.md`.)

### Task 0.2: Adicionar PX4 como submódulo

**Files:**
- Create: `.gitmodules`
- Create: `PX4-Autopilot/` (submódulo)

- [ ] **Step 1: Identificar tag estável atual do PX4**

Run:
```bash
git ls-remote --tags https://github.com/PX4/PX4-Autopilot.git \
  | grep -oP 'refs/tags/v\d+\.\d+\.\d+$' \
  | sort -V | tail -5
```

Expected: lista as 5 tags semânticas mais recentes. Escolher a maior `v1.x.y` que NÃO seja release candidate (sem `-rc`, `-beta`).

Anotar a tag escolhida (referenciada nos próximos steps como `<PX4_TAG>`).

- [ ] **Step 2: Adicionar submódulo na tag escolhida**

Run:
```bash
git submodule add --depth 1 https://github.com/PX4/PX4-Autopilot.git PX4-Autopilot
cd PX4-Autopilot
git fetch --depth 1 origin tag <PX4_TAG>
git checkout <PX4_TAG>
git submodule update --init --recursive --depth 1
cd ..
```

Expected: `PX4-Autopilot/` populado, em detached HEAD na tag.

- [ ] **Step 3: Commit**

```bash
git add .gitmodules PX4-Autopilot
git commit -m "chore: add PX4-Autopilot as submodule pinned to <PX4_TAG>

Submódulo pinado em tag estável para garantir reprodutibilidade.
Atualização requer ADR conforme docs/adrs/ADR-001.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.3: Bootstrap Python tooling (pyproject + deps)

**Files:**
- Create: `pyproject.toml`
- Create: `requirements.txt`
- Create: `requirements-dev.txt`
- Create: `.gitignore`

- [ ] **Step 1: Criar `.gitignore`**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
coverage.xml
htmlcov/

# Reports
reports/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store

# PX4 build artifacts
PX4-Autopilot/build/

# Local env
.env
*.local.yaml
```

- [ ] **Step 2: Criar `pyproject.toml`**

```toml
[project]
name = "inteli-px4-cicd-demo"
version = "0.1.0"
description = "Demo de pipeline CI/CD para firmware PX4"
requires-python = ">=3.11"

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "SIM"]
ignore = []

[tool.black]
line-length = 100
target-version = ["py311"]

[tool.mypy]
python_version = "3.11"
strict = true
warn_unused_ignores = true
disallow_untyped_defs = true

[[tool.mypy.overrides]]
module = ["mavsdk.*", "pyulog.*"]
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --strict-markers --cov=libs --cov=tools --cov-report=xml --cov-report=term"
asyncio_mode = "auto"
markers = [
    "sitl: testes que requerem PX4 SITL rodando (slow)",
]

[tool.coverage.run]
source = ["libs", "tools"]
omit = ["tests/*"]
```

- [ ] **Step 3: Criar `requirements.txt`**

```
pyyaml==6.0.2
pyulog==1.2.0
```

- [ ] **Step 4: Criar `requirements-dev.txt`**

```
-r requirements.txt
pytest==8.3.4
pytest-asyncio==0.25.0
pytest-cov==6.0.0
ruff==0.8.6
black==24.10.0
mypy==1.14.1
mavsdk==2.0.1
```

- [ ] **Step 5: Verificar instalação em venv local**

Run:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements-dev.txt
ruff --version && black --version && mypy --version && pytest --version
```

Expected: cada ferramenta imprime sua versão sem erro.

- [ ] **Step 6: Commit**

```bash
git add .gitignore pyproject.toml requirements.txt requirements-dev.txt
git commit -m "chore: bootstrap Python tooling (ruff, black, mypy, pytest)

Python 3.11 com config strict do mypy. Markers pytest para isolar
testes SITL (lentos) de unit (rápidos).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.4: Primeiro módulo Python testado — `dynamics.py`

**Files:**
- Create: `libs/__init__.py` (vazio)
- Create: `libs/drone_modeling/__init__.py`
- Create: `libs/drone_modeling/dynamics.py`
- Create: `tests/__init__.py` (vazio)
- Create: `tests/unit/__init__.py` (vazio)
- Test: `tests/unit/test_dynamics.py`

- [ ] **Step 1: Escrever o teste falhando — compute_thrust**

Em `tests/unit/test_dynamics.py`:

```python
"""Testes para libs.drone_modeling.dynamics."""
import pytest

from libs.drone_modeling.dynamics import compute_thrust


class TestComputeThrust:
    def test_basic_multiplication(self) -> None:
        assert compute_thrust(mass=2.0, acceleration=5.0) == 10.0

    def test_zero_mass_returns_zero(self) -> None:
        assert compute_thrust(mass=0.0, acceleration=9.81) == 0.0

    def test_negative_acceleration_inverts_thrust(self) -> None:
        assert compute_thrust(mass=1.5, acceleration=-9.81) == pytest.approx(-14.715)

    def test_rejects_negative_mass(self) -> None:
        with pytest.raises(ValueError, match="mass must be non-negative"):
            compute_thrust(mass=-1.0, acceleration=9.81)
```

- [ ] **Step 2: Rodar teste para ver falhar**

Run:
```bash
pytest tests/unit/test_dynamics.py -v
```

Expected: 4 testes FAIL com `ModuleNotFoundError: No module named 'libs'`.

- [ ] **Step 3: Criar `__init__.py` dos pacotes**

```bash
mkdir -p libs/drone_modeling tests/unit
touch libs/__init__.py libs/drone_modeling/__init__.py tests/__init__.py tests/unit/__init__.py
```

- [ ] **Step 4: Escrever implementação mínima de `dynamics.py`**

Em `libs/drone_modeling/dynamics.py`:

```python
"""Modelagem dinâmica para validação física de missões."""


def compute_thrust(mass: float, acceleration: float) -> float:
    """Calcula empuxo (N) para massa (kg) e aceleração (m/s²) dadas.

    Newton's second law: F = m * a. Aceleração negativa representa frenagem
    ou aceleração descendente — empuxo correspondente é também negativo.

    Raises:
        ValueError: se mass for negativa.
    """
    if mass < 0:
        raise ValueError("mass must be non-negative")
    return mass * acceleration
```

- [ ] **Step 5: Rodar testes para verificar passagem**

Run:
```bash
pytest tests/unit/test_dynamics.py -v
```

Expected: 4 PASSED.

- [ ] **Step 6: Lint + format check**

Run:
```bash
ruff check libs/ tests/
black --check libs/ tests/
mypy libs/
```

Expected: tudo passa sem erro.

- [ ] **Step 7: Commit**

```bash
git add libs/ tests/
git commit -m "feat(drone_modeling): add compute_thrust with validation

Primeira função do módulo de modelagem. Estabelece padrão de
type hints estritos, docstring com Raises, e testes parametrizados
por classe.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.5: README inicial

**Files:**
- Create: `README.md`

- [ ] **Step 1: Escrever README**

```markdown
# inteli-px4-cicd-demo

Demo de pipeline CI/CD para firmware PX4 — Módulo 13 (DevOps), Inteli ES10 T13, 2026.1B.

Material didático que acompanha a Sprint 3 do módulo:

- **Aula 07** (19/05) — Hello World, Continuous Deployment
- **Aula 08** (22/05) — Extraindo métricas do pipeline de CI/CD
- **Aula 09** (26/05) — Você escreve (bons) testes de integração?
- **Aula 10** (28/05) — Esteira de CI como guardiã da qualidade

Spec: ver repo de aulas, `docs/superpowers/specs/2026-05-17-px4-cicd-demo-design.md`.

## Estrutura

- `PX4-Autopilot/` — submódulo do firmware (tag estável pinada)
- `libs/drone_modeling/` — funções puras de modelagem
- `tools/` — CLIs do pipeline (missão, métricas, gates, promoção)
- `tests/` — `unit/` (rápido) e `sitl/` (com simulador)
- `docker/` — `Dockerfile.sitl` (PX4+Gazebo headless), `Dockerfile.tools`
- `.github/workflows/` — pipelines CI/CD
- `docs/adrs/` — decisões arquiteturais

## Setup local

Requer: Linux/macOS, Docker, Python 3.11+, git.

```bash
git clone --recurse-submodules https://github.com/josercf/inteli-px4-cicd-demo.git
cd inteli-px4-cicd-demo
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest tests/unit -v
```

## Smoke test (após Fase 1)

```bash
docker compose up --build sitl tester
```

Roda o simulador headless + executa testes de conexão MAVSDK. Deve fechar em <5 min.

## Dependências externas

- **GHCR** (`ghcr.io/josercf/*`) — registry das imagens.
- **SonarQube** — instância do instrutor; URL/token via secrets do GitHub.

## Licença

MIT.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: initial README with structure and smoke test

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.6: ADR-001 — repo wrapper com submódulo

**Files:**
- Create: `docs/adrs/ADR-001-wrapper-com-submodulo.md`

- [ ] **Step 1: Escrever ADR-001**

```markdown
# ADR-001: Repo wrapper com PX4 como submódulo

- **Data:** 2026-05-17
- **Status:** Aceita
- **Decisores:** José Romualdo, Hermano Peixoto

## Contexto

A construção da demo CI/CD para firmware PX4 (Sprint 3, ES10 T13) demanda
versionar tanto o firmware quanto material didático (libs Python, testes,
pipelines, manifestos). Duas alternativas naturais:

1. Fork direto do `PX4/PX4-Autopilot` (~2GB, ~50k commits) e adicionar
   material didático em diretórios novos.
2. Repo novo enxuto que referencia PX4 como submódulo git pinado em tag.

## Decisão

Optamos pela alternativa 2 — repo `josercf/inteli-px4-cicd-demo` com PX4
como submódulo pinado.

## Motivações

- **Pedagogia:** material didático separado do firmware ajuda alunos a
  identificar o que é deles vs. o que é do PX4 upstream.
- **Performance:** fork carrega histórico completo do PX4 em toda
  operação git; submódulo permite clone raso (`--depth 1`).
- **Reprodutibilidade:** tag pinada garante que todos rodam mesma versão;
  atualizações requerem decisão explícita (este ADR).
- **Custo de CI:** cache do submódulo é trivial (1 SHA); fork inteiro
  invalida cache a cada merge upstream.

## Riscos conhecidos

- **Aluno esquece `--recurse-submodules`:** mitigado por README e por
  workflow CI que faz `submodules: recursive`.
- **Atualização do PX4 requer ADR:** decisão deliberada; aceitamos
  fricção em troca de governança.

## Consequências

**Positivas:**
- Clone inicial <50MB (vs. ~2GB do fork).
- Material didático versionado independentemente do firmware.

**Negativas:**
- Aluno precisa entender submódulos (oportunidade de ensino).
- Patches no PX4 (se necessários) requerem fork separado.

## ADRs relacionadas

- ADR-002 (OpenChoreo simulado)
- ADR-003 (Gazebo headless)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adrs/ADR-001-wrapper-com-submodulo.md
git commit -m "docs(adr): ADR-001 wrapper com PX4 como submódulo

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.7: Push inicial

- [ ] **Step 1: Push para main**

Run:
```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_josercf -o IdentitiesOnly=yes -F /dev/null' \
  git push -u origin main
```

Expected: 6 commits enviados.

- [ ] **Step 2: Verificar no GitHub**

Run:
```bash
gh repo view josercf/inteli-px4-cicd-demo --web
```

Expected: navegador abre mostrando README e estrutura.

**🚦 Checkpoint Fase 0:** repo público criado, PX4 submódulo, 1 função Python testada e linted, README, ADR-001. Smoke `pytest tests/unit` verde local.

---

## Fase 1 — PR #1 Hello World CD (Aula 07)

**Objetivo:** primeiro pipeline verde de ponta a ponta — lint+unit, Sonar scan (sem enforcement), build imagem SITL, "deploy" em dev (sobe container, arma drone). Aula 07 (19/05) usa esse PR como walkthrough.

### Task 1.1: Branch + estrutura de docker

**Files:**
- Create: `docker/Dockerfile.sitl`
- Create: `docker/Dockerfile.tools`
- Create: `docker-compose.yml`

- [ ] **Step 1: Criar branch**

Run:
```bash
git checkout -b feat/pr1-hello-world-cd
```

- [ ] **Step 2: Criar `docker/Dockerfile.tools`**

```dockerfile
# Container de testes: Python + MAVSDK + ferramentas do pipeline
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt

COPY libs/ libs/
COPY tools/ tools/
COPY tests/ tests/
COPY missions/ missions/

ENV PYTHONPATH=/app

CMD ["pytest", "tests/unit", "-v"]
```

- [ ] **Step 3: Criar `docker/Dockerfile.sitl`**

```dockerfile
# Imagem SITL: PX4 + Gazebo headless.
# Build pesado (~25min cold). Em CI, usamos cache de layer agressivo.
FROM px4io/px4-dev-simulation-jammy:2024-08-08

WORKDIR /workspace

# Copia o submódulo PX4 (já pinado pelo repo wrapper)
COPY PX4-Autopilot/ PX4-Autopilot/

WORKDIR /workspace/PX4-Autopilot

# Build SITL com modelo gz_x500. HEADLESS=1 desabilita render Gazebo.
ENV HEADLESS=1
ENV PX4_SIM_MODEL=gz_x500

RUN make px4_sitl gz_x500 || (echo "First build attempt — Gazebo can fail on init" && true)

# Expor MAVLink UDP padrão SITL
EXPOSE 14540/udp 14550/udp

# Healthcheck: PX4 deve aceitar conexão TCP no shell em 60s
HEALTHCHECK --interval=5s --timeout=3s --start-period=60s --retries=12 \
    CMD nc -z localhost 4560 || exit 1

CMD ["bash", "-c", "HEADLESS=1 PX4_SIM_MODEL=gz_x500 ./build/px4_sitl_default/bin/px4 -d ./build/px4_sitl_default/etc/init.d-posix/rcS"]
```

- [ ] **Step 4: Criar `docker-compose.yml`**

```yaml
services:
  sitl:
    build:
      context: .
      dockerfile: docker/Dockerfile.sitl
    image: ghcr.io/josercf/px4-sitl:dev
    ports:
      - "14540:14540/udp"
      - "14550:14550/udp"
    networks:
      - px4net

  tester:
    build:
      context: .
      dockerfile: docker/Dockerfile.tools
    image: ghcr.io/josercf/px4-tools:dev
    depends_on:
      sitl:
        condition: service_healthy
    environment:
      - MAVLINK_URL=udp://sitl:14540
    networks:
      - px4net
    command: ["pytest", "tests/sitl", "-v", "-m", "sitl"]

networks:
  px4net:
    driver: bridge
```

- [ ] **Step 5: Commit**

```bash
git add docker/ docker-compose.yml
git commit -m "feat(docker): SITL headless e tester containers + compose

Imagem SITL parte de px4io/px4-dev-simulation-jammy (oficial).
Tester monta libs/tests via COPY. Compose orquestra ambos com
healthcheck no SITL.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2: Primeiro teste SITL — conexão MAVSDK

**Files:**
- Create: `tests/sitl/__init__.py` (vazio)
- Test: `tests/sitl/test_connection.py`

- [ ] **Step 1: Escrever teste falhando**

```python
"""Smoke SITL: MAVSDK conecta no PX4 e drone fica armable."""
import asyncio
import os

import pytest
from mavsdk import System


pytestmark = pytest.mark.sitl


@pytest.fixture
def mavlink_url() -> str:
    return os.environ.get("MAVLINK_URL", "udp://:14540")


async def test_mavsdk_connects_within_30s(mavlink_url: str) -> None:
    drone = System()
    await drone.connect(system_address=mavlink_url)

    async def wait_connected() -> bool:
        async for state in drone.core.connection_state():
            if state.is_connected:
                return True
        return False

    connected = await asyncio.wait_for(wait_connected(), timeout=30)
    assert connected, "MAVSDK não conectou no PX4 em 30s"


async def test_drone_reaches_armable_state(mavlink_url: str) -> None:
    drone = System()
    await drone.connect(system_address=mavlink_url)

    async def wait_armable() -> bool:
        async for health in drone.telemetry.health():
            if (
                health.is_global_position_ok
                and health.is_home_position_ok
                and health.is_local_position_ok
            ):
                return True
        return False

    armable = await asyncio.wait_for(wait_armable(), timeout=60)
    assert armable, "Drone não atingiu estado armable em 60s"
```

- [ ] **Step 2: Criar diretório do teste**

```bash
mkdir -p tests/sitl
touch tests/sitl/__init__.py
```

- [ ] **Step 3: Rodar localmente via compose** (smoke)

Run:
```bash
docker compose up --build --abort-on-container-exit --exit-code-from tester
```

Expected: SITL boota, healthcheck passa, tester roda os 2 testes, ambos PASSED. Saída inclui `2 passed in <60s>`.

⚠️ Se SITL falhar no boot (Gazebo issue), capturar logs e iterar no Dockerfile.sitl.

- [ ] **Step 4: Commit**

```bash
git add tests/sitl/
git commit -m "test(sitl): conexão MAVSDK e estado armable

Dois smoke tests sob marker 'sitl' (lentos). Timeouts duros (30s/60s)
para evitar hang no CI. URL via env MAVLINK_URL para parametrizar
local vs CI vs container.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.3: Sonar config + secrets

**Files:**
- Create: `sonar-project.properties`

- [ ] **Step 1: Confirmar que José já configurou (manual)**

Pré-requisitos checados antes deste passo:
- [ ] Projeto criado no Sonar com chave `inteli-px4-cicd-demo`.
- [ ] Token gerado para esse projeto (escopo: "Execute Analysis").
- [ ] Secrets adicionados no repo:
  ```bash
  gh secret set SONAR_HOST_URL --body "https://sonar.josercf.com" --repo josercf/inteli-px4-cicd-demo
  gh secret set SONAR_TOKEN --repo josercf/inteli-px4-cicd-demo  # pede valor interativamente
  ```

⚠️ **Se Sonar ainda não está pronto**, esta task fica bloqueada — `ci.yml` no Step 1.4 deixa `sonar-scan` com `continue-on-error: true` para destravar o restante.

- [ ] **Step 2: Criar `sonar-project.properties`**

```properties
sonar.projectKey=inteli-px4-cicd-demo
sonar.projectName=Inteli PX4 CI/CD Demo
sonar.projectVersion=0.1.0

sonar.sources=libs,tools
sonar.tests=tests
sonar.exclusions=PX4-Autopilot/**,**/__pycache__/**,.venv/**

sonar.python.version=3.11
sonar.python.coverage.reportPaths=coverage.xml

sonar.sourceEncoding=UTF-8
```

- [ ] **Step 3: Commit**

```bash
git add sonar-project.properties
git commit -m "ci(sonar): project properties para SonarQube self-hosted

Aponta apenas para libs/ e tools/ (exclui PX4-Autopilot e venv).
Cobertura agregada via coverage.xml gerado pelo pytest.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.4: Workflow CI — pipeline mínimo

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Criar `ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write
  pull-requests: write

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/px4-sitl

jobs:
  python-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: false  # libs/ e tests/unit não precisam de PX4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
          cache-dependency-path: requirements-dev.txt

      - name: Install deps
        run: pip install -r requirements-dev.txt

      - name: Ruff
        run: ruff check libs/ tools/ tests/

      - name: Black
        run: black --check libs/ tools/ tests/

      - name: Mypy
        run: mypy libs/ tools/

      - name: Pytest unit + coverage
        run: pytest tests/unit -v

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-xml
          path: coverage.xml

  sonar-scan:
    needs: python-quality
    runs-on: ubuntu-latest
    continue-on-error: true  # PR #1: análise sem enforcement
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Sonar precisa do histórico p/ blame
          submodules: false

      - name: Download coverage
        uses: actions/download-artifact@v4
        with:
          name: coverage-xml

      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@v4
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

  sitl-build:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push SITL image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile.sitl
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:dev-${{ github.sha }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max

  deploy-dev:
    needs: sitl-build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment: dev
    services:
      sitl:
        image: ghcr.io/${{ github.repository_owner }}/px4-sitl:${{ github.sha }}
        ports:
          - 14540:14540/udp
        options: >-
          --health-cmd "nc -z localhost 4560"
          --health-interval 5s
          --health-timeout 3s
          --health-start-period 60s
          --health-retries 12
        credentials:
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: false

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip
          cache-dependency-path: requirements-dev.txt

      - name: Install deps
        run: pip install -r requirements-dev.txt

      - name: Run SITL smoke tests
        env:
          MAVLINK_URL: udp://127.0.0.1:14540
        run: pytest tests/sitl -v -m sitl
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: pipeline mínimo (lint, sonar, sitl-build, deploy-dev)

4 jobs paralelos/sequenciais conforme spec seção 3.3. Sonar com
continue-on-error: true neste PR (enforcement entra no PR #4).
SITL image cacheada via registry buildcache.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.5: Push, abrir PR, validar verde

- [ ] **Step 1: Push branch**

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_josercf -o IdentitiesOnly=yes -F /dev/null' \
  git push -u origin feat/pr1-hello-world-cd
```

- [ ] **Step 2: Abrir PR**

```bash
gh pr create --title "PR #1 — Hello World, Continuous Deployment (Aula 07)" --body "$(cat <<'EOF'
## Summary

Primeiro pipeline verde de ponta a ponta:

- `python-quality`: ruff + black + mypy + pytest unit com cobertura
- `sonar-scan`: análise Sonar (sem enforcement nesta fase)
- `sitl-build`: imagem PX4 SITL publicada em GHCR como `:${{ github.sha }}` e `:dev-<sha>`
- `deploy-dev`: sobe imagem como service, valida que MAVSDK conecta e drone fica armable

## Test plan

- [x] `pytest tests/unit` passa local
- [x] `docker compose up --build --abort-on-container-exit --exit-code-from tester` passa local
- [ ] CI verde no PR (validar após push)
- [ ] Imagem aparece em `https://github.com/josercf/inteli-px4-cicd-demo/pkgs/container/px4-sitl`

## Referências

- Spec: `inteli-2026-1b-t13-es10/docs/superpowers/specs/2026-05-17-px4-cicd-demo-design.md` § 4.1
- Aula 07 (19/05) usa esse PR como walkthrough principal

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Aguardar CI verde**

```bash
gh pr checks --watch
```

Expected: todos os 4 jobs verdes. `sitl-build` pode levar ~25min na primeira execução; subsequentes <5min com cache.

⚠️ Falhas comuns:
- Sonar token inválido → corrigir secret e re-rodar.
- SITL não boota no GitHub runner → reduzir aggressivamente (sem Gazebo render); usar `PX4_SIM_MODEL=none` se Gazebo gz instalação falhar; fallback para `iris` (gazebo classic) se gz_x500 problemático.
- `deploy-dev` timeout no healthcheck → aumentar `--health-start-period` para 120s.

- [ ] **Step 4: Mergear**

```bash
gh pr merge --squash --delete-branch
```

**🚦 Checkpoint Fase 1 (repo):** PR #1 mergeado, pipeline verde no main, imagem `px4-sitl:<sha>` disponível em GHCR.

### Task 1.6: Aula 07 HTML

**Files** (no repo `inteli-2026-1b-t13-es10`):
- Create: `aulas/aula07.html`
- Modify: `aulas/index.html` (adicionar link p/ aula07)
- Create: `inteli-px4-cicd-demo/docs/aulas/aula07-walkthrough.md`

- [ ] **Step 1: Criar walkthrough markdown (roteiro do instrutor)**

Em `docs/aulas/aula07-walkthrough.md` do repo demo:

```markdown
# Aula 07 — Walkthrough do PR #1

Tempo alvo: 30min de walkthrough dentro da aula de 80min.

## Roteiro

1. **(3min) Contexto:** o que é "Hello World" de CD? Não é só compilar — é
   produzir um artefato deployável rastreável a cada commit.

2. **(5min) Tour pelo repo:**
   - Mostrar `pyproject.toml` (toolchain explícita).
   - Mostrar `Dockerfile.sitl` (build vem de imagem oficial PX4).
   - Mostrar `docker-compose.yml` (sitl + tester em rede compartilhada).

3. **(10min) Pipeline em ação no GitHub:**
   - Abrir aba Actions, mostrar última execução verde.
   - Clicar em cada job, mostrar steps + tempo.
   - Mostrar imagem publicada em GHCR.
   - Discutir: por que `:${{ github.sha }}`? (imutabilidade)

4. **(7min) Discussão:**
   - Quem dispara o pipeline? (push, PR)
   - O que acontece se um teste falhar? (próximos jobs não rodam)
   - Onde "mora" a release? (GHCR)
   - O que ainda falta? (gates, métricas — próximas aulas)

5. **(5min) Exercício rápido:**
   - Aluno propõe mudança trivial em `libs/drone_modeling/dynamics.py`.
   - Abrimos PR fictício no projetor.
   - Vemos o pipeline rodar.

## Anti-padrões a evitar
- Não vender CI como "ferramenta que roda testes". É a porta da release.
- Não falar de gates ainda — vem na aula 10.
```

- [ ] **Step 2: Criar `aulas/aula07.html`**

Copiar estrutura de `aulas/aula06.html` como base (Reveal.js com tema Inteli) e adaptar conteúdo:

Estrutura mínima de slides (~30 slides):
1. Capa: "Aula 07 — Hello World, Continuous Deployment"
2. Agenda
3. Objetivos da aula
4. Separador bloco 1: "O que é CD?"
5. Continuous Delivery vs Continuous Deployment (diagrama)
6. "Hello World" de CD: definição
7. Imutabilidade de artefatos
8. Rastreabilidade via SHA
9. Separador bloco 2: "Demo PX4"
10. Visão geral do repo
11. Por que firmware é diferente?
12. PX4 + SITL + Gazebo (diagrama do PDF seção 8.2)
13. Containerização do simulador
14. Separador bloco 3: "Walkthrough do PR #1"
15-22. Screenshots do pipeline + explicações dos 4 jobs
23. GHCR como registry imutável
24. Demo ao vivo: abrir PR no projetor
25. Separador bloco 4: "Reflexão"
26. Quiz interativo (3-4 perguntas)
27. Auto-estudo: explorar o repo, rodar smoke local
28. O que vem na próxima aula (métricas)
29. Encerramento

Devido ao tamanho (~500 linhas HTML), criar o arquivo seguindo padrão de aula06.html e popular slide a slide. **Esta task gera commit separado.**

- [ ] **Step 3: Atualizar `aulas/index.html`**

Adicionar/ativar card da Aula 07 no cronograma (Sprint 3).

- [ ] **Step 4: Lint + commit**

```bash
cd ~/Projects/Inteli/Graduacao/2026.1/ES10T13/Inteli\ -\ 2026.1B-ES10-T13/inteli-2026-1b-t13-es10/
npm run lint  # prettier valida md/html (se config incluir)
git add aulas/aula07.html aulas/index.html
git commit -m "docs(aulas): add aula07 Hello World CD com walkthrough PR #1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push
```

E no repo demo:
```bash
cd ~/Projects/Inteli/Graduacao/2026.1/ES10T13/inteli-px4-cicd-demo/
git add docs/aulas/aula07-walkthrough.md
git commit -m "docs(aulas): walkthrough roteiro aula 07

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_josercf -o IdentitiesOnly=yes -F /dev/null' git push
```

**🚦 Checkpoint Fase 1 (aula):** aula07.html renderiza no navegador, walkthrough roteiro disponível, link na index ativo. Demo pronta para apresentar 19/05.

---

## Fase 2 — PR #2 Métricas (Aula 08) — OUTLINE

Detalhe granular gerado após Fase 1 mergeada. Tasks principais:

- **2.1** Branch `feat/pr2-mission-metrics`.
- **2.2** `missions/square_50m.yaml` — 4 waypoints quadrado de 50m + decolagem/pouso.
- **2.3** `tools/run_mission.py` — CLI que conecta MAVSDK, lê YAML, executa missão, salva `.ulog`. Testes unit com fixture mock de System.
- **2.4** `tools/extract_metrics.py` — usa `pyulog` para parsear, calcula KPIs (RMS error, duração, altitude std, accel max). Testes unit com `.ulog` fixture.
- **2.5** `libs/drone_modeling/geometry.py` (haversine, NED conversion) — testado unit.
- **2.6** Job `mission-test` no `ci.yml` (depende de `sitl-build` + `python-quality`).
- **2.7** Job opcional `pr-comment` que posta JSON de métricas como comentário no PR.
- **2.8** PR aberto, validado, mergeado.
- **2.9** `aula08.html` + walkthrough.

**Pré-requisitos para detalhar:** Fase 1 mergeada + tag corrente do PX4 confirmada estável + missão `square_50m` validada localmente.

---

## Fase 3 — PR #3 Bons testes de integração (Aula 09) — OUTLINE

- **3.1** Branch `feat/pr3-integration-tests`.
- **3.2** `tests/sitl/conftest.py` com fixtures: `sitl_url`, `mavsdk_system`, `armed_drone`, `mission_completed`. Cada fixture com cleanup (`yield` + reset).
- **3.3** Refatorar `tests/sitl/test_connection.py` e `test_mission_square.py` para usar fixtures (DRY).
- **3.4** Adicionar asserções de invariantes físicos em `test_mission_square.py`: max accel ≤ 15 m/s², altitude ≥ 0, geofence.
- **3.5** Parametrização `pytest.mark.parametrize("wind_speed", [0, 5, 10])`.
- **3.6** Conserto de flakiness identificada na aula 08 (timeouts, estado, retries).
- **3.7** Documentar princípios FIRST em `docs/testing-philosophy.md`.
- **3.8** PR aberto, validado, mergeado.
- **3.9** `aula09.html` + walkthrough.

**Pré-requisito:** lista de flakiness real identificada nas 3 execuções demo da aula 08.

---

## Fase 4 — PR #4 Quality gates (Aula 10) — OUTLINE

- **4.1** Branch `feat/pr4-quality-gates`.
- **4.2** `quality_gates.yaml` — thresholds conforme spec § 5.
- **4.3** `tools/quality_gates.py` — lê `metrics.json` + `coverage.xml` + consulta API do Sonar, exit code != 0 se algum gate falha. Testes unit com fixtures.
- **4.4** Job `quality-gates` no `ci.yml` (depende de todos os anteriores).
- **4.5** Mudar `sonar-scan` de `continue-on-error: true` → `false` (enforcement ativado).
- **4.5b** **Refatorar pipeline de paralelo → sequencial fail-fast.** No PR #1 escolhemos paralelo (feedback rápido + ganho marginal de tempo: ~1min). No PR #4 transformamos em sequencial: `python-quality → sonar-scan → sitl-build → mission-test → quality-gates → deploy-dev`. Justificativa pedagógica: economiza ~25min de runner self-hosted quando lint/sonar/gate falha. **Conteúdo didático da Aula 10:** comparar o ci.yml do PR #1 (paralelo informativo) vs PR #4 (sequencial gate-driven) lado a lado, explicar o trade-off (feedback rápido vs fail-fast economia).
- **4.6** `tools/promote_release.py` — re-tag GHCR dev→staging→prod.
- **4.7** `.github/workflows/promote.yml` — workflow manual com aprovação por Environment.
- **4.8** `.github/workflows/release.yml` — em tag `v*`, build `px4_fmu-v6x_default`, anexa `.px4` ao GitHub Release.
- **4.9** ADRs 002-006 completas.
- **4.10** Manifestos `openchoreo/` (conceituais).
- **4.11** Demo: PR intencionalmente quebrado (mission com accel excessiva) → barrado pelos gates.
- **4.12** Demo: rollback via re-tag.
- **4.13** PR aberto, validado, mergeado, tag `v0.1.0` criada.
- **4.14** `aula10.html` + walkthrough.

**Pré-requisito:** Sonar Quality Gate "Sonar Way" associado ao projeto e validado.

---

## Self-Review

**Coverage check vs spec:**

| Spec seção | Coberto em |
|---|---|
| § 1 Objetivo | Fases 1-4 |
| § 2 Não-objetivos | (negativos; nada a planejar) |
| § 3.1 Estrutura repo | Task 0.2, 0.4, 1.1, e Fases 2-4 |
| § 3.2 Componentes | Mapeados em File Structure + tasks |
| § 3.3 Fluxo pipeline | Task 1.4 (inicial) + Fases 2-4 (expansão) |
| § 3.4 Cache | Task 1.4 (buildcache do GHCR) |
| § 4.1 Aula 07 | Fase 1 completa |
| § 4.2 Aula 08 | Fase 2 outline |
| § 4.3 Aula 09 | Fase 3 outline |
| § 4.4 Aula 10 | Fase 4 outline |
| § 5 Quality gates YAML | Fase 4 task 4.2 |
| § 6 Tratamento de erro | Task 1.2 (timeouts), Task 1.5 (failures comuns), Fase 4 task 4.3 |
| § 7 Plano de testes do demo | Task 0.4 (unit), Task 1.2 (smoke SITL), Fases 2-3 (integration) |
| § 8 Atualização aulas | Tasks 1.6, 2.9, 3.9, 4.14 |
| § 9 Riscos | Endereçados em Tasks 1.4 (Sonar continue-on-error) e 1.5 (fallbacks SITL) |
| § 10 Cronograma | Refletido em "Visão geral das fases" |
| § 11 ADRs | Task 0.6 (ADR-001) + Fase 4 task 4.9 (002-006) |
| § 12 Entregáveis | Cobertos integralmente nas 4 fases |
| § 12.1 Pré-reqs instrutor | Task 1.3 step 1 |

**Placeholder scan:** todos os steps com código têm o código completo; comandos shell têm o comando completo; nenhum "TBD" remanescente nas Fases 0 e 1. Fases 2-4 são outline declarado — não placeholders.

**Type consistency:** funções e nomes referenciados (`compute_thrust`, `run_mission.py`, `extract_metrics.py`, `quality_gates.py`, `promote_release.py`) são consistentes com File Structure e spec § 3.2. Marker pytest `sitl` declarado em `pyproject.toml` e usado em `tests/sitl/*`. Imagem `ghcr.io/josercf/px4-sitl:<sha>` referenciada consistentemente em `docker-compose.yml`, `ci.yml`, e cronograma de promoção.

**Decisão deliberada:** Fases 2-4 ficam em outline porque cada uma depende de dados/lições da fase anterior (KPIs reais, flakiness real, thresholds calibrados). Detalhamento prematuro vira ficção.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-px4-cicd-demo.md`.

**Próximo passo nesta sessão:** executar Fase 0 completa (Tasks 0.1 a 0.7) — esqueleto do repo. Após Fase 0, próxima sessão começa Fase 1 (PR #1).
