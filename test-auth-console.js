// 🔐 Script de Teste de Autenticação BIA
// Cole este código no console do navegador (F12) no frontend React

console.log('🚀 Iniciando teste de autenticação BIA...');

// Token válido do usuário muriloparrillo@hotmail.com
const TOKEN = '197|xNN9nNkMb3bBA0rkNoBr20RzbkDLyCujdpsBjzuXcc93abaf';

// 1. Configurar token no localStorage
function setAuthToken() {
    localStorage.setItem('auth_token', TOKEN);
    console.log('✅ Token configurado no localStorage');
    return TOKEN;
}

// 2. Verificar token atual
function checkToken() {
    const currentToken = localStorage.getItem('auth_token');
    console.log('🔍 Token atual:', currentToken ? `${currentToken.substring(0, 20)}...` : 'Nenhum');
    return currentToken;
}

// 3. Testar API de artigos
async function testArticlesAPI() {
    try {
        const token = localStorage.getItem('auth_token') || TOKEN;
        
        console.log('🔄 Testando API de artigos...');
        
        const response = await fetch('http://localhost:8000/api/artigos', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const articles = data.data?.data || data.data || [];
        
        console.log('✅ API funcionando! Artigos encontrados:', articles.length);
        console.log('📝 Primeiros 3 artigos:', articles.slice(0, 3));
        
        return data;
    } catch (error) {
        console.error('❌ Erro na API:', error);
        return null;
    }
}

// 4. Simular login completo
async function simulateLogin() {
    try {
        console.log('🔄 Simulando login...');
        
        const response = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: 'muriloparrillo@hotmail.com',
                password: 'Mur@2025@#'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const token = data.data?.token || data.token;
        
        if (token) {
            localStorage.setItem('auth_token', token);
            console.log('✅ Login realizado e token salvo!');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Erro no login:', error);
        return null;
    }
}

// 5. Forçar atualização do contexto React (se disponível)
function refreshReactContext() {
    console.log('🔄 Tentando atualizar contexto React...');
    
    // Tentar disparar evento personalizado
    window.dispatchEvent(new CustomEvent('auth-token-updated'));
    
    // Tentar recarregar a página se necessário
    setTimeout(() => {
        console.log('🔄 Recarregando página para aplicar mudanças...');
        window.location.reload();
    }, 1000);
}

// 6. Executar teste completo
async function runCompleteTest() {
    console.log('🚀 Executando teste completo...');
    
    // Configurar token
    setAuthToken();
    
    // Testar API
    const apiResult = await testArticlesAPI();
    
    if (apiResult) {
        console.log('✅ Teste concluído com sucesso!');
        console.log('📊 Resumo:');
        console.log('   - Token configurado: ✅');
        console.log('   - API funcionando: ✅');
        console.log('   - Artigos encontrados:', (apiResult.data?.data || apiResult.data || []).length);
        
        // Atualizar contexto React
        refreshReactContext();
    } else {
        console.log('❌ Teste falhou - problemas na API');
    }
}

// Comandos disponíveis no console:
console.log(`
🎯 Comandos disponíveis:

1. runCompleteTest()     - Executa teste completo
2. setAuthToken()        - Configura token no localStorage  
3. checkToken()          - Verifica token atual
4. testArticlesAPI()     - Testa API de artigos
5. simulateLogin()       - Faz login real
6. refreshReactContext() - Atualiza contexto React

💡 Para resolver o problema do calendário, execute:
   runCompleteTest()
`);

// Auto-execução se solicitado
if (window.location.search.includes('auto=true')) {
    runCompleteTest();
}
