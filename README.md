# inteli-2026-1b-t13-es10

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
