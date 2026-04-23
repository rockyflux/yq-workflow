# src Guide

`src/` contains the TypeScript implementation for the YQ workflow toolkit.

## Important Modules

- `commands/init.ts`: installs workflow assets and writes config
- `commands/menu.ts`: interactive entry menu
- `commands/update.ts`: reinstalls the latest workflow package
- `utils/installer.ts`: copies assets and removes them on uninstall
- `utils/config.ts`: reads and writes `~/.claude/.yq/config.toml`

## Design Notes

- The project is single-model and Claude-oriented.
- Avoid adding model-routing abstractions unless the product direction changes explicitly.
