# Resultados do primeiro protótipo

Data: **01/10/2026**, America/Sao_Paulo. Módulo de produção: `1.0.0`. Histórico do protótipo: `0.1.0-prototype.1` a `.3`.

**Gate: APROVADO PELO USUÁRIO.** Após a revisão .3, o usuário declarou “prototipo aprovado” e “pode ir pra produção”, solicitando reload da dock, refinamento visual/usabilidade e compatibilidade v13/v14. Essa aprovação autoriza a versão 1.0.0 e os itens pós-protótipo. O usuário não informou a geração usada ou medições específicas; a aprovação não é apresentada como uma sessão de mídia observada pelo agente em ambas as gerações.

## Versão de produção 1.0.0

- Manifest: `minimum: 13`, `verified: 14`, `maximum: 14`, conforme suporte v13/v14 e aprovação solicitados pelo usuário. Identificação de protótipo removida; branch de distribuição versionada `v1.0.0` e manifest de atualização na main.
- Reload no cabeçalho navega somente o iframe atual, conservando a página Foundry, Room, ID, geometria e rascunhos do GM. Aplicar/reconectar continua separado. Botão Câmeras VDO.Ninja na sidebar Configurações permite reabrir a janela fechada.
- Visual organizado em grupos com tooltips, foco visível, controles com ícones, opções avançadas recolhidas, status de salvamento e tabela de participantes que vira lista em telas estreitas. A UI nativa VDO foi preservada.
- Presets opcionais de qualidade com `roombitrate` e `maxframerate`; avançados prevalecem. Avatar opcional por usuário configurável pelo GM, sem alterar o documento User; preferências individuais podem escolher URL própria ou dispensar imagem. Configurações antigas mantêm Room/slots e padrões automáticos.
- Exportação JSON dos links OBS da configuração salva, incluindo nome, userId, Stream ID e dimensões sugeridas. Não é uma coleção de cenas nem controle OBS.

Validação automatizada da 1.0.0: **15 testes unitários**, check e package passaram. A fixture Playwright/Edge conferiu reload isolado com rascunho GM aberto, reabertura pela sidebar sem duplicação, preset persistente, avatar da mesa aplicado ao jogador e download de JSON com fontes corretas, além das regressões de slots/avatar/zoom. Associação estável e exportação passaram com seis usuários fictícios, sem seis sessões de mídia. Layout inspecionado em screenshots desktop e estreitas; os screenshots representam a fixture, não o runtime Foundry licenciado. Detalhes de execução anteriores abaixo permanecem como histórico.

## Retorno do usuário e revisão .2

Após instalar o primeiro protótipo, o usuário informou: GM funcionou; jogador recebeu “GM ainda não associou um ID”; gerar/salvar não resolveu e aplicar/reconectar pareceu resetar os slots; câmera padrão do GM e placeholder não foram lembrados. A geração exata usada nessa sessão não foi informada, portanto não atribuímos o resultado à v13 ou v14. O agente não entrou nos Worlds nem observou essa sessão.

O código anterior gerava IDs somente no formulário, recriava o formulário a cada render e exigia reconexão manual mesmo para um jogador aguardando sua primeira associação. A origem exata do aparente reset após salvar no runtime real não foi reproduzida; não afirmamos que um teste com dados simulados a tenha demonstrado. A revisão torna o fluxo explícito: gerar já salva, confere o valor de Settings, preserva rascunhos, usa um único painel GM e abre o iframe de quem aguardava slot ao receber o Setting. Reconectar no GM salva o rascunho aberto antes de ler os dados; reconectar nunca gera IDs.

Por solicitação adicional, flutuante passa a ser padrão (com migração individual uma vez), bordas reservam espaço da UI, zoom 50–150% não recarrega, câmera padrão usa `vdo=1` com nome opcional, avatar usa a imagem do usuário Foundry ou URL salva e interface admite Automático/PC/Móvel. São opções nativas do VDO e apresentação do iframe. Avatar e câmera reais ainda precisam de prova; essa extensão expressamente solicitada não fecha o gate.

## Retorno do usuário e revisão .3

O usuário confirmou que as correções anteriores funcionaram e pediu: aviso sobre Toggle Director Vision e Scene Preview inicial; opções recolhidas atrás de uma engrenagem no cabeçalho; remoção de câmera por nome e PC/Móvel; avatar Foundry aplicado entre sessões; explicação de abertura ao entrar e tooltips para as opções. Esse relato não especifica a geração usada nem aprova a matriz de vídeo/OBS.

Todas as opções e textos da dock agora ficam recolhidos por padrão. Engrenagem e desacoplar são ícones no cabeçalho; desacoplar conserva a chamada em uma janela flutuante dentro do Foundry. Os controles têm tooltips. Abertura ao entrar foi mantida com explicação de que abre a janela, sem ativar câmera, e teste da abertura manual quando desmarcada. Câmera por nome, PC/Móvel e self-preview foram removidos; dispositivos e previews usam a UI nativa do VDO. O Director designado recebe `previewmode` e aviso sobre o toggle nativo.

O HTML VDO define `crossOrigin="Anonymous"` em `defaultAvatar2`. O arquivo público `https://v14.rpgup.com.br/icons/svg/mystery-man.svg`, lido com `Origin: https://vdo.ninja`, respondeu HTTP 200 sem `Access-Control-Allow-Origin`: o uso direto da URL pelo VDO é bloqueado. A revisão .3 lê a imagem na origem Foundry e prepara uma miniatura estática incorporada no parâmetro oficial `avatar`. Preferência e URL continuam nas flags; a imagem é preparada novamente a cada sessão. Falhas mostram aviso e usam `avatar=default`, sem impedir entrada na sala. [Detalhes e limites](ARCHITECTURE.md#câmera-e-avatar).

`npm run test:official-ui` abriu a página oficial VDO.Ninja **31.1** no Edge **154.0.4258.48**, usando uma imagem de teste sem CORS lida pelo cliente pai. A imagem incorporada foi decodificada com largura de 256 px; leitura de pixel `[233,179,90,255]` e exportação do canvas confirmaram que ela é utilizável pelo VDO sem canvas contaminado. O estado inicial `session.switchMode=true` e duas alternâncias do botão real `#togglePreviewMode` passaram. O teste bloqueou todos os WebSockets e não concedeu câmera/microfone: **não houve peers, captura ou validação do placeholder transmitido**. O teste consulta uma página mutável; registrar novamente o build em futuras provas.

## Ambientes identificados

| Ambiente | Versão exata observada | Tipo de evidência | Sessão do módulo |
| --- | --- | --- | --- |
| `https://v14.rpgup.com.br/`, World informado `herois-da-fronteira-base` | **14.367** | Página pública `/auth`: Version 14 Build 367 | Não realizada; sem login/instalação/alteração do World |
| `https://vtt.rpgup.com.br/`, World informado `crown-of-the-oathbreaker` | **13.351** | Página pública `/auth`: Version 13 Build 351 | Não realizada; sem login/instalação/alteração do World |
| Foundry instalado localmente | **13.351**, Stable | `resources/app/package.json`; leitura do contrato ApplicationV2/ClientSettings | Não iniciado nem modificado |
| Navegador de teste de código | **Microsoft Edge / Chromium 154.0.4258.48**, headless, Windows | `browser.version()` e executável instalado | Fixture, não Foundry real |
| VDO.Ninja oficial consultado | **https://vdo.ninja/**, `session.version = "31.1"` | HTML público e prova de avatar/Scene Preview em 01/10/2026 | UI real com WebSockets bloqueados; sem sessão de mídia |
| OBS | Versão a registrar no teste real | Instalado localmente; não iniciado/configurado | Não testado |

Snapshot do HTML oficial VDO.Ninja: consulta às **10:46:50 America/Sao_Paulo** (13:46:50 UTC), 233.069 bytes, SHA-256 `4a7aa9a1bd3f19a1ffa1eb9ff3f4f72538eb087294db405f8c91fecc85dcaf1c`. Não identifica um commit upstream nem garante que os demais assets ou a próxima sessão usem o mesmo build. Confirmar novamente versão/URL ao executar a prova.

Os endpoints Foundry redirecionaram para `/auth`. Nessa resposta pública, `Permissions-Policy` e `Content-Security-Policy` não estavam presentes. **Isso não verifica as políticas efetivas da página do jogo ou do proxy após autenticação.** O iframe não foi aberto nesses servidores.

O usuário informou não ter um Foundry dedicado de testes, mas poder criar um World separado no servidor oficial. As URLs/Worlds acima são referências de destino; não foi autorizado nem executado upgrade, criação de World, ativação de módulo ou edição de campanhas existentes nesta entrega.

## Parâmetros e configuração usados nas verificações

Fixture de navegador (dados fictícios, sem conexão ao VDO real):

```json
{
  "roomId": "FixtureRoom123",
  "extraQuery": "password=Fixture123",
  "audio": "discord",
  "directorUserId": "",
  "slots": { "gm1": "slot_gm", "p1": "slot_a", "p2": "slot_b" }
}
```

Guest: `room`, `push`, `label`; Discord acrescenta `audiodevice=0`, `noaudio`; avatar usa Data URL preparado, `default` ou parâmetro ausente conforme a preferência. Modo VDO remove os overrides de áudio e delega microfone. URL Director: `director=FixtureRoom123`, `showdirector=1`, `previewmode`, preservando `push=slot_gm`. Solo: `room`, `view=<slot>`, `solo`, `cleanoutput`, `password` e `noaudio` no modo Discord. `autostart`, câmera por nome, `mobile`/`notmobile` e overrides de preview ausentes.

Nos testes unitários, a configuração fictícia incluiu também `roombitrate=500`, `width=1280`, `fps=30`; constraints de publicação não foram propagadas aos links OBS. Os valores acima não são um preset nem uma medição de qualidade.

## O que passou no código

Na revisão .3, `npm test`: **12 testes passaram**. `npm run check`: manifest, arquivos referenciados e sintaxe passaram. `npm run test:browser` com Playwright + Edge instalado: passou com **zero erros de página**. A fixture implementa um substituto limitado do contrato ApplicationV2 e intercepta a URL do iframe; não inclui Foundry licenciado ou WebRTC VDO. Settings retorna um objeto vivo e a fixture transmite alterações do mundo entre páginas via eventos de storage para verificar os clientes; isso não testa o socket real do Foundry. A prova optativa de UI oficial descrita acima é separada desta fixture.

| Verificação | Resultado | Limite |
| --- | --- | --- |
| Room comum, slot por userId, nomes com caracteres especiais | Passou | Construção de URLs |
| Slots persistentes, geração só de faltantes, preservação de removidos/colisões | Passou | Funções e dados simulados |
| Rejeitar slots inválidos/duplicados e parâmetros que troquem identidade/papel/transporte/UI | Passou | Validação de configuração |
| Links solo OBS para três usuários com Room/senha correta | Passou | URL gerada, sem OBS receptor |
| Áudio Discord/VDO isolado; microfone delegado somente no modo VDO | Passou | Parâmetros e atributo `allow`, não permissões reais |
| Cinco posições e geometria dentro da viewport | Passou | Função de geometria e fixture desktop |
| Reabrir menu/renderizar/reposicionar sem navegar/recriar iframe | Passou | Iframe interceptado no Edge; não runtime Foundry |
| Reconectar e fechar/reabrir mantém um iframe local e mesmo slot | Passou | Fixture |
| Preferências persistem após reload e não vazam entre usuários | Passou | `User` substituído por armazenamento da fixture |
| Jogador não abre painel GM; Director só para GM designado | Passou | Guarda do módulo/URL; não autenticação VDO |
| Jogador aguardando slot recebe associação gerada/salva e abre iframe | Passou | Duas páginas na fixture; não socket Foundry |
| Gerar de novo/reconectar/recarregar conserva IDs | Passou | Settings/cache e armazenamento simulados |
| Rascunho sobrevive a reabrir/rerender; aplicar salva antes de reconectar | Passou | Fixture ApplicationV2 |
| Alteração de outro GM e gravação recusada não dão falso sucesso | Passou | Falhas injetadas na fixture |
| Jogador criado com painel aberto aparece sem perder o rascunho | Passou | Evento `createUser` e coleção simulados; não teste com quarto publisher |
| Bordas reservam área da interface; flutuante/fechar liberam | Passou | DOM/layout representativos v13, não UI real v13/v14 |
| Zoom não navega e mantém preenchimento após resize | Passou | Edge, viewports 1440×900, 900×650, 390×640 e 360×280 |
| Engrenagem/desacoplar no cabeçalho; opções recolhidas; tooltips; resize com sala preenchida | Passou | Fixture, não cabeçalho real Foundry |
| Avatar Foundry sem CORS, URL personalizada e preferência persistem após reload | Passou | Imagem estática preparada e flags da fixture; sem peers |
| Falha de leitura de avatar informa erro e usa padrão VDO; trocar para Foundry recupera | Passou | HTTP 404 e protocolo rejeitado injetados na fixture |
| Fechar durante fetch de avatar cancela conexão; reabertura imediata cria somente um iframe | Passou | Imagem com resposta pendente na fixture |
| Abertura ao entrar desmarcada conserva escolha e permite abertura manual | Passou | Evento ready e menu simulados |
| Director inicia em Scene Preview; aviso uma vez; só GM designado recebe parâmetro | Passou | Fixture e construção de URL; toggle também conferido no VDO real |
| Opções removidas não aparecem nem alteram a URL, mesmo com flags antigas | Passou | Normalização e fixture |

A compatibilidade foi construída contra os contratos documentados v13/v14 e conferida no código local da v13.351. Na revisão .3 o manifest não tinha `compatibility.verified`; a 1.0.0 declara `verified: 14` após aprovação e solicitação expressas do usuário. Não houve nova sessão licenciada do agente em cada geração.

## Registro anterior da prova de mídia por geração

O usuário aprovou o protótipo após a revisão .3. A tabela registra os requisitos que o agente não observou diretamente por geração; não invalida nem substitui essa aprovação. Os relatos do usuário não separaram as gerações ou forneceram uma matriz detalhada.

| Teste exigido | v14.367 | v13.351 | Evidência necessária |
| --- | --- | --- | --- |
| Habilitar módulo/menus ApplicationV2 no World | Pendente | Pendente | Console sem erro e dock aberto |
| Permissão de câmera dentro do iframe | Pendente | Pendente | Prompt na origem VDO, grant/deny e recuperação |
| Câmera ativa em 1 GM + 2 jogadores | Pendente | Pendente | Três publishers, nomes corretos |
| Jogadores vendo os demais | Pendente | Pendente | Matriz de visão entre todos os três |
| Room com UI normal | Pendente | Pendente | Entrada, dispositivos e controles preservados |
| Clique direito sobre câmera própria | Pendente | Pendente | Menu nativo e opções executáveis |
| Clique direito sobre câmera alheia | Pendente | Pendente | Menu nativo e permissões observadas |
| GM guest versus GM Director | Pendente | Pendente | Publicar GM no mesmo slot e comparar ações |
| Câmera, microfone, volume/opções nativos | Pendente | Pendente | Testar modo VDO, depois retornar ao modo escolhido |
| Resize/reposição em sessão de mídia | Pendente | Pendente | Câmera e participantes permanecem conectados |
| Self-preview / mini preview / PiP nativos | Pendente | Pendente | Preview local pelos controles VDO, gesto necessário, PiP móvel |
| PiP sem autorrecepção de rede | Pendente | Pendente | Não há `view` próprio/segundo iframe; observar operação VDO |
| Solo link em Browser Source OBS | Pendente | Pendente | Uma câmera por source, reconexão sem editar URL |
| `postMessage` oficial | Não necessário inicialmente | Não necessário inicialmente | Só testar/adicionar se uma necessidade real surgir |

O módulo usa o preview nativo e **não implementa persistência de posição/tamanho do PiP de sistema**. Avatar Foundry/URL usa uma imagem estática incorporada na [opção oficial](https://docs.vdo.ninja/advanced-settings/video-parameters/and-avatar). Seu carregamento local no VDO real passou; falta conferir vídeo mutado/sem dispositivo entre peers e no OBS. Não é prova de fallback transmitido.

## Roteiro de prova real

1. Crie/abra um World separado de testes em `https://v14.rpgup.com.br/`; use 1 GM e 2 usuários jogadores. Depois repita na v13. Não atualize geração nem migre campanha para realizar a prova.
2. Instale pelo manifest `https://raw.githubusercontent.com/henriquebot/rpgup-vdo-ninja/main/module.json` no Setup → Módulos → Instalar módulo e habilite somente nesse World. Registre `game.version`, sistema e módulos habilitados. Abra por HTTPS em três navegadores/perfis/dispositivos; idealmente três pessoas/dispositivos com câmeras. Múltiplas abas com o mesmo usuário/slot provocam conflito de publicação.
3. GM: configure uma Room de teste com ID distinto de outras sessões, senha opcional e clique em **Gerar e salvar slots faltantes**. Verifique a confirmação e os três IDs no painel reaberto. Com um jogador já aguardando sem slot, confira se o iframe abre quando recebe o Setting. Guarde a associação; gerar novamente e reconectar devem conservar os IDs. Outros usuários do World podem ficar sem slot.
4. Entre nos três clientes e aplique/reconecte. Selecione câmera e confirme permissão na UI nativa. Teste permissão negada e depois autorizada. Registre qual origem pediu permissão, mensagens/erros, política do documento pai e se microfone foi solicitado no modo Discord.
5. Verifique os seis caminhos de vídeo: GM vê A/B; A vê GM/B; B vê GM/A. Desligue/ligue uma câmera e recarregue um cliente. Confirme mesmo slot e reconexão; registre atrasos/falhas.
6. Clique com botão direito na própria câmera e nas outras, como jogador e como GM guest. Registre opções, funcionalidade e clipping na borda do iframe. Não inferir que o menu funciona só porque o código do pai não bloqueia `contextmenu`.
7. Selecione o GM como Director na configuração e reconecte apenas seu iframe. Confira Scene Preview inicial e o aviso; alterne 🪟 Toggle Director Vision para o painel e de volta. Ative câmera via UI Director e teste novamente visão mútua e menus. Registre se o primeiro Director reivindica a Room, opções disponíveis, câmera GM no slot original e OBS. Volte a guest para comparar. Não abra um segundo iframe para o GM.
8. Mude áudio para VDO e reconecte todos; teste microfone, mute, volume e opções de participantes. Confirme prompt de microfone na origem VDO e fluxo nativo. Ao terminar, retorne ao modo de áudio desejado pela mesa.
9. Em cada cliente, confira flutuante e opções recolhidas na abertura. Use a engrenagem para alterar esquerda/direita/topo/embaixo/flutuante, slider e zoom. Confira tooltips e desacoplar sem reconectar. Redimensione, feche/reabra e recarregue; confira persistência, preenchimento do iframe e acesso à UI com cada borda, inclusive com AV nativo/temas/módulos da mesa. Teste avatar Foundry/URL/sem placeholder; confira a miniatura preparada, aplique, mute/desmute e recarregue para conferir imagem entre peers. Desmarque abertura ao entrar e confirme que a abertura manual continua disponível.
10. No GM, teste preview, mini preview e PiP pelos controles nativos do VDO. Sem `autostart`. Com foco no iframe, teste Ctrl+Alt+P (Cmd+Alt+P no Mac), controles e gesto manual. Mova PiP próximo à câmera física; confirme demais jogadores no dock e comportamento ao fechar/reabrir/PiP. Registre suporte e persistência oferecidos pelo navegador.
11. No painel GM, copie os três solo links para três Browser Sources OBS. Registre versão OBS/CEF, tamanho da source, codec/resolução/FPS efetivos, imagem individual, áudio escolhido, ligar/desligar câmera e reload do publisher. Confirme retorno usando a mesma URL. Não gravar ou publicar a sessão sem autorização dos participantes.
12. Para novas verificações ou diagnósticos, preencha a ficha abaixo **para cada geração**. Se algo fundamental falhar, inclua passos, versão e mensagens; investigue o recurso oficial antes de alternativas. A aprovação do protótipo pelo usuário está registrada acima.

## Ficha a preencher — copiar para v14 e v13

```text
Data / geração:
URL Foundry / World de teste:
game.version / sistema / módulos:
GM / jogador A / jogador B (userIds e slots, sem senhas):
Navegador / versão / OS por cliente:
URL/build/versão VDO observados na sessão:
Parâmetros usados (redigir a senha antes de versionar):
Permissão câmera / origem / grant / deny / recuperação:
Permissão microfone / modo de áudio:
Visão GM→A, GM→B, A→GM, A→B, B→GM, B→A:
UI normal / controles câmera / mic / volume / participante:
Clique direito próprio / alheio / opções / clipping:
GM guest / Director / admissão / câmera publicada / slot:
Dock cinco posições / resize / reload / reabrir / continuidade:
Preview nativo / minipreview / pipme / gesto / atalho:
PiP móvel / grupo dockado / persistência posição / sem autorrecepção:
OBS versão / CEF / sources individuais / codec / resolução / FPS:
OBS após reconexão sem editar URL:
O que funcionou:
O que falhou / passos / mensagens / impacto:
Problemas encontrados:
Gate (aprovado somente com todos os requisitos fundamentais comprovados):
Responsável pela validação:
```

## Problemas e limites encontrados nesta entrega

- O clone local cadastrado no app estava sem commits/remoto e com arquivos não rastreados. Ele foi preservado. A implementação foi feita em um clone do repositório existente, na branch `codex/official-room-prototype`, partindo de `57a7f1c`.
- Os testes de navegador precisaram usar Edge instalado porque o Chromium headless padrão do Playwright não estava instalado. Nenhum browser foi instalado para contornar isso.
- Ajustados o caminho do servidor temporário de fixture no Windows e o fechamento do painel de configuração antes de clicar no dock. Eram falhas do ambiente/roteiro de teste, não do VDO.
- O painel é mínimo. Avatar e ajustes de dock foram adicionados por solicitação explícita nas revisões .2/.3; presets, persistência externa de Room e exportação em lote não foram construídos. Não houve alteração de infraestrutura nem decisão definitiva sobre áudio.
- O agente não teve acesso a uma sessão Foundry autenticada com câmeras/OBS. O protótipo foi aprovado pelo usuário, que autorizou a produção; isso substitui o gate pendente das entregas anteriores sem inventar medições do agente.
