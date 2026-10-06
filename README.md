# pandymic.com

The built, publicly served files of **[pandymic.com](https://pandymic.com/)**: Michal Pandyra, digital infrastructure specialist and application developer.

This repository is **generated**. It is produced by `npm run build` from a private source repository and
replaced on every release, so please don't edit files or open pull requests here; changes would be overwritten.

## How it is served

The repository root is the website root. A small deployer on the server downloads the tarball of a specific
commit, extracts it into a new release directory and atomically switches the site to it. Root-level
`README*`, `LICENSE*` and `.git*` entries are not deployed. Server configuration (security headers, caching,
redirects) lives on the server, not in this repository.

## Licences

- Site content, images and code: © 2026 Michal Pandyra. All rights reserved.
- Fonts in `fonts/`: SIL Open Font License 1.1, self-hosted via [Fontsource](https://fontsource.org/). Licence texts are in [`LICENSES/`](LICENSES/).
