import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Plus, 
  Monitor, 
  Calendar,
  CalendarDays,
  History,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw,
  ExternalLink,
  AlertCircle,
  Loader2,
  Globe,
  Users,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Copy,
  RefreshCw,
  Clock,
  DollarSign,
  Receipt
} from 'lucide-react';
import { useBia } from './BiaContext';
import { toast } from 'sonner';

// Componente Agendar Posts
export function AgendarPosts({ userData }: { userData: any }) {
  const { state, actions } = useBia();
  const [formData, setFormData] = useState({
    total: Math.min(10, state.temas.filter(t => t.status === 'Produzido').length),
    quantidade: 1,
    frequencia: 'diaria',
    horario: '08:00'
  });

  const producedCount = state.temas.filter(t => t.status === 'Produzido').length;
  const isLoading = actions.isLoadingState('schedulePost');
  const error = state.errors.schedulePost;

  const handleSchedule = async () => {
    if (error) {
      actions.clearError('schedulePost');
    }
    await actions.schedulePost(formData);
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'diaria': return 'Diário';
      case 'semanal': return 'Semanal';
      case 'mensal': return 'Mensal';
      default: return freq;
    }
  };

  const calculateEndDate = () => {
    if (formData.total === 0) return null;
    const days = formData.total * (formData.frequencia === 'diaria' ? 1 : formData.frequencia === 'semanal' ? 7 : 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-3xl text-black mb-2">Agendar Posts</h1>
        <p className="font-montserrat text-gray-600">Configure o agendamento automático dos seus posts</p>
      </div>

      {producedCount === 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Você precisa ter artigos <strong>produzidos</strong> antes de agendá-los. 
            Vá para "Produzir Artigos" primeiro.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="font-poppins text-xl text-black flex items-center space-x-2">
              <Calendar size={20} className="text-current" />
              <span>Configurações de Agendamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total" className="font-montserrat">Quantidade Total de Posts</Label>
              <Input
                id="total"
                type="number"
                min="1"
                max={producedCount}
                value={formData.total}
                onChange={(e) => setFormData({...formData, total: parseInt(e.target.value) || 1})}
                className="font-montserrat"
                disabled={isLoading || producedCount === 0}
              />
              <p className="font-montserrat text-sm text-gray-500">
                {producedCount} artigos produzidos disponíveis
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade" className="font-montserrat">Posts por Período</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                max="5"
                value={formData.quantidade}
                onChange={(e) => setFormData({...formData, quantidade: parseInt(e.target.value) || 1})}
                className="font-montserrat"
                disabled={isLoading}
              />
              <p className="font-montserrat text-sm text-gray-500">
                Quantos posts publicar por {formData.frequencia.replace('a', 'o')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequencia" className="font-montserrat">Frequência</Label>
              <Select 
                value={formData.frequencia} 
                onValueChange={(value) => setFormData({...formData, frequencia: value})}
                disabled={isLoading}
              >
                <SelectTrigger className="font-montserrat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario" className="font-montserrat">Horário de Publicação</Label>
              <Input
                id="horario"
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({...formData, horario: e.target.value})}
                className="font-montserrat"
                disabled={isLoading}
              />
              <p className="font-montserrat text-sm text-gray-500">
                Horário padrão para todas as publicações
              </p>
            </div>

            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  <span className="font-montserrat text-sm text-gray-600">Agendando posts...</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleSchedule}
              disabled={isLoading || producedCount === 0 || formData.total > producedCount}
              className="w-full font-montserrat btn-bia"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Calendar className="mr-2" size={16} />
                  Agendar {formData.total} Posts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Prévia do agendamento */}
        <Card className="border border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="font-poppins text-xl text-blue-800">Prévia do Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-montserrat text-sm text-blue-700">Total de posts:</span>
                <span className="font-montserrat text-sm font-medium text-blue-800">{formData.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-montserrat text-sm text-blue-700">Frequência:</span>
                <span className="font-montserrat text-sm font-medium text-blue-800">{getFrequencyLabel(formData.frequencia)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-montserrat text-sm text-blue-700">Posts por período:</span>
                <span className="font-montserrat text-sm font-medium text-blue-800">{formData.quantidade}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-montserrat text-sm text-blue-700">Horário:</span>
                <span className="font-montserrat text-sm font-medium text-blue-800">{formData.horario}</span>
              </div>
              {calculateEndDate() && (
                <div className="flex justify-between">
                  <span className="font-montserrat text-sm text-blue-700">Término previsto:</span>
                  <span className="font-montserrat text-sm font-medium text-blue-800">{calculateEndDate()}</span>
                </div>
              )}
            </div>

            <div className="border-t border-blue-200 pt-4">
              <h4 className="font-montserrat font-medium text-blue-800 mb-2">Cronograma:</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                <li>• Primeiro post: Amanhã às {formData.horario}</li>
                <li>• Publicação {formData.frequencia}</li>
                <li>• {formData.quantidade} post(s) por vez</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts agendados existentes */}
      {state.posts.filter(p => p.status === 'scheduled').length > 0 && (
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="font-poppins text-xl text-black">
              Posts Já Agendados ({state.posts.filter(p => p.status === 'scheduled').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.posts
                .filter(p => p.status === 'scheduled')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map(post => (
                  <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-montserrat text-sm font-medium text-black">{post.title}</p>
                      <p className="font-montserrat text-xs text-gray-600">
                        {new Date(post.date).toLocaleDateString('pt-BR')} às {formData.horario}
                      </p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">
                      <Calendar size={12} className="mr-1" />
                      Agendado
                    </Badge>
                  </div>
                ))}
              {state.posts.filter(p => p.status === 'scheduled').length > 5 && (
                <p className="font-montserrat text-sm text-gray-500 text-center pt-2">
                  E mais {state.posts.filter(p => p.status === 'scheduled').length - 5} posts...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente Calendário
export function Calendario({ userData }: { userData: any }) {
  const { state } = useBia();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getPostsForDay = (day: number) => {
    return state.posts.filter(post => {
      const postDate = new Date(post.date);
      return postDate.getDate() === day && 
             postDate.getMonth() === currentDate.getMonth() &&
             postDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Dias vazios no início
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200 bg-gray-50"></div>);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayPosts = getPostsForDay(day);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const isPast = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) < new Date();

      days.push(
        <div 
          key={day} 
          className={`h-24 border border-gray-200 p-2 overflow-y-auto ${
            isToday ? 'bg-blue-50 border-blue-300' : isPast ? 'bg-gray-50' : 'bg-white'
          } hover:bg-gray-100 transition-colors cursor-pointer`}
        >
          <div className={`font-montserrat text-sm font-medium mb-1 ${
            isToday ? 'text-blue-800' : isPast ? 'text-gray-500' : 'text-black'
          }`}>
            {day}
            {isToday && <span className="ml-1 text-xs">(Hoje)</span>}
          </div>
          {dayPosts.map(post => (
            <div 
              key={post.id} 
              className={`text-xs p-1 mb-1 rounded truncate cursor-pointer hover:opacity-80 ${
                post.status === 'published' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-purple-100 text-purple-800'
              }`}
              title={`${post.title} - ${post.status}`}
            >
              {post.title}
            </div>
          ))}
          {dayPosts.length > 2 && (
            <div className="text-xs text-gray-500">
              +{dayPosts.length - 2} mais
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Juli', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const scheduledCount = state.posts.filter(p => p.status === 'scheduled').length;
  const publishedCount = state.posts.filter(p => p.status === 'published').length;

  const upcomingPosts = state.posts
    .filter(p => p.status === 'scheduled' && new Date(p.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-poppins text-3xl text-black mb-2">Calendário</h1>
          <p className="font-montserrat text-gray-600">
            Visualize seus posts ({scheduledCount} agendados, {publishedCount} publicados)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-32 font-montserrat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="list">Lista</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="font-montserrat border border-gray-200 px-3 py-1 rounded"
          >
            ← Anterior
          </Button>
          <span className="font-poppins text-lg text-black min-w-48 text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <Button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="font-montserrat border border-gray-200 px-3 py-1 rounded"
          >
            Próximo →
          </Button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <Card className="border border-gray-200">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 gap-0">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="h-12 flex items-center justify-center bg-gray-100 border border-gray-200">
                  <span className="font-montserrat text-sm font-medium text-gray-700">{day}</span>
                </div>
              ))}
              {renderCalendar()}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="font-poppins text-xl text-black">Próximos Posts</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingPosts.length > 0 ? (
                <div className="space-y-3">
                  {upcomingPosts.map(post => (
                    <div key={post.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h3 className="font-montserrat font-medium text-black">{post.title}</h3>
                        <p className="font-montserrat text-sm text-gray-600">
                          {new Date(post.date).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">
                        <Calendar size={12} className="mr-1" />
                        Agendado
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="font-montserrat text-gray-600">Nenhum post agendado</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="font-poppins text-xl text-black">Posts Publicados Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {publishedCount > 0 ? (
                <div className="space-y-3">
                  {state.posts
                    .filter(p => p.status === 'published')
                    .slice(0, 5)
                    .map(post => (
                      <div key={post.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <h3 className="font-montserrat font-medium text-black">{post.title}</h3>
                          <p className="font-montserrat text-sm text-gray-600">
                            {new Date(post.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle size={12} className="mr-1" />
                          Publicado
                        </Badge>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="font-montserrat text-gray-600">Nenhum post publicado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded"></div>
            <span className="font-montserrat text-sm text-gray-600">Publicado ({publishedCount})</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
            <span className="font-montserrat text-sm text-gray-600">Agendado ({scheduledCount})</span>
          </div>
        </div>
        
        {state.posts.length === 0 && (
          <div className="text-right">
            <p className="font-montserrat text-sm text-gray-500">
              Use "Agendar Posts" para começar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente Histórico
export function Historico({ userData }: { userData: any }) {
  const { state } = useBia();
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'published' | 'scheduled'>('all');

  const getFilteredPosts = () => {
    let filtered = [...state.temas.filter(t => t.status === 'Publicado')];

    // Ordenar
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => a.tema.localeCompare(b.tema));
    }

    return filtered;
  };

  const publishedTemas = getFilteredPosts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-poppins text-3xl text-black mb-2">Histórico</h1>
          <p className="font-montserrat text-gray-600">Acompanhe todos os temas já processados</p>
        </div>
        <div className="flex space-x-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40 font-montserrat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="title">Título</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="font-poppins text-xl text-black flex items-center space-x-2">
            <History size={20} style={{ color: '#8B5FBF' }} />
            <span>Histórico de Temas ({publishedTemas.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {publishedTemas.length > 0 ? (
            <div className="space-y-4">
              {publishedTemas.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-montserrat font-medium text-black mb-2">{item.tema}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Publicado:</span><br />
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Nicho:</span><br />
                        {item.nicho}
                      </div>
                      <div>
                        <span className="font-medium">Palavras-chave:</span><br />
                        {item.palavrasChave}
                      </div>
                      <div>
                        <span className="font-medium">Idioma:</span><br />
                        {item.idioma}
                      </div>
                    </div>
                    {item.content && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="font-montserrat text-sm text-gray-700 line-clamp-2">
                          {item.content.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <Badge className="font-montserrat text-white bg-green-600">
                      <CheckCircle className="mr-1" size={12} />
                      Publicado
                    </Badge>
                    {item.link && (
                      <Button
                        className="font-montserrat border px-2 py-1 rounded text-sm"
                        onClick={() => window.open(item.link, '_blank')}
                      >
                        <ExternalLink className="mr-1" size={14} />
                        Ver Artigo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="font-poppins text-lg text-gray-600 mb-2">Nenhum tema no histórico</h3>
              <p className="font-montserrat text-gray-500 mb-4">
                Publique alguns artigos para vê-los aparecer aqui.
              </p>
              <Button 
                className="font-montserrat btn-bia"
                onClick={() => window.location.hash = 'articles'}
              >
                Ir para Artigos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas do histórico */}
      {publishedTemas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <CheckCircle size={24} className="mx-auto text-blue-600 mb-2" />
              <p className="font-poppins text-2xl text-blue-800">{publishedTemas.length}</p>
              <p className="font-montserrat text-sm text-blue-600">Total Publicado</p>
            </CardContent>
          </Card>
          <Card className="border border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <CalendarDays size={24} className="mx-auto text-green-600 mb-2" />
              <p className="font-poppins text-2xl text-green-800">
                {publishedTemas.filter(t => {
                  const publishDate = new Date(t.publishedAt || t.createdAt);
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return publishDate >= thirtyDaysAgo;
                }).length}
              </p>
              <p className="font-montserrat text-sm text-green-600">Últimos 30 dias</p>
            </CardContent>
          </Card>
          <Card className="border border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <Globe size={24} className="mx-auto text-purple-600 mb-2" />
              <p className="font-poppins text-2xl text-purple-800">
                {new Set(publishedTemas.map(t => t.idioma)).size}
              </p>
              <p className="font-montserrat text-sm text-purple-600">Idiomas Diferentes</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Componente Excluídos
export function Excluidos({ userData }: { userData: any }) {
  const { state, actions } = useBia();
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

  const handleRestore = (id: number) => {
    if (confirm('Tem certeza que deseja restaurar este tema?')) {
      actions.restoreTema(id);
    }
  };

  const handlePermanentDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este tema? Esta ação não pode ser desfeita.')) {
      // Implementar exclusão permanente se necessário
      toast.info('Funcionalidade de exclusão permanente não implementada');
    }
  };

  const getSortedTemas = () => {
    const sorted = [...state.temasExcluidos];
    if (sortBy === 'date') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      sorted.sort((a, b) => a.tema.localeCompare(b.tema));
    }
    return sorted;
  };

  const sortedTemas = getSortedTemas();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-poppins text-3xl text-black mb-2">Excluídos</h1>
          <p className="font-montserrat text-gray-600">Gerencie conteúdos excluídos e restaure quando necessário</p>
        </div>
        <div className="flex space-x-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-40 font-montserrat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="title">Título</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="font-poppins text-xl text-black flex items-center space-x-2">
            <Trash2 size={20} className="text-current" />
            <span>Conteúdos Excluídos ({state.temasExcluidos.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTemas.length > 0 ? (
            <div className="space-y-4">
              {sortedTemas.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-montserrat font-medium text-black mb-2">{item.tema}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Excluído em:</span><br />
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        <span className="font-medium">Status anterior:</span><br />
                        <Badge className={`text-xs ${
                          item.status === 'Produzido' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Nicho:</span><br />
                        {item.nicho}
                      </div>
                      <div>
                        <span className="font-medium">Palavras-chave:</span><br />
                        {item.palavrasChave}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Badge className="font-montserrat text-white bg-red-600">
                      <XCircle className="mr-1" size={12} />
                      Excluído
                    </Badge>
                    <Button
                      onClick={() => handleRestore(item.id)}
                      className="font-montserrat border px-2 py-1 rounded text-sm hover:bg-green-50 hover:border-green-300"
                    >
                      <RotateCcw className="mr-1" size={14} />
                      Restaurar
                    </Button>
                    <Button
                      onClick={() => handlePermanentDelete(item.id)}
                      className="font-montserrat bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      <Trash2 className="mr-1" size={14} />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trash2 size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="font-poppins text-lg text-gray-600 mb-2">Nenhum conteúdo excluído</h3>
              <p className="font-montserrat text-gray-500">
                Os temas excluídos aparecerão aqui e poderão ser restaurados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas dos excluídos */}
      {sortedTemas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <Trash2 size={24} className="mx-auto text-red-600 mb-2" />
              <p className="font-poppins text-2xl text-red-800">{sortedTemas.length}</p>
              <p className="font-montserrat text-sm text-red-600">Total Excluído</p>
            </CardContent>
          </Card>
          <Card className="border border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 text-center">
              <Clock size={24} className="mx-auto text-yellow-600 mb-2" />
              <p className="font-poppins text-2xl text-yellow-800">
                {sortedTemas.filter(t => t.status === 'Pendente').length}
              </p>
              <p className="font-montserrat text-sm text-yellow-600">Eram Pendentes</p>
            </CardContent>
          </Card>
          <Card className="border border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <CheckCircle size={24} className="mx-auto text-purple-600 mb-2" />
              <p className="font-poppins text-2xl text-purple-800">
                {sortedTemas.filter(t => t.status === 'Produzido').length}
              </p>
              <p className="font-montserrat text-sm text-purple-600">Eram Produzidos</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Componente Meus Sites - Funcional
export function MeusSites({ userData }: { userData: any }) {
  const { state, actions } = useBia();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSite, setNewSite] = useState({ 
    name: '', 
    url: '',
    status: 'Ativo' as const, 
    articles: 0, 
    lastPost: 'Nunca' 
  });

  const handleAddSite = () => {
    if (!newSite.name.trim()) {
      toast.error('Nome do site é obrigatório');
      return;
    }
    
    if (newSite.url && !newSite.url.startsWith('http')) {
      toast.error('URL deve começar com http:// ou https://');
      return;
    }
    
    actions.addSite(newSite);
    setNewSite({ name: '', url: '', status: 'Ativo', articles: 0, lastPost: 'Nunca' });
    setShowAddForm(false);
  };

  const handleToggleStatus = (site: any) => {
    const newStatus = site.status === 'Ativo' ? 'Pausado' : 'Ativo';
    actions.updateSite({ ...site, status: newStatus });
  };

  const handleRemoveSite = (siteId: number) => {
    if (confirm('Tem certeza que deseja remover este site?')) {
      actions.removeSite(siteId);
    }
  };

  const activeSites = state.sites.filter(s => s.status === 'Ativo');
  const pausedSites = state.sites.filter(s => s.status === 'Pausado');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-poppins text-3xl text-black mb-2">Meus Sites</h1>
          <p className="font-montserrat text-gray-600">Gerencie seus sites conectados ao BIA</p>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="font-montserrat text-white" 
          style={{ backgroundColor: '#8B5FBF' }}
        >
          <Plus className="mr-2" size={16} />
          Conectar Site
        </Button>
      </div>

      {/* Estatísticas dos sites */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <Monitor size={24} className="mx-auto text-green-600 mb-2" />
            <p className="font-poppins text-2xl text-green-800">{activeSites.length}</p>
            <p className="font-montserrat text-sm text-green-600">Sites Ativos</p>
          </CardContent>
        </Card>
        <Card className="border border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <XCircle size={24} className="mx-auto text-yellow-600 mb-2" />
            <p className="font-poppins text-2xl text-yellow-800">{pausedSites.length}</p>
            <p className="font-montserrat text-sm text-yellow-600">Sites Pausados</p>
          </CardContent>
        </Card>
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <FileText size={24} className="mx-auto text-blue-600 mb-2" />
            <p className="font-poppins text-2xl text-blue-800">
              {state.sites.reduce((acc, site) => acc + site.articles, 0)}
            </p>
            <p className="font-montserrat text-sm text-blue-600">Total de Artigos</p>
          </CardContent>
        </Card>
      </div>

      {showAddForm && (
        <Card className="border border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="font-poppins text-lg text-black">Conectar Novo Site</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName" className="font-montserrat">Nome do Site *</Label>
                <Input
                  id="siteName"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  placeholder="Ex: MeuBlog.com"
                  className="font-montserrat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteUrl" className="font-montserrat">URL do Site</Label>
                <Input
                  id="siteUrl"
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                  placeholder="https://meublog.com"
                  className="font-montserrat"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteStatus" className="font-montserrat">Status</Label>
              <Select value={newSite.status} onValueChange={(value) => setNewSite({ ...newSite, status: value as 'Ativo' | 'Pausado' })}>
                <SelectTrigger className="font-montserrat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleAddSite} className="font-montserrat text-white btn-bia">
                <Plus className="mr-2 text-current" size={16} />
                Conectar
              </Button>
              <Button onClick={() => setShowAddForm(false)} className="font-montserrat border px-2 py-1 rounded">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {state.sites.map((site) => (
          <Card key={site.id} className="border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Monitor size={24} className="text-current" />
                  <div>
                    <h3 className="font-poppins text-lg text-black">{site.name}</h3>
                    {site.url && (
                      <p className="font-montserrat text-sm text-blue-600 hover:underline">
                        <a href={site.url} target="_blank" rel="noopener noreferrer">{site.url}</a>
                      </p>
                    )}
                    <p className="font-montserrat text-sm text-gray-600">
                      {site.articles} artigos • Último post: {site.lastPost}
                    </p>
                    <p className="font-montserrat text-xs text-gray-500">
                      Conectado em: {new Date(site.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge className={`font-montserrat text-white ${
                    site.status === 'Ativo' ? 'bg-green-600' : 'bg-yellow-600'
                  }`}>
                    {site.status === 'Ativo' ? (
                      <CheckCircle className="mr-1" size={12} />
                    ) : (
                      <XCircle className="mr-1" size={12} />
                    )}
                    {site.status}
                  </Badge>
                  <Button
                    onClick={() => handleToggleStatus(site)}
                    className="font-montserrat border px-2 py-1 rounded text-sm"
                  >
                    {site.status === 'Ativo' ? 'Pausar' : 'Ativar'}
                  </Button>
                  {site.url && (
                    <Button
                      className="font-montserrat border px-2 py-1 rounded text-sm"
                      onClick={() => window.open(site.url, '_blank')}
                    >
                      <ExternalLink size={14} className="mr-1" />
                      Visitar
                    </Button>
                  )}
                  <Button
                    onClick={() => handleRemoveSite(site.id)}
                    className="font-montserrat bg-red-600 text-white px-2 py-1 rounded text-sm"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {state.sites.length === 0 && (
        <Card className="border border-gray-200">
          <CardContent className="text-center py-12">
            <Monitor size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="font-poppins text-lg text-gray-600 mb-2">Nenhum site conectado</h3>
            <p className="font-montserrat text-gray-500 mb-4">
              Conecte seu primeiro site para começar a automatizar a publicação de conteúdo.
            </p>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="font-montserrat btn-bia" 
            >
              <Plus className="mr-2 text-current" size={16} />
              Conectar Primeiro Site
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componentes LojaBIA e Maisfy permanecem os mesmos do arquivo anterior...
export function LojaBIA({ userData }: { userData: any }) {
  const plans = [
    {
      name: '5 Sites',
      price: 'R$ 197',
      originalPrice: 'R$ 497',
      features: ['Download Imediato', 'Atualizações por 1 ano', 'Artigos ilimitados', 'Suporte WhatsApp 24/7'],
      popular: true,
      link: 'https://bloginfinitoautomatico.com.br/cart/?add-to-cart=3379&quantity=1'
    },
    {
      name: '20 Sites',
      price: 'R$ 497',
      originalPrice: 'R$ 997',
      features: ['Tudo do plano anterior', 'Modelo de Blog Pronto', '20 sites conectados'],
      popular: false,
      link: 'https://bloginfinitoautomatico.com.br/checkout/?add-to-cart=1971&quantity=1'
    },
    {
      name: 'Sites Ilimitados',
      price: 'R$ 997',
      originalPrice: 'R$ 1.997',
      features: ['Tudo dos planos anteriores', 'Sites ilimitados', 'Suporte prioritário'],
      popular: false,
      link: 'https://bloginfinitoautomatico.com.br/checkout/?add-to-cart=1972&quantity=1'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-3xl text-black mb-2">Loja da BIA</h1>
        <p className="font-montserrat text-gray-600">Explore recursos e planos premium</p>
      </div>

      {/* Banner promocional */}
      <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6 text-center">
          <h2 className="font-poppins text-2xl text-purple-800 mb-2">🚀 Turbine seu plano BIA!</h2>
          <p className="font-montserrat text-purple-700 mb-4">
            Aumente sua capacidade de produção e conecte mais sites
          </p>
          <Badge className="bg-red-500 text-white">Oferta Limitada</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <Card key={index} className={`border ${plan.popular ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'} relative hover:shadow-lg transition-shadow`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-purple-600 text-white font-montserrat">🔥 Preferido</Badge>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="font-poppins text-xl" style={{ color: '#8B5FBF' }}>
                {plan.name}
              </CardTitle>
              <div className="space-y-1">
                <p className="font-montserrat text-sm text-gray-500 line-through">{plan.originalPrice}</p>
                <p className="font-poppins text-3xl text-black">{plan.price}</p>
                <p className="font-montserrat text-xs text-gray-500">LICENÇA ANUAL</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="font-montserrat text-sm text-black flex items-center">
                    <CheckCircle className="mr-2 text-green-600" size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                  className="w-full font-montserrat text-white hover:opacity-90 transition-opacity btn-bia"
                  onClick={() => {
                    window.open(plan.link, '_blank');
                    toast.success('Redirecionando para checkout...');
                  }}
                >
                <ShoppingCart className="mr-2" size={16} />
                Quero Este Plano
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Produtos adicionais */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="font-poppins text-xl text-black text-center">
            Outros Produtos da Maisfy
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="text-4xl mb-2">📱</div>
            <h3 className="font-poppins text-lg text-red-700">Viral Fácil</h3>
            <p className="font-montserrat text-sm text-red-600">
              Automatize seu Instagram e cresça com conteúdo viral
            </p>
            <Button 
              className="font-montserrat bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                window.open('https://viralfacil.com.br/', '_blank');
                toast.info('Redirecionando para Viral Fácil...');
              }}
            >
              Conhecer Viral Fácil
            </Button>
          </div>
          <div className="text-center space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="text-4xl mb-2">💬</div>
            <h3 className="font-poppins text-lg text-blue-700">LeadCenter</h3>
            <p className="font-montserrat text-sm text-blue-600">
              Chatbot inteligente para atender leads 24h/dia
            </p>
            <Button 
              className="font-montserrat bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => {
                window.open('https://app.leadcenter.com.br/signup', '_blank');
                toast.info('Redirecionando para LeadCenter...');
              }}
            >
              Criar Conta Grátis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modelo de Blog Pronto */}
      <Card className="border border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <h3 className="font-poppins text-xl text-green-800 mb-4">
            🎨 Modelo de Blog Pronto
          </h3>
          <p className="font-montserrat text-green-700 mb-4">
            Template profissional pronto para usar com a BIA
          </p>
          <Button 
            className="font-montserrat bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              window.open('https://bloginfinitoautomatico.com.br/checkout/?add-to-cart=3594&quantity=1', '_blank');
              toast.success('Redirecionando para checkout...');
            }}
          >
            <ExternalLink className="mr-2" size={16} />
            Ver Modelo de Blog - R$ 197
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function Maisfy({ userData }: { userData: any }) {
  const benefits = [
    {
      icon: '💰',
      title: 'Comissões Atrativas',
      description: 'Ganhe até 50% de comissão em cada venda realizada'
    },
    {
      icon: '📊',
      title: 'Materiais Prontos',
      description: 'Acesse banners, vídeos e conteúdos para divulgação'
    },
    {
      icon: '🎯',
      title: 'Suporte Dedicado',
      description: 'Equipe especializada para ajudar você a vender mais'
    },
    {
      icon: '📈',
      title: 'Dashboard Completo',
      description: 'Acompanhe suas vendas e comissões em tempo real'
    },
    {
      icon: '🚀',
      title: 'Produtos Quentes',
      description: 'Promova produtos digitais com alta conversão'
    },
    {
      icon: '⚡',
      title: 'Pagamento Rápido',
      description: 'Receba suas comissões semanalmente via PIX'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-3xl text-black mb-2">Programa de Afiliados Maisfy</h1>
        <p className="font-montserrat text-gray-600">Torne-se um afiliado e ganhe comissões promovendo produtos digitais</p>
      </div>

      {/* Hero Section */}
      <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🤝</div>
          <h2 className="font-poppins text-3xl text-purple-800 mb-4">
            Ganhe Dinheiro Indicando a BIA!
          </h2>
          <p className="font-montserrat text-lg text-purple-700 mb-6">
            Junte-se ao programa de afiliados mais lucrativo do mercado digital brasileiro
          </p>
          <Button 
            size="lg"
            className="font-montserrat text-white text-lg px-8 py-4"
            style={{ backgroundColor: '#8B5FBF' }}
            onClick={() => {
              window.open('https://maisfy.com.br/convite/produto/Ld2f8531', '_blank');
              toast.success('Redirecionando para cadastro...');
            }}
          >
            <Users className="mr-2" size={20} />
            Quero Ser Afiliado Agora
          </Button>
        </CardContent>
      </Card>

      {/* Benefícios */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="font-poppins text-xl text-black text-center">
            Por que escolher a Maisfy?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="text-3xl mb-3">{benefit.icon}</div>
                <h4 className="font-montserrat font-medium text-black mb-2">{benefit.title}</h4>
                <p className="font-montserrat text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Produtos para promover */}
      <Card className="border border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="font-poppins text-xl text-blue-800">
            Produtos em Destaque para Promover
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-poppins font-medium text-black mb-2">BIA - Blog Infinito Automático</h4>
              <p className="font-montserrat text-sm text-gray-600 mb-3">
                Plugin WordPress para automação de conteúdo com IA
              </p>
              <div className="flex justify-between items-center">
                <Badge className="bg-green-100 text-green-800">Até 50% comissão</Badge>
                <span className="font-montserrat text-sm text-blue-600">R$ 197 - R$ 997</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-poppins font-medium text-black mb-2">Viral Fácil</h4>
              <p className="font-montserrat text-sm text-gray-600 mb-3">
                Automatize seu Instagram e cresça com conteúdo viral
              </p>
              <div className="flex justify-between items-center">
                <Badge className="bg-blue-100 text-blue-800">Automação</Badge>
                <Button
                  className="font-montserrat bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={() => {
                    window.open('https://viralfacil.com.br/', '_blank');
                    toast.info('Redirecionando para Viral Fácil...');
                  }}
                >
                  Conhecer Viral Fácil
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MinhasCompras({ userData }: { userData: any }) {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompras = async () => {
      try {
        const response = await fetch('/api/user/compras', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCompras(data.compras || []);
        } else {
          console.error('Erro ao buscar compras:', response.statusText);
        }
      } catch (error) {
        console.error('Erro ao buscar compras:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompras();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pago':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pendente':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 font-montserrat text-gray-600">Carregando compras...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-3xl text-black mb-2">Minhas Compras</h1>
        <p className="font-montserrat text-gray-600">Histórico completo das suas compras e pagamentos</p>
      </div>

      {compras.length === 0 ? (
        <Card className="border border-gray-200">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h3 className="font-poppins text-xl text-gray-800 mb-2">Nenhuma compra encontrada</h3>
            <p className="font-montserrat text-gray-600">
              Você ainda não realizou nenhuma compra. Que tal explorar nossos planos?
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {compras.map((compra: any, index: number) => (
            <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-poppins text-lg text-black mb-1">
                      {compra.descricao || compra.description || 'Compra'}
                    </h3>
                    <p className="font-montserrat text-sm text-gray-600">
                      ID: {compra.id || compra.payment_id}
                    </p>
                  </div>
                  <Badge className={getStatusColor(compra.status)}>
                    {compra.status || 'Pendente'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="font-montserrat text-sm text-gray-500">Valor</p>
                    <p className="font-poppins text-lg text-black">
                      {formatCurrency(compra.valor || compra.value || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="font-montserrat text-sm text-gray-500">Data</p>
                    <p className="font-montserrat text-black">
                      {formatDate(compra.data_criacao || compra.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="font-montserrat text-sm text-gray-500">Método</p>
                    <p className="font-montserrat text-black">
                      {compra.metodo_pagamento || compra.payment_method || 'PIX'}
                    </p>
                  </div>
                </div>

                {compra.qr_code && (
                  <div className="border-t pt-4">
                    <p className="font-montserrat text-sm text-gray-500 mb-2">QR Code PIX</p>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <img
                        src={`data:image/png;base64,${compra.qr_code}`}
                        alt="QR Code PIX"
                        className="mx-auto max-w-32 max-h-32"
                      />
                    </div>
                  </div>
                )}

                {compra.status?.toLowerCase() === 'pendente' && (
                  <div className="border-t pt-4">
                    <Button
                      className="font-montserrat bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        // Implementar verificação de status do pagamento
                        toast.info('Verificando status do pagamento...');
                      }}
                    >
                      <RefreshCw className="mr-2" size={16} />
                      Verificar Pagamento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}