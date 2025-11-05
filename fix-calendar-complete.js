// 🔥 SCRIPT COMPLETO DE RESOLUÇÃO DO CALENDÁRIO BIA
// Cole este código no console do navegador (F12) quando estiver no frontend React

console.log('🚀 [DEBUG CALENDÁRIO] Iniciando diagnóstico completo...');

// ================================
// 1. CONFIGURAÇÃO INICIAL
// ================================
const TOKEN = '197|xNN9nNkMb3bBA0rkNoBr20RzbkDLyCujdpsBjzuXcc93abaf';
const API_BASE = 'http://localhost:8000/api';

// ================================
// 2. VERIFICAR E CONFIGURAR TOKEN
// ================================
function configureToken() {
    console.log('🔑 Configurando token de autenticação...');
    localStorage.setItem('auth_token', TOKEN);
    console.log('✅ Token configurado:', TOKEN.substring(0, 20) + '...');
    return true;
}

// ================================
// 3. TESTAR API DE ARTIGOS
// ================================
async function testArticlesAPI() {
    try {
        console.log('🔄 Testando API de artigos...');
        
        const response = await fetch(`${API_BASE}/artigos`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const articles = data.data?.data || data.data || [];
        
        console.log('✅ API funcionando!', {
            success: data.success,
            totalArticles: articles.length,
            articlesWithPublishedUrl: articles.filter(a => a.published_url).length,
            articlesWithScheduledDate: articles.filter(a => a.scheduled_date).length,
            firstArticles: articles.slice(0, 3).map(a => ({
                id: a.id,
                titulo: a.titulo,
                status: a.status,
                published_at: a.published_at,
                published_url: a.published_url,
                scheduled_date: a.scheduled_date,
                site_id: a.site_id
            }))
        });
        
        return { success: true, articles };
    } catch (error) {
        console.error('❌ Erro na API:', error);
        return { success: false, error: error.message };
    }
}

// ================================
// 4. FORÇAR ATUALIZAÇÃO DO CONTEXTO REACT
// ================================
function forceReactContextUpdate() {
    console.log('🔄 Forçando atualização do contexto React...');
    
    // Tentar múltiplas estratégias
    const strategies = [
        () => window.dispatchEvent(new CustomEvent('auth-token-updated')),
        () => window.dispatchEvent(new CustomEvent('storage', { 
            key: 'auth_token', 
            newValue: TOKEN 
        })),
        () => window.dispatchEvent(new CustomEvent('bia:refresh-data')),
        () => window.dispatchEvent(new CustomEvent('bia:force-sync')),
    ];
    
    strategies.forEach((strategy, index) => {
        try {
            strategy();
            console.log(`✅ Estratégia ${index + 1} executada`);
        } catch (error) {
            console.warn(`⚠️ Estratégia ${index + 1} falhou:`, error);
        }
    });
    
    // Forçar reload do estado BIA se disponível
    if (window.__BIA_STATE__) {
        console.log('🔍 Estado BIA encontrado no window, forçando atualização...');
        delete window.__BIA_STATE__;
        delete window.__BIA_SERVER_SYNCED;
    }
    
    return true;
}

// ================================
// 5. VERIFICAR ESTADO DO CALENDÁRIO
// ================================
function checkCalendarState() {
    console.log('📅 Verificando estado do calendário...');
    
    // Verificar se há elementos do calendário na página
    const calendarElements = {
        calendar: document.querySelector('[class*="grid-cols-7"]'),
        calendarCells: document.querySelectorAll('[class*="h-24"]'),
        statsCards: document.querySelectorAll('[class*="bg-purple-50"]'),
        filterSelect: document.querySelector('select'),
        titleElement: document.querySelector('h1')
    };
    
    console.log('🔍 Elementos do calendário encontrados:', {
        hasCalendar: !!calendarElements.calendar,
        calendarCells: calendarElements.calendarCells.length,
        hasStats: !!calendarElements.statsCards.length,
        hasFilter: !!calendarElements.filterSelect,
        pageTitle: calendarElements.titleElement?.textContent || 'N/A'
    });
    
    // Verificar dados no localStorage
    const localState = localStorage.getItem('bia-state');
    if (localState) {
        try {
            const parsed = JSON.parse(localState);
            console.log('💾 Estado local encontrado:', {
                sites: parsed.sites?.length || 0,
                ideas: parsed.ideas?.length || 0,
                articles: parsed.articles?.length || 0,
                articlesWithPublishedUrl: parsed.articles?.filter(a => a.publishedUrl).length || 0,
                articlesWithScheduledDate: parsed.articles?.filter(a => a.scheduledDate).length || 0,
                lastSync: parsed.lastSync
            });
        } catch (error) {
            console.warn('⚠️ Erro ao parsear estado local:', error);
        }
    } else {
        console.log('📝 Nenhum estado local encontrado');
    }
    
    return calendarElements;
}

// ================================
// 6. RECARREGAR PÁGINA SE NECESSÁRIO
// ================================
function reloadPageIfNeeded() {
    console.log('🔄 Verificando se precisa recarregar a página...');
    
    // Verificar se estamos na página correta
    const currentHash = window.location.hash;
    const isOnCalendar = currentHash.includes('calendario') || currentHash.includes('calendar');
    
    if (!isOnCalendar) {
        console.log('📅 Redirecionando para página do calendário...');
        window.location.hash = '#calendario';
        setTimeout(() => window.location.reload(), 500);
        return false;
    }
    
    console.log('✅ Já estamos na página do calendário');
    return true;
}

// ================================
// 7. EXECUTAR DIAGNÓSTICO COMPLETO
// ================================
async function runCompleteFixCalendar() {
    console.log('🔥 INICIANDO CORREÇÃO COMPLETA DO CALENDÁRIO...');
    console.log('=' .repeat(60));
    
    try {
        // Passo 1: Configurar token
        console.log('\n📋 PASSO 1: Configurando autenticação...');
        configureToken();
        
        // Passo 2: Testar API
        console.log('\n📋 PASSO 2: Testando API...');
        const apiResult = await testArticlesAPI();
        
        if (!apiResult.success) {
            console.error('❌ API não está funcionando. Abortando...');
            return false;
        }
        
        // Passo 3: Verificar estado do calendário
        console.log('\n📋 PASSO 3: Verificando estado atual...');
        const calendarState = checkCalendarState();
        
        // Passo 4: Forçar atualização do contexto
        console.log('\n📋 PASSO 4: Atualizando contexto React...');
        forceReactContextUpdate();
        
        // Passo 5: Aguardar e verificar se precisa recarregar
        console.log('\n📋 PASSO 5: Verificando necessidade de reload...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const needsReload = !reloadPageIfNeeded();
        
        if (needsReload) {
            console.log('🔄 Página será recarregada...');
            return true;
        }
        
        // Passo 6: Aguardar um pouco mais para o React processar
        console.log('\n📋 PASSO 6: Aguardando processamento do React...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Passo 7: Verificação final
        console.log('\n📋 PASSO 7: Verificação final...');
        const finalCheck = checkCalendarState();
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 RESULTADO FINAL:');
        console.log('✅ Token configurado:', !!localStorage.getItem('auth_token'));
        console.log('✅ API funcionando:', apiResult.success);
        console.log('✅ Artigos disponíveis:', apiResult.articles?.length || 0);
        console.log('✅ Calendário renderizado:', !!finalCheck.calendar);
        console.log('✅ Células do calendário:', finalCheck.calendarCells.length);
        
        if (apiResult.articles?.length > 0 && finalCheck.calendarCells.length === 0) {
            console.log('\n⚠️ PROBLEMA DETECTADO: Artigos encontrados, mas calendário vazio');
            console.log('🔄 Tentando recarregar página em 3 segundos...');
            setTimeout(() => window.location.reload(), 3000);
        } else if (apiResult.articles?.length > 0 && finalCheck.calendarCells.length > 0) {
            console.log('\n🎉 SUCESSO! Calendário deve estar funcionando corretamente!');
            console.log('💡 Se ainda não vê os artigos, aguarde alguns segundos ou atualize a página manualmente');
        } else {
            console.log('\n📝 INFO: Nenhum artigo encontrado para exibir no calendário');
        }
        
        return true;
        
    } catch (error) {
        console.error('\n❌ ERRO DURANTE A CORREÇÃO:', error);
        return false;
    }
}

// ================================
// 8. COMANDOS DISPONÍVEIS
// ================================
console.log('\n🎯 COMANDOS DISPONÍVEIS:');
console.log('• runCompleteFixCalendar() - Executa correção completa');
console.log('• configureToken() - Configura apenas o token');
console.log('• testArticlesAPI() - Testa apenas a API');
console.log('• checkCalendarState() - Verifica estado atual');
console.log('• forceReactContextUpdate() - Força atualização do React');

// ================================
// 9. EXECUÇÃO AUTOMÁTICA (OPCIONAL)
// ================================
console.log('\n🤖 Para executar automaticamente, digite: runCompleteFixCalendar()');

// Disponibilizar funções globalmente
window.calendarDebug = {
    runCompleteFixCalendar,
    configureToken,
    testArticlesAPI,
    checkCalendarState,
    forceReactContextUpdate,
    reloadPageIfNeeded
};
