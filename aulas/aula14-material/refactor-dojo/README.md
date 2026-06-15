# Refactor Dojo, Aula 14

Em duplas. Escolha 1 dos 3 trechos abaixo (do repo `inteli-px4-cicd-demo`). Clone o demo, faça checkout de uma branch nova, refatore in-place.

## Trechos disponíveis

1. **`tools/extract_metrics.py`**: função `extract_kpis(ulog_path)` com ~50 linhas, KPIs hardcoded como string em 6 lugares. Sugestão: enum + dataclass.
2. **`tools/run_mission.py`**: takeoff, 4 waypoints, land com retry inline, `asyncio.sleep(2)` espalhado, magic numbers. Sugestão: `Mission(plan)` com fases nomeadas.
3. **`libs/drone_modeling/`**: cálculos físicos com 12 constantes top-level e funções recebendo 8 args primitivos. Sugestão: dataclass `DroneConfig` + métodos.

## Critério de aceitação

1. Diff cabe em até 100 linhas.
2. Pelo menos 1 das 5 heurísticas do Bloco 2 é endereçada (escreva qual no commit).
3. Testes existentes passam sem modificação (rode `pytest tests/unit/test_<modulo>.py`).
4. README do trecho ganha 3 linhas explicando o "antes/depois" e por quê.
5. Pelo menos 1 trecho NÃO refatorado: o que vocês decidiram deixar e por quê.
