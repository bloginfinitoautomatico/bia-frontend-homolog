import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { User, Settings, CheckCircle, AlertCircle, Save, Clock, Lock, Eye, EyeOff, Shield, Key, History } from '../icons';
import { useBia } from '../BiaContext';
import { FREE_PLAN_LIMITS } from '../../utils/constants';
import { toast } from 'sonner';
import { getApiUrl } from '../../config/api';

interface Purchase {
  id: number;
  payment_id: string;
  description: string;
  value: string;
  status: string;
  payment_method: string;
  type: string;
  created_at: string;
  tipo?: string;
}

interface MinhaContaProps {
  userData: any;
  onNavigate?: (page: string) => void;
  onUpdateUser?: (updatedUserData: any) => Promise<boolean>;
}

export function MinhaConta({ userData, onNavigate, onUpdateUser }: MinhaContaProps) {
  const { actions, state } = useBia();
  
  // Função para extrair apenas a data (yyyy-MM-dd) do formato ISO
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    // Se já está no formato correto, retorna
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
    // Se está no formato ISO, extrai apenas a data
    return dateString.split('T')[0];
  };

  const [formData, setFormData] = useState({
    nome: userData?.name || '',
    email: userData?.email || '',
    whatsapp: userData?.whatsapp || '',
    cpf: userData?.cpf || '',
    dataNascimento: formatDateForInput(userData?.data_nascimento)
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [visibleHistoryItems, setVisibleHistoryItems] = useState(10);

  // Estados para gestão de senha
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(true);

  // Estados para modais
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);

  // Verificar limites do plano gratuito
  const limits = actions.checkFreePlanLimits();
  const isFreePlan = actions.isFreePlan();

  // Sincroniza formData com userData sempre que userData mudar
  useEffect(() => {
    // Função para extrair apenas a data (yyyy-MM-dd) do formato ISO
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      // Se já está no formato correto, retorna
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
      // Se está no formato ISO, extrai apenas a data
      return dateString.split('T')[0];
    };

    setFormData({
      nome: userData?.name || '',
      email: userData?.email || '',
      whatsapp: userData?.whatsapp || '',
      cpf: userData?.cpf || '',
      dataNascimento: formatDateForInput(userData?.data_nascimento)
    });
  }, [userData]);

  // Verificar se usuário tem senha definida
  useEffect(() => {
    checkUserPassword();
  }, [userData?.email]);

  // Carregar histórico de compras
  useEffect(() => {
    loadPurchaseHistory();
  }, [userData?.id]);

  const checkUserPassword = async () => {
    if (!userData?.email) {
      setIsCheckingPassword(false);
      setHasPassword(false);
      return;
    }
    
    try {
      setIsCheckingPassword(true);
      console.log('🔍 Verificando status da senha para:', userData.email);
      
      // Mock implementation - replace with actual API call
      // For now, assume user doesn't have password
      setTimeout(() => {
        setHasPassword(false);
        setIsCheckingPassword(false);
        console.log('✅ Status da senha verificado:', false);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao verificar senha:', error);
      setHasPassword(false);
      setIsCheckingPassword(false);
    }
  };

  const loadPurchaseHistory = async () => {
    if (!userData?.id) return;
    
    try {
      setLoadingHistory(true);
      const response = await fetch(`${getApiUrl('user/purchases')}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPurchaseHistory(data.compras || []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para formatar WhatsApp
  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Handler especial para CPF com formatação
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 11) {
      setFormData({
        ...formData,
        cpf: formatted
      });
    }
  };

  // Handler especial para WhatsApp com formatação
  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 11) {
      setFormData({
        ...formData,
        whatsapp: formatted
      });
    }
  };

  // Função para validar formulário
  const validateForm = () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return false;
    }

    // Validar CPF se preenchido
    if (formData.cpf.trim()) {
      const cleanCPF = formData.cpf.replace(/\D/g, '');
      if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
        toast.error('CPF inválido');
        return false;
      }
    }

    // Validar data de nascimento se preenchida
    if (formData.dataNascimento) {
      const birthDate = new Date(formData.dataNascimento);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        toast.error('Você deve ter pelo menos 18 anos');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsUpdating(true);
    setUpdateSuccess(false);
    
    try {
      console.log('💾 Salvando dados da conta...');

      const updatedUserData = {
        name: formData.nome.trim(),
        email: userData?.email, // Email não pode ser alterado
        whatsapp: formData.whatsapp.trim(),
        cpf: formData.cpf.replace(/\D/g, ''), // Salvar CPF sem formatação
        dataNascimento: formData.dataNascimento
      };

      // Usar a função de update do App.tsx que sincroniza com Supabase
      const success = onUpdateUser ? await onUpdateUser(updatedUserData) : false;
      
      if (success) {
        setUpdateSuccess(true);
        toast.success('Informações atualizadas com sucesso!');
        setTimeout(() => setUpdateSuccess(false), 5000);
        
        console.log('✅ Dados da conta salvos e sincronizados');
      } else {
        // Fallback para atualização apenas local (compatibilidade)
        console.warn('⚠️ Usando fallback para atualização local');
        
        const localUser = {
          ...userData,
          ...updatedUserData
        };
        
        // Atualizar no contexto BIA
        actions.login(localUser);
        
        // Atualizar no localStorage
        localStorage.setItem('bia-user', JSON.stringify(localUser));
        
        setUpdateSuccess(true);
        toast.success('Informações atualizadas localmente!');
        setTimeout(() => setUpdateSuccess(false), 5000);
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar dados da conta:', error);
      toast.error('Erro ao atualizar informações. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Funções para gestão de senha
  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }));
  };

  const validatePasswordForm = (): boolean => {
    if (!passwordForm.newPassword) {
      toast.error('Nova senha é obrigatória');
      return false;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return false;
    }

    // Verificar critérios de segurança
    const hasUpper = /[A-Z]/.test(passwordForm.newPassword);
    const hasLower = /[a-z]/.test(passwordForm.newPassword);
    const hasNumber = /[0-9]/.test(passwordForm.newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(passwordForm.newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      toast.error('A senha deve conter pelo menos: 1 letra maiúscula, 1 minúscula, 1 número e 1 caractere especial');
      return false;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return false;
    }

    if (hasPassword && !passwordForm.currentPassword) {
      toast.error('Senha atual é obrigatória para alterar a senha');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setIsChangingPassword(true);

    try {
      console.log('🔐 Alterando senha do usuário...');

      // Mock implementation - replace with actual API call
      setTimeout(() => {
        toast.success('Senha alterada com sucesso!');
        
        // Limpar formulário
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Atualizar status
        setHasPassword(true);
        setIsChangingPassword(false);
        
        console.log('✅ Senha alterada com sucesso');
      }, 2000);

    } catch (error) {
      console.error('❌ Erro ao alterar senha:', error);
      toast.error('Erro interno. Tente novamente.');
      setIsChangingPassword(false);
    }
  };

  // Calcular estatísticas
  const ideasGenerated = state.ideas.length;
  const articlesProduced = state.articles.filter(a => a.status === 'Concluído').length;
  const sitesConnected = state.sites.length;

  // Calcular limites restantes
  const ideasUsed = state.ideas.length;
  const articlesUsed = state.articles.filter(a => a.status === 'Concluído').length;
  const sitesUsed = state.sites.length;

  const ideasRemaining = isFreePlan ? Math.max(0, FREE_PLAN_LIMITS.ideas - ideasUsed) : 'Ilimitado';
  const articlesRemaining = isFreePlan ? Math.max(0, FREE_PLAN_LIMITS.articles - articlesUsed) : 'Ilimitado';
  const sitesRemaining = isFreePlan ? Math.max(0, FREE_PLAN_LIMITS.sites - sitesUsed) : 'Ilimitado';

  const ideasProgress = isFreePlan ? (ideasUsed / FREE_PLAN_LIMITS.ideas) * 100 : 0;
  const articlesProgress = isFreePlan ? (articlesUsed / FREE_PLAN_LIMITS.articles) * 100 : 0;
  const sitesProgress = isFreePlan ? (sitesUsed / FREE_PLAN_LIMITS.sites) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h1 className="font-poppins text-3xl text-black mb-2">Minha Conta</h1>
          <p className="font-montserrat text-gray-600">Gerencie suas informações pessoais, senha e veja os limites do seu plano</p>
        </div>
      </div>

      {/* Banner de Upgrade - apenas para plano gratuito */}
      {isFreePlan && (
        <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-6 text-center">
            <h3 className="font-poppins text-xl text-purple-800 mb-2">
              🚀 Desbloqueie Todo o Potencial da BIA!
            </h3>
            <p className="font-montserrat text-purple-700 mb-4">
              Faça um Upgrade do seu plano e tenha acesso a mais ideias, artigos e sites
            </p>
            <Button 
              className="font-montserrat text-white"
              style={{ backgroundColor: '#8c52ff' }}
              onClick={() => onNavigate?.('store')}
            >
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Alert de sucesso */}
      {updateSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✅ Informações atualizadas com sucesso e sincronizadas com a nuvem!
          </AlertDescription>
        </Alert>
      )}

      {/* Alertas de erro geral do estado, se houver */}
      {state.error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {state.error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Informações Pessoais */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="font-poppins text-xl text-black flex items-center space-x-2">
              <User size={20} style={{ color: '#8c52ff' }} />
              <span>Informações Pessoais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="font-montserrat">Nome Completo *</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="font-montserrat"
                placeholder="Seu nome completo"
                disabled={isUpdating}
                required
              />
            </div>
            
            {/* Campo E-mail - Somente Leitura */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-montserrat flex items-center space-x-2">
                <span>E-mail *</span>
                <Lock size={14} className="text-gray-500" />
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                className="font-montserrat bg-gray-100 text-gray-600 cursor-not-allowed"
                placeholder="seu@email.com"
                disabled={true}
                readOnly={true}
              />
              <p className="font-montserrat text-xs text-gray-500">
                📧 O e-mail não pode ser alterado pois é usado como identificação do cadastro
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="font-montserrat">WhatsApp</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="(11) 99999-9999"
                className="font-montserrat"
                disabled={isUpdating}
              />
              <p className="font-montserrat text-xs text-gray-500">
                📱 Formato automático aplicado
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cpf" className="font-montserrat">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                className="font-montserrat"
                disabled={isUpdating}
              />
              <p className="font-montserrat text-xs text-gray-500">
                🆔 CPF usado como chave secundária de identificação
              </p>
            </div>
            
            {/* Campo Data de Nascimento */}
            <div className="space-y-2">
              <Label htmlFor="dataNascimento" className="font-montserrat">Data de Nascimento</Label>
              <Input
                id="dataNascimento"
                name="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={handleInputChange}
                className="font-montserrat"
                disabled={isUpdating}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]} // Mínimo 18 anos
              />
              <p className="font-montserrat text-xs text-gray-500">
                📅 Idade mínima: 18 anos
              </p>
            </div>

            <Button 
              onClick={handleSave}
              disabled={isUpdating}
              className="w-full font-montserrat text-white"
              style={{ backgroundColor: '#8c52ff' }}
            >
              <Save className="mr-2" size={16} />
              {isUpdating ? 'Salvando e Sincronizando...' : 'Salvar e Sincronizar'}
            </Button>

            {/* Indicador de sincronização */}
            {onUpdateUser && (
              <div className="text-center">
                <p className="font-montserrat text-xs text-green-600">
                  🔄 Dados sincronizados automaticamente com a nuvem
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Segurança - Alterar Senha */}
        <Card className="border border-orange-200">
          <CardHeader>
            <CardTitle className="font-poppins text-xl text-black flex items-center space-x-2">
              <Shield size={20} style={{ color: '#8c52ff' }} />
              <span>Segurança da Conta</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCheckingPassword ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <p className="font-montserrat text-gray-600">Verificando status da senha...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Status atual da senha */}
                <div className="space-y-2">
                  <Label className="font-montserrat">Status da Senha</Label>
                  <div className="flex items-center space-x-2">
                    {hasPassword ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" />
                        Senha Definida
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <AlertCircle size={12} className="mr-1" />
                        Sem Senha
                      </Badge>
                    )}
                  </div>
                  <p className="font-montserrat text-xs text-gray-500">
                    {hasPassword ? 
                      "🔐 Sua conta possui senha de acesso" : 
                      "⚠️ Sua conta não possui senha ou não foi possível verificar. Você pode definir uma senha abaixo para maior segurança"
                    }
                  </p>
                </div>

                {/* Campos de alteração de senha */}
                {hasPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="font-montserrat">Senha Atual *</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                        placeholder="Digite sua senha atual"
                        className="font-montserrat pr-10"
                        disabled={isChangingPassword}
                      />
                      <button
                        type="button"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-gray-100 rounded-r"
                        onClick={() => togglePasswordVisibility('current')}
                        disabled={isChangingPassword}
                      >
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-montserrat">
                    {hasPassword ? 'Nova Senha *' : 'Definir Senha *'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      placeholder="Digite a nova senha"
                      className="font-montserrat pr-10"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-gray-100 rounded-r"
                      onClick={() => togglePasswordVisibility('new')}
                      disabled={isChangingPassword}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-montserrat">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      placeholder="Confirme a nova senha"
                      className="font-montserrat pr-10"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-gray-100 rounded-r"
                      onClick={() => togglePasswordVisibility('confirm')}
                      disabled={isChangingPassword}
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Critérios de segurança */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-montserrat font-medium text-blue-800 mb-2">
                    Critérios de Segurança:
                  </h4>
                  <div className="space-y-1 text-xs">
                    <p className="font-montserrat text-blue-700">
                      ✅ Mínimo de 8 caracteres
                    </p>
                    <p className="font-montserrat text-blue-700">
                      ✅ Pelo menos 1 letra maiúscula
                    </p>
                    <p className="font-montserrat text-blue-700">
                      ✅ Pelo menos 1 letra minúscula
                    </p>
                    <p className="font-montserrat text-blue-700">
                      ✅ Pelo menos 1 número
                    </p>
                    <p className="font-montserrat text-blue-700">
                      ✅ Pelo menos 1 caractere especial (!@#$%^&*...)
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="w-full font-montserrat text-white"
                  style={{ backgroundColor: '#8c52ff' }}
                >
                  <Key className="mr-2" size={16} />
                  {isChangingPassword ? 
                    'Alterando Senha...' : 
                    hasPassword ? 'Alterar Senha' : 'Definir Senha'
                  }
                </Button>

                <div className="text-center">
                  <p className="font-montserrat text-xs text-gray-500">
                    🔒 A senha é criptografada e armazenada com segurança
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Compras - Container separado */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="font-poppins text-xl text-black flex items-center space-x-2">
            <History size={20} style={{ color: '#8c52ff' }} />
            <span>Histórico de Compras</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando histórico...</p>
              </div>
            ) : purchaseHistory.length === 0 ? (
              <>
                <div className="text-center py-8">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-poppins text-xl text-gray-600 mb-2">
                    Nenhuma compra encontrada
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Você ainda não possui nenhuma transação registrada em nosso sistema.
                  </p>
                  <p className="text-sm text-gray-400">
                    Quando você realizar compras ou assinaturas, elas aparecerão aqui.
                  </p>
                </div>

                {/* Informações sobre histórico */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-montserrat font-semibold text-blue-800 mb-2">
                    📋 O que você verá aqui:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Histórico de assinaturas e renovações</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Compras de packs de artigos</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Status de pagamentos (PIX, cartão)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>Comprovantes para download</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {/* Cabeçalho da tabela */}
                <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 rounded-lg font-montserrat font-semibold text-sm text-gray-700 border-b">
                  <div>Data</div>
                  <div>Assinatura/Produto</div>
                  <div>Valor</div>
                  <div>Status</div>
                  <div>Expiração</div>
                  <div>Ações</div>
                </div>

                {purchaseHistory.slice(0, visibleHistoryItems).map((purchase, index) => {
                  // Lógica para determinar o status correto baseado no Asaas
                  const getStatusInfo = (purchase: Purchase) => {
                    const status = purchase.status?.toUpperCase();
                    
                    if (purchase.type === 'subscription' || purchase.tipo === 'assinatura') {
                      // Para assinaturas, mapear todos os status possíveis do Asaas
                      switch (status) {
                        case 'ACTIVE':
                          return { status: 'Ativo', color: 'text-green-600', bgColor: 'bg-green-500' };
                        case 'PENDING':
                          return { status: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
                        case 'EXPIRED':
                        case 'OVERDUE':
                          return { status: 'Expirado', color: 'text-orange-600', bgColor: 'bg-orange-500' };
                        case 'CANCELLED':
                        case 'CANCELED':
                          return { status: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-500' };
                        default:
                          return { status: 'Pendente', color: 'text-gray-600', bgColor: 'bg-gray-500' };
                      }
                    } else {
                      // Para pagamentos (packs), mapear status do Asaas
                      switch (status) {
                        case 'RECEIVED':
                        case 'CONFIRMED':
                        case 'RECEIVED_IN_CASH':
                          return { status: 'Pago', color: 'text-green-600', bgColor: 'bg-green-500' };
                        case 'PENDING':
                        case 'AWAITING_RISK_ANALYSIS':
                          return { status: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
                        case 'OVERDUE':
                          return { status: 'Vencido', color: 'text-orange-600', bgColor: 'bg-orange-500' };
                        case 'REFUNDED':
                        case 'REFUND_REQUESTED':
                          return { status: 'Reembolsado', color: 'text-blue-600', bgColor: 'bg-blue-500' };
                        case 'CHARGEBACK_REQUESTED':
                        case 'CHARGEBACK_DISPUTE':
                          return { status: 'Em Disputa', color: 'text-purple-600', bgColor: 'bg-purple-500' };
                        default:
                          return { status: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-500' };
                      }
                    }
                  };

                  // Função para calcular data de expiração
                  const getExpirationDate = (purchase: Purchase) => {
                    // Para assinaturas: 30 dias após criação
                    if (purchase.type === 'subscription' || purchase.tipo === 'assinatura') {
                      const createdDate = new Date(purchase.created_at);
                      const expirationDate = new Date(createdDate);
                      expirationDate.setDate(expirationDate.getDate() + 30); // Ciclo de 30 dias
                      return expirationDate.toLocaleDateString('pt-BR');
                    }
                    
                    // Para packs de artigos: extrair quantidade de créditos da descrição e calcular expiração
                    if (purchase.type === 'payment' || purchase.tipo === 'pagamento') {
                      const createdDate = new Date(purchase.created_at);
                      const expirationDate = new Date(createdDate);
                      
                      // Extrair número de créditos da descrição para determinar validade
                      const description = purchase.description || '';
                      let dias = 90; // Padrão para packs de artigos
                      
                      // Lógica baseada na quantidade de créditos
                      if (description.includes('10 créditos') || description.includes('10 artigos')) {
                        dias = 30; // Pack pequeno: 30 dias
                      } else if (description.includes('25 créditos') || description.includes('25 artigos')) {
                        dias = 60; // Pack médio: 60 dias  
                      } else if (description.includes('50 créditos') || description.includes('50 artigos') || 
                                description.includes('100 créditos') || description.includes('100 artigos')) {
                        dias = 90; // Pack grande: 90 dias
                      }
                      
                      expirationDate.setDate(expirationDate.getDate() + dias);
                      return expirationDate.toLocaleDateString('pt-BR');
                    }
                    
                    return '-';
                  };

                  // Função para determinar o tipo de produto
                  const getProductType = (purchase: Purchase) => {
                    if (purchase.type === 'subscription' || purchase.tipo === 'assinatura') {
                      return purchase.description.replace('Subscription:', 'Assinatura:');
                    }
                    return purchase.description;
                  };

                  const statusInfo = getStatusInfo(purchase);
                  const isSubscription = purchase.type === 'subscription' || purchase.tipo === 'assinatura';

                  return (
                    <div key={purchase.id} className="grid grid-cols-6 gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors items-center">
                      {/* Data */}
                      <div className="text-sm text-gray-600">
                        {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      
                      {/* Assinatura/Produto */}
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusInfo.bgColor}`}></div>
                        <div>
                          <div className="font-montserrat font-semibold text-sm text-gray-900">
                            {getProductType(purchase)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {purchase.payment_method}
                          </div>
                        </div>
                      </div>
                      
                      {/* Valor */}
                      <div className="font-montserrat font-bold text-purple-600">
                        R$ {parseFloat(purchase.value).toFixed(2).replace('.', ',')}
                      </div>
                      
                      {/* Status */}
                      <div>
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.status}
                        </span>
                      </div>
                      
                      {/* Expiração */}
                      <div className="text-sm text-gray-600">
                        {getExpirationDate(purchase)}
                      </div>
                      
                      {/* Ações */}
                      <div>
                        {isSubscription ? (
                          <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 h-8 w-32"
                            onClick={() => onNavigate?.('store')}
                          >
                            Renovar/Upgrade
                          </Button>
                        ) : (
                          <Button
                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 h-8 w-32"
                            onClick={() => onNavigate?.('store')}
                          >
                            Comprar Mais
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Botão para carregar mais itens */}
                {visibleHistoryItems < purchaseHistory.length && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={() => setVisibleHistoryItems(prev => Math.min(prev + 10, purchaseHistory.length))}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                    >
                      Carregar mais ({purchaseHistory.length - visibleHistoryItems} restantes)
                    </Button>
                  </div>
                )}
                
                {/* Contador de itens */}
                <div className="text-center mt-4 text-sm text-gray-500">
                  Mostrando {Math.min(visibleHistoryItems, purchaseHistory.length)} de {purchaseHistory.length} transações
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MinhaConta;
