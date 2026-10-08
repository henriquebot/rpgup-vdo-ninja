# Histórico de versões

## 1.0.3 — 08/10/2026

- **Guias com ícones e tooltips** na dock e no painel Configurar mesa, em vez de painéis longos empilhados. Primeira guia da dock mostra **Configurar mesa** (para GM) antes de Aplicar / reconectar.
- **Tour guiado** acessível pelo ícone de bússola nas duas janelas, com navegação Anterior/Próximo/Concluir, explicações breves e destaque do controle explicado.
- **Room ID sugerida** a partir do título do mundo Foundry quando ainda estiver vazia: remove espaços, acentos e caracteres não permitidos, respeitando os 49 caracteres. Não substitui uma sala salva.
- Botão **World / OBS** renomeado para **Configurar mesa**; janela e menu do Foundry usam o mesmo nome.
- As configurações, preferências, slots, exportação OBS e links de entrada externa continuam preservados. Nenhuma alteração no runtime do Foundry nem reinício de servidor.


## 1.0.2 — 08/10/2026

- Dock à esquerda por padrão. Preferências antigas no modo flutuante migram uma única vez para a esquerda; escolhas de borda existentes são preservadas, assim como novas escolhas salvas na versão 3 das preferências.
- Menu nativo de posição ganha fundo escuro e contraste explícito. Mensagem de Room não configurada fica no fluxo normal, sem sobrepor as opções.
- Coluna **Entrar pelo navegador** no painel World / OBS: link de publicação individual com mesma Room, nome, Stream ID estável, parâmetros de áudio e avatar incorporado (quando acessível). Botão para copiar por jogador; usa somente configuração salva. Não confundir com solo link OBS, que apenas visualiza.
- GitHub Actions valida testes e constrói release com `module.json` e `rpgup-vdo-ninja.zip` nos Assets. O manifest na main acompanha a versão; o ZIP vem do Release versionado.

**Atenção:** links externos podem conter a senha da Room e devem ser enviados somente ao jogador destinatário. Antes de entrar externamente, feche a dock embutida para não publicar duas vezes no mesmo slot. Se a imagem não puder ser lida pelo GM, o link informa fallback para o avatar padrão VDO.


## 1.0.1 — 01/10/2026

- PR #5 incorporado à main: opção GM **Compacto / preencher espaço** usa `cover` nativo somente na Room; `structure` e `cover` sem valor e `cover=2` são permitidos explicitamente nos avançados.
- Manifest e download atualizados para a branch de distribuição `v1.0.1`, com o mesmo endereço de atualização na main e compatibilidade Foundry v13/v14.
- Arquitetura e implementação do PR preservadas. Room, IDs, labels, áudio e links OBS não mudam. Configurações antigas continuam no layout padrão até selecionar Compacto.

33 testes unitários e provas de fixture/renderizador documentadas no PR. O recorte de `cover` e o resultado visual com câmeras reais ainda precisam ser validados no Foundry v14; publicação não substitui essa prova.

## 1.0.0 — 01/10/2026

Primeira versão de produção, após aprovação expressa do protótipo pelo usuário. Foundry v13/v14; manifest mínimo 13, verificado 14 e máximo 14.

- Reload da sala no cabeçalho: recarrega somente o iframe atual e preserva rascunhos do GM, Room e ID.
- Botão Câmeras VDO.Ninja na sidebar Configurações para reabrir a janela.
- Opções em grupos, tooltips, foco visível, controles com ícones e layout responsivo também ao estreitar a própria janela.
- Painel GM com Room, áudio, Director, qualidade e participantes. Parâmetros avançados recolhidos; status e botão de salvar fixos na parte inferior.
- Presets opcionais de qualidade, sem resolução ou codec obrigatório. Opções avançadas têm prioridade.
- Avatar opcional por usuário definido pelo GM para a mesa, com fallback para User.avatar e preferências individuais preservadas.
- Exportação organizada dos links solo OBS em JSON, baseada na configuração salva.
- Artefato versionado pela branch de distribuição v1.0.0. Instalação e atualização pelo mesmo manifest na main.

Room, senha/parâmetros, Stream IDs, links OBS e preferências existentes são preservados. A configuração antiga usa preset automático e nenhum avatar adicional. Não é preciso desinstalar nem gerar slots novamente.

## 0.1.0-prototype.3

Director em Scene Preview, opções recolhidas pela engrenagem no cabeçalho, tooltips e avatar estático incorporado para contornar CORS. Removidos seletores redundantes de câmera, PC/Móvel e self-preview.

## 0.1.0-prototype.2

Geração e salvamento explícitos de slots, rascunhos preservados, sincronização de jogadores aguardando associação, dock flutuante por padrão, reserva da UI nas bordas e zoom local.

## 0.1.0-prototype.1

Room oficial VDO.Ninja em ApplicationV2, IDs estáveis por usuário, dock em cinco posições e solo links OBS.
