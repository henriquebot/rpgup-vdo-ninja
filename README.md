# RPGUP VDO.Ninja

Integração de vídeo do ecossistema VDO.Ninja com **Foundry VTT v14**, voltada a mesas de 4–6 pessoas e gravação no OBS/YouTube. O áudio permanece no Discord.

**Status: architecture / prototype.** Há somente documentação; nenhum módulo funcional, manifest de instalação ou serviço foi implementado.

A arquitetura proposta usa os clientes oficiais WHIP/WHEP do VDO.Ninja SDK, um relay autenticado e um adaptador para as câmeras nativas do Foundry. Cada jogador publica uma contribuição; o OBS recebe fontes individuais. A infraestrutura complementar e os limites de segurança/qualidade estão explicitados na proposta.

Leia [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para a pesquisa, a decisão entre alternativas, o MVP v0.1 e o roteiro v0.2/v0.3. Próximo passo: revisar a arquitetura e validar um protótipo de mídia no Foundry antes da implementação completa.

Projeto independente de **rpgup-livekit-avclient**.
