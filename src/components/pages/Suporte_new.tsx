import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Mail, MessageSquare, CheckCircle, Send, HelpCircle } from '../icons';

interface SuporteProps {
  userData: any;
}

const Suporte: React.FC<SuporteProps> = ({ userData }) => {
  const [formData, setFormData] = useState({
    nome: userData?.name || '',
    email: userData?.email || '',
    assunto: '',
    mensagem: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assunto || !formData.mensagem) {
      toast.error('Por favor, preencha o assunto e a mensagem');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular envio (em produção, conectar com backend)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Mensagem enviada com sucesso! Nossa equipe responderá em breve.');
      
      // Limpar formulário
      setFormData({
        nome: userData?.name || '',
        email: userData?.email || '',
        assunto: '',
        mensagem: ''
      });
      
    } catch (error) {
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
            <HelpCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Central de Suporte
          </h1>
        </div>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Precisa de ajuda? Entre em contato conosco e nossa equipe responderá o mais rápido possível.
        </p>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-2">
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900">E-mail</h3>
            <p className="text-sm text-gray-600 mt-1">bia@bloginfinitoautomatico.com</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-2">
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Resposta</h3>
            <p className="text-sm text-gray-600 mt-1">Em até 24 horas</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Suporte</h3>
            <p className="text-sm text-gray-600 mt-1">Segunda a Sexta</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Contato */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-purple-600" />
            Enviar Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="assunto" className="block text-sm font-medium text-gray-700 mb-2">
                Assunto
              </label>
              <Input
                id="assunto"
                name="assunto"
                value={formData.assunto}
                onChange={handleInputChange}
                placeholder="Descreva brevemente sua dúvida ou problema"
                required
              />
            </div>

            <div>
              <label htmlFor="mensagem" className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem
              </label>
              <Textarea
                id="mensagem"
                name="mensagem"
                value={formData.mensagem}
                onChange={handleInputChange}
                placeholder="Descreva detalhadamente sua dúvida, problema ou sugestão..."
                rows={6}
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FAQ Rápido */}
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-gray-900">Como funciona a geração de artigos?</h4>
              <p className="text-gray-600 mt-1">
                Nossa IA utiliza o ChatGPT e DALL-E para criar artigos completos com texto e imagens otimizadas para SEO.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900">Posso cancelar minha assinatura?</h4>
              <p className="text-gray-600 mt-1">
                Sim, você pode cancelar a qualquer momento através da sua conta. O acesso continua até o final do período pago.
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-900">Os artigos são únicos?</h4>
              <p className="text-gray-600 mt-1">
                Sim! Cada artigo é gerado especificamente para seu nicho e palavras-chave, sendo 100% único e original.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Suporte;
