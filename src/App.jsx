import { useState, useEffect } from 'react';
import { BiaProvider, useBia } from './components/BiaContext';
import { Layout } from './components/Layout';
import LoginRegister from './components/LoginRegister.tsx';
import { Dashboard } from './components/Dashboard';
import { MeusSites } from './components/pages/MeusSites';
import { GerarIdeias } from './components/pages/GerarIdeias';
import { ProduzirArtigos } from './components/pages/ProduzirArtigos';
import { BiaNews } from './components/pages/BiaNews';
import { AdminPanel } from './components/pages/AdminPanel';
import { AgendarPosts } from './components/pages/AgendarPosts';
import { Calendario } from './components/pages/Calendario';
import { Historico } from './components/pages/Historico';
import { Excluidos } from './components/pages/Excluidos';
import { LojaBIA } from './components/pages/LojaBIANew';
import { FinancialDashboard } from './components/pages/FinancialDashboard';
import Suporte from './components/pages/Suporte';
import { MinhaConta } from './components/pages/MinhaConta';
import { getCurrentUser } from './services/auth';
import { toast, Toaster } from 'sonner';
import './App.css'

// Componente principal da aplicação - BASEADO NO FIGMA
function AppContent() {
  // Estados simples como no Figma
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { actions, state } = useBia();

  // Inicialização simples como no Figma
  useEffect(() => {
    initializeApp();
  }, []);

  // Auto-atualização de dados quando necessário
  useEffect(() => {
    const autoUpdateUserData = async () => {
      if (isLoggedIn && userData) {
        const authToken = localStorage.getItem('auth_token');
        if (authToken) {
          try {
            // Verificar se os dados estão desatualizados (mais de 1 hora)
            const lastUpdate = userData.updatedAt ? new Date(userData.updatedAt) : new Date(0);
            const now = new Date();
            const oneHour = 60 * 60 * 1000;
            
            if (now - lastUpdate > oneHour) {
              console.log('🔄 Dados desatualizados, buscando atualizações...');
              const response = await getCurrentUser(authToken);
              
              if (response.success && response.user) {
                // IMPORTANTE: Usar dados do BiaContext se disponíveis (mais atuais)
                const biaContextUser = state.user;
                const updatedUser = {
                  ...userData,
                  ...response.user,
                  quotas: response.user.quotas || userData.quotas,
                  // PRIORIZAR consumo do BiaContext se mais recente
                  consumo: biaContextUser?.consumo || response.user.consumo || userData.consumo,
                  updatedAt: new Date().toISOString()
                };

                setUserData(updatedUser);
                localStorage.setItem('bia-user-local', JSON.stringify(updatedUser));
                actions.login(updatedUser);
                console.log('✅ Dados atualizados automaticamente');
              }
            }
          } catch (error) {
            console.error('❌ Erro na atualização automática:', error);
          }
        }
      }
    };

    autoUpdateUserData();
  }, [isLoggedIn, userData?.email]); // Trigger quando login muda ou email muda

  const initializeApp = async () => {
    try {
      console.log('🚀 Inicializando aplicação BIA...');

      // Tentar restaurar sessão do usuário (como no Figma)
      const savedUser = localStorage.getItem('bia-user-local');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        console.log('🔄 Restaurando sessão do usuário:', user.email);
        
        // Configuração especial para desenvolvedor (como no Figma)
        if (user.email === 'dev@bia.com') {
          user.plano = 'Custom';
          user.is_developer = true;
          user.is_admin = true;
        }

        setUserData(user);
        setIsLoggedIn(true);
        actions.login(user);
        
        console.log('✅ Sessão restaurada com sucesso');
        
        // Verificar se deve voltar para uma página específica após refresh
        const returnToPage = localStorage.getItem('bia-return-to-page');
        const refreshTimestamp = localStorage.getItem('bia-refresh-timestamp');
        
        if (returnToPage && refreshTimestamp) {
          const timeDiff = Date.now() - parseInt(refreshTimestamp);
          
          // Se o refresh foi há menos de 10 segundos, voltar para a página salva
          if (timeDiff < 10000) {
            console.log('🔄 Voltando para página após refresh:', returnToPage);
            setCurrentPage(returnToPage);
            
            // Limpar os dados do localStorage
            localStorage.removeItem('bia-return-to-page');
            localStorage.removeItem('bia-refresh-timestamp');
          } else {
            // Se passou muito tempo, limpar os dados antigos
            localStorage.removeItem('bia-return-to-page');
            localStorage.removeItem('bia-refresh-timestamp');
          }
        }
      }

    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função de login EXATAMENTE como no Figma
  const handleLogin = async (user) => {
    try {
      console.log('🔑 Processando login para:', user.email);
      
      const completeUser = {
        ...user,
        email: user.email.toLowerCase(),
        lastLogin: new Date().toISOString()
      };

      // Configuração especial para desenvolvedor (como no Figma)
      if (completeUser.email === 'dev@bia.com') {
        completeUser.plano = 'Custom';
        completeUser.is_developer = true;
        completeUser.is_admin = true;
      }

      // Atualizar estados (como no Figma)
  setUserData(completeUser);
  setIsLoggedIn(true);
  localStorage.setItem('bia-user-local', JSON.stringify(completeUser));
  actions.login(completeUser);

      // Removido: notificação de boas-vindas aqui para evitar duplicatas
      // A notificação será exibida apenas no LoginRegister.jsx

      console.log('✅ Login processado com sucesso');

    } catch (error) {
      console.error('❌ Erro no login:', error);
      toast.error('Erro no login. Tente novamente.');
    }
  };

  // Função de logout (como no Figma)
  const handleLogout = () => {
    console.log('🚪 Realizando logout...');
    
    localStorage.removeItem('bia-user-local');
    localStorage.removeItem('bia-state');
    
    setUserData(null);
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
    
    actions.logout();
    
    toast.success('Logout realizado com sucesso');
    console.log('✅ Logout completo');
  };

  // Função para mudar página (como no Figma)
  const handlePageChange = (page) => {
    console.log('📄 Mudando para página:', page);
    setCurrentPage(page);
  };

  // Função para forçar atualização dos dados do usuário
  const refreshUserData = async () => {
    try {
      console.log('🔄 Forçando atualização dos dados do usuário...');
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.log('❌ Token não encontrado para atualização');
        return false;
      }

      const response = await getCurrentUser(token);
      
      if (response.success && response.user) {
        // IMPORTANTE: Usar dados do BiaContext se disponíveis (mais atuais)
        const biaContextUser = state.user;
        const updatedUser = {
          ...userData,
          ...response.user,
          quotas: response.user.quotas || userData?.quotas,
          // PRIORIZAR consumo do BiaContext se mais recente
          consumo: biaContextUser?.consumo || response.user.consumo || userData?.consumo,
          updatedAt: new Date().toISOString()
        };

        setUserData(updatedUser);
        localStorage.setItem('bia-user-local', JSON.stringify(updatedUser));
        actions.login(updatedUser);
        console.log('✅ Dados do usuário atualizados com sucesso');
        toast.success('Dados atualizados!');
        return true;
      } else {
        console.log('❌ Erro na resposta da API:', response);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar dados do usuário:', error);
      toast.error('Erro ao atualizar dados');
      return false;
    }
  };

  // Função para atualizar dados do usuário (como no Figma)
  const updateUserData = async (updatedUserData) => {
    try {
      console.log('🔄 Atualizando dados do usuário:', updatedUserData);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Token de autenticação não encontrado. Faça login novamente.');
        return false;
      }

      // Mapear campos para formato da API
      const apiData = {
        name: updatedUserData.name,
        whatsapp: updatedUserData.whatsapp,
        cpf: updatedUserData.cpf,
        data_nascimento: updatedUserData.dataNascimento
      };

      // Remover campos undefined
      Object.keys(apiData).forEach(key => {
        if (apiData[key] === undefined) {
          delete apiData[key];
        }
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/auth/user`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Erro na API:', errorData);
        throw new Error(errorData.message || 'Erro ao atualizar dados');
      }

      const result = await response.json();
      console.log('✅ Dados atualizados na API:', result);

      // Atualizar estado local com dados do servidor
      if (result.success && result.data) {
        setUserData(result.data);
        localStorage.setItem('bia-user-local', JSON.stringify(result.data));
        actions.login(result.data);
        toast.success('Dados atualizados com sucesso!');
        return true;
      } else {
        throw new Error(result.message || 'Resposta inválida do servidor');
      }
      
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      toast.error(`Erro ao atualizar informações: ${error.message}`);
      return false;
    }
  };

  // Renderizar página atual EXATAMENTE como no Figma
  const renderCurrentPage = () => {
    // Se não está logado, mostra tela de login (como no Figma)
    if (!isLoggedIn) {
      return <LoginRegister onLogin={handleLogin} />;
    }

    // Se está logado, mostra as páginas (como no Figma)
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard userData={userData} onNavigate={handlePageChange} onUpdateUser={updateUserData} onRefreshUser={refreshUserData} />;
      case 'sites':
        return <MeusSites userData={userData} onUpdateUser={updateUserData} onNavigate={handlePageChange} />;
      case 'ideas':
        return <GerarIdeias userData={userData} onPageChange={handlePageChange} onUpdateUser={updateUserData} />;
      case 'articles':
        return <ProduzirArtigos userData={userData} onUpdateUser={updateUserData} onRefreshUser={refreshUserData} />;
      case 'news':
        return <BiaNews userData={userData} onUpdateUser={updateUserData} onNavigate={handlePageChange} />;
      case 'schedule':
        return <AgendarPosts userData={userData} onUpdateUser={updateUserData} />;
      case 'calendar':
        return <Calendario userData={userData} onUpdateUser={updateUserData} />;
      case 'history':
        return <Historico userData={userData} onUpdateUser={updateUserData} />;
      case 'deleted':
        return <Excluidos userData={userData} onUpdateUser={updateUserData} />;
      case 'store':
        return <LojaBIA userData={userData} onUpdateUser={updateUserData} onRefreshUser={refreshUserData} />;
      case 'support':
        return <Suporte userData={userData} onUpdateUser={updateUserData} />;
      case 'account':
        return <MinhaConta userData={userData} onUpdateUser={updateUserData} onNavigate={handlePageChange} />;
      case 'admin':
        return <AdminPanel userData={userData} onUpdateUser={updateUserData} />;
      case 'financial':
        return <FinancialDashboard userData={userData} onUpdateUser={updateUserData} />;
      default:
        return <Dashboard />;
    }
  };

  // Loading (como no Figma)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando BIA Local...</p>
        </div>
      </div>
    );
  }

  // Render principal EXATAMENTE como no Figma
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        {renderCurrentPage()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <Layout
        currentPage={currentPage}
        onNavigate={handlePageChange}
        onLogout={handleLogout}
        userData={userData}
        showAdminAccess={userData?.email === 'adm@bloginfinitoautomatico.com'}
      >
        {renderCurrentPage()}
      </Layout>
    </div>
  );
}

// Componente principal com Provider (como no Figma)
function App() {
  return (
    <BiaProvider>
      <AppContent />
    </BiaProvider>
  );
}

export default App;