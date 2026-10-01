# RPGUP VDO.Ninja

Interface Foundry VTT **v13/v14** para uma **Room oficial VDO.Ninja**. Um iframe local por cliente, Stream IDs estáveis configurados pelo GM e um dock ApplicationV2 próprio. O jogador usa os controles nativos do VDO.Ninja para ativar a câmera e participar.

**Status: protótipo implementado; validação real de mídia pendente.** Não declarar compatibilidade verificada, câmeras, menus nativos, PiP ou OBS aprovados antes do teste com 1 GM e 2 jogadores. [Resultados e gate](docs/PROTOTYPE-RESULTS.md).

A arquitetura vigente está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). A proposta anterior foi preservada, sem alterações, em [docs/ARCHITECTURE-OLD-MEDIAMTX.md](docs/ARCHITECTURE-OLD-MEDIAMTX.md) **apenas como histórico superado**.

## Instalar o protótipo

1. Use um World separado para testes na v13 e outro na v14. Não atualize a geração do servidor para instalar este módulo.
2. No Setup do Foundry → Módulos → Instalar módulo, cole o manifest: `https://raw.githubusercontent.com/henriquebot/rpgup-vdo-ninja/main/module.json`. O Foundry baixa o código da branch `main` diretamente do GitHub. O módulo não instala dependências de runtime nem exige build.
3. No World de teste, habilite **RPGUP VDO.Ninja — Protótipo de Room** em Gerenciar módulos.
4. GM: Configurações → Configurar opções → **RPGUP VDO.Ninja — World e fontes OBS**. Informe a Room, escolha áudio e clique em **Gerar e salvar slots faltantes**. Esse botão já grava Room e IDs no mundo; aguarde a confirmação. Use três usuários (1 GM e 2 jogadores) nesta primeira prova.
5. Cada cliente: **Abrir dock de câmeras**, nas opções do módulo. O jogador que estava aguardando um slot abre a sala quando recebe a configuração salva. Quem já está conectado usa **Aplicar / reconectar**. A entrada usa automaticamente o slot e nome do usuário Foundry; a ativação da câmera e a permissão são feitas na UI nativa.
6. GM: copie o solo link salvo de cada usuário para uma Browser Source OBS. Faça o roteiro de [docs/PROTOTYPE-RESULTS.md](docs/PROTOTYPE-RESULTS.md) e registre os resultados separadamente para cada geração.

O [repositório](https://github.com/henriquebot/rpgup-vdo-ninja) contém o código e a documentação vigentes na branch `main`. O manifest usa o arquivo da própria branch, sem workflow de publicação ou releases. O Foundry identifica a raiz do módulo pelo `module.json` dentro do diretório do arquivo do GitHub.

Para instalação manual de desenvolvimento, execute `npm run package` com Node.js 20+ e copie `dist/rpgup-vdo-ninja` para `<User Data>/Data/modules/rpgup-vdo-ninja`. Nesta fase o download acompanha a `main`; mudanças de versão devem atualizar `version` em `module.json` e `package.json`. A validação de instalação no servidor Foundry e de mídia real continua pendente.

## Uso e limites

- **Flutuante por padrão**, inclusive na primeira abertura após atualizar o protótipo anterior. Depois, sua posição escolhida é lembrada. Na borda esquerda/direita/topo/embaixo, CSS reserva espaço em `#interface` para controles, navegação, hotbar e sidebar. O canvas continua em tela cheia. A integração de layout é específica do DOM v13/v14 e deve ser conferida com os módulos de UI da mesa.
- **Engrenagem no cabeçalho**: a dock abre com todas as opções e textos recolhidos. Clique no ícone para mostrar posição, tamanho, zoom, avatar, abertura ao entrar e Aplicar / reconectar. Passe o mouse sobre os controles para ler a explicação. O ícone vizinho desacopla uma borda para uma janela flutuante dentro do Foundry, sem reconectar.
- Preferências individuais (posição, tamanho, abertura automática, zoom e avatar) ficam em flags do usuário no World. Reabrir o menu e reposicionar o dock preservam o iframe e sua sessão. Fechar o dock encerra a conexão; reconectar é uma ação explícita. O painel GM preserva rascunhos ao redesenhar; aplicar no GM salva seu rascunho aberto antes de reconectar. Uma mudança ainda não aplicada destaca a engrenagem e informa o motivo ao passar o mouse.
- **Zoom − / percentual / +** ajusta somente o iframe, de 50% a 150%, sem recarregar a sala. Clique no percentual para voltar a 100%. A área do iframe acompanha o tamanho da janela.
- Câmera e microfone são escolhidos na **engrenagem do próprio VDO**. Self-preview, mini preview e PiP usam seus controles/menu de contexto nativos. Com foco no VDO, Ctrl+Alt+P alterna o PiP local (Cmd+Alt+P no Mac). O navegador pode exigir gesto para PiP; sua posição e tamanho dependem do navegador. O módulo não cria outro viewer da própria câmera. Os seletores redundantes de câmera por nome, PC/Móvel e self-preview foram removidos.
- Placeholder inicial: **avatar do usuário Foundry**, preparado novamente em cada entrada. O módulo lê a imagem pela sessão Foundry, reduz uma miniatura estática e a envia pelo parâmetro oficial `avatar` como imagem incorporada, evitando a exigência de CORS do VDO para os arquivos Foundry. A escolha fica salva por usuário, e alterações no avatar Foundry são lidas na próxima conexão. Para outra imagem, escolha **Imagem por URL**, informe a URL e aplique. Imagens externas precisam permitir leitura pelo navegador a partir do Foundry. A imagem preparada aparece nas configurações; falhas geram aviso e usam a imagem padrão do VDO. **Sem placeholder** omite o parâmetro. Arquivos escolhidos somente dentro do iframe não são importados nem lembrados pelo módulo.
- **Abrir esta janela ao entrar no mundo** abre somente a dock; não ativa sua câmera. Desmarque para abrir manualmente pelo menu do módulo ou pela macro abaixo. Essa escolha também é lembrada.
- Áudio inicial: Discord, com `audiodevice=0` e `noaudio` e sem delegação de microfone. Para testar microfone, volume e controles nativos, mude para **Áudio e controles nativos VDO.Ninja** e reconecte todos. Evite usar os dois canais de voz simultaneamente durante a prova.
- O GM entra inicialmente como guest. O painel permite escolher um GM como Director com `director`, `push` e `showdirector`, no mesmo iframe. O Director inicia em **Scene Preview** (`previewmode`); um aviso explica o botão **🪟 Toggle Director Vision**, que alterna entre a cena e o painel de direção. O VDO.Ninja controla admissão e poderes de Director; papéis Foundry não são uma autenticação externa.
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

Teste optativo da UI oficial: `npm run test:official-ui` usa o mesmo Playwright para abrir `https://vdo.ninja/`, conferir a imagem incorporada e alternar o botão real do Director. O teste bloqueia WebSockets e não concede câmera/microfone; não valida transmissão de mídia ou visão entre participantes.

Para atualizar da versão anterior: saia do World, atualize o módulo no Setup e confirme **0.1.0-prototype.3**. Depois recarregue os navegadores do GM e dos jogadores (Ctrl+F5). Room, slots e preferências úteis existentes são preservados; as antigas preferências de câmera por nome, PC/Móvel e self-preview deixam de alterar a URL. Não é necessário desinstalar.

O módulo não inclui servidor de mídia, backend, SDK WebRTC, AVClient, controle OBS nem fork do VDO.Ninja. Presets, escala de 4–6 pessoas e painel completo continuam após o gate. As correções e opções de avatar/zoom foram acrescentadas por solicitação explícita após o primeiro teste do usuário. O funcionamento real de câmera, avatar entre peers e OBS ainda precisa ser confirmado.
