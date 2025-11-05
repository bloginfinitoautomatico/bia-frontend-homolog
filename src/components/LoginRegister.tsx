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

  // Função para validar CPF
  const isValidCPF = (cpf) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11 && !(/^(\d)\1{10}$/.test(cleanCPF));
  };

  // Função para formatar CPF
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Função para formatar WhatsApp
  const formatWhatsApp = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Função para validar e-mail
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para formatar data
  const formatDate = (value) => {
    const numbers = value.replace(/\D/g, '');
    
    // Permite entrada livre até 8 dígitos
    if (numbers.length >= 8) {
      return numbers.substring(0, 2) + '/' + numbers.substring(2, 4) + '/' + numbers.substring(4, 8);
    } else if (numbers.length >= 4) {
      return numbers.substring(0, 2) + '/' + numbers.substring(2, 4) + '/' + numbers.substring(4);
    } else if (numbers.length >= 2) {
      return numbers.substring(0, 2) + '/' + numbers.substring(2);
    }
    
    return numbers;
  };

  // Função para validar data
  const isValidDate = (dateString) => {
    // Se a data não estiver completa (menos de 10 caracteres), considera válida para permitir digitação
    if (dateString.length < 10) return true;
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return false;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 1 || month > 12) return false;

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;

    // Verificar idade mínima (18 anos)
    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - (month - 1);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 18;
  };

  // Função para validar campos de registro
  const validateRegisterForm = () => {
    if (!registerData.name.trim()) return 'Nome é obrigatório';
    if (!isValidEmail(registerData.email)) return 'Email inválido';
    if (!isValidCPF(registerData.cpf)) return 'CPF inválido';
    if (!registerData.whatsapp.trim()) return 'WhatsApp é obrigatório';
    if (!registerData.dataNascimento) return 'Data de nascimento é obrigatória';
    if (registerData.senha.length < 6) return 'Senha deve ter pelo menos 6 caracteres';
    if (registerData.senha !== registerData.confirmSenha) return 'Senhas não coincidem';
    
    // Validar idade mínima (18 anos)
    const birthDate = new Date(registerData.dataNascimento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) return 'Você deve ter pelo menos 18 anos para se cadastrar';
    
    return null;
  };

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
          id: (response.user as any).id || (response.user as any).user_id || (response.user as any).uuid || String(Date.now()),
          email: (response.user as any).email || (response.user as any).usuario_email || (response.user as any).user_email || '',
          name: (response.user as any).name || (response.user as any).nome || (response.user as any).full_name || '',
          cpf: (response.user as any).cpf || (response.user as any).document || undefined,
          whatsapp: (response.user as any).whatsapp || (response.user as any).phone || undefined,
          data_nascimento: (response.user as any).data_nascimento || (response.user as any).dataNascimento || (response.user as any).birthdate || undefined,
          plano: (response.user as any).plano || (response.user as any).plan || (response.user as any).subscription || (String((response.user as any).email || '').toLowerCase() === 'dev@bia.com' ? 'Custom' : undefined),
          is_admin: Boolean((response.user as any).is_admin || (response.user as any).admin || String((response.user as any).email || '').toLowerCase() === 'dev@bia.com'),
          is_developer: Boolean((response.user as any).is_developer || (response.user as any).developer || String((response.user as any).email || '').toLowerCase() === 'dev@bia.com'),
          consumo: (response.user as any).consumo || (response.user as any).consumption || { articles: 0, ideas: 0, sites: 0 },
          quotas: (response.user as any).quotas || (response.user as any).quota || undefined,
          createdAt: (response.user as any).createdAt || new Date().toISOString(),
          updatedAt: (response.user as any).updatedAt || new Date().toISOString(),
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
    
    const validationError = validateRegisterForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsRegistering(true);
    
    try {
      // Converter data de DD/MM/AAAA para YYYY-MM-DD
      let formattedDate = null;
      if (registerData.dataNascimento) {
        const parts = registerData.dataNascimento.split('/');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const response = await registerUser({
        name: registerData.name.trim(),
        email: registerData.email.trim(),
        password: registerData.senha,
        password_confirmation: registerData.confirmSenha,
        cpf: registerData.cpf.replace(/\D/g, ''),
        whatsapp: registerData.whatsapp.replace(/\D/g, ''),
        data_nascimento: formattedDate
      });

      if (response.success) {
        setUserPendingVerification(response.user as any);
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

  // Função para verificar código de e-mail
  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setVerificationError('');

    if (!emailVerificationCode.trim()) {
      setVerificationError('Código de verificação é obrigatório');
      return;
    }

    setIsVerifyingEmail(true);

    try {
      const response = await verifyEmail({
        email: (userPendingVerification as any)?.email || registerData.email,
        code: emailVerificationCode
      });

      if (response.success) {
        toast.success('Email verificado com sucesso! Agora você pode fazer login.');
        setShowEmailVerification(false);
        setEmailVerificationCode('');
        setVerificationError('');
        setUserPendingVerification(null);
        // Voltar para a aba de login
        setActiveTab('login');
      }
    } catch (error) {
      console.error('❌ Erro na verificação:', error);
      setVerificationError(error.message || 'Código inválido. Verifique o código enviado para seu email.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // Função para reenviar código de verificação
  const handleResendCode = async () => {
    setIsResendingCode(true);
    try {
      const response = await resendVerificationCode((userPendingVerification as any)?.email || registerData.email);
      if (response.success) {
        toast.success('Código reenviado! Verifique seu email.');
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao reenviar código. Tente novamente.');
    } finally {
      setIsResendingCode(false);
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
        {/* Tela de Verificação de Email */}
        {showEmailVerification ? (
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0 overflow-hidden">
            <CardHeader className="text-center pb-6 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-blue-600/5">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] rounded-full flex items-center justify-center">
                  <Mail className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="font-poppins text-2xl font-semibold text-gray-900 tracking-tight">
                Verifique seu Email
              </h1>
              <p className="font-montserrat text-gray-600 mt-2">
                Enviamos um código de verificação para<br />
                <span className="font-semibold text-[var(--bia-purple)]">{(userPendingVerification as any)?.email || registerData.email}</span>
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleEmailVerification} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="verification-code" className="font-montserrat font-medium text-gray-700">
                    Código de Verificação
                  </Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="Digite o código de 6 dígitos"
                    value={emailVerificationCode}
                    onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    required
                    className="font-montserrat h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-center text-lg tracking-widest"
                    disabled={isVerifyingEmail}
                    maxLength={6}
                  />
                </div>

                {verificationError && (
                  <Alert className="border-red-200 bg-red-50 rounded-xl">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700 font-montserrat">
                      {verificationError}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
                  disabled={isVerifyingEmail || emailVerificationCode.length !== 6}
                >
                  {isVerifyingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Verificar Email
                    </>
                  )}
                </Button>

                <div className="text-center pt-4 border-t border-gray-100 space-y-3">
                  <p className="font-montserrat text-sm text-gray-600">
                    Não recebeu o código?
                  </p>
                  <button
                    type="button"
                    className="text-[var(--bia-purple)] hover:text-[var(--bia-purple-dark)] font-montserrat font-semibold transition-colors duration-200 underline-offset-4 hover:underline"
                    onClick={handleResendCode}
                    disabled={isResendingCode}
                  >
                    {isResendingCode ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                  <br />
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700 font-montserrat text-sm transition-colors duration-200"
                    onClick={() => {
                      setShowEmailVerification(false);
                      setEmailVerificationCode('');
                      setVerificationError('');
                      setUserPendingVerification(null);
                    }}
                  >
                    Voltar ao cadastro
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : showResetMode ? (
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
              <div className="flex justify-center -mb-20">
                <div className="w-64 h-64 relative group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                  <ImageWithFallback
                    src="https://bloginfinitoautomatico.com.br/wp-content/uploads/2024/10/logo-bia-1.png"
                    alt="BIA - Blog Infinito Automático"
                    className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>

              <h1 className="font-poppins text-2xl font-semibold text-gray-900 tracking-tight">
                O Futuro dos Blogs Chegou!
              </h1>
              <div className="flex items-center justify-center space-x-2">
                <p className="font-montserrat text-gray-600 font-medium">
                  Automatize seu blog agora mesmo!
                </p>
              </div>
              {/* Terceiro título */}
              <div className="pt-2">
                <h2 className="font-poppins text-xl font-semibold text-[var(--bia-purple)]">
                  COMECE GRÁTIS!
                </h2>
              </div>

              {/* Features em destaque */}
              <div className="flex items-center justify-center space-x-6 pt-2">
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="font-montserrat">Seguro</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-montserrat">Rápido</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-montserrat">Inteligente</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 rounded-xl p-1">
                  <TabsTrigger
                    value="login"
                    className="font-montserrat font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--bia-purple)]"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="font-montserrat font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--bia-purple)]"
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
                      <div className="relative">
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat pr-10 transition-colors duration-200"
                          required
                        />
                        {loginData.email && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {isValidEmail(loginData.email) ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
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
                      className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Entrar na BIA
                        </>
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
                        <div className="relative">
                          <Input
                            id="register-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat pr-10 transition-colors duration-200"
                            required
                          />
                          {registerData.email && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {isValidEmail(registerData.email) ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="register-cpf" className="text-sm font-medium text-gray-700 font-montserrat">
                            CPF
                          </Label>
                          <div className="relative">
                            <Input
                              id="register-cpf"
                              type="text"
                              placeholder="000.000.000-00"
                              value={registerData.cpf}
                              onChange={(e) => {
                                const formatted = formatCPF(e.target.value);
                                if (formatted.replace(/\D/g, '').length <= 11) {
                                  setRegisterData({ ...registerData, cpf: formatted });
                                }
                              }}
                              className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat pr-10 transition-colors duration-200"
                              required
                            />
                            {registerData.cpf && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {isValidCPF(registerData.cpf) ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                              </div>
                            )}
                          </div>
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
                            onChange={(e) => {
                              const formatted = formatWhatsApp(e.target.value);
                              if (formatted.replace(/\D/g, '').length <= 11) {
                                setRegisterData({ ...registerData, whatsapp: formatted });
                              }
                            }}
                            className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat transition-colors duration-200"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-birth" className="text-sm font-medium text-gray-700 font-montserrat">
                          Data de Nascimento
                        </Label>
                        <div className="relative">
                          <Input
                            id="register-birth"
                            type="text"
                            placeholder="DD/MM/AAAA"
                            value={registerData.dataNascimento}
                            onChange={(e) => {
                              const formatted = formatDate(e.target.value);
                              setRegisterData({ ...registerData, dataNascimento: formatted });
                            }}
                            className="h-12 rounded-xl border-gray-200 focus:border-[var(--bia-purple)] focus:ring-[var(--bia-purple)] font-montserrat pr-10 transition-colors duration-200"
                            required
                          />
                          {registerData.dataNascimento && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {isValidDate(registerData.dataNascimento) ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
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
                      className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl mt-6"
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Criar Conta Grátis
                        </>
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

            {/* Footer */}
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
