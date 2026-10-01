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

O GM gera ou informa uma associação **Foundry userId → VDO.Ninja Stream ID**. Os IDs gerados são aleatórios, persistidos somente ao salvar e não dependem do nome, da sessão nem da conexão. Slots já existentes e de usuários removidos são preservados. Duplicatas/IDs inválidos são rejeitados. Um usuário não associado recebe uma indicação no dock; ele não escolhe Room ou Stream ID.

Exemplo:

| Foundry userId | Nome/label Foundry | Stream ID |
| --- | --- | --- |
| userHenrique | Henrique | slot_a81k2 |
| userAna | Ana | slot_92md4 |

Label vem do nome atual do usuário Foundry. Uma mudança de nome pode ser aplicada ao reconectar sem alterar o slot. O slot estável permite um OBS permanente entre reconexões; mudar Room/senha/slot altera o link. Os IDs são roteamento, **não prova criptográfica de identidade**. Room/senha e URLs são acessíveis aos participantes do World; não equivalem a segredos de servidor ou a um sistema externo de autorização Foundry.

Configuração completa do GM — incluindo avatar individual, label configurável quando compatível com o nome Foundry, presets de qualidade e outras opções de iframe — pertence à fase após o gate. O painel inicial cobre apenas o necessário para três participantes e a comparação de áudio/Director. Não oferece upload de avatar nesta fase.

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

Opções: esquerda, direita, topo, embaixo, flutuante. `setPosition` posiciona a própria aplicação; o slider regula a dimensão transversal e o frame fornece resize. O dock inicial é um painel preso à borda **sobreposto ao jogo**: não reserva espaço do canvas, não altera o sidebar ou CameraViews. O iframe usa a dimensão disponível e conserva seus controles e menus nativos.

Flags `User` guardam preferências individuais por World: posição, largura lateral, altura da barra, geometria flutuante, abertura ao entrar e tipo de preview. Isso funciona em ambas as gerações e distingue usuários no mesmo navegador. Não altera a configuração mundial ao mover o dock.

Reposicionar/redimensionar e renderizar novamente mantém o mesmo elemento iframe sem removê-lo da árvore DOM ou alterar `src`. Fechar remove o frame e encerra sua sessão; reabrir cria um único novo frame. Alterações do GM/nome/self-preview mostram aviso; **Aplicar / reconectar** é a ação que troca a URL e reinicia a conexão. Preferências de tamanho não são sobrescritas só porque a viewport encolheu.

## Self-preview / PiP

Três opções individuais: UI nativa, `minipreview` e `pipme`. Nenhuma usa `view` para receber a própria câmera ou cria outro iframe. Segundo a documentação oficial, `pipme` abre o preview local em PiP e é incompatível com `autostart`; por isso não enviamos `autostart` em nenhum modo. O atalho nativo Ctrl+Alt+P (Cmd+Alt+P no Mac), com foco no iframe, também precisa ser testado.

Meta de teste: grupo permanece dockado e câmera do narrador aparece em um PiP móvel próximo à câmera física, sem segunda recepção de rede. Gesto/consentimento, suporte do browser e UI de Director podem afetar o resultado. O módulo lembra a opção de preview; posição e tamanho de uma janela PiP de sistema dependem do navegador e não têm persistência prometida pelo módulo. Documentar falha antes de desenvolver alternativa.

## Avatar: investigar antes de implementar

A documentação oficial de `avatar` descreve imagem padrão, arquivo local ou URL codificada e fallback quando vídeo é mutado ou não há câmera. A mesma página conserva ressalva sobre beta/alpha. O HTML servido em `https://vdo.ninja/` em 01/10/2026 declara `31.1`; isso não demonstra o comportamento real de avatar no iframe.

Após o gate, testar `avatar=<URL>` com imagem HTTPS acessível pela origem VDO, câmera ligada/desligada, navegador, Director, guests e OBS. Só habilitar imagem configurada pelo GM se o fallback funcionar de forma confiável. Não fazer proxy, canvas virtual ou mecanismo alternativo agora. Futuro upload/seleção do jogador dependerá de permissão do GM.

## OBS e áudio

O painel GM mostra/copia um solo link por usuário, construído como:

```text
https://vdo.ninja/?room=RPGUPPrototype123&view=slot_92md4&solo=&cleanoutput=
```

Senha, codec e bitrate aplicáveis ao viewer são propagados. Constraints de captura, Director, `push` e preferências de preview não vão ao OBS. Os links usam somente a configuração salva, com aviso para alterações ainda não salvas e seleção manual quando clipboard não funcionar. O OBS é apenas mais um consumidor oficial; não há plugin ou automação OBS.

O modo mundial de áudio é reversível: `discord` (inicial) usa `audiodevice=0` e `noaudio`, sem microfone delegado; `vdo` mantém os controles nativos sem overrides de áudio e delega microfone. Testar volume/mic no modo VDO e retornar à preferência da mesa. Não assumimos que áudio está permanentemente fora do projeto.

## Gate e critérios

Primeira prova, em **cada geração**: 1 GM, 2 jogadores, três clientes de navegador, uma Room, um iframe por cliente, slots automáticos e persistentes, câmera e visão mútua, clique direito/controles, cinco posições do dock, resize, self-preview/PiP e três fontes solo OBS com reconexão. Registrar versões exatas, parâmetros, permissões e problemas em [PROTOTYPE-RESULTS.md](PROTOTYPE-RESULTS.md).

Testes unitários e fixture de navegador verificam nosso código; não substituem essa prova. Somente se ela passar, avançar para 4–6 participantes, painel GM completo, avatar, acabamento visual, presets e exportação organizada OBS. Falha fundamental → registrar e investigar o recurso oficial antes de propor outra arquitetura. A simplicidade é o critério principal.

## Fontes oficiais consultadas em 01/10/2026

- [ApplicationV2 v13](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html), [ApplicationV2 v14](https://foundryvtt.com/api/v14/classes/foundry.applications.api.ApplicationV2.html), [ClientSettings v13](https://foundryvtt.com/api/v13/classes/foundry.helpers.ClientSettings.html).
- [Room](https://docs.vdo.ninja/advanced-settings/setup-parameters/room), [push e IDs permanentes](https://docs.vdo.ninja/advanced-settings/setup-parameters/push), [Director](https://docs.vdo.ninja/advanced-settings/director-parameters/director), [showdirector](https://docs.vdo.ninja/advanced-settings/director-parameters/and-showdirector).
- [Iframe API](https://docs.vdo.ninja/guides/iframe-api-documentation/iframe-api-basics), [pipme](https://docs.vdo.ninja/advanced-settings/design-parameters/and-pipme-alpha), [minipreview](https://docs.vdo.ninja/advanced-settings/video-parameters/and-minipreview).
- [Avatar](https://docs.vdo.ninja/advanced-settings/video-parameters/and-avatar), [solo](https://docs.vdo.ninja/advanced-settings/mixer-scene-parameters/and-solo), [password](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-password).
- [audiodevice](https://docs.vdo.ninja/advanced-settings/setup-parameters/audiodevice), [noaudio](https://docs.vdo.ninja/advanced-settings/audio-parameters/noaudio).
