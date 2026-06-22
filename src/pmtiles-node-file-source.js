// Node.js 环境下的 PMTiles 本地文件读取实现
const fs = require('fs');
const path = require('path');

/**
 * Node.js 本地文件 Source 实现
 * 用于在 Node.js 环境中读取 .pmtiles 文件
 */
class NodeFileSource {
    /**
     * @param {string} filePath - 本地文件的绝对路径或相对路径
     */
    constructor(filePath) {
        this.filePath = path.resolve(filePath);
        
        // 检查文件是否存在
        if (!fs.existsSync(this.filePath)) {
            throw new Error(`File not found: ${this.filePath}`);
        }
        
        // 获取文件大小（修正：使用 size 而不是 .fd）
        const stats = fs.statSync(this.filePath);
        this.fileSize = stats.size;
        
        console.log(`NodeFileSource initialized: ${this.filePath}`);
        console.log(`File size: ${this.fileSize} bytes`);
    }

    /**
     * 获取文件的唯一标识符（用于缓存）
     * @returns {string} 文件路径
     */
    getKey() {
        return this.filePath;
    }

    /**
     * 从文件中读取指定偏移量和大小的字节数据
     * @param {number} offset - 起始偏移量（字节）
     * @param {number} length - 要读取的字节数
     * @param {AbortSignal} [signal] - 可选的中断信号（Node.js 中暂不支持）
     * @returns {Promise<{data: ArrayBuffer}>} 返回 ArrayBuffer 数据
     */
    async getBytes(offset, length, signal) {
        return new Promise((resolve, reject) => {
            // 打开文件描述符
            fs.open(this.filePath, 'r', (err, fd) => {
                if (err) {
                    return reject(err);
                }

                // 创建 Buffer 来存储读取的数据
                const buffer = Buffer.alloc(length);

                // 从指定位置读取文件
                fs.read(fd, buffer, 0, length, offset, (err, bytesRead) => {
                    // 关闭文件描述符
                    fs.close(fd, (closeErr) => {
                        if (closeErr && !err) {
                            err = closeErr;
                        }
                        
                        if (err) {
                            return reject(err);
                        }

                        // 将 Buffer 转换为 ArrayBuffer
                        const arrayBuffer = buffer.buffer.slice(
                            buffer.byteOffset,
                            buffer.byteOffset + bytesRead
                        );

                        resolve({
                            data: arrayBuffer
                        });
                    });
                });
            });
        });
    }

    /**
     * 同步版本的文件读取（用于初始化等场景）
     * @param {number} offset - 起始偏移量（字节）
     * @param {number} length - 要读取的字节数
     * @returns {{data: ArrayBuffer}} 返回 ArrayBuffer 数据
     */
    getBytesSync(offset, length) {
        // 打开文件
        const fd = fs.openSync(this.filePath, 'r');
        
        try {
            // 创建 Buffer 来存储读取的数据
            const buffer = Buffer.alloc(length);
            
            // 从指定位置读取文件
            const bytesRead = fs.readSync(fd, buffer, 0, length, offset);
            
            // 将 Buffer 转换为 ArrayBuffer
            const arrayBuffer = buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + bytesRead
            );
            
            return {
                data: arrayBuffer
            };
        } finally {
            // 确保关闭文件描述符
            fs.closeSync(fd);
        }
    }
}

module.exports = { NodeFileSource };
