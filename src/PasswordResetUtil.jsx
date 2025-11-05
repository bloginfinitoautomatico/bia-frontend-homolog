import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { toast } from 'sonner';

export const PasswordResetUtil = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    
    try {
      // Em ambiente local, simular reset de senha
      console.log('🔄 Simulando reset de senha para:', email);
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setEmail('');
      
    } catch (error) {
      console.error('❌ Erro no reset de senha:', error);
      toast.error('Erro ao enviar email de recuperação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Recuperar Senha</CardTitle>
        <CardDescription>
          Digite seu email para receber um link de recuperação de senha
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <Button 
          onClick={handlePasswordReset}
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? 'Enviando...' : 'Enviar Email de Recuperação'}
        </Button>
      </CardContent>
    </Card>
  );
};

