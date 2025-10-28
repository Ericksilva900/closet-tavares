document.addEventListener('DOMContentLoaded', () => {
    // --- VARIÁVEIS GLOBAIS ---
    let produtos = [];
    let carrinho = [];
    let listaDesejos = [];
    let historicoVisualizacao = [];
    let cupomAplicado = null;
    let currentPage = 1;
    const itemsPerPage = 6; // Define quantos produtos por página
    const valorFreteGratis = 250; // Valor para atingir o frete grátis
    let isLoading = false; // Flag para evitar carregamentos múltiplos
    const numeroVendedor = "5565993294015"; // <-- SUBSTITUA PELO SEU NÚMERO COM CÓDIGO DO PAÍS

    // --- ELEMENTOS DO DOM ---
    const produtosContainer = document.getElementById('produtos-grid-container');
    const carrinhoLista = document.getElementById('carrinho-lista');
    const totalCarrinhoEl = document.getElementById('total-carrinho');
    const finalizarPedidoBtn = document.getElementById('finalizar-pedido');
    const carrinhoVazioEl = document.getElementById('carrinho-vazio');
    const modalProduto = document.getElementById('modal-produto');
    const carrinhoSecaoEl = document.getElementById('carrinho-secao');
    const filtrosContainer = document.getElementById('filtros-container');
    const buscaInput = document.getElementById('busca-produto');
    const carrinhoContainer = document.getElementById('carrinho-container');
    const nomeClienteInput = document.getElementById('nome-cliente');
    const ordenarProdutosSelect = document.getElementById('ordenar-produtos');
    const enderecoClienteInput = document.getElementById('endereco-cliente');
    const modalCorpo = document.getElementById('modal-corpo');
    const modalFecharBtn = document.querySelector('.modal-fechar');
    const notificacaoContainer = document.getElementById('notificacao-container');
    const enderecoContainer = document.getElementById('endereco-container');
    const headerCarrinhoQtdeEl = document.getElementById('header-carrinho-qtde');
    const limparCarrinhoBtn = document.getElementById('limpar-carrinho');
    const cupomInput = document.getElementById('cupom-input');
    const aplicarCupomBtn = document.getElementById('aplicar-cupom-btn');
    const economiaCupomContainer = document.getElementById('economia-cupom-container');
    const btnVoltarTopo = document.getElementById('btn-voltar-topo');

    const themeToggleBtn = document.getElementById('theme-toggle');
    const headerDesejosBtn = document.getElementById('header-desejos');
    const headerDesejosQtdeEl = document.getElementById('header-desejos-qtde');
    const modalDesejos = document.getElementById('modal-desejos');
    const desejosCorpo = document.getElementById('desejos-corpo');
    const modalFeedback = document.getElementById('modal-feedback');
    const salvarInfoCheckbox = document.getElementById('salvar-info');
    const promoBanner = document.getElementById('promo-banner');
    const closePromoBannerBtn = document.getElementById('close-promo-banner');
    const maisVendidosContainer = document.getElementById('mais-vendidos-container');
    const promocoesContainer = document.getElementById('promocoes-container');
    const recentementeVistosSection = document.getElementById('recentemente-vistos-section');
    const recentementeVistosContainer = document.getElementById('recentemente-vistos-container');
    const infiniteScrollTrigger = document.getElementById('infinite-scroll-trigger');
    const freteGratisTextoEl = document.getElementById('frete-gratis-texto');
    const freteGratisBarraEl = document.getElementById('frete-gratis-barra-progresso');

    // --- Intersection Observer para animações de scroll ---
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Para a observação após a animação
            }
        });
    }, {
        rootMargin: '0px',
        threshold: 0.1 // Dispara quando 10% do item estiver visível
    });

    // --- Intersection Observer para Rolagem Infinita ---
    const infiniteScrollObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoading) {
            currentPage++;
            atualizarVisualizacaoProdutos(false); // false para não limpar a grade
        }
    }, {
        rootMargin: '0px',
        threshold: 1.0
    });

    // --- FUNÇÕES ---

    /**
     * Renderiza os produtos mais vendidos na seção correspondente.
     */
    function renderizarMaisVendidos() {
        if (!maisVendidosContainer) return;
        const maisVendidos = produtos.filter(p => p.bestseller === true);

        maisVendidosContainer.innerHTML = '';
        maisVendidos.forEach((produto, index) => {
            const card = criarCardProduto(produto);
            observer.observe(card);
            maisVendidosContainer.appendChild(card);
        });
    }

    /**
     * Renderiza os produtos em promoção na seção correspondente.
     */
    function renderizarPromocoes() {
        if (!promocoesContainer) return;
        const emPromocao = produtos.filter(p => p.precoOriginal && p.precoOriginal > p.preco);

        promocoesContainer.innerHTML = '';
        emPromocao.forEach((produto) => {
            const card = criarCardProduto(produto);
            promocoesContainer.appendChild(card);
            observer.observe(card);
        });
    }


    /**
     * Renderiza os esqueletos de carregamento na grade de produtos.
     * @param {number} quantidade - O número de esqueletos a serem exibidos.
     */
    function renderizarSkeletons(quantidade = 6) {
        produtosContainer.innerHTML = ''; // Limpa a grade
        for (let i = 0; i < quantidade; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'skeleton-card';
            skeletonCard.innerHTML = `
                <div class="skeleton image"></div>
                <div class="skeleton-info">
                    <div class="skeleton line line-1"></div>
                    <div class="skeleton line line-2"></div>
                    <div class="skeleton button"></div>
                </div>
            `;
            produtosContainer.appendChild(skeletonCard);
        }
    }
    /**
     * Renderiza os produtos na página.
     * @param {string} categoriaFiltro - A categoria para filtrar ('todos', 'roupa', 'joia').
     * @param {string} termoBusca - O texto para filtrar pelo nome do produto.
     * @param {string} ordenacao - O critério de ordenação ('padrao', 'preco-asc', 'preco-desc').
     * @param {boolean} limparGrade - Se a grade de produtos deve ser limpa antes de renderizar.
     */
    function renderizarProdutos(categoriaFiltro = 'todos', termoBusca = '', ordenacao = 'padrao', limparGrade = true) {
        if (limparGrade) {
            produtosContainer.innerHTML = '';
        }
        
        const termoBuscaLower = termoBusca.trim().toLowerCase();
        isLoading = true;

        let produtosFiltrados = produtos.filter(produto => {
            // Verifica se o produto corresponde à categoria selecionada
            const correspondeCategoria = categoriaFiltro === 'todos' || produto.categoria === categoriaFiltro;

            // Verifica se o nome do produto inclui o termo de busca
            const correspondeBusca = termoBuscaLower === '' || produto.nome.toLowerCase().includes(termoBuscaLower);

            // O produto só será exibido se corresponder a ambos os critérios
            return correspondeCategoria && correspondeBusca;
        });

        // Aplica a ordenação
        if (ordenacao === 'preco-asc') {
            produtosFiltrados.sort((a, b) => a.preco - b.preco);
        } else if (ordenacao === 'preco-desc') {
            produtosFiltrados.sort((a, b) => b.preco - a.preco);
        }
        // Se for 'padrao', não faz nada, mantém a ordem original do JSON

        
        if (produtosFiltrados.length === 0 && termoBuscaLower !== '') {
            const mensagemNaoEncontrado = document.createElement('div');
            mensagemNaoEncontrado.className = 'nenhum-produto-encontrado';
            mensagemNaoEncontrado.innerHTML = `
                <i class="fas fa-search"></i>
                <h4>Nenhum produto encontrado</h4>
                <p>Tente buscar por um termo diferente ou verifique a ortografia.</p>
            `;
            produtosContainer.appendChild(mensagemNaoEncontrado);
            isLoading = false;
            return; // Interrompe a função aqui
        }

        // Lógica de Paginação
        const totalPages = Math.ceil(produtosFiltrados.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = produtosFiltrados.slice(startIndex, endIndex);

        // Mostra o loader
        infiniteScrollTrigger.innerHTML = '<div class="loader"></div>';

        paginatedItems.forEach((produto, index) => {            
            const card = criarCardProduto(produto);            
            observer.observe(card); // Adiciona o novo card ao observer
            produtosContainer.appendChild(card);
        });

        isLoading = false;

        // Se não houver mais páginas para carregar, esconde o loader
        if (currentPage >= totalPages) {
            infiniteScrollTrigger.innerHTML = '';
            infiniteScrollObserver.unobserve(infiniteScrollTrigger); // Para de observar
        }
    }

    /**
     * Cria o elemento HTML para um card de produto.
     * @param {object} produto - O objeto do produto.
     * @returns {HTMLElement} O elemento do card.
     */
    function criarCardProduto(produto) {
        const card = document.createElement('div');
        card.className = 'produto-card';
        card.dataset.id = produto.id;

        const emPromocao = produto.precoOriginal && produto.precoOriginal > produto.preco;
        const precoHTML = emPromocao
            ? `<div class="preco-container">
                    <p class="produto-preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
                    <p class="preco-original">R$ ${produto.precoOriginal.toFixed(2).replace('.', ',')}</p>
                </div>`
            : `<div class="preco-container"><p class="produto-preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p></div>`;

        card.innerHTML = `
            <button class="btn-desejo ${listaDesejos.includes(produto.id) ? 'ativo' : ''}" data-id="${produto.id}" aria-label="Adicionar ${produto.nome} à lista de desejos">
                <i class="fas fa-heart" aria-hidden="true"></i>
            </button>
            ${produto.estoque === 0 ? '<div class="esgotado-tag">ESGOTADO</div>' : ''}
            ${emPromocao ? '<div class="sale-tag">SALE</div>' : ''}
            <img src="${produto.imagens[0]}" alt="${produto.nome}" loading="lazy" decoding="async">
            <div class="produto-info">
                <h3 class="produto-titulo">${produto.nome}</h3>
                <div class="estrelas-avaliacao" data-produto-id="${produto.id}">
                    ${renderizarEstrelas(calcularMediaAvaliacoes(produto).media)}
                    <span class="total-avaliacoes">(${calcularMediaAvaliacoes(produto).total})</span>
                </div>
                ${precoHTML}
                <button class="btn-adicionar" data-id="${produto.id}" ${produto.estoque === 0 ? 'disabled' : ''}>
                    ${produto.estoque === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}
                </button>
            </div>`;
        return card;
    }

    /**
     * Abre o modal com os detalhes de um produto específico.
     * @param {string} produtoId - O ID do produto a ser exibido.
     */
    function abrirModal(produtoId) {
        const produto = produtos.find(p => p.id === produtoId);
        if (!produto) return;

        // Adiciona o produto ao histórico de visualização
        adicionarAoHistorico(produtoId);
        renderizarHistorico();

        // Gera o HTML para o carrossel de imagens
        const carouselHTML = `
            <div class="carousel-container">
                <div class="carousel-track">
                    ${produto.imagens.map(img => `<div class="carousel-slide"><img src="${img}" alt="${produto.nome}" loading="lazy" decoding="async"></div>`).join('')}
                </div>
                ${produto.imagens.length > 1 ? `
                    <button class="carousel-btn prev" aria-label="Imagem anterior">&#10094;</button>
                    <button class="carousel-btn next" aria-label="Próxima imagem">&#10095;</button>
                    <div class="carousel-nav">${produto.imagens.map((_, index) => `<button class="carousel-dot ${index === 0 ? 'ativo' : ''}" data-slide="${index}"></button>`).join('')}</div>
                ` : ''}
            </div>
        `;
        const emPromocao = produto.precoOriginal && produto.precoOriginal > produto.preco;
        const precoModalHTML = emPromocao
            ? `
                <div class="preco-container">
                    <p class="produto-preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
                    <p class="preco-original">R$ ${produto.precoOriginal.toFixed(2).replace('.', ',')}</p>
                </div>
            `
            : `<div class="preco-container"><p class="produto-preco">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p></div>`;

        // Gera o HTML para o seletor de tamanho, se aplicável
        let tamanhoHTML = '';
        if (produto.categoria === 'roupa' && produto.tamanhos) {
            tamanhoHTML = `
                <div class="tamanho-seletor">
                    <label>Tamanho:</label>
                    <div class="tamanho-opcoes">
                        ${produto.tamanhos.map(t => `<button data-tamanho="${t}">${t}</button>`).join('')}
                    </div>
                </div>
            `;
        }

        // Gera o HTML para os botões de compartilhamento
        const productURL = window.location.href; // Link da loja
        const shareText = `Confira este produto incrível na Chic & Brilho: ${produto.nome}`;
        const shareHTML = `
            <div class="share-container">
                <span>Compartilhar:</span>
                <div class="share-buttons">
                    <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + productURL)}" target="_blank" class="share-btn whatsapp" aria-label="Compartilhar no WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productURL)}&quote=${encodeURIComponent(shareText)}" target="_blank" class="share-btn facebook" aria-label="Compartilhar no Facebook">
                        <i class="fab fa-facebook-f"></i>
                    </a>
                    <button class="share-btn copy-link" aria-label="Copiar link do produto"><i class="fas fa-link"></i></button>
                </div>
            </div>
        `;
        // Lógica para encontrar produtos relacionados
        const produtosRelacionados = produtos.filter(p => 
            p.categoria === produto.categoria && p.id !== produto.id
        ).slice(0, 3); // Pega até 3 produtos relacionados

        let relacionadosHTML = '';
        if (produtosRelacionados.length > 0) {
            relacionadosHTML = `
                <div class="related-products-container">
                    <h4>Você também pode gostar</h4>
                    <div class="related-products-grid">
                        ${produtosRelacionados.map(p => `
                            <div class="related-product-card" data-id="${p.id}">
                                <img src="${p.imagens[0]}" alt="${p.nome}" loading="lazy" decoding="async">
                                <span>${p.nome}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const { media, total } = calcularMediaAvaliacoes(produto);

        const avaliacoesHTML = `
            <div class="avaliacoes-container">
                <h4>Avaliações de Clientes</h4>
                <div class="lista-avaliacoes">
                    ${produto.avaliacoes && produto.avaliacoes.length > 0 ? produto.avaliacoes.map(av => `
                        <div class="avaliacao-item">
                            ${renderizarEstrelas(av.nota)}
                            <strong>${av.nome}</strong>
                            <p>${av.comentario}</p>
                        </div>
                    `).join('') : '<p>Este produto ainda não tem avaliações. Seja o primeiro a avaliar!</p>'}
                </div>
                <form class="form-avaliacao" data-id="${produto.id}">
                    <h5>Deixe sua avaliação</h5>
                    <div class="input-group">
                        <label>Sua nota:</label>
                        <div class="estrelas-input" data-nota="0">
                            <i class="far fa-star" data-valor="1"></i>
                            <i class="far fa-star" data-valor="2"></i>
                            <i class="far fa-star" data-valor="3"></i>
                            <i class="far fa-star" data-valor="4"></i>
                            <i class="far fa-star" data-valor="5"></i>
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="avaliacao-nome">Seu nome:</label>
                        <input type="text" id="avaliacao-nome" required>
                    </div>
                    <div class="input-group">
                        <label for="avaliacao-comentario">Seu comentário:</label>
                        <textarea id="avaliacao-comentario" rows="3" required></textarea>
                    </div>
                    <button type="submit" class="btn-adicionar">Enviar Avaliação</button>
                </form>
            </div>
        `;

        modalCorpo.innerHTML = `
            ${carouselHTML}
            <div>
                <h2 id="modal-produto-titulo">${produto.nome}</h2>
                <div class="estrelas-avaliacao" data-produto-id="${produto.id}">
                    ${renderizarEstrelas(media)}
                    <span class="total-avaliacoes">
                        ${total} ${total === 1 ? 'avaliação' : 'avaliações'}
                    </span>
                </div>
                <p>${produto.descricao}</p>
                <button class="btn-desejo ${listaDesejos.includes(produto.id) ? 'ativo' : ''}" data-id="${produto.id}" aria-label="Adicionar ${produto.nome} à lista de desejos">
                    <i class="fas fa-heart" aria-hidden="true"></i>
                </button>
                ${precoModalHTML}
                ${tamanhoHTML}
                <button class="btn-adicionar" data-id="${produto.id}" ${produto.estoque === 0 ? 'disabled' : ''}>
                    ${produto.estoque === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}
                </button>
                ${shareHTML}
            </div>
            ${relacionadosHTML}
            ${avaliacoesHTML}
        `;
        modalProduto.classList.add('visivel');
        modalProduto.style.opacity = '1'; // Ativa a transição de opacidade

        // Inicializa o carrossel se houver mais de uma imagem
        if (produto.imagens.length > 1) setupCarousel();

        // Adiciona eventos para o formulário de avaliação
        const formAvaliacao = modalCorpo.querySelector('.form-avaliacao');
        formAvaliacao.addEventListener('submit', handleAvaliacaoSubmit);

        const estrelasInput = modalCorpo.querySelector('.estrelas-input');
        estrelasInput.addEventListener('click', handleEstrelaInputClick);
        estrelasInput.addEventListener('mouseover', handleEstrelaInputHover);
        estrelasInput.addEventListener('mouseout', handleEstrelaInputOut);
    }

    /**
     * Inicializa e controla a lógica do carrossel de imagens no modal.
     */
    function setupCarousel() {
        const track = document.querySelector('.carousel-track');
        const slides = Array.from(track.children);
        const nextButton = document.querySelector('.carousel-btn.next');
        const prevButton = document.querySelector('.carousel-btn.prev');
        const dotsNav = document.querySelector('.carousel-nav');
        const dots = Array.from(dotsNav.children);
        const slideWidth = slides[0].getBoundingClientRect().width;

        let currentIndex = 0;

        const moveToSlide = (targetIndex) => {
            track.style.transform = 'translateX(-' + slideWidth * targetIndex + 'px)';
            dots[currentIndex].classList.remove('ativo');
            dots[targetIndex].classList.add('ativo');
            currentIndex = targetIndex;
        };

        // Evento para o botão "próximo"
        nextButton.addEventListener('click', () => {
            const nextIndex = (currentIndex + 1) % slides.length;
            moveToSlide(nextIndex);
        });

        // Evento para o botão "anterior"
        prevButton.addEventListener('click', () => {
            const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
            moveToSlide(prevIndex);
        });

        // Evento para os indicadores (pontos)
        dotsNav.addEventListener('click', e => {
            const targetDot = e.target.closest('button.carousel-dot');
            if (!targetDot) return;
            const targetIndex = dots.findIndex(dot => dot === targetDot);
            moveToSlide(targetIndex);
        });
    }

    /**
     * Fecha o modal de detalhes do produto.
     */
    function fecharModal() {
        modalProduto.classList.remove('visivel');
        modalProduto.style.opacity = '0'; // Inicia a transição para esconder
    }

    /**
     * Abre o modal da lista de desejos.
     */
    function abrirModalDesejos() {
        renderizarListaDesejos();
        modalDesejos.classList.add('visivel');
        modalDesejos.style.opacity = '1';
    }

    /**
     * Função central que lê os filtros e a busca e atualiza a exibição dos produtos.
     * @param {boolean} [limparGrade=true] - Se a grade deve ser limpa (para filtros) ou não (para rolagem).
     */
    function atualizarVisualizacaoProdutos(limparGrade = true) {
        const categoriaAtivaEl = document.querySelector('.btn-filtro.ativo');
        const categoriaAtiva = categoriaAtivaEl ? categoriaAtivaEl.dataset.categoria : 'todos';
        const termoBusca = buscaInput.value;
        const ordenacao = ordenarProdutosSelect.value;
        
        // Se for uma nova filtragem, reseta a observação do scroll
        if (limparGrade) infiniteScrollObserver.observe(infiniteScrollTrigger);

        renderizarProdutos(categoriaAtiva, termoBusca, ordenacao, limparGrade);
    }
    /**
     * Renderiza os botões de controle da paginação.
     * @param {number} totalPages - O número total de páginas.
     */
    function renderizarPaginacao(totalPages) {
        paginacaoContainer.innerHTML = '';
        if (totalPages <= 1) return;

        // Botão "Anterior"
        paginacaoContainer.innerHTML += `<button class="paginacao-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;

        // Botões de página
        for (let i = 1; i <= totalPages; i++) {
            paginacaoContainer.innerHTML += `<button class="paginacao-btn ${i === currentPage ? 'ativo' : ''}" data-page="${i}">${i}</button>`;
        }

        // Botão "Próximo"
        paginacaoContainer.innerHTML += `<button class="paginacao-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    }

    /**
     * Mostra uma notificação na tela.
     * @param {string} mensagem - O texto a ser exibido.
     * @param {string} [tipo='sucesso'] - O tipo de notificação (para futuras estilizações).
     */
    function mostrarNotificacao(mensagem, tipo = 'sucesso') {
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao ${tipo}`;
        notificacao.textContent = mensagem;

        notificacaoContainer.appendChild(notificacao);

        // Remove a notificação após a animação de saída terminar (3 segundos)
        setTimeout(() => notificacao.remove(), 3000);
    }

    /**
     * Adiciona um produto ao carrinho.
     * @param {string} produtoId - O ID do produto a ser adicionado.
     * @param {Event} [event] - O evento de clique para a animação.
     */
    function adicionarAoCarrinho(produtoId, event) {
        const produto = produtos.find(p => p.id === produtoId);

        if (produto.estoque !== undefined && produto.estoque <= 0) {
            mostrarNotificacao("Desculpe, este produto está esgotado.", "erro");
            return;
        }

        let tamanhoSelecionado = null;

        // Verifica se o produto é uma roupa e se um tamanho foi selecionado no modal
        if (produto.categoria === 'roupa') {
            const tamanhoBtnSelecionado = modalCorpo.querySelector('.tamanho-opcoes button.selecionado');
            if (!tamanhoBtnSelecionado) {
                mostrarNotificacao("Por favor, selecione um tamanho.", "erro");
                return; // Impede a adição ao carrinho
            }
            tamanhoSelecionado = tamanhoBtnSelecionado.dataset.tamanho;
        }

        // Cria um ID único para o item do carrinho (produto + tamanho)
        const carrinhoItemId = tamanhoSelecionado ? `${produtoId}-${tamanhoSelecionado}` : produtoId;

        const itemNoCarrinho = carrinho.find(item => item.carrinhoId === carrinhoItemId);

        // Verifica se a quantidade no carrinho já atingiu o estoque
        if (produto.estoque !== undefined && itemNoCarrinho && itemNoCarrinho.quantidade >= produto.estoque) {
            mostrarNotificacao(`Você já atingiu o limite de estoque para ${produto.nome}.`, "info");
            return;
        }

        // Animação "Fly to Cart"
        if (event) {
            const cardImagem = event.target.closest('.produto-card, .modal-content').querySelector('img, .carousel-slide img');
            const flyingImage = document.createElement('img');
            flyingImage.src = cardImagem.src;
            flyingImage.className = 'flying-image';
            document.body.appendChild(flyingImage);

            const startRect = cardImagem.getBoundingClientRect();
            const endRect = headerCarrinhoQtdeEl.getBoundingClientRect();

            // Posição inicial
            flyingImage.style.left = `${startRect.left + startRect.width / 2 - 50}px`;
            flyingImage.style.top = `${startRect.top + startRect.height / 2 - 50}px`;

            // Força o navegador a aplicar o estilo inicial antes de animar
            requestAnimationFrame(() => {
                // Posição final
                const endX = endRect.left + endRect.width / 2 - 50;
                const endY = endRect.top + endRect.height / 2 - 50;
                flyingImage.style.transform = `translate(${endX - (startRect.left + startRect.width / 2 - 50)}px, ${endY - (startRect.top + startRect.height / 2 - 50)}px) scale(0.1)`;
                flyingImage.style.opacity = '0.5';
            });

            // Remove a imagem e aciona o "pop" do carrinho após a animação
            setTimeout(() => {
                flyingImage.remove();
                headerCarrinhoQtdeEl.classList.add('pop');
                headerCarrinhoQtdeEl.addEventListener('animationend', () => {
                    headerCarrinhoQtdeEl.classList.remove('pop');
                }, { once: true });
            }, 600); // Duração da transição
        }

        if (itemNoCarrinho) {
            itemNoCarrinho.quantidade++;
        } else {
            carrinho.push({ ...produto, quantidade: 1, tamanho: tamanhoSelecionado, carrinhoId: carrinhoItemId });
        }

        mostrarNotificacao(`${produto.nome} foi adicionado ao carrinho!`);
        salvarCarrinho();
        renderizarCarrinho();

        // Rola a tela para a seção do carrinho de forma suave
        // Verifica se a tela é pequena (layout de coluna única) para rolar
        if (window.innerWidth <= 900) {
            carrinhoSecaoEl.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Aumenta a quantidade de um item no carrinho.
     * @param {string} carrinhoItemId - O ID único do item no carrinho.
     */
    function aumentarQuantidade(carrinhoItemId) {
        const itemNoCarrinho = carrinho.find(item => item.carrinhoId === carrinhoItemId);
        if (itemNoCarrinho) {
            const produto = produtos.find(p => p.id === itemNoCarrinho.id);
            // Verifica se a nova quantidade excede o estoque
            if (produto.estoque !== undefined && itemNoCarrinho.quantidade >= produto.estoque) {
                mostrarNotificacao(`Limite de estoque atingido para ${produto.nome}.`, "info");
                return;
            }
            itemNoCarrinho.quantidade++;
            salvarCarrinho();
            renderizarCarrinho();
        }
    }

    /**
     * Diminui a quantidade de um item no carrinho. Se a quantidade for 1, remove o item.
     * @param {string} carrinhoItemId - O ID único do item no carrinho.
     */
    function diminuirQuantidade(carrinhoItemId) {
        const itemNoCarrinho = carrinho.find(item => item.carrinhoId === carrinhoItemId);
        if (itemNoCarrinho && itemNoCarrinho.quantidade > 1) {
            itemNoCarrinho.quantidade--;
        } else {
            // Se a quantidade for 1, remove o item do carrinho
            removerDoCarrinho(carrinhoItemId);
        }
        salvarCarrinho();
        renderizarCarrinho();
    }

    /**
     * Limpa todos os itens do carrinho.
     */
    function limparCarrinho() {
        if (carrinho.length === 0) return;

        if (confirm("Tem certeza que deseja esvaziar seu carrinho?")) {
            carrinho = [];
            salvarCarrinho();
            renderizarCarrinho();
            mostrarNotificacao("Seu carrinho foi esvaziado.", "info");
        }
    }

    /**
     * Adiciona ou remove um item da lista de desejos.
     * @param {string} produtoId 
     */
    function toggleDesejo(produtoId) {
        const produto = produtos.find(p => p.id === produtoId);
        const index = listaDesejos.indexOf(produtoId);
        let foiAdicionado = false;

        if (index > -1) {
            listaDesejos.splice(index, 1); // Remove se já existe
            mostrarNotificacao(`${produto.nome} removido da sua lista de desejos.`, 'info');
        } else {
            listaDesejos.push(produtoId); // Adiciona se não existe
            mostrarNotificacao(`${produto.nome} adicionado à sua lista de desejos!`);
            foiAdicionado = true;
        }

        salvarListaDesejos();
        atualizarIconesDesejo(produtoId, foiAdicionado);
        atualizarContadorDesejos();
    }

    /**
     * Atualiza a aparência de todos os ícones de coração para um produto.
     * @param {string} produtoId 
     * @param {boolean} [animar=false] - Se deve aplicar a animação de "batida".
     */
    function atualizarIconesDesejo(produtoId, animar = false) {
        const icones = document.querySelectorAll(`.btn-desejo[data-id="${produtoId}"]`);
        const naLista = listaDesejos.includes(produtoId);
        icones.forEach(icone => {
            icone.classList.toggle('ativo', naLista);

            // Aplica a animação se for uma adição
            if (animar && naLista) {
                icone.classList.add('animar');
                // Remove a classe após a animação para que possa ser reativada
                icone.addEventListener('animationend', () => {
                    icone.classList.remove('animar');
                }, { once: true });
            }
        });
    }

    /**
     * Atualiza o contador de itens da lista de desejos no cabeçalho.
     */
    function atualizarContadorDesejos() {
        headerDesejosQtdeEl.textContent = listaDesejos.length;
        headerDesejosQtdeEl.classList.toggle('visivel', listaDesejos.length > 0);
    }

    /**
     * Renderiza os itens da lista de desejos no modal.
     */
    function renderizarListaDesejos() {
        desejosCorpo.innerHTML = '';
        if (listaDesejos.length === 0) {
            desejosCorpo.innerHTML = '<p>Sua lista de desejos está vazia.</p>';
            return;
        }

        listaDesejos.forEach(produtoId => {
            const produto = produtos.find(p => p.id === produtoId);
            if (produto) {
                const itemEl = document.createElement('div');
                itemEl.className = 'desejo-item';
                itemEl.innerHTML = `
                    <img src="${produto.imagens[0]}" alt="${produto.nome}">
                    <div class="desejo-item-info">
                        <strong>${produto.nome}</strong>
                        <p>R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button class="btn-adicionar" data-id="${produto.id}">Adicionar ao Carrinho</button>
                    <button class="btn-desejo ativo" data-id="${produto.id}" title="Remover da Lista de Desejos"><i class="fas fa-times"></i></button>
                `;
                desejosCorpo.appendChild(itemEl);
            }
        });
    }

    /**
     * Aplica um cupom de desconto.
     */
    function aplicarCupom() {
        const codigoCupom = cupomInput.value.trim().toUpperCase();
        if (!codigoCupom) return;

        // Defina seus cupons aqui. Pode ser valor fixo ou porcentagem.
        const cuponsDisponiveis = {
            'BEMVINDA10': { tipo: 'porcentagem', valor: 10 }, // 10% de desconto
            'FRETEGRATIS': { tipo: 'fixo', valor: 20 } // R$ 20 de desconto (exemplo)
        };

        const cupom = cuponsDisponiveis[codigoCupom];

        if (cupom) {
            cupomAplicado = { codigo: codigoCupom, ...cupom };
            mostrarNotificacao(`Cupom "${codigoCupom}" aplicado com sucesso!`);
            renderizarCarrinho(); // Re-renderiza para aplicar o desconto
        } else {
            cupomAplicado = null;
            mostrarNotificacao("Cupom inválido ou expirado.", "erro");
            renderizarCarrinho();
        }
        cupomInput.value = '';
    }

    /**
     * Remove o cupom de desconto aplicado.
     */
    function removerCupom() {
        if (cupomAplicado) {
            mostrarNotificacao(`Cupom "${cupomAplicado.codigo}" removido.`, 'info');
            cupomAplicado = null;
            // Re-renderiza o carrinho para remover o desconto e o botão
            renderizarCarrinho();
        }
    }

    /**
     * Atualiza a barra de progresso para o frete grátis.
     * @param {number} totalAtual - O valor total atual do carrinho.
     */
    function atualizarBarraFreteGratis(totalAtual) {
        if (!freteGratisTextoEl || !freteGratisBarraEl) return;

        if (totalAtual >= valorFreteGratis) {
            freteGratisTextoEl.textContent = "Parabéns! Você ganhou Frete Grátis! 🎉";
            freteGratisBarraEl.style.width = '100%';
        } else {
            const valorFaltante = valorFreteGratis - totalAtual;
            freteGratisTextoEl.textContent = `Faltam R$ ${valorFaltante.toFixed(2).replace('.', ',')} para Frete Grátis!`;
            
            const porcentagem = (totalAtual / valorFreteGratis) * 100;
            freteGratisBarraEl.style.width = `${porcentagem}%`;
        }
    }

    /**
     * Renderiza os itens do carrinho na tela e atualiza o total.
     */
    function renderizarCarrinho() {
        carrinhoLista.innerHTML = ''; // Limpa a lista antes de renderizar
        let totalPreco = 0;
        let totalItens = 0;

        if (carrinho.length === 0) {
            carrinhoLista.appendChild(carrinhoVazioEl);
        } else {
            carrinhoVazioEl.style.display = 'none';
            carrinho.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="item-info">                        
                        <span>${item.nome} ${item.tamanho ? `(${item.tamanho})` : ''}</span>
                        <span class="item-preco">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="item-controles">
                        <button class="btn-ajuste-qtde btn-diminuir" data-id="${item.carrinhoId}">-</button>
                        <span>${item.quantidade}</span>
                        <button class="btn-ajuste-qtde btn-aumentar" data-id="${item.carrinhoId}">+</button>
                    </div>
                `;
                carrinhoLista.appendChild(li);
                totalPreco += item.preco * item.quantidade;
                totalItens += item.quantidade;
            });
        }

        // Atualiza o total do preço no carrinho
        let totalFinal = totalPreco;
        let valorDesconto = 0;
        economiaCupomContainer.innerHTML = ''; // Limpa a mensagem de economia

        if (cupomAplicado) {
            if (cupomAplicado.tipo === 'porcentagem') {
                valorDesconto = totalPreco * (cupomAplicado.valor / 100);
            } else if (cupomAplicado.tipo === 'fixo') {
                valorDesconto = cupomAplicado.valor;
            }
            totalFinal = totalPreco - valorDesconto;
        }

        // Garante que o total não seja negativo
        totalFinal = Math.max(0, totalFinal);

        totalCarrinhoEl.innerHTML = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
        if (cupomAplicado && valorDesconto > 0) {
            totalCarrinhoEl.innerHTML += ` <small class="cupom-aplicado-info">(Cupom ${cupomAplicado.codigo}) 
                <button id="remover-cupom-btn" class="btn-remover-cupom" title="Remover cupom">&times;</button>
            </small>`;
            // Exibe a mensagem de economia
            economiaCupomContainer.innerHTML = `Você economizou R$ ${valorDesconto.toFixed(2).replace('.', ',')}!`;
        }

        // Atualiza o contador no cabeçalho
        headerCarrinhoQtdeEl.textContent = totalItens;
        if (totalItens > 0) {
            headerCarrinhoQtdeEl.classList.add('visivel');
        } else {
            headerCarrinhoQtdeEl.classList.remove('visivel');
        }

        // Atualiza a barra de progresso do frete grátis
        atualizarBarraFreteGratis(totalPreco);
    }

    /**
     * Remove um produto do carrinho.
     * @param {string} carrinhoItemId - O ID único do item no carrinho.
     */
    function removerDoCarrinho(carrinhoItemId) {
        // Filtra o array, mantendo apenas os itens cujo ID é diferente do produtoId clicado
        carrinho = carrinho.filter(item => item.carrinhoId !== carrinhoItemId);
        salvarCarrinho();
        renderizarCarrinho();
    }

    /**
     * Gera a mensagem para o WhatsApp e abre o link.
     */
    function finalizarPedido() {
        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio!");
            return;
        }

        const nomeCliente = nomeClienteInput.value.trim();
        if (!nomeCliente) {
            alert("Por favor, preencha seu nome para continuar.");
            nomeClienteInput.focus(); // Foca no campo de nome para o usuário preencher
            return;
        }

        salvarInfoCliente(); // Salva as informações se a caixa estiver marcada

        const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked').value;
        let mensagem = `Olá! Meu nome é *${nomeCliente}*.\n\n`;

        if (tipoEntrega === 'entrega') {
            const enderecoCliente = enderecoClienteInput.value.trim();
            if (!enderecoCliente) {
                alert("Por favor, preencha seu endereço para continuar.");
                enderecoClienteInput.focus();
                return;
            }
            mensagem += `Gostaria de fazer um pedido para *entrega* no seguinte endereço:\n*${enderecoCliente}*\n\n`;
        } else {
            mensagem += `Gostaria de fazer um pedido para *retirada na loja*.\n\n`;
        }

        mensagem += "--- Meu Pedido ---\n";

        let totalPedido = 0;

        carrinho.forEach(item => {
            mensagem += `*${item.quantidade}x* ${item.nome} ${item.tamanho ? `(Tamanho: ${item.tamanho})` : ''} - R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}\n`;
            totalPedido += item.preco * item.quantidade;
        });

        if (cupomAplicado) {
            mensagem += `\nSubtotal: R$ ${totalPedido.toFixed(2).replace('.', ',')}`;
            let valorDesconto = 0;
            if (cupomAplicado.tipo === 'porcentagem') {
                valorDesconto = totalPedido * (cupomAplicado.valor / 100);
            } else if (cupomAplicado.tipo === 'fixo') {
                valorDesconto = cupomAplicado.valor;
            }
            const totalFinal = Math.max(0, totalPedido - valorDesconto);
            mensagem += `\nDesconto (${cupomAplicado.codigo}): - R$ ${valorDesconto.toFixed(2).replace('.', ',')}`;
            mensagem += `\n\n*Total Final: R$ ${totalFinal.toFixed(2).replace('.', ',')}*`;
        } else {
            mensagem += `\n*Total do Pedido: R$ ${totalPedido.toFixed(2).replace('.', ',')}*`;
        }

        mensagem += "\n\nAguardo seu contato para combinar o pagamento e a entrega. Obrigado(a)!";

        const linkWhatsApp = `https://wa.me/${numeroVendedor}?text=${encodeURIComponent(mensagem)}`;

        // Dispara o efeito de confete!
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });

        window.open(linkWhatsApp, '_blank');

        // Abre o modal de feedback após um pequeno atraso
        setTimeout(() => {
            modalFeedback.classList.add('visivel');
            modalFeedback.style.opacity = '1';
        }, 1500);

    }

    /**
     * Calcula a média de avaliações de um produto.
     * @param {object} produto 
     * @returns {{media: number, total: number}}
     */
    function calcularMediaAvaliacoes(produto) {
        if (!produto.avaliacoes || produto.avaliacoes.length === 0) {
            return { media: 0, total: 0 };
        }
        const totalNotas = produto.avaliacoes.reduce((acc, av) => acc + av.nota, 0);
        return {
            media: totalNotas / produto.avaliacoes.length,
            total: produto.avaliacoes.length
        };
    }

    /**
     * Renderiza o HTML para as estrelas de avaliação.
     * @param {number} media - A nota média (0 a 5).
     * @returns {string} O HTML das estrelas.
     */
    function renderizarEstrelas(media) {
        let estrelasHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= media) {
                estrelasHTML += '<i class="fas fa-star"></i>'; // Cheia
            } else if (i - 0.5 <= media) {
                estrelasHTML += '<i class="fas fa-star-half-alt"></i>'; // Metade
            } else {
                estrelasHTML += '<i class="far fa-star"></i>'; // Vazia (usando far para estilo diferente)
            }
        }
        return estrelasHTML;
    }

    /**
     * Manipula o envio do formulário de avaliação.
     * @param {Event} event 
     */
    function handleAvaliacaoSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const produtoId = form.dataset.id;
        const nota = parseInt(form.querySelector('.estrelas-input').dataset.nota);
        const nome = form.querySelector('#avaliacao-nome').value.trim();
        const comentario = form.querySelector('#avaliacao-comentario').value.trim();

        if (nota === 0 || !nome || !comentario) {
            mostrarNotificacao("Por favor, preencha todos os campos da avaliação.", "erro");
            return;
        }

        const novaAvaliacao = { nome, nota, comentario };
        
        // Adiciona a nova avaliação ao produto
        const produto = produtos.find(p => p.id === produtoId);
        if (!produto.avaliacoes) produto.avaliacoes = [];
        produto.avaliacoes.push(novaAvaliacao);

        salvarAvaliacoes();
        mostrarNotificacao("Obrigado pela sua avaliação!");

        // Reabre o modal para mostrar a avaliação adicionada
        abrirModal(produtoId);
    }

    /**
     * Manipula o clique nas estrelas do formulário.
     * @param {Event} event 
     */
    function handleEstrelaInputClick(event) {
        const estrela = event.target.closest('.fa-star');
        if (!estrela) return;

        const container = estrela.parentElement;
        const nota = parseInt(estrela.dataset.valor);
        container.dataset.nota = nota;

        container.querySelectorAll('.fa-star').forEach((s, index) => {
            s.classList.toggle('selecionada', index < nota);
        });
    }

    /**
     * Manipula o mouseover nas estrelas do formulário.
     * @param {Event} event 
     */
    function handleEstrelaInputHover(event) {
        const estrela = event.target.closest('.fa-star');
        if (!estrela) return;

        const container = estrela.parentElement;
        const notaHover = parseInt(estrela.dataset.valor);

        container.querySelectorAll('.fa-star').forEach((s, index) => {
            s.classList.toggle('hover', index < notaHover);
        });
    }

    /**
     * Manipula o mouseout das estrelas do formulário.
     * @param {Event} event 
     */
    function handleEstrelaInputOut(event) {
        const container = event.target.closest('.estrelas-input');
        if (!container) return;
        container.querySelectorAll('.fa-star').forEach(s => s.classList.remove('hover'));
    }

    /**
     * Salva todas as avaliações no localStorage.
     */
    function salvarAvaliacoes() {
        const todasAvaliacoes = produtos.reduce((acc, p) => {
            if (p.avaliacoes && p.avaliacoes.length > 0) {
                acc[p.id] = p.avaliacoes;
            }
            return acc;
        }, {});
        localStorage.setItem('avaliacoesChicBrilho', JSON.stringify(todasAvaliacoes));
    }

    /**
     * Carrega as avaliações do localStorage e as mescla com as iniciais.
     */
    function carregarAvaliacoes() {
        const avaliacoesSalvas = JSON.parse(localStorage.getItem('avaliacoesChicBrilho') || '{}');
        produtos.forEach(p => {
            if (avaliacoesSalvas[p.id]) {
                // Mescla para não perder avaliações iniciais se o localStorage for limpo
                const idsSalvos = new Set(p.avaliacoes.map(av => JSON.stringify(av)));
                avaliacoesSalvas[p.id].forEach(avSalva => {
                    if (!idsSalvos.has(JSON.stringify(avSalva))) {
                        p.avaliacoes.push(avSalva);
                    }
                });
            }
        });
    }

    /**
     * Salva a lista de desejos no localStorage.
     */
    function salvarListaDesejos() {
        localStorage.setItem('desejosChicBrilho', JSON.stringify(listaDesejos));
    }

    /**
     * Carrega a lista de desejos do localStorage.
     */
    function carregarListaDesejos() {
        const desejosSalvos = localStorage.getItem('desejosChicBrilho');
        if (desejosSalvos) {
            listaDesejos = JSON.parse(desejosSalvos);
        }
    }

    /**
     * Carrega o histórico de visualização do localStorage.
     */
    function carregarHistorico() {
        const historicoSalvo = localStorage.getItem('historicoChicBrilho');
        if (historicoSalvo) {
            historicoVisualizacao = JSON.parse(historicoSalvo);
        }
    }

    /**
     * Salva o estado atual do carrinho no localStorage.
     */
    function salvarCarrinho() {
        localStorage.setItem('carrinhoChicBrilho', JSON.stringify(carrinho));
    }

    /**
     * Carrega o carrinho salvo no localStorage.
     */
    function carregarCarrinho() {
        const carrinhoSalvo = localStorage.getItem('carrinhoChicBrilho');
        if (carrinhoSalvo) {
            carrinho = JSON.parse(carrinhoSalvo);
        }
    }

    function handleTipoEntregaChange() {
        const tipoEntrega = document.querySelector('input[name="tipo-entrega"]:checked').value;
        if (tipoEntrega === 'retirada') {
            enderecoContainer.classList.add('oculto');
        } else {
            enderecoContainer.classList.remove('oculto');
        }
    }

    /**
     * Adiciona um produto ao histórico de visualização.
     * @param {string} produtoId 
     */
    function adicionarAoHistorico(produtoId) {
        // Remove o item se ele já existir para movê-lo para o início
        historicoVisualizacao = historicoVisualizacao.filter(id => id !== produtoId);
        // Adiciona o novo item no início do array
        historicoVisualizacao.unshift(produtoId);
        // Limita o histórico aos últimos 5 itens
        if (historicoVisualizacao.length > 5) {
            historicoVisualizacao.pop();
        }
        salvarHistorico();
    }

    /**
     * Renderiza os produtos do histórico de visualização.
     */
    function renderizarHistorico() {
        if (!recentementeVistosContainer || historicoVisualizacao.length === 0) {
            recentementeVistosSection.classList.remove('visivel');
            return;
        }

        recentementeVistosContainer.innerHTML = '';
        historicoVisualizacao.forEach(id => {
            const produto = produtos.find(p => p.id === id);
            if (produto) {
                const card = criarCardProduto(produto);
                observer.observe(card);
                recentementeVistosContainer.appendChild(card);
            }
        });

        recentementeVistosSection.classList.add('visivel');
    }

    /**
     * Salva o histórico de visualização no localStorage.
     */
    function salvarHistorico() {
        localStorage.setItem('historicoChicBrilho', JSON.stringify(historicoVisualizacao));
    }

    /**
     * Salva ou remove as informações do cliente no localStorage.
     */
    function salvarInfoCliente() {
        if (salvarInfoCheckbox.checked) {
            const infoCliente = {
                nome: nomeClienteInput.value.trim(),
                endereco: enderecoClienteInput.value.trim()
            };
            localStorage.setItem('infoClienteChicBrilho', JSON.stringify(infoCliente));
        } else {
            localStorage.removeItem('infoClienteChicBrilho');
        }
    }

    /**
     * Carrega as informações salvas do cliente nos campos do formulário.
     */
    function carregarInfoCliente() {
        const infoSalva = localStorage.getItem('infoClienteChicBrilho');
        if (infoSalva) {
            const { nome, endereco } = JSON.parse(infoSalva);
            nomeClienteInput.value = nome || '';
            enderecoClienteInput.value = endereco || '';
            salvarInfoCheckbox.checked = true; // Marca a caixa se houver dados
        }
    }

    /**
     * Controla a visibilidade do botão "Voltar ao Topo".
     */
    function handleScroll() {
        if (window.scrollY > 300) {
            btnVoltarTopo.classList.add('visivel');
        } else {
            btnVoltarTopo.classList.remove('visivel');
        }
    }

    /**
     * Rola a página suavemente para o topo.
     */
    function voltarAoTopo() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Alterna o tema entre claro e escuro.
     */
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    /**
     * Aplica o tema salvo no carregamento da página.
     */
    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    // --- EVENT LISTENERS ---

    // Adiciona evento de clique nos botões "Adicionar ao Carrinho"
    produtosContainer.addEventListener('click', (event) => {
        const target = event.target;

        // Se o clique foi no botão "Adicionar ao Carrinho"
        if (target.classList.contains('btn-adicionar')) {
            const produtoId = target.dataset.id;
            const produto = produtos.find(p => p.id === produtoId);

            // Se o produto tem tamanhos, abre o modal para seleção.
            // Senão, adiciona diretamente ao carrinho (compra rápida).
            if (produto && produto.tamanhos && produto.tamanhos.length > 0) {
                abrirModal(produtoId);
            } else {
                adicionarAoCarrinho(produtoId, event);
            }
        } 
        // Se o clique foi em qualquer outro lugar dentro do card (exceto o botão)
        else if (target.closest('.produto-card')) {
            const card = target.closest('.produto-card');
            abrirModal(card.dataset.id);
        }
    });

    // Event listener para CLIQUES no corpo do modal
    modalCorpo.addEventListener('click', (event) => {
        const target = event.target;

        // Se clicar no botão "Adicionar ao Carrinho"
        if (target.classList.contains('btn-adicionar')) {
            const produtoId = target.dataset.id;
            adicionarAoCarrinho(produtoId, event);
            fecharModal(); // Fecha o modal após adicionar
        }

        // Se clicar no botão de desejo
        if (target.closest('.btn-desejo')) {
            const produtoId = target.closest('.btn-desejo').dataset.id;
            toggleDesejo(produtoId);
        }

        // Se clicar em um produto relacionado
        if (target.closest('.related-product-card')) {
            const cardRelacionado = target.closest('.related-product-card');
            abrirModal(cardRelacionado.dataset.id);
        }

        // Se clicar em um botão de tamanho
        if (target.closest('.tamanho-opcoes')) {
            const tamanhoBtn = target.closest('button[data-tamanho]');
            if (tamanhoBtn) {
                // Remove a seleção de outros botões
                modalCorpo.querySelectorAll('.tamanho-opcoes button').forEach(btn => btn.classList.remove('selecionado'));
                // Adiciona a classe ao botão clicado
                tamanhoBtn.classList.add('selecionado');
            }
        }

        // Se clicar no botão de copiar link
        if (target.closest('.copy-link')) {
            const productURL = window.location.href;
            navigator.clipboard.writeText(productURL).then(() => {
                mostrarNotificacao('Link da loja copiado!');
            }).catch(err => {
                mostrarNotificacao('Não foi possível copiar o link.', 'erro');
            });
        }
    });

    // Event listener para o modal da lista de desejos
    modalDesejos.addEventListener('click', (event) => {
        const target = event.target;
        if (target.closest('.modal-fechar') || event.target === modalDesejos) {
            modalDesejos.classList.remove('visivel');
            modalDesejos.style.opacity = '0';
        }
    });
    // Event listeners para fechar o modal
    modalFecharBtn.addEventListener('click', fecharModal);
    modalProduto.addEventListener('click', (event) => {
        // Fecha se o clique for no container (fundo), mas não no conteúdo
        if (event.target === modalProduto) {
            fecharModal();
        }
    });

    // Adiciona evento de clique na lista do carrinho para os botões de ajuste (event delegation)
    carrinhoLista.addEventListener('click', (event) => {
        const target = event.target;
        const produtoId = target.getAttribute('data-id');

        if (target.classList.contains('btn-aumentar')) {
            aumentarQuantidade(produtoId);
        }

        if (target.classList.contains('btn-diminuir')) {
            diminuirQuantidade(produtoId);
        }
    });

    // Adiciona evento de clique nos botões de filtro
    filtrosContainer.addEventListener('click', (event) => {
        const target = event.target;

        // Reseta a página para 1 ao mudar o filtro
        const isFilterButton = target.classList.contains('btn-filtro');
        const isSearchInput = target.id === 'busca-produto';
        
        if (isFilterButton || isSearchInput) {
            currentPage = 1;
        }

        if (target.classList.contains('btn-filtro')) {
            // Remove a classe 'ativo' de todos os botões
            document.querySelectorAll('.btn-filtro').forEach(btn => {
                btn.classList.remove('ativo');
            });

            // Adiciona a classe 'ativo' ao botão clicado
            target.classList.add('ativo');

            const categoria = target.getAttribute('data-categoria');
            // Salva a categoria selecionada no localStorage
            localStorage.setItem('filtroCategoriaAtivo', categoria);

            atualizarVisualizacaoProdutos();
        }
    });

    // Adiciona evento de 'input' para a barra de busca (acionado a cada tecla digitada)
    buscaInput.addEventListener('input', () => {
        currentPage = 1; // Reseta para a primeira página ao buscar
        atualizarVisualizacaoProdutos();
    });

    // Adiciona evento de 'change' para o seletor de ordenação
    ordenarProdutosSelect.addEventListener('change', atualizarVisualizacaoProdutos);

    // Adiciona evento de clique no botão "Finalizar Pedido"
    finalizarPedidoBtn.addEventListener('click', finalizarPedido);

    // Adiciona evento de clique no botão "Limpar Carrinho"
    limparCarrinhoBtn.addEventListener('click', limparCarrinho);

    // Adiciona evento de clique no botão "Aplicar Cupom"
    aplicarCupomBtn.addEventListener('click', aplicarCupom);

    // Adiciona evento de clique para remover o cupom (usando delegação)
    carrinhoContainer.addEventListener('click', (event) => {
        const target = event.target;
        // Verifica se o botão de remover cupom foi clicado
        if (target.id === 'remover-cupom-btn') {
            removerCupom();
        }
    });

    // Adiciona evento de mudança para as opções de entrega
    document.querySelectorAll('input[name="tipo-entrega"]').forEach(radio => radio.addEventListener('change', handleTipoEntregaChange));

    // Adiciona evento de scroll na janela para o botão "Voltar ao Topo"
    window.addEventListener('scroll', handleScroll);

    // Adiciona evento de clique para o botão "Voltar ao Topo"
    btnVoltarTopo.addEventListener('click', voltarAoTopo);

    // Adiciona evento de clique para abrir a lista de desejos
    headerDesejosBtn.addEventListener('click', abrirModalDesejos);

    // Adiciona evento de clique para alternar o tema
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Adiciona evento de clique para fechar o banner promocional
    if (closePromoBannerBtn) {
        closePromoBannerBtn.addEventListener('click', () => {
            promoBanner.classList.add('hidden');
            sessionStorage.setItem('promoBannerClosed', 'true');
        });
    }

    /**
     * Função de inicialização principal.
     */
    async function init() {
        applySavedTheme(); // Aplica o tema salvo antes de tudo

        renderizarSkeletons(6); // Mostra 6 esqueletos enquanto carrega

        try {
            const response = await fetch('products.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            produtos = await response.json();

            // Verifica se o banner deve ser escondido ao carregar a página
            if (sessionStorage.getItem('promoBannerClosed') === 'true' && promoBanner) {
                promoBanner.classList.add('hidden');
            }
            
            // Carrega o carrinho e o filtro salvo antes de renderizar
            carregarCarrinho();
            carregarAvaliacoes();
            carregarListaDesejos();
            carregarHistorico();
            renderizarHistorico();
            carregarInfoCliente(); // Carrega os dados do cliente
            renderizarMaisVendidos();
            renderizarPromocoes();
            atualizarContadorDesejos();
            
            const categoriaSalva = localStorage.getItem('filtroCategoriaAtivo') || 'todos';
            // Atualiza a interface dos botões de filtro para refletir o estado salvo
            document.querySelectorAll('.btn-filtro').forEach(btn => {
                btn.classList.remove('ativo');
                if (btn.dataset.categoria === categoriaSalva) {
                    btn.classList.add('ativo');
                }
            });

            infiniteScrollObserver.observe(infiniteScrollTrigger);
            atualizarVisualizacaoProdutos();
            renderizarCarrinho();
        } catch (error) {
            console.error("Não foi possível carregar os produtos:", error);
            produtosContainer.innerHTML = "<p>Erro ao carregar produtos. Tente novamente mais tarde.</p>";
        } finally {
            // A função renderizarProdutos já substitui os esqueletos, então não precisamos fazer nada aqui.
        }
    }

    init();
});
