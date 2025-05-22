run:
	make -j 2 run_client run_py run_redis

run_client:
	cd client && npm run dev

run_py:
	python3 server.py

run_redis:
	brew services start redis