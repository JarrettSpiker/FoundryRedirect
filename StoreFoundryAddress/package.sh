rm ../StoreFoundryAddress.zip
npm install

tsc

npm install --only=prod

chmod 644 $(find . -type f)
chmod 755 $(find . -type d)
7z a ../StoreFoundryAddress.zip ./out/* ./node_modules/