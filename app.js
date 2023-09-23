/**
 * @文件名: app
 * @创建者: 夏花
 * @创建时间: 2023-09-23
*/

import { program } from 'commander'; // 导入commander模块，用于处理命令行参数
import express from 'express'; // 导入express模块，用于构建Web应用程序
import expressWs from 'express-ws'; // 导入express-ws模块，用于支持WebSocket
import path from 'path'; // 导入path模块，用于处理文件路径
import cors from 'cors'; // 导入cors模块，用于处理跨域请求
import multer from 'multer'; // 导入multer模块，用于处理文件上传
import ffmpeg from 'fluent-ffmpeg'; // 导入fluent-ffmpeg模块，用于处理音视频转换
import expressArtTemplate from 'express-art-template'; // 导入express-art-template模块，用于渲染模板
import url from 'url'; // 导入url模块，用于处理URL
import fs from 'fs'; // 导入fs模块，用于文件操作

const TMP_DIR = 'tmp'; // 定义临时目录
const AUDIO_DIR = 'audio'; // 定义音频目录
const VIDEO_DIR = 'video'; // 定义视频目录
const INPUT_DIR = 'input'; // 定义输入目录
const OUTPUT_DIR = 'output'; // 定义输出目录

const createDirectories = (dirs) => { // 定义一个函数，用于创建目录
    dirs.forEach(dir => { // 遍历目录数组
        if (!fs.existsSync(dir)) { // 判断目录是否存在
            fs.mkdirSync(dir, { recursive: true }); // 递归创建目录
        }
    });
};

createDirectories([ // 调用函数创建目录
    TMP_DIR,
    path.join(TMP_DIR, AUDIO_DIR),
    path.join(TMP_DIR, AUDIO_DIR, INPUT_DIR),
    path.join(TMP_DIR, AUDIO_DIR, OUTPUT_DIR),
    path.join(TMP_DIR, VIDEO_DIR),
    path.join(TMP_DIR, VIDEO_DIR, INPUT_DIR),
    path.join(TMP_DIR, VIDEO_DIR, OUTPUT_DIR)
]);

program // 定义命令行程序
    .option('--ip <ip>', '设置监听的 IP 地址', '127.0.0.1') // 添加一个选项，用于设置监听的 IP 地址，默认为 127.0.0.1
    .option('--port <port>', '设置监听的端口号', '3000') // 添加一个选项，用于设置监听的端口号，默认为 3000
    .parse(process.argv); // 解析命令行参数

const config = program.opts(); // 获取命令行参数的值

const __filename = url.fileURLToPath(import.meta.url); // 获取当前文件的绝对路径
const __dirname = path.dirname(__filename); // 获取当前文件所在的目录路径

const app = express(); // 创建一个express应用程序
expressWs(app); // 将express应用程序与express-ws模块关联

app.use(cors()); // 使用cors中间件处理跨域请求
app.engine('html', expressArtTemplate); // 设置模板引擎为express-art-template
app.set('views', path.join(__dirname, 'view')); // 设置模板文件的存放目录
app.set('view engine', 'html'); // 设置模板文件的后缀名为html
app.use(express.static(path.join(__dirname, 'public'))); // 设置静态文件目录

const storage = multer.diskStorage({ // 创建一个multer的存储引擎
    destination: (req, file, cb) => { // 设置文件存储的目录
        const fileType = file.mimetype.startsWith('video') ? VIDEO_DIR : AUDIO_DIR; // 根据文件的MIME类型判断是音频还是视频
        cb(null, path.join(TMP_DIR, fileType, INPUT_DIR)); // 设置目录路径
    },
    filename: (req, file, cb) => { // 设置文件的命名规则
        cb(null, file.originalname); // 使用原始文件名作为文件名
    },
});

const fileFilter = (req, file, cb) => { // 创建一个文件过滤器
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8'); // 将文件名从latin1编码转换为utf8编码
    cb(null, true); // 允许上传文件
};

const upload = multer({ storage, fileFilter }); // 创建一个multer的实例

app.ws('/progress', (ws, req) => { // 处理WebSocket连接
    ws.on('message', (message) => { // 监听WebSocket的message事件
        console.log('Received message:', message); // 打印接收到的消息
    });
    console.log("WebSocket 连接已建立"); // 打印WebSocket连接已建立的消息
});

app.get('/', (req, res) => { // 处理根路径的GET请求
    res.render('home'); // 渲染home模板并发送给客户端
});

app.get('/audio', (req, res) => { // 处理/audio路径的GET请求
    res.render('audio'); // 渲染audio模板并发送给客户端
});

app.get('/video', (req, res) => { // 处理/video路径的GET请求
    res.render('video'); // 渲染video模板并发送给客户端
});

app.post('/upload_audio', upload.single('audioFile'), (req, res) => {
    try {
        const inputFilePath = req.file.path; // 获取上传的音频文件路径
        const outputFormat = req.body.outputFormat; // 获取输出格式
        const outputFilePath = path.join(TMP_DIR, AUDIO_DIR, OUTPUT_DIR, `${path.basename(inputFilePath, path.extname(inputFilePath))}.`); // 设置输出文件路径

        const ffmpegInstance = ffmpeg(inputFilePath) // 创建ffmpeg实例
            .toFormat(outputFormat) // 设置输出格式
            .on('start', (str) => { // 监听任务开始事件
                console.log('任务开始--' + str);
            })
            .on('progress', (progress) => { // 监听任务进行中事件
                console.log('任务进行中--' + progress.percent);
                ws.send(JSON.stringify({ // 发送进度信息到客户端
                    progress: progress.percent
                }));
            })
            .on('end', () => { // 监听任务结束事件
                res.sendFile(outputFilePath); // 发送输出文件到客户端
            })
            .on('error', (err) => { // 监听任务错误事件
                res.status(500).render('error', { // 渲染错误页面
                    errorMessage: '格式转换失败',
                    errorStack: err.stack,
                });
            })
            .save(outputFilePath); // 保存输出文件
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            errorMessage: '格式转换失败',
            errorStack: err.stack,
        });
    }
});

app.post('/upload_video', upload.single('videoFile'), (req, res) => {
    try {
        const inputFilePath = req.file.path; // 获取上传的视频文件路径
        const outputFormat = req.body.outputFormat; // 获取输出格式
        const outputFilePath = `http://${config.ip}:${config.port}/${path.join(TMP_DIR, VIDEO_DIR, OUTPUT_DIR, path.basename(inputFilePath, path.extname(inputFilePath)))}.`; // 设置输出文件路径

        const ffmpegInstance = ffmpeg(inputFilePath) // 创建ffmpeg实例
            .toFormat(outputFormat) // 设置输出格式
            .on('start', (str) => { // 监听任务开始事件
                console.log('任务开始--' + str);
            })
            .on('progress', (progress) => { // 监听任务进行中事件
                console.log('任务进行中--' + progress.percent);
                ws.send(JSON.stringify({ // 发送进度信息到客户端
                    progress: progress.percent
                }));
            })
            .on('end', () => { // 监听任务结束事件
                res.sendFile(outputFilePath); // 发送输出文件到客户端
            })
            .on('error', (err) => { // 监听任务错误事件
                res.status(500).render('error', { // 渲染错误页面
                    errorMessage: '格式转换失败',
                    errorStack: err.stack,
                });
            })
            .save(outputFilePath); // 保存输出文件
    } catch (err) {
        console.error('请求错误', err);
        res.status(500).render('error', {
            errorMessage: '格式转换失败',
            errorStack: err.stack,
        });
    }
});

app.listen(config.port, config.ip, () => {
    console.info(`服务启动成功: http://${config.ip}:${config.port}`);
});