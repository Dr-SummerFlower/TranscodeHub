# 说明文档

## 简介

这是一个使用 Node.js 和 Express 框架构建的应用程序，用于处理音频和视频文件上传以及格式转换。该文档提供了应用程序的详细信息，包括结构、功能和用法。

## 安装

首先，确保您的系统上安装了 `ffmpeg` 、 `Node.js>=16` 和 `npm（Node 包管理器）` 。然后，按照以下步骤安装应用程序：

1. 安装依赖项：

    ```bash
    npm install
    ```

2. 启动应用程序：

    ```bash
    node app.js
    ```

    注：应用程序将在默认端口 3000 上启动。您可以使用 -i 和 -p 选项来设置 IP 地址和端口号。例如：

    ```bash
    node app.js --ip 127.0.0.1 --port 8080
    ```

### 项目结构

#### 应用程序包含以下文件和目录

    - app.js：Express 应用程序的入口文件，包含主要的服务器逻辑。
    - view 目录：包含视图模板文件，用于渲染页面。
    - public 目录：包含静态资源文件，如样式表和客户端脚本。
    - tmp 目录：用于临时存储上传的文件和转换后的文件。
    - node_modules 目录：包含所有依赖的 Node.js 模块。
    - package.json：应用程序的配置文件，包含依赖项列表和启动脚本。

### 功能

#### 应用程序具有以下功能

    - 提供一个主页，用于导航到音频上传和视频上传页面。
    - 支持音视频文件上传，并将其转换为指定的格式（通过 FFmpeg 进行转换）。
    - 显示任务的开始和进度信息。
    - 下载转换后的文件或报告转换失败。

### 用法

1. 访问主页：

    打开浏览器并访问 [localhost:3000](http://localhost:3000)。

2. 上传音频文件：

    在主页中，点击 "音频上传" 链接，然后选择要上传的音频文件。选择转换格式并点击提交。应用程序将处理上传和转换，并在完成后提供下载链接或显示错误消息。

3. 上传视频文件：

    在主页中，点击 "视频上传" 链接，然后选择要上传的视频文件。选择转换格式并点击提交。应用程序将处理上传和转换，并在完成后提供下载链接或显示错误消息。