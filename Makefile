run:
	make -j 2 run_client run_py

run_client:
	cd client && npm run dev

run_py:
	python3 server.py