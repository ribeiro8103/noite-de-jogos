# Ilha do Vulcão — cena 3D

`scene.js` é a fonte da cena 3D da TV. O ficheiro que o jogo carrega é `../scene.bundle.js`, gerado com:

    npm i three@0.170 esbuild
    npx esbuild scene.js --bundle --minify --format=iife --outfile=../scene.bundle.js
