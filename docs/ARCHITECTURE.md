# Arquitetura vigente: Room oficial VDO.Ninja no Foundry

Data: 01/10/2026, America/Sao_Paulo. Alvos: **Foundry VTT v14 e v13**, conforme pedido adicional. Status: protótipo implementado, gate de mídia real ainda pendente.

**Este documento substitui a proposta anterior.** [ARCHITECTURE-OLD-MEDIAMTX.md](ARCHITECTURE-OLD-MEDIAMTX.md) foi preservado integralmente como histórico; suas decisões, serviços e roteiro não se aplicam ao projeto atual.

## Fluxo

```text
Foundry VTT v13/v14
  → módulo RPGUP VDO.Ninja
  → ApplicationV2 / dock próprio
  → um iframe oficial https://vdo.ninja/ por cliente
  → mesma Room VDO.Ninja para os participantes do World

GM → configuração persistente do World Foundry → Room + userId → Stream ID
OBS Browser Source → solo/view do Stream ID estável → VDO.Ninja oficial
```

Experiência pretendida: **“Jogador entra no Foundry → ativa a câmera → vê os demais jogadores → joga.”** O módulo fornece a URL correta automaticamente e mantém a UI nativa de dispositivos, permissão, câmera e participantes. Não ativa captura oculta ou pula consentimento do navegador.

Não há servidor de mídia, LiveKit, MediaMTX, WHIP/WHEP direto, broker, backend próprio, substituição de `foundry.av.AVClient`, recriação de WebRTC ou fork do VDO.Ninja. O runtime usa apenas JavaScript local, CSS local e o iframe oficial. O transporte e sua operação são do VDO.Ninja. Nenhuma garantia de upload único é assumida para uma Room P2P.

## Fonte de verdade e identidade

`game.settings`, scope `world`, mantém uma configuração mínima em um único valor: `roomId`, `extraQuery`, `audio`, `directorUserId` e `slots`. O Foundry é a fonte de verdade; não existe dependência de uma API persistente de configuração de Rooms VDO.Ninja. Alterações feitas na UI Director são nativas da sessão VDO e não são importadas automaticamente para o Foundry.

O GM gera ou informa uma associação **Foundry userId → VDO.Ninja Stream ID**. **Gerar e salvar slots faltantes** grava a configuração no mundo, aguarda `game.settings.set` e confere o valor retornado pelo cache de Settings antes de anunciar sucesso. O getter devolve uma cópia para evitar alterações acidentais no objeto vivo. Os IDs não dependem do nome, da sessão nem da conexão. Slots existentes e de usuários removidos são preservados. Duplicatas/IDs inválidos são rejeitados. Um usuário não associado aguarda no dock; ao receber `onChange` do Setting mundial, abre seu primeiro iframe. Uma sessão existente recebe aviso e só reconecta por ação explícita.

Exemplo:

| Foundry userId | Nome/label Foundry | Stream ID |
| --- | --- | --- |
| userHenrique | Henrique | slot_a81k2 |
| userAna | Ana | slot_92md4 |

Label vem do nome atual do usuário Foundry. Uma mudança de nome pode ser aplicada ao reconectar sem alterar o slot. O slot estável permite um OBS permanente entre reconexões; mudar Room/senha/slot altera o link. Os IDs são roteamento, **não prova criptográfica de identidade**. Room/senha e URLs são acessíveis aos participantes do World; não equivalem a segredos de servidor ou a um sistema externo de autorização Foundry.

O painel GM é singleton, conserva o formulário/rascunho em rerenders, rejeita alterações feitas por outro GM enquanto havia um rascunho e informa falhas de gravação. Aplicar/reconectar no GM salva um rascunho aberto antes de ler a configuração atual. A conexão nunca gera IDs. O painel completo e presets continuam após o gate; preferências individuais de câmera/avatar/zoom foram autorizadas explicitamente após o teste inicial do usuário.

## Iframe e parâmetros

Guest:

```text
https://vdo.ninja/?room=RPGUPPrototype123&push=slot_92md4&label=Ana
```

Director opcional, somente para o GM designado, no **mesmo iframe**:

```text
https://vdo.ninja/?room=RPGUPPrototype123&push=slot_a81k2&label=Henrique&director=RPGUPPrototype123&showdirector=1
```

O GM é guest por padrão. Ser GM não torna o usuário automaticamente Director no VDO.Ninja. A documentação descreve poderes e disputa de admissão do Director; isso precisa da prova real. `showdirector` permite incluir sua câmera nos destinos; não pressupor que ligar essa opção conclui automaticamente a publicação da câmera.

O iframe delega `camera`, `autoplay`, `fullscreen`, `display-capture`, `picture-in-picture` e, no modo de áudio VDO, `microphone`. Não recebe sandbox: manter a origem e os recursos nativos evita incompatibilidades prematuras com captura. `referrerpolicy=no-referrer`. O host Foundry precisa estar em contexto seguro, com políticas que aceitem câmera e frame da origem VDO. Acesso HTTP fora de localhost é indicado como erro antes de conectar. `allow` não pode vencer uma proibição do documento pai.

Não há `cleanoutput`, `autostart`, CSS injetado, acesso ao DOM cross-origin, manipulação do menu de contexto nem botões duplicados de câmera/microfone no dock. A UI normal da Room, o clique direito na própria câmera e nas demais e os controles de volume/opções devem ser testados dentro do iframe oficial. Carregar o documento do iframe não é prova de mídia conectada.

Parâmetros adicionais aceitos inicialmente: `password`, `roombitrate`, `totalroombitrate`, `videobitrate`, `codec`, `width`, `height`, `fps`. Uma lista fechada evita aliases ou fragmentos que substituam `room`, `push`, `label`, `director`, UI ou transporte. Não há presets ou tuning automático de qualidade implementados.

A API oficial `postMessage` foi investigada, mas não é necessária para a primeira integração: URLs e UI nativa bastam. Se um teste comprovar necessidade de comandos, usar somente a API oficial, origem exata, validação de `event.origin`, `event.source` e dados, sem wildcard, script arbitrário ou extração de tracks. Essa ponte não foi implementada antecipadamente.

## Dock e ciclo de vida

`RoomDock` estende o contrato ApplicationV2 presente nas APIs públicas v13 e v14, com métodos protegidos de extensão documentados: `_renderHTML`, `_replaceHTML`, `_onRender`, `_prePosition`, `_onPosition`, `_preClose` e `_onClose`. Não usa métodos marcados Internal ou modifica APIs do Foundry. O menu de configurações chama a mesma instância local do dock.

Opções: esquerda, direita, topo, embaixo, **flutuante por padrão**. Preferências do primeiro protótipo migram uma vez para flutuante; as escolhas seguintes são preservadas. `setPosition` posiciona a própria aplicação; o slider regula a dimensão transversal e o frame fornece resize. Nas bordas, margens de `#interface` reservam espaço para a UI, com dimensões limitadas a metade da viewport. O canvas continua em tela cheia. Isso segue o princípio do CameraViews nativo sem substituir a classe, mover os elementos do Foundry ou alterar o AVClient. Não existe API pública documentada para registrar um dock de terceiros no layout AV; esta pequena integração CSS depende do DOM v13/v14 e precisa de validação com temas/módulos de UI. Fechar ou flutuar remove imediatamente a reserva.

Flags `User` guardam preferências individuais por World: posição, largura lateral, altura da barra, geometria flutuante, abertura ao entrar, preview, zoom, câmera, avatar e modo de interface. Não altera a configuração mundial ao mover o dock. O zoom escala o iframe e aumenta inversamente seu viewport CSS, sem tocar seu DOM ou mudar `src`. Flex layout e ResizeObserver mantêm a área disponível ao redimensionar. Os controles do módulo rolam quando falta espaço.

Reposicionar/redimensionar e renderizar novamente mantém o mesmo elemento iframe sem removê-lo da árvore DOM ou alterar `src`. Fechar remove o frame e encerra sua sessão; reabrir cria um único novo frame. Alterações do GM/nome/self-preview mostram aviso; **Aplicar / reconectar** é a ação que troca a URL e reinicia a conexão. Preferências de tamanho não são sobrescritas só porque a viewport encolheu.

## Self-preview / PiP

Três opções individuais: UI nativa, `minipreview` e `pipme`. Nenhuma usa `view` para receber a própria câmera ou cria outro iframe. Segundo a documentação oficial, `pipme` abre o preview local em PiP e é incompatível com `autostart`; por isso não enviamos `autostart` em nenhum modo. O atalho nativo Ctrl+Alt+P (Cmd+Alt+P no Mac), com foco no iframe, também precisa ser testado.

Meta de teste: grupo permanece dockado e câmera do narrador aparece em um PiP móvel próximo à câmera física, sem segunda recepção de rede. Gesto/consentimento, suporte do browser e UI de Director podem afetar o resultado. O módulo lembra a opção de preview; posição e tamanho de uma janela PiP de sistema dependem do navegador e não têm persistência prometida pelo módulo. Documentar falha antes de desenvolver alternativa.

## Câmera, avatar e modo móvel

A documentação oficial de `avatar` descreve imagem padrão, arquivo local ou URL codificada e fallback quando vídeo é mutado ou não há câmera. A mesma página conserva ressalva sobre beta/alpha. O HTML servido em `https://vdo.ninja/` em 01/10/2026 declara `31.1`; isso não demonstra o comportamento real de avatar no iframe.

Por pedido explícito do usuário após seu teste, a versão `0.1.0-prototype.2` implementa `avatar=<URL>` a partir de `User.avatar` por padrão, resolvendo caminhos relativos contra a URL do Foundry. Há preferência individual de URL customizada ou sem placeholder. HTTP/HTTPS são os únicos protocolos permitidos; URLs com credenciais, blobs de sessão e imagens HTTP em Foundry HTTPS são rejeitadas. A imagem é aplicada novamente a cada entrada. Arquivos selecionados somente no iframe não são extraídos/importados. CORS/acesso à imagem e fallback de vídeo devem ser conferidos no teste real; não há proxy ou captura alternativa.

A câmera usa `vdo=1` por padrão ou um nome salvo pelo usuário. Diferentemente de `videodevice=1`, `vdo` mantém a escolha de câmera antes da entrada. Não se transfere deviceId de Foundry para VDO porque os IDs são específicos de origem. Automático deixa a detecção nativa; PC envia `notmobile`; Móvel envia `mobile`. São ajustes da mesma página VDO responsiva, não emulação de user-agent ou um endpoint de site móvel separado.

## OBS e áudio

O painel GM mostra/copia um solo link por usuário, construído como:

```text
https://vdo.ninja/?room=RPGUPPrototype123&view=slot_92md4&solo=&cleanoutput=
```

Senha, codec e bitrate aplicáveis ao viewer são propagados. Constraints de captura, Director, `push` e preferências de preview não vão ao OBS. Os links usam somente a configuração salva, com aviso para alterações ainda não salvas e seleção manual quando clipboard não funcionar. O OBS é apenas mais um consumidor oficial; não há plugin ou automação OBS.

O modo mundial de áudio é reversível: `discord` (inicial) usa `audiodevice=0` e `noaudio`, sem microfone delegado; `vdo` mantém os controles nativos sem overrides de áudio e delega microfone. Testar volume/mic no modo VDO e retornar à preferência da mesa. Não assumimos que áudio está permanentemente fora do projeto.

## Gate e critérios

Primeira prova, em **cada geração**: 1 GM, 2 jogadores, três clientes de navegador, uma Room, um iframe por cliente, slots automáticos e persistentes, câmera e visão mútua, clique direito/controles, cinco posições do dock, resize, self-preview/PiP e três fontes solo OBS com reconexão. Registrar versões exatas, parâmetros, permissões e problemas em [PROTOTYPE-RESULTS.md](PROTOTYPE-RESULTS.md).

Testes unitários e fixture de navegador verificam nosso código; não substituem essa prova. Somente se ela passar, avançar para 4–6 participantes, painel GM completo, presets e exportação organizada OBS. Os ajustes individuais solicitados nesta revisão não representam aprovação do gate. Falha fundamental → registrar e investigar o recurso oficial antes de propor outra arquitetura.

## Fontes oficiais consultadas em 01/10/2026

- [ApplicationV2 v13](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html), [ApplicationV2 v14](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html), [ClientSettings v13](https://foundryvtt.com/api/v13/classes/foundry.helpers.ClientSettings.html).
- [Room](https://docs.vdo.ninja/advanced-settings/setup-parameters/room), [push e IDs permanentes](https://docs.vdo.ninja/advanced-settings/setup-parameters/push), [Director](https://docs.vdo.ninja/advanced-settings/director-parameters/director), [showdirector](https://docs.vdo.ninja/advanced-settings/director-parameters/and-showdirector).
- [Iframe API](https://docs.vdo.ninja/guides/iframe-api-documentation/iframe-api-basics), [pipme](https://docs.vdo.ninja/advanced-settings/design-parameters/and-pipme-alpha), [minipreview](https://docs.vdo.ninja/advanced-settings/video-parameters/and-minipreview).
- [Avatar](https://docs.vdo.ninja/advanced-settings/video-parameters/and-avatar), [solo](https://docs.vdo.ninja/advanced-settings/mixer-scene-parameters/and-solo), [password](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-password).
- [audiodevice](https://docs.vdo.ninja/advanced-settings/setup-parameters/audiodevice), [noaudio](https://docs.vdo.ninja/advanced-settings/audio-parameters/noaudio).
- [Dock AV Foundry](https://foundryvtt.com/article/audio-video/), [CameraViews v13](https://foundryvtt.com/api/v13/classes/foundry.applications.apps.av.CameraViews.html), [CameraViews v14](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.av.CameraViews.html), [User.avatar](https://foundryvtt.com/api/v14/classes/foundry.documents.User.html).
- [vdo: câmera padrão com seletor](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-vdo), [videodevice e IDs por origem](https://docs.vdo.ninja/advanced-settings/setup-parameters/videodevice), [mobile / notmobile](https://docs.vdo.ninja/advanced-settings/mobile-parameters/and-mobile).
