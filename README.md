# Catálogo Virtual V8 Digital

**ID do projeto:** `f3834657-9ddf-4798-a47e-2362fefd8814`

Modelo de vitrine digital reutilizável para diferentes empresas, com identidade da loja inserida posteriormente via `assets/logo.svg` e produtos/carrossel alimentados pelo V8 Loader.

## Experiência visual
- Cabeçalho limpo com espaço para a logo da loja, conta e carrinho.
- Busca de produtos e categorias em chips roláveis.
- Carrossel de banners promocionais usando imagens cadastradas nos produtos pelo painel, quando o campo de banner estiver disponível.
- Grade de produtos responsiva preservada. Somente as listas de produtos em destaque e ofertas recebem setas discretas para deslizar horizontalmente.
- Informações institucionais e links adicionais no rodapé.
- Botão flutuante do WhatsApp.

## Integração
1. Publique a pasta do projeto em sua hospedagem.
2. No V8 Admin Universal, copie o ID do projeto da empresa.
3. Em `index.html`, substitua `ID_DO_PROJETO` pelo ID correto no script `js/v8-loader.js`.
4. Cadastre categorias, produtos, preços, imagens e banners no painel.
5. Configure o WhatsApp da loja no painel.
6. Adicione a logo da empresa em `assets/logo.svg`.

## Recursos mantidos
- V8 Loader original do projeto fornecido.
- Produtos, categorias, variações, galeria, preço promocional, parcelas e desconto Pix, conforme dados disponíveis.
- Busca e filtros de categoria.
- Detalhes do produto e seleção de variações.
- Carrinho local por projeto e pedido enviado ao WhatsApp.
- Botão flutuante de WhatsApp.

## Observações
- O checkout desta versão continua encaminhando o pedido ao WhatsApp, como no projeto-base. Pagamento online e criação de pedidos no servidor dependem dos recursos já existentes e habilitados na infraestrutura V8.
- Os banners do carrossel precisam estar cadastrados nos produtos e serem disponibilizados pelo Loader no campo `banner`.
- Não publique com `ID_DO_PROJETO` sem substituir pelo identificador real.
