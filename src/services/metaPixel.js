/**
 * Meta Pixel Service
 * Serviço para disparar eventos do Meta Pixel (Facebook Pixel)
 */

class MetaPixelService {
  /**
   * Verifica se o fbq está disponível
   */
  static isAvailable() {
    return typeof window !== 'undefined' && typeof window.fbq === 'function';
  }

  /**
   * Dispara evento genérico
   */
  static track(eventName, params = {}) {
    if (this.isAvailable()) {
      try {
        window.fbq('track', eventName, params);
        console.log(`[Meta Pixel] Event tracked: ${eventName}`, params);
      } catch (error) {
        console.error(`[Meta Pixel] Error tracking ${eventName}:`, error);
      }
    }
  }

  /**
   * PageView - Visualização de página
   * Disparado automaticamente pelo pixel
   */
  static trackPageView() {
    this.track('PageView');
  }

  /**
   * CompleteRegistration - Cadastro completo
   * @param {Object} userData - Dados do usuário
   */
  static trackCompleteRegistration(userData = {}) {
    const params = {
      content_name: 'Cadastro BIA',
      status: 'registration_completed',
    };

    // Adiciona informações do plano se disponível
    if (userData.plan) {
      params.content_category = userData.plan;
    }

    this.track('CompleteRegistration', params);
  }

  /**
   * Lead - Lead qualificado (após verificação de email)
   * @param {Object} userData - Dados do usuário
   */
  static trackLead(userData = {}) {
    const params = {
      content_name: 'Email Verificado',
      status: 'email_verified',
    };

    if (userData.plan) {
      params.content_category = userData.plan;
    }

    this.track('Lead', params);
  }

  /**
   * ViewContent - Visualização de conteúdo (planos/preços)
   * @param {Object} contentData - Dados do conteúdo visualizado
   */
  static trackViewContent(contentData = {}) {
    const params = {
      content_name: contentData.name || 'Planos BIA',
      content_category: 'pricing',
      content_type: 'product',
    };

    if (contentData.plans) {
      params.content_ids = contentData.plans;
      params.contents = contentData.plans.map(plan => ({
        id: plan,
        quantity: 1
      }));
    }

    this.track('ViewContent', params);
  }

  /**
   * InitiateCheckout - Início do processo de checkout
   * @param {Object} checkoutData - Dados do checkout
   */
  static trackInitiateCheckout(checkoutData = {}) {
    const params = {
      content_name: checkoutData.planName || 'Plano BIA',
      content_category: 'subscription',
      content_ids: [checkoutData.planSlug],
      num_items: 1,
    };

    if (checkoutData.value) {
      params.value = parseFloat(checkoutData.value);
      params.currency = 'BRL';
    }

    this.track('InitiateCheckout', params);
  }

  /**
   * AddPaymentInfo - Informações de pagamento adicionadas
   * @param {Object} paymentData - Dados do pagamento
   */
  static trackAddPaymentInfo(paymentData = {}) {
    const params = {
      content_name: paymentData.planName || 'Plano BIA',
      content_category: 'subscription',
      content_ids: [paymentData.planSlug],
    };

    if (paymentData.value) {
      params.value = parseFloat(paymentData.value);
      params.currency = 'BRL';
    }

    if (paymentData.paymentMethod) {
      params.payment_method = paymentData.paymentMethod; // 'credit_card', 'pix', 'boleto'
    }

    this.track('AddPaymentInfo', params);
  }

  /**
   * Purchase - Compra/Assinatura concluída
   * @param {Object} purchaseData - Dados da compra
   */
  static trackPurchase(purchaseData = {}) {
    const params = {
      content_name: purchaseData.planName || 'Plano BIA',
      content_category: 'subscription',
      content_ids: [purchaseData.planSlug],
      content_type: 'product',
      num_items: 1,
    };

    if (purchaseData.value) {
      params.value = parseFloat(purchaseData.value);
      params.currency = 'BRL';
    }

    // Valor vitalício previsto (valor anual)
    if (purchaseData.predictedLtv) {
      params.predicted_ltv = parseFloat(purchaseData.predictedLtv);
    }

    // ID da transação
    if (purchaseData.transactionId) {
      params.transaction_id = purchaseData.transactionId;
    }

    this.track('Purchase', params);
  }

  /**
   * Subscribe - Assinatura (evento customizado adicional)
   * @param {Object} subscriptionData - Dados da assinatura
   */
  static trackSubscribe(subscriptionData = {}) {
    const params = {
      content_name: subscriptionData.planName || 'Plano BIA',
      content_category: 'subscription',
      value: subscriptionData.value ? parseFloat(subscriptionData.value) : 0,
      currency: 'BRL',
      predicted_ltv: subscriptionData.predictedLtv || 0,
    };

    this.track('Subscribe', params);
  }

  /**
   * StartTrial - Início de período de teste (se aplicável)
   * @param {Object} trialData - Dados do trial
   */
  static trackStartTrial(trialData = {}) {
    const params = {
      content_name: trialData.planName || 'Trial BIA',
      content_category: 'trial',
      value: trialData.value ? parseFloat(trialData.value) : 0,
      currency: 'BRL',
      predicted_ltv: trialData.predictedLtv || 0,
    };

    this.track('StartTrial', params);
  }

  /**
   * AddToCart - Adicionar ao carrinho (opcional, caso tenha carrinho)
   * @param {Object} cartData - Dados do item adicionado
   */
  static trackAddToCart(cartData = {}) {
    const params = {
      content_name: cartData.planName || 'Plano BIA',
      content_ids: [cartData.planSlug],
      content_type: 'product',
      value: cartData.value ? parseFloat(cartData.value) : 0,
      currency: 'BRL',
    };

    this.track('AddToCart', params);
  }

  /**
   * Search - Pesquisa realizada
   * @param {string} searchQuery - Termo pesquisado
   */
  static trackSearch(searchQuery) {
    this.track('Search', {
      search_string: searchQuery,
    });
  }

  /**
   * Contact - Contato/Suporte
   */
  static trackContact() {
    this.track('Contact', {
      content_name: 'Suporte BIA',
    });
  }
}

export default MetaPixelService;
