import React, { useState, useEffect } from 'react';
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
  User,
  Crown,
  Shield,
  Star,
  CreditCard,
  Calendar,
  Phone,
  Mail,
  FileText,
  Save,
  X,
  Loader2,
  AlertCircle
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

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedUser: User) => void;
}

export function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    whatsapp: '',
    data_nascimento: '',
    plano: 'Free',
    is_admin: false,
    is_developer: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const plans = [
    { value: 'Free', label: 'Free', description: '1 site, 10 ideias, 5 artigos' },
    { value: 'Start', label: 'Start', description: '5 sites, ideias ilimitadas, 50 artigos' },
    { value: 'Básico', label: 'Básico', description: '10 sites, ideias ilimitadas, 100 artigos' },
    { value: 'Intermediário', label: 'Intermediário', description: '20 sites, ideias ilimitadas, 200 artigos' },
    { value: 'Avançado', label: 'Avançado', description: '50 sites, ideias ilimitadas, 500 artigos' },
    { value: 'BIA', label: 'BIA', description: 'Tudo ilimitado' },
  ];

  // Inicializar formulário quando usuário muda
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        cpf: user.cpf || '',
        whatsapp: user.whatsapp || '',
        data_nascimento: user.data_nascimento ? user.data_nascimento.split('T')[0] : '',
        plano: user.plano || 'Free',
        is_admin: user.is_admin || false,
        is_developer: user.is_developer || false,
      });
      setErrors({});
    }
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro do campo quando usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      // Validação básica de formato CPF
      const cleanCpf = formData.cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        newErrors.cpf = 'CPF deve ter 11 dígitos';
      }
    }

    if (formData.whatsapp && !/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(formData.whatsapp)) {
      // Validação básica de formato WhatsApp
      const cleanPhone = formData.whatsapp.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        newErrors.whatsapp = 'WhatsApp deve ter formato válido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');

      // Preparar dados para envio (apenas campos que mudaram)
      const updatedFields: any = {};
      
      if (formData.name !== user.name) updatedFields.name = formData.name;
      if (formData.email !== user.email) updatedFields.email = formData.email;
      if (formData.cpf !== (user.cpf || '')) updatedFields.cpf = formData.cpf;
      if (formData.whatsapp !== (user.whatsapp || '')) updatedFields.whatsapp = formData.whatsapp;
      if (formData.data_nascimento !== (user.data_nascimento ? user.data_nascimento.split('T')[0] : '')) {
        updatedFields.data_nascimento = formData.data_nascimento || null;
      }
      if (formData.plano !== user.plano) updatedFields.plano = formData.plano;
      if (formData.is_admin !== user.is_admin) updatedFields.is_admin = formData.is_admin;
      if (formData.is_developer !== user.is_developer) updatedFields.is_developer = formData.is_developer;

      if (Object.keys(updatedFields).length === 0) {
        toast.info('Nenhuma alteração detectada');
        onClose();
        return;
      }

      console.log('📝 Atualizando usuário:', { userId: user.id, updates: updatedFields });

      const response = await fetch(`${getApiUrl(`admin/users/${user.id}`)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updatedFields)
      });

      if (!response.ok) {
        if (response.status === 422) {
          const errorData = await response.json();
          if (errorData.errors) {
            setErrors(errorData.errors);
            toast.error('Corrija os erros no formulário');
            return;
          }
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Usuário atualizado:', data.data);
        
        // Chamar callback para atualizar a lista
        onSave(data.data);
        
        toast.success('Usuário atualizado com sucesso!');
        onClose();
      } else {
        throw new Error(data.message || 'Erro ao atualizar usuário');
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCpf = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatWhatsApp = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const getPlanColor = (plan: string) => {
    const colors = {
      'Free': 'bg-gray-100 text-gray-700',
      'Start': 'bg-emerald-100 text-emerald-700',
      'Básico': 'bg-blue-100 text-blue-700',
      'Intermediário': 'bg-green-100 text-green-700',
      'Avançado': 'bg-purple-100 text-purple-700',
      'BIA': 'bg-yellow-100 text-yellow-700'
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-poppins">
            <User className="h-5 w-5 text-[#8B5FBF]" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription className="font-montserrat">
            Altere as informações do usuário, plano e privilégios administrativos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-sm font-medium mb-2">
                Nome Completo *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome do usuário"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block font-montserrat text-sm font-medium mb-2">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block font-montserrat text-sm font-medium mb-2">
                CPF
              </label>
              <Input
                value={formData.cpf}
                onChange={(e) => handleInputChange('cpf', formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
                className={errors.cpf ? 'border-red-500' : ''}
              />
              {errors.cpf && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cpf}
                </p>
              )}
            </div>

            <div>
              <label className="block font-montserrat text-sm font-medium mb-2">
                WhatsApp
              </label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => handleInputChange('whatsapp', formatWhatsApp(e.target.value))}
                placeholder="(11) 99999-9999"
                maxLength={15}
                className={errors.whatsapp ? 'border-red-500' : ''}
              />
              {errors.whatsapp && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.whatsapp}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block font-montserrat text-sm font-medium mb-2">
                Data de Nascimento
              </label>
              <Input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
              />
            </div>
          </div>

          {/* Plano */}
          <div>
            <label className="block font-montserrat text-sm font-medium mb-3">
              Plano do Usuário
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {plans.map((plan) => (
                <div
                  key={plan.value}
                  onClick={() => handleInputChange('plano', plan.value)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.plano === plan.value
                      ? 'border-[#8B5FBF] bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getPlanColor(plan.value)}>
                      {plan.label}
                    </Badge>
                    {plan.value === 'BIA' && <Crown className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <p className="font-montserrat text-xs text-gray-600">
                    {plan.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Privilégios */}
          <div>
            <label className="block font-montserrat text-sm font-medium mb-3">
              Privilégios de Sistema
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-montserrat font-medium">Administrador</p>
                    <p className="font-montserrat text-xs text-gray-600">
                      Acesso ao painel administrativo e gerenciamento de usuários
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => handleInputChange('is_admin', e.target.checked)}
                  className="w-4 h-4 text-[#8B5FBF] border-gray-300 rounded focus:ring-[#8B5FBF]"
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-montserrat font-medium">Desenvolvedor</p>
                    <p className="font-montserrat text-xs text-gray-600">
                      Acesso completo ao sistema e recursos de desenvolvimento
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_developer}
                  onChange={(e) => handleInputChange('is_developer', e.target.checked)}
                  className="w-4 h-4 text-[#8B5FBF] border-gray-300 rounded focus:ring-[#8B5FBF]"
                />
              </div>
            </div>
          </div>

          {/* Informações de Consumo (Read-only) */}
          {user.consumo && user.quotas && (
            <div>
              <label className="block font-montserrat text-sm font-medium mb-3">
                Consumo Atual
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-montserrat text-xs text-gray-600">Ideias</p>
                  <p className="font-poppins font-bold text-lg">
                    {user.consumo.ideas} / {user.quotas.ideas === -1 ? '∞' : user.quotas.ideas}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-montserrat text-xs text-gray-600">Artigos</p>
                  <p className="font-poppins font-bold text-lg">
                    {user.consumo.articles} / {user.quotas.articles === -1 ? '∞' : user.quotas.articles}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-montserrat text-xs text-gray-600">Sites</p>
                  <p className="font-poppins font-bold text-lg">
                    {user.consumo.sites} / {user.quotas.sites === -1 ? '∞' : user.quotas.sites}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-montserrat text-xs text-gray-600">Agendamentos</p>
                  <p className="font-poppins font-bold text-lg">
                    {user.consumo.schedules || 0} / {user.quotas.schedules === -1 ? '∞' : user.quotas.schedules || 0}
                  </p>
                </div>
              </div>
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
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
