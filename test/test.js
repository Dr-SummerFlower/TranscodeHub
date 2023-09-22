/**
 * @文件名: test
 * @创建者: 夏花
 * @创建时间: 2023-09-09
*/
import ffmpeg from 'fluent-ffmpeg';

const filepath = './file/test.mp3'

const cmd = ffmpeg(filepath);


cmd.save('./file/test.flac')
    .on('start', (str) => {
        console.log('任务开始--' + str);
    })
    .on('progress', (progress) => {
        console.log('任务进行中--' + progress.percent);
    })
    .on('end', () => {
        console.log('任务结束');
    })
    .on('error', (err) => {
        console.log(err);
    });