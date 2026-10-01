# Arquitetura vigente: Room oficial VDO.Ninja no Foundry

Data: 01/10/2026, America/Sao_Paulo. Alvos: **Foundry VTT v14 e v13**. Status: **produção 1.0.0**, após aprovação expressa do protótipo pelo usuário. Compatibilidade declarada `minimum: 13`, `verified: 14`, `maximum: 14`.

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

`game.settings`, scope `world`, mantém um único valor: `roomId`, `extraQuery`, `audio`, `directorUserId`, `slots`, `quality` e `avatars`. Os dois últimos são opcionais em dados antigos: preset automático e nenhum override de imagem. O Foundry é a fonte de verdade; não existe dependência de uma API persistente de configuração de Rooms VDO.Ninja. Alterações feitas na UI Director são nativas da sessão VDO e não são importadas automaticamente para o Foundry.

O GM gera ou informa uma associação **Foundry userId → VDO.Ninja Stream ID**. **Gerar e salvar slots faltantes** grava a configuração no mundo, aguarda `game.settings.set` e confere o valor retornado pelo cache de Settings antes de anunciar sucesso. O getter devolve uma cópia para evitar alterações acidentais no objeto vivo. Os IDs não dependem do nome, da sessão nem da conexão. Slots existentes e de usuários removidos são preservados. Duplicatas/IDs inválidos são rejeitados. Um usuário não associado aguarda no dock; ao receber `onChange` do Setting mundial, abre seu primeiro iframe. Uma sessão existente recebe aviso e só reconecta por ação explícita.

Exemplo:

| Foundry userId | Nome/label Foundry | Stream ID |
| --- | --- | --- |
| userHenrique | Henrique | slot_a81k2 |
| userAna | Ana | slot_92md4 |

Label vem do nome atual do usuário Foundry. Uma mudança de nome pode ser aplicada ao reconectar sem alterar o slot. O slot estável permite um OBS permanente entre reconexões; mudar Room/senha/slot altera o link. Os IDs são roteamento, **não prova criptográfica de identidade**. Room/senha e URLs são acessíveis aos participantes do World; não equivalem a segredos de servidor ou a um sistema externo de autorização Foundry.

O painel GM é singleton, conserva o formulário/rascunho em rerenders, rejeita alterações feitas por outro GM enquanto havia um rascunho e informa falhas de gravação. Aplicar/reconectar no GM salva um rascunho aberto antes de ler a configuração atual. A conexão e o reload nunca geram IDs. O painel organiza Room/áudio/Director/qualidade e participantes com avatar opcional e links OBS. Contagem de slots e presença são dados Foundry, não medição de mídia VDO.

## Iframe e parâmetros

Guest:

```text
https://vdo.ninja/?room=RPGUPPrototype123&push=slot_92md4&label=Ana
```

Director opcional, somente para o GM designado, no **mesmo iframe**:

```text
https://vdo.ninja/?room=RPGUPPrototype123&push=slot_a81k2&label=Henrique&director=RPGUPPrototype123&showdirector=1&previewmode=
```

O GM é guest por padrão. Ser GM não torna o usuário automaticamente Director no VDO.Ninja. A documentação descreve poderes e disputa de admissão do Director; isso precisa da prova real. `showdirector` permite incluir sua câmera nos destinos; não pressupor que ligar essa opção conclui automaticamente a publicação da câmera.

O Director designado inicia em Scene Preview pelo parâmetro oficial `previewmode`. Uma notificação por sessão local e o texto de ajuda explicam **🪟 Toggle Director Vision**, botão nativo que alterna cena/painel. O teste optativo da página oficial confirmou o estado inicial e duas alternâncias; não testou admissão ou publicação de câmera.

O iframe delega `camera`, `autoplay`, `fullscreen`, `display-capture`, `picture-in-picture` e, no modo de áudio VDO, `microphone`. Não recebe sandbox: manter a origem e os recursos nativos evita incompatibilidades prematuras com captura. `referrerpolicy=no-referrer`. O host Foundry precisa estar em contexto seguro, com políticas que aceitem câmera e frame da origem VDO. Acesso HTTP fora de localhost é indicado como erro antes de conectar. `allow` não pode vencer uma proibição do documento pai.

Não há `cleanoutput`, `autostart`, CSS injetado, acesso ao DOM cross-origin, manipulação do menu de contexto nem botões duplicados de câmera/microfone no dock. A UI normal da Room, o clique direito na própria câmera e nas demais e os controles de volume/opções devem ser testados dentro do iframe oficial. Carregar o documento do iframe não é prova de mídia conectada.

Parâmetros adicionais aceitos: `password`, `roombitrate`, `totalroombitrate`, `videobitrate`, `codec`, `width`, `height`, `fps`, `maxframerate`. Uma lista fechada evita aliases ou fragmentos que substituam `room`, `push`, `label`, `director`, UI ou transporte. Presets opcionais usam somente `roombitrate` e `maxframerate`, sem resolução ou codec forçado: automático (sem overrides), economia (200 kbps/20 fps), equilibrado (500/30) e mais detalhe (1.200/30). Avançados prevalecem. `maxframerate` permite fallback do dispositivo; `fps` estrito permanece somente como opção avançada explícita. O orçamento da Room pode limitar o preset mais detalhe; não há garantia de bitrate/resolução ou tuning automático.

A API oficial `postMessage` foi investigada, mas não é necessária para a primeira integração: URLs e UI nativa bastam. Se um teste comprovar necessidade de comandos, usar somente a API oficial, origem exata, validação de `event.origin`, `event.source` e dados, sem wildcard, script arbitrário ou extração de tracks. Essa ponte não foi implementada antecipadamente.

## Dock e ciclo de vida

`RoomDock` estende o contrato ApplicationV2 presente nas APIs públicas v13 e v14, com métodos protegidos de extensão documentados: `_renderFrame`, `_renderHTML`, `_replaceHTML`, `_onRender`, `_prePosition`, `_onPosition`, `_preClose` e `_onClose`. Não usa métodos marcados Internal ou modifica APIs do Foundry. O menu de configurações chama a mesma instância local do dock.

Opções: esquerda, direita, topo, embaixo, **flutuante por padrão**. Preferências do primeiro protótipo migram uma vez para flutuante; as escolhas seguintes são preservadas. `setPosition` posiciona a própria aplicação; o slider regula a dimensão transversal e o frame fornece resize. Nas bordas, margens de `#interface` reservam espaço para a UI, com dimensões limitadas a metade da viewport. O canvas continua em tela cheia. Isso segue o princípio do CameraViews nativo sem substituir a classe, mover os elementos do Foundry ou alterar o AVClient. Não existe API pública documentada para registrar um dock de terceiros no layout AV; esta pequena integração CSS depende do DOM v13/v14 e precisa de validação com temas/módulos de UI. Fechar ou flutuar remove imediatamente a reserva.

Flags `User` guardam preferências individuais por World: posição, largura lateral, altura da barra, geometria flutuante, abertura ao entrar, zoom, modo de avatar e URL personalizada. Preferências antigas de câmera, interface PC/Móvel e self-preview são ignoradas. Não altera a configuração mundial ao mover o dock. O zoom escala o iframe e aumenta inversamente seu viewport CSS, sem tocar seu DOM ou mudar `src`. Flex layout e ResizeObserver mantêm a área disponível ao redimensionar.

O cabeçalho contém reload, engrenagem e desacoplar, com ícone, nome acessível e tooltip. A engrenagem expande/recolhe opções em grupos, textos e status, recolhidos por padrão. Desacoplar retorna ao modo flutuante dentro do Foundry e mantém o iframe conectado. Reload atribui novamente a URL ativa ao mesmo iframe: navega somente a sala VDO e não salva o formulário GM nem altera preferências/IDs. Mantém opções pendentes para Aplicar/reconectar; reinicia apenas a conexão do cliente que clicou. Não usa acesso ao DOM cross-origin ou `location.reload` do Foundry.

Opções expandidas rolam quando falta espaço. Media queries e container queries adaptam grupos e tabela à largura da janela, mesmo em monitor grande. Erros que impedem a primeira conexão aparecem na sala; mudanças pendentes destacam a engrenagem. Abertura ao entrar é somente uma preferência da janela. Um botão Câmeras VDO.Ninja inserido via hook público `renderSettings` permite reabrir pela sidebar; menu e API/macro continuam disponíveis. O botão é deduplicado em rerenders e suporta HTML de ApplicationV2/coleção jQuery.

Reposicionar/redimensionar e renderizar novamente mantém o mesmo elemento iframe sem removê-lo da árvore DOM ou alterar `src`. Fechar remove o frame e encerra sua sessão; reabrir cria um único novo frame. Alterações do GM/nome/avatar mostram aviso; **Aplicar / reconectar** é a ação que troca a URL e reinicia a conexão. Preferências de tamanho não são sobrescritas só porque a viewport encolheu. Fechar cancela a preparação assíncrona do avatar para impedir criação tardia de iframe.

## Self-preview / PiP

Preview, mini preview e PiP ficam nos controles nativos do VDO. A revisão .3 remove o dropdown do módulo e os overrides `minipreview`/`pipme`, por serem redundantes com a UI nativa. Não há `view` para receber a própria câmera, outro iframe ou `autostart`. O atalho nativo Ctrl+Alt+P (Cmd+Alt+P no Mac), com foco no iframe, também precisa de prova em sessão de mídia.

Meta de teste: grupo permanece dockado e câmera do narrador aparece em um PiP móvel próximo à câmera física, sem segunda recepção de rede. Gesto/consentimento, suporte do browser e UI de Director podem afetar o resultado. Posição e tamanho de uma janela PiP de sistema dependem do navegador e não têm persistência prometida pelo módulo. Documentar falha antes de desenvolver alternativa.

## Câmera e avatar

A documentação oficial de `avatar` descreve imagem padrão, arquivo local ou URL codificada e fallback quando vídeo é mutado ou não há câmera. A mesma página conserva ressalva sobre beta/alpha. O HTML servido em `https://vdo.ninja/` em 01/10/2026 declara `31.1`. O carregamento e uso local da imagem incorporada foram conferidos na página real; sua transmissão aos peers ainda precisa de prova de mídia.

A revisão .2 passava diretamente o endereço `User.avatar`. O usuário informou que isso não aplicava a imagem. O HTML VDO define `crossOrigin="Anonymous"` em seu avatar; a leitura pública de `https://v14.rpgup.com.br/icons/svg/mystery-man.svg` com origem VDO devolveu HTTP 200 sem `Access-Control-Allow-Origin`. Essa combinação impede o uso da imagem pelo VDO.

Na revisão .3, `prepareAvatar` resolve o caminho contra a página Foundry e faz fetch com `credentials: same-origin` e `cache: no-store`. A imagem estática é decodificada e reduzida para WebP, preservando proporção, com máximo inicial de 256 px e URI codificada de até 6.000 caracteres. Esse Data URL entra no parâmetro oficial `avatar`, sem a dependência de CORS entre Foundry e VDO. Não há canvas de câmera virtual, extração de tracks, proxy, backend, script injetado ou fork. URLs HTTP/HTTPS são as únicas fontes permitidas; credenciais embutidas e HTTP em Foundry HTTPS são rejeitados. Imagens externas ainda precisam permitir leitura pela origem Foundry. Respostas sem MIME de imagem, imagens maiores que 10 MB ou falhas de leitura geram aviso e fallback oficial `avatar=default`.

A preferência/URL fica na flag do usuário; os bytes não são gravados nas flags. A miniatura é refeita em cada abertura/reconexão, inclusive após reload, e aparece nas configurações para conferência. Arquivos escolhidos somente no iframe não são extraídos/importados. A escolha de câmera é totalmente nativa: removidos campo de nome e overrides `vdo`/`videodevice` do módulo. PC/Móvel também foi removido por não oferecer o efeito visual esperado; a página oficial e o viewport do iframe continuam responsivos.

Na 1.0.0, `avatars[userId]` permite ao GM definir uma imagem por usuário para a mesa, com caminho Foundry ou URL HTTP/HTTPS validada. No modo avatar Foundry/mesa, esse valor precede `User.avatar`; URL pessoal customizada e sem placeholder permanecem escolhas individuais. Vazio remove o override. Não altera o documento User, nem extrai/uploads arquivos da UI VDO. Alterações são aplicadas na próxima abertura ou Aplicar/reconectar; reload usa a URL já ativa. Slots e avatares de usuários removidos são preservados no Setting.

## OBS e áudio

O painel GM mostra/copia um solo link por usuário, construído como:

```text
https://vdo.ninja/?room=RPGUPPrototype123&view=slot_92md4&solo=&cleanoutput=
```

Senha, codec e bitrate aplicáveis ao viewer são propagados. Constraints de captura, Director, `push` e preferências de preview não vão ao OBS. Os links usam somente a configuração salva, com aviso para alterações ainda não salvas e seleção manual quando clipboard não funcionar. O OBS é apenas mais um consumidor oficial; não há plugin ou automação OBS.

Baixar links OBS exporta JSON com `format`, `version`, `roomId` e `sources` (nome, userId, streamId, URL, largura/altura sugeridas). Usa configuração salva e somente usuários atuais com associação, sem interferência de rascunhos. É uma lista para Browser Sources, não uma coleção importável de cenas OBS. Um Blob de download temporário é liberado após uso.

O modo mundial de áudio é reversível: `discord` (inicial) usa `audiodevice=0` e `noaudio`, sem microfone delegado; `vdo` mantém os controles nativos sem overrides de áudio e delega microfone. Testar volume/mic no modo VDO e retornar à preferência da mesa. Não assumimos que áudio está permanentemente fora do projeto.

## Aprovação e validação

Primeira prova, em **cada geração**: 1 GM, 2 jogadores, três clientes de navegador, uma Room, um iframe por cliente, slots automáticos e persistentes, câmera e visão mútua, clique direito/controles, cinco posições do dock, resize, self-preview/PiP e três fontes solo OBS com reconexão. Registrar versões exatas, parâmetros, permissões e problemas em [PROTOTYPE-RESULTS.md](PROTOTYPE-RESULTS.md).

O usuário aprovou o protótipo e autorizou produção após a revisão .3, abrindo o gate para painel refinado, presets, avatares e exportação. A associação/exportação foi testada com seis usuários; o painel percorre a coleção do World sem limite artificial de três. Isso não é uma medição de mídia com seis peers. Testes unitários, fixture e teste de UI oficial continuam separados da aprovação do usuário e de testes licenciados por geração; registrar falhas sem inventar uma arquitetura alternativa.

Distribuição: manifest de atualização na main e artefato 1.0.0 na branch `v1.0.0`, que não acompanha mudanças futuras da main. Não há workflow, backend, instalação de dependências ou build no cliente. O arquivo GitHub contém módulo, fontes e documentação; o instalador Foundry localiza seu `module.json`.

## Fontes oficiais consultadas em 01/10/2026

- [ApplicationV2 v13](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html), [ApplicationV2 v14](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html), [ClientSettings v13](https://foundryvtt.com/api/v13/classes/foundry.helpers.ClientSettings.html).
- [Room](https://docs.vdo.ninja/advanced-settings/setup-parameters/room), [push e IDs permanentes](https://docs.vdo.ninja/advanced-settings/setup-parameters/push), [Director](https://docs.vdo.ninja/advanced-settings/director-parameters/director), [showdirector](https://docs.vdo.ninja/advanced-settings/director-parameters/and-showdirector).
- [Scene Preview / previewmode](https://docs.vdo.ninja/advanced-settings/director-parameters/and-previewmode).
- [roombitrate](https://docs.vdo.ninja/advanced-settings/video-bitrate-parameters/roombitrate), [maxframerate](https://docs.vdo.ninja/advanced-settings/video-parameters/and-maxframerate), [fps](https://docs.vdo.ninja/advanced-settings/video-parameters/and-fps), [Manifest e compatibilidade](https://foundryvtt.com/article/module-development/).
- [Iframe API](https://docs.vdo.ninja/guides/iframe-api-documentation/iframe-api-basics), [pipme](https://docs.vdo.ninja/advanced-settings/design-parameters/and-pipme-alpha), [minipreview](https://docs.vdo.ninja/advanced-settings/video-parameters/and-minipreview).
- [Avatar](https://docs.vdo.ninja/advanced-settings/video-parameters/and-avatar), [solo](https://docs.vdo.ninja/advanced-settings/mixer-scene-parameters/and-solo), [password](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-password).
- [audiodevice](https://docs.vdo.ninja/advanced-settings/setup-parameters/audiodevice), [noaudio](https://docs.vdo.ninja/advanced-settings/audio-parameters/noaudio).
- [Dock AV Foundry](https://foundryvtt.com/article/audio-video/), [CameraViews v13](https://foundryvtt.com/api/v13/classes/foundry.applications.apps.av.CameraViews.html), [CameraViews v14](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.av.CameraViews.html), [User.avatar](https://foundryvtt.com/api/v14/classes/foundry.documents.User.html).
- [vdo: câmera padrão com seletor](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-vdo), [videodevice e IDs por origem](https://docs.vdo.ninja/advanced-settings/setup-parameters/videodevice), [mobile / notmobile](https://docs.vdo.ninja/advanced-settings/mobile-parameters/and-mobile).
