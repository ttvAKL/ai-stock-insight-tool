run:
	make -j 2 run_server run_client

run_server:
	node server.js

run_client:
	cd client && npm run dev
