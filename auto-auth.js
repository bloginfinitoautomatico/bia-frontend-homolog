// Script para injetar token no frontend automaticamente
(function() {
    console.log('🚀 Configurando autenticação automaticamente...');
    
    // Token válido
    const TOKEN = '199|CxjtTmN4DrNpQzoeRY9qmmQlt0Ov11mgTGuuuDQj1d6cdde7';
    
    // Configurar token
    localStorage.setItem('auth_token', TOKEN);
    console.log('✅ Token configurado:', TOKEN.substring(0, 20) + '...');
    
    // Disparar eventos para o React
    window.dispatchEvent(new CustomEvent('storage', { 
        key: 'auth_token', 
        newValue: TOKEN 
    }));
    
    window.dispatchEvent(new CustomEvent('auth-token-updated'));
    
    // Se estivermos no calendário, recarregar
    if (window.location.hash.includes('calendario')) {
        console.log('📅 No calendário - aguardando 2s e recarregando...');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } else {
        // Ir para o calendário
        console.log('📅 Redirecionando para calendário...');
        window.location.hash = '#calendario';
    }
    
    console.log('🎉 Configuração concluída!');
})();
