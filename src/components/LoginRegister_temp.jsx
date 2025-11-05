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
import { registerUser, loginUser } from '../services/auth';

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

  // Função para validar campos de registro
  const validateRegisterForm = () => {
    if (!registerData.name.trim()) return 'Nome é obrigatório';
    if (!isValidEmail(registerData.email)) return 'Email inválido';
    if (!isValidCPF(registerData.cpf)) return 'CPF inválido';
    if (!registerData.whatsapp.trim()) return 'WhatsApp é obrigatório';
    if (!registerData.dataNascimento) return 'Data de nascimento é obrigatória';
    if (registerData.senha.length < 6) return 'Senha deve ter pelo menos 6 caracteres';
    if (registerData.senha !== registerData.confirmarSenha) return 'Senhas não coincidem';
    
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
        const userData = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          cpf: response.user.cpf || '',
          whatsapp: response.user.whatsapp || '',
          data_nascimento: response.user.data_nascimento || '',
          plano: response.user.plano || 'Free',
          quotas: response.user.quotas || { sites: 1, articles: 5, ideas: 10, isUnlimited: false },
          consumo: response.user.consumo || { sites: 0, articles: 0, ideas: 0, last_reset: new Date().toISOString().split('T')[0] },
          is_admin: response.user.is_admin || false,
          is_developer: response.user.is_developer || false,
          createdAt: response.user.createdAt || response.user.created_at || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Configuração especial para desenvolvedor
        if (userData.email === 'dev@bia.com') {
          userData.plano = 'Custom';
          userData.is_developer = true;
          userData.is_admin = true;
        }

        // Chamar callback de login
        onLogin(userData);
        
        if (userData.email === 'dev@bia.com') {
          toast.success('🧑‍💻 Login dev realizado com sucesso!');
        } else {
          toast.success(`Bem-vindo, ${userData.name}!`);
        }
      } else {
        setLoginError('Email ou senha incorretos');
      }

    } catch (error) {
      console.error('❌ Erro no login:', error);
      setLoginError(error.message || 'Erro interno no login. Tente novamente.');
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

      // Usar o serviço de registro real
      const response = await registerUser({
        name: registerData.name.trim(),
        email: registerData.email.trim(),
        password: registerData.senha,
        password_confirmation: registerData.confirmarSenha,
        cpf: registerData.cpf.replace(/\D/g, ''),
        whatsapp: registerData.whatsapp.replace(/\D/g, ''),
        data_nascimento: registerData.dataNascimento
      });

      if (response.success && response.user) {
        // Criar userData com dados reais do backend
        const userData = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          cpf: response.user.cpf || '',
          whatsapp: response.user.whatsapp || '',
          data_nascimento: response.user.data_nascimento || '',
          plano: response.user.plano || 'Free',
          quotas: response.user.quotas || { sites: 1, articles: 5, ideas: 10, isUnlimited: false },
          consumo: response.user.consumo || { sites: 0, articles: 0, ideas: 0, last_reset: new Date().toISOString().split('T')[0] },
          is_admin: response.user.is_admin || false,
          is_developer: response.user.is_developer || false,
          createdAt: response.user.createdAt || response.user.created_at || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Chamar callback de login (registro bem-sucedido = login automático)
        onLogin(userData);
        
        toast.success('Cadastro realizado com sucesso! Bem-vindo ao BIA!');
      } else {
        setRegisterError('Erro no registro. Tente novamente.');
      }

    } catch (error) {
      console.error('❌ Erro no registro:', error);
      setRegisterError(error.message || 'Erro interno no registro. Tente novamente.');
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
        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0 overflow-hidden">
          <CardHeader className="text-center pb-8 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-blue-600/5">
            {/* Logo com efeito hover */}
            <div className="flex justify-center">
              <div className="w-48 h-48 relative group cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"></div>
                <ImageWithFallback
                  src="https://app.bloginfinitoautomatico.com.br/wp-content/uploads/2025/07/logo-bia-7.png"
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
                  Crie artigos de blog otimizados para SEO em apenas alguns cliques
                </p>
                <Sparkles className="w-5 h-5 text-[var(--bia-purple)]" />
              </div>
              
              {/* Terceiro título */}
              <div className="pt-2">
                <h2 className="font-poppins text-xl font-semibold text-[var(--bia-purple)]">
                  Comece Grátis!
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
                          required
                          className="font-montserrat pl-10 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm"
                          disabled={isRegistering}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-cpf" className="font-montserrat font-medium text-gray-700">
                        CPF
                      </Label>
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
                        required
                        className="font-montserrat h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm"
                        disabled={isRegistering}
                      />
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
                      <Input
                        id="register-birth"
                        type="date"
                        value={registerData.dataNascimento}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, dataNascimento: e.target.value }))}
                        required
                        className="font-montserrat h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm"
                        disabled={isRegistering}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                      />
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
                          placeholder="Mínimo 6 caracteres"
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
                          className="font-montserrat pl-10 pr-10 h-12 bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-[var(--bia-purple)]/20 focus:border-[var(--bia-purple)] transition-all duration-200 rounded-xl text-sm"
                          disabled={isRegistering}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isRegistering}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
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
