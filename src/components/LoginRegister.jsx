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
import { registerUser, loginUser, verifyEmail, resendVerificationCode, forgotPassword } from '../services/auth';
import { consumptionDebug } from '../utils/consumptionDebug';
import { getApiUrl as getApiBaseUrl } from '../config/api';

// Função auxiliar para construir URLs da API
const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}/api${cleanEndpoint}`;
};

export function LoginRegister({ onLogin }) {
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
    confirmarSenha: ''
  });
  
  // Estados para verificação de email
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [registeredUserEmail, setRegisteredUserEmail] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Estados de erro
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [showRestrictedAccess, setShowRestrictedAccess] = useState(false);

  // Função para validar email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Função para validar CPF completo
  const isValidCPF = (cpf) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF[i]) * (10 - i);
    }
    let firstDigit = (sum * 10) % 11;
    if (firstDigit === 10) firstDigit = 0;
    if (firstDigit !== parseInt(cleanCPF[9])) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF[i]) * (11 - i);
    }
    let secondDigit = (sum * 10) % 11;
    if (secondDigit === 10) secondDigit = 0;
    if (secondDigit !== parseInt(cleanCPF[10])) return false;
    
    return true;
  };

  // Função para formatar CPF
  const formatCPF = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Função para formatar data de nascimento
  const formatDate = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 2) return cleanValue;
    if (cleanValue.length <= 4) return cleanValue.replace(/(\d{2})(\d)/, '$1/$2');
    return cleanValue.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3').substring(0, 10);
  };

  // Função para formatar WhatsApp
  const formatWhatsApp = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 2) return cleanValue;
    if (cleanValue.length <= 7) return cleanValue.replace(/(\d{2})(\d)/, '($1) $2');
    if (cleanValue.length <= 11) return cleanValue.replace(/(\d{2})(\d{5})(\d)/, '($1) $2-$3');
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Função para validar data de nascimento
  const isValidDate = (dateString) => {
    if (!dateString || dateString.length !== 10) return false;
    
    const [day, month, year] = dateString.split('/');
    if (!day || !month || !year) return false;
    
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) return false;
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) return false;
    if (yearNum < 1900 || yearNum > new Date().getFullYear() - 13) return false;
    
    // Verificar dias válidos para cada mês
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Ajustar fevereiro para anos bissextos
    if (monthNum === 2) {
      const isLeapYear = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
      daysInMonth[1] = isLeapYear ? 29 : 28;
    }
    
    if (dayNum > daysInMonth[monthNum - 1]) return false;
    
    // Criar data e verificar se é válida
    const date = new Date(yearNum, monthNum - 1, dayNum);
    return date.getDate() === dayNum && date.getMonth() === monthNum - 1 && date.getFullYear() === yearNum;
  };



  // Função para validar campos de registro
  const validateRegisterForm = () => {
    // Validar nome
    if (!registerData.name || !registerData.name.trim()) {
      return 'Nome é obrigatório';
    }
    if (registerData.name.trim().length < 2) {
      return 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar email
    if (!registerData.email || !registerData.email.trim()) {
      return 'Email é obrigatório';
    }
    if (!isValidEmail(registerData.email)) {
      return 'Email inválido. Verifique o formato digitado.';
    }

    // Validar CPF
    if (!registerData.cpf || !registerData.cpf.trim()) {
      return 'CPF é obrigatório';
    }
    if (!isValidCPF(registerData.cpf)) {
      return 'CPF inválido. Verifique os números digitados.';
    }

    // Validar WhatsApp
    if (!registerData.whatsapp || !registerData.whatsapp.trim()) {
      return 'WhatsApp é obrigatório';
    }
    const whatsappNumbers = registerData.whatsapp.replace(/\D/g, '');
    if (whatsappNumbers.length < 10 || whatsappNumbers.length > 11) {
      return 'WhatsApp deve ter 10 ou 11 dígitos (DDD + número)';
    }

    // Validar data de nascimento
    if (!registerData.dataNascimento || !registerData.dataNascimento.trim()) {
      return 'Data de nascimento é obrigatória';
    }
    if (!isValidDate(registerData.dataNascimento)) {
      return 'Data de nascimento inválida ou idade mínima de 13 anos não atingida.';
    }

    // Validar senha
    if (!registerData.senha || registerData.senha.length < 8) {
      return 'Senha deve ter pelo menos 8 caracteres';
    }
    if (registerData.senha.length > 50) {
      return 'Senha deve ter no máximo 50 caracteres';
    }

    // Validar confirmação de senha
    if (!registerData.confirmarSenha) {
      return 'Confirmação de senha é obrigatória';
    }
    if (registerData.senha !== registerData.confirmarSenha) {
      return 'Senhas não coincidem';
    }
    
    return null;
  };

  // Função para fazer login (CONECTADO COM BACKEND REAL)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setShowRestrictedAccess(false);
    
    if (!isValidEmail(loginData.email)) {
      setLoginError('Por favor, digite um email válido');
      return;
    }
    
    if (!loginData.senha.trim()) {
      setLoginError('Por favor, digite sua senha');
      return;
    }

    setIsLoggingIn(true);

    try {
      console.log('🔑 Fazendo login para:', loginData.email);

      // Usar o serviço de autenticação real
      const response = await loginUser({
        email: loginData.email,
        password: loginData.senha
      });

      if (response.success && response.user) {
        // Criar userData com dados reais do backend
        let userData = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          cpf: response.user.cpf || '',
          whatsapp: response.user.whatsapp || '',
          data_nascimento: response.user.data_nascimento || '',
          plano: response.user.plano || 'Free',
          quotas: response.user.quotas || { sites: 1, articles: 5, ideas: 10, isUnlimited: false },
          // Garantir que o consumo venha do backend ou seja zero
          consumo: response.user.consumo || { 
            sites: 0, 
            articles: 0, 
            ideas: 0, 
            last_reset: new Date().toISOString().split('T')[0] 
          },
          is_admin: response.user.is_admin || false,
          is_developer: response.user.is_developer || false,
          createdAt: response.user.createdAt || response.user.created_at || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Debug e validação do consumo
        consumptionDebug.logConsumption(userData, 'LOGIN_BEFORE_FIX');
        
        const validation = consumptionDebug.validateConsumption(userData);
        if (!validation.isValid) {
          console.warn('⚠️ Dados de consumo inconsistentes:', validation.issues);
          userData = consumptionDebug.fixConsumption(userData, userData.createdAt || userData.created_at);
          console.log('✅ Dados de consumo corrigidos');
        }

        consumptionDebug.logConsumption(userData, 'LOGIN_AFTER_FIX');

        // Investigação específica para a usuária Taynara
        if (userData.email === 'taynara.melo.a@agencianovofoco.com.br') {
          console.group('🔍 INVESTIGAÇÃO ESPECÍFICA - TAYNARA');
          console.log('📧 Email:', userData.email);
          console.log('📊 Consumo de artigos no frontend:', userData.consumo.articles);
          console.log('📊 Dados brutos do backend:', response.user);
          console.log('📅 Último reset:', userData.consumo.last_reset);
          console.log('📋 Precisa resetar?', consumptionDebug.shouldResetConsumption(userData.consumo.last_reset, userData.createdAt || userData.created_at));
          
          // Alerta para investigação manual
          if (userData.consumo.articles > 2) {
            console.error('🚨 PROBLEMA DETECTADO: Usuária deveria ter apenas 2 artigos, mas sistema mostra', userData.consumo.articles);
            console.log('💡 Ações recomendadas:');
            console.log('   1. Verificar banco de dados diretamente');
            console.log('   2. Verificar logs de API de geração de artigos');
            console.log('   3. Verificar se há chamadas duplicadas');
            console.log('   4. Considerar reset manual do consumo');
          }
          console.groupEnd();
        }

        // Configuração especial para desenvolvedor
        if (userData.email === 'dev@bia.com') {
          userData.plano = 'Custom';
          userData.is_developer = true;
          userData.is_admin = true;
        }

        // Chamar callback de login
        onLogin(userData);
        
        if (userData.email === 'dev@bia.com') {
          toast.success(`🧑‍💻 Bem-vindo(a), ${userData.name}! Modo Desenvolvedor ativo!`);
        } else {
          toast.success(`🎉 Bem-vindo(a), ${userData.name}! Bora produzir artigos!`);
        }
      } else {
        setLoginError('Email ou senha incorretos');
      }

    } catch (error) {
      console.error('❌ Erro no login:', error);
      
      // Verificar se é erro de email não verificado
      if (error.message && error.message.includes('não verificado')) {
        setLoginError('Email não verificado. Verifique seu email antes de fazer login.');
        setRegisteredUserEmail(loginData.email);
        setShowEmailVerification(true);
      } else {
        setLoginError(error.message || 'Erro interno no login. Tente novamente.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Função para fazer registro (CONECTADO COM BACKEND REAL)
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');

    const validationError = validateRegisterForm();
    if (validationError) {
      setRegisterError(validationError);
      return;
    }

    setIsRegistering(true);

    try {
      console.log('📝 Registrando usuário:', registerData.email);

      // Verificar conectividade básica
      try {
        const connectivityCheck = await fetch(getApiUrl('/auth/register'), {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (connectivityError) {
        throw new Error('Erro de conectividade. Verifique sua conexão com a internet e tente novamente.');
      }


      // Converter DD/MM/AAAA para YYYY-MM-DD de forma mais robusta
      let convertedDate = registerData.dataNascimento?.trim();
      
      if (!convertedDate) {
        throw new Error('Data de nascimento é obrigatória');
      }
      
      // Se está no formato DD/MM/AAAA, converter para YYYY-MM-DD
      if (convertedDate.includes('/') && convertedDate.split('/').length === 3) {
        const [day, month, year] = convertedDate.split('/');
        
        // Validar que são números válidos
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        
        if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
          throw new Error('Data contém valores inválidos');
        }
        
        // Formatar com zero à esquerda
        convertedDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      }
      // Se já está no formato YYYY-MM-DD, manter
      else if (!convertedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error('Formato de data inválido. Use DD/MM/AAAA');
      }
      
      console.log('📅 Data original:', registerData.dataNascimento);
      console.log('📅 Data convertida:', convertedDate);
      console.log('📅 Formato final válido:', /^\d{4}-\d{2}-\d{2}$/.test(convertedDate));

      const payload = {
        name: registerData.name.trim(),
        email: registerData.email.trim(),
        password: registerData.senha,
        password_confirmation: registerData.confirmarSenha,
        cpf: registerData.cpf.replace(/\D/g, ''),
        whatsapp: registerData.whatsapp.replace(/\D/g, ''),
        data_nascimento: convertedDate
      };

      console.log('📤 Payload sendo enviado:', payload);

      // Usar o serviço de registro real
      const response = await registerUser(payload);

      if (response.success && response.user) {
        // Mostrar tela de verificação de email
        setRegisteredUserEmail(response.user.email);
        setShowEmailVerification(true);
        setRegisterError('');
        
        toast.success('Cadastro realizado! Verifique seu email para ativar a conta.');
      } else {
        setRegisterError('Erro no registro. Tente novamente.');
      }

    } catch (error) {
      console.error('❌ Erro no registro:', error);
      console.error('📋 Detalhes do erro:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      
      // Melhorar tratamento de erros para mostrar mensagens mais específicas
      let errorMessage = 'Erro interno no registro. Tente novamente.';
      
      if (error.message) {
        // Verificar se é erro de CPF duplicado
        if (error.message.toLowerCase().includes('cpf') && error.message.toLowerCase().includes('já existe')) {
          errorMessage = 'E-mail ou CPF já cadastrado, faça login!';
        }
        // Verificar se é erro de email duplicado
        else if (error.message.toLowerCase().includes('email') && error.message.toLowerCase().includes('já existe')) {
          errorMessage = 'E-mail ou CPF já cadastrado, faça login!';
        }
        // Verificar se é erro de validação
        else if (error.message.toLowerCase().includes('inválido') || error.message.toLowerCase().includes('dados')) {
          errorMessage = error.message;
        }
        // Verificar se é erro de senha
        else if (error.message.toLowerCase().includes('senha') || error.message.toLowerCase().includes('password')) {
          errorMessage = 'Erro na senha: ' + error.message;
        }
        // Outros erros específicos
        else {
          errorMessage = error.message;
        }
      }
      
      setRegisterError(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  // Função para verificar código de email
  const handleEmailVerification = async (e) => {
    e.preventDefault();
    setVerificationError('');

    if (!emailVerificationCode.trim()) {
      setVerificationError('Código de verificação é obrigatório');
      return;
    }

    setIsVerifyingEmail(true);

    try {
      console.log('📧 Verificando email:', registeredUserEmail, 'com código:', emailVerificationCode);

      // Usar o serviço de verificação real
      const response = await verifyEmail({
        email: registeredUserEmail,
        code: emailVerificationCode
      });

      if (response.success) {
        toast.success('Email verificado com sucesso! Agora você pode fazer login.');
        setShowEmailVerification(false);
        setEmailVerificationCode('');
        setVerificationError('');
        // Voltar para a aba de login
      } else {
        setVerificationError(response.message || 'Código inválido. Verifique o código enviado para seu email.');
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
    try {
      const response = await resendVerificationCode(registeredUserEmail);
      if (response.success) {
        toast.success('Código reenviado! Verifique seu email.');
      }
    } catch (error) {
      toast.error(error.message || 'Erro ao reenviar código. Tente novamente.');
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
                <span className="font-semibold text-[var(--bia-purple)]">{registeredUserEmail}</span>
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
                  className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02]"
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
                  >
                    Reenviar código
                  </button>
                  <br />
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700 font-montserrat text-sm transition-colors duration-200"
                    onClick={() => {
                      setShowEmailVerification(false);
                      setEmailVerificationCode('');
                      setVerificationError('');
                    }}
                  >
                    Voltar ao cadastro
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          // Tela principal de Login/Registro
          <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0 overflow-hidden">
          <CardHeader className="text-center pb-8 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-blue-600/5">
            {/* Logo com efeito hover */}
            <div className="flex justify-center">
              <div className="w-48 h-48 relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                <ImageWithFallback
                  src="https://bloginfinitoautomatico.com.br/wp-content/uploads/2024/10/logo-bia-1.png"
                  alt="BIA - Blog Infinito Automático"
                  className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
            
            {/* Título e subtítulo modernos */}
            <div className="space-y-3">
              <h1 className="font-poppins text-3xl font-semibold text-gray-900 tracking-tight">
                O Futuro dos Blogs Chegou!
              </h1>
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-5 h-5 text-[var(--bia-purple)]" />
                <p className="font-montserrat text-gray-600 font-medium">
                  Gere conteúdo ilimitado com IA
                </p>
                <Sparkles className="w-5 h-5 text-[var(--bia-purple)]" />
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
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 rounded-xl p-1">
                <TabsTrigger 
                  value="login" 
                  className="font-montserrat font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--bia-purple)]"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="font-montserrat font-medium rounded-lg transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--bia-purple)]"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              {/* Aba de Login */}
              <TabsContent value="login" className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="font-montserrat font-medium text-gray-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        required
                        className="font-montserrat pl-11 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl"
                        disabled={isLoggingIn}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-senha" className="font-montserrat font-medium text-gray-700">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="login-senha"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="Sua senha"
                        value={loginData.senha}
                        onChange={(e) => setLoginData(prev => ({ ...prev, senha: e.target.value }))}
                        required
                        className="font-montserrat pl-11 pr-12 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl"
                        disabled={isLoggingIn}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        disabled={isLoggingIn}
                      >
                        {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <div className="text-right mt-2">
                      <button
                        type="button"
                        className="text-sm text-[var(--bia-purple)] hover:text-[var(--bia-purple-dark)] font-montserrat transition-colors duration-200 underline-offset-4 hover:underline"
                        onClick={async () => {
                          if (!loginData.email) {
                            toast.error('Digite seu email primeiro para recuperar a senha');
                            return;
                          }
                          try {
                            const response = await forgotPassword(loginData.email);
                            if (response.success) {
                              toast.success('Instruções enviadas para seu email!');
                            }
                          } catch (error) {
                            toast.error(error.message || 'Erro ao enviar email de recuperação');
                          }
                        }}
                      >
                        Esqueci a senha
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <Alert className="border-red-200 bg-red-50 rounded-xl">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700 font-montserrat">
                        {loginError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02]"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-5 w-5" />
                        Entrar na BIA
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="font-montserrat text-sm text-gray-600">
                    Não tem uma conta?{' '}
                    <button 
                      type="button"
                      className="text-[var(--bia-purple)] hover:text-[var(--bia-purple-dark)] font-semibold transition-colors duration-200 underline-offset-4 hover:underline"
                      onClick={() => {
                        setLoginError('');
                        setShowRestrictedAccess(false);
                      }}
                    >
                      Cadastre-se gratuitamente
                    </button>
                  </p>
                </div>
              </TabsContent>

              {/* Aba de Registro */}
              <TabsContent value="register" className="space-y-5">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="font-montserrat font-medium text-gray-700">
                      Nome Completo
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={registerData.name}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                        required
                        className="font-montserrat pl-11 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl"
                        disabled={isRegistering}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="font-montserrat font-medium text-gray-700">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={registerData.email}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                          onBlur={() => {
                            if (registerData.email && !isValidEmail(registerData.email)) {
                              setRegisterError('Email inválido. Verifique o formato digitado.');
                            } else if (registerError && registerError.includes('Email inválido')) {
                              setRegisterError('');
                            }
                          }}
                          required
                          className={`font-montserrat pl-10 pr-10 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm ${
                            registerData.email && !isValidEmail(registerData.email)
                              ? 'focus:ring-red-200 focus:border-red-500' 
                              : 'focus:ring-[var(--bia-purple)]/20'
                          }`}
                          disabled={isRegistering}
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

                    <div className="space-y-2">
                      <Label htmlFor="register-cpf" className="font-montserrat font-medium text-gray-700">
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
                              setRegisterData(prev => ({ ...prev, cpf: formatted }));
                            }
                          }}
                          onBlur={() => {
                            if (registerData.cpf && !isValidCPF(registerData.cpf)) {
                              setRegisterError('CPF inválido. Verifique os números digitados.');
                            } else if (registerError && registerError.includes('CPF inválido')) {
                              setRegisterError('');
                            }
                          }}
                          required
                          className={`font-montserrat h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm pr-10 ${
                            registerData.cpf && !isValidCPF(registerData.cpf) 
                              ? 'focus:ring-red-200 focus:border-red-500' 
                              : 'focus:ring-[var(--bia-purple)]/20'
                          }`}
                          disabled={isRegistering}
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-whatsapp" className="font-montserrat font-medium text-gray-700">
                        WhatsApp
                      </Label>
                      <Input
                        id="register-whatsapp"
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={registerData.whatsapp}
                        onChange={(e) => {
                          const formatted = formatWhatsApp(e.target.value);
                          if (formatted.replace(/\D/g, '').length <= 11) {
                            setRegisterData(prev => ({ ...prev, whatsapp: formatted }));
                          }
                        }}
                        required
                        className="font-montserrat h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm"
                        disabled={isRegistering}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-birth" className="font-montserrat font-medium text-gray-700">
                        Nascimento
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-birth"
                          type="text"
                          placeholder="DD/MM/AAAA"
                          value={registerData.dataNascimento}
                          onChange={(e) => {
                            const formatted = formatDate(e.target.value);
                            setRegisterData(prev => ({ ...prev, dataNascimento: formatted }));
                          }}
                          onBlur={() => {
                            if (registerData.dataNascimento && !isValidDate(registerData.dataNascimento)) {
                              setRegisterError('Data de nascimento inválida ou idade mínima de 13 anos não atingida.');
                            } else if (registerError && registerError.includes('Data de nascimento inválida')) {
                              setRegisterError('');
                            }
                          }}
                          required
                          className={`font-montserrat h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm pr-10 ${
                            registerData.dataNascimento && !isValidDate(registerData.dataNascimento)
                              ? 'focus:ring-red-200 focus:border-red-500' 
                              : 'focus:ring-[var(--bia-purple)]/20'
                          }`}
                          disabled={isRegistering}
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-senha" className="font-montserrat font-medium text-gray-700">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="register-senha"
                          type={showRegisterPassword ? 'text' : 'password'}
                          placeholder="Mínimo 8 caracteres"
                          value={registerData.senha}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, senha: e.target.value }))}
                          required
                          className="font-montserrat pl-10 pr-10 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm"
                          disabled={isRegistering}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          disabled={isRegistering}
                        >
                          {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {/* Indicador de força da senha */}
                      {registerData.senha && (
                        <div className="space-y-1">
                          <div className="flex space-x-1">
                            <div className={`h-1 w-full rounded ${registerData.senha.length >= 8 ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                            <div className={`h-1 w-full rounded ${registerData.senha.length >= 10 && /[A-Z]/.test(registerData.senha) ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                            <div className={`h-1 w-full rounded ${registerData.senha.length >= 10 && /[0-9]/.test(registerData.senha) && /[A-Z]/.test(registerData.senha) ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                          </div>
                          <p className="text-xs text-gray-500 font-montserrat">
                            {registerData.senha.length < 8 ? 'Mínimo 8 caracteres' : 
                             registerData.senha.length >= 10 && /[A-Z]/.test(registerData.senha) && /[0-9]/.test(registerData.senha) ? 'Senha forte' :
                             registerData.senha.length >= 8 ? 'Senha boa - adicione maiúsculas e números' : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm" className="font-montserrat font-medium text-gray-700">
                        Confirmar Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="register-confirm"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirme sua senha"
                          value={registerData.confirmarSenha}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                          required
                          className="font-montserrat pl-10 pr-12 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm"
                          disabled={isRegistering}
                        />
                        {registerData.confirmarSenha && registerData.senha && (
                          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                            {registerData.senha === registerData.confirmarSenha ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isRegistering}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {/* Indicador de confirmação */}
                      {registerData.confirmarSenha && (
                        <p className={`text-xs font-montserrat ${
                          registerData.senha === registerData.confirmarSenha ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {registerData.senha === registerData.confirmarSenha ? 'Senhas coincidem' : 'Senhas não coincidem'}
                        </p>
                      )}
                    </div>
                  </div>

                  {registerError && (
                    <Alert className="border-red-200 bg-red-50 rounded-xl">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700 font-montserrat">
                        {registerError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full font-montserrat font-medium text-white h-12 bg-gradient-to-r from-[var(--bia-purple)] to-[var(--bia-purple-light)] hover:from-[var(--bia-purple-dark)] hover:to-[var(--bia-purple)] transition-all duration-300 shadow-lg hover:shadow-xl rounded-xl transform hover:scale-[1.02] mt-6"
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Criar Conta Grátis
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="font-montserrat text-sm text-gray-600">
                    Já tem uma conta?{' '}
                    <button 
                      type="button"
                      className="text-[var(--bia-purple)] hover:text-[var(--bia-purple-dark)] font-semibold transition-colors duration-200 underline-offset-4 hover:underline"
                      onClick={() => {
                        setRegisterError('');
                      }}
                    >
                      Faça login aqui
                    </button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )}

        {/* Informação importante - Aparece apenas quando usuário não existe */}
        {showRestrictedAccess && (
          <Card className="mt-6 border-blue-200 bg-blue-50/90 backdrop-blur-sm shadow-lg rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-poppins font-semibold text-blue-800 mb-2">
                    Acesso Restrito
                  </h3>
                  <p className="font-montserrat text-sm text-blue-700 leading-relaxed">
                    O BIA é uma plataforma exclusiva para usuários cadastrados. 
                    É necessário criar uma conta com dados reais para acessar o sistema.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="font-montserrat text-xs text-gray-500">
            © 2024 BIA - Blog Infinito Automático
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>Segurança garantida</span>
            <span>•</span>
            <span>Dados protegidos</span>
            <span>•</span>
            <span>Suporte 24/7</span>
          </div>
        </div>
      </div>
    </div>
  );
}
