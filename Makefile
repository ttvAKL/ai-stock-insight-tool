run:
	make -j 4 run_client run_py run_websocket

run_server:
	make -j 2 run_js run_py

run_js:
	node server.js

run_py:
	python3 server.py

run_client:
	cd client && npm run dev

run_websocket:
	python services/websocket_listener.py
