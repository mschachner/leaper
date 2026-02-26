FROM --platform=linux/amd64 sagemath/sagemath:latest

USER root

RUN sage -pip install --no-cache-dir fastapi 'uvicorn[standard]' pandas

WORKDIR /app

COPY backend/app.py backend/models.py backend/requirements.txt ./

COPY src/leaper/ ./leaper/

USER sage
EXPOSE 8000

CMD ["sage", "-python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
