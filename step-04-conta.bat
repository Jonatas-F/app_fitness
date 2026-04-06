@echo off
title Shape Certo - Passo 04 Conta

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
echo Entre na area interna em:
echo http://localhost:5173/app
echo.
echo Na area interna, abra a aba:
echo Conta
echo.
pause

echo.
echo ==================================================
echo ENVIANDO ALTERACOES PARA O GITHUB
echo ==================================================
git add .
git commit -m "feat: cria tela de conta separada do perfil"
git push origin main

echo.
echo Concluido.
pause