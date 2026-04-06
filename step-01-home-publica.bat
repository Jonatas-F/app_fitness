@echo off
title Shape Certo - Passo 01 Home Publica

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
echo Teste a Home publica em:
echo http://localhost:5173/
echo.
echo Teste a area interna atual em:
echo http://localhost:5173/app
echo.
pause

echo.
echo ==================================================
echo ENVIANDO ALTERACOES PARA O GITHUB
echo ==================================================
git add .
git commit -m "feat: cria home publica e base inicial de rotas"
git push origin main

echo.
echo Concluido.
pause