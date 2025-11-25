import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { EditUserModal } from './EditUserModal';
import { ManageCreditsModal } from './ManageCreditsModal';
import { 
  Users, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Plus, 
  UserPlus, 
  Crown,
  Shield,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  CreditCard
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

interface AdminUsersProps {
  onUpdateUser?: (userData: any) => Promise<boolean>;
}

export function AdminUsers({ onUpdateUser }: AdminUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para o modal de edição
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Estados para o modal de créditos
  const [managingCreditsUser, setManagingCreditsUser] = useState<User | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  // Carregar usuários do Laravel
  useEffect(() => {
    loadUsers();
  }, []);

  // Filtrar usuários quando os filtros mudarem
  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, selectedPlan, selectedStatus]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('👥 Carregando lista de usuários do Laravel...');

      const token = localStorage.getItem('auth_token');

      // Construir parâmetros de filtro
      const params = new URLSearchParams();
      if (selectedPlan !== 'all') params.append('plan', selectedPlan);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${getApiUrl('admin/users')}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso negado. Você não tem permissão de administrador.');
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Usuários carregados:', data);

      if (data.success) {
        // O Laravel retorna dados paginados
        const usersData = data.data?.data || data.data || [];
        setUsers(usersData);
        setFilteredUsers(usersData);
        toast.success(`${usersData.length} usuários carregados com sucesso`);
      } else {
        throw new Error(data.message || 'Erro ao carregar usuários');
      }

    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar usuários');
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por plano
    if (selectedPlan !== 'all') {
      filtered = filtered.filter(user => user.plano === selectedPlan);
    }

    // Filtro por status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(user => {
        const isActive = user.email_verified_at !== null;
        return selectedStatus === 'active' ? isActive : !isActive;
      });
    }

    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${getApiUrl(`admin/users/${user.id}`)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Usuário excluído com sucesso');
        loadUsers(); // Recarregar lista
      } else {
        throw new Error(data.message || 'Erro ao excluir usuário');
      }

    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = (updatedUser: User) => {
    // Atualizar a lista local de usuários
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    );
    
    // Aplicar filtros novamente
    filterUsers();
    
    // Chamar callback se fornecido
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
  };

  const handleManageCredits = (user: User) => {
    setManagingCreditsUser(user);
    setIsCreditModalOpen(true);
  };

  const handleCloseCreditModal = () => {
    setIsCreditModalOpen(false);
    setManagingCreditsUser(null);
  };

  const handleSaveCredits = (updatedUser: User) => {
    // Atualizar a lista local de usuários
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    );
    
    // Aplicar filtros novamente
    filterUsers();
    
    // Chamar callback se fornecido
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B5FBF]" />
        <span className="ml-2 font-montserrat">Carregando usuários...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-poppins text-2xl font-bold">Gerenciar Usuários</h2>
          <p className="font-montserrat text-gray-600">
            Gerencie todos os usuários do sistema BIA
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={loadUsers}
            disabled={isLoading}
            className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="font-montserrat text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">Todos os Planos</option>
                <option value="Free">Free</option>
                <option value="Start">Start</option>
                <option value="Básico">Básico</option>
                <option value="Intermediário">Intermediário</option>
                <option value="Avançado">Avançado</option>
                <option value="BIA">BIA</option>
              </select>
            </div>
            
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            <div className="flex items-center">
              <span className="font-montserrat text-sm text-gray-600">
                {filteredUsers.length} usuário(s) encontrado(s)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[#8B5FBF] text-white rounded-full flex items-center justify-center font-poppins font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div>
                      <h3 className="font-poppins font-semibold flex items-center gap-2">
                        {user.name}
                        {user.is_admin && (
                          <Shield className="h-4 w-4 text-red-500" />
                        )}
                        {user.is_developer && (
                          <Star className="h-4 w-4 text-orange-500" />
                        )}
                      </h3>
                      <p className="font-montserrat text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getPlanColor(user.plano)}>
                      {user.plano}
                    </Badge>
                    
                    <Badge className={user.email_verified_at ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {user.email_verified_at ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </div>

                  {/* Informações de Consumo */}
                  {user.consumo && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-montserrat text-gray-500">Ideias:</span>
                        <span className="ml-1 font-medium">
                          {user.consumo.ideas} / {user.quotas?.ideas === -1 ? '∞' : user.quotas?.ideas}
                        </span>
                      </div>
                      <div>
                        <span className="font-montserrat text-gray-500">Artigos:</span>
                        <span className="ml-1 font-medium">
                          {user.consumo.articles} / {user.quotas?.articles === -1 ? '∞' : user.quotas?.articles}
                        </span>
                      </div>
                      <div>
                        <span className="font-montserrat text-gray-500">Sites:</span>
                        <span className="ml-1 font-medium">
                          {user.consumo.sites} / {user.quotas?.sites === -1 ? '∞' : user.quotas?.sites}
                        </span>
                      </div>
                      <div>
                        <span className="font-montserrat text-gray-500">Agendamentos:</span>
                        <span className="ml-1 font-medium">
                          {user.consumo.schedules} / {user.quotas?.schedules === -1 ? '∞' : user.quotas?.schedules}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2">
                    <span className="font-montserrat text-xs text-gray-500">
                      Cadastrado em: {formatDate(user.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEditUser(user)}
                    className="bg-purple-600 text-white hover:bg-purple-700 px-3 py-1 text-sm"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>

                  <Button
                    onClick={() => handleManageCredits(user)}
                    className="bg-orange-500 text-white hover:bg-orange-600 px-3 py-1 text-sm"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Créditos
                  </Button>
                  
                  <Button
                    onClick={() => handleDeleteUser(user)}
                    className="bg-red-500 text-white hover:bg-red-600 px-3 py-1 text-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-poppins text-lg font-medium text-gray-900 mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="font-montserrat text-gray-600">
                Ajuste os filtros para encontrar usuários ou verifique se existem usuários cadastrados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Edição */}
      <EditUserModal
        user={editingUser}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveUser}
      />

      {/* Modal de Gerenciamento de Créditos */}
      <ManageCreditsModal
        user={managingCreditsUser}
        isOpen={isCreditModalOpen}
        onClose={handleCloseCreditModal}
        onSave={handleSaveCredits}
      />
    </div>
  );
}
