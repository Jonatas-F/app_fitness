@echo off
title Shape Certo - Passo 08 Checkins e Reavaliacao

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
echo Check-ins
echo.
echo Teste salvar um check-in e validar o historico.
echo Tambem confira a caixa de reavaliacao mensal.
echo.
pause

echo.
echo ==================================================
echo ENVIANDO ALTERACOES PARA O GITHUB
echo ==================================================
git add .
git commit -m "feat: cria checkins e base de reavaliacao mensal"
git push origin main

echo.
echo Concluido.
pause