@echo off
title Shape Certo - Passo 06 Treinos e Protocolos

cd /d "C:\Users\jonat\Documents\Projetos-Git\shape-certo"

echo ==================================================
echo INSTALANDO DEPENDENCIAS
echo ==================================================
call npm install

echo.
echo ==================================================
echo ABRINDO O PROJETO LOCAL EM NOVA JANELA
echo ==================================================
start "Shape Certo - Dev Server" cmd /k "cd /d C:\Users\jonat\Documents\Projetos-Git\shape-certo && npm run dev"

echo.
echo Projeto iniciado.
echo Endereco local esperado: http://localhost:5173/
echo.
echo Entre na area interna em:
echo http://localhost:5173/app
echo.
echo Depois abra a aba:
echo Treinos
echo.
echo Teste salvar o protocolo atual, depois encerrar o protocolo
echo para validar o historico de protocolos.
echo.
pause

echo.
echo ==================================================
echo ENVIANDO ALTERACOES PARA O GITHUB
echo ==================================================
git add .
git commit -m "feat: cria treino atual com historico de protocolos"
git push origin main

echo.
echo Concluido.
pause