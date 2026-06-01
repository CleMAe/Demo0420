FROM python:3.12-slim

WORKDIR /app

ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
ARG PIP_DEFAULT_TIMEOUT=120

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    SQLITE_PATH=/data/portal.db

COPY requirements.txt .
RUN pip install --no-cache-dir \
    --index-url "${PIP_INDEX_URL}" \
    --timeout "${PIP_DEFAULT_TIMEOUT}" \
    -r requirements.txt

COPY main.py *.html portal-brand.js portal-demos.js agent-workbench.js smart-office.js ./
COPY docs ./docs

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
