# RPGUP VDO.Ninja

Interface Foundry VTT **v13/v14** para uma **Room oficial VDO.Ninja**. Um iframe local por cliente, Stream IDs estáveis configurados pelo GM e um dock ApplicationV2 próprio. O jogador usa os controles nativos do VDO.Ninja para ativar a câmera e participar.

**Versão de produção: 1.0.0.** Protótipo aprovado pelo usuário em 01/10/2026, com autorização expressa para produção. Compatibilidade declarada: Foundry **v13 e v14** (`minimum: 13`, `verified: 14`, `maximum: 14`). [Aprovação e evidências de teste](docs/PROTOTYPE-RESULTS.md).

A arquitetura vigente está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). A proposta anterior foi preservada, sem alterações, em [docs/ARCHITECTURE-OLD-MEDIAMTX.md](docs/ARCHITECTURE-OLD-MEDIAMTX.md) **apenas como histórico superado**.

## Instalar e configurar

1. Use Foundry v13 ou v14 em HTTPS ou localhost.
2. No Setup → Módulos → Instalar módulo, cole o manifest: `https://raw.githubusercontent.com/henriquebot/rpgup-vdo-ninja/main/module.json`. O módulo não instala dependências de runtime nem exige build.
3. No World, habilite **RPGUP VDO.Ninja** em Gerenciar módulos.
4. GM: Configurações → Configurar opções → **RPGUP VDO.Ninja — World e fontes OBS**. Informe a Room, escolha áudio/qualidade e clique em **Gerar e salvar slots faltantes**. Aguarde a confirmação: Room e IDs já ficam salvos no mundo. Opcionalmente informe imagens em **Avatar da mesa**; vazio usa o avatar Foundry do usuário.
5. Cada cliente: a dock abre ao entrar. Para abrir/reabrir manualmente, clique em **Câmeras VDO.Ninja** na aba Configurações da sidebar. O jogador que aguardava um slot entra ao receber a associação salva. Quem já está conectado usa a engrenagem → **Aplicar / reconectar**. A câmera e a permissão são ativadas na UI nativa do VDO.
6. GM: copie o solo link de cada usuário para uma Browser Source OBS, ou use **Baixar links OBS** para uma lista JSON organizada. O arquivo contém URLs e dimensões sugeridas; não é uma coleção de cenas OBS nem instala/configura o OBS.

O [repositório](https://github.com/henriquebot/rpgup-vdo-ninja) contém o código e o manifest vigentes na `main`. O download desta versão usa a branch de distribuição **v1.0.0**, que mantém o artefato desta versão separado de alterações futuras da main. Não há workflow de publicação. O Foundry identifica a raiz pelo `module.json` dentro do arquivo do GitHub.

Para instalação manual de desenvolvimento, execute `npm run package` com Node.js 20+ e copie `dist/rpgup-vdo-ninja` para `<User Data>/Data/modules/rpgup-vdo-ninja`. Uma nova versão atualiza `module.json`/`package.json` e seu link de distribuição.

## Uso e limites

- **Flutuante por padrão**, inclusive na primeira abertura após atualizar o protótipo anterior. Depois, sua posição escolhida é lembrada. Na borda esquerda/direita/topo/embaixo, CSS reserva espaço em `#interface` para controles, navegação, hotbar e sidebar. O canvas continua em tela cheia. A integração de layout é específica do DOM v13/v14 e deve ser conferida com os módulos de UI da mesa.
- **Engrenagem no cabeçalho**: a dock abre com todas as opções e textos recolhidos. Clique no ícone para mostrar posição, tamanho, zoom, avatar, abertura ao entrar e Aplicar / reconectar. Passe o mouse sobre os controles para ler a explicação. O ícone vizinho desacopla uma borda para uma janela flutuante dentro do Foundry, sem reconectar.
- **↻ Recarregar sala VDO**, no cabeçalho, recarrega apenas sua sala para atualizar mudanças do Director. Reinicia a conexão/câmera VDO e mantém a página Foundry aberta, a geometria, a Room e o ID atuais. Não salva rascunhos GM nem aplica opções pendentes do módulo; para isso use **Aplicar / reconectar**. Não recarrega os outros participantes.
- Preferências individuais (posição, tamanho, abertura automática, zoom e avatar) ficam em flags do usuário no World. Reabrir o menu e reposicionar o dock preservam o iframe e sua sessão. Fechar o dock encerra a conexão; reconectar é uma ação explícita. O painel GM preserva rascunhos ao redesenhar; aplicar no GM salva seu rascunho aberto antes de reconectar. Uma mudança ainda não aplicada destaca a engrenagem e informa o motivo ao passar o mouse.
- **Zoom − / percentual / +** ajusta somente o iframe, de 50% a 150%, sem recarregar a sala. Clique no percentual para voltar a 100%. A área do iframe acompanha o tamanho da janela.
- Câmera e microfone são escolhidos na **engrenagem do próprio VDO**. Self-preview, mini preview e PiP usam seus controles/menu de contexto nativos. Com foco no VDO, Ctrl+Alt+P alterna o PiP local (Cmd+Alt+P no Mac). O navegador pode exigir gesto para PiP; sua posição e tamanho dependem do navegador. O módulo não cria outro viewer da própria câmera. Os seletores redundantes de câmera por nome, PC/Móvel e self-preview foram removidos.
- Placeholder inicial: **Avatar Foundry / da mesa**, preparado novamente em cada entrada. Se o GM definir **Avatar da mesa**, essa imagem é usada; caso contrário, usa a imagem do usuário Foundry. **Imagem por URL** individual tem prioridade; **Sem placeholder** omite o parâmetro. O módulo lê a imagem pela sessão Foundry, reduz uma miniatura estática e usa o parâmetro oficial `avatar` como imagem incorporada, evitando a exigência de CORS do VDO para os arquivos Foundry. A imagem preparada aparece nas configurações; falhas mostram aviso e usam a imagem padrão do VDO. Imagens externas precisam permitir leitura pelo navegador a partir do Foundry. Arquivos escolhidos somente dentro do iframe não são importados nem lembrados pelo módulo.
- **Abrir esta janela ao entrar no mundo** abre somente a dock; não ativa sua câmera. Desmarque para abrir manualmente pelo menu do módulo ou pela macro abaixo. Essa escolha também é lembrada.
- Áudio inicial: Discord, com `audiodevice=0` e `noaudio` e sem delegação de microfone. Para testar microfone, volume e controles nativos, mude para **Áudio e controles nativos VDO.Ninja** e reconecte todos. Evite usar os dois canais de voz simultaneamente durante a prova.
- Qualidade: **Automático** mantém o VDO adaptativo; **Economia**, **Equilibrado** e **Mais detalhe** limitam os vídeos entre jogadores a 200/500/1.200 kbps e captura a até 20/30/30 fps por `maxframerate`. A qualidade efetiva depende de dispositivos, rede e orçamento da Room. Mais detalhe pode precisar de ajuste desse orçamento pelo Director. Presets não impõem resolução/codec nem limitam os viewers solo OBS. Valores avançados prevalecem sobre o preset; clientes conectados precisam aplicar/reconectar após salvar.
- O GM entra inicialmente como guest. O painel permite escolher um GM como Director com `director`, `push` e `showdirector`, no mesmo iframe. O Director inicia em **Scene Preview** (`previewmode`); um aviso explica o botão **🪟 Toggle Director Vision**, que alterna entre a cena e o painel de direção. O VDO.Ninja controla admissão e poderes de Director; papéis Foundry não são uma autenticação externa.
- Label usa sempre o nome Foundry. Usuários sem slot não entram. Slots não são recriados ao recarregar; trocar Room, senha ou slot muda os links OBS e precisa ser uma escolha do GM.
- Room IDs: 1–49 letras/números; Stream IDs: 1–64 letras/números/underscore. Parâmetros adicionais limitados a `password`, `roombitrate`, `totalroombitrate`, `videobitrate`, `codec`, `width`, `height`, `fps`, `maxframerate`. Não use URL completa ou fragmento no campo. O módulo rejeita parâmetros que substituam identidade, papel, transporte ou interface.
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

Para atualizar: saia do World, atualize o módulo no Setup e confirme **1.0.0**. Recarregue os navegadores do GM e dos jogadores (Ctrl+F5). Room, slots e preferências existentes são preservados; a configuração antiga mantém qualidade automática e nenhum avatar adicional da mesa. Não é necessário desinstalar nem gerar novos IDs.

O módulo usa um iframe oficial por cliente e não inclui servidor de mídia, backend, SDK WebRTC, AVClient, controle OBS ou fork. O painel aceita os usuários do World, inclusive mesas com 4–6 participantes; o teste automatizado de seis usuários verifica associação e exportação, não capacidade de mídia da rede. A aprovação do protótipo e a autorização de produção vieram do usuário. Os testes do agente, seus ambientes e limites estão registrados em [PROTOTYPE-RESULTS.md](docs/PROTOTYPE-RESULTS.md).
