git add .
git commit -m "update $@"
git push origin main
npm version patch -m "update $@"
