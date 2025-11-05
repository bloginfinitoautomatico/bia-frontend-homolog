import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Activity, Settings, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { OpenAIDiagnostic } from '../../OpenAIDiagnostic';
import { contentService } from '../../../services/contentService';

export const OpenAISystemStatus: React.FC = () => {
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const testOpenAIKey = async () => {
    setIsTestingKey(true);
    try {
      const result = await contentService.testConnection();
      setLastTestResult(result);
    } catch (error) {
      setLastTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const refreshApiKey = async () => {
    setIsTestingKey(true);
    try {
      // Sistema unificado não precisa de refresh
      const result = await contentService.testConnection();
      setLastTestResult(result);
    } catch (error) {
      setLastTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-poppins flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status OpenAI
            </CardTitle>
            <CardDescription className="font-montserrat">
              Monitor do sistema de IA e chave API OpenAI
            </CardDescription>
          </div>
          <Dialog open={showDiagnostic} onOpenChange={setShowDiagnostic}>
              <DialogTrigger asChild>
              <Button className="px-2 py-1 border bg-[#8B5FBF] text-white border-[#8B5FBF] hover:bg-[#7A4F9A] focus:ring-2 focus:ring-[#8B5FBF] focus:ring-opacity-50">
                <Settings className="h-4 w-4 mr-2" />
                Diagnóstico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Diagnóstico Completo do Sistema</DialogTitle>
              </DialogHeader>
              <OpenAIDiagnostic onClose={() => setShowDiagnostic(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status atual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="font-montserrat font-medium text-gray-700">
              Status da Chave API
            </label>
            {lastTestResult ? (
              <div className="flex items-center gap-2">
                {lastTestResult.success ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge className="bg-green-100 text-green-800">Funcionando</Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <Badge className="bg-red-100 text-red-800">Com Problemas</Badge>
                  </>
                )}
              </div>
            ) : (
              <Badge className="bg-gray-100 text-gray-800">Não testado</Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="font-montserrat font-medium text-gray-700">
              Modelo Ativo
            </label>
            <div className="font-montserrat text-sm text-gray-600">
              GPT-4o Mini (Otimizado)
            </div>
          </div>
        </div>

        {/* Resultado do último teste */}
        {lastTestResult && (
          <Alert className={lastTestResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {lastTestResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription className={`font-montserrat ${lastTestResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {lastTestResult.success ? 'API OpenAI funcionando corretamente!' : 'Problema detectado:'} {lastTestResult.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={testOpenAIKey}
            disabled={isTestingKey}
            className="font-montserrat px-2 py-1 border bg-[#8B5FBF] text-white border-[#8B5FBF] hover:bg-[#7A4F9A] focus:ring-2 focus:ring-[#8B5FBF] focus:ring-opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isTestingKey ? 'animate-spin' : ''}`} />
            Testar Chave
          </Button>
          
          <Button 
            onClick={refreshApiKey}
            disabled={isTestingKey}
            className="font-montserrat px-2 py-1 border bg-[#8B5FBF] text-white border-[#8B5FBF] hover:bg-[#7A4F9A] focus:ring-2 focus:ring-[#8B5FBF] focus:ring-opacity-50"
          >
            <Activity className={`h-4 w-4 mr-2 ${isTestingKey ? 'animate-spin' : ''}`} />
            Recarregar Chave
          </Button>

          <Button 
            onClick={() => setShowDiagnostic(true)}
            className="font-montserrat px-2 py-1 bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            Diagnóstico Completo
          </Button>
        </div>

        {/* Instruções de configuração */}
        {lastTestResult && !lastTestResult.success && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-poppins font-medium text-blue-900 mb-2">
              Como configurar a chave OpenAI:
            </h4>
            <ol className="font-montserrat text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Acesse o arquivo .env do backend Laravel</li>
              <li>Adicione ou atualize a variável: <code className="bg-blue-100 px-1 rounded">OPENAI_API_KEY=sua_chave_aqui</code></li>
              <li>Cole sua chave OpenAI (deve começar com 'sk-')</li>
              <li>Reinicie o servidor Laravel</li>
              <li>Execute o diagnóstico novamente</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};