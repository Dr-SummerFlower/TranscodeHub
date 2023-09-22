/**
 * @文件名: app.js
 * @创建者: 夏花
 * @创建时间: 2023-09-06
 */

import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import expressArtTemplate from 'express-art-template';
import url from 'url';
import { program } from 'commander';
import fs from 'fs';

/**
 * 创建缓存目录
 */
const dirs = [
    'tmp',
    'tmp/audio',
    'tmp/audio/input',
    'tmp/audio/output',
    'tmp/video',
    'tmp/video/input',
    'tmp/video/output'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});

// 解析命令行参数
program
    .option('--ip <ip>', '设置监听的 IP 地址', '127.0.0.1')
    .option('--port <port>', '设置监听的端口号', '3000')
    .parse(process.argv);

// 从命令行参数中获取配置
const config = program.opts();

//拼接路径
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 注册express
 */
const app = express();
/**
 * 加入ws通信协议
 */
expressWs(app);

// 启用跨域请求支持
app.use(cors());

// 设置模板引擎和静态资源路径
app.engine('html', expressArtTemplate);
app.set('views', path.join(__dirname, 'view'));
app.set('view engine', 'html');
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 配置 multer 存储
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 根据文件类型确定上传路径（音频或视频）
        const fileType = file.mimetype.startsWith('video') ? 'video' : 'audio';
        cb(null, `tmp/${fileType}/input`);
    },
    filename: (req, file, cb) => {
        // 使用原始文件名作为存储文件名
        cb(null, file.originalname);
    },
});
const fileFilter = (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, "latin1").toString('utf8');
    cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

/**
 * 实现ws协议传输
 */
let wsObj;
app.ws('/progress', (ws, req) => {
    // 在连接建立时，将 WebSocket 连接存储在 req 上以供后续路由使用
    wsObj = ws;
    console.log("WebSocket 连接已建立");
});

/**
 * 渲染主页
 */
app.get('/', (req, res) => {
    res.render('home');
});

/**
 * 渲染音频上传页面
 */
app.get('/audio', (req, res) => {
    res.render('audio');
});

/**
 * 渲染视频上传页面
 */
app.get('/video', (req, res) => {
    res.render('video');
});

/**
 * 处理音频文件上传和转换
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
app.post('/upload_audio', upload.single('audioFile'), (req, res) => {
    try {
        const inputFilePath = req.file.path;
        const outputFormat = req.body.outputFormat;
        const outputFilePath = `tmp/audio/output/${path.basename(inputFilePath, path.extname(inputFilePath))}.${outputFormat}`;

        // 使用 Fluent FFmpeg 处理音频转换
        ffmpeg(inputFilePath)
            .toFormat(outputFormat)
            .on('start', (str) => {
                console.log('任务开始--' + str);
            })
            .on('progress', (progress) => {
                console.log('任务进行中--' + progress.percent);
                if (wsObj) {
                    wsObj.send(JSON.stringify({
                        progress: progress.percent
                    }));
                } else {
                    console.log("WebSocket对象未定义");
                }
            })
            .on('end', () => {
                // 下载转换后的文件
                res.download(outputFilePath, (err) => {
                    if (wsObj) {
                        wsObj.send(JSON.stringify({
                            progress: 100
                        }));
                    }
                    if (err) {
                        res.status(500).render('error', {
                            errorMessage: '格式转换失败',
                            errorStack: err.stack,
                        });
                    }
                });
            })
            .on('error', (err) => {
                res.status(500).render('error', {
                    errorMessage: '格式转换失败',
                    errorStack: err.stack,
                });
            })
            .save(outputFilePath);
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            errorMessage: '格式转换失败',
            errorStack: err.stack,
        });
    }
});

/**
 * 处理视频文件上传和转换
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
app.post('/upload_video', upload.single('videoFile'), (req, res) => {
    try {
        const inputFilePath = req.file.path;
        const outputFormat = req.body.outputFormat;
        const outputFilePath = `http://${config.ip}:${config.port}/tmp/video/output/${path.basename(inputFilePath, path.extname(inputFilePath))}.${outputFormat}`;

        // 使用 Fluent FFmpeg 处理视频转换
        ffmpeg(inputFilePath)
            .toFormat(outputFormat)
            .on('start', (str) => {
                console.log('任务开始--' + str);
            })
            .on('progress', (progress) => {
                console.log('任务进行中--' + progress.percent);
                if (wsObj) {
                    wsObj.send(JSON.stringify({
                        progress: progress.percent
                    }));
                } else {
                    console.log("WebSocket对象未定义");
                }
            })
            .on('end', () => {
                // 下载转换后的文件
                res.download(outputFilePath, (err) => {
                    if (wsObj) {
                        wsObj.send(JSON.stringify({
                            progress: 100
                        }));
                    }
                    if (err) {
                        res.status(500).render('error', {
                            errorMessage: '格式转换失败',
                            errorStack: err.stack,
                        });
                    }
                });
            })
            .on('error', (err) => {
                res.status(500).render('error', {
                    errorMessage: '格式转换失败',
                    errorStack: err.stack,
                });
            })
            .save(outputFilePath);
    } catch (err) {
        console.error('请求错误', err);
        res.status(500).render('error', {
            errorMessage: '格式转换失败',
            errorStack: err.stack,
        });
    }
});

// 启动 Express 服务
app.listen(config.port, config.ip, () => {
    console.info(`服务启动成功: http://${config.ip}:${config.port}`);
});
