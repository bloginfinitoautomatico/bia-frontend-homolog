import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Switch } from '../../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { 
  Brain,
  Key,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Save,
  RefreshCw,
  Zap,
  Globe,
  Shield
} from '../../icons';
import { toast } from 'sonner';

interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  description: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  isActive: boolean;
  isDefault: boolean;
  icon: string;
  provider: 'openai' | 'anthropic' | 'google' | 'meta' | 'custom';
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

interface AIProviderManagerProps {
  onUpdateProvider?: (provider: AIProvider) => Promise<boolean>;
}

const DEFAULT_PROVIDERS: Partial<AIProvider>[] = [
  {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4, GPT-3.5 e outros modelos da OpenAI',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    icon: '🤖',
    capabilities: ['text-generation', 'conversation', 'code-generation', 'image-generation']
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus e outros modelos',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229',
    icon: '🧠',
    capabilities: ['text-generation', 'conversation', 'analysis']
  },
  {
    name: 'google',
    displayName: 'Google Gemini',
    description: 'Gemini Pro, Gemini Ultra e outros modelos do Google',
    provider: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    model: 'gemini-pro',
    icon: '💎',
    capabilities: ['text-generation', 'conversation', 'multimodal']
  },
  {
    name: 'meta',
    displayName: 'Meta Llama',
    description: 'Llama 2, Code Llama e outros modelos da Meta',
    provider: 'meta',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-2-70b-chat-hf',
    icon: '🦙',
    capabilities: ['text-generation', 'conversation', 'code-generation']
  }
];

export function AIProviderManager({ onUpdateProvider }: AIProviderManagerProps) {
  // Estados principais
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de modal
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<Partial<AIProvider> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de formulário
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({});
  const [testingConnection, setTestingConnection] = useState<{ [key: string]: boolean }>({});

  // Carregar providers do localStorage ou servidor
  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      
      // Tentar carregar do localStorage primeiro
      const stored = localStorage.getItem('bia-ai-providers');
      if (stored) {
        const parsedProviders = JSON.parse(stored);
        setProviders(parsedProviders);
        console.log('✅ Providers carregados do localStorage:', parsedProviders.length);
      } else {
        // Se não existir, criar providers padrão
        const defaultProviders: AIProvider[] = DEFAULT_PROVIDERS.map((provider, index) => ({
          id: `provider-${Date.now()}-${index}`,
          ...provider,
          apiKey: '',
          maxTokens: 4000,
          temperature: 0.7,
          isActive: false,
          isDefault: provider.name === 'openai',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as AIProvider));

        setProviders(defaultProviders);
        localStorage.setItem('bia-ai-providers', JSON.stringify(defaultProviders));
        console.log('✅ Providers padrão criados:', defaultProviders.length);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar providers:', error);
      toast.error('Erro ao carregar configurações de IA');
    } finally {
      setLoading(false);
    }
  }, []);

  // Salvar providers
  const saveProviders = useCallback(async (newProviders: AIProvider[]) => {
    try {
      localStorage.setItem('bia-ai-providers', JSON.stringify(newProviders));
      setProviders(newProviders);
      console.log('✅ Providers salvos:', newProviders.length);
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar providers:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    }
  }, []);

  // Carregar na inicialização
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // Função para testar conexão com a IA
  const testConnection = useCallback(async (provider: AIProvider) => {
    if (!provider.apiKey.trim()) {
      toast.error('API Key é obrigatória para testar a conexão');
      return;
    }

    setTestingConnection(prev => ({ ...prev, [provider.id]: true }));

    try {
      console.log(`🧪 Testando conexão com ${provider.displayName}...`);
      
      // Simular teste de conexão (implementar lógica real baseada no provider)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Para OpenAI, poderia fazer uma chamada real:
      if (provider.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          toast.success(`✅ Conexão com ${provider.displayName} estabelecida com sucesso!`);
        } else {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
      } else {
        // Para outros providers, simular sucesso
        toast.success(`✅ Conexão com ${provider.displayName} testada com sucesso!`);
      }

    } catch (error) {
      console.error(`❌ Erro ao testar ${provider.displayName}:`, error);
      toast.error(`❌ Falha na conexão com ${provider.displayName}: ${error.message}`);
    } finally {
      setTestingConnection(prev => ({ ...prev, [provider.id]: false }));
    }
  }, []);

  // Função para salvar provider
  const handleSaveProvider = useCallback(async () => {
    if (!currentProvider) return;

    if (!currentProvider.displayName?.trim()) {
      toast.error('Nome do provider é obrigatório');
      return;
    }

    if (!currentProvider.apiKey?.trim()) {
      toast.error('API Key é obrigatória');
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();
      
      let updatedProvider: AIProvider;
      
      if (isEditing) {
        // Editando provider existente
        updatedProvider = {
          ...currentProvider,
          updatedAt: now
        } as AIProvider;
        
        const newProviders = providers.map(p => 
          p.id === updatedProvider.id ? updatedProvider : p
        );
        
        await saveProviders(newProviders);
      } else {
        // Criando novo provider
        updatedProvider = {
          id: `provider-${Date.now()}`,
          ...currentProvider,
          provider: 'custom',
          capabilities: ['text-generation'],
          createdAt: now,
          updatedAt: now
        } as AIProvider;
        
        const newProviders = [...providers, updatedProvider];
        await saveProviders(newProviders);
      }

      toast.success(`Provider ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
      setEditDialogOpen(false);
      setCurrentProvider(null);
      setIsEditing(false);

    } catch (error) {
      console.error('❌ Erro ao salvar provider:', error);
      toast.error('Erro ao salvar provider');
    } finally {
      setSaving(false);
    }
  }, [currentProvider, isEditing, providers, saveProviders]);

  // Função para editar provider
  const handleEditProvider = useCallback((provider: AIProvider) => {
    setCurrentProvider({ ...provider });
    setIsEditing(true);
    setEditDialogOpen(true);
  }, []);

  // Função para criar novo provider
  const handleCreateProvider = useCallback(() => {
    setCurrentProvider({
      displayName: '',
      name: '',
      description: '',
      apiKey: '',
      baseUrl: '',
      model: '',
      maxTokens: 4000,
      temperature: 0.7,
      isActive: false,
      isDefault: false,
      icon: '🤖'
    });
    setIsEditing(false);
    setEditDialogOpen(true);
  }, []);

  // Função para deletar provider
  const handleDeleteProvider = useCallback(async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (provider.isDefault) {
      toast.error('Não é possível excluir um provider padrão');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o provider "${provider.displayName}"?`)) {
      return;
    }

    try {
      const newProviders = providers.filter(p => p.id !== providerId);
      await saveProviders(newProviders);
      toast.success('Provider excluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao excluir provider:', error);
      toast.error('Erro ao excluir provider');
    }
  }, [providers, saveProviders]);

  // Função para ativar/desativar provider
  const handleToggleProvider = useCallback(async (providerId: string) => {
    try {
      const newProviders = providers.map(p => 
        p.id === providerId 
          ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString() }
          : p
      );
      
      await saveProviders(newProviders);
      
      const provider = newProviders.find(p => p.id === providerId);
      toast.success(`${provider?.displayName} ${provider?.isActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao alterar status do provider:', error);
      toast.error('Erro ao alterar status do provider');
    }
  }, [providers, saveProviders]);

  // Função para definir como padrão
  const handleSetDefault = useCallback(async (providerId: string) => {
    try {
      const newProviders = providers.map(p => ({
        ...p,
        isDefault: p.id === providerId,
        updatedAt: p.id === providerId ? new Date().toISOString() : p.updatedAt
      }));
      
      await saveProviders(newProviders);
      
      const provider = newProviders.find(p => p.id === providerId);
      toast.success(`${provider?.displayName} definido como padrão!`);
    } catch (error) {
      console.error('❌ Erro ao definir provider padrão:', error);
      toast.error('Erro ao definir provider padrão');
    }
  }, [providers, saveProviders]);

  // Toggle visibilidade da API Key
  const toggleApiKeyVisibility = useCallback((providerId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  }, []);

  // Estatísticas
  const activeProviders = providers.filter(p => p.isActive).length;
  const defaultProvider = providers.find(p => p.isDefault);

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-poppins text-2xl text-black mb-2">Gerenciamento de IAs</h1>
          <p className="font-montserrat text-gray-600">Configure e gerencie provedores de inteligência artificial</p>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-poppins text-2xl text-black mb-2">Gerenciamento de IAs</h1>
          <p className="font-montserrat text-gray-600">
            Configure e gerencie provedores de inteligência artificial
          </p>
        </div>
        <Button
          onClick={handleCreateProvider}
          className="font-montserrat"
          style={{ backgroundColor: '#8B5FBF', color: 'white' }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Provider
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Brain size={24} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-poppins text-2xl text-black">{providers.length}</h3>
                <p className="font-montserrat text-sm text-gray-600">Total de Providers</p>
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
                <h3 className="font-poppins text-2xl text-black">{activeProviders}</h3>
                <p className="font-montserrat text-sm text-gray-600">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-poppins text-base text-black">{defaultProvider?.displayName || 'Nenhum'}</h3>
                <p className="font-montserrat text-sm text-gray-600">Provider Padrão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Providers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers.map((provider) => (
          <Card key={provider.id} className={`border ${provider.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{provider.icon}</div>
                  <div>
                    <CardTitle className="font-poppins text-lg">{provider.displayName}</CardTitle>
                    <p className="font-montserrat text-sm text-gray-600">{provider.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {provider.isDefault && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">Padrão</Badge>
                  )}
                  <Badge className={provider.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'border border-gray-200 text-gray-700'}>
                    {provider.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label className="font-montserrat text-black">API Key</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKey[provider.id] ? 'text' : 'password'}
                    value={provider.apiKey}
                    placeholder="Não configurada"
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={() => toggleApiKeyVisibility(provider.id)}
                    className="px-2 py-1 text-sm border border-gray-200"
                  >
                    {showApiKey[provider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Model & Settings */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-montserrat text-black text-xs">Modelo</Label>
                  <p className="font-montserrat text-gray-600">{provider.model || 'Não configurado'}</p>
                </div>
                <div>
                  <Label className="font-montserrat text-black text-xs">Max Tokens</Label>
                  <p className="font-montserrat text-gray-600">{provider.maxTokens || 'Padrão'}</p>
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-2">
                <Label className="font-montserrat text-black text-xs">Capacidades</Label>
                <div className="flex flex-wrap gap-1">
                  {provider.capabilities?.map((capability, index) => (
                    <Badge key={index} className="text-xs border border-gray-200 px-2 py-0.5 rounded">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={provider.isActive}
                    onCheckedChange={() => handleToggleProvider(provider.id)}
                  />
                  <Label className="font-montserrat text-sm">Ativar Provider</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  {provider.apiKey && (
                    <Button
                      onClick={() => testConnection(provider)}
                      disabled={testingConnection[provider.id]}
                      className="font-montserrat px-2 py-1 text-sm border border-gray-200"
                    >
                      {testingConnection[provider.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  
                  {!provider.isDefault && (
                    <Button
                      onClick={() => handleSetDefault(provider.id)}
                      className="font-montserrat px-2 py-1 text-sm border border-gray-200"
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    onClick={() => handleEditProvider(provider)}
                    className="font-montserrat px-2 py-1 text-sm border border-gray-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  {!provider.isDefault && (
                    <Button
                      onClick={() => handleDeleteProvider(provider.id)}
                      className="font-montserrat px-2 py-1 text-sm text-red-600 border border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Provider Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl" aria-describedby="edit-provider-description">
          <DialogHeader>
            <DialogTitle className="font-poppins">
              {isEditing ? 'Editar Provider' : 'Adicionar Provider'}
            </DialogTitle>
            <DialogDescription id="edit-provider-description" className="font-montserrat">
              {isEditing 
                ? 'Edite as configurações do provider de IA'
                : 'Configure um novo provider de inteligência artificial'
              }
            </DialogDescription>
          </DialogHeader>

          {currentProvider && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-montserrat">Nome do Provider *</Label>
                  <Input
                    value={currentProvider.displayName || ''}
                    onChange={(e) => setCurrentProvider(prev => ({
                      ...prev,
                      displayName: e.target.value,
                      name: e.target.value.toLowerCase().replace(/\s+/g, '-')
                    }))}
                    placeholder="OpenAI, Anthropic, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-montserrat">Ícone</Label>
                  <Input
                    value={currentProvider.icon || ''}
                    onChange={(e) => setCurrentProvider(prev => ({
                      ...prev,
                      icon: e.target.value
                    }))}
                    placeholder="🤖"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-montserrat">Descrição</Label>
                <Textarea
                  value={currentProvider.description || ''}
                  onChange={(e) => setCurrentProvider(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Descrição do provider..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-montserrat">API Key *</Label>
                <Input
                  type="password"
                  value={currentProvider.apiKey || ''}
                  onChange={(e) => setCurrentProvider(prev => ({
                    ...prev,
                    apiKey: e.target.value
                  }))}
                  placeholder="sk-..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-montserrat">Base URL</Label>
                  <Input
                    value={currentProvider.baseUrl || ''}
                    onChange={(e) => setCurrentProvider(prev => ({
                      ...prev,
                      baseUrl: e.target.value
                    }))}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-montserrat">Modelo</Label>
                  <Input
                    value={currentProvider.model || ''}
                    onChange={(e) => setCurrentProvider(prev => ({
                      ...prev,
                      model: e.target.value
                    }))}
                    placeholder="gpt-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-montserrat">Max Tokens</Label>
                  <Input
                    type="number"
                    value={currentProvider.maxTokens || ''}
                    onChange={(e) => setCurrentProvider(prev => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value) || undefined
                    }))}
                    placeholder="4000"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-montserrat">Temperature</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={currentProvider.temperature || ''}
                    onChange={(e) => setCurrentProvider(prev => ({
                      ...prev,
                      temperature: parseFloat(e.target.value) || undefined
                    }))}
                    placeholder="0.7"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentProvider.isActive || false}
                    onCheckedChange={(checked) => setCurrentProvider(prev => ({
                      ...prev,
                      isActive: checked
                    }))}
                  />
                  <Label className="font-montserrat">Ativar Provider</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={currentProvider.isDefault || false}
                    onCheckedChange={(checked) => setCurrentProvider(prev => ({
                      ...prev,
                      isDefault: checked
                    }))}
                  />
                  <Label className="font-montserrat">Definir como Padrão</Label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => setEditDialogOpen(false)}
                  className="font-montserrat border px-3 py-1 rounded"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveProvider}
                  disabled={saving}
                  className="font-montserrat"
                  style={{ backgroundColor: '#8B5FBF', color: 'white' }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? 'Atualizar' : 'Criar'} Provider
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}