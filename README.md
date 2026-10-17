# Catálogo virtual — modelo conectado ao V8 Admin Universal

Este projeto é uma vitrine digital genérica para ser reutilizada por diferentes empresas. O nome e a marca do exemplo original foram removidos. A logo de cada cliente será adicionada posteriormente em `assets/logo.svg`.

## Publicação
1. Publique a pasta do projeto em sua hospedagem estática (por exemplo, Cloudflare Pages).
2. No V8 Admin Universal, abra ou crie o projeto da empresa e copie o ID do projeto.
3. Em `index.html`, substitua `ID_DO_PROJETO` pelo ID correto no script `js/v8-loader.js`.
4. Cadastre ou importe categorias e produtos no painel. O catálogo carrega os dados pelo V8 Loader.
5. Configure no painel os dados de contato, especialmente o WhatsApp. O botão flutuante e o checkout por WhatsApp dependem desse campo.
6. Para adicionar a marca, coloque o arquivo da logo em `assets/logo.svg`. Se usar outro formato ou nome, atualize o caminho no `index.html`.

## Recursos existentes
- Catálogo de produtos e categorias carregados pelo V8 Loader.
- Busca e filtros por categoria.
- Detalhe do produto, galeria de imagens e variações.
- Preços promocionais, parcelas e desconto Pix, quando configurados no painel.
- Carrinho com controle de quantidades.
- Pedido encaminhado ao WhatsApp configurado no projeto.
- Botão flutuante de WhatsApp.
- Layout responsivo para celular e desktop.

## Importante
- O projeto mantém o V8 Loader original e usa `data-catalog="true"` para carregar os dados sem desenhar a interface padrão do Loader.
- O checkout atual deste modelo encaminha o pedido pelo WhatsApp. O pagamento online e a criação de pedidos no servidor só estarão disponíveis se já forem implementados e habilitados na infraestrutura conectada.
- Não deixe `ID_DO_PROJETO` no ambiente publicado: substitua pelo ID real do cliente.
- As imagens dos produtos são carregadas por URL conforme os recursos atuais do painel.
