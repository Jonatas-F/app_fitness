@echo off
title Shape Certo - Passo 05 Perfil com Historico

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
echo Teste a area interna em:
echo http://localhost:5173/app
echo.
echo Depois abra a aba:
echo Perfil
echo.
echo Salve uma vez, altere alguns campos e salve novamente
echo para validar o historico de snapshots.
echo.
pause

echo.
echo ==================================================
echo ENVIANDO ALTERACOES PARA O GITHUB
echo ==================================================
git add .
git commit -m "feat: adiciona persistencia e historico do perfil"
git push origin main

echo.
echo Concluido.
pause