// Script para limpeza forçada de estado de artigo preso
console.log("🧹 Iniciando limpeza forçada de estado...");

// 1. Limpar TODOS os estados do localStorage relacionados a processamento
const keysToRemove = [
  'bia_processing_ideas',
  'bia_single_progress',
  'bia_batch_progress',
  'bia_processing_ideas_backup'
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Removido: ${key}`);
  }
});

// 2. Limpar TAMBÉM os estados específicos por usuário
const allKeys = Object.keys(localStorage);
const userSpecificKeys = allKeys.filter(key => 
  key.includes('bia_batch_') && 
  (key.includes('processing') || key.includes('progress') || key.includes('current_item'))
);

userSpecificKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ Removido específico de usuário: ${key}`);
});

console.log("✅ Limpeza do localStorage concluída!");
console.log("📊 Estado após limpeza:", {
  bia_processing_ideas: localStorage.getItem('bia_processing_ideas'),
  bia_single_progress: localStorage.getItem('bia_single_progress'),
  bia_batch_progress: localStorage.getItem('bia_batch_progress')
});

// 3. Recarregar página para forçar refresh
console.log("♻️ Recarregando página em 2 segundos...");
setTimeout(() => {
  window.location.reload();
}, 2000);
