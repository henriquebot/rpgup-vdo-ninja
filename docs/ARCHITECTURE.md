# Arquitetura: RPGUP VDO.Ninja para Foundry VTT v14

**Status:** architecture / prototype — proposta para revisão, sem implementação funcional.
**Pesquisa:** 1 de outubro de 2026, America/Sao_Paulo.
**Escopo:** vídeo de 4–6 participantes no Foundry; câmeras individuais de boa qualidade para OBS/YouTube; áudio exclusivamente no Discord.

## 1. Decisão recomendada

**Escolher D: clientes oficiais WHIP/WHEP do VDO.Ninja SDK + relay autenticado sob nosso controle + adaptador AVClient v14 para o dock nativo.** A integração usa o ecossistema VDO.Ninja, mas não depende da sala pública nem precisa mostrar seu site ao jogador.

O jogador clica para abrir a câmera no Foundry. Uma captura local, somente de vídeo, alimenta uma publicação WHIP para o relay. Os outros Foundry e o OBS recebem por WHEP. O registro da sessão associa usuários do Foundry a slots estáveis; um serviço complementar emite permissões separadas de publicação, leitura e administração.

**Relay de referência: MediaMTX**, alternativa Meshcast-like documentada pelo próprio VDO.Ninja. Usar uma versão fixada, HTTPS, autenticação externa e controle de sessões. A emissão de credenciais fica num serviço pequeno, separado do módulo. Esse serviço é uma dependência real da proposta; um módulo Foundry executado apenas no navegador não consegue guardar uma chave administrativa secreta nem validar sozinho identidades externas.

**Integração visual prioritária:** adaptar a interface pública foundry.av.AVClient e usar CameraViews v14. Com tracks nativas isso é plausível e merece ser o primeiro experimento. Se o ciclo de vida do dock exigir alterações internas frágeis, usar um CameraDock próprio em ApplicationV2, visualmente próximo, conservando o mesmo transporte e controle de sessão. O fallback visual não muda o upload nem as fontes OBS.

**MVP:** uma representação de qualidade por câmera, encaminhada sem reencodificação. **v0.2:** produzir no servidor uma versão menor para Foundry, preservando a original para OBS. Não prometer que Meshcast ou MediaMTX criem automaticamente versões diferentes.

Essa escolha prioriza qualidade de contribuição, estabilidade e upload constante. Ela acrescenta operação de servidor, mas oferece autorização verificável, controle efetivo do GM, versões fixadas e independência das cotas do relay público. É uma decisão arquitetural; a compatibilidade ponta a ponta ainda precisa dos testes da seção 16.

Fontes: [guia oficial MediaMTX/VDO.Ninja](https://docs.vdo.ninja/guides/deploy-your-own-meshcast-like-service), [SDK oficial](https://sdk.vdo.ninja/), [clientes oficiais no código](https://github.com/steveseguin/ninjasdk/tree/3065375308420da2f01fd57b4974088a39274cf9).

## 2. Decisão explícita entre A, B, C e D

| Opção | OBS / upload | Foundry / segurança | Decisão |
| --- | --- | --- | --- |
| A — iframe independente por câmera | OBS isolado é viável; P2P ainda cria uma saída por espectador | Cada iframe custa recursos; não fornece um MediaStream portável ao pai | Descartada como arquitetura principal; útil como viewer de diagnóstico |
| B — sala VDO.Ninja embutida | Sala organiza convidados, mas não transforma mesh P2P em distribuição com upload único | UI/diretor continuam ligados ao VDO.Ninja; credencial compartilhada não identifica usuários Foundry | Descartada como experiência padrão |
| C — iframe API/postMessage + UI própria | Pode publicar por Meshcast/WHIP e ocultar boa parte da UI | Controle útil, porém cross-origin complica acesso às tracks, permissões e integração nativa | Alternativa de comparação e contingência, sem acoplar o dock nativo ao DOM externo |
| D — SDK WHIP/WHEP + relay autenticado + AVClient v14 | Uma publicação por jogador; OBS lê o original; servidor poderá gerar preview | Tracks nativas, tokens por ação/path, UI Foundry e monitoramento direto | **Recomendada** |

Uma sala tradicional e o Director Room podem ser úteis para diagnóstico ou produção manual. No produto, o GM dirige a **sessão do módulo**, sem abrir um Director Room que receba cópias adicionais. Stream IDs são um conceito de identificação; não são uma arquitetura de transporte nem prova de identidade.

O SDK oficial existe atualmente, apesar de trechos históricos da documentação de iframe sugerirem que ainda seria uma possibilidade futura. Sua versão declarada no package.json consultado é 1.6.1; os clientes companion WHIP/WHEP têm cabeçalho v1.0.0. Fixar o pacote e revisar exatamente os arquivos usados, em vez de depender de CDN com latest.

Fonte: [package.json e exports oficiais](https://github.com/steveseguin/ninjasdk/blob/3065375308420da2f01fd57b4974088a39274cf9/package.json).

## 3. Fluxo de mídia e controle

~~~text
JOGADOR — navegador dentro do Foundry v14
  clique "Abrir câmera" + permissão do navegador
  captura local: 1 track de vídeo, 0 tracks de áudio
  ├── preview local no Foundry (sem receber a própria câmera pela rede)
  └── VDO.Ninja WHIPClient ── 1 contribuição HQ ──► RELAY AUTENTICADO
                                                   │
                                  MediaMTX: path /sessão/slot/hq
                                                   │
                      ┌────────────────────────────┼─────────────────────┐
                      ▼                            ▼                     ▼
             Foundry dos participantes      OBS Browser Source     worker v0.2
             WHEPClient → MediaStream        individual por slot    HQ → preview
             → AVClient → CameraViews        HQ sem UI / áudio           │
                      ▲                                                  ▼
                      └──────── v0.2: consumir /sessão/slot/preview ───────┘

GM no Foundry ──► serviço de sessão/credenciais ──► autorização + controle relay
Jogador      ──► admissão e token restrito        ──► publish só no próprio slot
OBS          ──► capability somente leitura      ──► WHEP do slot autorizado

Discord: microfones → conversa → captura de áudio do Discord no OBS
Servidor Foundry: jogo, usuários e UI; não encaminha mídia de vídeo.
~~~

Na opção D, os clientes WHIP/WHEP usam sinalização HTTP com o relay; não precisam montar uma malha pela sinalização pública do VDO.Ninja. O módulo utiliza bibliotecas oficiais do projeto. STUN/TURN e o relay de mídia continuam sendo infraestrutura, mesmo sem uma sala VDO.Ninja pública.

## 4. Evidências técnicas e limites da pesquisa

As páginas oficiais e os repositórios foram lidos em 01/10/2026. A pesquisa verificou documentação e código, não realizou chamadas de câmera, instalação Foundry nem medição OBS.

| Fonte inspecionada | Snapshot | Achado que afeta a decisão |
| --- | --- | --- |
| steveseguin/vdo.ninja | develop, commit 28e0d803602882694e25c7fa82d372edb02554fe, 17/09/2026 | main.js configura WHIP/WHEP, dispositivos, bitrate e audience; iframe.html e iframe-examples.js expõem comandos; webrtc.js implementa Meshcast 2.0 |
| steveseguin/ninjasdk | main, commit 3065375308420da2f01fd57b4974088a39274cf9, 08/09/2026 | WHIPClient e WHEPClient aceitam authToken; getStats(), stop() e restartIce(); WHEP entrega tracks/MediaStream |
| Foundry API v14 | páginas versionadas /api/v14; rodapés consultados variam entre 14.365 e 14.368 | AVClient, AVMaster, AVSettings e CameraViews existem nas APIs atuais |
| bekriebel/fvtt-module-avclient-livekit | main, commit 258d14ad91b290a2f0e827e0f5f2afa1cf5ffe87, 17/06/2026 | CONFIG.WebRTC.clientClass; classe extends foundry.av.AVClient; tracks anexadas em setUserVideo |
| luvolondon/fvtt-module-jitsiwebrtc | main, commit 4710e61391cb977453c58d9955695510e2636e15, 20/04/2022 | Histórico de substituição AVClient e track.attach(videoElement); README declara descontinuação |

Não inferir que develop corresponde à versão servida em vdo.ninja/. Há documentação antiga junto a descrições novas. Especialmente em Meshcast 2.0, registrar versão do frontend, origem do embed, plano e chave usada em cada teste.

Nenhum arquivo do projeto henriquebot/rpgup-livekit-avclient foi alterado. A referência LiveKit desta pesquisa é o projeto upstream de bekriebel.

Links de código: [VDO.Ninja main.js](https://github.com/steveseguin/vdo.ninja/blob/28e0d803602882694e25c7fa82d372edb02554fe/main.js), [webrtc.js](https://github.com/steveseguin/vdo.ninja/blob/28e0d803602882694e25c7fa82d372edb02554fe/webrtc.js), [LiveKit AVClient](https://github.com/bekriebel/fvtt-module-avclient-livekit/blob/258d14ad91b290a2f0e827e0f5f2afa1cf5ffe87/src/LiveKitAVClient.ts), [Jitsi AVClient](https://github.com/luvolondon/fvtt-module-jitsiwebrtc/blob/4710e61391cb977453c58d9955695510e2636e15/src/JitsiAVClient.js), [README Jitsi](https://github.com/luvolondon/fvtt-module-jitsiwebrtc/blob/4710e61391cb977453c58d9955695510e2636e15/README.md).

## 5. API de iframe: o que realmente podemos controlar

A integração C é possível com URLs iniciais e postMessage bidirecional. A documentação inclui consulta de stats e notificações de conexão; o console oficial atual acrescenta câmera, lista/troca de dispositivos e estado detalhado. O contrato deverá ser testado no build escolhido.

| Necessidade | Evidência oficial | Limite arquitetural |
| --- | --- | --- |
| Iniciar publicação | push/whipout + autostart/webcam; exemplo function: previewWebcam | Clique e permissão são necessários; previewWebcam não deve ser tratado como um comando universal publish/start |
| Mic / reprodução | mic: false e mute: true | Silenciar não prova ausência de captura/track; usar audiodevice=0 para publicação e noaudio para recepção |
| Ligar/desligar câmera | camera: true/false no console | Testar se desliga a track, só corta imagem ou mantém dispositivo aberto |
| Escolher câmera | getDeviceList e changeVideoDevice no console | IDs de dispositivo pertencem à origem VDO.Ninja; não reutilizar IDs da origem Foundry |
| Bitrate | bitrate e target nos exemplos | Efeito varia conforme peer e transporte; não supor que um comando P2P altere o encoder WHIP |
| Resolução/FPS | width, height, fps na URL; scale no console | Capture constraints, escala e representação transmitida são coisas distintas; mudança dinâmica exigirá teste ou recriação |
| Stats / estado | getStats, getDetailedState, getStreamIDs | Schema pode mudar e nem toda estatística WHIP está garantida no mesmo formato |
| Encerrar / recuperar | close: true, reload: true | Reload afeta publicação e captura; recuperar viewer isolado primeiro |

Se C for testada, manter um bridge com lista fechada de comandos, validar event.origin, event.source e schema, e enviar para a origem exata do iframe. Os exemplos usam wildcard; isso não será o padrão do módulo. Não usar eval, injeção arbitrária de JS/CSS nem dados recebidos em innerHTML.

Um MediaStream não é um objeto que devemos simplesmente transferir pelo postMessage entre origens. A documentação menciona recursos avançados de frames brutos/custom deployment; eles acrescentam restrições e custo. Não usar document.domain nem pressupor que subdomínios diferentes sejam a mesma origem.

Fontes: [iframe API oficial](https://docs.vdo.ninja/guides/iframe-api-documentation), [console e comandos no código](https://github.com/steveseguin/vdo.ninja/blob/28e0d803602882694e25c7fa82d372edb02554fe/iframe-examples.js), [segurança de postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

## 6. Parâmetros oficiais relevantes

Esta tabela é referência para comparação C/P2P/Meshcast e URLs de diagnóstico. Na arquitetura D, as opções equivalentes são passadas aos clientes SDK, sem montar URLs de publicação para o jogador.

| Grupo | Parâmetros | Uso e cuidado |
| --- | --- | --- |
| Identificação | push, view, room, director, scene | Publicar, receber, reunir e dirigir; a sala não torna um ID exclusivo ao usuário |
| Senha | password, hash | Senha protege o contexto P2P/sala; hash é mecanismo de conferência, não JWT nem separação publish/read |
| Publicação separada | audience | Token publish diferente do viewer; documentado para streams individuais, não salas |
| Captura | webcam, autostart, videodevice, width, height, fps | Simplificar entrada; sempre confirmar valores efetivos no dispositivo |
| Sem áudio | audiodevice=0, noaudio | O primeiro desabilita a fonte de áudio; o segundo impede reprodução/recepção conforme fluxo |
| P2P | codec, videobitrate/bitrate, roombitrate, totalroombitrate, scale | Codec é preferência do viewer; bitrate é alvo/cap conforme negociação |
| Meshcast | meshcast=video, meshcast2, meshcastbitrate, meshcastcodec, meshcastcode | Publicação pelo relay; build atual pode rotear meshcast para 2.0 |
| Contingência P2P | nomeshcast | Solicita P2P; adiciona upload ao publisher e pode contornar a política prevista |
| Relay próprio | whipout, whipouttoken, whipoutcodec, whipoutvideobitrate, whep, wheptoken | Endpoints WHIP/WHEP e bearer; conferir versão e CORS |
| OBS / aparência | cleanoutput, transparent, margin | Limpar UI e fundo; transparência do fundo não remove fundo da webcam |
| Recuperação / NAT | autorecover, retry, retrytimeout, relay, turn, tcp | Recursos do frontend, não garantia automática no cliente SDK independente |

**Semântica importante:** codec em uma URL view é preferência de negociação, enquanto whipoutcodec/meshcastcodec selecionam a publicação pelo relay. Aumentar bitrate no viewer não cria detalhes que nunca foram capturados ou enviados. width/height/fps não garantem que a câmera consiga cumprir os valores.

Fontes específicas: [IDs](https://docs.vdo.ninja/getting-started/stream-ids), [senhas](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-password), [hash](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-hash), [codec](https://docs.vdo.ninja/advanced-settings/video-parameters/codec), [bitrate](https://docs.vdo.ninja/advanced-settings/video-bitrate-parameters/bitrate), [WHIP](https://docs.vdo.ninja/advanced-settings/whip-parameters/and-whipout), [WHEP](https://docs.vdo.ninja/advanced-settings/whip-parameters/and-whep).

## 7. P2P, Meshcast e relay próprio: orçamento de rede

Uma captura e um encoder não equivalem a um único upload. Em P2P cada conexão de mídia consome saída; OBS Browser Source é outro espectador, além do navegador Foundry do GM. TURN encaminha pares e não agrega essas cópias.

Definições para as estimativas abaixo: N inclui todos que publicam, inclusive o GM; todos assistem aos outros N−1; há um OBS com uma source por câmera. H = bitrate HQ, L = preview. Preview local não atravessa a rede. Valores são payload aproximado, sem RTP/RTCP, retransmissões, ICE ou margem de segurança.

~~~text
P2P com preview leve e OBS HQ:
  upload por jogador ≈ (N−1) × L + H

P2P ingênuo, todos HQ:
  upload por jogador ≈ N × H

Relay, uma representação:
  upload por jogador ≈ H
  download por Foundry ≈ (N−1) × H
  saída relay ≈ N × (N−1) × H + N × H = N² × H

Relay + preview gerado no servidor:
  upload por jogador ≈ H
  download por Foundry ≈ (N−1) × L
  saída relay ≈ N × (N−1) × L + N × H
~~~

| Cenário H=4 Mb/s, L=0,6 Mb/s | 4 pessoas | 6 pessoas |
| --- | ---: | ---: |
| Upload de cada pessoa, P2P HQ para todos | 16 Mb/s | 24 Mb/s |
| Upload de cada pessoa, P2P previews + OBS | 5,8 Mb/s | 7 Mb/s |
| Upload de cada pessoa, relay | 4 Mb/s | 4 Mb/s |
| Download de cada Foundry, relay HQ único | 12 Mb/s | 20 Mb/s |
| Download de cada Foundry, preview no servidor | 1,8 Mb/s | 3 Mb/s |
| Download do OBS, câmeras HQ | 16 Mb/s | 24 Mb/s |
| Egress do relay, todos recebem HQ | 64 Mb/s | 144 Mb/s |
| Egress do relay, Foundry recebe preview | 23,2 Mb/s | 42 Mb/s |

Para seis câmeras e quatro horas, 144 Mb/s correspondem a aproximadamente **259,2 GB** de egress; 42 Mb/s a **75,6 GB**, em unidades decimais. Ingest de seis câmeras a 4 Mb/s soma outros 43,2 GB, se o provedor o cobrar/contabilizar. Acrescentar overhead e folga. Quatro sessões mensais de quatro horas podem ultrapassar 1 TB só em egress HQ. O upload foi deslocado para a infraestrutura, não eliminado.

Tamanho CSS do tile não reduz a rede nem necessariamente o decode. Pausar/remover uma assinatura WHEP reduz o consumo local; não deve encerrar a publicação que o OBS utiliza. Abrir outro OBS, duplicar fontes independentes ou usar uma segunda aba Foundry aumenta as saídas do relay. Reutilizar a mesma source OBS nas cenas.

Fonte para a distinção TURN/SFU: [TURN oficial VDO.Ninja](https://docs.vdo.ninja/advanced-settings/turn-and-stun-parameters/turn). As fórmulas e valores acima são estimativas próprias, não benchmarks.

### 7.1 Meshcast atual: utilidade, limites e divergências

Meshcast é uma boa prova de distribuição com contribuição única, mas não será a garantia de privacidade/operação do módulo. A documentação de bitrate descreve a mesma representação para todos: reduzir bitrate/scale do viewer não produz um preview separado no Meshcast clássico. A política de privacidade alerta que conhecer o ID do feed pode permitir assistir sem a senha da sala e que o relay não é E2EE por padrão.

Fontes: [bitrate Meshcast](https://docs.vdo.ninja/advanced-settings/meshcast-parameters/and-meshcastbitrate), [privacidade VDO.Ninja](https://docs.vdo.ninja/help/privacy-and-security-details).

O site legado meshcast.io descreve uso gratuito, até 100 espectadores e ausência de garantia de disponibilidade. **Não usar essa descrição como limite contratual do Meshcast 2.0.** Seu portal atual está em preview, com promoção temporária de funções premium.

Fontes: [serviço legado e termos](https://meshcast.io/), [portal 2.0](https://app.meshcast.io/).

| Plano anunciado em 01/10/2026 | Valor nominal anunciado | Streams concorrentes | Banda mensal | Espectadores anunciados |
| --- | ---: | ---: | ---: | ---: |
| Sem conta | gratuito | 1 | 50 GB | 20 |
| Conta Free | gratuito | 1 | 200 GB | 20 |
| Solo Creator | $10/mês | 4 | 500 GB | 30 |
| Creator Plus | $25/mês | 10 | 1 TB | 50 |
| Studio Pro | $50/mês | 25 | 2 TB | 100; 400 com SFU, conforme página |

Preços transcritos com o símbolo anunciado, sem conversão, impostos ou promessa de vigência. Promoção de preview não equivale a preço permanente. Uma conta Free não cobre 4–6 contribuições simultâneas; Solo não cobre seis. As cotas de espectadores e banda precisam de confirmação quanto à contabilização por stream/conta e ingress/egress. Capacidade de cloud transcode não implica que cada participante tenha automaticamente uma versão leve.

Fonte: [pricing atual Meshcast](https://app.meshcast.io/pricing).

A integração 2.0 atual descreve Publish Keys pk_..., chave separada por publisher, limites anônimos compartilhados pelo IP público e restrições de origem para embeds gratuitos. Chave inválida não muda silenciosamente para acesso anônimo nessa integração. Isso diverge da página antiga que menciona tokens mc_/live_ e fallback anônimo. O código develop consultado também usa chaves, sessões anônimas renováveis e gateway WHIP/WHEP. Portanto, testar o caminho exato; nunca contornar cotas criando identidades artificiais.

Fontes: [guia 2.0 atual](https://app.meshcast.io/docs/vdoninja-integration), [página anterior de meshcast](https://docs.vdo.ninja/advanced-settings/meshcast-parameters/and-meshcast), [implementação meshcast2 em webrtc.js](https://github.com/steveseguin/vdo.ninja/blob/28e0d803602882694e25c7fa82d372edb02554fe/webrtc.js#L24684).

**Conclusão:** Meshcast gerenciado pode virar transporte opcional se tokens, origins, quotas, privacidade de leitura e estabilidade forem demonstrados. Não selecionar o serviço público apenas por ser gratuito. Relay próprio tem custo variável de VPS, tráfego, TURN, domínio e, na v0.2, CPU/GPU de transcode; não foi contratado nem dimensionado por preço nesta entrega.

## 8. Integração Foundry v14

As APIs atuais ainda incluem foundry.av.AVClient e CONFIG.WebRTC.clientClass. AVMaster está em game.webrtc. CameraViews atual fica em foundry.applications.apps.av.CameraViews e é uma ApplicationV2; não copiar receitas que usam classes globais/v10 ou substituem templates antigos.

Fontes: [AVClient v14](https://foundryvtt.com/api/v14/classes/foundry.av.AVClient.html), [CONFIG.WebRTC v14](https://foundryvtt.com/api/v14/variables/CONFIG.WebRTC.html), [AVMaster v14](https://foundryvtt.com/api/v14/classes/foundry.av.AVMaster.html), [CameraViews v14](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.av.CameraViews.html).

### 8.1 Contrato do adaptador proposto

| Responsabilidade | Comportamento do módulo |
| --- | --- |
| Inicialização/conexão | Registrar classe durante inicialização compatível com v14; conectar ao serviço de sessão e transporte autorizado |
| Usuários conectados | Informar usuários com mídia válida; distinguir presença Foundry de frames realmente recebidos |
| Streams / vídeo do usuário | Manter mapa userId → MediaStream; anexar a track local/remota ao elemento fornecido por setUserVideo |
| Dispositivos / troca de câmera | Enumerar câmeras no navegador Foundry; substituir track da publicação sem abrir segunda captura permanente |
| Toggle vídeo | Abrir/encerrar a própria captura e publicação; liberar a webcam ao parar |
| Áudio / níveis | Áudio sempre desabilitado; lista de fontes de áudio vazia; níveis sem stream; não ativar voice detection |
| Mudanças de settings | Reagir a vídeo bloqueado, qualidade, câmera e sessão; minimizar renegociações |
| Desconexão | Encerrar publishers/viewers e resources HTTP; parar explicitamente tracks locais e cancelar timers |

O AVClient documenta MediaStream e setUserVideo com HTMLVideoElement. Os upstreams LiveKit/Jitsi mostram que getMediaStreamForUser pode retornar null e a biblioteca anexar suas próprias tracks; isso não prova que um iframe possa ser colocado no lugar de qualquer video element. O SDK elimina essa dificuldade ao fornecer tracks locais/remotas no mesmo contexto.

Usar AVSettings.AV_MODES.VIDEO e a configuração pública correspondente. Validar o ciclo init/ready/connect e o vínculo entre permissão Foundry e autorização do relay. Não alterar métodos marcados Internal, nem depender de _initializeUserVoiceDetection. O GM continua tendo permissões de vídeo, porém a aplicação do bloqueio no servidor é responsabilidade do serviço complementar.

Fonte: [AVSettings v14](https://foundryvtt.com/api/v14/classes/foundry.av.AVSettings.html).

Há apenas um clientClass ativo. Detectar módulos AV conflitantes e exigir que o GM escolha o provedor, sem substituir silenciosamente outro AVClient. O modo fallback de dock próprio deverá impedir captura duplicada pelo A/V nativo. Manter câmera local única mesmo quando o dock renderiza, muda posição ou abre popout; usar nova associação visual, não nova publicação.

O CameraDock próprio, se necessário, usa ApplicationV2/HandlebarsApplicationMixin, nomes e cores dos usuários, ordenação estável, posições horizontal/vertical, ocultar/maximizar e indicadores. Isso é mais seguro do que modificar o DOM interno de CameraViews para acomodar iframes. Para status avançado, começar com painel diagnóstico próprio e acrescentar badges ao dock somente por extensão/hook estável demonstrado no v14.

Fonte: [política pública/interna da API Foundry](https://foundryvtt.com/api/v14/).

## 9. Responsabilidades e experiência de uso

### Jogador

- Abrir o Foundry, aguardar sessão ativa e clicar **Abrir câmera**.
- Autorizar câmera no navegador e escolher dispositivo, se houver mais de um.
- Publicar somente vídeo no próprio slot; acompanhar status e encerrar quando quiser.
- Receber automaticamente as câmeras autorizadas, sem links, IDs ou entendimento de VDO.Ninja.
- Ver mensagem prática para permissão negada, webcam ocupada ou rede indisponível.

### GM

- Parear uma vez o mundo/instalação ao serviço de sessão por seu painel administrativo.
- Iniciar/encerrar sessão, aprovar admissões de dispositivos e definir participantes.
- Definir perfil de contribuição, ver transporte/qualidade e bloquear/revogar publicação.
- Usar **Copiar fontes OBS** para exportar nomes, URLs individuais, tamanho e FPS sugeridos.
- Revogar links de leitura vazados e iniciar uma nova sessão quando necessário.

O GM pode bloquear publicação e pedir recuperação; não deve ligar a câmera de um jogador sem sua ação/permissão. Um aviso de sessão gravada deve estar visível antes do clique. O módulo não entra no Discord nem altera seus dispositivos.

### Serviço complementar

Manter sessão, admissões, roster e capabilities; emitir tokens com escopo; autorizar acesso ao relay; expulsar conexões revogadas; oferecer página OBS independente e diagnósticos agregados. Servir tudo por HTTPS. No MVP, pode compartilhar o VPS do MediaMTX, mas não sua autoridade administrativa com o navegador.

## 10. Sala, slots e IDs

Na arquitetura D, **sala é lógica no serviço do módulo**, não obrigatoriamente room= do VDO.Ninja. O registro deverá conter:

~~~text
worldBinding: identificador aleatório registrado pelo administrador
sessionId: nonce aleatório de pelo menos 128 bits
sessionEpoch: número de revisão/rotação de autorização
status: starting | active | ending | ended
roster:
  userIdFoundry → slotId aleatório fixo para a sessão
  nome exibido, dispositivo aprovado, perfil, status de publicação
media paths:
  /sessionId/slotId/hq
  /sessionId/slotId/preview   (v0.2)
expiresAt e políticas de publicação/leitura
~~~

O identificador é **previsível para o módulo/GM**, por estar registrado, e estável durante a sessão; não precisa ser adivinhável publicamente. Evitar nomes pessoais, worldId público ou userId como credencial. Não usar Math.random para segredos. Gerar nonces com CSPRNG no serviço; Web Crypto é aceitável para desafios/chaves efêmeras do navegador.

Reconectar, mudar câmera, recarregar iframe de diagnóstico ou renovar token não muda o slot. Reentrada na mesma sessão exige reautenticação/admissão e recebe o mesmo slot. Nova sessão cria novo namespace e invalida capabilities anteriores. Duas abas tentando publicar no mesmo slot são resolvidas por lease único; não permitir takeover automático de publisher ativo.

Para um transporte opcional P2P/iframe, o serviço poderá manter pushId/viewId e senha/audience separados conforme o provedor. Não derivar segredo de publicação a partir de uma credencial de leitura.

## 11. Segurança: identidade, autorização e segredos

### 11.1 Limite que precisa ser explícito

**“Nenhum segredo no cliente” literalmente é incompatível com publicação autenticada por bearer e links OBS privados.** O navegador precisa de alguma prova de permissão e o OBS conserva sua URL na coleção de cenas. O compromisso viável é: nenhuma chave administrativa/assinadora ou credencial permanente de infraestrutura no cliente; apenas capabilities revogáveis, de curta duração ou limitadas à sessão e à ação/path.

Um ID aleatório e uma senha de sala reduzem descoberta, mas participantes que recebem a mesma credencial podem tentar publicar com outro push. Esconder botões, checar game.user.isGM ou confiar em userId/isGM dentro de uma mensagem de socket não é autorização de servidor.

O parâmetro audience separa publicação e leitura de um stream individual, porém não é documentado para salas e não comprova identidade Foundry. A página também descreve geração local de chave e endpoints server-side de tokens: não tratar esse texto como contrato de autenticação auditado. Usar apenas em teste específico, não como substituto do serviço de identidade.

Fonte: [audience oficial](https://docs.vdo.ninja/advanced-settings/setup-parameters/and-audience).

### 11.2 Admissão sem inventar uma API server-side Foundry

Não foi identificada nesta pesquisa uma API pública genérica que permita a um backend externo validar automaticamente a sessão de usuário Foundry. Um módulo comum não instala middleware Node no servidor Foundry. Portanto, o MVP precisa de uma admissão explícita:

1. Administrador autentica-se no serviço complementar e associa a chave efêmera de controle do GM à sessão. A senha/chave de administração não é gravada em settings Foundry.
2. Jogador solicita entrada automaticamente; seu navegador gera chave efêmera e prova de posse. O pedido informa world/session e o userId pretendido, inicialmente **não confiável**.
3. GM aprova a associação slot ↔ dispositivo após conferir a identidade por um canal confiável já existente, por exemplo a voz conhecida no Discord e um desafio mostrado ao jogador. A conferência é necessária na primeira admissão ou novo dispositivo, sem copiar links/IDs de vídeo.
4. Broker vincula a autorização à chave aprovada e exige prova de posse ao renovar/obter novos tokens. Capabilities não são distribuídas pelo socket público.

Uma aprovação de lista baseada apenas no nome/userId recebido não basta contra participante malicioso. Se for exigida entrada totalmente automática com identidade forte, integrar na v0.2 uma identidade externa ou um adaptador de autenticação confiável do host, demonstrando sua segurança antes de remover a aprovação. Não alegar que esse vínculo já foi resolvido.

### 11.3 Autorização do relay

Adotar tokens opacos curtos com validação HTTP externa no MVP. MediaMTX suporta autenticação externa por HTTP, além de JWT com permissões por ação/path. O broker poderá validar sessão ativa, lease, usuário/dispositivo aprovado e limites. API administrativa do relay e callbacks ficam em rede privada. Negar publicação/leitura anônima também por protocolos auxiliares expostos.

Fontes: [autenticação MediaMTX](https://mediamtx.org/docs/features/authentication), [API de controle](https://mediamtx.org/docs/references/control-api).

| Credencial | Quem recebe | Permissão proposta |
| --- | --- | --- |
| Publish access token | Somente dispositivo admitido | publish no próprio path HQ; alvo inicial de 5 minutos para novas negociações |
| Read access token | Foundry autorizado | read dos paths permitidos; renovação com prova de admissão |
| OBS capability | GM/OBS | read de um slot da sessão; trocada por tokens curtos; sem publish nem controle |
| GM session capability | GM pareado | Gestão dessa sessão, sem administração geral do servidor |
| Chave administrativa / signer / TURN shared secret | Somente backend | Operação infraestrutura; nunca world settings, bundle ou URL OBS |

Expiração de token **não encerra automaticamente** uma conexão WebRTC estabelecida. Revogar requer negar novas negociações/renovações **e** fechar sessões ativas no relay/gateway; controlar recursos por sessão/slot e conferir que a API da versão fixada suporta essa expulsão. Se usar JWT futuramente, verificar iss/aud/exp, política de revogação e sessões existentes.

Impedir troca de path, replay de admissão, colisões e publicação concorrente; rate-limit de pedidos, expiração de pendências e auditoria sem segredos. Endpoints e hosts são configurados pelo administrador e aceitos por allowlist, evitando redirects que enviem Authorization a outro host.

### 11.4 URLs e confidencialidade

Manter tokens em memória; não em User flags, world settings replicadas, chat, logs ou repositório. OBS capability pode ficar no fragmento # de uma página própria: fragmentos não são enviados na requisição HTTP inicial, mas continuam acessíveis ao navegador/OBS e ao código da página. A página troca a capability por read token via HTTPS. Não é invulnerabilidade a XSS.

Credencial vazada permite leitura durante sua validade; revogar e expulsar os leitores. Não dá para impedir gravação/cópia por participante autorizado. Encerrar sessão deve efetivamente derrubar mídia e invalidar URLs, inclusive quando Foundry já estiver fechado.

WebRTC protege o transporte; o relay recebe mídia e não é E2EE por padrão. É o tradeoff escolhido por distribuição e futura transcodificação. Backend e administrador passam a integrar a fronteira de confiança.

## 12. Qualidade e bitrate

Valores abaixo são **alvos iniciais do projeto**, não promessa do serviço nem do dispositivo.

| Perfil | Captura/contribuição sugerida | Uso |
| --- | --- | --- |
| Gravação padrão desktop | 1920×1080, 30 fps, 4–6 Mb/s | Webcam bem iluminada, upload sustentado com folga |
| Conexão moderada | 1280×720, 30 fps, 2–3 Mb/s | Fallback de qualidade mantendo fluidez |
| Mobile/rede fraca | 960×540 ou 1280×720, 24–30 fps, 1–2 Mb/s | Reduzir aquecimento e upload |
| Preview servidor v0.2 | 640×360 ou 960×540, 15–24 fps, 0,4–0,8 Mb/s | Tiles Foundry; HQ permanece original no OBS |

O perfil deve usar constraints ideal, confirmar getSettings e informar resolução/FPS efetivos. Preservar uma só captura e um só publisher. Codec inicial para testar: H.264 compatível sem B-frames; comparar VP8 para incompatibilidades. Não assumir hardware encoding universal. VP9/AV1 só após benchmarks de CPU/OBS/mobile.

MediaMTX encaminha mídia e não cria automaticamente bitrate/resolução novos. Na v0.2, worker FFmpeg/GStreamer lê HQ e gera um preview por publisher, compartilhado entre viewers. Não transcodificar a source HQ destinada ao OBS. Dimensionar CPU/GPU, atraso, dependências e recuperação dos workers. Simulcast/SVC podem ser alternativas futuras, mas exigem suporte demonstrado de encoder, relay e seleção de camadas; várias camadas ainda gastam bitrate de upload.

Fonte: [re-encoding oficial MediaMTX](https://mediamtx.org/docs/features/remuxing-reencoding-compression).

Na v0.1, Foundry recebe HQ também: seis pessoas podem ter 20 Mb/s e cinco decoders por cliente, além do canvas. Expor ocultar/pausar assinaturas e um perfil global moderado; não prometer preview leve. CSS não resolve esse limite. Esse custo de download/decode é o maior risco de desempenho inicial.

Não reduzir o HQ porque apenas um viewer Foundry está lento. Priorizar trocar esse viewer para preview na v0.2; no MVP, pausar a visualização problemática ou negociar uma redução consciente da contribuição. Reduzir captura/bitrate quando o **publisher** está congestionado, com histerese e indicação ao GM.

Acompanhar availableOutgoingBitrate quando existir, qualityLimitationReason, perda, RTT e FPS efetivo. Nunca tratar alvo configurado como bitrate recebido. Reservar margem para Discord, Foundry e variação de Wi-Fi; uma referência inicial é evitar ocupar mais de 60–70% do upload sustentado medido.

## 13. OBS: fontes independentes e estabilidade dos links

**Copiar fontes OBS** gera uma entrada por usuário: nome legível, slot, URL de leitura, viewport sugerido, FPS, sessão/validade e estado. Nunca exportar URL push, token de publicação ou segredo administrativo.

Página própria proposta:

~~~text
https://media.example.invalid/obs/SESSION/SLOT#k=SESSION_READ_CAPABILITY
~~~

O domínio acima é ilustrativo. A página é independente do login Foundry e do navegador do GM, troca sua capability por credencial curta, consulta o path HQ e usa WHEPClient. Mostra apenas o vídeo com fundo transparente, sem nomes/status sobre a gravação. Quando offline, fundo transparente e diagnósticos separados. Pode ter pequeno wrapper de recuperação; isso ainda não foi implementado.

Para comparar um viewer VDO.Ninja externo, a referência é:

~~~text
https://vdo.ninja/?whep=ENCODED_WHEP_ENDPOINT&wheptoken=READ_TOKEN&noaudio&cleanoutput&transparent
~~~

Essa URL é diagnóstica e expõe token na query. Não é o formato durável preferido do produto. URL WHEP isolada não é uma página HTML que OBS Browser Source reproduza automaticamente; ela precisa de um cliente/player.

Fontes: [WHEP no VDO.Ninja](https://docs.vdo.ninja/advanced-settings/whip-parameters/and-whep), [cleanoutput](https://docs.vdo.ninja/advanced-settings/design-parameters/cleanoutput), [transparent](https://docs.vdo.ninja/advanced-settings/design-parameters/and-transparent).

Configuração inicial: Browser Source 1920×1080/30 fps para HQ 1080p; preservar proporção; desativar refresh ao entrar na cena e shutdown quando invisível durante gravação, quando a máquina suportar manter as fontes. Reutilizar uma source nas cenas, sem criar viewers redundantes. Essas escolhas aumentam egress/decode contínuo, mas evitam renegociações durante cortes.

O viewport 1080p do OBS não transforma uma contribuição 720p em 1080p real. Fundo transparente significa área externa ao retângulo de vídeo; recorte/chroma da webcam é outra função.

Fonte: [Browser Source oficial OBS](https://obsproject.com/kb/browser-source).

Áudio da Browser Source sempre ausente. OBS captura o Discord separadamente; testar sincronia labial, pois Discord e vídeo têm rotas/latências diferentes. Ajustar offsets no OBS após medição, não aplicar um atraso fixo universal. Se cada câmera variar muito de atraso, preview e gravação precisam de avaliação por feed.

A URL permanece estável nas reconexões da **mesma sessão**, pois o slot e a capability de sessão continuam válidos. Tokens WHEP podem renovar sem editar a cena. Nova sessão exige exportação de novas URLs; alias persistente entre sessões fica para v0.3 com rotação segura.

## 14. Stats, ausência de áudio e reconexão

### 14.1 Garantia de vídeo somente

Na opção D, capturar com audio: false e validar que getAudioTracks().length é zero antes de publicar; WHEPClient tem áudio habilitado por padrão, portanto configurar audio: false explicitamente. Rejeitar tracks de áudio inesperadas e não criar AudioContext/monitor de voz. O adaptador sempre informa áudio desabilitado.

Na opção C, audiodevice=0 desabilita a fonte, noaudio é defesa de recepção, e mic: false sozinho não prova ausência de captura. Iframe publisher só recebe permissão de câmera; microphone 'none'. Também impedir screen/system audio no MVP.

Fontes: [audiodevice oficial](https://docs.vdo.ninja/advanced-settings/setup-parameters/audiodevice), [WHIPClient](https://github.com/steveseguin/ninjasdk/blob/3065375308420da2f01fd57b4974088a39274cf9/whip-client.js), [WHEPClient](https://github.com/steveseguin/ninjasdk/blob/3065375308420da2f01fd57b4974088a39274cf9/whep-client.js).

Discord deve manter seu microfone normal; duas aplicações usando a mesma webcam podem conflitar. Solicitar apenas a câmera escolhida e liberar tracks ao parar. WHIPClient.stop() fecha transporte, mas o código consultado não para a captura local: essa limpeza precisa ser responsabilidade explícita do módulo.

### 14.2 Status por usuário

Separar três evidências: presença no Foundry, publicação recebida pelo relay e frames decodificados neste viewer. Um publisher saudável não garante viewer OBS saudável.

Consultar getStats aproximadamente a cada 2–5 s, reduzindo frequência em abas inativas. Calcular bitrate pelas diferenças de bytes/tempo; coletar framesEncoded/Decoded, largura/altura, fps, pacotes perdidos, RTT, jitter, candidates selecionados, freezes e codec quando disponíveis. Campos ausentes são desconhecidos, não zero.

Estados visíveis: câmera desligada, aguardando permissão, conectando, transmitindo, recebendo, degradado, reconectando, bloqueado, offline. Usar amostras e histerese para não piscar indicadores. Relatórios do jogador são diagnóstico, não prova de permissão; status autoritativo de sessão vem do broker/relay.

O OBS envia telemetria pela página própria, se permitido; quando indisponível, o GM vê “OBS não verificado”. Não derivar saúde OBS apenas do feed no Foundry.

### 14.3 Recuperação

~~~text
idle → awaitingPermission → connecting → live
live → degraded → recovering → live
recovering → retrying → failed
qualquer estado → stopped/revoked
~~~

Manter separados PublisherController, ViewerController e SessionController. Se um viewer cai, recuperar apenas esse WHEP. Se publisher cai, renovar permissão e reconectar ao mesmo path. Sem criar capture/publisher duplicado. Troca Wi-Fi/5G pode exigir nova negociação.

Política inicial: verificar erro/ausência de progresso por 10–15 s; dar chance à recuperação natural; tentar ICE restart suportado; se falhar, encerrar recurso, obter token atual e renegociar. Backoff 1, 2, 4, 8, até 30 s com jitter e limite por janela. Parar retentativas em sessão revogada, permissão negada, webcam encerrada ou ação de desligar.

**Risco concreto de interoperabilidade:** os companions SDK consultados implementam restartIce com PATCH application/sdp e resposta SDP. Não assumir que esse formato é aceito pelo relay escolhido ou equivale ao caminho de trickle ICE de todos os servidores. Testar POST/PATCH/DELETE, ETag e ICE restart; fallback obrigatório é nova sessão WHIP/WHEP.

O frontend VDO.Ninja tem autorecover/retry, mas seus parâmetros não ativam recuperação nos clientes SDK standalone. Eles apenas orientam a comparação C. Não executar reload indiscriminado de todas as câmeras.

Fonte: [recuperação oficial VDO.Ninja](https://docs.vdo.ninja/guides/handling-guest-disconnects-and-connection-recovery).

## 15. HTTPS, iframe, desktop/mobile e NAT

### Navegador e políticas

Em D, a captura ocorre na origem Foundry, evitando permissão de câmera cross-origin. Foundry precisa de HTTPS válido para jogadores remotos; localhost é caso local de desenvolvimento. Solicitar captura após clique, usar vídeo muted/playsinline e tratar falha de autoplay. Nenhum fluxo elimina a permissão do navegador.

Se testar C: o topo e iframe devem permitir câmera; allow não sobrepõe uma Permissions-Policy do topo que negue a função. Testar sandbox com scripts e preservação de origem, mantendo VDO.Ninja em origem separada; sandbox opaco pode inviabilizar captura. Não delegar microfone. CSP do topo precisa aceitar o frame; frame-ancestors do destino também deve aceitar a incorporação.

Fontes: [getUserMedia e Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [iframe e sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Em D, CSP precisa aceitar o bundle local e conexões HTTPS ao broker/relay. CORS WHIP/WHEP precisa permitir as origens Foundry e OBS, métodos POST/PATCH/DELETE/OPTIONS, Authorization e Content-Type, e expor os headers necessários como Location, ETag e Link. Não expor um WHEP compartilhando credencial publish. Fixar origens e rejeitar redirecionamento inesperado. COOP/COEP/cross-origin isolation não serão pré-requisitos indiscriminados.

### Compatibilidade pretendida

| Ambiente | v0.1 | Verificação necessária |
| --- | --- | --- |
| Chrome/Edge desktop atuais | Alvo primário | Foundry v14, captura, H.264/VP8, cinco decoders + canvas, reconexão |
| OBS desktop/CEF | Alvo primário de gravação | Codec real, sources múltiplas, autoplay, troca de cenas e sincronia Discord |
| Firefox desktop | Alvo secundário | Negociação codec, trickle/restart e comportamento do dock |
| Safari/macOS | Experimental até teste | H.264, autoplay, constraints e WHEP |
| Android/Chrome | Experimental | Câmera frontal, rotação, aquecimento, 5G e retorno ao foreground |
| iOS/Safari | Experimental | playsinline, permissão, background, bloqueio de tela e troca de rede |
| Browsers embutidos / mobile Foundry completo | Sem garantia inicial | Compatibilidade do Foundry e da captura devem ser avaliadas separadamente |

Mobile ser capaz de publicar VDO.Ninja não prova que execute confortavelmente Foundry e cinco câmeras. Sem abrir câmera escondida nem ligar automaticamente após revogação. Uma página externa simplificada no futuro pode usar o mesmo slot, mas será fallback opcional, não o fluxo padrão pedido.

### Redes e TURN

Em P2P diagnóstico, VDO.Ninja oferece TURN padrão em caráter operacional variável. Isso ajuda NAT, mas não reduz o número de cópias de vídeo. Na arquitetura D, não pressupor que clientes SDK/relay customizado herdem automaticamente esses TURN ou tenham direito garantido ao serviço público.

Configurar relay com endereço público/ICE candidates corretos, mídia UDP e alternativa TCP; HTTPS de sinalização não implica que a mídia também atravesse 443. Para redes bloqueando UDP ou NAT difícil, prever Coturn próprio/contratado e credenciais temporárias emitidas pelo servidor. Guardar shared secret apenas no servidor. Testar TURN/TLS 443 quando necessário e seu custo/latência.

MediaMTX documenta candidatos adicionais, porta UDP de mídia padrão 8189, TCP opcional e ICE servers. Isso exige configuração do host/containers distinta do proxy HTTPS; um CDN/reverse proxy HTTP comum não encaminha automaticamente esse canal WebRTC.

Fontes: [WebRTC e conectividade MediaMTX](https://mediamtx.org/docs/features/webrtc-specific-features), [TURN VDO.Ninja](https://docs.vdo.ninja/advanced-settings/turn-and-stun-parameters/turn), [problemas 4G/5G](https://docs.vdo.ninja/common-errors-and-known-issues/works-on-wifi-but-not-on-4g).

Wi-Fi congestionado aumenta perda e retransmissões; 5G pode mudar IP, aplicar CGNAT ou bloquear UDP. Usar bitrate moderado, medir RTT/perda, recuperar a conexão e testar rota TCP/TURN. Não recomendar abrir portas no roteador de todos os jogadores nem prometer sucesso em qualquer rede.

## 16. Primeiro protótipo e critérios de decisão

**Primeiro protótipo após aprovação desta arquitetura:** dentro de Foundry v14, uma câmera video-only publicada pelo WHIPClient oficial para um relay de teste autenticado; recebida por dois clientes Foundry e uma Browser Source OBS. Mostrar a track num elemento do CameraViews através de um AVClient mínimo. Usar credenciais efêmeras fixadas pelo administrador só nesse laboratório; não confundir isso com admissão de produção pronta.

Não começar com seis jogadores, Director Room ou o módulo completo. Antes de desenvolver o controle de sessão inteiro, responder:

| Experimento | Critério de aceitação proposto |
| --- | --- |
| Um publisher e 1→3 viewers | Upload cresce no relay, não em proporção ao número de viewers no jogador; uma só publicação |
| Vídeo apenas | Zero audio tracks publicadas/recebidas, zero pedido de microfone e zero source de áudio no OBS |
| Foundry nativo | CameraViews, ocultar vídeo, dock/popout e rerender funcionam sem recriar captura ou usar API Internal |
| OBS HQ | Resolução/FPS negociados medidos, 1080p30 quando câmera/rede permitem; source isolada sem UI |
| Interoperabilidade HTTP | Bearer, CORS, Location/ETag, trickle PATCH, DELETE e fallback após restart rejeitado |
| Permissões | Token read não publica; publish não publica no slot de outro; sem token não lê; sessão encerrada derruba leitores ativos |
| Troca/queda | Parar/voltar câmera, refresh do jogador, queda de rede de 20 s e reboot relay recuperam o mesmo slot |

Metas de laboratório, ainda sem medição: recuperar mídia em até 30 s após a rede voltar; upload sustentado próximo ao bitrate da contribuição mais overhead, sem salto multiplicativo por viewer; registrar frames/FPS, perdas e freezes em gravação de 30–60 min. Se a câmera tiver resolução inferior, não mascarar o resultado por upscale.

Depois, ampliar para quatro e seis publishers durante duas horas, Foundry com cena real e Discord ativo, comparando relay HQ único e preview servidor. Meta de preview a avaliar na v0.2: atraso P95 abaixo de 500 ms em rede favorável e sem reduzir HQ OBS. Latência não é garantia de serviço; medir ponta a ponta com relógio/gesto e gravação.

Comparar também um iframe C no mesmo ambiente e, se disponível sem contratar serviço agora, Meshcast 2.0 no plano/origem permitido. Só mudar a decisão se houver evidência de que resolve as mesmas metas e autorizações.

**Gate:** se AVClient público não acomodar tracks/ciclo sem patch interno, passar ao dock próprio. Se companions SDK não interoperarem com MediaMTX, registrar o defeito e avaliar correção pequena no wrapper, cliente WHEP nativo alternativo ou iframe C; manter testes, transporte autenticado e upload único. Nada disso foi implementado nesta entrega.

## 17. MVP v0.1 e evolução

### v0.1 — contribuição única e gravação isolada

Inclui sessão iniciada/encerrada pelo GM, roster/slots estáveis, admissão de dispositivos, tokens separados por ação/path, captura somente vídeo, uma publicação por pessoa, até seis participantes, dock nativo por AVClient ou fallback visual explícito, presets desktop, fontes OBS individuais, estado básico e recuperação limitada.

Dependências: relay autenticado e broker/página OBS próprios, HTTPS, administração inicial do host. Sem backend confiável, lançar apenas um laboratório para grupo de confiança e declarar a limitação; não chamar isso de MVP seguro.

**Fora:** áudio, supressão de ruído, gravação automática pelo módulo, YouTube direto, screen share, contas Meshcast distribuídas, reconexão sem limites, multi-GM concorrente, garantia mobile, transcode automático e URLs permanentes entre sessões.

Limite de qualidade: Foundry e OBS recebem a mesma representação HQ; opção moderada se decode/download não suportarem. O release v0.1 só é aceitável após teste com seis participantes e documentação desse custo.

### v0.2 — qualidade apropriada em cada destino

Preview leve produzido no servidor e HQ passthrough para OBS; identidade/admissão automatizada com autenticação confiável; diagnóstico por rota/publisher/viewer; recuperação e revogação comprovadas; TURN e perfis de redes ruins; testes Firefox/Safari/Android/iOS; indicadores e controles GM refinados. Avaliar transporte gerenciado Meshcast 2.0 como opção com testes de segurança, custo e origem.

### v0.3 — operação e produção

Aliases OBS estáveis entre sessões com autorização rotativa; contingência do relay e restart de workers; sincronização de gravação e telemetry; implementação/benchmark SVC ou simulcast apenas onde reduzir custo total; painel de banda e limites; integração visual ampliada. Reavaliar SFU especializado caso necessidade de camadas adaptativas supere o benefício de um relay com transcode.

## 18. Riscos técnicos prioritários

| Risco | Consequência | Mitigação / gate |
| --- | --- | --- |
| **HQ único para cinco viewers Foundry por cliente no MVP** | Download/decode competem com canvas e Discord | Teste seis pessoas; pausar viewers; preview servidor na v0.2 |
| Interoperabilidade companions SDK / MediaMTX | Falhas ICE/trickle/restart ou vídeo preto | Primeiro protótipo HTTP/WebRTC; versões fixadas e nova negociação como fallback |
| Identidade Foundry não validada pelo broker | Admissão falsa / assumir slot | Conferência inicial confiável; prova de posse; identidade automatizada só quando validada |
| Token expirado com conexão ainda aberta | Acesso depois da sessão | Revogação + expulsão efetiva das sessões WebRTC |
| Cotas/origens/build Meshcast 2.0 | Publicação/reconexão bloqueada na gravação | Relay próprio padrão; provas específicas antes de habilitar alternativa |
| Custo servidor/banda/transcode | Uma contribuição vira egress elevado | Orçamento da seção 7, monitoramento e preview compartilhado |
| Conflito AVClient / rerender de câmera | Captura duplicada ou dock instável | Detectar provedor conflitante; manter controllers fora do ciclo de render |
| Mobile/background/thermal | Câmera para ou frames caem | Compatibilidade experimental, perfil moderado e testes longos |
| Latência vídeo diferente do Discord | Gravação fora de sincronia | Medir por câmera e ajustar OBS |
| Relay confiável porém central | Falha única / mídia acessível ao operador | Estado de saúde, operação definida, revogação e futura contingência |

Maior risco técnico inicial: **conseguir manter OBS HQ e Foundry fluido com uma só representação, em seis clientes reais**. A distribuição única resolve upload; ela não resolve o download/decode do Foundry. A interoperabilidade SDK/relay é o primeiro risco a eliminar antes de construir o restante.

As licenças também fazem parte da seleção de dependências: frontend VDO.Ninja consultado declara AGPL-3.0; core SDK declara MPL-2.0; companions WHIP/WHEP são MIT. Não presumir que a licença do pacote inteiro é idêntica à de cada arquivo. Preservar notices das dependências selecionadas; revisar separadamente qualquer fork/redistribuição do frontend.

Fonte: [licenciamento oficial SDK](https://github.com/steveseguin/ninjasdk/blob/3065375308420da2f01fd57b4974088a39274cf9/LICENSING.md), [licença frontend](https://github.com/steveseguin/vdo.ninja/blob/28e0d803602882694e25c7fa82d372edb02554fe/LICENSE).

## 19. Alternativas descartadas ou adiadas

| Alternativa | Razão |
| --- | --- |
| Malha P2P pura como padrão | Foundry + OBS multiplicam upload; desempenho varia com o pior caminho de cada participante |
| Meshcast público como base privada garantida | Política/cotas/origens e leitura precisam de demonstração; mesma qualidade para todos no caminho clássico |
| TURN como “upload único” | Relay de pares, não distribuição de uma contribuição para todos |
| Director Room para tudo | Organiza produção manual, não autentica User Foundry nem elimina por si só cópias P2P |
| Injetar iframes no CameraViews e fingir MediaStream | Acoplamento ao DOM e origem; incompatível com o contrato esperado sem adaptação frágil |
| Self-host frontend só para extrair srcObject | Manutenção/upgrade e mesma origem ampliam superfície; clients oficiais já oferecem tracks |
| Capturar o Foundry inteiro no OBS | Qualidade/layout limitados ao canvas/tile; impede controle de cada câmera |
| Cada jogador publica HQ + preview separado | Resolve preview, mas viola contribuição única e aumenta upload/encoding |
| HLS como retorno padrão no Foundry | Introduz latência inadequada para câmera de mesa; WHIP/WHEP é o alvo |
| LiveKit ou Jitsi como transporte deste projeto | Úteis como referências, mas mudam o escopo VDO.Ninja; Jitsi upstream está descontinuado |
| WebSocket privado do VDO.Ninja reimplementado | SDK existe e o upstream exige seu uso para sinalização; protocolo privado não é contrato |

Fonte para o último ponto: [orientação oficial do SDK](https://github.com/steveseguin/ninjasdk/blob/3065375308420da2f01fd57b4974088a39274cf9/README.md).

## 20. Estrutura de arquivos sugerida

Somente README.md e este documento existem nesta entrega. A árvore abaixo é proposta, não scaffold implementado.

~~~text
rpgup-vdo-ninja/
  README.md
  docs/
    ARCHITECTURE.md
    PROTOTYPE-RESULTS.md        # evidências futuras, com versões e medições
    OPERATIONS.md              # infraestrutura, custo, chaves e revogação
  module.json                  # manifest Foundry futuro; compatibilidade v14
  package.json                 # build com dependências fixadas
  src/
    main.js                    # registro e hooks públicos v14
    settings.js                # endpoint/perfis sem segredos
    foundry/
      VDONinjaAVClient.js       # adaptador nativo video-only
      camera-dock.js           # fallback ApplicationV2
      session-panel.js         # controles/status GM
    session/
      controller.js            # estados e revisão da sessão
      roster.js                # userId ↔ slot estável
      admission.js             # prova de posse e autorização do dispositivo
    media/
      publisher.js             # uma captura/WHIP por cliente
      viewers.js               # WHEP por câmera remota
      sdk-adapter.js           # wrapper dos companions oficiais
      quality.js               # constraints, presets e histerese
      recovery.js              # retries por conexão, cancelamento
      stats.js                 # normalização RTCStatsReport
    obs/
      export.js                # nomes/URLs somente leitura
    security/
      capabilities.js          # tokens em memória, expiração
      validation.js            # schema, hosts e redaction
  templates/
  styles/
  lang/
    pt-BR.json
    en.json
  services/                    # aplicação complementar, fora do runtime Foundry
    session-broker/
    obs-player/                # página independente e WHEPClient
    preview-worker/            # v0.2; HQ → preview
  infra/
    mediamtx.example.yml       # sem secrets; auth e rede explicitadas
    coturn.example.conf
    compose.example.yml
  tests/
    contracts/                 # AVClient v14 e SDK/relay
    security/                  # autorização, paths, revogação
    integration/               # câmera video-only + múltiplos viewers
  THIRD-PARTY-NOTICES.md
~~~

Não colocar credenciais em examples/env versionado; configuração real no host do serviço. O primeiro protótipo pode ser mínimo e isolado, desde que produza evidências para os gates. Esta entrega não instala dependências, não publica um serviço e não cria um módulo funcional.

## 21. Índice das fontes oficiais

Além das referências junto aos achados:

- [Foundry v14 API](https://foundryvtt.com/api/v14/), [AVClient](https://foundryvtt.com/api/v14/classes/foundry.av.AVClient.html), [AVMaster](https://foundryvtt.com/api/v14/classes/foundry.av.AVMaster.html), [AVSettings](https://foundryvtt.com/api/v14/classes/foundry.av.AVSettings.html), [CameraViews](https://foundryvtt.com/api/v14/classes/foundry.applications.apps.av.CameraViews.html).
- [VDO.Ninja upstream fixado](https://github.com/steveseguin/vdo.ninja/tree/28e0d803602882694e25c7fa82d372edb02554fe), [iframe console](https://github.com/steveseguin/vdo.ninja/blob/28e0d803602882694e25c7fa82d372edb02554fe/iframe.html), [índice de documentação](https://docs.vdo.ninja/llms.txt).
- [Ninja SDK fixado](https://github.com/steveseguin/ninjasdk/tree/3065375308420da2f01fd57b4974088a39274cf9), [WHIPClient](https://github.com/steveseguin/ninjasdk/blob/3065375308420da2f01fd57b4974088a39274cf9/whip-client.js), [WHEPClient](https://github.com/steveseguin/ninjasdk/blob/3065375308420da2f01fd57b4974088a39274cf9/whep-client.js).
- [Meshcast 2.0 planos](https://app.meshcast.io/pricing), [integração VDO.Ninja](https://app.meshcast.io/docs/vdoninja-integration), [MediaMTX autenticação](https://mediamtx.org/docs/features/authentication), [conectividade](https://mediamtx.org/docs/features/webrtc-specific-features).
- [LiveKit AVClient upstream](https://github.com/bekriebel/fvtt-module-avclient-livekit/tree/258d14ad91b290a2f0e827e0f5f2afa1cf5ffe87), [Jitsi upstream histórico](https://github.com/luvolondon/fvtt-module-jitsiwebrtc/tree/4710e61391cb977453c58d9955695510e2636e15).
- [OBS Browser Source](https://obsproject.com/kb/browser-source), [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

**Resultado desta pesquisa:** decisão D recomendada, hipóteses de integração/qualidade explícitas e primeiro teste delimitado. A implementação aguarda revisão da arquitetura.
