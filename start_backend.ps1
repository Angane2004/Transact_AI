# Start the FastAPI Backend
$env:PYTHONPATH = "."
uvicorn api.main:app --reload --port 8000
