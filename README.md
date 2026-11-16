# Noite de Jogos

Os jogos da malta, para jogar com a TV como tabuleiro e o telemóvel de cada um como comando. Sem contas e sem instalar nada.

- **O Clube**: jogo de festa com roleta, apostas, provas e contratos secretos (Edição Fátima)
- **Ilha do Vulcão**: corrida até ao cume com provas da vida real, duelos e um vulcão em 3D
- **Cova da Fortuna**: o Monopoly de Fátima
- **Ilha Nova**: colonos, estradas e um corsário (estilo Catan)
- **O Cofre de São Segredo**: mistério na vila

## Como jogar
1. Abre o site na TV e escolhe **Este ecrã é a TV**.
2. Os amigos leem o QR (ou escrevem o código da sala) no telemóvel.
3. Escolhe o jogo na TV: os telemóveis entram sozinhos.

A TV liga-se aos telemóveis por dois caminhos ao mesmo tempo: diretamente (WebRTC, via PeerJS) e por retransmissão em servidores MQTT públicos (WebSocket). Basta um deles funcionar, por isso também dá com dados móveis.
