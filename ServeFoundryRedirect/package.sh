rm ../ServeFoundryRedirect.zip
npm install

tsc

npm install --only=prod

chmod 644 $(find . -type f)
chmod 755 $(find . -type d)
7z a ../ServeFoundryRedirect.zip ./out/* ./node_modules/