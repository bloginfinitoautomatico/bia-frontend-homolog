import React, { useState } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { 
  Home, 
  Lightbulb, 
  FileText, 
  Calendar, 
  Clock, 
  History, 
  Trash2, 
  Monitor, 
  ShoppingBag, 
  User, 
  Menu,
  LogOut,
  Settings,
  HelpCircle,
  DollarSign,
  Newspaper
} from './icons';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ConnectivityStatus } from './ConnectivityStatus';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userData: any;
  showAdminAccess?: boolean;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'sites', label: 'Meus Sites', icon: Monitor },
  { id: 'ideas', label: 'Gerar Ideias', icon: Lightbulb },
  { id: 'articles', label: 'Produzir Artigos', icon: FileText },
  { id: 'news', label: 'BIA News', icon: Newspaper },
  { id: 'schedule', label: 'Agendar Posts', icon: Clock },
  { id: 'calendar', label: 'Calendário', icon: Calendar },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'deleted', label: 'Excluídos', icon: Trash2 },
  { id: 'store', label: 'Planos', icon: ShoppingBag },
  { id: 'support', label: 'Suporte', icon: HelpCircle }
];

export function Layout({ children, currentPage, onNavigate, onLogout, userData, showAdminAccess }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-top justify-start">
        <ImageWithFallback
          src="https://bloginfinitoautomatico.com.br/wp-content/uploads/2024/10/logo-bia-1.png"
          alt="BIA - Blog Infinito Automático"
          className="h-20 w-full max-w-[95%] object-contain object-left"
        />
      </div>

      {/* Menu de navegação */}
      <div className="sidebar-nav">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isDisabled = item.id === 'news'; // BIA News está desabilitado
            
            return (
              <li key={item.id}>
                <button
                  className={`sidebar-item group ${isActive ? 'active' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isDisabled && handleNavigate(item.id)}
                  disabled={isDisabled}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isDisabled
                      ? 'text-gray-400'
                      : isActive 
                        ? 'bg-[#8c52ff] text-white' 
                        : 'text-[#8c52ff] group-hover:bg-[#8c52ff] group-hover:text-white'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-poppins text-sm font-medium ${isDisabled ? 'text-gray-400' : ''}`}>
                      {item.label}
                    </span>
                    {isDisabled && (
                      <Badge className="text-xs bg-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-600">
                        EM BREVE
                      </Badge>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer com informações do usuário */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-details">
            <div className="user-name">
              {userData?.name || 'Usuário'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`user-plan ${userData?.plano !== 'Free' ? 'premium' : ''}`}>
                {userData?.plano || 'Free'}
              </div>
              <ConnectivityStatus />
            </div>
          </div>
        </div>

        {/* Minha Conta - sem espaçamento */}
        <button
          className={`sidebar-item group mt-2 ${currentPage === 'account' ? 'active' : ''}`}
          onClick={() => handleNavigate('account')}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
            currentPage === 'account'
              ? 'bg-[#8c52ff] text-white'
              : 'text-[#8c52ff] group-hover:bg-[#8c52ff] group-hover:text-white'
          }`}>
            <User className="w-4 h-4" />
          </div>
          <span className="font-poppins text-sm font-medium">
            Minha Conta
          </span>
        </button>

        <Separator className="my-2 bg-gray-200" />

        <div className="sidebar-actions space-y-1">
          {showAdminAccess && (
            <>
              <button
                className="sidebar-action-btn group"
                onClick={() => handleNavigate('admin')}
              >
                <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors duration-200">
                  <Settings className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </div>
                <span className="font-poppins text-sm text-gray-700 group-hover:text-blue-600">Painel Admin</span>
              </button>
              <button
                className="sidebar-action-btn group"
                onClick={() => handleNavigate('financial')}
              >
                <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center group-hover:bg-green-50 transition-colors duration-200">
                  <DollarSign className="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                </div>
                <span className="font-poppins text-sm text-gray-700 group-hover:text-green-600">Painel Financeiro</span>
              </button>
            </>
          )}
          
          <button
            className="sidebar-action-btn group"
            onClick={onLogout}
          >
            <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center group-hover:bg-red-50 transition-colors duration-200">
              <LogOut className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
            </div>
            <span className="font-poppins text-sm text-gray-700 group-hover:text-red-600">Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-root">
      {/* Sidebar Desktop - mostrar apenas em telas grandes */}
      <aside className="sidebar desktop-sidebar">
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <button className="mobile-menu-trigger">
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-white overflow-y-auto">
          <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
          <SheetDescription className="sr-only">
            Menu principal do sistema BIA com acesso a todas as funcionalidades
          </SheetDescription>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Conteúdo principal */}
      <div className="main-content">
        {/* Header Mobile com logo e avatar */}
        <div className="mobile-header">
          <ImageWithFallback
            src="https://bloginfinitoautomatico.com.br/wp-content/uploads/2024/10/logo-bia-1.png"
            alt="BIA"
            className="h-8 w-auto"
          />
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="font-poppins text-sm font-semibold text-gray-800 truncate max-w-32">
                {userData?.name || 'Usuário'}
              </div>
              <Badge 
                className="text-xs font-montserrat bg-[#8c52ff] text-white hover:bg-[#8c52ff]"
              >
                {userData?.plano || 'Free'}
              </Badge>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src={userData?.avatar} />
              <AvatarFallback className="bg-[#8c52ff] text-white text-xs">
                {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Área de conteúdo */}
        <main className="content-area">
          <div className="container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}