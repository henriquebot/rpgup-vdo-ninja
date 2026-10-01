# Histórico de versões

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
