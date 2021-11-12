rm ServeFoundryRedirect.zip

chmod 644 $(find . -type f)
chmod 755 $(find . -type d)
mv node_modules node_modules_tmp
npm install

tsc

npm install --only=prod

chmod 644 $(find . -type f)
chmod 755 $(find . -type d)
7z a ServeFoundryRedirect.zip ./out/* ./node_modules/
rm -rf node_modules
mv node_modules_tmp node_modules