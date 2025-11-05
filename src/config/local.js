// Configurações para ambiente local
export const LOCAL_CONFIG = {
  // Configurações do banco de dados local
  database: {
    type: 'localStorage', // Pode ser alterado para 'postgresql', 'mysql', etc.
    host: 'localhost',
    port: 5432,
    name: 'bia_local',
    user: 'bia_user',
    password: 'bia_password',
    
    // Configurações específicas para PostgreSQL
    postgresql: {
      connectionString: 'postgresql://bia_user:bia_password@localhost:5432/bia_local',
      ssl: false,
      maxConnections: 20
    },
    
    // Configurações específicas para MySQL
    mysql: {
      connectionString: 'mysql://bia_user:bia_password@localhost:3306/bia_local',
      charset: 'utf8mb4'
    }
  },
  
  // Configurações da API local
  api: {
    baseUrl: 'http://localhost:3001',
    timeout: 15000,
    retries: 3,
    
    // Chaves de API (devem ser configuradas via variáveis de ambiente)
    openaiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
    
    // Configurações do WordPress
    wordpress: {
      timeout: 15000,
      maxRetries: 3,
      userAgent: 'BIA-Local/1.0'
    }
  },
  
  // Configurações de desenvolvimento
  development: {
    enableMockData: true,
    enableOfflineMode: true,
    debugMode: true,
    logLevel: 'debug', // 'error', 'warn', 'info', 'debug'
    
    // Dados mock para desenvolvimento
    mockUsers: [
      {
        id: 1,
        name: 'Usuário Teste',
        email: 'teste@bia.local',
        plano: 'Avançado',
        createdAt: new Date().toISOString()
      }
    ],
    
    mockSites: [
      {
        id: 1,
        nome: 'Site Teste',
        url: 'https://exemplo.com',
        descricao: 'Site de exemplo para testes',
        categoria: 'Blog',
        nicho: 'Tecnologia',
        status: 'ativo'
      }
    ]
  },
  
  // Configurações de segurança
  security: {
    enableCORS: true,
    allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
    
    // Configurações de criptografia local
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32
    }
  },
  
  // Configurações de armazenamento
  storage: {
    type: 'localStorage', // 'localStorage', 'indexedDB', 'file'
    prefix: 'bia-local-',
    maxSize: 50 * 1024 * 1024, // 50MB
    
    // Configurações para armazenamento em arquivo (Node.js)
    file: {
      dataDir: './data',
      backupDir: './backups',
      autoBackup: true,
      backupInterval: 60 * 60 * 1000 // 1 hora
    }
  },
  
  // Configurações de sincronização
  sync: {
    enabled: true,
    interval: 5 * 60 * 1000, // 5 minutos
    conflictResolution: 'timestamp', // 'timestamp', 'manual', 'server-wins'
    
    // Configurações para sincronização com servidor remoto
    remote: {
      enabled: false,
      url: '',
      apiKey: '',
      syncOnStartup: true,
      syncOnChange: false
    }
  },
  
  // Configurações de interface
  ui: {
    theme: 'light', // 'light', 'dark', 'auto'
    language: 'pt-BR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    
    // Configurações de notificações
    notifications: {
      enabled: true,
      position: 'top-right',
      duration: 5000
    }
  },
  
  // Configurações de performance
  performance: {
    enableCaching: true,
    cacheTimeout: 5 * 60 * 1000, // 5 minutos
    maxCacheSize: 100,
    
    // Configurações de lazy loading
    lazyLoading: {
      enabled: true,
      threshold: 0.1,
      rootMargin: '50px'
    }
  },
  
  // Configurações de logging
  logging: {
    enabled: true,
    level: 'info',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    
    // Configurações para envio de logs
    remote: {
      enabled: false,
      endpoint: '',
      apiKey: '',
      batchSize: 100
    }
  }
};

// Função para validar configurações
export const validateConfig = (config = LOCAL_CONFIG) => {
  const errors = [];
  const warnings = [];
  
  // Validar configurações obrigatórias
  if (!config.api.baseUrl) {
    errors.push('API baseUrl é obrigatória');
  }
  
  if (!config.database.type) {
    errors.push('Tipo de banco de dados é obrigatório');
  }
  
  // Validar configurações de segurança
  if (config.security.enableCORS && !config.security.allowedOrigins.length) {
    warnings.push('CORS habilitado mas nenhuma origem permitida');
  }
  
  // Validar configurações de armazenamento
  if (config.storage.type === 'file' && typeof window !== 'undefined') {
    warnings.push('Armazenamento em arquivo não disponível no browser');
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
};

// Função para carregar configurações do ambiente
export const loadEnvironmentConfig = () => {
  const envConfig = { ...LOCAL_CONFIG };
  
  // Carregar variáveis de ambiente
  if (typeof process !== 'undefined' && process.env) {
    // API
    if (process.env.REACT_APP_API_BASE_URL) {
      envConfig.api.baseUrl = process.env.REACT_APP_API_BASE_URL;
    }
    
    if (process.env.REACT_APP_OPENAI_API_KEY) {
      envConfig.api.openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
    }
    
    // Banco de dados
    if (process.env.REACT_APP_DB_TYPE) {
      envConfig.database.type = process.env.REACT_APP_DB_TYPE;
    }
    
    if (process.env.REACT_APP_DB_HOST) {
      envConfig.database.host = process.env.REACT_APP_DB_HOST;
    }
    
    if (process.env.REACT_APP_DB_PORT) {
      envConfig.database.port = parseInt(process.env.REACT_APP_DB_PORT);
    }
    
    if (process.env.REACT_APP_DB_NAME) {
      envConfig.database.name = process.env.REACT_APP_DB_NAME;
    }
    
    if (process.env.REACT_APP_DB_USER) {
      envConfig.database.user = process.env.REACT_APP_DB_USER;
    }
    
    if (process.env.REACT_APP_DB_PASSWORD) {
      envConfig.database.password = process.env.REACT_APP_DB_PASSWORD;
    }
    
    // Desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      envConfig.development.debugMode = false;
      envConfig.development.enableMockData = false;
    }
  }
  
  return envConfig;
};

// Exportar configuração carregada
export const config = loadEnvironmentConfig();

