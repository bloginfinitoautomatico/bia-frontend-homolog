import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog';
import { 
  CreditCard,
  Plus,
  Minus,
  RotateCcw,
  Save,
  X,
  Loader2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { getApiUrl } from '../../../config/api';

interface User {
  id: number;
  name: string;
  email: string;
  cpf?: string;
  whatsapp?: string;
  data_nascimento?: string;
  plano: string;
  is_admin: boolean;
  is_developer: boolean;
  email_verified_at?: string;
  created_at: string;
  consumo?: {
    ideas: number;
    articles: number;
    sites: number;
    schedules: number;
  };
  quotas?: {
    ideas: number;
    articles: number;
    sites: number;
    schedules: number;
  };
}

interface ManageCreditsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

export function ManageCreditsModal({ user, isOpen, onClose, onSave }: ManageCreditsModalProps) {
  const [credits, setCredits] = useState({
    ideas: 0,
    articles: 0,
    sites: 0,
    schedules: 0,
  });
  const [action, setAction] = useState<'add' | 'remove' | 'reset'>('add');
  const [isLoading, setIsLoading] = useState(false);

  // Inicializar créditos quando usuário muda
  React.useEffect(() => {
    if (user && user.quotas) {
      setCredits({
        ideas: user.quotas.ideas === -1 ? 0 : user.quotas.ideas,
        articles: user.quotas.articles === -1 ? 0 : user.quotas.articles,
        sites: user.quotas.sites === -1 ? 0 : user.quotas.sites,
        schedules: user.quotas.schedules === -1 ? 0 : user.quotas.schedules,
      });
    }
  }, [user]);

  const handleCreditChange = (type: keyof typeof credits, value: string) => {
    const numValue = parseInt(value) || 0;
    setCredits(prev => ({
      ...prev,
      [type]: Math.max(0, numValue)
    }));
  };

  const adjustCredit = (type: keyof typeof credits, amount: number) => {
    setCredits(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + amount)
    }));
  };

  const resetCredits = () => {
    if (user) {
      const planLimits = getPlanLimits(user.plano);
      setCredits({
        ideas: planLimits.ideas === -1 ? 0 : planLimits.ideas,
        articles: planLimits.articles === -1 ? 0 : planLimits.articles,
        sites: planLimits.sites === -1 ? 0 : planLimits.sites,
        schedules: planLimits.schedules === -1 ? 0 : planLimits.schedules,
      });
    }
  };

  const getPlanLimits = (plan: string) => {
    const limits = {
      'Free': {
        sites: 1,
        ideas: 10,
        articles: 5,
        schedules: 0
      },
      'Básico': {
        sites: 5,
        ideas: -1,
        articles: 100,
        schedules: 10
      },
      'Intermediário': {
        sites: 20,
        ideas: -1,
        articles: 200,
        schedules: 50
      },
      'Avançado': {
        sites: 50,
        ideas: -1,
        articles: 500,
        schedules: 100
      },
      'BIA': {
        sites: -1,
        ideas: -1,
        articles: 1000,
        schedules: -1
      }
    };
    return limits[plan as keyof typeof limits] || limits['Free'];
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');

      // Preparar os novos quotas baseados na ação
      let newQuotas = { ...credits };
      
      if (action === 'reset') {
        // Reset para consumo zero
        const resetData = {
          consumo: {
            ideas: 0,
            articles: 0,
            sites: 0,
            schedules: 0,
            last_reset: new Date().toISOString().split('T')[0]
          }
        };

        const response = await fetch(`${getApiUrl()}/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(resetData)
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          console.log('✅ Consumo resetado:', data.data);
          onSave(data.data);
          toast.success('Consumo resetado com sucesso!');
          onClose();
        } else {
          throw new Error(data.message || 'Erro ao resetar consumo');
        }
      } else {
        // Atualizar quotas
        const updateData = {
          quotas: newQuotas
        };

        const response = await fetch(`${getApiUrl()}/admin/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          console.log('✅ Créditos atualizados:', data.data);
          onSave(data.data);
          toast.success('Créditos atualizados com sucesso!');
          onClose();
        } else {
          throw new Error(data.message || 'Erro ao atualizar créditos');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao gerenciar créditos:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerenciar créditos');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-poppins">
            <CreditCard className="h-5 w-5 text-[#8B5FBF]" />
            Gerenciar Créditos - {user.name}
          </DialogTitle>
          <DialogDescription className="font-montserrat">
            Ajuste os créditos e limites do usuário ou reset o consumo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tipo de Ação */}
          <div>
            <label className="block font-montserrat text-sm font-medium mb-3">
              Tipo de Ação
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setAction('add')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'add'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Plus className="h-4 w-4 mx-auto mb-1" />
                <span className="font-montserrat text-xs">Ajustar Limites</span>
              </button>
              
              <button
                onClick={() => setAction('reset')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'reset'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <RotateCcw className="h-4 w-4 mx-auto mb-1" />
                <span className="font-montserrat text-xs">Reset Consumo</span>
              </button>
            </div>
          </div>

          {/* Consumo Atual */}
          <div>
            <label className="block font-montserrat text-sm font-medium mb-3">
              Consumo Atual
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-montserrat text-xs text-gray-600">Ideias</p>
                <p className="font-poppins font-bold text-lg">
                  {user.consumo?.ideas || 0} / {user.quotas?.ideas === -1 ? '∞' : user.quotas?.ideas}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-montserrat text-xs text-gray-600">Artigos</p>
                <p className="font-poppins font-bold text-lg">
                  {user.consumo?.articles || 0} / {user.quotas?.articles === -1 ? '∞' : user.quotas?.articles}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-montserrat text-xs text-gray-600">Sites</p>
                <p className="font-poppins font-bold text-lg">
                  {user.consumo?.sites || 0} / {user.quotas?.sites === -1 ? '∞' : user.quotas?.sites}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-montserrat text-xs text-gray-600">Agendamentos</p>
                <p className="font-poppins font-bold text-lg">
                  {user.consumo?.schedules || 0} / {user.quotas?.schedules === -1 ? '∞' : user.quotas?.schedules}
                </p>
              </div>
            </div>
          </div>

          {/* Ajuste de Créditos */}
          {action !== 'reset' && (
            <div>
              <label className="block font-montserrat text-sm font-medium mb-3">
                Novos Limites
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat text-xs text-gray-600 mb-1">
                    Ideias
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => adjustCredit('ideas', -10)}
                      className="bg-red-500 text-white hover:bg-red-600 px-2 py-1 h-8"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={credits.ideas}
                      onChange={(e) => handleCreditChange('ideas', e.target.value)}
                      className="text-center"
                      min="0"
                    />
                    <Button
                      onClick={() => adjustCredit('ideas', 10)}
                      className="bg-green-500 text-white hover:bg-green-600 px-2 py-1 h-8"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block font-montserrat text-xs text-gray-600 mb-1">
                    Artigos
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => adjustCredit('articles', -10)}
                      className="bg-red-500 text-white hover:bg-red-600 px-2 py-1 h-8"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={credits.articles}
                      onChange={(e) => handleCreditChange('articles', e.target.value)}
                      className="text-center"
                      min="0"
                    />
                    <Button
                      onClick={() => adjustCredit('articles', 10)}
                      className="bg-green-500 text-white hover:bg-green-600 px-2 py-1 h-8"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block font-montserrat text-xs text-gray-600 mb-1">
                    Sites
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => adjustCredit('sites', -1)}
                      className="bg-red-500 text-white hover:bg-red-600 px-2 py-1 h-8"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={credits.sites}
                      onChange={(e) => handleCreditChange('sites', e.target.value)}
                      className="text-center"
                      min="0"
                    />
                    <Button
                      onClick={() => adjustCredit('sites', 1)}
                      className="bg-green-500 text-white hover:bg-green-600 px-2 py-1 h-8"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block font-montserrat text-xs text-gray-600 mb-1">
                    Agendamentos
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => adjustCredit('schedules', -5)}
                      className="bg-red-500 text-white hover:bg-red-600 px-2 py-1 h-8"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={credits.schedules}
                      onChange={(e) => handleCreditChange('schedules', e.target.value)}
                      className="text-center"
                      min="0"
                    />
                    <Button
                      onClick={() => adjustCredit('schedules', 5)}
                      className="bg-green-500 text-white hover:bg-green-600 px-2 py-1 h-8"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  onClick={resetCredits}
                  className="bg-blue-500 text-white hover:bg-blue-600 px-3 py-1 text-sm"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restaurar Padrão do Plano
                </Button>
              </div>
            </div>
          )}

          {/* Aviso sobre Reset */}
          {action === 'reset' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="font-montserrat font-medium text-blue-800">
                  Reset de Consumo
                </span>
              </div>
              <p className="font-montserrat text-sm text-blue-700">
                Esta ação irá zerar todo o consumo atual do usuário, permitindo que use novamente 
                todos os recursos disponíveis em seu plano. Os limites (quotas) não serão alterados.
              </p>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-500 text-white hover:bg-gray-600"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-[#8B5FBF] text-white hover:bg-[#7A4FB5]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isLoading ? 'Processando...' : action === 'reset' ? 'Reset Consumo' : 'Atualizar Créditos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
