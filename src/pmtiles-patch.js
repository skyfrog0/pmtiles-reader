// PMTiles 补丁 - 使用 Node.js 原生 zlib 替代 fflate
const zlib = require('zlib');
const path = require('path');

/**
 * 补丁 PMTiles 库的解压功能
 * 通过预加载和替换 fflate 模块来使用 Node.js 原生的 zlib
 */
function patchPMTiles() {
    // 在任何其他模块加载之前，先 patch fflate
    const fflatePath = require.resolve('fflate');
    
    // 创建自定义的解压函数
    function customDecompressSync(buffer) {
        try {
            // 尝试使用 Node.js 原生的 zlib 进行 gzip 解压
            const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            return zlib.gunzipSync(inputBuffer);
        } catch (error) {
            try {
                // 如果不是 gzip，尝试 inflate
                const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
                return zlib.inflateSync(inputBuffer);
            } catch (error2) {
                // 如果都失败，可能数据未压缩
                return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
            }
        }
    }
    
    // 强制替换 fflate 模块
    const mockFflate = {
        decompressSync: customDecompressSync,
        gunzipSync: customDecompressSync,
        inflateSync: customDecompressSync,
        // 导出其他可能需要的函数（占位）
        compressSync: (data) => zlib.gzipSync(data),
        deflateSync: (data) => zlib.deflateSync(data),
        gzipSync: (data) => zlib.gzipSync(data),
        strFromU8: (arr) => arr.toString(),
        strToU8: (str) => Buffer.from(str)
    };
    
    // 清除缓存并替换
    delete require.cache[fflatePath];
    require.cache[fflatePath] = {
        exports: mockFflate,
        filename: fflatePath,
        loaded: true,
        path: path.dirname(fflatePath),
        children: [],
        paths: []
    };
    
    console.log('✓ PMTiles patched: 使用 Node.js zlib 替代 fflate');
    
    // 现在安全地加载 pmtiles
    const pmtiles = require('pmtiles');
    return pmtiles;
}

module.exports = { patchPMTiles };
