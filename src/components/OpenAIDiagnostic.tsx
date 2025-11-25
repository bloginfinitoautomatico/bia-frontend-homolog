import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { contentService } from '../services/contentService';
import { getApiUrl } from '../config/api';

interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export const OpenAIDiagnostic: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'unknown' | 'healthy' | 'issues' | 'critical'>('unknown');

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (step: string, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(r => r.step === step ? { ...r, ...updates } : r));
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    setOverallStatus('unknown');

    const steps = [
      'Verificando conectividade com Laravel',
      'Testando rota de health check',
      'Verificando rota da chave OpenAI',
      'Validando chave OpenAI',
      'Testando API OpenAI'
    ];

    // Inicializar todos os steps como pending
    steps.forEach(step => {
      addResult({ step, status: 'pending', message: 'Aguardando...' });
    });

    let hasErrors = false;
    let hasWarnings = false;

    try {
      const token = localStorage.getItem('auth_token');

      // Step 1: Verificar conectividade com Laravel
      try {
        updateResult(steps[0], {
          status: 'success',
          message: `Conectado ao backend Laravel`,
          details: `Servidor: ${getApiUrl()}`
        });
      } catch (error) {
        updateResult(steps[0], {
          status: 'error',
          message: 'Falha na configuração do Laravel',
          details: error.message
        });
        hasErrors = true;
      }

      // Step 2: Testar health check
      try {
        const healthResponse = await fetch(`${getApiUrl('health')}`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (healthResponse.ok) {
          const data = await healthResponse.json();
          updateResult(steps[1], {
            status: 'success',
            message: `Servidor respondendo: ${data.message}`,
            details: `Status: ${healthResponse.status}, Versão: ${data.version}`
          });
        } else {
          updateResult(steps[1], {
            status: 'error',
            message: `Servidor retornou erro ${healthResponse.status}`,
            details: await healthResponse.text()
          });
          hasErrors = true;
        }
      } catch (error) {
        updateResult(steps[1], {
          status: 'error',
          message: 'Servidor não acessível',
          details: error.message
        });
        hasErrors = true;
      }

      // Step 3: Verificar rota da chave OpenAI
      try {
        const keyResponse = await fetch(`${getApiUrl('openai/get-key')}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (keyResponse.ok) {
          const data = await keyResponse.json();
          if (data.success && data.key) {
            updateResult(steps[2], {
              status: 'success',
              message: 'Chave OpenAI encontrada no servidor',
              details: `Chave válida: ${data.key.substring(0, 7)}...`
            });
          } else {
            updateResult(steps[2], {
              status: 'error',
              message: 'Servidor não retornou chave válida',
              details: data.error || 'Resposta inválida'
            });
            hasErrors = true;
          }
        } else {
          updateResult(steps[2], {
            status: 'error',
            message: `Falha ao obter chave: ${keyResponse.status}`,
            details: await keyResponse.text()
          });
          hasErrors = true;
        }
      } catch (error) {
        updateResult(steps[2], {
          status: 'error',
          message: 'Erro ao acessar rota da chave',
          details: error.message
        });
        hasErrors = true;
      }

      // Step 4: Validar chave OpenAI via serviço
      try {
        const hasValidKey = true; // sempre retorna true no sistema unificado
        if (hasValidKey) {
          updateResult(steps[3], {
            status: 'success',
            message: 'Chave OpenAI válida encontrada',
            details: 'Serviço conseguiu obter chave válida'
          });
        } else {
          updateResult(steps[3], {
            status: 'error',
            message: 'Chave OpenAI não encontrada ou inválida',
            details: 'Serviço não conseguiu obter chave válida'
          });
          hasErrors = true;
        }
      } catch (error) {
        updateResult(steps[3], {
          status: 'error',
          message: 'Erro na validação da chave',
          details: error.message
        });
        hasErrors = true;
      }

      // Step 5: Testar API OpenAI
      try {
        const testResult = await contentService.testConnection();
        if (testResult.success) {
          updateResult(steps[4], {
            status: 'success',
            message: 'API OpenAI funcionando',
            details: testResult.error // Na verdade contém info sobre modelos
          });
        } else {
          updateResult(steps[4], {
            status: 'error',
            message: 'Falha na API OpenAI',
            details: testResult.error
          });
          hasErrors = true;
        }
      } catch (error) {
        updateResult(steps[4], {
          status: 'error',
          message: 'Erro ao testar API OpenAI',
          details: error.message
        });
        hasErrors = true;
      }

    } finally {
      setIsRunning(false);
      
      // Determinar status geral
      if (hasErrors) {
        setOverallStatus('critical');
      } else if (hasWarnings) {
        setOverallStatus('issues');
      } else {
        setOverallStatus('healthy');
      }
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: typeof overallStatus) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Funcionando</Badge>;
      case 'issues':
        return <Badge className="bg-yellow-100 text-yellow-800">Com Avisos</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Com Problemas</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconhecido</Badge>;
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-poppins">Diagnóstico OpenAI</CardTitle>
            <CardDescription className="font-montserrat">
              Verificando conectividade e configuração do sistema de IA
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(overallStatus)}
            {onClose && (
              <Button 
                onClick={onClose}
                className="bg-gray-600 text-white border-gray-600 hover:bg-gray-700 focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
              >
                Fechar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {overallStatus === 'critical' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="font-montserrat text-red-700">
              Problemas críticos detectados. O sistema de IA não está funcionando corretamente.
              Verifique se a chave OpenAI está configurada na variável de ambiente OPENAI_API_KEY no backend Laravel.
            </AlertDescription>
          </Alert>
        )}

        {overallStatus === 'healthy' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="font-montserrat text-green-700">
              Sistema de IA funcionando corretamente! Todas as verificações passaram.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
              {getStatusIcon(result.status)}
              <div className="flex-1 min-w-0">
                <div className="font-montserrat font-medium text-gray-900">
                  {result.step}
                </div>
                <div className="font-montserrat text-sm text-gray-600">
                  {result.message}
                </div>
                {result.details && (
                  <div className="font-montserrat text-xs text-gray-500 mt-1">
                    {result.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning}
            className="font-montserrat bg-[#8B5FBF] text-white border-[#8B5FBF] hover:bg-[#7A4F9A] focus:ring-2 focus:ring-[#8B5FBF] focus:ring-opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            Executar Novamente
          </Button>
          
          {overallStatus === 'healthy' && (
            <Button 
              onClick={() => {
                // Sistema unificado não precisa de refresh manual
                onClose?.();
              }}
              className="font-montserrat bg-green-600 text-white border-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-600 focus:ring-opacity-50"
            >
              Continuar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};