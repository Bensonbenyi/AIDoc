FROM python:3.11-slim

# 预装常用 Python 库（使用阿里云镜像加速）
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com \
    numpy \
    pandas \
    matplotlib \
    requests \
    scipy \
    scikit-learn \
    sympy \
    pillow \
    seaborn \
    plotly

# 创建非 root 用户
RUN useradd --create-home --shell /bin/bash runner
USER runner
WORKDIR /home/runner

# 默认执行 Python
CMD ["python3"]
