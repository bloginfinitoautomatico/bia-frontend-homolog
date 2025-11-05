// Script para testar a autenticação admin
const token = localStorage.getItem('token');
console.log('Token:', token ? token.substring(0, 20) + '...' : 'Não encontrado');

const apiBase = 'http://127.0.0.1:8000';

fetch(`${apiBase}/api/admin/stats`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Headers:', [...response.headers.entries()]);
  return response.text();
})
.then(text => {
  console.log('Response:', text);
  try {
    const json = JSON.parse(text);
    console.log('JSON:', json);
  } catch (e) {
    console.log('Não é JSON válido');
  }
})
.catch(error => {
  console.error('Erro:', error);
});
