# Primeiro protótipo — Foundry v13/v14

Room oficial VDO.Ninja em um iframe local por cliente, com Stream IDs estáveis associados aos usuários Foundry, label do usuário, dock ApplicationV2 nas cinco posições, preferências individuais, áudio configurável, opções nativas de self-preview e links solo OBS.

Instale pelo manifest no Foundry:

https://raw.githubusercontent.com/henriquebot/rpgup-vdo-ninja/main/module.json

O manifest e o pacote de instalação estão nos assets desta pré-release. O arquivo de código-fonte automático do GitHub não é o pacote de instalação.

**Use um World separado para testar.** Compatibilidade funcional com v13/v14, câmera, visão mútua, menus nativos, Director, PiP e OBS ainda precisam da prova real com 1 GM e 2 jogadores. Testes unitários e de fixture não substituem essa validação. Consulte `docs/PROTOTYPE-RESULTS.md` no repositório.

O gate permanece pendente. Avatar, presets e expansão para 4–6 participantes ficam depois da prova. Não há backend, servidor de mídia próprio, WHIP/WHEP direto, AVClient ou fork VDO.Ninja.
