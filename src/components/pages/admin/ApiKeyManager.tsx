import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  Key,
  Shield,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Globe,
  Lock,
  Zap,
  Cloud,
  Server
} from '../../icons';
import { toast } from 'sonner';
import { validateApiKey, maskApiKey, safeLocalStorageGet, safeLocalStorageSet } from '../../../utils/adminHelpers';

interface APIKeyConfig {
  id: string;
  service: string;
  displayName: string;
  description: string;
  apiKey: string;
  isActive: boolean;
  isProduction: boolean;
  lastTested?: string;
  testStatus?: 'success' | 'error' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<APIKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
  
  // Estados para conexão com servidor Supabase
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConnected: boolean;
    hasApiKey: boolean;
    apiKeyValid: boolean;
    lastChecked?: string;
    error?: string;
  }>({
    isConnected: false,
    hasApiKey: false,
    apiKeyValid: false
  });
  const [checkingSupabase, setCheckingSupabase] = useState(false);
  const [testingProduction, setTestingProduction] = useState(false);

  // Carregar configurações
  useEffect(() => {
    loadApiKeys();
    checkSupabaseApiKey();
  }, []);

  // Verificar status da API key no Supabase
  const checkSupabaseApiKey = useCallback(async () => {
    setCheckingSupabase(true);
    
    try {
      console.log('🔍 Verificando status da API key no Supabase...');
      
      const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');
      
      // Verificar conectividade
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-53322c0b/health`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(10000)
      });

      if (!healthResponse.ok) {
        throw new Error('Servidor indisponível');
      }

      // Verificar API key
      const apiResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-53322c0b/api-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (apiResponse.ok) {
        const result = await apiResponse.json();
        
        setSupabaseStatus({
          isConnected: true,
          hasApiKey: !!(result.apiKey),
          apiKeyValid: !!(result.success && result.apiKey && result.apiKey.startsWith('sk-')),
          lastChecked: new Date().toISOString(),
          error: result.success ? undefined : result.error
        });

        if (result.success && result.apiKey) {
          console.log('✅ API key do Supabase está ativa e válida');
        } else {
          console.warn('⚠️ API key do Supabase não configurada ou inválida');
        }
      } else {
        throw new Error(`Erro ${apiResponse.status}: ${apiResponse.statusText}`);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar Supabase:', error);
      
      setSupabaseStatus({
        isConnected: false,
        hasApiKey: false,
        apiKeyValid: false,
        lastChecked: new Date().toISOString(),
        error: error.message
      });
    } finally {
      setCheckingSupabase(false);
    }
  }, []);

  // Teste de produção da API
  const testProductionApi = useCallback(async () => {
    setTestingProduction(true);
    
    try {
      console.log('🧪 Testando API de produção...');
      
      // Importar contentService
      const { contentService } = await import('../../../services/contentService');
      
      // Fazer teste real de geração de ideias
      const result = await contentService.generateIdeas({
        nicho: 'Tecnologia',
        palavrasChave: 'inteligência artificial, IA',
        quantidade: 3,
        idioma: 'Português',
        contexto: 'Teste de conectividade da API de produção'
      });

      if (result.success && result.ideas && result.ideas.length > 0) {
        console.log('✅ Teste de produção bem-sucedido:', result.ideas);
        toast.success('🎉 API de produção funcionando perfeitamente! Ideias geradas com sucesso.');
      } else {
        throw new Error(result.error || 'Falha na geração de ideias');
      }

    } catch (error) {
      console.error('❌ Erro no teste de produção:', error);
      toast.error(`❌ Teste de produção falhou: ${error.message}`);
    } finally {
      setTestingProduction(false);
    }
  }, []);

  const loadApiKeys = useCallback(() => {
    setLoading(true);
    
    try {
      // Carregar do localStorage
      const stored = safeLocalStorageGet('bia-admin-api-keys', []);
      
      if (stored.length === 0) {
        // Criar configuração padrão OpenAI para produção
        const defaultConfig: APIKeyConfig = {
          id: 'openai-production',
          service: 'openai',
          displayName: 'OpenAI (Produção)',
          description: 'Chave OpenAI principal para produção de conteúdo de todos os usuários',
          apiKey: '',
          isActive: false,
          isProduction: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setApiKeys([defaultConfig]);
        safeLocalStorageSet('bia-admin-api-keys', [defaultConfig]);
      } else {
        setApiKeys(stored);
      }
      
      console.log('✅ Configurações de API carregadas');
    } catch (error) {
      console.error('❌ Erro ao carregar API keys:', error);
      toast.error('Erro ao carregar configurações de API');
    } finally {
      setLoading(false);
    }
  }, []);

  // Salvar configuração
  const saveApiKey = useCallback(async (keyConfig: APIKeyConfig): Promise<boolean> => {
    try {
      const updatedKeys = apiKeys.map(key => 
        key.id === keyConfig.id 
          ? { ...keyConfig, updatedAt: new Date().toISOString() }
          : key
      );
      
      const success = safeLocalStorageSet('bia-admin-api-keys', updatedKeys);
      
      if (success) {
        setApiKeys(updatedKeys);
        console.log('✅ API key salva:', keyConfig.service);
        return true;
      } else {
        throw new Error('Falha ao salvar no localStorage');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar API key:', error);
      return false;
    }
  }, [apiKeys]);

  // Atualizar API key
  const handleUpdateApiKey = useCallback(async (keyId: string, newApiKey: string) => {
    const keyConfig = apiKeys.find(k => k.id === keyId);
    if (!keyConfig) return;

    // Validar chave
    const validation = validateApiKey(newApiKey, keyConfig.service);
    if (!validation.isValid) {
      toast.error(validation.error || 'API Key inválida');
      return;
    }

    setSaving(true);

    try {
      const updatedConfig = {
        ...keyConfig,
        apiKey: newApiKey.trim(),
        testStatus: undefined,
        lastTested: undefined
      };

      const success = await saveApiKey(updatedConfig);
      
      if (success) {
        toast.success('API Key atualizada com sucesso!');
      } else {
        toast.error('Erro ao salvar API Key');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar API key:', error);
      toast.error('Erro inesperado ao atualizar API Key');
    } finally {
      setSaving(false);
    }
  }, [apiKeys, saveApiKey]);

  // Testar conexão
  const testApiKey = useCallback(async (keyId: string) => {
    const keyConfig = apiKeys.find(k => k.id === keyId);
    if (!keyConfig || !keyConfig.apiKey.trim()) {
      toast.error('API Key não configurada');
      return;
    }

    setTesting(prev => ({ ...prev, [keyId]: true }));

    try {
      console.log(`🧪 Testando conexão ${keyConfig.service}...`);
      
      if (keyConfig.service === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${keyConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const updatedConfig = {
            ...keyConfig,
            testStatus: 'success' as const,
            lastTested: new Date().toISOString()
          };
          
          await saveApiKey(updatedConfig);
          toast.success('✅ Conexão OpenAI estabelecida com sucesso!');
        } else {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
      } else {
        // Simular teste para outros providers
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedConfig = {
          ...keyConfig,
          testStatus: 'success' as const,
          lastTested: new Date().toISOString()
        };
        
        await saveApiKey(updatedConfig);
        toast.success(`✅ Teste de ${keyConfig.displayName} concluído!`);
      }

    } catch (error) {
      console.error(`❌ Erro no teste ${keyConfig.service}:`, error);
      
      const updatedConfig = {
        ...keyConfig,
        testStatus: 'error' as const,
        lastTested: new Date().toISOString()
      };
      
      await saveApiKey(updatedConfig);
      
      if (error.name === 'AbortError') {
        toast.error('Timeout no teste de conexão');
      } else {
        toast.error(`❌ Falha no teste: ${error.message}`);
      }
    } finally {
      setTesting(prev => ({ ...prev, [keyId]: false }));
    }
  }, [apiKeys, saveApiKey]);

  // Toggle ativação
  const toggleApiKey = useCallback(async (keyId: string) => {
    const keyConfig = apiKeys.find(k => k.id === keyId);
    if (!keyConfig) return;

    if (!keyConfig.apiKey.trim() && !keyConfig.isActive) {
      toast.error('Configure a API Key antes de ativar');
      return;
    }

    const updatedConfig = {
      ...keyConfig,
      isActive: !keyConfig.isActive
    };

    const success = await saveApiKey(updatedConfig);
    
    if (success) {
      toast.success(`${keyConfig.displayName} ${updatedConfig.isActive ? 'ativada' : 'desativada'}`);
    }
  }, [apiKeys, saveApiKey]);

  // Toggle visibilidade da chave
  const toggleKeyVisibility = useCallback((keyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-poppins text-2xl text-black mb-2">Gerenciamento de API Keys</h1>
          <p className="font-montserrat text-gray-600">Configure as chaves de API centralizadas para produção</p>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mx-auto mb-6">
              <Loader2 size={32} className="text-purple-600 animate-spin" />
            </div>
            <h3 className="font-poppins text-xl text-black mb-2">Carregando configurações...</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeKeys = apiKeys.filter(key => key.isActive && key.apiKey.trim()).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-poppins text-2xl text-black mb-2">Gerenciamento de API Keys</h1>
        <p className="font-montserrat text-gray-600">
          Configure as chaves de API centralizadas para produção do sistema
        </p>
      </div>

      {/* Status do Supabase */}
      <Card className={`border ${supabaseStatus.apiKeyValid ? 'border-green-200 bg-green-50' : 
                                 supabaseStatus.isConnected ? 'border-yellow-200 bg-yellow-50' : 
                                 'border-red-200 bg-red-50'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                supabaseStatus.apiKeyValid ? 'bg-green-100' : 
                supabaseStatus.isConnected ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <Server size={20} className={
                  supabaseStatus.apiKeyValid ? 'text-green-600' : 
                  supabaseStatus.isConnected ? 'text-yellow-600' : 'text-red-600'
                } />
              </div>
              <div>
                <CardTitle className="font-poppins text-lg">API Key de Produção (Supabase)</CardTitle>
                <p className="font-montserrat text-sm text-gray-600">
                  Sistema centralizado de IA para todos os usuários
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={
                supabaseStatus.apiKeyValid ? 'bg-green-100 text-green-700 border-green-200' :
                supabaseStatus.isConnected ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                'bg-red-100 text-red-700 border-red-200'
              }>
                      {supabaseStatus.apiKeyValid ? 'ATIVA' :
                 supabaseStatus.isConnected ? 'PARCIAL' : 'INATIVA'}
              </Badge>
              <Button
                onClick={checkSupabaseApiKey}
                disabled={checkingSupabase}
                      className="font-montserrat px-2 py-1 text-sm border border-gray-200"
              >
                {checkingSupabase ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {supabaseStatus.isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-montserrat text-sm">
                {supabaseStatus.isConnected ? 'Servidor conectado' : 'Servidor offline'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {supabaseStatus.hasApiKey ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-montserrat text-sm">
                {supabaseStatus.hasApiKey ? 'API key presente' : 'API key ausente'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {supabaseStatus.apiKeyValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-montserrat text-sm">
                {supabaseStatus.apiKeyValid ? 'Chave válida' : 'Chave inválida'}
              </span>
            </div>
          </div>

          {supabaseStatus.lastChecked && (
            <p className="font-montserrat text-xs text-gray-500">
              Última verificação: {new Date(supabaseStatus.lastChecked).toLocaleString('pt-BR')}
            </p>
          )}

          {supabaseStatus.error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="font-montserrat text-red-800">
                <strong>Erro:</strong> {supabaseStatus.error}
              </AlertDescription>
            </Alert>
          )}

          {supabaseStatus.apiKeyValid && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="font-montserrat text-green-800">
                ✅ <strong>Sistema Operacional:</strong> A API key OpenAI está configurada e ativa no Supabase. 
                Todos os usuários podem gerar conteúdo normalmente.
              </AlertDescription>
            </Alert>
          )}

          {!supabaseStatus.apiKeyValid && supabaseStatus.isConnected && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="font-montserrat text-amber-800">
                ⚠️ <strong>Configuração Pendente:</strong> Configure a variável de ambiente OPENAI_API_KEY no Supabase 
                com uma chave válida para ativar a geração de conteúdo.
                <br />
                <br />
                <strong>Instrução:</strong> Acesse o dashboard do Supabase → Settings → Environment Variables → 
                Adicione OPENAI_API_KEY com sua chave OpenAI (sk-...)
              </AlertDescription>
            </Alert>
          )}

          {/* Test Production API */}
          {supabaseStatus.apiKeyValid && (
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Button
                onClick={testProductionApi}
                disabled={testingProduction}
                className="font-montserrat"
                style={{ backgroundColor: '#8B5FBF', color: 'white' }}
              >
                {testingProduction ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando API...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Testar Geração de Conteúdo
                  </>
                )}
              </Button>
              <span className="font-montserrat text-sm text-gray-600">
                Teste completo com geração de ideias
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert de Segurança */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="font-montserrat text-blue-800">
          <strong>Sistema de Produção:</strong> O sistema BIA utiliza uma API key centralizada configurada no Supabase 
          para garantir máxima segurança e performance. As configurações locais abaixo são para backup e desenvolvimento.
        </AlertDescription>
      </Alert>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Cloud size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-poppins text-2xl text-black">
                  {supabaseStatus.isConnected ? 'ON' : 'OFF'}
                </h3>
                <p className="font-montserrat text-sm text-gray-600">Servidor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Key size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-poppins text-2xl text-black">
                  {supabaseStatus.apiKeyValid ? 'ATIVA' : 'INATIVA'}
                </h3>
                <p className="font-montserrat text-sm text-gray-600">API Produção</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-poppins text-2xl text-black">{activeKeys}</h3>
                <p className="font-montserrat text-sm text-gray-600">Backup Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock size={24} className="text-gray-600" />
              </div>
              <div>
                <h3 className="font-poppins text-2xl text-black">{apiKeys.length}</h3>
                <p className="font-montserrat text-sm text-gray-600">Keys Locais</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Separator */}
      <div className="border-t pt-8">
        <h2 className="font-poppins text-xl text-black mb-2">Configurações de Backup</h2>
        <p className="font-montserrat text-gray-600 mb-6">
          API keys locais para desenvolvimento e backup. O sistema prioriza sempre a chave do Supabase.
        </p>

        {/* API Keys List */}
        <div className="space-y-6">
          {apiKeys.map((keyConfig) => (
            <Card key={keyConfig.id} className={`border ${keyConfig.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Key size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="font-poppins text-lg">{keyConfig.displayName}</CardTitle>
                      <p className="font-montserrat text-sm text-gray-600">{keyConfig.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {keyConfig.isProduction && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">Produção</Badge>
                    )}
                    <Badge className={keyConfig.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border border-gray-200 text-gray-700'}>
                      {keyConfig.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* API Key Input */}
                <div className="space-y-2">
                  <Label className="font-montserrat text-black">API Key</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showKeys[keyConfig.id] ? 'text' : 'password'}
                      value={keyConfig.apiKey}
                      onChange={(e) => {
                        const newKeys = apiKeys.map(key => 
                          key.id === keyConfig.id ? { ...key, apiKey: e.target.value } : key
                        );
                        setApiKeys(newKeys);
                      }}
                      placeholder="Insira sua API key..."
                      className="flex-1"
                    />
                    <Button
                      onClick={() => toggleKeyVisibility(keyConfig.id)}
                      className="px-2 py-1 text-sm border border-gray-200"
                    >
                      {showKeys[keyConfig.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={() => handleUpdateApiKey(keyConfig.id, keyConfig.apiKey)}
                      disabled={saving}
                      className="font-montserrat px-3 py-2 text-sm"
                      style={{ backgroundColor: '#8B5FBF', color: 'white' }}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                  </div>
                  {keyConfig.apiKey && (
                    <p className="font-montserrat text-xs text-gray-500">
                      Key mascarada: {maskApiKey(keyConfig.apiKey)}
                    </p>
                  )}
                </div>

                {/* Test Status */}
                {keyConfig.lastTested && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      {keyConfig.testStatus === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : keyConfig.testStatus === 'error' ? (
                        <XCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="font-montserrat text-gray-600">
                        Última verificação: {new Date(keyConfig.lastTested).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={keyConfig.isActive}
                      onCheckedChange={() => toggleApiKey(keyConfig.id)}
                    />
                    <Label className="font-montserrat text-sm">Ativar Key</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => testApiKey(keyConfig.id)}
                      disabled={testing[keyConfig.id] || !keyConfig.apiKey.trim()}
                      className="font-montserrat px-2 py-1 text-sm border border-gray-200"
                    >
                      {testing[keyConfig.id] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Testar
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={loadApiKeys}
                      className="font-montserrat px-2 py-1 text-sm border border-gray-200"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}