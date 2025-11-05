import React from 'react';

interface UserManagementProps {
  onUpdateUser?: (userData: any) => Promise<boolean>;
}

export function UserManagement({ onUpdateUser }: UserManagementProps) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Gerenciamento de Usuários</h2>
      <p>Componente de usuários funcionando!</p>
      <p className="text-sm text-gray-500 mt-2">
        Props recebidas: {onUpdateUser ? 'onUpdateUser definido' : 'onUpdateUser não definido'}
      </p>
    </div>
  );
}
