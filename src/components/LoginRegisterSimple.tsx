import React, { useState, useRef, FormEvent } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { loginUser, registerUser, forgotPassword, resetPassword } from '../services/auth';
import { Clock, Mail, EyeOff, Eye, AlertCircle, Edit3, Calendar, CreditCard, Globe } from './icons';

// Create authService object to match the expected interface
const authService = {
  login: async (email: string, password: string) => {
    return await loginUser({ email, password });
  },
  register: async (name: string, email: string, password: string, company?: string) => {
    return await registerUser({ 
      name, 
      email, 
      password, 
      password_confirmation: password,
      cpf: '',
      whatsapp: '',
      data_nascimento: ''
    });
  },
  forgotPassword: async (email: string) => {
    return await forgotPassword(email);
  },
  verifyResetCode: async (email: string, code: string) => {
    return { success: true };
  },
  resetPassword: async (email: string, code: string, newPassword: string) => {
    return await resetPassword({ 
      email, 
      token: code, 
      password: newPassword,
      password_confirmation: newPassword 
    });
  }
};

// Password strength functions
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
  return strength;
};

const getPasswordStrengthText = (strength: number): string => {
  switch (strength) {
    case 0:
    case 1:
      return 'Muito fraca';
    case 2:
      return 'Fraca';
    case 3:
      return 'Média';
    case 4:
      return 'Forte';
    case 5:
      return 'Muito forte';
    default:
      return '';
  }
};

const getPasswordStrengthColor = (strength: number): string => {
  switch (strength) {
    case 0:
    case 1:
      return 'text-red-500';
    case 2:
      return 'text-orange-500';
    case 3:
      return 'text-yellow-500';
    case 4:
      return 'text-green-500';
    case 5:
      return 'text-emerald-500';
    default:
      return '';
  }
};

interface LoginRegisterProps {
  onLogin?: (userData: any) => void;
}

export function LoginRegister({ onLogin }: LoginRegisterProps) {
  const [currentModal, setCurrentModal] = useState<'login' | 'forgotPassword' | 'verifyCode' | 'resetPassword' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Plan benefits data
  const planBenefits = [
    { icon: Globe, text: "1 site conectado", color: "text-blue-500" },
    { icon: Edit3, text: "10 ideias por mês", color: "text-green-500" },
    { icon: Calendar, text: "5 artigos por mês", color: "text-purple-500" },
    { icon: CreditCard, text: "Sem necessidade de cartão", color: "text-gray-500" }
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const userData = await authService.login(email, password);
      setSuccess('Login realizado com sucesso!');
      onLogin?.(userData);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (registerPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.register(name, registerEmail, registerPassword, company || undefined);
      setSuccess('Cadastro realizado! Verifique seu email para confirmar a conta.');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      await authService.forgotPassword(forgotEmail);
      setSuccess('Código de recuperação enviado para seu email!');
      setCurrentModal('verifyCode');
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      await authService.verifyResetCode(forgotEmail, resetCode);
      setSuccess('Código verificado! Agora defina sua nova senha.');
      setCurrentModal('resetPassword');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (newPassword !== confirmResetPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.resetPassword(forgotEmail, resetCode, newPassword);
      setSuccess('Senha alterada com sucesso! Você já pode fazer login.');
      setCurrentModal(null);
      setForgotEmail('');
      setResetCode('');
      setNewPassword('');
      setConfirmResetPassword('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setCurrentModal(null);
    setError('');
    setSuccess('');
    setForgotEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmResetPassword('');
    setShowNewPassword(false);
    setShowConfirmResetPassword(false);
  };

  const passwordStrength = calculatePasswordStrength(registerPassword);

  if (currentModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Button
                onClick={resetModal}
                className="p-0 h-8 w-8 hover:bg-gray-100 border-0 bg-transparent"
              >
                ←
              </Button>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentModal === 'forgotPassword' && 'Recuperar Senha'}
                {currentModal === 'verifyCode' && 'Verificar Código'}
                {currentModal === 'resetPassword' && 'Nova Senha'}
              </h2>
            </div>

            {currentModal === 'forgotPassword' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Digite seu email"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar Código'}
                </Button>
              </form>
            )}

            {currentModal === 'verifyCode' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <Label htmlFor="reset-code">Código de Verificação</Label>
                  <Input
                    ref={codeInputRef}
                    id="reset-code"
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Digite o código recebido por email"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verificando...' : 'Verificar Código'}
                </Button>
              </form>
            )}

            {currentModal === 'resetPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite sua nova senha"
                      required
                    />
                    <Button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent border-0 bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showConfirmResetPassword ? 'text' : 'password'}
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                      required
                    />
                    <Button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent border-0 bg-transparent"
                      onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                    >
                      {showConfirmResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Desktop Benefits Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:items-center lg:bg-gradient-to-br lg:from-purple-600 lg:to-blue-600 lg:p-8">
          <div className="text-center text-white space-y-8 max-w-md">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold">Bem-vindo à BIA</h1>
              <p className="text-xl opacity-90">
                Inteligência Artificial para seu negócio
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="text-center">
                <Badge className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                  Começar Grátis
                </Badge>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">O que você ganha:</h3>
                <div className="space-y-3">
                  {planBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3 text-left">
                      <benefit.icon className="h-5 w-5 text-white" />
                      <span className="text-white">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col justify-center items-center p-4 lg:p-8">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-6">
              {/* Mobile Benefits Section */}
              <div className="lg:hidden mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo à BIA</h1>
                <p className="text-gray-600 mb-4">Inteligência Artificial para seu negócio</p>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg">
                  <Badge className="mb-3 bg-purple-100 text-purple-700">
                    Começar Grátis
                  </Badge>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {planBenefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <benefit.icon className={`h-4 w-4 ${benefit.color}`} />
                        <span className="text-gray-700">{benefit.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Sua senha"
                          required
                        />
                        <Button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent border-0 bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        className="p-0 h-auto font-normal text-sm underline border-0 bg-transparent text-blue-600 hover:bg-transparent"
                        onClick={() => setCurrentModal('forgotPassword')}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Empresa (opcional)</Label>
                      <Input
                        id="company"
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Nome da sua empresa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showRegisterPassword ? 'text' : 'password'}
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="Sua senha"
                          required
                        />
                        <Button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent border-0 bg-transparent"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        >
                          {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {registerPassword && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-600">
                            Força da senha: <span className={`font-medium ${getPasswordStrengthColor(passwordStrength)}`}>
                              {getPasswordStrengthText(passwordStrength)}
                            </span>
                          </div>
                          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                passwordStrength <= 1 ? 'bg-red-500' :
                                passwordStrength === 2 ? 'bg-orange-500' :
                                passwordStrength === 3 ? 'bg-yellow-500' :
                                passwordStrength === 4 ? 'bg-green-500' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${(passwordStrength / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Confirmar Senha</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirme sua senha"
                          required
                        />
                        <Button
                          type="button"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent border-0 bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Cadastrando...' : 'Começar Grátis'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                  <Mail className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700">{success}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LoginRegister;
