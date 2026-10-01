# RPGUP VDO.Ninja

Interface Foundry VTT **v13/v14** para uma **Room oficial VDO.Ninja**. Um iframe local por cliente, Stream IDs estáveis configurados pelo GM e um dock ApplicationV2 próprio. O jogador usa os controles nativos do VDO.Ninja para ativar a câmera e participar.

**Status: protótipo implementado; validação real de mídia pendente.** Não declarar compatibilidade verificada, câmeras, menus nativos, PiP ou OBS aprovados antes do teste com 1 GM e 2 jogadores. [Resultados e gate](docs/PROTOTYPE-RESULTS.md).

A arquitetura vigente está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). A proposta anterior foi preservada, sem alterações, em [docs/ARCHITECTURE-OLD-MEDIAMTX.md](docs/ARCHITECTURE-OLD-MEDIAMTX.md) **apenas como histórico superado**.

## Instalar o protótipo

1. Use um World separado para testes na v13 e outro na v14. Não atualize a geração do servidor para instalar este módulo.
2. No Setup do Foundry → Módulos → Instalar módulo, cole o manifest: `https://raw.githubusercontent.com/henriquebot/rpgup-vdo-ninja/main/module.json`. O Foundry baixa o código da branch `main` diretamente do GitHub. O módulo não instala dependências de runtime nem exige build.
3. No World de teste, habilite **RPGUP VDO.Ninja — Protótipo de Room** em Gerenciar módulos.
4. GM: Configurações → Configurar opções → **RPGUP VDO.Ninja — World e fontes OBS**. Informe a Room, escolha áudio, gere os slots faltantes e salve. Use três usuários (1 GM e 2 jogadores) nesta primeira prova.
5. Cada cliente: **Abrir dock de câmeras**, nas opções do módulo. Clique em **Aplicar / reconectar** se o dock foi aberto antes da configuração. A entrada na Room usa automaticamente o slot e nome do usuário Foundry; a ativação da câmera e a permissão são feitas na UI nativa.
6. GM: copie o solo link salvo de cada usuário para uma Browser Source OBS. Faça o roteiro de [docs/PROTOTYPE-RESULTS.md](docs/PROTOTYPE-RESULTS.md) e registre os resultados separadamente para cada geração.

O [repositório](https://github.com/henriquebot/rpgup-vdo-ninja) contém o código e a documentação vigentes na branch `main`. O manifest usa o arquivo da própria branch, sem workflow de publicação ou releases. O Foundry identifica a raiz do módulo pelo `module.json` dentro do diretório do arquivo do GitHub.

Para instalação manual de desenvolvimento, execute `npm run package` com Node.js 20+ e copie `dist/rpgup-vdo-ninja` para `<User Data>/Data/modules/rpgup-vdo-ninja`. Nesta fase o download acompanha a `main`; mudanças de versão devem atualizar `version` em `module.json` e `package.json`. A validação de instalação no servidor Foundry e de mídia real continua pendente.

## Uso e limites

- Dock à esquerda, direita, topo, embaixo ou flutuante. O slider muda a largura/altura do dock; a janela também usa o redimensionamento nativo. O dock se sobrepõe à área de jogo; não rearranja canvas/sidebar do Foundry.
- Preferências individuais (posição, tamanho, abertura automática e tipo de self-preview) ficam em flags do usuário no World. Reabrir o menu e reposicionar o dock preservam o iframe e sua sessão. Fechar o dock encerra a conexão; reconectar é uma ação explícita.
- Self-preview: nativo, `minipreview` ou `pipme`. A preferência é lembrada, mas o navegador pode exigir gesto para PiP. Posição e tamanho do PiP do sistema pertencem ao navegador; não há promessa de persistência via módulo. Não há segundo viewer da própria câmera.
- Áudio inicial: Discord, com `audiodevice=0` e `noaudio` e sem delegação de microfone. Para testar microfone, volume e controles nativos, mude para **Áudio e controles nativos VDO.Ninja** e reconecte todos. Evite usar os dois canais de voz simultaneamente durante a prova.
- O GM entra inicialmente como guest. O painel permite escolher um GM como Director para comparar comportamento com `director`, `push` e `showdirector`, no mesmo iframe. O VDO.Ninja controla admissão e poderes de Director; papéis Foundry não são uma autenticação externa.
- Label usa sempre o nome Foundry. Usuários sem slot não entram. Slots não são recriados ao recarregar; trocar Room, senha ou slot muda os links OBS e precisa ser uma escolha do GM.
- Room IDs: 1–49 letras/números; Stream IDs: 1–64 letras/números/underscore. Parâmetros adicionais limitados a `password`, `roombitrate`, `totalroombitrate`, `videobitrate`, `codec`, `width`, `height`, `fps`. Não use URL completa ou fragmento no campo. O módulo rejeita parâmetros que substituam identidade, papel, transporte ou interface.
- Foundry deve estar em HTTPS ou localhost. Atributo `allow` do iframe não sobrepõe bloqueios de Permissions-Policy/CSP no servidor. O módulo preserva o contexto de origem e a UI oficial, sem sandbox que inviabilize câmera ou menus.

Alternativa para reabrir o dock por macro **Script**:

```js
game.modules.get("rpgup-vdo-ninja").api.openDock();
```

## Verificação de desenvolvimento

```sh
npm test
npm run check
npm run package
```

Teste opcional de navegador: disponibilize o pacote Playwright no ambiente (ou `PLAYWRIGHT_PACKAGE` apontando para seu `index.mjs`), então execute `npm run test:browser`. `PLAYWRIGHT_CHANNEL=msedge` usa Edge instalado. A fixture usa um substituto do contrato ApplicationV2 e intercepta o iframe: verifica nosso ciclo de UI, **não** câmera/WebRTC nem o runtime real do Foundry.

O módulo não inclui servidor de mídia, backend, SDK WebRTC, AVClient, controle OBS nem fork do VDO.Ninja. Avatar, presets, escala de 4–6 pessoas e acabamento de produto ficam após o gate do protótipo.
