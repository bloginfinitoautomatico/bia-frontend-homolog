import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle, Mail, Lock, User, UserPlus, Sparkles, Shield, Zap } from './icons';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { registerUser, loginUser, verifyEmail, resendVerificationCode, forgotPassword, resetPassword } from '../services/auth';

export function LoginRegister({ onLogin }) {
  // Estado para controlar as tabs
  const [activeTab, setActiveTab] = useState('login');
  
  // Estados para Login
  const [loginData, setLoginData] = useState({
    email: '',
    senha: ''
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados para Registro
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    cpf: '',
    whatsapp: '',
    dataNascimento: '',
    senha: '',
    confirmSenha: ''
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Estados para verificação de email
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [userPendingVerification, setUserPendingVerification] = useState(null);

  // Estados para reset de senha - modo inline
  const [showResetMode, setShowResetMode] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email', 'code', 'password'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Função para fazer login
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const response = await loginUser({
        email: loginData.email,
        password: loginData.senha
      });

      if (response.success && response.user) {
        // Criar dados do usuário com fallback
        const userData = {
          id: response.user.id || response.user.user_id || response.user.uuid || String(Date.now()),
          email: response.user.email || response.user.usuario_email || response.user.user_email || '',
          name: response.user.name || response.user.nome || response.user.full_name || '',
          cpf: response.user.cpf || response.user.document || undefined,
          whatsapp: response.user.whatsapp || response.user.phone || undefined,
          data_nascimento: response.user.data_nascimento || response.user.dataNascimento || response.user.birthdate || undefined,
          plano: response.user.plano || response.user.plan || response.user.subscription || (String(response.user.email || '').toLowerCase() === 'dev@bia.com' ? 'Custom' : undefined),
          is_admin: Boolean(response.user.is_admin || response.user.admin || String(response.user.email || '').toLowerCase() === 'dev@bia.com'),
          is_developer: Boolean(response.user.is_developer || response.user.developer || String(response.user.email || '').toLowerCase() === 'dev@bia.com'),
          consumo: response.user.consumo || response.user.consumption || { articles: 0, ideas: 0, sites: 0 },
          quotas: response.user.quotas || response.user.quota || undefined,
          createdAt: response.user.createdAt || new Date().toISOString(),
          updatedAt: response.user.updatedAt || new Date().toISOString(),
          _raw: response.user,
        };

        console.log('✅ Login bem-sucedido:', userData);
        console.log('📊 Consumo carregado:', userData.consumo);
        
        onLogin(userData, response.token);
      } else {
        toast.error('Erro ao fazer login: dados inválidos');
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Função para fazer registro
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (registerData.senha !== registerData.confirmSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsRegistering(true);
    
    try {
      const response = await registerUser({
        name: registerData.name,
        email: registerData.email,
        password: registerData.senha,
        password_confirmation: registerData.confirmSenha,
        cpf: registerData.cpf,
        whatsapp: registerData.whatsapp,
        data_nascimento: registerData.dataNascimento
      });

      if (response.success) {
        setUserPendingVerification(response.user);
        setShowEmailVerification(true);
        toast.success('Cadastro realizado! Verifique seu email.');
      }
    } catch (error) {
      console.error('❌ Erro no registro:', error);
      toast.error(error.message || 'Erro ao fazer cadastro');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-50 to-blue-50 rounded-full opacity-30 blur-2xl"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Modo Reset de Senha */}
        {showResetMode ? (
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0 overflow-hidden">
            <CardHeader className="text-center pb-6 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-blue-600/5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowResetMode(false);
                    setResetStep('email');
                    setResetEmail('');
                    setResetCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setResetError('');
                    setResetSuccess('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-2"
                >
                  ← Voltar
                </button>
                <h2 className="text-xl font-bold text-gray-900 flex-1">
                  {resetStep === 'email' && 'Recuperar Senha'}
                  {resetStep === 'code' && 'Verificar Código'}
                  {resetStep === 'password' && 'Nova Senha'}
                </h2>
                <div className="w-16"></div>
              </div>
              
              {/* Indicador de progresso */}
              <div className="flex justify-center mt-4 space-x-2">
                <div className={`w-3 h-3 rounded-full ${resetStep === 'email' ? 'bg-[var(--bia-purple)]' : resetStep === 'code' || resetStep === 'password' ? 'bg-[var(--bia-purple)]' : 'bg-gray-300'}`}></div>
                <div className={`w-3 h-3 rounded-full ${resetStep === 'code' ? 'bg-[var(--bia-purple)]' : resetStep === 'password' ? 'bg-[var(--bia-purple)]' : 'bg-gray-300'}`}></div>
                <div className={`w-3 h-3 rounded-full ${resetStep === 'password' ? 'bg-[var(--bia-purple)]' : 'bg-gray-300'}`}></div>
              </div>
              
              <p className="text-sm text-gray-600 mt-2">
                {resetStep === 'email' && 'Etapa 1/3: Informe seu email'}
                {resetStep === 'code' && 'Etapa 2/3: Digite o código recebido'}
                {resetStep === 'password' && 'Etapa 3/3: Defina sua nova senha'}
              </p>
            </CardHeader>
            
            <CardContent className="p-6">
              {resetStep === 'email' && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsResettingPassword(true);
                  setResetError('');
                  try {
                    const response = await forgotPassword(resetEmail);
                    if (response.success) {
                      setResetSuccess('Código enviado para seu email!');
                      setResetStep('code');
                    }
                  } catch (error) {
                    setResetError(error.message || 'Erro ao enviar código');
                  } finally {
                    setIsResettingPassword(false);
                  }
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Digite seu email"
                      autoFocus
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] text-white font-montserrat font-medium transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02]" disabled={isResettingPassword}>
                    {isResettingPassword ? 'Enviando...' : 'Enviar Código'}
                  </Button>
                </form>
              )}

              {resetStep === 'code' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (resetCode.length >= 4) {
                    setResetStep('password');
                    setResetSuccess('');
                  } else {
                    setResetError('Digite o código válido');
                  }
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Código de Verificação</Label>
                    <Input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Digite o código recebido"
                      autoFocus
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] text-white font-montserrat font-medium transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02]">
                    Verificar Código
                  </Button>
                </form>
              )}

              {resetStep === 'password' && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (newPassword !== confirmNewPassword) {
                    setResetError('As senhas não coincidem');
                    return;
                  }
                  setIsResettingPassword(true);
                  setResetError('');
                  try {
                    const response = await resetPassword({
                      email: resetEmail,
                      code: resetCode,
                      password: newPassword,
                      password_confirmation: confirmNewPassword
                    });
                    
                    if (response.success) {
                      setResetSuccess('Senha alterada com sucesso!');
                      setTimeout(() => {
                        setShowResetMode(false);
                        setResetStep('email');
                        setResetEmail('');
                        setResetCode('');
                        setNewPassword('');
                        setConfirmNewPassword('');
                        setResetError('');
                        setResetSuccess('');
                      }, 2000);
                    }
                  } catch (error) {
                    setResetError(error.message || 'Erro ao alterar senha');
                  } finally {
                    setIsResettingPassword(false);
                  }
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nova Senha</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite sua nova senha"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirme sua nova senha"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      >
                        {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] text-white font-montserrat font-medium transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02]" disabled={isResettingPassword}>
                    {isResettingPassword ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </form>
              )}

              {resetError && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {resetError}
                  </AlertDescription>
                </Alert>
              )}

              {resetSuccess && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    {resetSuccess}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          // Tela principal de Login/Registro
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0 overflow-hidden">
            <CardHeader className="text-center pb-8 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-blue-600/5">
              {/* Logo com efeito hover */}
              <div className="group relative mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 group-hover:scale-105 transition-transform duration-300 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                  <div className="w-24 h-24 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] rounded-full flex items-center justify-center relative z-10">
                    <ImageWithFallback
                      src="/logo-bia.png"
                      alt="BIA Logo"
                      className="w-16 h-16 object-contain filter brightness-0 invert"
                    />
                  </div>
                </div>
              </div>

              <h1 className="font-poppins text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                O Futuro dos Blogs Chegou!
              </h1>
              <p className="text-gray-600 font-montserrat text-sm leading-relaxed">
                Sua plataforma de automação inteligente para criação de conteúdo
              </p>

              {/* Badges de funcionalidades */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <div className="flex items-center gap-1 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full px-3 py-1">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-purple-700">IA Avançada</span>
                </div>
                <div className="flex items-center gap-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full px-3 py-1">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-blue-700">Seguro</span>
                </div>
                <div className="flex items-center gap-1 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-full px-3 py-1">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-medium text-indigo-700">Rápido</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100/50 rounded-2xl p-1 h-12">
                  <TabsTrigger
                    value="login"
                    className="rounded-xl font-montserrat font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-xl font-montserrat font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Cadastrar
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-6 mt-0">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium text-gray-700 font-montserrat">
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat transition-colors duration-200"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-gray-700 font-montserrat">
                        Senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginData.senha}
                          onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                          className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat pr-12 transition-colors duration-200"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        >
                          {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02]"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowResetMode(true)}
                        className="text-sm text-[var(--bia-purple)] hover:text-[var(--bia-purple-dark)] font-montserrat transition-colors duration-200 underline-offset-4 hover:underline"
                      >
                        Esqueci a senha
                      </button>
                    </div>
                  </form>

                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-montserrat">
                      Não tem uma conta?{' '}
                      <button
                        onClick={() => setActiveTab('register')}
                        className="text-[var(--bia-purple)] hover:text-[var(--bia-purple-dark)] font-semibold transition-colors duration-200 underline-offset-4 hover:underline"
                      >
                        Cadastre-se gratuitamente
                      </button>
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="register" className="space-y-6 mt-0">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-name" className="text-sm font-medium text-gray-700 font-montserrat">
                          Nome Completo
                        </Label>
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Seu nome completo"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                          className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat transition-colors duration-200"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-sm font-medium text-gray-700 font-montserrat">
                          Email
                        </Label>
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                          className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat transition-colors duration-200"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-cpf" className="text-sm font-medium text-gray-700 font-montserrat">
                            CPF
                          </Label>
                          <Input
                            id="register-cpf"
                            type="text"
                            placeholder="000.000.000-00"
                            value={registerData.cpf}
                            onChange={(e) => setRegisterData({ ...registerData, cpf: e.target.value })}
                            className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat transition-colors duration-200"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-whatsapp" className="text-sm font-medium text-gray-700 font-montserrat">
                            WhatsApp
                          </Label>
                          <Input
                            id="register-whatsapp"
                            type="tel"
                            placeholder="(11) 99999-9999"
                            value={registerData.whatsapp}
                            onChange={(e) => setRegisterData({ ...registerData, whatsapp: e.target.value })}
                            className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat transition-colors duration-200"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-birth" className="text-sm font-medium text-gray-700 font-montserrat">
                          Data de Nascimento
                        </Label>
                        <Input
                          id="register-birth"
                          type="date"
                          value={registerData.dataNascimento}
                          onChange={(e) => setRegisterData({ ...registerData, dataNascimento: e.target.value })}
                          className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat transition-colors duration-200"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-sm font-medium text-gray-700 font-montserrat">
                          Senha
                        </Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showRegisterPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={registerData.senha}
                            onChange={(e) => setRegisterData({ ...registerData, senha: e.target.value })}
                            className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat pr-12 transition-colors duration-200"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          >
                            {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-confirm-password" className="text-sm font-medium text-gray-700 font-montserrat">
                          Confirmar Senha
                        </Label>
                        <div className="relative">
                          <Input
                            id="register-confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={registerData.confirmSenha}
                            onChange={(e) => setRegisterData({ ...registerData, confirmSenha: e.target.value })}
                            className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat pr-12 transition-colors duration-200"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02] mt-6"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar Conta Gratuita'
                      )}
                    </Button>

                    <div className="text-center">
                      <p className="text-sm text-gray-600 font-montserrat">
                        Já tem uma conta?{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('login')}
                          className="text-[var(--bia-purple)] hover:text-[var(--bia-purple-dark)] font-semibold transition-colors duration-200 underline-offset-4 hover:underline"
                        >
                          Faça login
                        </button>
                      </p>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>

            {/* Footer com informações de segurança */}
            <div className="px-8 pb-6">
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <span>Segurança garantida</span>
                <span>•</span>
                <span>Dados protegidos</span>
                <span>•</span>
                <span>Suporte 24/7</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default LoginRegister;
