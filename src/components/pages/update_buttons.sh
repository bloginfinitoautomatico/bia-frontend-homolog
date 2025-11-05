#!/bin/bash

# Script para atualizar os botões de reescrever que ainda não têm loading

# Fazer backup
cp BiaNews.jsx BiaNews.jsx.bak

# Primeira substituição - adicionar disabled
sed -i.tmp1 's/onClick={() => handleRewriteArticle(article)}/onClick={() => handleRewriteArticle(article)}\n                                      disabled={rewritingArticleIds.has(article.id)}/g' BiaNews.jsx

# Segunda substituição - substituir o conteúdo do botão
sed -i.tmp2 's/<Edit className="w-3 h-3 mr-1" \/>\n                                      Reescrever/{rewritingArticleIds.has(article.id) ? (\n                                        <>\n                                          <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-1"><\/div>\n                                          Reescrevendo...\n                                        <\/>\n                                      ) : (\n                                        <>\n                                          <Edit className="w-3 h-3 mr-1" \/>\n                                          Reescrever\n                                        <\/>\n                                      )}/g' BiaNews.jsx

# Remover arquivos temporários
rm -f BiaNews.jsx.tmp1 BiaNews.jsx.tmp2

echo "Botões atualizados com sucesso!"
