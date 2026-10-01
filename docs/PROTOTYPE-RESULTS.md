# Resultados do primeiro protótipo

Data: **01/10/2026**, America/Sao_Paulo. Módulo: `0.1.0-prototype.1`. Escopo: **1 GM + 2 jogadores**, primeiro na v14 e depois na v13.

**Gate: PENDENTE — NÃO avançar para 4–6 participantes, avatar, presets ou produto completo.** O código e sua fixture passaram nas verificações abaixo. Ainda não houve sessão em um World real, captura real, teste de menus VDO, PiP ou recepção OBS. A ausência desses resultados não é uma falha fundamental comprovada e não justifica trocar de arquitetura.

## Ambientes identificados

| Ambiente | Versão exata observada | Tipo de evidência | Sessão do módulo |
| --- | --- | --- | --- |
| `https://v14.rpgup.com.br/`, World informado `herois-da-fronteira-base` | **14.367** | Página pública `/auth`: Version 14 Build 367 | Não realizada; sem login/instalação/alteração do World |
| `https://vtt.rpgup.com.br/`, World informado `crown-of-the-oathbreaker` | **13.351** | Página pública `/auth`: Version 13 Build 351 | Não realizada; sem login/instalação/alteração do World |
| Foundry instalado localmente | **13.351**, Stable | `resources/app/package.json`; leitura do contrato ApplicationV2/ClientSettings | Não iniciado nem modificado |
| Navegador de teste de código | **Microsoft Edge / Chromium 154.0.4258.48**, headless, Windows | `browser.version()` e executável instalado | Fixture, não Foundry real |
| VDO.Ninja oficial consultado | **https://vdo.ninja/**, `session.version = "31.1"` | HTML público, consulta em 01/10/2026 | Consulta HTTP; não sessão de mídia |
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

Guest: `room`, `push`, `label`; Discord acrescenta `audiodevice=0`, `noaudio`; teste de preview acrescentou `pipme`. Modo VDO remove os overrides de áudio e delega microfone. Teste de URL Director: `director=FixtureRoom123`, `showdirector=1`, preservando `push=slot_gm`. Solo: `room`, `view=<slot>`, `solo`, `cleanoutput`, `password` e `noaudio` no modo Discord. `autostart` ausente em todos os modos de preview.

Nos testes unitários, a configuração fictícia incluiu também `roombitrate=500`, `width=1280`, `fps=30`; constraints de publicação não foram propagadas aos links OBS. Os valores acima não são um preset nem uma medição de qualidade.

## O que passou no código

`npm test`: **9 testes passaram**. `npm run check`: manifest, arquivos referenciados e sintaxe passaram. `npm run test:browser` com Playwright + Edge instalado: passou com **zero erros de página**. A fixture implementa um substituto limitado do contrato ApplicationV2 e intercepta a URL do iframe; não inclui Foundry licenciado ou WebRTC VDO.

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

A compatibilidade foi construída contra os contratos documentados v13/v14 e conferida também no código local da v13.351. Não há `compatibility.verified` no manifest: **ambas as gerações ainda exigem validação funcional real**.

## O que ainda não funcionou ou não foi testado

Não há falha real de câmera/VDO registrada, porque esses testes ainda não ocorreram. Não confundir “pendente” com “passou”.

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
| Self-preview `minipreview` / `pipme` | Pendente | Pendente | Preview local, gesto necessário, PiP móvel |
| PiP sem autorrecepção de rede | Pendente | Pendente | Não há `view` próprio/segundo iframe; observar operação VDO |
| Solo link em Browser Source OBS | Pendente | Pendente | Uma câmera por source, reconexão sem editar URL |
| `postMessage` oficial | Não necessário inicialmente | Não necessário inicialmente | Só testar/adicionar se uma necessidade real surgir |

O módulo lembra o tipo de preview; **não implementa persistência de posição/tamanho do PiP de sistema**. Investigar o comportamento nativo antes de chamar isso de requisito cumprido. Avatar foi investigado na [documentação oficial](https://docs.vdo.ninja/advanced-settings/video-parameters/and-avatar); implementação e fallback real ficam após o gate.

## Roteiro de prova real

1. Crie/abra um World separado de testes em `https://v14.rpgup.com.br/`; use 1 GM e 2 usuários jogadores. Depois repita na v13. Não atualize geração nem migre campanha para realizar a prova.
2. Instale pelo manifest `https://raw.githubusercontent.com/henriquebot/rpgup-vdo-ninja/main/module.json` no Setup → Módulos → Instalar módulo e habilite somente nesse World. Registre `game.version`, sistema e módulos habilitados. Abra por HTTPS em três navegadores/perfis/dispositivos; idealmente três pessoas/dispositivos com câmeras. Múltiplas abas com o mesmo usuário/slot provocam conflito de publicação.
3. GM: configure uma Room de teste com ID distinto de outras sessões, senha opcional e slots para os três usuários. Guarde a associação; não gere novos IDs durante reconexões. Outros usuários do World podem ficar sem slot.
4. Entre nos três clientes e aplique/reconecte. Selecione câmera e confirme permissão na UI nativa. Teste permissão negada e depois autorizada. Registre qual origem pediu permissão, mensagens/erros, política do documento pai e se microfone foi solicitado no modo Discord.
5. Verifique os seis caminhos de vídeo: GM vê A/B; A vê GM/B; B vê GM/A. Desligue/ligue uma câmera e recarregue um cliente. Confirme mesmo slot e reconexão; registre atrasos/falhas.
6. Clique com botão direito na própria câmera e nas outras, como jogador e como GM guest. Registre opções, funcionalidade e clipping na borda do iframe. Não inferir que o menu funciona só porque o código do pai não bloqueia `contextmenu`.
7. Selecione o GM como Director na configuração e reconecte apenas seu iframe. Ative câmera via UI Director e teste novamente visão mútua e menus. Registre se o primeiro Director reivindica a Room, opções disponíveis, câmera GM no slot original e OBS. Volte a guest para comparar. Não abra um segundo iframe para o GM.
8. Mude áudio para VDO e reconecte todos; teste microfone, mute, volume e opções de participantes. Confirme prompt de microfone na origem VDO e fluxo nativo. Ao terminar, retorne ao modo de áudio desejado pela mesa.
9. Em cada cliente, altere esquerda/direita/topo/embaixo/flutuante, slider e resize nativo. Redimensione o navegador, feche/reabra e recarregue. Verifique persistência individual e que mover o dock não reabre câmera. Observe sobreposição com controles/sidebar do Foundry.
10. No GM, teste preview nativo, `minipreview` e `pipme`, aplicando/reconectando quando mudar opção. Sem `autostart`. Com foco no iframe, teste Ctrl+Alt+P (Cmd+Alt+P no Mac), controles nativos e gesto manual. Mova PiP próximo à câmera física; confirme demais jogadores no dock e comportamento ao fechar/reabrir/PiP. Registre suporte e persistência oferecidos pelo navegador.
11. No painel GM, copie os três solo links para três Browser Sources OBS. Registre versão OBS/CEF, tamanho da source, codec/resolução/FPS efetivos, imagem individual, áudio escolhido, ligar/desligar câmera e reload do publisher. Confirme retorno usando a mesma URL. Não gravar ou publicar a sessão sem autorização dos participantes.
12. Preencha a ficha abaixo **para cada geração**. Se algo fundamental falhar, inclua passos, versão e mensagens e mantenha o gate pendente; investigue o recurso oficial antes de alternativas.

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
- O painel é mínimo. Avatar, presets, persistência externa de Room e exportação em lote não foram construídos. Não houve alteração de infraestrutura nem decisão definitiva sobre áudio.
- A prova real está limitada pela ausência de um World de testes pronto, acesso de sessão, três participantes/câmeras e OBS validado. Pacote e roteiro estão preparados para essa etapa; gate permanece pendente.
