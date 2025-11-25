import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBia } from '../BiaContext';

interface PlanExpirationAlertProps {
  daysUntilExpiration: number;
  planName: string;
  expirationDate: string;
}

export const PlanExpirationAlert: React.FC<PlanExpirationAlertProps> = ({
  daysUntilExpiration,
  planName,
  expirationDate
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  // Salvar no localStorage que o usuário já viu o alerta hoje
  const alertKey = `plan-expiration-alert-${expirationDate}`;
  
  useEffect(() => {
    const lastShown = localStorage.getItem(alertKey);
    const today = new Date().toDateString();
    
    if (lastShown === today) {
      setIsVisible(false);
    }
  }, [alertKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(alertKey, new Date().toDateString());
  };

  const handleRenew = () => {
    navigate('/loja');
  };

  if (!isVisible || daysUntilExpiration > 7) {
    return null;
  }

  const getAlertColor = () => {
    if (daysUntilExpiration <= 3) {
      return 'bg-red-50 border-red-200 text-red-800';
    } else if (daysUntilExpiration <= 5) {
      return 'bg-orange-50 border-orange-200 text-orange-800';
    } else {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getButtonColor = () => {
    if (daysUntilExpiration <= 3) {
      return 'bg-red-600 hover:bg-red-700';
    } else if (daysUntilExpiration <= 5) {
      return 'bg-orange-600 hover:bg-orange-700';
    } else {
      return 'bg-yellow-600 hover:bg-yellow-700';
    }
  };

  return (
    <div className={`fixed top-4 right-4 max-w-md z-50 animate-slide-in-right`}>
      <div className={`${getAlertColor()} border-2 rounded-lg shadow-lg p-4`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1">
            <h3 className="font-poppins font-semibold text-lg mb-1">
              {daysUntilExpiration === 0 ? 'Seu plano expira hoje!' : 
               daysUntilExpiration === 1 ? 'Seu plano expira amanhã!' :
               `Seu plano expira em ${daysUntilExpiration} dias`}
            </h3>
            
            <p className="font-montserrat text-sm mb-3">
              Seu plano <span className="font-semibold">{planName}</span> expira em{' '}
              <span className="font-semibold">{new Date(expirationDate).toLocaleDateString('pt-BR')}</span>.
              Renove agora para continuar aproveitando todos os benefícios!
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={handleRenew}
                className={`${getButtonColor()} text-white px-4 py-2 rounded-lg font-poppins font-medium text-sm transition-colors`}
              >
                Renovar Agora
              </button>
              
              <button
                onClick={handleDismiss}
                className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg font-montserrat text-sm transition-colors"
              >
                Lembrar depois
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar alerta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const usePlanExpiration = () => {
  const { state } = useBia();
  const { user } = state;
  const [expirationInfo, setExpirationInfo] = useState<{
    shouldShowAlert: boolean;
    daysUntilExpiration: number;
    planName: string;
    expirationDate: string;
  } | null>(null);

  useEffect(() => {
    const checkPlanExpiration = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        const response = await fetch(`${apiUrl}/api/user/plan-expiration`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.has_active_plan && data.should_alert) {
            setExpirationInfo({
              shouldShowAlert: true,
              daysUntilExpiration: data.days_until_expiration,
              planName: data.plan_name,
              expirationDate: data.expiration_date
            });
          } else {
            setExpirationInfo(null);
          }
        } else {
          // Sem assinatura ativa ou erro - não mostrar alerta
          setExpirationInfo(null);
        }
      } catch (error) {
        console.error('Erro ao verificar expiração do plano:', error);
        setExpirationInfo(null);
      }
    };

    if (user) {
      checkPlanExpiration();
    }
  }, [user]);

  return expirationInfo;
};
