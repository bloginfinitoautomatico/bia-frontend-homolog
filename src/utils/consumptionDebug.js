// Utilitário para debug e correção de problemas de consumo

export const consumptionDebug = {
  // Log detalhado de consumo
  logConsumption: (userData, action = 'LOAD') => {
    console.group(`🔍 CONSUMPTION DEBUG - ${action}`);
    console.log('📊 User Email:', userData.email);
    console.log('📊 Current Consumption:', userData.consumo);
    console.log('📊 Quotas:', userData.quotas);
    console.log('📊 Plan:', userData.plano);
    console.log('📊 Last Reset:', userData.consumo?.last_reset);
    console.log('📊 Articles Used:', `${userData.consumo?.articles || 0}/${userData.quotas?.articles || 5}`);
    console.log('📊 Sites Used:', `${userData.consumo?.sites || 0}/${userData.quotas?.sites || 1}`);
    console.log('📊 Ideas Used:', `${userData.consumo?.ideas || 0}/${userData.quotas?.ideas || 10}`);
    console.groupEnd();
  },

  // Verificar se o reset mensal deve ser aplicado
  shouldResetConsumption: (lastReset, userCreatedAt) => {
    if (!lastReset) return true;
    
    const today = new Date();
    const resetDate = new Date(lastReset);
    
    // Se userCreatedAt for fornecido, usar reset baseado em 30 dias da criação
    if (userCreatedAt) {
      const createdDate = new Date(userCreatedAt);
      
      // Calcular quantos períodos de 30 dias se passaram desde a criação
      const daysSinceCreated = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
      const periodsElapsed = Math.floor(daysSinceCreated / 30);
      
      // Data do último reset esperado (baseado em períodos de 30 dias)
      const expectedLastResetDate = new Date(createdDate);
      expectedLastResetDate.setDate(createdDate.getDate() + (periodsElapsed * 30));
      
      // Se o último reset foi antes do período atual, deve resetar
      return resetDate < expectedLastResetDate;
    }
    
    // Fallback: Se não tiver data de criação, usar lógica de mês calendário (compatibilidade)
    return today.getMonth() !== resetDate.getMonth() || 
           today.getFullYear() !== resetDate.getFullYear();
  },

  // Validar consistência dos dados de consumo
  validateConsumption: (userData) => {
    const issues = [];
    
    if (!userData.consumo) {
      issues.push('Consumo não definido');
    } else {
      if (typeof userData.consumo.articles !== 'number') {
        issues.push('Contador de artigos inválido');
      }
      if (typeof userData.consumo.sites !== 'number') {
        issues.push('Contador de sites inválido');
      }
      if (typeof userData.consumo.ideas !== 'number') {
        issues.push('Contador de ideias inválido');
      }
      if (!userData.consumo.last_reset) {
        issues.push('Data de último reset não definida');
      }
    }

    if (!userData.quotas) {
      issues.push('Quotas não definidas');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  },

  // Corrigir dados de consumo inconsistentes
  fixConsumption: (userData) => {
    const fixed = { ...userData };
    
    // Garantir estrutura básica
    if (!fixed.consumo) {
      fixed.consumo = {
        sites: 0,
        articles: 0,
        ideas: 0,
        last_reset: new Date().toISOString().split('T')[0]
      };
    }

    // Garantir que todos os contadores são números
    fixed.consumo.articles = Number(fixed.consumo.articles) || 0;
    fixed.consumo.sites = Number(fixed.consumo.sites) || 0;
    fixed.consumo.ideas = Number(fixed.consumo.ideas) || 0;

    // Garantir data de reset
    if (!fixed.consumo.last_reset) {
      fixed.consumo.last_reset = new Date().toISOString().split('T')[0];
    }

    // Garantir quotas básicas
    if (!fixed.quotas) {
      fixed.quotas = {
        sites: 1,
        articles: 5,
        ideas: 10,
        isUnlimited: false
      };
    }

    // Verificar se precisa resetar (passar data de criação se disponível)
    const userCreatedAt = fixed.createdAt || fixed.created_at;
    if (this.shouldResetConsumption(fixed.consumo.last_reset, userCreatedAt)) {
      console.log('🔄 Reset de consumo aplicado (baseado em 30 dias da ativação)');
      fixed.consumo.articles = 0;
      fixed.consumo.sites = 0;
      fixed.consumo.ideas = 0;
      fixed.consumo.last_reset = new Date().toISOString().split('T')[0];
    }

    return fixed;
  },

  // Verificar inconsistências específicas para investigação
  investigateUser: (email, reportedConsumption, actualConsumption) => {
    console.group(`🕵️ INVESTIGATION - ${email}`);
    console.log('📋 Reported Consumption (Dashboard):', reportedConsumption);
    console.log('📋 Actual Consumption (Database):', actualConsumption);
    
    const diff = {
      articles: reportedConsumption - actualConsumption,
      timestamp: new Date().toISOString()
    };
    
    console.log('📋 Difference:', diff);
    
    if (diff.articles !== 0) {
      console.warn('⚠️ INCONSISTENCY DETECTED!');
      console.log('📋 Possible causes:');
      console.log('   - Multiple API calls for same article');
      console.log('   - Cache inconsistency');
      console.log('   - Race condition in consumption update');
      console.log('   - Frontend/Backend sync issue');
    }
    
    console.groupEnd();
    return diff;
  }
};

// Para usar no console do navegador durante debug
window.consumptionDebug = consumptionDebug;
