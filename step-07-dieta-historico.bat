@echo off
title Shape Certo - Passo 07 Dieta e Historico

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
echo Dieta
echo.
echo Teste salvar a dieta atual, depois encerrar a dieta
echo para validar o historico de dietas.
echo.
pause

echo.
echo ==================================================
echo ENVIANDO ALTERACOES PARA O GITHUB
echo ==================================================
git add .
git commit -m "feat: cria dieta atual com historico de dietas"
git push origin main

echo.
echo Concluido.
pause